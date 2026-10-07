---
message: "Build an ETF from real stocks, beat the median, get paid Friday: a real, verifiable stock league on Robinhood Chain."
audience: hackathon judges and investors
mode: autonomous
duration: 180
canvas: 1920x1080
transitions: blur crossfade (primary, 0.8s) · zoom-through (brand reveal) · vertical push (into the app)
---

Narration and timecodes: SCRIPT.md. Each frame is one sub-composition in `compositions/`.

## Frame 1
status: built · src: compositions/hook.html · 0:00–0:08
rules: staggered entrance (group-chat bubbles), depth-of-field-blur (bubbles dim behind the line), blur-in headline swap.

## Frame 2
status: built · src: compositions/problem.html · 0:08–0:20
rules: split-tilt-cards (two panes), svg-path-draw (lonely chart), center-outward collapse into the question.

## Frame 3
status: built · src: compositions/brand.html · 0:20–0:31
rules: logo sting → nav lockup, the landing-hero card fan (stock cards from docs/design/stock-card), ambient-glow-bloom.

## Frame 4
status: built · src: compositions/how.html · 0:31–0:43
rules: staggered blocks synced to VO, stat-bars-and-fills (MEDIAN bars), press-release-spring (lock).

## Frame 5
status: built · src: compositions/connect.html · 0:43–0:53
rules: cursor-click-ripple, modal spring-in, viewport-change push to the wallet chip.

## Frame 6
status: built · src: compositions/build.html · 0:53–1:17
rules: cursor-click-ripple ×4, discrete-text-sequence (typing the name), counting (weights, basket), viewport-change, tx-steps spinner → check.

## Frame 7
status: built · src: compositions/live.html · 1:17–1:36
rules: chart-scrub-readout (baked seeded price paths), live table re-sort (moving-average ranks), ticker tape, multi-phase-camera.

## Frame 8
status: built · src: compositions/yield.html · 1:36–1:51 · NEW FEATURE (video only): live ticket-interest counter
rules: tickets stream into the vault, counting time-lapse Mon 9:30 → Fri 4:00, progress fill.

## Frame 9
status: built · src: compositions/agents.html · 1:51–2:12
rules: chat typing, MCP tool calls tick in (real tool names from src/agent/mcpServer.ts), wallet signature prompt, viewport-change in and out.

## Frame 10
status: built · src: compositions/settle.html · 2:12–2:30
rules: MEDIAN line draw, result pills pop, payout count-up, verify card + terminal.

## Frame 11
status: built · src: compositions/revenue.html · 2:30–2:48 · NEW FEATURE (video only): per-round revenue panel
rules: node-by-node money flow with svg-path-draw wires, illustrative model with count-up.

## Frame 12
status: built · src: compositions/close.html · 2:48–3:00
rules: deck arc, headline blur-in, CTA pills, fade to black.
