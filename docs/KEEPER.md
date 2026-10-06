# Keeper: running rounds

The keeper opens rounds, samples prices, parks the tickets in the savings vault, and settles.

## Commands
```bash
pnpm keeper open --entry-min 60 --run-min 60      # entries close in 60 min, the round runs 60 min after that
pnpm keeper auto <roundId> --samples 3 --every-min 5 [--source robinhood] [--no-park]
                                                   # waits, samples at start, parks tickets, samples at end, unparks, settles
pnpm keeper sample <roundId> start|end            # one price sample (saved to data/rounds/<id>/)
pnpm keeper park <roundId>                        # tickets into the savings vault (after entries close)
pnpm keeper unpark <roundId>                      # back, interest into the pot (settle does this too)
pnpm keeper settle <roundId> --dry-run            # preview payouts, nothing sent
pnpm keeper settle <roundId>                      # submit settlement
pnpm keeper status <roundId>
```
**Price sources (`--source` or `LEAGUE_PRICE_SOURCE`):**
- `chainlink` (default): Robinhood Chain's Chainlink feeds, verifiable on-chain. They move on a 0.5% deviation or the 24 h heartbeat, during US market hours (24/5). Use for real (weekly) rounds.
- `robinhood`: Robinhood's quote API token mid, which moves every few seconds. Use for short demo rounds.

Testnet has no Chainlink feeds: testnet rounds read the same stocks' **mainnet** feeds (`PRICE_RPC_URL`).

**Environment (`.env.local`):** `LEAGUE_CHAIN`, `RH_RPC_URL`, `PRICE_RPC_URL`, `ESCROW_ADDRESS`, `KEEPER_PRIVATE_KEY`, `LEAGUE_PRICE_SOURCE`, `LEAGUE_DATA_DIR`.

## What settle does
1. Brings parked tickets back from the vault if they're still there; the interest becomes the round's bonus.
2. Reads every entry and locked basket from the contract.
3. Averages the saved samples inside each window: `entryClose … +30 min` and `end … +30 min`. A token that is missing, not live, or has fewer than 3 samples voids the round, and everyone is refunded.
4. Checks each basket at the start prices (≥ 3 stocks, ≤ 50% each, ≥ $10, team key matches). An invalid entry is refunded.
5. Runs the engine (AVERAGE, draws, pot + interest) and submits the payouts. Writes `data/rounds/<id>/inputs.json`, whose keccak hash goes on-chain, so anyone can recompute the result with `pnpm verify data/rounds/<id>/inputs.json <id>`.

## Hosting
The app and the keeper share `data/` (price samples, settlement inputs). Run both on one small server with a disk (Railway or Render with a volume, or a VM), not on Vercel.
