import { describe, it, expect } from "vitest";
import { decodeFunctionData, type Address } from "viem";
import { planLock, planBack, normaliseWeights, buyPlanSteps } from "../src/league/actions";
import { leagueEscrowAbi, erc20Abi } from "../src/league/escrow";
import { teamKeyFromWeights, fitBasket } from "../src/league/basket";

const A = (n: number) => `0x${n.toString(16).padStart(40, "0")}` as Address;
const ESCROW = A(0xe5c);
const USDG = A(0x05d);
const [NVDA, TSLA, SPY] = [A(1), A(2), A(3)];

describe("normaliseWeights", () => {
  it("returns integer bps summing to 10 000", () => {
    const w = normaliseWeights([33.3, 33.3, 33.3]);
    expect(w.reduce((a, b) => a + b, 0)).toBe(10_000);
    expect(normaliseWeights([42, 33, 25])).toEqual([4200, 3300, 2500]);
  });
});

describe("planLock", () => {
  it("approves what is missing, then enters with the declared-weight team key", () => {
    const { teamKey, steps } = planLock({
      escrow: ESCROW, usdg: USDG, roundId: 2n, stake: 5n * 10n ** 6n,
      tokens: [NVDA, TSLA, SPY], amounts: [1n, 2n, 3n], weightsBps: [42, 33, 25], name: "Test", buyFeeBps: 100,
      allowances: { [TSLA.toLowerCase()]: 2n }, // TSLA already approved
    });
    expect(teamKey).toBe(teamKeyFromWeights([NVDA, TSLA, SPY], [4200, 3300, 2500]));
    expect(steps.map((s) => s.kind)).toEqual(["approve", "approve", "approve", "enter-creator"]);
    expect(steps.slice(0, 3).map((s) => s.to)).toEqual([NVDA, SPY, USDG]);
    const enter = decodeFunctionData({ abi: leagueEscrowAbi, data: steps[3].data });
    expect(enter.functionName).toBe("enterCreatorNamed");
    expect(enter.args).toEqual([2n, teamKey, [NVDA, TSLA, SPY], [1n, 2n, 3n], [4200, 3300, 2500], "Test", 100]);
  });
});

describe("planBack", () => {
  it("skips the approval when the ticket is already allowed", () => {
    const steps = planBack({ escrow: ESCROW, usdg: USDG, roundId: 2n, stake: 5n, teamKey: `0x${"ab".repeat(32)}`, allowance: 5n });
    expect(steps).toHaveLength(1);
    expect(decodeFunctionData({ abi: leagueEscrowAbi, data: steps[0].data }).functionName).toBe("enterBacker");
  });
});

describe("buy plan → steps", () => {
  it("approves each spender once for the sum of its legs, then swaps; failed legs are reported", () => {
    const leg = (token: Address, amountIn: string, error: string | null = null) => ({ token, amountIn, tx: error ? null : { to: A(0xb0b), data: "0x12", value: "0" }, spender: A(0xa11), error });
    const { steps, skipped } = buyPlanSteps({ legs: [leg(NVDA, "4000000"), leg(TSLA, "3000000"), leg(SPY, "3000000", "no liquidity")] }, USDG, () => 0n, (t) => t);
    expect(steps.map((s) => s.kind)).toEqual(["approve", "swap", "swap"]);
    const ap = decodeFunctionData({ abi: erc20Abi, data: steps[0].data });
    expect(ap.args).toEqual([A(0xa11), 7_000_000n]);
    expect(steps[1].label).toBe(`Buy ${NVDA} with 4.00 USDG`);
    expect(skipped).toEqual([{ token: SPY, reason: "no liquidity" }]);
  });
  it("skips the approval when the spender is already allowed", () => {
    const leg = { token: NVDA, amountIn: "5", tx: { to: A(0xb0b), data: "0x12" }, spender: A(0xa11), error: null };
    expect(buyPlanSteps({ legs: [leg] }, USDG, () => 5n, (t) => t).steps.map((s) => s.kind)).toEqual(["swap"]);
  });
});

describe("agent guide", () => {
  it("fills in the site address everywhere, points at the MCP server, and says what the agent must never do", async () => {
    const { agentGuide, agentPrompt } = await import("../src/agent/guide");
    const g = agentGuide("https://stocks.example");
    expect(g).toContain("https://stocks.example/api/mcp");
    expect(g).toContain("https://stocks.example/api/plan");
    expect(g).toMatch(/Never ask for or accept private keys/);
    expect(g).not.toMatch(/\$\{|undefined|baw |Binance/);
    expect(agentPrompt("https://stocks.example")).toBe("Read https://stocks.example/agent.md and follow it to help me play Kickoff Stocks. Guide me one step at a time, in plain words.");
  });
});

describe("fitBasket", () => {
  const E18 = 10n ** 18n;
  it("locks the swapped basket at the declared weights, not the whole wallet", () => {
    // 5 TSLA from the faucet + $3.24 swapped, and only $2.40 of ETH: ETH at 20% caps the basket at $12.
    const legs = [
      { raw: 5n * E18 + 8_496_000_000_000_000n, decimals: 18, price: 381.36, weightBps: 2700 }, // TSLA
      { raw: 5n * E18, decimals: 18, price: 261.2, weightBps: 2700 }, // AMZN
      { raw: 5n * E18, decimals: 18, price: 610.5, weightBps: 2600 }, // AMD
      { raw: 919_540_229_885_057n, decimals: 18, price: 2610, weightBps: 2000 }, // ETH: $2.40
    ];
    const { usd, maxUsd, amounts } = fitBasket(legs, 12);
    expect(maxUsd).toBeCloseTo(12, 2);
    expect(usd).toBeCloseTo(12, 1);
    expect(amounts[0] < 5n * E18).toBe(true); // the faucet TSLA stays in the wallet
    expect(amounts[3]).toBeLessThanOrEqual(legs[3].raw);
  });
  it("caps at the target when the wallet could cover more", () => {
    const legs = [
      { raw: 10n * E18, decimals: 18, price: 100, weightBps: 5000 },
      { raw: 10n * E18, decimals: 18, price: 100, weightBps: 5000 },
    ];
    const { usd, amounts } = fitBasket(legs, 20);
    expect(usd).toBeCloseTo(20, 6);
    expect(amounts).toEqual([E18 / 10n, E18 / 10n]);
    expect(fitBasket(legs).usd).toBeCloseTo(2000, 6);
  });
});
