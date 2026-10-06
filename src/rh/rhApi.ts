// Robinhood's public Stock Token API (api.robinhood.com/rhj, read-only,
// 60 req/s, 15 s cache). One /prices call returns every token's quote.
//
// tokenBid / tokenAsk are already multiplier-adjusted (one token's value,
// like the Chainlink feed); bid / ask are the raw share price. We use the
// token mid. Used for live UI prices and, with LEAGUE_PRICE_SOURCE=robinhood,
// for short demo rounds (Chainlink stock feeds only move on a 0.5% deviation
// or the 24 h heartbeat, too coarse for a one-hour round).

import type { PriceSample } from "../league/snapshot";

const BASE = "https://api.robinhood.com/rhj";

export interface RhQuote {
  tokenSymbol: string;
  tokenBid?: string;
  tokenAsk?: string;
  bid: string;
  ask: string;
  isTradingHalt: boolean;
  generatedAt: string;
}

/** Parse a decimal string into 1e18 fixed point without floats. */
export function decimalToE18(x: string): bigint {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(x.trim());
  if (!m) throw new Error(`bad decimal: ${x}`);
  return BigInt(m[1]) * 10n ** 18n + BigInt((m[2] ?? "").slice(0, 18).padEnd(18, "0"));
}

export async function rhQuotes(fetcher: typeof fetch = fetch): Promise<RhQuote[]> {
  const r = await fetcher(`${BASE}/prices`, { cache: "no-store" } as RequestInit);
  if (!r.ok) throw new Error(`Robinhood /prices: HTTP ${r.status}`);
  return ((await r.json()) as { quotes: RhQuote[] }).quotes;
}

/** One sample from /prices, for the given ticker → league token (lower case) map. */
export function sampleFromQuotes(quotes: RhQuote[], tokenOf: Map<string, string>, at: number, decimals = 18): Map<string, PriceSample> {
  const out = new Map<string, PriceSample>();
  for (const q of quotes) {
    const token = tokenOf.get(q.tokenSymbol.toUpperCase());
    if (!token || !q.tokenBid || !q.tokenAsk) continue;
    let value: bigint;
    try {
      value = (decimalToE18(q.tokenBid) + decimalToE18(q.tokenAsk)) / 2n;
    } catch {
      continue;
    }
    if (value <= 0n) continue;
    const quoteAge = at - Date.parse(q.generatedAt);
    out.set(token, { token, value, decimals, trading: !q.isTradingHalt && quoteAge < 5 * 60_000, at });
  }
  return out;
}
