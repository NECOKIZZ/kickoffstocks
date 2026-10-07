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

## 3. One-time: add BTC and ETH (Cloud Shell, 2 min)
Allowlisting tokens needs the owner (deployer) key, so this is the one command you run yourself:
```
cd ~/kickoffstocks && git pull && cd contracts && forge build && cd ..
LEAGUE_CHAIN=testnet npx pnpm add:crypto              # dry run
LEAGUE_CHAIN=testnet npx pnpm add:crypto --broadcast  # deploys test BTC + ETH faucet tokens, allowlists them
cat deployments.json                                  # paste this to Claude (no secrets in it)
```

## 4. Host it on stocks.kickoff.cash (Render free tier + Supabase)
`render.yaml` runs the app and the keeper in one free web service. The keeper runs the league by itself, every week:
it opens the round, entries close **Monday 9:30am New York**, it samples prices at the open and at **Friday 4pm**,
settles (winners paid, baskets back) and opens the next week. Nobody runs anything.
1. **Supabase** → New project (free) → Connect → copy the **Session pooler** string and add `?sslmode=require` at the end.
   It stores price samples and settlement inputs, so a round survives restarts and redeploys (Render's free tier has no disk).
2. **Render** → New → **Blueprint** → `NECOKIZZ/kickoffstocks`, branch `main`. When asked, paste `KEEPER_PRIVATE_KEY`
   and `DATABASE_URL` (the Supabase string). Everything else is filled in. Never the deployer key.
3. Settings → Custom Domains → add `stocks.kickoff.cash`, then a CNAME `stocks` → `kickoff-stocks.onrender.com` where kickoff.cash's DNS lives.
4. In Kickoff, add a "Stocks" link to the nav.

Within a minute of starting, the keeper opens the first weekly round (entries close Mon 12 Oct 9:30am New York).
Render logs show what it does. Keep the keeper wallet topped up with testnet ETH (it pays gas for every round).

For the submission video, the local demo (`docs/LOCAL.md`) shows a settled round with MEDIAN and a draw without waiting a week.
Try an agent too: add `https://stocks.kickoff.cash/api/mcp` as a connector in Claude and ask it to back the top ETF.

## 5. Optional: mainnet
- `ZEROEX_API_KEY` from https://dashboard.0x.org (free) for "Buy the ETF".
- `YIELD_VAULT`: the Robinhood Earn (Steakhouse / Morpho) USDG vault address on Robinhood Chain. Claude couldn't confirm it: copy it from the Morpho app, never from memory.
- A little ETH + USDG on Robinhood Chain. `LEAGUE_CHAIN=mainnet npx pnpm deploy:league --broadcast` (BTC and ETH are allowlisted with the stocks).

## 6. Submit (by Mon night PT)
- [ ] Video: landing → create an ETF → back a team → an agent backing a team via MCP → results with MEDIAN and a draw → verify a round.
- [ ] Colosseum project: description says Kickoff now has a Stocks mode; links to both repos, the live site, the video.
- [ ] Make `NECOKIZZ/kickoffstocks` public (it is now) and keep `main` green.
