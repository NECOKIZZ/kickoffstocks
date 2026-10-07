"use client";

// Ticker strip with this chain's live prices and change since round start.

import { TickerStrip } from "../../ui/components/TickerStrip";
import { STOCKS, demoChangePct } from "../../ui/data/stocks";
import { useStocks } from "../hooks";

export function LiveTicker() {
  const { data } = useStocks();
  const live = new Map(data?.stocks.map((s) => [s.ticker, s]) ?? []);
  const pool = [...STOCKS.filter((s) => s.kind !== "crypto").slice(0, 22), ...STOCKS.filter((s) => s.kind === "crypto")];
  const stocks = pool.map((s) => ({ ...s, price: live.get(s.ticker)?.price ?? s.price }));
  const changes = Object.fromEntries(stocks.map((s) => [s.ticker, live.get(s.ticker)?.changePct ?? (data ? 0 : demoChangePct(s.ticker))]));
  const src = !data ? "Loading prices…" : `${data.source} · since round start`;
  return <TickerStrip stocks={stocks} changes={changes} source={src} />;
}
