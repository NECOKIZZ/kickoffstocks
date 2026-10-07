// Prices from Robinhood Chain's Chainlink feeds.
//
// Every Stock Token has a Chainlink feed (AggregatorV3, 8 decimals) quoting
// one token's USD value: share price × the corporate-action multiplier, so a
// token's return includes reinvested dividends. Feeds update 24/5 with the
// US market, on a deviation threshold or a 24 h heartbeat.
//
// A sample is valid ("trading") only if:
//   - the answer is positive,
//   - it is fresher than the heartbeat (+ a small margin). Stock feeds pause
//     with the market over the weekend, so for them the age counts only the
//     hours the 24/5 market is open (a Monday-morning answer from Friday
//     night is current, not stale),
//   - the token's oraclePaused() flag is off (corporate action in progress),
//   - the chain itself is live (latest block under 10 minutes old), which
//     stands in for an L2 sequencer-uptime check.
//
// Feeds exist on mainnet only. Testnet and local rounds read the same
// stocks' mainnet feeds (PRICE_RPC_URL), mapped by ticker.

import { createPublicClient, http, parseAbi, type Address, type PublicClient } from "viem";
import { robinhood } from "./chains";
import type { PriceSample } from "../league/snapshot";

export const aggregatorAbi = parseAbi([
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() view returns (uint8)",
]);
const stockTokenAbi = parseAbi(["function oraclePaused() view returns (bool)"]);

/** Feed heartbeat (all Robinhood stock feeds: 24 h) plus a margin. */
export const MAX_FEED_AGE_SEC = 86_400 + 75 * 60;

const DAY = 86_400;
/**
 * Seconds between two times (unix seconds) that fall outside the weekend
 * closure of the 24/5 stock market. It closes Friday 8pm and reopens Sunday
 * 8pm New York time; Sat 01:00 to Mon 00:00 UTC is closed under both EST and
 * EDT, so that is what's taken out (the hour of slack is in the margin above).
 */
export function marketOpenSeconds(from: number, to: number): number {
  if (to <= from) return 0;
  let closed = 0;
  // Monday 00:00 UTC of from's week (1970-01-01 was a Thursday, so Mondays are day 4 mod 7).
  const day = Math.floor(from / DAY);
  let monday = (day - ((day - 4) % 7 + 7) % 7) * DAY;
  for (; monday - 2 * DAY < to; monday += 7 * DAY) {
    const a = monday - 2 * DAY + 3600; // Saturday 01:00 UTC before this Monday
    closed += Math.max(0, Math.min(to, monday) - Math.max(from, a));
  }
  return to - from - closed;
}
export const MAX_CHAIN_LAG_SEC = 10 * 60;
const FEED_DECIMALS = 8;

export interface FeedSource {
  /** The token as the league holds it (this chain's address, lower case). */
  token: string;
  /** Mainnet Chainlink proxy. */
  feed: Address;
  /** Mainnet token, for oraclePaused(). */
  mainnetToken: Address;
  /** The league token's decimals (Robinhood Stock Tokens: 18). */
  decimals: number;
  /** Trades all week (crypto): no weekend allowance, and no oraclePaused() to read. */
  allWeek?: boolean;
}

export function priceClient(): PublicClient {
  return createPublicClient({
    chain: robinhood,
    transport: http(process.env.PRICE_RPC_URL ?? robinhood.rpcUrls.default.http[0]),
    batch: { multicall: true },
  }) as PublicClient;
}

/** One sample of every source's feed, in one multicall. */
export async function sampleFeeds(sources: FeedSource[], client: PublicClient = priceClient(), at = Date.now()): Promise<Map<string, PriceSample>> {
  const [block, rounds, paused] = await Promise.all([
    client.getBlock(),
    Promise.all(sources.map((s) => client.readContract({ address: s.feed, abi: aggregatorAbi, functionName: "latestRoundData" }).catch(() => null))),
    Promise.all(sources.map((s) => (s.allWeek ? false : client.readContract({ address: s.mainnetToken, abi: stockTokenAbi, functionName: "oraclePaused" }).catch(() => false)))),
  ]);
  const chainNow = Number(block.timestamp);
  const chainLive = Math.floor(at / 1000) - chainNow <= MAX_CHAIN_LAG_SEC;
  const out = new Map<string, PriceSample>();
  sources.forEach((s, i) => {
    const r = rounds[i];
    if (!r) return; // unreadable feed: no sample
    const [, answer, , updatedAt] = r;
    if (answer <= 0n) return;
    const age = s.allWeek ? chainNow - Number(updatedAt) : marketOpenSeconds(Number(updatedAt), chainNow);
    const fresh = age <= MAX_FEED_AGE_SEC;
    out.set(s.token, {
      token: s.token,
      value: answer * 10n ** BigInt(18 - FEED_DECIMALS),
      decimals: s.decimals,
      trading: fresh && !paused[i] && chainLive,
      at,
      updatedAt: Number(updatedAt),
    });
  });
  return out;
}
