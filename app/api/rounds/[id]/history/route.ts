// GET /api/rounds/:id/history?team=0x…: one ETF's return over the round,
// with MEDIAN and the S&P 500 (SPY), from the keeper's hourly chart samples.
// Display only: rounds are scored from the start and end samples.
import { NextResponse } from "next/server";
import { loadRoundHistory } from "@/league/live";
import { teamSeries } from "@/league/history";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const team = new URL(req.url).searchParams.get("team") ?? "";
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "bad round id" }, { status: 400 });
  if (!/^0x[0-9a-fA-F]{64}$/.test(team)) return NextResponse.json({ error: "team must be a team key (0x + 64 hex)" }, { status: 400 });
  try {
    const h = await loadRoundHistory(BigInt(id));
    if (!h) return NextResponse.json({ round: id, team, points: [] }); // entries open: nothing yet
    const points = teamSeries(h, team);
    return points ? NextResponse.json({ round: id, team, points }) : NextResponse.json({ error: "no such ETF in this round" }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }
}
