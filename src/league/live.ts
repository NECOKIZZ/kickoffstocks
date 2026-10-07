// Server-side loaders for the API routes: live prices and round views from
// the chain. Live prices come from Robinhood's quote API (one call, every
// token), falling back to the Chainlink feeds; the local demo chain uses demo
// prices.

import { clientsFromEnv, escrowFromEnv, leagueChain } from "./chain";
import { leagueEscrowAbi, readEntries, readRound, readTeamMeta, roundTokens } from "./escrow";
import { buildSnapshot, type PriceSample, type Snapshot } from "./snapshot";
import { leagueStore } from "./store";
import { buildRoundView, type RoundView } from "./view";
import { cryptoTokens, tickerOf } from "./registry";
import { samplePrices } from "./prices";
import { buildRoundHistory, type RoundHistory } from "./history";

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
  const store = leagueStore();
  // An unreachable store shouldn't take the page down: show live prices instead.
  const saved = async (phase: "start" | "end") =>
    (
      await store.loadSamples(id, phase).catch((e) => {
        console.error(`store: ${e instanceof Error ? e.message : e}`);
        return [];
      })
    ).map((s) => s.sample);

  // Start prices: the saved start samples, else (entries still open) current prices.
  // Current prices: live quotes, else the latest saved end sample, else the start.
  const liveP = await livePrices();
  const live = liveP?.sample ?? null;
  const [startSamples, endSamples] = await Promise.all([saved("start"), saved("end")]);
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
  return buildRoundView({ info, entries, start, now, nowSec: Number(block.timestamp), seasonPot, tickerOf, priceSource, meta, cryptoTokens: cryptoTokens() });
}

// Chart history, cached per round so the page (which polls every few minutes)
// costs at most one build per round every 5 minutes, and one an hour once
// the round has ended.
const historyCache = new Map<string, { at: number; ttl: number; data: Promise<RoundHistory | null> }>();

export function loadRoundHistory(roundId: bigint): Promise<RoundHistory | null> {
  const key = roundId.toString();
  const hit = historyCache.get(key);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.data;
  const entry = { at: Date.now(), ttl: 5 * 60_000, data: Promise.resolve<RoundHistory | null>(null) };
  entry.data = buildHistoryNow(roundId, entry).catch((e) => {
    historyCache.delete(key); // don't cache a failure
    throw e;
  });
  historyCache.set(key, entry);
  return entry.data;
}

async function buildHistoryNow(roundId: bigint, cacheEntry: { ttl: number }): Promise<RoundHistory | null> {
  const { pub } = clientsFromEnv();
  const escrow = escrowFromEnv();
  const [info, entries] = await Promise.all([readRound(pub, escrow, roundId), readEntries(pub, escrow, roundId)]);
  const store = leagueStore();
  const startSamples = (await store.loadSamples(roundId, "start")).map((s) => s.sample);
  if (startSamples.length === 0) return null; // entries still open: nothing to chart yet
  const tokens = roundTokens(entries);
  const [track, end] = await Promise.all([store.loadSamples(roundId, "track"), store.loadSamples(roundId, "end")]);
  const samples = [...track, ...end];
  const ended = Date.now() >= info.end * 1000 || info.status !== "Open";
  if (ended) cacheEntry.ttl = 60 * 60_000;
  else {
    // A live point, so the line ends where the page's header number is.
    const live = await livePrices();
    if (live) samples.push({ at: Date.now(), sample: live.sample });
  }
  return buildRoundHistory({
    roundId,
    stake: info.stake,
    capMultiple: info.capMultiple,
    maxBackers: info.maxBackers,
    entries,
    start: buildSnapshot(startSamples, tokens, 1).prices,
    startAt: info.entryClose * 1000,
    samples,
    cryptoTokens: cryptoTokens(),
  });
}
