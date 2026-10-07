"use client";

import { Identity } from "../../ui/brand/Avatar";
import Link from "next/link";
import { useConnection } from "wagmi";
import { useRound, useStocks } from "../hooks";
import { EtfHand } from "../../ui/components/EtfHand";
import { WeightBar } from "../../ui/components/WeightBar";
import { StockCard, fmtPrice } from "../../ui/components/StockCard";
import { Change, Pill } from "../../ui/components/Pills";
import { RoundPill } from "../../ui/components/RoundPill";
import { ActionPanel } from "./ActionPanel";
import { EtfChart } from "./EtfChart";
import { holdingsOf, teamName } from "./league";
import type { RoundView, TeamView } from "../api";
import { Container } from "./Shell";

export function EtfPage({ teamKey, roundId }: { teamKey: string; roundId?: string }) {
  const { data: r, isLoading, error } = useRound(roundId);
  const { data: stocks } = useStocks();
  const { address } = useConnection();
  if (isLoading) return <Container className="py-16"><div className="h-96 animate-pulse rounded-[32px] bg-surface" /></Container>;
  const t = r?.teams.find((x) => x.teamKey.toLowerCase() === teamKey.toLowerCase());
  if (error || !r || !t)
    return (
      <Container className="py-24 text-center">
        <p className="text-muted">{error ? error.message : "This ETF isn't in the current round."}</p>
        <Link href="/league" className="mt-4 inline-block font-medium underline">
          Back to the league
        </Link>
      </Container>
    );
  const holdings = holdingsOf(t);
  const live = new Map(stocks?.stocks.map((s) => [s.ticker, s]) ?? []);
  const scoring = r.phase !== "entries-open";
  const finished = r.phase === "ended" || r.phase === "settled" || r.phase === "voided";
  const mine = !!address && address.toLowerCase() === t.captain.toLowerCase();
  // Contribution of each stock to the return: weight × its move since the start.
  // Only for the current round, where the live "since round start" moves apply.
  const moves = holdings.map((h) => (scoring && !roundId ? live.get(h.stock.ticker)?.changePct ?? null : null));
  const contrib = holdings.map((h, i) => (moves[i] === null ? null : (h.weightPct * moves[i]!) / 100));
  const maxC = Math.max(0.01, ...contrib.map((c) => Math.abs(c ?? 0)));

  return (
    <Container className="pt-10 pb-16">
      <Link href="/league" className="text-[14px] text-muted hover:text-ink">
        ← The league
      </Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <div className="rounded-[32px] bg-surface p-6 md:p-10">
            <div className="flex flex-wrap items-center gap-2">
              <RoundPill round={Number(r.id)} locksAt={r.entryClose * 1000} endsAt={r.end * 1000} />
              {scoring && (
                <Pill tone={t.winningNow ? "up" : t.drawingNow ? "neutral" : "down"}>
                  #{t.rank} of {r.teams.length} · {t.winningNow ? "above MEDIAN" : t.drawingNow ? "on MEDIAN" : "below MEDIAN"}
                </Pill>
              )}
            </div>
            <div className="mt-6 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="t-heading text-[40px] md:text-[52px]">{teamName(t)}</h1>
                <p className="mt-2 text-[14px] text-muted">
                  by <Identity address={t.captain} className="align-middle text-ink" /> · {t.members + 1} {t.members ? "tickets" : "ticket"} · buy fee {t.buyFeeBps / 100}%
                </p>
                <div className="mt-7 flex flex-wrap items-end gap-x-12 gap-y-4">
                  {scoring ? (
                    <div>
                      <div className="text-[13px] text-muted">{finished ? "Final return" : "Return so far"}</div>
                      <Change pct={t.returnPct} className="text-[40px] font-medium" />
                    </div>
                  ) : (
                    <p className="max-w-[300px] text-[14px] text-muted">Not scored yet. Scoring starts at Monday’s open, when the round locks.</p>
                  )}
                  {scoring && r.medianPct !== null && (
                    <div>
                      <div className="text-[13px] text-muted">MEDIAN</div>
                      <Change pct={r.medianPct} className="text-[22px]" />
                    </div>
                  )}
                </div>
              </div>
              <EtfHand holdings={holdings} />
            </div>
            {mine && finished && (
              <Link href={`/create?again=${r.id}:${t.teamKey}`} className="mt-8 inline-flex h-11 items-center rounded-full border border-line bg-bg px-5 text-[14px] font-medium hover:border-ink/30">
                Re-enter this ETF in next week’s round →
              </Link>
            )}
          </div>

          <EtfChart r={r} teamKey={t.teamKey} />

          {scoring && r.medianPct !== null && r.teams.length > 1 && <Field r={r} t={t} />}

          <section aria-label="Composition" className="rounded-[32px] border border-line p-6 md:p-8">
            <h2 className="t-heading text-[24px]">What’s inside</h2>
            <p className="mt-1 text-[14px] text-muted">{contrib.some((c) => c !== null) ? "Each stock’s share of the return so far." : "The basket the creator locked, and its weights."}</p>
            <div className="mt-6">
              <WeightBar holdings={holdings} />
            </div>
            <div className="mt-6 divide-y divide-line">
              {holdings.map((h, i) => {
                const l = live.get(h.stock.ticker);
                const c = contrib[i];
                return (
                  <div key={h.stock.ticker} className="grid grid-cols-[34px_minmax(0,1fr)_auto_auto] items-center gap-4 py-4 md:grid-cols-[34px_minmax(0,1fr)_56px_110px_minmax(0,180px)]">
                    <StockCard stock={h.stock} size="tiny34" />
                    <div className="min-w-0">
                      <div className="text-[15px] font-semibold">{h.stock.ticker}</div>
                      <div className="truncate text-[12px] text-muted">{h.stock.name}</div>
                    </div>
                    <div className="t-num text-[14px] text-muted">{h.weightPct}%</div>
                    <div className="flex flex-col items-end">
                      <span className="t-num text-[14px]">{fmtPrice(l?.price ?? h.stock.price)}</span>
                      {moves[i] !== null && <Change pct={moves[i]!} className="text-[12px]" />}
                    </div>
                    <div className="col-span-4 flex items-center gap-3 md:col-span-1">
                      {c !== null && (
                        <>
                          <div className="h-2 flex-1 rounded-full bg-surface">
                            <div className={`h-2 rounded-full ${c >= 0 ? "bg-up" : "bg-down"}`} style={{ width: `${Math.max(3, (Math.abs(c) / maxC) * 100)}%` }} />
                          </div>
                          <span className="t-num w-[72px] text-right text-[13px]">
                            {c >= 0 ? "+" : "−"}
                            {Math.abs(c).toFixed(2)} pts
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ActionPanel r={r} t={t} />
        </div>
      </div>
    </Container>
  );
}

/** Every ETF in the round as a dot on one line, MEDIAN splitting winners from the rest. */
function Field({ r, t }: { r: RoundView; t: TeamView }) {
  const rets = r.teams.map((x) => x.returnPct);
  const lo = Math.min(...rets, r.medianPct!);
  const hi = Math.max(...rets, r.medianPct!);
  const span = Math.max(0.5, hi - lo);
  const pos = (v: number) => `${4 + ((v - lo) / span) * 92}%`;
  return (
    <section aria-label="Where it stands" className="rounded-[32px] border border-line p-6 md:p-8">
      <h2 className="t-heading text-[24px]">Where it stands</h2>
      <p className="mt-1 text-[14px] text-muted">
        #{t.rank} of {r.teams.length}. Every ETF in round {r.id}, by return.
      </p>
      <div className="relative mt-8 h-20">
        <div className="absolute inset-x-0 top-9 h-0.5 bg-surface-2" />
        {r.teams.map((x, i) =>
          x.teamKey === t.teamKey ? null : (
            <span
              key={x.teamKey}
              className={`absolute size-2.5 -translate-x-1/2 rounded-full ${x.winningNow ? "bg-up/60" : x.drawingNow ? "bg-accent/70" : "bg-down/50"}`}
              style={{ left: pos(x.returnPct), top: `${22 + (i % 3) * 12}px` }}
              title={`${teamName(x)} ${x.returnPct.toFixed(2)}%`}
            />
          ),
        )}
        <div className="absolute top-0 bottom-0 border-l-2 border-dashed border-[var(--brand-purple)]" style={{ left: pos(r.medianPct!) }} />
        <span className="absolute -top-5 translate-x-1.5 text-[11px] font-semibold tracking-[0.12em] text-[var(--brand-purple)]" style={{ left: pos(r.medianPct!) }}>
          MEDIAN
        </span>
        <span
          className="absolute top-[26px] size-5 -translate-x-1/2 rounded-full border-[3px] border-bg bg-ink shadow-card"
          style={{ left: pos(t.returnPct) }}
          aria-label={`This ETF, #${t.rank}`}
        />
      </div>
      <div className="mt-2 flex justify-between text-[12px] text-muted">
        <span>Below MEDIAN: loses the ticket</span>
        <span>Above: wins a share of the pot</span>
      </div>
    </section>
  );
}
