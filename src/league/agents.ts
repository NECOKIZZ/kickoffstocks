// Wallets that have played through an AI agent: when an agent asks the MCP
// server for a plan on a wallet's behalf, the wallet is noted here, and its
// avatar gets the agent badge. Cosmetic only: it changes nothing in the game.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const file = () => join(process.env.LEAGUE_DATA_DIR ?? "data", "agent-wallets.json");

export function agentWallets(): string[] {
  try {
    return existsSync(file()) ? (JSON.parse(readFileSync(file(), "utf8")) as string[]) : [];
  } catch {
    return [];
  }
}

export function noteAgentWallet(wallet: string) {
  const w = wallet.toLowerCase();
  const all = agentWallets();
  if (all.includes(w)) return;
  try {
    mkdirSync(dirname(file()), { recursive: true });
    writeFileSync(file(), JSON.stringify([...all, w]));
  } catch {
    // read-only disk (e.g. serverless): the badge is cosmetic, so skip it
  }
}
