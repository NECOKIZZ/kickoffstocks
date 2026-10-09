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
  // Moves count from the round's start (Monday's open); before that there's no move to show.
  const changes = Object.fromEntries(stocks.map((s) => [s.ticker, data ? (live.get(s.ticker)?.changePct ?? undefined) : demoChangePct(s.ticker)]));
  const started = !!data?.stocks.some((s) => s.changePct !== null);
  const src = !data ? "Loading prices…" : started ? `${data.source} · since round start` : `${data.source} · moves count from Monday's open`;
  return <TickerStrip stocks={stocks} changes={changes} source={src} />;
}
