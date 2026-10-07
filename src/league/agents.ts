// Wallets that have played through an AI agent: when an agent asks the MCP
// server for a plan on a wallet's behalf, the wallet is noted here, and its
// avatar gets the agent badge. Cosmetic only: it changes nothing in the game.

import { leagueStore } from "./store";

export async function agentWallets(): Promise<string[]> {
  try {
    return await leagueStore().agentWallets();
  } catch {
    return [];
  }
}

export async function noteAgentWallet(wallet: string) {
  try {
    await leagueStore().addAgentWallet(wallet.toLowerCase());
  } catch {
    // read-only disk or no database: the badge is cosmetic, so skip it
  }
}
