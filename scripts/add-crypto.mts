// Add the crypto slice (BTC as WBTC, ETH as WETH) to a deployed league.
//
//   LEAGUE_CHAIN=testnet npx pnpm add:crypto              # dry run
//   LEAGUE_CHAIN=testnet npx pnpm add:crypto --broadcast
//
// testnet: deploys two faucet tokens (tWBTC, 8 decimals, and tWETH, 18) that
//          rounds price with the real tokens' mainnet Chainlink feeds, and
//          allowlists them. Their addresses go into deployments.json, which
//          the app reads, so commit it.
// mainnet: allowlists the real WBTC and WETH.
//
// Env: DEPLOYER_PRIVATE_KEY (the escrow's owner), ESCROW_ADDRESS, RH_RPC_URL.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createPublicClient, createWalletClient, getAddress, http, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { chainFromEnv, escrowFromEnv, leagueChain, rpcFromEnv } from "../src/league/chain";
import { leagueEscrowAbi } from "../src/league/escrow";
import { STOCKS } from "../src/ui/data/stocks";

const broadcast = process.argv.includes("--broadcast");
const net = leagueChain();
if (net === "local") throw new Error("not for the local chain");
const pk = process.env.DEPLOYER_PRIVATE_KEY as Hex | undefined;
if (!pk) throw new Error("DEPLOYER_PRIVATE_KEY not set (put it in .env.local, never in chat or git)");
const chain = chainFromEnv();
const account = privateKeyToAccount(pk);
const transport = http(rpcFromEnv());
const pub = createPublicClient({ chain, transport });
const wallet = createWalletClient({ chain, transport, account });
const escrow = escrowFromEnv();

const owner = await pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "owner" });
if (owner.toLowerCase() !== account.address.toLowerCase()) throw new Error(`the escrow's owner is ${owner}, not this deployer key`);
const crypto = STOCKS.filter((s) => s.kind === "crypto");
// Faucet amounts: roughly $80 each at October 2026 prices.
const TEST = { BTC: { name: "Test Wrapped BTC", symbol: "tWBTC", decimals: 8, faucet: 100_000n }, ETH: { name: "Test Wrapped Ether", symbol: "tWETH", decimals: 18, faucet: 3n * 10n ** 16n } } as const;

console.log(`${chain.name}: escrow ${escrow}, owner ${owner}`);
console.log(net === "testnet" ? `will deploy ${Object.values(TEST).map((t) => t.symbol).join(" + ")} and allowlist them` : `will allowlist ${crypto.map((c) => `${c.symbol} ${c.address}`).join(", ")}`);
if (!broadcast) {
  console.log("dry run: add --broadcast to send");
  process.exit(0);
}

async function send(functionName: "setTokenAllowed", args: readonly [Address, boolean]) {
  const hash = await wallet.writeContract({ address: escrow, abi: leagueEscrowAbi, functionName, args });
  const r = await pub.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error(`${functionName} failed: ${hash}`);
}

const added: Record<string, Address> = {};
if (net === "testnet") {
  const f = "contracts/out/TestToken.sol/TestToken.json";
  if (!existsSync(f)) throw new Error(`${f} missing: run \`cd contracts && forge build\` first`);
  const art = JSON.parse(readFileSync(f, "utf8"));
  for (const [ticker, t] of Object.entries(TEST)) {
    const hash = await wallet.deployContract({ abi: art.abi, bytecode: art.bytecode.object as Hex, args: [t.name, t.symbol, t.decimals, t.faucet] });
    const r = await pub.waitForTransactionReceipt({ hash });
    if (r.status !== "success" || !r.contractAddress) throw new Error(`${t.symbol} deploy failed: ${hash}`);
    added[ticker] = getAddress(r.contractAddress);
    console.log(`  ${t.symbol} ${added[ticker]}`);
  }
} else for (const c of crypto) added[c.ticker] = getAddress(c.address);

for (const [ticker, addr] of Object.entries(added)) {
  await send("setTokenAllowed", [addr, true]);
  console.log(`  allowlisted ${ticker} ${addr}`);
}

const file = "deployments.json";
const all = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
all[net] = { ...all[net], crypto: added, allowlisted: [...new Set([...(all[net]?.allowlisted ?? []), ...Object.values(added)])] };
writeFileSync(file, JSON.stringify(all, null, 2) + "\n");
console.log(`saved → ${file}: commit it (or paste it to Claude) so the app lists BTC and ETH`);
