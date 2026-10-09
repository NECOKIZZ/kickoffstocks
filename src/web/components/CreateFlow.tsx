"use client";

// The create flow, as four numbered panels on one page:
//   1 pick stocks · 2 set weights · 3 get them (0x on mainnet, the league's swap desk on testnet, the local faucet) · 4 name it and lock it.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { erc20Abi, formatUnits } from "viem";
import { useConnection, useReadContracts } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { STOCKS, type StockInfo } from "../../ui/data/stocks";
import { StockCard } from "../../ui/components/StockCard";
import { WeightBar } from "../../ui/components/WeightBar";
import { useConfig, usePlanRunner, useRound, useStocks } from "../hooks";
import { fetchRound, post } from "../api";
import { equalWeights } from "../weights";
import { fitBasket } from "../../league/basket";
import { ConnectButton, useTicketBalance } from "./ConnectButton";
import { TxSteps } from "./TxSteps";

type Filter = "all" | "stock" | "etf" | "crypto";

export function CreateFlow() {
  const { data: cfg } = useConfig();
  const { data: stocksData } = useStocks();
  const { data: round } = useRound();
  const { address, isConnected } = useConnection();
  const qc = useQueryClient();
  const buyRunner = usePlanRunner();
  const lockRunner = usePlanRunner();

  const [picked, setPicked] = useState<string[]>([]);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [amount, setAmount] = useState("12");
  const [name, setName] = useState("");
  const [fee, setFee] = useState(1);
  const [faucet, setFaucet] = useState<{ busy: boolean; msg: string | null }>({ busy: false, msg: null });
  const [entered, setEntered] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState(false);
  // ?again=<round>:<teamKey>: re-enter a past ETF with the same stocks, weights, name and fee.
  const [again, setAgain] = useState<{ name: string; round: string } | null>(null);
  const preset = useRef<Record<string, number> | null>(null);

  const rules = cfg?.rules ?? { minTokens: 3, minStocks: 3, maxCryptoPct: 20, maxTokens: 10, maxWeightPct: 50, minBasketUsd: 10, ticketUsd: 5, maxBuyFeePct: 2, driftPct: 5 };
  const live = useMemo(() => new Map(stocksData?.stocks.map((s) => [s.ticker, s]) ?? []), [stocksData]);
  const available = STOCKS.filter((s) => !stocksData || live.has(s.ticker));
  const shown = available.filter(
    (s) => (filter === "all" || s.kind === filter) && (!q || `${s.ticker} ${s.name}`.toLowerCase().includes(q.toLowerCase())),
  );
  const stock = (t: string) => STOCKS.find((s) => s.ticker === t)!;

  // ?add=NVDA from the landing page's cards.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("add");
    if (t && STOCKS.some((s) => s.ticker === t)) setPicked([t]);
  }, []);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("again");
    const m = p && /^(\d+):(0x[0-9a-fA-F]{64})$/.exec(p);
    if (!m) return;
    fetchRound(m[1])
      .then((rv) => {
        const tm = rv.teams.find((x) => x.teamKey.toLowerCase() === m[2].toLowerCase());
        const hs = tm?.holdings.filter((h) => h.ticker && STOCKS.some((x) => x.ticker === h.ticker)) ?? [];
        if (!tm || hs.length === 0) return;
        // Whole-percent weights that still add up to 100.
        const w = hs.map((h) => Math.round(h.weightBps / 100));
        w[w.indexOf(Math.max(...w))] += 100 - w.reduce((a, b) => a + b, 0);
        preset.current = Object.fromEntries(hs.map((h, i) => [h.ticker!, w[i]]));
        setPicked(hs.map((h) => h.ticker!));
        if (tm.name) setName(tm.name);
        setFee(tm.buyFeeBps / 100);
        setAgain({ name: tm.name || "your ETF", round: rv.id });
      })
      .catch(() => {});
  }, []);
  // Equal weights whenever the selection changes (or the re-entered ETF's own weights).
  useEffect(() => {
    if (preset.current && picked.length === Object.keys(preset.current).length && picked.every((t) => t in preset.current!)) {
      setWeights(preset.current);
      preset.current = null;
      return;
    }
    setWeights(equalWeights(picked.map((t) => ({ ticker: t, crypto: stock(t).kind === "crypto" })), rules.maxCryptoPct));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked]);

  const toggle = (t: string) => {
    if (!picked.includes(t) && picked.length >= rules.maxTokens) return setLimitHit(true);
    setLimitHit(false);
    setPicked((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  };
  const total = picked.reduce((s, t) => s + (weights[t] ?? 0), 0);
  const isCrypto = (t: string) => stock(t).kind === "crypto";
  const stockCount = picked.filter((t) => !isCrypto(t)).length;
  const cryptoPct = picked.reduce((s, t) => s + (isCrypto(t) ? (weights[t] ?? 0) : 0), 0);
  const enoughStocks = stockCount >= rules.minStocks;
  const weightsOk =
    enoughStocks && total === 100 && cryptoPct <= rules.maxCryptoPct && picked.every((t) => (weights[t] ?? 0) > 0 && weights[t] <= rules.maxWeightPct);
  const holdings = picked.map((t) => ({ stock: stock(t), weightPct: weights[t] ?? 0 }));

  // Wallet balances of the picked stocks (this chain's addresses).
  const tokenAddrs = picked.map((t) => live.get(t)?.address).filter(Boolean) as `0x${string}`[];
  const { data: bals, refetch: refetchBals } = useReadContracts({
    contracts: tokenAddrs.map((a) => ({ address: a, abi: erc20Abi, functionName: "balanceOf", args: [address!] }) as const),
    query: { enabled: !!address && tokenAddrs.length > 0, refetchInterval: 15_000 },
  });
  const held = picked.map((t, i) => {
    const raw = (bals?.[i]?.result as bigint | undefined) ?? 0n;
    const price = live.get(t)?.price ?? stock(t).price;
    return { t, raw, usd: Number(formatUnits(raw, live.get(t)?.decimals ?? stock(t).decimals)) * price };
  });
  const heldUsd = held.reduce((s, h) => s + h.usd, 0);
  const holdsAll = picked.length > 0 && held.every((h) => h.raw > 0n);
  // What step 4 locks: the basket at exactly these weights, up to the amount in
  // step 3, that the wallet can cover. Anything else stays in the wallet.
  const target = Number(amount) > 0 ? Number(amount) : undefined;
  const fit = weightsOk
    ? fitBasket(
        held.map((h) => ({ raw: h.raw, decimals: live.get(h.t)?.decimals ?? stock(h.t).decimals, price: live.get(h.t)?.price ?? stock(h.t).price, weightBps: (weights[h.t] ?? 0) * 100 })),
        target,
      )
    : { amounts: [] as bigint[], usd: 0, maxUsd: 0 };
  const basketUsd = holdsAll ? fit.usd : 0;
  const basketOk = holdsAll && basketUsd >= rules.minBasketUsd;
  const legUsd = (i: number) => (fit.amounts[i] !== undefined ? (Number(fit.amounts[i]) / 10 ** (live.get(held[i].t)?.decimals ?? stock(held[i].t).decimals)) * (live.get(held[i].t)?.price ?? stock(held[i].t).price) : 0);
  // The pick that limits the basket (it would need topping up for a bigger one).
  const limiting = holdsAll && fit.maxUsd < (target ?? 0) ? held.reduce((a, h) => (h.usd / (weights[h.t] || 1) < a.usd / (weights[a.t] || 1) ? h : a)).t : null;
  const open = round?.phase === "entries-open";
  const nameOk = name.trim().length > 0 && new TextEncoder().encode(name.trim()).length <= 32;
  const { data: ticketBal } = useTicketBalance(address);
  const hasTicket = ticketBal !== undefined && Number(formatUnits(ticketBal, cfg?.usdgDecimals ?? 6)) >= rules.ticketUsd;
  // Buying is a swap here (0x on mainnet, the league's desk on testnet): USDG in, the whole basket out.
  const canSwap = !!cfg?.buyEnabled && cfg.chain !== "local";
  const usdgHave = ticketBal !== undefined ? Number(formatUnits(ticketBal, cfg?.usdgDecimals ?? 6)) : 0;
  const usdgLow = ticketBal !== undefined && usdgHave < Number(amount) + rules.ticketUsd;
  const extraHeld = holdsAll && heldUsd - basketUsd > 1;

  // What each step still needs, in plain words.
  const needStocks = Math.max(0, rules.minStocks - stockCount);
  const weightProblems = [
    total !== 100 && `The weights add up to ${total}%. They need to add up to exactly 100%.`,
    picked.some((t) => (weights[t] ?? 0) > rules.maxWeightPct) && `No single pick can be more than ${rules.maxWeightPct}%.`,
    picked.some((t) => !(weights[t] > 0)) && "Every pick needs a weight above 0%. Remove the ones you don't want.",
    cryptoPct > rules.maxCryptoPct && `BTC and ETH together are ${cryptoPct}%. The most allowed is ${rules.maxCryptoPct}%.`,
  ].filter(Boolean) as string[];
  const missing = held.filter((h) => h.raw === 0n).map((h) => h.t);
  const block2 = enoughStocks ? null : `Finish step 1 first: pick at least ${rules.minStocks} stocks or funds (you have ${stockCount}).`;
  const block3 = block2 ? "Finish steps 1 and 2 first." : weightsOk ? null : "Finish step 2 first: fix the weights.";
  const block4 =
    block3 ?? (entered || basketOk || lockRunner.busy ? null : !isConnected ? "Connect your wallet in step 3 first." : canSwap
          ? `Finish step 3 first: swap USDG for your basket (at least $${rules.minBasketUsd}).`
          : `Finish step 3 first: you need some of every pick, worth at least $${rules.minBasketUsd} in total.`);
  const lockProblems = [
    !open && "Entries for this week are closed. The next week opens right after Friday's close.",
    !nameOk && "Give your ETF a name (up to 32 characters).",
    isConnected && ticketBal !== undefined && !hasTicket && `You need $${rules.ticketUsd} in USDG for the ticket. Claim 50 free test USDG in Getting started (sidebar).`,
  ].filter(Boolean) as string[];

  async function getTestStocks() {
    if (!address) return;
    setFaucet({ busy: true, msg: null });
    try {
      const usd = Number(amount);
      const stocks = Object.fromEntries(picked.map((t) => [t, (usd * (weights[t] ?? 0)) / 100]));
      await post("/api/faucet", { wallet: address, usdg: 10, stocks });
      await refetchBals();
      await qc.invalidateQueries();
      setFaucet({ busy: false, msg: `Sent test ${picked.join(", ")} worth $${usd.toFixed(2)}, 10 test USDG and gas.` });
    } catch (e) {
      setFaucet({ busy: false, msg: e instanceof Error ? e.message : String(e) });
    }
  }

  return (
    <>
    {again && (
      <p role="status" className="mb-6 rounded-[20px] bg-up-bg px-5 py-4 text-[14px] text-up">
        Re-entering <span className="font-semibold">{again.name}</span> from round {again.round}: same stocks, weights, name and buy fee. Claim your stocks back from My entries first if you haven&rsquo;t.
      </p>
    )}
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        {/* 1. Pick */}
        <Panel
          n="1"
          title="Pick your stocks"
          done={enoughStocks}
          hint={`${stockCount} of ${rules.minStocks}+ stocks picked${picked.length > stockCount ? ` · ${picked.length - stockCount} crypto` : ""}`}
          hintBad={picked.length > 0 && !enoughStocks}
        >
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search NVIDIA, TSLA…"
              aria-label="Search stocks"
              className="h-10 w-full rounded-full border border-line bg-bg px-4 text-[14px] outline-none focus:border-ink/40 sm:w-64"
            />
            <div className="flex gap-1 rounded-full bg-surface p-1 text-[13px]">
              {(["all", "stock", "etf", "crypto"] as Filter[]).map((f) => (
                <button key={f} type="button" onClick={() => setFilter(f)} className={`h-8 rounded-full px-3 ${filter === f ? "bg-bg font-medium shadow-card" : "text-muted"}`}>
                  {f === "all" ? "All" : f === "stock" ? "Stocks" : f === "etf" ? "Funds" : "Crypto"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex max-h-[560px] flex-wrap justify-center gap-3 overflow-y-auto p-1 sm:justify-start">
            {shown.map((s) => {
              const on = picked.includes(s.ticker);
              return (
                <button
                  key={s.ticker}
                  type="button"
                  onClick={() => toggle(s.ticker)}
                  aria-pressed={on}
                  className={`relative rounded-[18px] transition duration-200 ease-soft ${on ? "ring-[3px] ring-brand-mint ring-offset-2 ring-offset-bg" : "opacity-90 hover:-translate-y-1 hover:opacity-100"}`}
                >
                  <StockCard stock={s} size="medium" price={live.get(s.ticker)?.price} changePct={live.get(s.ticker)?.changePct ?? undefined} />
                  {on && <span className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-brand-mint text-[13px] font-bold text-brand-ink">✓</span>}
                </button>
              );
            })}
          </div>
          {limitHit ? (
            <StepNote>That&rsquo;s the maximum of {rules.maxTokens} assets. Tap a picked card to remove it, then add another.</StepNote>
          ) : picked.length === 0 ? (
            <p className="mt-4 text-[15px] text-muted">Tap the cards to pick them. You need at least {rules.minStocks} stocks or funds.</p>
          ) : !enoughStocks ? (
            <StepNote>
              Pick {plural(needStocks, "more stock or fund", "more stocks or funds")} to continue.
              {picked.length > stockCount ? " BTC and ETH don't count toward the 3." : ""}
            </StepNote>
          ) : (
            <>
              <StepNote ok>Great, {plural(stockCount, "stock", "stocks")} picked. You can add more, up to {rules.maxTokens}.</StepNote>
              <NextButton to={2}>Next: set the weights ↓</NextButton>
            </>
          )}
          <p className="mt-4 text-[13px] text-muted">
            BTC and ETH can add up to {rules.maxCryptoPct}% together, on top of the stocks. Only tokens with a Chainlink price feed on Robinhood Chain are listed: that&rsquo;s what
            scores your ETF on-chain.
          </p>
        </Panel>

        {/* 2. Weights */}
        <Panel
          n="2"
          title="Set the weights"
          done={weightsOk}
          hint={`total ${total}% · max ${rules.maxWeightPct}% each${cryptoPct ? ` · crypto ${cryptoPct}% of ${rules.maxCryptoPct}% max` : ""}`}
          hintBad={!!enoughStocks && !weightsOk}
          blocked={block2}
        >
          <div className="space-y-3">
            {picked.map((t) => (
              <div key={t} className="grid grid-cols-[34px_64px_1fr_72px] items-center gap-3">
                <StockCard stock={stock(t)} size="tiny34" />
                <span className="text-[14px] font-semibold">{t}</span>
                <input
                  type="range"
                  min={1}
                  max={rules.maxWeightPct}
                  value={weights[t] ?? 0}
                  onChange={(e) => setWeights((w) => ({ ...w, [t]: Number(e.target.value) }))}
                  className="accent-[var(--ink)]"
                  aria-label={`${t} weight`}
                />
                <span className="flex items-center gap-1">
                  <input
                    inputMode="numeric"
                    value={weights[t] ?? 0}
                    onChange={(e) => setWeights((w) => ({ ...w, [t]: Math.min(rules.maxWeightPct, Number(e.target.value.replace(/\D/g, "")) || 0) }))}
                    className="t-num h-9 w-12 rounded-[10px] border border-line bg-bg text-center text-[14px]"
                    aria-label={`${t} weight percent`}
                  />
                  <span className="text-muted">%</span>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <WeightBar holdings={holdings} legend={false} />
          </div>
          <div className="mt-4 flex justify-end text-[14px]">
            <button type="button" className="font-medium underline underline-offset-4" onClick={() => setPicked((p) => [...p])}>
              Reset to equal weights
            </button>
          </div>
          {block2 ? null : weightProblems.length ? (
            weightProblems.map((m) => <StepNote key={m}>{m}</StepNote>)
          ) : (
            <>
              <StepNote ok>Weights add up to 100%.</StepNote>
              <NextButton to={3}>{canSwap ? "Next: swap for the stocks ↓" : "Next: get the stocks ↓"}</NextButton>
            </>
          )}
        </Panel>

        {/* 3. Buy */}
        <Panel n="3" title={canSwap ? "Swap USDG for the stocks" : "Buy the stocks"} done={basketOk || !!entered} hint={basketOk ? `$${basketUsd.toFixed(2)} basket ready` : `at least $${rules.minBasketUsd}`} blocked={block3}>
          <label className="block rounded-[20px] bg-surface p-5">
            <span className="text-[13px] text-muted">Basket size</span>
            <span className="mt-1 flex items-baseline gap-2">
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                className="t-num w-full bg-transparent text-[32px] outline-none"
                aria-label="Amount in USDG"
              />
              <span className="t-num text-[18px] text-muted">USDG</span>
            </span>
            <span className="mt-1 block text-[13px] text-muted">
              Split by weight: {picked.map((t) => `${t} $${((Number(amount) * (weights[t] ?? 0)) / 100).toFixed(2)}`).join(" · ")}
            </span>
          </label>
          <p className="mt-3 text-[13px] text-muted">
            The minimum is ${rules.minBasketUsd}. Go a little over (e.g. $12) so price moves can&rsquo;t push it under.
          </p>
          <div className="mt-4">
            {!isConnected ? (
              <ConnectButton size="md" />
            ) : cfg?.chain === "local" ? (
              <button type="button" disabled={faucet.busy || !weightsOk || !(Number(amount) >= rules.minBasketUsd)} onClick={getTestStocks} className="h-12 w-full btn-3d btn-accent text-[16px] disabled:opacity-40">
                {faucet.busy ? "Sending…" : "Get test stocks (local demo chain)"}
              </button>
            ) : cfg?.buyEnabled ? (
              <div className="space-y-3">
                <button
                  type="button"
                  disabled={buyRunner.busy || !weightsOk || !(Number(amount) >= rules.minBasketUsd)}
                  onClick={() => buyRunner.run({ action: "buy-basket", tickers: picked, weightsPct: picked.map((t) => weights[t]), usdg: Number(amount) }, { onDone: () => refetchBals() })}
                  className="h-12 w-full btn-3d btn-accent text-[16px] disabled:opacity-40"
                >
                  {buyRunner.busy ? "Working…" : cfg.buyRoute === "test-desk" ? `Swap ${Number(amount).toFixed(2)} USDG for all ${picked.length}` : `Buy for ${Number(amount).toFixed(2)} USDG via 0x`}
                </button>
                {cfg.buyRoute === "test-desk" && (
                  <p className="text-[13px] text-muted">One swap with test USDG gets you every pick at live prices. Out of test USDG? Claim 50 free in Getting started.</p>
                )}
              </div>
            ) : cfg?.chain === "testnet" && cfg.stockFaucet ? (
              <div className="space-y-3">
                <a href={cfg.stockFaucet} target="_blank" rel="noreferrer" className="grid h-12 w-full place-items-center btn-3d btn-accent text-[16px]">
                  Get test stocks from Robinhood&rsquo;s faucet ↗
                </a>
                <p className="text-[13px] text-muted">
                  Testnet: the faucet sends 5 each of TSLA, AMZN, PLTR and AMD every 24 hours. Test BTC and ETH are in your wallet menu; test USDG for the ticket is in Getting
                  started.
                </p>
              </div>
            ) : (
              <p className="text-[13px] text-muted">Buying isn&rsquo;t available on this deployment yet. If you already hold the stocks, go to step 4.</p>
            )}
            {faucet.msg && <p className="mt-3 text-[13px] text-muted">{faucet.msg}</p>}
            <TxSteps plan={buyRunner.plan} states={buyRunner.states} hashes={buyRunner.hashes} error={buyRunner.error} />
          </div>
          {!block3 && !isConnected && <p className="mt-4 text-[15px] text-muted">Connect your wallet to swap and to see which of these you already hold.</p>}
          {!block3 && isConnected && canSwap && usdgLow && !basketOk && (
            <StepNote>
              You have {usdgHave.toFixed(2)} test USDG. This swap plus the ${rules.ticketUsd} ticket needs {(Number(amount) + rules.ticketUsd).toFixed(2)}: claim 50 free in Getting started.
            </StepNote>
          )}
          {!block3 && isConnected && bals && (
            missing.length ? (
              canSwap ? (
                missing.length === picked.length ? (
                  <StepNote>Tap the swap button: one swap puts all {picked.length} picks in your wallet.</StepNote>
                ) : (
                  <StepNote>Still missing {missing.join(", ")}. Swap again: it buys the whole basket.</StepNote>
                )
              ) : (
                <StepNote>You don&rsquo;t hold any {missing.join(", ")} yet. Get {missing.length === 1 ? "it" : "them"} first: every pick must be in your wallet.</StepNote>
              )
            ) : !basketOk ? (
              <StepNote>
                At your weights you have a ${basketUsd.toFixed(2)} basket{limiting ? ` (${limiting} is the short one)` : ""}. It needs at least ${rules.minBasketUsd}
                {canSwap ? `: swap about $${Math.ceil(rules.minBasketUsd - basketUsd + 1)} more.` : "."}
              </StepNote>
            ) : (
              <>
                <StepNote ok>
                  Basket ready: ${basketUsd.toFixed(2)} at your weights.
                  {limiting && Number(amount) - basketUsd > 0.5 ? ` ${limiting} only covers that much; swap again for the full $${Number(amount).toFixed(2)}.` : ""}
                </StepNote>
                <NextButton to={4}>Next: name it and lock it ↓</NextButton>
              </>
            )
          )}
          {isConnected && holdsAll && weightsOk && (
            <>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {held.map((h, i) => (
                  <div key={h.t} className="flex items-center justify-between rounded-[14px] bg-surface px-3 py-2 text-[13px]">
                    <span className="font-semibold">{h.t}</span>
                    <span className="t-num">${legUsd(i).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              {extraHeld && <p className="mt-3 text-[13px] text-muted">Only this basket gets locked. The rest of your {picked.join(", ")} stays in your wallet.</p>}
            </>
          )}
        </Panel>

        {/* 4. Lock */}
        <Panel n="4" title="Name it and lock it" done={!!entered} hint={open ? "entries open" : "entries closed"} blocked={block4}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-[13px] text-muted">ETF name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={32}
                placeholder="e.g. AI Chips Max"
                className="mt-1 h-11 w-full rounded-[14px] border border-line bg-bg px-4 text-[15px] outline-none focus:border-ink/40"
              />
            </label>
            <label className="block">
              <span className="text-[13px] text-muted">Buy fee for people who buy your ETF: {fee.toFixed(1)}%</span>
              <input type="range" min={0} max={rules.maxBuyFeePct} step={0.1} value={fee} onChange={(e) => setFee(Number(e.target.value))} className="mt-4 w-full accent-[var(--ink)]" />
            </label>
          </div>
          <ul className="mt-5 space-y-1.5 text-[14px] text-muted">
            <li>· Your ${basketUsd.toFixed(2)} basket is locked until the round ends, then comes back to you. Anything else in your wallet stays there.</li>
            <li>· Plus a ${rules.ticketUsd} USDG ticket. Beat MEDIAN (the middle ETF) and you win a share of the tickets below it. Tie MEDIAN and your ticket comes back.</li>
            <li>· Same stocks and weights as an existing ETF? You join that team instead.</li>
            <li>· If prices move your weights more than {rules.driftPct} points away before the round starts, the entry is refunded.</li>
          </ul>
          <div className="mt-5">
            {entered ? (
              <div className="rounded-[20px] bg-up-bg p-5 text-[15px] text-up">
                You&rsquo;re in. <Link className="font-medium underline" href={`/etf/${entered}`}>See your ETF →</Link>
              </div>
            ) : !isConnected ? (
              <ConnectButton size="md" />
            ) : (
              <button
                type="button"
                disabled={!open || !nameOk || !basketOk || lockRunner.busy || (ticketBal !== undefined && !hasTicket)}
                onClick={() =>
                  lockRunner.run(
                    { action: "lock", tickers: picked, weightsPct: picked.map((t) => weights[t]), name: name.trim(), buyFeePct: fee, basketUsd: target },
                    { onDone: (p) => setEntered(p.teamKey ?? null) },
                  )
                }
                className="h-12 w-full btn-3d btn-accent text-[16px] disabled:opacity-40"
              >
                {lockRunner.busy ? "Working…" : !open ? "Entries are closed" : `Lock and enter · $${basketUsd.toFixed(2)} + $${rules.ticketUsd} ticket`}
              </button>
            )}
            {!entered && isConnected && !lockRunner.busy && lockProblems.map((m) => <StepNote key={m}>{m}</StepNote>)}
            <TxSteps plan={lockRunner.plan} states={lockRunner.states} hashes={lockRunner.hashes} error={lockRunner.error} />
          </div>
        </Panel>
      </div>

      {/* Preview */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-[32px] bg-brand-ink p-6 text-brand-paper">
          <div className="t-label text-white/50">Your ETF</div>
          <div className="t-heading mt-3 min-h-[34px] text-[28px]">{name.trim() || "Untitled"}</div>
          <div className="mt-6 flex min-h-[110px] flex-wrap items-end justify-center gap-2">
            {picked.length ? picked.map((t) => <StockCard key={t} stock={stock(t)} size="tiny64" weightPct={weights[t]} />) : <p className="self-center text-[14px] text-white/50">Pick stocks to see them here.</p>}
          </div>
          <dl className="mt-6 space-y-2 text-[14px]">
            <div className="flex justify-between"><dt className="text-white/55">Assets</dt><dd className="t-num">{stockCount}</dd></div>
            <div className="flex justify-between"><dt className="text-white/55">Basket</dt><dd className="t-num">${(basketOk ? basketUsd : Number(amount) || 0).toFixed(2)}</dd></div>
            <div className="flex justify-between"><dt className="text-white/55">Ticket</dt><dd className="t-num">${rules.ticketUsd}</dd></div>
            <div className="flex justify-between"><dt className="text-white/55">Buy fee</dt><dd className="t-num">{fee.toFixed(1)}%</dd></div>
            <div className="flex justify-between"><dt className="text-white/55">Round</dt><dd className="t-num">{round ? `#${round.id} · ${round.teams.length} ETFs` : "…"}</dd></div>
          </dl>
        </div>
      </aside>
    </div>
    </>
  );
}

/** A numbered step. `blocked` says, in red, what to finish first; the step's
 *  controls stay visible but inactive until then. */
function Panel({ n, title, hint, hintBad, done, blocked, children }: { n: string; title: string; hint?: string; hintBad?: boolean; done?: boolean; blocked?: string | null; children: React.ReactNode }) {
  return (
    <section id={`step-${n}`} className="scroll-mt-6 rounded-[32px] border border-line p-5 transition md:p-7" aria-disabled={!!blocked}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-3">
          <span className={`t-num grid size-9 place-items-center rounded-full text-[14px] font-semibold ${done ? "bg-brand-mint text-brand-ink" : "bg-surface"}`}>{done ? "✓" : n}</span>
          <h2 className={`t-heading text-[22px] ${blocked ? "text-muted" : ""}`}>{title}</h2>
        </div>
        {hint && <span className={`text-[14px] ${hintBad ? "font-medium text-down" : "text-muted"}`}>{hint}</span>}
      </div>
      {blocked && (
        <p role="status" className="mb-5 flex items-start gap-2 rounded-[14px] px-4 py-3 text-[15px] leading-snug" style={{ background: "var(--down-bg)", color: "var(--down)" }}>
          <span aria-hidden>🔒</span>
          <span>{blocked}</span>
        </p>
      )}
      <div className={blocked ? "pointer-events-none select-none opacity-40" : ""} inert={blocked ? true : undefined}>
        {children}
      </div>
    </section>
  );
}

/** Red (or green) line under a step: what's missing, or that it's done. */
function StepNote({ ok, children }: { ok?: boolean; children: React.ReactNode }) {
  return (
    <p
      role={ok ? "status" : "alert"}
      className="mt-4 flex items-start gap-2 rounded-[14px] px-4 py-3 text-[15px] leading-snug"
      style={ok ? { background: "var(--up-bg)", color: "var(--up)" } : { background: "var(--down-bg)", color: "var(--down)" }}
    >
      <span aria-hidden>{ok ? "✓" : "!"}</span>
      <span>{children}</span>
    </p>
  );
}

const plural = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
const goTo = (n: number) => document.getElementById(`step-${n}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

function NextButton({ to, children }: { to: number; children: React.ReactNode }) {
  return (
    <button type="button" onClick={() => goTo(to)} className="btn-3d btn-accent mt-4 inline-flex h-11 items-center px-5 text-[15px]">
      {children}
    </button>
  );
}

export type { StockInfo };
