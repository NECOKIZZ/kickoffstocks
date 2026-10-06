// Every league transaction as plain calldata steps. One builder, three users:
// the web app sends them from the browser wallet, BYO agents get them from
// the MCP server and /api/plan and sign with their own wallet, and the agent
// CLI signs them with a local key.

import { encodeFunctionData, type Address, type Hex } from "viem";
import { erc20Abi, leagueEscrowAbi } from "./escrow";
import { teamKeyFromWeights } from "./basket";
import { USDG_DECIMALS } from "../rh/chains";

export type StepKind = "approve" | "enter-creator" | "enter-backer" | "claim" | "claim-basket" | "swap";

export interface TxStep {
  kind: StepKind;
  /** What the step does, in plain words. */
  label: string;
  to: Address;
  data: Hex;
  value: string; // wei, decimal string
}

const step = (kind: StepKind, label: string, to: Address, data: Hex, value = 0n): TxStep => ({ kind, label, to, data, value: value.toString() });

export function approveStep(token: Address, spender: Address, amount: bigint, label: string): TxStep {
  return step("approve", label, token, encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [spender, amount] }));
}

export interface LockPlanInput {
  escrow: Address;
  usdg: Address;
  roundId: bigint;
  stake: bigint;
  tokens: Address[];
  amounts: bigint[];
  weightsBps: number[];
  name: string;
  buyFeeBps: number;
  /** Current allowances to the escrow (token → amount); missing = 0. */
  allowances?: Record<string, bigint>;
  symbols?: Record<string, string>;
}

/** Normalise declared weights to integers summing to exactly 10 000 bps. */
export function normaliseWeights(weights: number[]): number[] {
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) throw new Error("weights must be positive");
  const w = weights.map((x) => Math.floor((x * 10_000) / total));
  w[w.indexOf(Math.max(...w))] += 10_000 - w.reduce((s, x) => s + x, 0);
  return w;
}

/** Approvals + enterCreatorNamed: lock a basket you already hold, plus the ticket. */
export function planLock(p: LockPlanInput): { teamKey: Hex; steps: TxStep[] } {
  const weights = normaliseWeights(p.weightsBps);
  const teamKey = teamKeyFromWeights(p.tokens, weights);
  const allow = (t: string) => p.allowances?.[t.toLowerCase()] ?? 0n;
  const sym = (t: string) => p.symbols?.[t.toLowerCase()] ?? t.slice(0, 8);
  const steps: TxStep[] = [];
  p.tokens.forEach((t, i) => {
    if (allow(t) < p.amounts[i]) steps.push(approveStep(t, p.escrow, p.amounts[i], `Allow the league to lock your ${sym(t)}`));
  });
  if (allow(p.usdg) < p.stake) steps.push(approveStep(p.usdg, p.escrow, p.stake, "Allow the league to take the $5 ticket (USDG)"));
  steps.push(
    step(
      "enter-creator",
      `Lock the basket and enter "${p.name}"`,
      p.escrow,
      encodeFunctionData({
        abi: leagueEscrowAbi,
        functionName: "enterCreatorNamed",
        args: [p.roundId, teamKey, p.tokens, p.amounts, weights, p.name, p.buyFeeBps],
      }),
    ),
  );
  return { teamKey, steps };
}

/** Approve the ticket (if needed) + enterBacker. */
export function planBack(p: { escrow: Address; usdg: Address; roundId: bigint; stake: bigint; teamKey: Hex; allowance?: bigint; teamName?: string }): TxStep[] {
  const steps: TxStep[] = [];
  if ((p.allowance ?? 0n) < p.stake) steps.push(approveStep(p.usdg, p.escrow, p.stake, "Allow the league to take the $5 ticket (USDG)"));
  steps.push(
    step(
      "enter-backer",
      `Back ${p.teamName ? `"${p.teamName}"` : "the team"} with a $5 ticket`,
      p.escrow,
      encodeFunctionData({ abi: leagueEscrowAbi, functionName: "enterBacker", args: [p.roundId, p.teamKey] }),
    ),
  );
  return steps;
}

export function planClaim(escrow: Address, roundId: bigint): TxStep[] {
  return [step("claim", `Claim your payout from round ${roundId}`, escrow, encodeFunctionData({ abi: leagueEscrowAbi, functionName: "claim", args: [roundId] }))];
}

export function planClaimBasket(escrow: Address, roundId: bigint): TxStep[] {
  return [step("claim-basket", `Retry returning your basket from round ${roundId}`, escrow, encodeFunctionData({ abi: leagueEscrowAbi, functionName: "claimBasket", args: [roundId] }))];
}

/** A 0x swap transaction as a step. */
export function swapStep(tx: { to: string; data: string; value?: string }, label: string): TxStep {
  return step("swap", label, tx.to as Address, tx.data as Hex, BigInt(tx.value ?? "0"));
}

/**
 * Turn a 0x buy plan into steps: one USDG approval per spender (for the sum
 * of its legs, unless already allowed), then one swap per stock. Legs that
 * couldn't be quoted are reported, not included.
 */
export function buyPlanSteps(
  plan: { legs: { token: string; amountIn: string; tx: { to: string; data: string; value?: string } | null; spender: string | null; error: string | null }[] },
  usdg: Address,
  allowanceOf: (spender: string) => bigint,
  symbolOf: (token: string) => string,
): { steps: TxStep[]; skipped: { token: string; reason: string }[] } {
  const skipped: { token: string; reason: string }[] = [];
  const need = new Map<string, bigint>();
  const swaps: TxStep[] = [];
  for (const l of plan.legs) {
    if (l.error || !l.tx) {
      skipped.push({ token: l.token, reason: l.error ?? "no transaction" });
      continue;
    }
    const sp = (l.spender ?? l.tx.to).toLowerCase();
    need.set(sp, (need.get(sp) ?? 0n) + BigInt(l.amountIn));
    swaps.push(swapStep(l.tx, `Buy ${symbolOf(l.token)} with ${(Number(BigInt(l.amountIn)) / 10 ** USDG_DECIMALS).toFixed(2)} USDG`));
  }
  const approvals = [...need].filter(([sp, amt]) => allowanceOf(sp) < amt).map(([sp, amt]) => approveStep(usdg, sp as Address, amt, "Allow 0x to spend your USDG"));
  return { steps: [...approvals, ...swaps], skipped };
}
