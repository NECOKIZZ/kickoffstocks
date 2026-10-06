// Deploy Kickoff Stocks to Robinhood Chain.
//
//   cd contracts && forge build && cd ..
//   LEAGUE_CHAIN=testnet npx tsx --env-file=.env.local scripts/deploy.mts             # dry run
//   LEAGUE_CHAIN=testnet npx tsx --env-file=.env.local scripts/deploy.mts --broadcast
//
// testnet: deploys TestUSDG (tickets; public faucet) and TestSavingsVault (5% a
//          year, stands in for Robinhood Earn), the escrow, allowlists the
//          faucet's stock tokens that have a feed (TSLA, AMZN, PLTR, AMD),
//          plugs in the vault and seeds the season pot with 20 tUSDG.
// mainnet: the escrow with USDG tickets, all 35 stock tokens allowlisted, and
//          YIELD_VAULT (a USDG ERC-4626 vault, e.g. Robinhood Earn) if set.
//
// Env: DEPLOYER_PRIVATE_KEY (owner; the same deployer as Kickoff's escrows),
//      KEEPER_ADDRESS (settles rounds; defaults to the deployer), RH_RPC_URL,
//      YIELD_VAULT (mainnet, optional). Writes deployments.json.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createPublicClient, createWalletClient, formatEther, getAddress, http, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { chainFromEnv, leagueChain, rpcFromEnv } from "../src/league/chain";
import { leagueEscrowAbi, erc20Abi } from "../src/league/escrow";
import { USDG_MAINNET } from "../src/rh/chains";
import { STOCKS } from "../src/ui/data/stocks";

const broadcast = process.argv.includes("--broadcast");
const net = leagueChain();
if (net === "local") throw new Error("for the local chain use scripts/local-demo.mts");
const chain = chainFromEnv();
const pk = process.env.DEPLOYER_PRIVATE_KEY as Hex | undefined;
if (!pk) throw new Error("DEPLOYER_PRIVATE_KEY not set (put it in .env.local, never in chat or git)");
const account = privateKeyToAccount(pk);
const keeper = getAddress(process.env.KEEPER_ADDRESS ?? account.address);
const transport = http(rpcFromEnv());
const pub = createPublicClient({ chain, transport });
const wallet = createWalletClient({ chain, transport, account });

const art = (file: string, name: string) => {
  const f = `contracts/out/${file}/${name}.json`;
  if (!existsSync(f)) throw new Error(`${f} missing: run \`cd contracts && forge build\` first`);
  const j = JSON.parse(readFileSync(f, "utf8"));
  return { abi: j.abi, bytecode: j.bytecode.object as Hex };
};
const testUsdgAbi = [
  ...erc20Abi,
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [] },
  { type: "function", name: "setMinter", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "bool" }], outputs: [] },
] as const;

const tokens = net === "mainnet" ? STOCKS.map((s) => getAddress(s.address)) : STOCKS.filter((s) => s.testnet).map((s) => getAddress(s.testnet!));
const balance = await pub.getBalance({ address: account.address });
console.log(`${chain.name} (${chain.id}) via ${rpcFromEnv()}`);
console.log(`deployer ${account.address} (${formatEther(balance)} ETH), keeper ${keeper}`);
console.log(`tickets: ${net === "mainnet" ? `USDG ${USDG_MAINNET}` : "new TestUSDG + TestSavingsVault (5%)"}`);
console.log(`allowlist: ${tokens.length} stock tokens (${(net === "mainnet" ? STOCKS : STOCKS.filter((s) => s.testnet)).map((s) => s.ticker).join(", ")})`);
if (!broadcast) {
  console.log("dry run: add --broadcast to deploy");
  process.exit(0);
}
if (balance === 0n) throw new Error(`the deployer has no ETH on ${chain.name}: get some from the faucet first`);

async function deploy(file: string, name: string, args: unknown[]): Promise<Address> {
  const { abi, bytecode } = art(file, name);
  const hash = await wallet.deployContract({ abi, bytecode, args });
  const r = await pub.waitForTransactionReceipt({ hash });
  if (r.status !== "success" || !r.contractAddress) throw new Error(`${name} deploy failed: ${hash}`);
  console.log(`  ${name} ${r.contractAddress}`);
  return r.contractAddress;
}
async function send(address: Address, abi: readonly unknown[], functionName: string, args: unknown[]) {
  const hash = await wallet.writeContract({ address, abi: abi as never, functionName: functionName as never, args: args as never });
  const r = await pub.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error(`${functionName} failed: ${hash}`);
}

let usdg: Address = USDG_MAINNET;
let vault: Address | null = process.env.YIELD_VAULT ? getAddress(process.env.YIELD_VAULT) : null;
if (net === "testnet") {
  usdg = await deploy("TestUSDG.sol", "TestUSDG", []);
  vault = await deploy("TestUSDG.sol", "TestSavingsVault", [usdg, 500n]);
  await send(usdg, testUsdgAbi, "setMinter", [vault, true]);
}
const escrow = await deploy("LeagueEscrow.sol", "LeagueEscrow", [usdg, keeper]);
for (const t of tokens) await send(escrow, leagueEscrowAbi, "setTokenAllowed", [t, true]);
if (vault) await send(escrow, leagueEscrowAbi, "setYieldVault", [vault]);
if (net === "testnet") {
  await send(usdg, testUsdgAbi, "mint", [account.address, 20_000_000n]);
  await send(usdg, erc20Abi, "approve", [escrow, 20_000_000n]);
  await send(escrow, leagueEscrowAbi, "fundSeason", [20_000_000n]);
}

const file = "deployments.json";
const all = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
all[net] = {
  chainId: chain.id,
  explorer: chain.blockExplorers?.default.url,
  deployedAt: new Date().toISOString(),
  deployer: account.address,
  keeper,
  contracts: { LeagueEscrow: escrow, ticketToken: usdg, savingsVault: vault },
  allowlisted: tokens,
};
writeFileSync(file, JSON.stringify(all, null, 2) + "\n");
console.log(`\nESCROW_ADDRESS=${escrow}\nsaved → ${file}`);
