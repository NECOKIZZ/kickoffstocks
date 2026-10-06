// Chain + keeper wallet from environment.
//   LEAGUE_CHAIN       testnet (default) | mainnet | local
//   RH_RPC_URL         RPC for the league chain (defaults to the public RPC)
//   ESCROW_ADDRESS     LeagueEscrow address
//   KEEPER_PRIVATE_KEY keeper wallet (falls back to DEPLOYER_PRIVATE_KEY)

import { createPublicClient, createWalletClient, http, type Address, type Chain, type Hex } from "viem";
import { foundry } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { robinhood, robinhoodTestnet } from "../rh/chains";

export type LeagueChain = "mainnet" | "testnet" | "local";

export function leagueChain(): LeagueChain {
  const c = process.env.LEAGUE_CHAIN;
  return c === "mainnet" || c === "local" ? c : "testnet";
}

export function chainFromEnv(): Chain {
  const c = leagueChain();
  return c === "local" ? foundry : c === "mainnet" ? robinhood : robinhoodTestnet;
}

export function rpcFromEnv(): string {
  return process.env.RH_RPC_URL ?? (leagueChain() === "local" ? "http://127.0.0.1:8545" : chainFromEnv().rpcUrls.default.http[0]);
}

export function escrowFromEnv(): Address {
  const a = process.env.ESCROW_ADDRESS;
  if (!a) throw new Error("ESCROW_ADDRESS not set");
  return a as Address;
}

export function clientsFromEnv(withWallet = false) {
  const chain = chainFromEnv();
  const transport = http(rpcFromEnv());
  const pub = createPublicClient({ chain, transport });
  if (!withWallet) return { chain, pub, wallet: null, account: null };
  const pk = (process.env.KEEPER_PRIVATE_KEY ?? process.env.DEPLOYER_PRIVATE_KEY) as Hex | undefined;
  if (!pk) throw new Error("KEEPER_PRIVATE_KEY (or DEPLOYER_PRIVATE_KEY) not set");
  const account = privateKeyToAccount(pk);
  const wallet = createWalletClient({ chain, transport, account });
  return { chain, pub, wallet, account };
}
