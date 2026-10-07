# Profit Markets by Kickoff: 3-minute demo script

Picture: `renders/kickoff-demo.mp4` (1920×1080, 30 fps, 3:00).
Sound: the voiceover below (Kokoro `af_heart` via `hyperframes tts`, one clip per scene at the times in
`assets/audio/vo/lines.json`, built into `assets/audio/voiceover.mp3`) and a quiet MusicGen bed
(`assets/audio/music.mp3`) held well under the voice.
Each block below lines up with a scene; the timecodes are where the picture changes.

> Data: stock prices are the 6 Oct 2026 Robinhood Chain feed snapshot. The round shown
> (64 ETFs, 1,128 tickets) is a **sample round**, and the UI scenes say so in the corner. The
> "at scale" numbers in scene 11 are an illustrative model, not traction.

---

### 1 · Hook, 0:00–0:08
**On screen:** black. Real tickers drift past ("NVDA to the moon", "TSLA is cooked") like a group chat. Then: *Nobody gets paid for being right.*
**VO:** Everyone has a stock pick. Your group chat is full of them. But nobody ever gets paid for being right.

### 2 · Problem, 0:08–0:20
**On screen:** two cards. "Investing apps: solo, silent." / "Fantasy leagues: social, but you don't own the players." They merge into one question: *What if your picks were real, and the league paid out?*
**VO:** Investing apps are built for going it alone. Games are social, but you never own what you play with. So we asked: what if your picks were real, and the league paid out?

### 3 · Brand, 0:20–0:31
**On screen:** the Kickoff mark, then the *Profit Markets.* wordmark, with the stock-card deck fanning out (TSLA, NVDA, AAPL, META, MSFT). "Built on Robinhood Chain."
**VO:** Meet Profit Markets, by Kickoff: gamified ETFs on Robinhood Chain, made of real Stock Tokens. Build an ETF. Beat the median. Get paid Friday.

### 4 · How it works, 0:31–0:43
**On screen:** three steps. 01 Pick 3–10 real stocks (+ up to 20% BTC/ETH). 02 Lock it with a $5 ticket. 03 Finish above MEDIAN to win.
**VO:** It takes three steps. Pick three to ten real stocks, plus up to twenty percent in Bitcoin and Ether. Lock your basket with a five dollar ticket. Then finish above the median to win.

### 5 · Connect, 0:43–0:53
**On screen:** the app. The Connect modal (Robinhood Wallet, MetaMask, Rabby). The cursor picks one, and the wallet chip shows `0x4799…28aE · 250.00 USDG`.
**VO:** Connect any wallet. Robinhood Wallet, MetaMask, or Rabby. No account, no custody. Every move is a transaction you sign yourself.

### 6 · Build an ETF, 0:53–1:17
**On screen:** the Build page. The cursor adds NVDA, AMD, TSM and MU. The "Your ETF" panel fills in: weights 35 / 25 / 20 / 20, basket $250, ticket $5, buy fee 1%. It's named "AI Chips Only". Lock → wallet signature → steps tick (Approve stocks ✓, Approve USDG ✓, Lock basket + ticket ✓) → "Locked on Robinhood Chain" with the tx hash.
**VO:** Let's build one. I'm going all in on AI chips: Nvidia, AMD, TSMC, and Micron. Set the weights, name it, and lock. The basket goes into the league contract as real Stock Tokens, priced by Chainlink, and it comes back to you when the round ends. Win or lose, you only ever risk the ticket.

### 7 · Live week, 1:17–1:36
**On screen:** the ticker strip scrolls. The "AI Chips Only" ETF page: a live return chart against the MEDIAN line, the holdings moving, a "Winning now" pill, and "If it ended now: $11.80". The league table re-sorts as prices move.
**VO:** Now the week runs on the market's clock. Entries close at Monday's open, and scoring ends at Friday's close. Every ETF is ranked by how much it gains, live, so you always know where you stand: winning, drawing, or behind.

### 8 · Tickets earn yield, 1:36–1:51 (new feature, video only)
**On screen:** $5 tickets flow into the "USDG savings vault · Robinhood Earn". A time-lapse clock runs Mon 9:30 → Fri 16:00 while the **interest counter** climbs to $3.17 on $5,640 parked at ~4.8% APY. "Into the winners' pot. Your stocks never move."
**VO:** And your ticket never sits idle. Once entries close, every ticket goes into a USDG savings vault, Robinhood Earn on mainnet, and the interest goes straight into the winners' pot. Your stocks never move.

### 9 · Bring your own agent, 1:51–2:12
**On screen:** a chat with an agent connected to the Kickoff MCP server. "Build me an AI chips ETF and back the best team above MEDIAN with $5." Real tool calls tick by: `get_round`, `list_stocks`, `plan_create_etf`, `plan_back_team`. A wallet prompt appears: "Sign 2 transactions". "Agent Alpha" joins the league table with an agent badge.
**VO:** Prefer to delegate? Bring your own agent. Our MCP server lets Claude, ChatGPT, or any custom agent read the league, build an ETF, and back a team. The agent prepares every transaction, and your wallet still signs. We never hold a key, and we never run your agent.

### 10 · Friday settlement, 2:12–2:30
**On screen:** "Fri 4:00 PM · Round 12 settled". The MEDIAN line drops into the table: 32 ETFs above win, #33 *Crypto Adjacent* sits exactly on MEDIAN and draws (ticket back), and the rest lose. Your payout counts up: $5 → $13.62. Then the verify box: "Inputs published · keccak 0x9f3c…a41e on-chain ✓ Recomputed: match".
**VO:** Friday, four p.m. The keeper settles the round. ETFs above the median split the tickets below it, sized by stake and accuracy. Exactly on the median is a draw: your ticket comes back. Every input is hashed on-chain, so anyone can verify it.

### 11 · How we make money, 2:30–2:48 (new feature, video only)
**On screen:** the **revenue panel** for round 12: $5,640 in tickets → $2,770 losing → 10% take $277 → platform $138.50 · season pot $138.50; winners' pot $2,493 + $3.17 interest; creators earned $214.60. Then the illustrative model: 100k tickets a week ≈ $11k platform revenue a week, about $585k a year, before "Buy the ETF" fees.
**VO:** How we make money: a ten percent take on losing tickets. Five percent to the platform, and five to a season pot that tops up thin rounds. Creators earn ten percent of their backers' winnings. It's peer to peer. We never bet against our players.

### 12 · Close, 2:48–3:00
**On screen:** the deck of cards settles behind the wordmark. "Live on Robinhood Chain testnet" · stocks.kickoff.cash · "Build an ETF. Beat the median. Get paid Friday."
**VO:** Profit Markets. Real stocks, real stakes, live on Robinhood Chain testnet today. Build an ETF. Beat the median. Get paid Friday.

---

## The sample round (kept consistent across scenes)

| # | ETF | Basket | Return | Result |
|---|---|---|---|---|
| 1 | Space & Rockets | SPCX 40 · RKLB 35 · PLTR 25 | +7.92% | win |
| 2 | **AI Chips Only** (you) | NVDA 35 · AMD 25 · TSM 20 · MU 20 | +6.84% | win, pays $13.62 on $5 |
| 3 | Agent Alpha (agent) | NVDA 30 · PLTR 25 · MSFT 25 · BTC 20 | +5.12% | win |
| 4 | Quantum Leap | IONQ 40 · RGTI 35 · NBIS 25 | +4.47% | win |
| 5 | Mag 7 Lite | AAPL 25 · MSFT 25 · GOOGL 25 · AMZN 25 | +2.31% | win |
| 32 | Boring But Rich | SPY 50 · QQQ 30 · SGOV 20 | +1.21% | win |
| 33 | Crypto Adjacent | COIN 40 · MSTR 40 · ETH 20 | +1.08% | **MEDIAN: draw** |
| 34 | Meme Season | GME 40 · TSLA 35 · USAR 25 | −0.37% | lose |
| 64 | Oil Bet | USO 60 · SLV 25 · EWY 15 | −4.86% | lose |

64 ETFs, so k = 64 // 2 + 1 = 33: #33 is the median and draws, #1–32 win, #34–64 lose.
Tickets: 1,128 × $5 = $5,640. Winning 560, draw 14, losing 554 = $2,770. Take 10% = $277
(platform $138.50, season pot $138.50). Winners' pot $2,493 + $3.17 interest
($5,640 × 4.8% × 4.27 days / 365).

Illustrative model (scene 11): 100,000 tickets a week = $500k. About 45% of them lose = $225k, and the
platform's 5% = $11,250 a week, about $585k a year.
