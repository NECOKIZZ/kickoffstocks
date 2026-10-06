// Basket weight helpers for the create flow (pure, tested).

/** Equal weights in whole percents summing to 100 (the first ones get the remainder). */
export function equalWeights(tickers: string[]): Record<string, number> {
  const w: Record<string, number> = {};
  if (!tickers.length) return w;
  const base = Math.floor(100 / tickers.length);
  tickers.forEach((t, i) => (w[t] = base + (i < 100 - base * tickers.length ? 1 : 0)));
  return w;
}
