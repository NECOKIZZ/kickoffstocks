// Server-side loaders for the API routes: live prices and round views from
// the chain. Live prices come from Robinhood's quote API (one call, every
// token), falling back to the Chainlink feeds; the local demo chain uses demo
// prices.

import { clientsFromEnv, escrowFromEnv, leagueChain } from "./chain";
import { leagueEscrowAbi, readEntries, readRound, readTeamMeta, roundTokens } from "./escrow";
import { buildSnapshot, type PriceSample, type Snapshot } from "./snapshot";
import { FileStore } from "./store";
import { buildRoundView, type RoundView } from "./view";
import { tickerOf } from "./registry";
import { samplePrices } from "./prices";

let liveCache: { at: number; source: string; sample: Map<string, PriceSample> } | null = null;

/** Live prices, cached for 15 s. Null when no source is reachable. */
export async function livePrices(): Promise<{ source: string; sample: Map<string, PriceSample> } | null> {
  if (leagueChain() === "local") {
    const sample = await samplePrices("local-demo").catch(() => null);
    return sample ? { source: "local demo prices", sample } : null;
  }
  if (liveCache && Date.now() - liveCache.at < 15_000) return liveCache;
  for (const source of ["robinhood", "chainlink"] as const) {
    try {
      const sample = await samplePrices(source);
      if (sample.size === 0) continue;
      liveCache = { at: Date.now(), source: source === "robinhood" ? "Robinhood quotes, live" : "Chainlink feeds, live", sample };
      return liveCache;
    } catch {
      // try the next source
    }
  }
  return null;
}

const one = (sample: Map<string, PriceSample>, tokens: string[]) => buildSnapshot([sample], tokens, 1).prices;

export async function loadRoundView(roundId?: bigint): Promise<RoundView | null> {
  const { pub } = clientsFromEnv();
  const escrow = escrowFromEnv();
  const id = roundId ?? ((await pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "roundCount" })) as bigint);
  if (id === 0n) return null;
  const [info, entries, seasonPot, block] = await Promise.all([
    readRound(pub, escrow, id),
    readEntries(pub, escrow, id),
    pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "seasonPot" }) as Promise<bigint>,
    pub.getBlock(),
  ]);
  const tokens = roundTokens(entries);
  const store = new FileStore();
  const saved = (phase: "start" | "end") => store.loadSamples(id, phase).map((s) => s.sample);

  // Start prices: the saved start samples, else (entries still open) current prices.
  // Current prices: live Binance, else the latest saved end sample, else the start.
  const liveP = await livePrices();
  const live = liveP?.sample ?? null;
  const startSamples = saved("start");
  const endSamples = saved("end");
  const start: Map<string, Snapshot> = startSamples.length
    ? buildSnapshot(startSamples, tokens, 1).prices
    : live
      ? one(live, tokens)
      : new Map();
  const now: Map<string, Snapshot> = endSamples.length
    ? buildSnapshot(endSamples, tokens, 1).prices
    : live
      ? one(live, tokens)
      : start;
  const priceSource = endSamples.length ? "saved end samples" : liveP ? liveP.source : "saved start samples";

  const meta = await readTeamMeta(pub, escrow, id, entries.filter((e) => e.isCreator).map((e) => e.teamKey));
  return buildRoundView({ info, entries, start, now, nowSec: Number(block.timestamp), seasonPot, tickerOf, priceSource, meta });
}
