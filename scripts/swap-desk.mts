// The testnet swap desk (contracts/src/TestSwapDesk.sol): players swap test
// USDG for a whole basket in one transaction, at live prices, instead of
// collecting each stock from Robinhood's faucet.
//
//   LEAGUE_CHAIN=testnet npx pnpm swap-desk                       # dry run: what it would do
//   LEAGUE_CHAIN=testnet npx pnpm swap-desk --broadcast           # deploy (once) + stock it
//   LEAGUE_CHAIN=testnet npx pnpm swap-desk --broadcast --stock   # top up an existing desk
//
// Deploy: TestSwapDesk(ticket token, quoter = KEEPER_ADDRESS), saved to
//         deployments.json (testnet.contracts.swapDesk): commit it. The app
//         signs quotes with KEEPER_PRIVATE_KEY (or SWAP_QUOTER_KEY if set).
// Stock:  sends the deployer's TSLA / AMZN / PLTR / AMD (claim them first at
//         https://faucet.testnet.chain.robinhood.com, from as many wallets as
//         you like) to the desk, and pulls tWBTC / tWETH from their own
//         faucets (once an hour each). Prints what the desk holds.
//
// Env: DEPLOYER_PRIVATE_KEY, KEEPER_ADDRESS, ESCROW_ADDRESS, RH_RPC_URL.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createPublicClient, createWalletClient, erc20Abi, formatUnits, getAddress, http, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { chainFromEnv, escrowFromEnv, leagueChain, rpcFromEnv } from "../src/league/chain";
import { leagueEscrowAbi } from "../src/league/escrow";
import { testDeskAbi, testDeskAddress } from "../src/rh/testDesk";
import { STOCKS } from "../src/ui/data/stocks";

const broadcast = process.argv.includes("--broadcast");
const stockOnly = process.argv.includes("--stock");
if (leagueChain() !== "testnet") throw new Error("the swap desk is for testnet only (mainnet buys go through 0x)");
const pk = process.env.DEPLOYER_PRIVATE_KEY as Hex | undefined;
if (!pk) throw new Error("DEPLOYER_PRIVATE_KEY not set (put it in .env.local, never in chat or git)");
const chain = chainFromEnv();
const account = privateKeyToAccount(pk);
const quoter = getAddress(process.env.KEEPER_ADDRESS ?? account.address);
const transport = http(rpcFromEnv());
const pub = createPublicClient({ chain, transport });
const wallet = createWalletClient({ chain, transport, account });
const escrow = escrowFromEnv();
const usdg = await pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "stakeToken" });

const testnet = STOCKS.filter((s) => s.testnet);
const crypto = testnet.filter((s) => s.kind === "crypto");
const stocks = testnet.filter((s) => s.kind !== "crypto");
let desk = testDeskAddress();

console.log(`${chain.name}: ticket token ${usdg}, quoter ${quoter}`);
console.log(desk ? `desk ${desk}` : stockOnly ? "no desk yet: run without --stock first" : "will deploy TestSwapDesk");
console.log(`will send the deployer's ${stocks.map((s) => s.ticker).join(", ")} to the desk and refill ${crypto.map((s) => s.ticker).join(", ")} from their faucets`);
if (!broadcast) {
  console.log("dry run: add --broadcast to send");
  process.exit(0);
}

async function wait(hash: Hex, what: string) {
  const r = await pub.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error(`${what} failed: ${hash}`);
  return r;
}

if (!desk) {
  if (stockOnly) throw new Error("no desk yet: run without --stock first");
  const f = "contracts/out/TestSwapDesk.sol/TestSwapDesk.json";
  if (!existsSync(f)) throw new Error(`${f} missing: run \`cd contracts && forge build\` first`);
  const art = JSON.parse(readFileSync(f, "utf8"));
  const r = await wait(await wallet.deployContract({ abi: art.abi, bytecode: art.bytecode.object as Hex, args: [usdg, quoter] }), "deploy");
  desk = getAddress(r.contractAddress!);
  console.log(`  TestSwapDesk ${desk}`);
  const file = "deployments.json";
  const all = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  all.testnet = { ...all.testnet, contracts: { ...all.testnet?.contracts, swapDesk: desk } };
  writeFileSync(file, JSON.stringify(all, null, 2) + "\n");
  console.log(`saved → ${file}: commit it so the app turns on testnet buying`);
}

for (const s of stocks) {
  const token = getAddress(s.testnet!);
  const bal = await pub.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [account.address] });
  if (bal === 0n) {
    console.log(`  ${s.ticker}: the deployer has none (claim it at the faucet, then rerun with --stock)`);
    continue;
  }
  await wait(await wallet.writeContract({ address: token, abi: erc20Abi, functionName: "transfer", args: [desk, bal] }), `${s.ticker} transfer`);
  console.log(`  ${s.ticker}: sent ${formatUnits(bal, s.decimals)}`);
}
for (const s of crypto) {
  try {
    await wait(await wallet.writeContract({ address: desk, abi: testDeskAbi, functionName: "refill", args: [getAddress(s.testnet!)] }), `${s.ticker} refill`);
    console.log(`  ${s.ticker}: refilled from its faucet`);
  } catch {
    console.log(`  ${s.ticker}: faucet not ready (once an hour)`);
  }
}

console.log(`desk ${desk} holds:`);
for (const s of testnet) {
  const bal = await pub.readContract({ address: getAddress(s.testnet!) as Address, abi: erc20Abi, functionName: "balanceOf", args: [desk] });
  console.log(`  ${s.ticker.padEnd(5)} ${formatUnits(bal, s.decimals)}  (~$${(Number(formatUnits(bal, s.decimals)) * s.price).toFixed(0)})`);
}
