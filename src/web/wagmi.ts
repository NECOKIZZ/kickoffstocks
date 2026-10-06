// Wallet setup: injected wallets (MetaMask, Rabby, Robinhood Wallet…) on
// Robinhood Chain mainnet and testnet, plus the local demo chain (anvil,
// chain 31337) for testing.

import { createConfig, http } from "wagmi";
import { foundry } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { robinhood, robinhoodTestnet } from "../rh/chains";

export const wagmiConfig = createConfig({
  chains: [robinhoodTestnet, robinhood, foundry],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [robinhood.id]: http(process.env.NEXT_PUBLIC_RH_RPC_URL ?? robinhood.rpcUrls.default.http[0]),
    [robinhoodTestnet.id]: http(process.env.NEXT_PUBLIC_RH_TESTNET_RPC_URL ?? robinhoodTestnet.rpcUrls.default.http[0]),
    // Local demo chain: through the app's relay, so it works wherever the app runs.
    [foundry.id]: http(process.env.NEXT_PUBLIC_LOCAL_RPC_URL ?? (typeof window !== "undefined" ? `${window.location.origin}/api/rpc` : "http://127.0.0.1:8545")),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
