// POST /api/buy-plan  { tokens, weightsBps, usdg, wallet, creator, feePct? }
// → the 0x quotes and transactions to buy an ETF's basket with USDG, paying
// the creator's fee. Server-side only: the 0x key never reaches the browser.
import { NextResponse } from "next/server";
import { parseUnits, isAddress } from "viem";
import { planBasketBuy } from "@/rh/zeroEx";
import { USDG_DECIMALS, USDG_MAINNET } from "@/rh/chains";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as {
    tokens?: string[];
    weightsBps?: number[];
    usdg?: string;
    wallet?: string;
    creator?: string;
    feePct?: number;
  } | null;
  if (!b?.tokens?.length || b.tokens.length !== b.weightsBps?.length || !b.usdg || !b.wallet || !b.creator) {
    return NextResponse.json({ error: "tokens, weightsBps, usdg, wallet and creator are required" }, { status: 400 });
  }
  if (![...b.tokens, b.wallet, b.creator].every((a) => isAddress(a))) {
    return NextResponse.json({ error: "invalid address" }, { status: 400 });
  }
  const usdgIn = parseUnits(b.usdg, USDG_DECIMALS);
  if (usdgIn < parseUnits("1", USDG_DECIMALS) || usdgIn > parseUnits("10000", USDG_DECIMALS)) {
    return NextResponse.json({ error: "amount must be between 1 and 10,000 USDG" }, { status: 400 });
  }
  const plan = await planBasketBuy({ usdg: USDG_MAINNET, tokens: b.tokens, weightsBps: b.weightsBps, usdgIn, wallet: b.wallet, creator: b.creator, creatorFeePct: b.feePct });
  return NextResponse.json(plan, { status: plan.ok ? 200 : 207 });
}
