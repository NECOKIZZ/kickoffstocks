# Kickoff Stocks

Kickoff's stock league on **Robinhood Chain**. Build an "ETF" from real Robinhood Stock Tokens, lock it with a $5 ticket, and **beat AVERAGE**.
Built for the Colosseum **Crypto World's Fair** (Robinhood Chain track), as a new game mode of [Kickoff](https://kickoff.cash).

- **Creators** lock a basket of 3–10 Robinhood Stock Tokens (≥ $10) plus a $5 USDG ticket. The locked basket *is* the ETF: its score is the real return of exactly what was locked, priced by Robinhood Chain's Chainlink feeds (which include reinvested dividends).
- **Backers** put a $5 ticket on a creator's ETF, and/or (mainnet) **buy the ETF** in one go through 0x, with the creator earning their buy fee.
- **AVERAGE** (from Fantasy Premier League): a ghost team at the round's median return. Above AVERAGE wins a share of the tickets below it, split by stake × accuracy. **On AVERAGE is a draw**: your ticket comes back. Below loses the ticket. Peer to peer: the platform never puts money in.
- **Tickets earn while you wait**: once entries close, the round's tickets are parked in a USDG savings vault (Robinhood Earn on mainnet) and the interest goes into the pot. Locked stocks never move.
- **Bring your own agent**: an MCP server (`/api/mcp`) lets Claude, ChatGPT or your own agent read the league and prepare transactions; the user's wallet signs.

> "ETF" here means an on-chain basket of tokenized stocks, not a regulated fund. Capital is at risk. Robinhood Stock Tokens are not available in restricted regions, including the US.

## How settlement works
1. Each ETF's score is the buy-and-hold return of its locked basket: Chainlink prices averaged over several samples at the start and at the end. A stale feed, a paused oracle (corporate action) or a stalled chain voids the round.
2. D = best return − this return. With `n` ETFs, `k = n//2 + 1`, `m` = the k-th smallest D. An ETF wins if D < m (above AVERAGE); an ETF exactly on AVERAGE draws.
3. Accuracy `a = (1 / (1 + D/m))^6`. The pot (losing tickets minus a 10% take, plus ticket interest) is split by team stake × a, under a 100× gain cap.
4. Inside a team, winnings split by stake. The creator takes 10% of their backers' winnings.
5. The take is split 5% platform, 5% season pot. The season pot tops up thin pots.

**Trust model:** a keeper computes settlement off-chain with this open-source engine and publishes every input; their hash goes on-chain with the payouts. The contract enforces:
- the pot adds up (Σ payouts + platform + season in = Σ stakes + season out + ticket interest);
- no payout above the cap, and the season pot can't go negative;
- baskets always go back to their owners;
- liveness: after the round, anyone can bring parked tickets back from the vault, and 3 days after it anyone can void the round and everyone gets their stake back.

## Status
| Piece | Where | State |
|---|---|---|
| Settlement engine (with AVERAGE + ticket yield) | `src/engine/league.ts` | ✅ tested |
| League contract (+ savings vault, TestUSDG) | `contracts/src/` | ✅ 42 Foundry tests + a mainnet fork test with real Stock Tokens |
| Prices | `src/rh/feeds.ts` (Chainlink), `src/rh/rhApi.ts` (Robinhood quotes) | ✅ live-checked |
| Buy the ETF | `src/rh/zeroEx.ts` (0x Swap API v2, creator fee) | ✅ unit-tested; needs a 0x key |
| Keeper + verifiable settlement | `scripts/keeper.mts`, `scripts/verify.mts` | ✅ end to end on a local chain |
| Web app (Kickoff design) | `app/`, `src/ui/`, `src/web/` | ✅ |
| BYO agents | `/api/mcp`, `/agent.md`, `skills/kickoff-stocks/` | ✅ |

## Run it
Node 22+, pnpm, [Foundry](https://getfoundry.sh).
```bash
pnpm install
pnpm test                       # engine, settlement, prices, 0x, MCP, end-to-end on anvil
pnpm typecheck
pnpm test:contracts             # Foundry tests (RH_FORK_URL=https://rpc.mainnet.chain.robinhood.com for the fork test)
```
- Local demo with no real money: [`docs/LOCAL.md`](docs/LOCAL.md).
- Deploy to Robinhood Chain testnet and run rounds: [`docs/YOUR-TODO.md`](docs/YOUR-TODO.md) and [`docs/KEEPER.md`](docs/KEEPER.md).

## Docs
- [`docs/YOUR-TODO.md`](docs/YOUR-TODO.md): what's left before the Colosseum deadline
- [`docs/KEEPER.md`](docs/KEEPER.md): running rounds
- [`docs/LOCAL.md`](docs/LOCAL.md): the whole app on a local chain
- [`docs/prototype-results.md`](docs/prototype-results.md): stress tests behind the rules
