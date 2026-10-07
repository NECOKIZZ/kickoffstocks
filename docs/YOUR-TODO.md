# Your to-do list (Kickoff Stocks, Colosseum Crypto World's Fair)

Deadline: **Mon 12 Oct 2026, 11:59pm PT = Tue 13 Oct, 06:59 UTC**. Track: **Robinhood Chain** ($25k across 5 teams), plus the general prizes.
One submission per team: submit this as a **new mode of Kickoff**, inside your Kickoff project on colosseum.com (both repos linked, one video showing both).

## 1. Check (5 min)
- [ ] On colosseum.com, confirm Kickoff is your registered project and every team member is registered.
- [ ] Check the BNB Hack rules allow the same idea in another hackathon.

## 2. Testnet deploy ✅ done 7 Oct
LeagueEscrow `0xcd17bd5ac4d7c709bbf92399a4d2af34d2b3a8cf` on Robinhood Chain testnet (46630); the rest is in `deployments.json`. Steps kept for redeploys:
```
git clone https://github.com/NECOKIZZ/kickoffstocks.git && cd kickoffstocks
npx pnpm install
cp .env.example .env.local && nano .env.local
```
In `.env.local` (never in chat or git):
- `DEPLOYER_PRIVATE_KEY` = **Kickoff's deployer key** (`0x4799…28aE`), so both projects show the same deployer.
- `KEEPER_PRIVATE_KEY` = a **new** wallet's key, and `KEEPER_ADDRESS` = its address.
- Get testnet ETH for **both** wallets: https://faucet.testnet.chain.robinhood.com

Then (needs Foundry: `curl -L https://foundry.paradigm.xyz | bash && foundryup`):
```
cd contracts && forge build && cd ..
LEAGUE_CHAIN=testnet npx pnpm deploy:league              # dry run: check the addresses
LEAGUE_CHAIN=testnet npx pnpm deploy:league --broadcast  # prints ESCROW_ADDRESS, writes deployments.json
```
Put `ESCROW_ADDRESS` in `.env.local`, commit `deployments.json` (no secrets in it), and tell Claude the address.

## 3. Host it on stocks.kickoff.cash (Render free tier)
`render.yaml` runs the app and the keeper (`keeper watch`) in one free web service.
1. Render → **New → Blueprint** → pick `NECOKIZZ/kickoffstocks` (and this branch, until it's merged to `main`).
2. When asked, paste `KEEPER_PRIVATE_KEY`. Everything else is filled in. Never the deployer key.
3. Settings → Custom Domains → add `stocks.kickoff.cash`, then a CNAME `stocks` → `kickoff-stocks.onrender.com` where kickoff.cash's DNS lives.
4. In Kickoff, add a "Stocks" link to the nav.

Free-tier limits: the keeper pings the site to keep it awake; `data/` is wiped on each deploy or restart, so **don't redeploy during a round** and record the "verify a round" part soon after it settles.

## 4. Demo rounds (Thu–Fri, Mon as backup: stock prices don't move on weekends)
A round needs **4+ ETFs** with different baskets. Each wallet can take 5 TSLA, AMZN, PLTR, AMD (and NFLX) a day from Robinhood's faucet, so use 4+ wallets, or ask Claude for a script that splits one wallet's faucet tokens across demo wallets.
```
npx pnpm keeper open --entry-min 30 --run-min 60   # from Cloud Shell; Render's keeper does the rest
```
Use `robinhood` prices for short demo rounds (Chainlink feeds only move on 0.5% changes). Run during US market hours (Mon–Fri) so prices move. Tickets: the wallet chip's **Get test USDG**.
Try an agent too: add `https://stocks.kickoff.cash/api/mcp` as a connector in Claude and ask it to back the top ETF.

## 5. Optional: mainnet
- `ZEROEX_API_KEY` from https://dashboard.0x.org (free) for "Buy the ETF".
- `YIELD_VAULT`: the Robinhood Earn (Steakhouse / Morpho) USDG vault address on Robinhood Chain. Claude couldn't confirm it: copy it from the Morpho app, never from memory.
- A little ETH + USDG on Robinhood Chain. `LEAGUE_CHAIN=mainnet npx pnpm deploy:league --broadcast`.

## 6. Submit (by Mon night PT)
- [ ] Video: landing → create an ETF → back a team → an agent backing a team via MCP → results with AVERAGE and a draw → verify a round.
- [ ] Colosseum project: description says Kickoff now has a Stocks mode; links to both repos, the live site, the video.
- [ ] Make `NECOKIZZ/kickoffstocks` public (it is now) and keep `main` green.
