"use client";

// Gloam-style action panel for an ETF: "Stake $5" (a ticket on the team) and
// "Buy the ETF" (0x swaps on mainnet, the swap desk on testnet; creator fee). Runs the plan from the wallet. A
// banner on top says plainly whether staking is open or locked right now.

import { useEffect, useState } from "react";
import { useConnection } from "wagmi";
import type { RoundView, TeamView } from "../api";
import { useConfig, usePlanRunner } from "../hooks";
import { ConnectButton } from "./ConnectButton";
import { TxSteps } from "./TxSteps";
import { teamName, usdg } from "./league";

export function ActionPanel({ r, t }: { r: RoundView; t: TeamView }) {
  const [tab, setTab] = useState<"back" | "buy">("back");
  const [amount, setAmount] = useState("25");
  const { isConnected } = useConnection();
  const { data: cfg } = useConfig();
  const runner = usePlanRunner();
  const open = r.phase === "entries-open";
  const fee = t.buyFeeBps / 100;
  const pay = BigInt(t.payoutPerTicketNow);
  const stake = BigInt(r.stake);

  const tabBtn = (k: "back" | "buy", label: string) => (
    <button
      type="button"
      onClick={() => {
        setTab(k);
        runner.reset();
      }}
      className={`h-9 flex-1 rounded-full text-[14px] font-medium transition ${tab === k ? "bg-bg shadow-card" : "text-muted hover:text-ink"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="rounded-[32px] bg-surface p-5 md:p-6">
      <StakeStatus r={r} />
      <div className="mt-5 flex gap-1 rounded-full bg-surface-2 p-1">
        {tabBtn("back", "Stake $5")}
        {tabBtn("buy", "Buy the ETF")}
      </div>

      {tab === "back" ? (
        <div className="mt-5">
          <div className="rounded-[20px] bg-bg p-5">
            <div className="text-[13px] text-muted">You pay</div>
            <div className="t-num mt-1 text-[32px]">{usdg(r.stake, 0)} USDG</div>
            <div className="mt-1 text-[13px] text-muted">one ticket on {teamName(t)}</div>
          </div>
          <dl className="mt-4 space-y-2 text-[14px]">
            {!open && <Row k="If the round ended now" v={t.drawingNow ? "ticket back (tied with MEDIAN)" : t.winningNow && pay > stake ? `${usdg(pay)} USDG back` : "ticket lost (below MEDIAN)"} />}
            {open && <Row k="Above MEDIAN on Friday" v="a share of the pot" />}
            {open && <Row k="Exactly on MEDIAN" v="ticket back" />}
            <Row k="Creator's cut of your winnings" v="10%" />
            {!open && <Row k="Round ends" v={`${nyTime(r.end * 1000)} ET`} />}
          </dl>
          <div className="mt-5">
            {!isConnected ? (
              <ConnectButton size="md" />
            ) : (
              <button
                type="button"
                disabled={!open || runner.busy}
                onClick={() => runner.run({ action: "back", teamKey: t.teamKey, roundId: r.id })}
                className="h-12 w-full btn-3d btn-accent text-[16px] transition hover:opacity-90 disabled:opacity-40"
              >
                {!open ? "Staking is locked" : runner.busy ? "Working…" : `Stake $${usdg(r.stake, 0)} on ${teamName(t)}`}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <label className="block rounded-[20px] bg-bg p-5">
            <span className="text-[13px] text-muted">You pay</span>
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
            <span className="mt-1 block text-[13px] text-muted">→ the same basket, in your wallet</span>
          </label>
          <dl className="mt-4 space-y-2 text-[14px]">
            <Row k="Creator fee" v={`${fee}% to the creator`} />
            <Row k="Route" v={cfg?.buyRoute === "test-desk" ? "testnet swap desk, live prices, one swap" : "0x (RFQ market makers + Uniswap)"} />
            <Row k="Slippage" v="auto" />
          </dl>
          <div className="mt-5">
            {!cfg?.buyEnabled ? (
              <p className="rounded-[16px] bg-bg p-4 text-[13px] text-muted">
                Buying isn&rsquo;t available on {cfg?.chain === "local" ? "the local demo chain" : cfg?.chain === "testnet" ? "this testnet deployment yet: get the stocks from Robinhood's faucet" : "this deployment yet"}.
              </p>
            ) : !isConnected ? (
              <ConnectButton size="md" />
            ) : (
              <button
                type="button"
                disabled={runner.busy || !(Number(amount) >= 1)}
                onClick={() => runner.run({ action: "buy-etf", teamKey: t.teamKey, usdg: Number(amount), roundId: r.id })}
                className="h-12 w-full btn-3d btn-accent text-[16px] transition hover:opacity-90 disabled:opacity-40"
              >
                {runner.busy ? "Working…" : `Buy ${teamName(t)}`}
              </button>
            )}
          </div>
        </div>
      )}
      <TxSteps plan={runner.plan} states={runner.states} hashes={runner.hashes} error={runner.error} />
    </div>
  );
}

const nyTime = (ms: number) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "2-digit" }).format(ms);

function left(ms: number) {
  const m = Math.max(0, Math.floor(ms / 60_000));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  return d > 0 ? `${d}d ${h}h left` : h > 0 ? `${h}h ${m % 60}m left` : `${m % 60}m left`;
}

/** Open or locked, in plain words, with when that changes. */
export function StakeStatus({ r }: { r: RoundView }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const open = r.phase === "entries-open";
  const over = r.phase === "settled" || r.phase === "voided";
  const title = open ? "Open for staking" : over ? "This round is over" : "Staking is locked";
  const detail = open
    ? `Closes ${nyTime(r.entryClose * 1000)} ET${now ? ` · ${left(r.entryClose * 1000 - now)}` : ""}`
    : over
      ? "Next week’s round opens for staking right after Friday’s close."
      : "The round is running. Staking reopens for next week’s round after Friday’s close.";
  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-[20px] p-4 ${open ? "bg-up-bg text-up" : over ? "bg-bg text-muted" : "bg-surface-2 text-ink"}`}
    >
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${open ? "bg-up text-bg" : over ? "bg-surface-2 text-ink" : "bg-ink text-bg"}`} aria-hidden="true">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d={open ? "M8 11V8a4 4 0 0 1 7.5-2" : "M8 11V8a4 4 0 0 1 8 0v3"} />
        </svg>
      </span>
      <div>
        <div className="text-[15px] font-semibold">{title}</div>
        <div className="text-[13px] opacity-85">{detail}</div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}
