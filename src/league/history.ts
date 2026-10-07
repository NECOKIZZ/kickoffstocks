// A round's return history for the ETF page's chart: every team's return,
// MEDIAN and the S&P 500 (SPY), at each saved chart sample.
//
// Each point reuses the real settlement code with that sample as the "end"
// prices, so a team's line and MEDIAN are exactly what the round would score
// at that moment. Display only: rounds are settled from the start and end
// windows, never from these samples.

import { settleRound, type ChainEntry } from "./settlement";
import { buildSnapshot, type PriceSample, type Snapshot } from "./snapshot";
import { BENCH_KEY } from "./prices";

export interface RoundHistory {
  /** Unix ms of each point; the first is the round's start (entries close). */
  t: number[];
  /** MEDIAN's return at each point, percent (null where it couldn't be scored). */
  median: (number | null)[];
  /** SPY's return since the first point with a SPY price, percent. */
  spy: (number | null)[];
  /** Each team's return at each point, percent, by team key (lower case). */
  teams: Record<string, (number | null)[]>;
}

export function buildRoundHistory(opts: {
  roundId: bigint;
  stake: bigint;
  capMultiple: number;
  maxBackers: number;
  entries: ChainEntry[];
  /** The round's start prices (the saved start samples, averaged). */
  start: Map<string, Snapshot>;
  /** Entries close, unix ms: the chart's zero point. */
  startAt: number;
  /** Chart samples in any order (track, end, and optionally a live one). */
  samples: { at: number; sample: Map<string, PriceSample> }[];
  cryptoTokens?: string[];
}): RoundHistory {
  const tokens = [...opts.start.keys()];
  const creators = opts.entries.filter((e) => e.isCreator).map((e) => e.teamKey.toLowerCase());
  const out: RoundHistory = { t: [opts.startAt], median: [0], spy: [null], teams: {} };
  for (const k of creators) out.teams[k] = [0];

  let spyBase: bigint | null = null;
  for (const { at, sample } of [...opts.samples].filter((s) => s.at > opts.startAt).sort((a, b) => a.at - b.at)) {
    const s = settleRound({
      roundId: opts.roundId,
      stake: opts.stake,
      capMultiple: opts.capMultiple,
      maxBackers: opts.maxBackers,
      seasonPot: 0n,
      entries: opts.entries,
      start: opts.start,
      end: buildSnapshot([sample], tokens, 1).prices,
      priceProblems: [],
      cryptoTokens: opts.cryptoTokens,
    });
    // A missing price voids with no teams: skip the point. An engine void (too
    // few ETFs, all returns equal) still has every team's return, just no MEDIAN.
    if (s.teams.length === 0) continue;
    const bench = sample.get(BENCH_KEY);
    if (bench && spyBase === null) spyBase = bench.value;
    out.t.push(at);
    out.median.push(s.void || s.median === null ? null : Number(s.median) / 1e10);
    out.spy.push(bench && spyBase ? Number(((bench.value - spyBase) * 10n ** 8n) / spyBase) / 1e6 : null);
    const ret = new Map(s.teams.map((x) => [x.teamKey.toLowerCase(), Number(x.ret) / 1e10]));
    for (const k of Object.keys(out.teams)) out.teams[k].push(ret.get(k) ?? null);
  }
  // SPY starts at 0 on the first point that has it.
  const first = out.spy.findIndex((v) => v !== null);
  if (first > 0) out.spy[0] = 0;
  return out;
}

/** One team's series, for the API. */
export function teamSeries(h: RoundHistory, teamKey: string) {
  const etf = h.teams[teamKey.toLowerCase()];
  if (!etf) return null;
  return h.t.map((t, i) => ({ t, etf: etf[i], median: h.median[i], spy: h.spy[i] }));
}
