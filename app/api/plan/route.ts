// POST /api/plan: the exact transactions for an action (back, lock, buy-basket,
// buy-etf, claim, claim-basket). The browser sends them from the user's
// wallet; BYO agents sign them with whatever wallet their owner gave them.
// Nothing here ever holds a key.
import { NextResponse } from "next/server";
import { isPlanError, makePlan, type PlanRequest } from "@/league/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as PlanRequest | null;
  if (!body?.action || !body.wallet) return NextResponse.json({ error: "action and wallet are required" }, { status: 400 });
  try {
    return NextResponse.json(await makePlan(body));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: isPlanError(e) ? 400 : 503 });
  }
}
