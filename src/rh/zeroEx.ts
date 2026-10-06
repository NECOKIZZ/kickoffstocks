// "Buy the ETF": split a USDG amount across a basket by weight and quote one
// 0x swap per stock (Swap API v2, AllowanceHolder). Each swap pays the ETF's
// creator their buy fee through 0x's integrator fee: swapFeeRecipient = the
// creator, swapFeeBps = their fee, taken in USDG.
//
// 0x routes Robinhood Stock Tokens through RFQ market makers (USDG is the
// main base pair) and AMMs such as Uniswap; the taker just sends the returned
// transaction after approving AllowanceHolder for the USDG.
//
// Mainnet only (0x doesn't serve Robinhood Chain testnet). Server-side only:
// ZEROEX_API_KEY never reaches the browser.

import { splitBuy, clampCreatorFee } from "../league/basket";
import { robinhood } from "./chains";

const QUOTE_URL = "https://api.0x.org/swap/allowance-holder/quote";

export interface SwapTx {
  to: string;
  data: string;
  value?: string;
  gas?: string | null;
}

export interface BuyLegPlan {
  token: string;
  weightBps: number;
  amountIn: string; // USDG base units
  expectedOut: string | null; // token base units, after the creator fee
  minOut: string | null;
  mode: "SWAP" | null;
  tx: SwapTx | null;
  /** Who must be allowed to spend the USDG (0x AllowanceHolder). */
  spender: string | null;
  sources: string[];
  error: string | null;
}

export interface BuyPlan {
  usdgIn: string;
  creator: string;
  creatorFeePct: number;
  legs: BuyLegPlan[];
  ok: boolean;
}

interface ZeroExQuote {
  liquidityAvailable: boolean;
  buyAmount?: string;
  minBuyAmount?: string;
  allowanceTarget?: string;
  issues?: { allowance?: { actual: string; spender: string } | null };
  route?: { fills?: { source: string }[] };
  transaction?: { to: string; data: string; value?: string; gas?: string | null };
}

export async function zeroExQuote(
  q: { sellToken: string; buyToken: string; sellAmount: bigint; taker: string; feeRecipient?: string; feeBps?: number; slippageBps?: number },
  fetcher: typeof fetch = fetch,
): Promise<ZeroExQuote> {
  const key = process.env.ZEROEX_API_KEY;
  if (!key) throw new Error("ZEROEX_API_KEY not set");
  const p = new URLSearchParams({
    chainId: String(robinhood.id),
    sellToken: q.sellToken,
    buyToken: q.buyToken,
    sellAmount: q.sellAmount.toString(),
    taker: q.taker,
    slippageBps: String(q.slippageBps ?? 100),
  });
  if (q.feeRecipient && q.feeBps && q.feeBps > 0) {
    p.set("swapFeeRecipient", q.feeRecipient);
    p.set("swapFeeBps", String(q.feeBps));
    p.set("swapFeeToken", q.sellToken);
  }
  const r = await fetcher(`${QUOTE_URL}?${p}`, { headers: { "0x-api-key": key, "0x-version": "v2" }, cache: "no-store" } as RequestInit);
  const body = (await r.json().catch(() => ({}))) as ZeroExQuote & { message?: string; name?: string };
  if (!r.ok) throw new Error(`0x quote: HTTP ${r.status} ${body.name ?? ""} ${body.message ?? ""}`.trim());
  return body;
}

/** Quote every leg. A leg that fails is reported, not thrown. */
export async function planBasketBuy(p: {
  usdg: string;
  tokens: string[];
  weightsBps: number[];
  usdgIn: bigint;
  wallet: string;
  creator: string;
  creatorFeePct?: number;
}, fetcher: typeof fetch = fetch): Promise<BuyPlan> {
  const feePct = p.creator.toLowerCase() === p.wallet.toLowerCase() ? 0 : clampCreatorFee(p.creatorFeePct);
  const legs = await Promise.all(
    splitBuy(p.tokens, p.weightsBps, p.usdgIn).map(async (leg): Promise<BuyLegPlan> => {
      const base: BuyLegPlan = { token: leg.token, weightBps: leg.weightBps, amountIn: leg.amountIn.toString(), expectedOut: null, minOut: null, mode: null, tx: null, spender: null, sources: [], error: null };
      try {
        const q = await zeroExQuote({ sellToken: p.usdg, buyToken: leg.token, sellAmount: leg.amountIn, taker: p.wallet, feeRecipient: p.creator, feeBps: Math.round(feePct * 100) }, fetcher);
        if (!q.liquidityAvailable || !q.transaction) return { ...base, error: "no liquidity for this amount right now" };
        return {
          ...base,
          expectedOut: q.buyAmount ?? null,
          minOut: q.minBuyAmount ?? null,
          mode: "SWAP",
          tx: q.transaction,
          spender: q.issues?.allowance?.spender ?? q.allowanceTarget ?? q.transaction.to,
          sources: [...new Set((q.route?.fills ?? []).map((f) => f.source))],
        };
      } catch (e) {
        return { ...base, error: e instanceof Error ? e.message : String(e) };
      }
    }),
  );
  return { usdgIn: p.usdgIn.toString(), creator: p.creator, creatorFeePct: feePct, legs, ok: legs.every((l) => !l.error) };
}
