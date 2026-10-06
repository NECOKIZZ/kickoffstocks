// GET /api/agent-wallets: wallets that played through an AI agent (lower case),
// for the agent badge on their avatars.
import { NextResponse } from "next/server";
import { agentWallets } from "@/league/agents";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ wallets: agentWallets() });
}
