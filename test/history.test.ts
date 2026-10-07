import { describe, it, expect } from "vitest";
import type { Hex } from "viem";
import { buildRoundHistory, teamSeries } from "../src/league/history";
import { teamKeyOf } from "../src/league/basket";
import { BENCH_KEY } from "../src/league/prices";
import type { ChainEntry } from "../src/league/settlement";
import type { PriceSample, Snapshot } from "../src/league/snapshot";

const E18 = 10n ** 18n;
const T = (n: number) => `0x${n.toString(16).padStart(40, "0")}` as Hex;
const W = (n: number) => `0x${(0xabc000 + n).toString(16).padStart(40, "0")}` as Hex;
const TOKENS = Array.from({ length: 12 }, (_, i) => T(i + 1));
const e18 = (usd: number) => BigInt(Math.round(usd * 1e6)) * 10n ** 12n;

function creator(index: number, tokens: Hex[]): ChainEntry {
  const usd = [5, 4, 3];
  const amounts = usd.map((u) => (BigInt(u) * E18) / 100n);
  return { index, wallet: W(index), teamKey: teamKeyOf(tokens, usd.map((u) => BigInt(u) * E18)), isCreator: true, basket: { tokens, amounts } };
}
const start = new Map<string, Snapshot>(TOKENS.map((t) => [t.toLowerCase(), { token: t.toLowerCase(), value: e18(100), decimals: 18, samples: 3 }]));
function sample(at: number, prices: Record<number, number>, spy?: number): { at: number; sample: Map<string, PriceSample> } {
  const m = new Map<string, PriceSample>();
  TOKENS.forEach((t, i) => {
    if (prices[i] === -1) return; // missing
    m.set(t.toLowerCase(), { token: t.toLowerCase(), value: e18(prices[i] ?? 100), decimals: 18, trading: true, at });
  });
  if (spy !== undefined) m.set(BENCH_KEY, { token: BENCH_KEY, value: e18(spy), decimals: 18, trading: true, at });
  return { at, sample: m };
}

// Four teams on disjoint baskets: tokens 0-2, 3-5, 6-8, 9-11.
const entries = [0, 1, 2, 3].map((i) => creator(i, TOKENS.slice(i * 3, i * 3 + 3)));
const base = { roundId: 1n, stake: 5n * 10n ** 6n, capMultiple: 100, maxBackers: 20, entries, start, startAt: 1_000 };

describe("buildRoundHistory", () => {
  const h = buildRoundHistory({
    ...base,
    samples: [
      sample(3_000, { 0: 110, 1: 110, 2: 110, 3: 105, 4: 105, 5: 105, 6: 95, 7: 95, 8: 95 }, 505),
      sample(500, {}, 400), // before the start: ignored
      sample(2_000, {}, 500),
      sample(4_000, { 4: -1 }), // a missing price: skipped
    ],
  });

  it("starts at zero and keeps the samples in time order, skipping unscorable ones", () => {
    expect(h.t).toEqual([1_000, 2_000, 3_000]);
    expect(Object.values(h.teams).map((s) => s[0])).toEqual([0, 0, 0, 0]);
  });

  it("scores each point like settlement: team returns and MEDIAN", () => {
    const [a, b, c, d] = entries.map((e) => teamSeries(h, e.teamKey)!);
    expect(a.at(-1)!.etf).toBeCloseTo(10, 6);
    expect(b.at(-1)!.etf).toBeCloseTo(5, 6);
    expect(c.at(-1)!.etf).toBeCloseTo(-5, 6);
    expect(d.at(-1)!.etf).toBeCloseTo(0, 6);
    // MEDIAN is the median return (the engine's, as on the round page): (5 + 0) / 2.
    expect(h.median.at(-1)).toBeCloseTo(2.5, 6);
  });

  it("keeps team lines but no MEDIAN where the round would void (all returns equal)", () => {
    expect(h.median[1]).toBeNull();
    expect(teamSeries(h, entries[0].teamKey)![1].etf).toBe(0);
  });

  it("measures SPY from its first sample in the round", () => {
    expect(h.spy).toEqual([0, 0, 1]);
  });

  it("returns null for a team that isn't in the round", () => {
    expect(teamSeries(h, `0x${"0".repeat(64)}`)).toBeNull();
  });
});
