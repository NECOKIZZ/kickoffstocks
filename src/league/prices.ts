// One price sample of every league token on this chain, from the configured
// source:
//   LEAGUE_PRICE_SOURCE=chainlink  (default) Robinhood Chain's Chainlink feeds,
//                                  verifiable on-chain by anyone.
//   LEAGUE_PRICE_SOURCE=robinhood  Robinhood's /prices API token mid: moves
//                                  every few seconds, for short demo rounds.
// The local demo chain uses deterministic demo prices for its mock tokens.

import { existsSync, readFileSync } from "node:fs";
import { STOCKS, demoChangePct } from "../ui/data/stocks";
import { sampleFeeds } from "../rh/feeds";
import { rhQuotes, sampleFromQuotes } from "../rh/rhApi";
import { leagueChain } from "./chain";
import { chainStockList, feedSources, tokenByTicker } from "./registry";
import type { PriceSample } from "./snapshot";

export type PriceSource = "chainlink" | "robinhood" | "local-demo";

export function priceSourceFromEnv(): PriceSource {
  if (leagueChain() === "local") return "local-demo";
  return process.env.LEAGUE_PRICE_SOURCE === "robinhood" ? "robinhood" : "chainlink";
}

/**
 * Local demo chain: the mock tokens' snapshot prices, moved by the showcase
 * movement (demoChangePct) with a slow wobble, so standings change over time.
 */
export function localDemoPrices(at = Date.now()): Map<string, PriceSample> | null {
  const f = process.env.LEAGUE_DATA_DIR ? `${process.env.LEAGUE_DATA_DIR}/local-demo.json` : "data/local-demo.json";
  if (!existsSync(f)) return null;
  const { tokens } = JSON.parse(readFileSync(f, "utf8")) as { tokens: Record<string, string> };
  const wobble = 0.75 + 0.25 * Math.sin(at / 600_000);
  const m = new Map<string, PriceSample>();
  for (const [ticker, addr] of Object.entries(tokens)) {
    const s = STOCKS.find((x) => x.ticker === ticker);
    if (!s) continue;
    const price = s.price * (1 + (demoChangePct(ticker) / 100) * wobble);
    const token = addr.toLowerCase();
    m.set(token, { token, value: BigInt(Math.round(price * 1e6)) * 10n ** 12n, decimals: 18, trading: true, at });
  }
  return m;
}

export async function samplePrices(source: PriceSource = priceSourceFromEnv(), at = Date.now()): Promise<Map<string, PriceSample>> {
  if (source === "local-demo") {
    const m = localDemoPrices(at);
    if (!m) throw new Error("no local demo prices (run scripts/local-demo.mts first)");
    return m;
  }
  if (source === "robinhood") {
    // Robinhood quotes cover stocks only: crypto comes from its Chainlink feeds.
    const s = sampleFromQuotes(await rhQuotes(), tokenByTicker(), at);
    const crypto = chainStockList().filter((c) => c.stock.kind === "crypto").map((c) => c.address);
    if (crypto.length) for (const [k, v] of await sampleFeeds(feedSources(crypto), undefined, at)) s.set(k, v);
    return s;
  }
  return sampleFeeds(feedSources(chainStockList().map((c) => c.address)), undefined, at);
}

export const PRICE_SOURCE_LABEL: Record<PriceSource, string> = {
  chainlink: "Chainlink feeds on Robinhood Chain",
  robinhood: "Robinhood Stock Token API (token mid)",
  "local-demo": "local demo prices",
};
