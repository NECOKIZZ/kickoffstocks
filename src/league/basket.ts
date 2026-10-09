// Kickoff Stocks basket helpers shared by the keeper, API routes and UI:
// team keys (clone-merging) and the buy-the-basket split.

import { encodeAbiParameters, keccak256, getAddress, type Hex } from "viem";
import { basketWeightsBps } from "../engine/league";

/** Weight bucket for clone-merging: 1% = 100 bps. */
export const WEIGHT_BUCKET_BPS = 100;

/**
 * Team key: keccak of the sorted (token, weight rounded to 1%) list. Two
 * baskets with the same stocks and the same weights (to 1%) are one team.
 * `values` are the tokens' USD values at entry (same units for all tokens).
 */
export function teamKeyOf(tokens: string[], values: bigint[]): Hex {
  if (tokens.length !== values.length) throw new Error("teamKeyOf: length mismatch");
  return teamKeyFromWeights(tokens, basketWeightsBps(values));
}

/** Team key from declared weights (bps): what creators sign up with. */
export function teamKeyFromWeights(tokens: string[], weights: number[]): Hex {
  if (tokens.length !== weights.length) throw new Error("teamKeyFromWeights: length mismatch");
  const rows = tokens
    .map((t, i) => ({
      token: getAddress(t),
      bucket: BigInt(Math.round(weights[i] / WEIGHT_BUCKET_BPS)),
    }))
    .filter((r) => r.bucket > 0n)
    .sort((a, b) => (a.token.toLowerCase() < b.token.toLowerCase() ? -1 : 1));
  return keccak256(
    encodeAbiParameters(
      [{ type: "address[]" }, { type: "uint256[]" }],
      [rows.map((r) => r.token), rows.map((r) => r.bucket)],
    ),
  );
}

export interface BuyLeg {
  token: string;
  amountIn: bigint; // stablecoin in, base units
  weightBps: number;
}

/**
 * Split a stablecoin amount across the basket by weight. Rounding dust goes
 * to the largest leg so the legs always sum to `total`.
 */
export function splitBuy(tokens: string[], weightsBps: number[], total: bigint): BuyLeg[] {
  if (tokens.length !== weightsBps.length || tokens.length === 0) throw new Error("splitBuy: bad basket");
  const wSum = weightsBps.reduce((s, w) => s + w, 0);
  if (wSum <= 0) throw new Error("splitBuy: zero weights");
  const legs = tokens.map((token, i) => ({
    token,
    weightBps: weightsBps[i],
    amountIn: (total * BigInt(weightsBps[i])) / BigInt(wSum),
  }));
  const dust = total - legs.reduce((s, l) => s + l.amountIn, 0n);
  const iMax = weightsBps.indexOf(Math.max(...weightsBps));
  legs[iMax].amountIn += dust;
  return legs.filter((l) => l.amountIn > 0n);
}

/** Creator fee bounds for basket buys (0x swap fee, paid to the creator). */
export const MAX_CREATOR_BUY_FEE_PCT = 2;
export const DEFAULT_CREATOR_BUY_FEE_PCT = 1;

export function clampCreatorFee(pct: number | undefined): number {
  if (pct === undefined || !Number.isFinite(pct)) return DEFAULT_CREATOR_BUY_FEE_PCT;
  return Math.min(MAX_CREATOR_BUY_FEE_PCT, Math.max(0, Math.round(pct * 100) / 100));
}

export interface FitLeg {
  /** Wallet balance, token base units. */
  raw: bigint;
  decimals: number;
  /** USD per whole token. */
  price: number;
  weightBps: number;
}

/**
 * The basket to lock: the largest one at exactly the declared weights that
 * the wallet's balances can cover, capped at `targetUsd` if given. Whatever
 * the wallet holds beyond that stays in the wallet. Returns per-leg amounts
 * (base units) and the basket's USD value at these prices.
 */
export function fitBasket(legs: FitLeg[], targetUsd?: number): { amounts: bigint[]; usd: number; maxUsd: number } {
  if (legs.length === 0) return { amounts: [], usd: 0, maxUsd: 0 };
  const E6 = 1_000_000n;
  const priceE6 = legs.map((l) => BigInt(Math.max(1, Math.round(l.price * 1e6))));
  const valueE6 = legs.map((l, i) => (l.raw * priceE6[i]) / 10n ** BigInt(l.decimals));
  // Each leg caps the basket at its value / its weight.
  const caps = legs.map((l, i) => (l.weightBps > 0 ? (valueE6[i] * 10_000n) / BigInt(l.weightBps) : 0n));
  const maxE6 = caps.reduce((m, c) => (c < m ? c : m));
  const target = targetUsd !== undefined && targetUsd > 0 ? BigInt(Math.round(targetUsd * 1e6)) : maxE6;
  const basketE6 = target < maxE6 ? target : maxE6;
  const amounts = legs.map((l, i) => {
    const a = (basketE6 * BigInt(l.weightBps) * 10n ** BigInt(l.decimals)) / (10_000n * priceE6[i]);
    return a > l.raw ? l.raw : a;
  });
  const usd = amounts.reduce((s, a, i) => s + (a * priceE6[i]) / 10n ** BigInt(legs[i].decimals), 0n);
  return { amounts, usd: Number(usd) / Number(E6), maxUsd: Number(maxE6) / Number(E6) };
}
