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

## 3. BTC and ETH on testnet ✅ done 7 Oct
tWBTC `0x8B5AfDD4F8d7e2f409985b8AE48103E457B43167` and tWETH `0xc56976424df3B11a1FBcB1F728613998Df79f0d8`, allowlisted (`deployments.json`).

## 3b. Testnet swap desk (one-swap "buy the basket" with test USDG)
0x doesn't run on testnet, so players had to collect every stock from Robinhood's faucet. The swap desk fixes that:
players swap test USDG for the whole basket in one transaction, at live Chainlink prices. You set it up once:
1. With the **deployer** wallet (`0x4799…28aE`), claim TSLA, AMZN, PLTR and AMD at https://faucet.testnet.chain.robinhood.com
   (5 each a day; claim from more wallets and send them to the deployer for a bigger desk).
2. `cd contracts && forge build && cd ..`
3. `LEAGUE_CHAIN=testnet npx pnpm swap-desk` (dry run), then `... swap-desk --broadcast`: deploys the desk
   (quoter = `KEEPER_ADDRESS`), sends it the deployer's stocks, pulls tWBTC / tWETH from their faucets.
4. Commit `deployments.json` (it now has `testnet.contracts.swapDesk`) and redeploy Render. The app signs quotes
   with `KEEPER_PRIVATE_KEY`, which Render already has. "Buy" turns on by itself once the address is there.
5. Top it up now and then: claim at the faucet, then `npx pnpm swap-desk --broadcast --stock`.

## 4. Hosting ✅ live on Render + Supabase (7 Oct)
https://kickoff-stocks.onrender.com runs the app and the keeper (`render.yaml`); data in Supabase (`DATABASE_URL`).
The keeper runs the league by itself every week: entries close Monday 9:30am New York, the round ends Friday 4pm,
it settles and opens the next week. Week 1: entries close Mon 12 Oct, settles Fri 16 Oct.
Healthy logs at start: `data in Postgres, prices from chainlink` then `store: OK`.

Still to do:
- [x] Render → Settings → Custom Domains → `stocks.kickoff.cash`; CNAME `stocks` → `kickoff-stocks.onrender.com`.
- [ ] Merge the Kickoff PR that adds the **Stocks ↗** nav link (NECOKIZZ/kickoff#25) once the domain works.
- [ ] Get 4+ ETFs into week 1 before Monday's open (fewer refunds everyone).
- [ ] Keep the keeper wallet (`0x5e4b…af5F`) topped up with testnet ETH.
- [ ] Try a real wallet end to end: connect, Getting started, build an ETF.

## 5. Optional: mainnet
- `ZEROEX_API_KEY` from https://dashboard.0x.org (free) for "Buy the ETF".
- `YIELD_VAULT`: the Robinhood Earn (Steakhouse / Morpho) USDG vault address on Robinhood Chain. Claude couldn't confirm it: copy it from the Morpho app, never from memory.
- A little ETH + USDG on Robinhood Chain. `LEAGUE_CHAIN=mainnet npx pnpm deploy:league --broadcast` (BTC and ETH are allowlisted with the stocks).

## 6. Submit (by Mon night PT)
Next session: the demo video (the local demo, `docs/LOCAL.md`, gives a settled week with MEDIAN and a draw), then ideas for a Solana Mobile (Seeker / dApp Store) version for Colosseum.

- [ ] Video: landing → create an ETF → back a team → an agent backing a team via MCP → results with MEDIAN and a draw → verify a round.
- [ ] Colosseum project: description says Kickoff now has a Stocks mode; links to both repos, the live site, the video.
- [ ] Make `NECOKIZZ/kickoffstocks` public (it is now) and keep `main` green.
