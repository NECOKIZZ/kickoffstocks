"use client";

// Beginner checklist ("Getting started"): five steps from no wallet to a
// Friday payout. Each step ticks itself off from what the wallet and the
// league say (connected, has gas, has tickets, has an entry, was paid). It
// opens by itself on a first visit, and from the sidebar any time.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { formatUnits, parseAbi } from "viem";
import { useBalance, useConnection, useWriteContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useConfig, useMe } from "../hooks";
import { ConnectButton, useTicketBalance } from "./ConnectButton";

const HIDE_KEY = "pm-getting-started-hidden";
const SEEN_KEY = "pm-getting-started-seen";
export const OPEN_EVENT = "pm:getting-started";

/** Open the checklist from anywhere (the sidebar, a page). */
export const openGettingStarted = () => window.dispatchEvent(new Event(OPEN_EVENT));

const faucetAbi = parseAbi(["function faucet()"]);

export function useGettingStarted() {
  const { address, isConnected } = useConnection();
  const { data: cfg } = useConfig();
  const { data: eth } = useBalance({ address, chainId: cfg?.chainId as never, query: { enabled: !!address && !!cfg, refetchInterval: 20_000 } });
  const { data: usdg } = useTicketBalance(address);
  const { data: me } = useMe();
  const tickets = usdg !== undefined ? Number(formatUnits(usdg, cfg?.usdgDecimals ?? 6)) : 0;
  const entries = me?.entries ?? [];
  const done = [
    isConnected,
    !!eth && eth.value > 0n,
    tickets >= 5,
    entries.length > 0,
    entries.some((e) => e.claimed || (e.status === "Settled" && BigInt(e.payout) > 0n)),
  ];
  return { done, count: done.filter(Boolean).length };
}

export function GettingStarted() {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const { data: cfg } = useConfig();
  const { done, count } = useGettingStarted();
  const { writeContractAsync, isPending } = useWriteContract();
  const qc = useQueryClient();
  const [note, setNote] = useState<string | null>(null);

  // First visit: open once per browser session unless hidden for good.
  useEffect(() => {
    try {
      if (!localStorage.getItem(HIDE_KEY) && !sessionStorage.getItem(SEEN_KEY)) {
        sessionStorage.setItem(SEEN_KEY, "1");
        setOpen(true);
      }
    } catch {
      // storage blocked: just don't auto-open
    }
    const on = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, on);
    return () => window.removeEventListener(OPEN_EVENT, on);
  }, []);

  useEffect(() => {
    if (!open) return setShown(false);
    const raf = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) return null;
  const testnet = cfg?.chain !== "mainnet";

  async function claimUsdg() {
    setNote(null);
    try {
      await writeContractAsync({ address: cfg!.usdg, abi: faucetAbi, functionName: "faucet", chainId: cfg!.chainId as never });
      setNote("Sent: 50 test USDG on the way.");
      setTimeout(() => qc.invalidateQueries(), 4000);
    } catch (e) {
      setNote((e as { shortMessage?: string }).shortMessage ?? (e instanceof Error ? e.message.split("\n")[0] : String(e)));
    }
  }

  const steps: { title: string; body: string; action?: React.ReactNode }[] = [
    { title: "Connect a wallet", body: "MetaMask, Rabby or Robinhood Wallet, on Robinhood Chain. You sign everything yourself.", action: <ConnectButton /> },
    {
      title: testnet ? "Get testnet ETH and stocks" : "Get ETH for gas",
      body: testnet ? "Robinhood's faucet gives free ETH for gas and TSLA, AMZN, PLTR and AMD tokens, once a day." : "A little ETH on Robinhood Chain pays for transactions.",
      action: cfg?.stockFaucet ? (
        <a href={cfg.stockFaucet} target="_blank" rel="noreferrer" className="btn-3d btn-ghost inline-flex h-9 items-center px-4 text-[0.8rem]">
          Open faucet ↗
        </a>
      ) : undefined,
    },
    {
      title: testnet ? "Claim test USDG" : "Have $5 USDG",
      body: testnet ? "Tickets are $5 in USDG. The test faucet gives 50 once an hour. BTC and ETH test tokens are in the wallet menu." : "Tickets are $5 in USDG.",
      action: testnet && cfg?.faucet ? (
        <button type="button" disabled={isPending || !done[0]} onClick={claimUsdg} className="btn-3d btn-ghost inline-flex h-9 items-center px-4 text-[0.8rem]">
          {isPending ? "Claiming…" : "Claim 50"}
        </button>
      ) : undefined,
    },
    {
      title: "Build or back an ETF",
      body: "Pick 3+ stocks, lock them with a $5 ticket before Monday 9:30am New York. Or put $5 on someone else's ETF.",
      action: (
        <Link href="/create" onClick={() => setOpen(false)} className="btn-3d btn-accent inline-flex h-9 items-center px-4 text-[0.8rem]">
          Build
        </Link>
      ),
    },
    {
      title: "Get paid Friday",
      body: "At Friday's close, ETFs above the MEDIAN split the tickets below it. Your stocks come back either way. Claim in My entries.",
      action: (
        <Link href="/me" onClick={() => setOpen(false)} className="btn-3d btn-ghost inline-flex h-9 items-center px-4 text-[0.8rem]">
          My entries
        </Link>
      ),
    },
  ];
  const next = done.findIndex((d) => !d);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="gs-title">
      <div
        className="absolute inset-0"
        onClick={() => setOpen(false)}
        style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", opacity: shown ? 1 : 0, transition: "opacity .3s ease" }}
      />
      <div
        className="relative w-full max-w-[480px] overflow-hidden rounded-[28px] bg-bg shadow-lift"
        style={{ transform: shown ? "none" : "translateY(16px) scale(.98)", opacity: shown ? 1 : 0, transition: "transform .45s cubic-bezier(0.22, 1, 0.36, 1), opacity .3s ease" }}
      >
        <div className="relative px-7 pb-6 pt-7" style={{ background: "radial-gradient(120% 120% at 100% 0%, color-mix(in oklab, var(--color-new-purple) 22%, transparent), transparent 60%)" }}>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="absolute right-5 top-5 flex size-8 items-center justify-center rounded-full text-muted hover:bg-surface">
            <X size={16} />
          </button>
          <p className="t-label text-muted">
            {count} of 5 done
          </p>
          <h2 id="gs-title" className="t-heading mt-2 text-[30px]">
            Getting started
          </h2>
          <p className="mt-1.5 text-[14px] text-muted">Five steps from zero to your first Friday payout.{testnet ? " It's all test money." : ""}</p>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full" style={{ width: `${(count / 5) * 100}%`, background: "var(--color-kickoff-green)", transition: "width .6s ease" }} />
          </div>
        </div>
        <ol className="max-h-[52vh] overflow-y-auto px-7">
          {steps.map((s, i) => (
            <li key={s.title} className="flex items-start gap-4 border-t border-line py-4">
              <span
                className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold"
                style={
                  done[i]
                    ? { background: "var(--color-kickoff-green)", color: "#111210" }
                    : i === next
                      ? { border: "1.5px solid var(--ink)", color: "var(--ink)" }
                      : { background: "var(--surface)", color: "var(--muted)" }
                }
              >
                {done[i] ? <Check size={14} strokeWidth={3} /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`font-clash text-[15px] font-semibold ${done[i] ? "text-muted line-through decoration-1" : ""}`}>{s.title}</p>
                {i === next && <p className="mt-1 text-[13px] leading-relaxed text-muted">{s.body}</p>}
                {i === next && i === 2 && note && <p className="mt-1 text-[12px] text-muted">{note}</p>}
              </div>
              {i === next && s.action && <div className="shrink-0">{s.action}</div>}
            </li>
          ))}
        </ol>
        <div className="flex items-center justify-between border-t border-line px-7 py-4">
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.setItem(HIDE_KEY, "1");
              } catch {}
              setOpen(false);
            }}
            className="text-[13px] text-muted hover:text-ink"
          >
            Don&rsquo;t show again
          </button>
          <button type="button" onClick={() => setOpen(false)} className="btn-3d btn-ghost inline-flex h-9 items-center px-5 text-[0.85rem]">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
