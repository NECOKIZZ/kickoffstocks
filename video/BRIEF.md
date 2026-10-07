---
workflow: general-video
flow: automation
storyboard: no
message: "Build an ETF from real stocks, beat the median, get paid Friday: a real, verifiable stock league on Robinhood Chain."
destination: pitch-presentation
aspect: 1920x1080
language: en
audience: hackathon judges and investors (Colosseum, Robinhood Chain track)
length: 180s
angle: product-demo
---

## Intent

A 3-minute investor/judge demo for Profit Markets by Kickoff (Kickoff Stocks). The live site
is empty (week 1 hasn't run yet), so the product UI is recreated in HTML with Kickoff's own
brand and a believable sample round. It has to show every feature: real ETFs and stocks,
portfolios, live price movement, USDG tickets earning yield, bring-your-own agents (MCP),
settlement with MEDIAN and a draw, verification, and how the business makes money.
Clean, smooth transitions and animations.

## Customizations

- Two features exist only in the video, never on the live site: a live ticket-interest
  counter on the round, and a per-round revenue panel.
- Narration is a script (SCRIPT.md) for the team to record; the render is picture only.

## Notes

- Do not touch the live website: everything lives in `video/`, outside the Next.js build.
- Stock prices are the 6 Oct 2026 snapshot from `src/ui/data/stocks.ts`; the round itself is a
  sample, and the UI scenes carry a small "Sample round" tag. No invented traction numbers:
  the business-at-scale numbers are labeled as an illustrative model.
- Rules match the code: k = n//2 + 1 (the median ETF draws), 10% take on losing tickets
  (5% platform, 5% season pot), creator takes 10% of backers' winnings, ticket $5,
  basket 3-10 stocks, ≥ $10, BTC+ETH ≤ 20%.
