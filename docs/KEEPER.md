# Keeper: running rounds

The keeper opens rounds, samples prices, parks the tickets in the savings vault, and settles.

**In production it runs itself**: `keeper watch` (started by `render.yaml` next to the app) opens each
week's round, entries close Monday 9:30am New York (the open), the round ends Friday 4pm (the close),
it settles and opens the next week. Daylight saving is followed. Stock feeds don't update over the
weekend, so their age counts only the hours the 24/5 market is open. A round with no valid prices
(e.g. a market holiday on the Monday) voids and refunds everyone; the schedule carries on.
The commands below are for running rounds by hand (`LEAGUE_SCHEDULE=off` stops the weekly schedule).

## Commands
```bash
pnpm keeper open --entry-min 60 --run-min 60      # entries close in 60 min, the round runs 60 min after that
pnpm keeper auto <roundId> --samples 3 --every-min 5 [--source robinhood] [--no-park]
                                                   # waits, samples at start, parks tickets, samples at end, unparks, settles
pnpm keeper sample <roundId> start|end            # one price sample (saved to the store)
pnpm keeper park <roundId>                        # tickets into the savings vault (after entries close)
pnpm keeper unpark <roundId>                      # back, interest into the pot (settle does this too)
pnpm keeper settle <roundId> --dry-run            # preview payouts, nothing sent
pnpm keeper settle <roundId>                      # submit settlement
pnpm keeper status <roundId>
pnpm keeper watch [--no-schedule]                 # runs forever next to the app: opens each week's round, runs auto on it
```
**Price sources (`--source` or `LEAGUE_PRICE_SOURCE`):**
- `chainlink` (default): Robinhood Chain's Chainlink feeds, verifiable on-chain. They move on a 0.5% deviation or the 24 h heartbeat, during US market hours (24/5). Use for real (weekly) rounds.
- `robinhood`: Robinhood's quote API token mid, which moves every few seconds. Use for short demo rounds.

Testnet has no Chainlink feeds: testnet rounds read the same stocks' **mainnet** feeds (`PRICE_RPC_URL`).

**Chart samples:** while a round runs, `auto` also saves one price sample an hour (phase `track`,
24 a day, about 100 small rows a round) for the ETF page's live P&L chart, with SPY as the S&P 500
benchmark. They use Robinhood's quotes (the Chainlink stock feeds move only on a 0.5% change or once a
day), falling back to the feeds. Display only: scoring never reads them. `LEAGUE_TRACK_MIN` sets the
interval (default 60; `0` turns them off). The app serves them at `/api/rounds/<id>/history?team=<key>`,
cached for 5 minutes per round.

**Environment (`.env.local`):** `LEAGUE_CHAIN`, `RH_RPC_URL`, `PRICE_RPC_URL`, `ESCROW_ADDRESS`, `KEEPER_PRIVATE_KEY`, `LEAGUE_PRICE_SOURCE`, `DATABASE_URL` (or `LEAGUE_DATA_DIR`), `LEAGUE_SCHEDULE`, `LEAGUE_TRACK_MIN`.

## What settle does
1. Brings parked tickets back from the vault if they're still there; the interest becomes the round's bonus.
2. Reads every entry and locked basket from the contract.
3. Averages the saved samples inside each window: `entryClose … +30 min` and `end … +30 min`. A token that is missing, not live, or has fewer than 3 samples voids the round, and everyone is refunded.
4. Checks each basket at the start prices (≥ 3 stocks, ≤ 50% each, ≥ $10, team key matches). An invalid entry is refunded.
5. Runs the engine (MEDIAN, draws, pot + interest) and submits the payouts. Publishes the inputs (served at `/api/rounds/<id>/inputs`), whose keccak hash goes on-chain, so anyone can save them and recompute the result with `pnpm verify inputs.json <id>`.

## Hosting
The app and the keeper share `data/` (price samples, settlement inputs). Run both next to each other, not on Vercel alone. `render.yaml` does this on Render's free tier (`keeper watch` next to `next start`) with the data in Postgres (`DATABASE_URL`, e.g. Supabase), since the free tier has no disk. Without `DATABASE_URL` it's JSON files under `LEAGUE_DATA_DIR`.
