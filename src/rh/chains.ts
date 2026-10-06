// Robinhood Chain (Arbitrum Orbit L2, ETH for gas). Public RPCs are
// rate-limited: set RH_RPC_URL / PRICE_RPC_URL to a provider for production.

import { defineChain } from "viem";

const multicall3 = { address: "0xcA11bde05977b3631167028862bE2a173976CA11" as const };

export const robinhood = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.chain.robinhood.com"] } },
  blockExplorers: { default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" } },
  contracts: { multicall3 },
});

export const robinhoodTestnet = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.chain.robinhood.com"] } },
  blockExplorers: { default: { name: "Blockscout", url: "https://explorer.testnet.chain.robinhood.com" } },
  contracts: { multicall3 },
  testnet: true,
});

/** USDG (Global Dollar) on mainnet, 6 decimals. The league's ticket token. */
export const USDG_MAINNET = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" as const;
export const USDG_DECIMALS = 6;
