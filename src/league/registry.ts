// The league's tokens on the current chain: mainnet Stock Tokens, the
// testnet faucet tokens, or the local demo's mock copies (data/local-demo.json
// maps ticker → mock address). Every token maps back to its stock, and so to
// its mainnet Chainlink feed.

import { existsSync, readFileSync } from "node:fs";
import { getAddress, type Address } from "viem";
import { STOCKS, type StockInfo } from "../ui/data/stocks";
import { leagueChain } from "./chain";
import type { FeedSource } from "../rh/feeds";

export interface ChainStock {
  stock: StockInfo;
  /** The token on the league chain (checksummed). */
  address: Address;
}

let cache: { key: string; list: ChainStock[] } | null = null;

const demoFile = () => (process.env.LEAGUE_DATA_DIR ? `${process.env.LEAGUE_DATA_DIR}/local-demo.json` : "data/local-demo.json");

/** League stocks playable on this chain, with their addresses here. */
export function chainStockList(): ChainStock[] {
  const chain = leagueChain();
  const key = chain === "local" ? `local:${existsSync(demoFile())}` : chain;
  if (cache?.key === key) return cache.list;
  let list: ChainStock[];
  if (chain === "mainnet") list = STOCKS.map((stock) => ({ stock, address: getAddress(stock.address) }));
  else if (chain === "testnet") list = STOCKS.filter((s) => s.testnet).map((stock) => ({ stock, address: getAddress(stock.testnet!) }));
  else {
    const tokens = existsSync(demoFile()) ? (JSON.parse(readFileSync(demoFile(), "utf8")) as { tokens: Record<string, string> }).tokens : {};
    list = STOCKS.filter((s) => tokens[s.ticker]).map((stock) => ({ stock, address: getAddress(tokens[stock.ticker]) }));
  }
  cache = { key, list };
  return list;
}

export function tokenRegistry(): Map<string, StockInfo> {
  return new Map(chainStockList().map((c) => [c.address.toLowerCase(), c.stock]));
}

export const tickerOf = (token: string): string | null => tokenRegistry().get(token.toLowerCase())?.ticker ?? null;

/** Feed sources for the given league tokens (unknown tokens are skipped). */
export function feedSources(tokens: string[]): FeedSource[] {
  const reg = tokenRegistry();
  return tokens.flatMap((t) => {
    const s = reg.get(t.toLowerCase());
    return s ? [{ token: t.toLowerCase(), feed: s.feed, mainnetToken: s.address, decimals: s.decimals, allWeek: s.kind === "crypto" }] : [];
  });
}

/** This chain's crypto-slice tokens (lower case), for the basket rules. */
export const cryptoTokens = (): string[] => chainStockList().filter((c) => c.stock.kind === "crypto").map((c) => c.address.toLowerCase());

/** Ticker → league token (lower case), for the Robinhood quote API. */
export const tokenByTicker = (): Map<string, string> => new Map(chainStockList().map((c) => [c.stock.ticker, c.address.toLowerCase()]));
