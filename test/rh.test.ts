import { describe, it, expect } from "vitest";
import type { PublicClient } from "viem";
import { teamKeyOf, splitBuy, clampCreatorFee } from "../src/league/basket";
import { decimalToE18, sampleFromQuotes, type RhQuote } from "../src/rh/rhApi";
import { sampleFeeds, MAX_FEED_AGE_SEC } from "../src/rh/feeds";
import { planBasketBuy } from "../src/rh/zeroEx";
import { STOCKS } from "../src/ui/data/stocks";

const NVDA = "0x1111111111111111111111111111111111111111";
const TSLA = "0x2222222222222222222222222222222222222222";
const AAPL = "0x3333333333333333333333333333333333333333";

describe("team keys", () => {
  it("merges baskets with the same stocks and weights to 1%", () => {
    const a = teamKeyOf([NVDA, TSLA, AAPL], [4000n, 3000n, 3000n]);
    expect(teamKeyOf([NVDA, TSLA, AAPL], [4001n, 3000n, 2999n])).toBe(a);
    expect(teamKeyOf([NVDA, TSLA, AAPL], [5000n, 2500n, 2500n])).not.toBe(a);
  });
  it("is case-insensitive on addresses", () => {
    expect(teamKeyOf([NVDA.toUpperCase().replace("0X", "0x"), TSLA, AAPL], [1n, 1n, 1n])).toBe(teamKeyOf([NVDA, TSLA, AAPL], [1n, 1n, 1n]));
  });
});

describe("buy the basket", () => {
  it("splits by weight and always sums to the total", () => {
    const legs = splitBuy([NVDA, TSLA, AAPL], [3333, 3333, 3334], 10_000_001n);
    expect(legs.reduce((s, l) => s + l.amountIn, 0n)).toBe(10_000_001n);
    expect(legs).toHaveLength(3);
  });
  it("clamps the creator fee to 0–2%", () => {
    expect(clampCreatorFee(undefined)).toBe(1);
    expect(clampCreatorFee(9)).toBe(2);
    expect(clampCreatorFee(-1)).toBe(0);
    expect(clampCreatorFee(0.555)).toBe(0.56);
  });
  it("quotes each leg on 0x with the creator as fee recipient, in USDG, and keeps going past a failed leg", async () => {
    process.env.ZEROEX_API_KEY = "test-key";
    const seen: URLSearchParams[] = [];
    const fetcher = (async (url: string, init: RequestInit) => {
      const q = new URL(url).searchParams;
      seen.push(q);
      expect((init.headers as Record<string, string>)["0x-version"]).toBe("v2");
      if (q.get("buyToken") === AAPL) return new Response(JSON.stringify({ liquidityAvailable: false }), { status: 200 });
      return new Response(
        JSON.stringify({ liquidityAvailable: true, buyAmount: "42", minBuyAmount: "41", issues: { allowance: { actual: "0", spender: "0xa11" } }, route: { fills: [{ source: "0x_RFQ" }] }, transaction: { to: "0xsettler", data: "0xab", value: "0" } }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;
    const USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168";
    const plan = await planBasketBuy({ usdg: USDG, tokens: [NVDA, TSLA, AAPL], weightsBps: [5000, 3000, 2000], usdgIn: 100_000_000n, wallet: "0xw", creator: "0xcreator", creatorFeePct: 1 }, fetcher);
    expect(seen.map((q) => q.get("sellAmount"))).toEqual(["50000000", "30000000", "20000000"]);
    expect(seen.every((q) => q.get("chainId") === "4663" && q.get("swapFeeRecipient") === "0xcreator" && q.get("swapFeeBps") === "100" && q.get("swapFeeToken") === USDG)).toBe(true);
    expect(plan.legs[0]).toMatchObject({ tx: { to: "0xsettler" }, spender: "0xa11", sources: ["0x_RFQ"], expectedOut: "42" });
    expect(plan.legs[2].error).toMatch(/no liquidity/);
    expect(plan.ok).toBe(false);
  });
  it("charges no fee when you buy your own ETF", async () => {
    process.env.ZEROEX_API_KEY = "test-key";
    const seen: URLSearchParams[] = [];
    const fetcher = (async (url: string) => {
      seen.push(new URL(url).searchParams);
      return new Response(JSON.stringify({ liquidityAvailable: true, transaction: { to: "0x1", data: "0x" } }), { status: 200 });
    }) as unknown as typeof fetch;
    await planBasketBuy({ usdg: "0xusdg", tokens: [NVDA, TSLA, AAPL], weightsBps: [4000, 3000, 3000], usdgIn: 10_000_000n, wallet: "0xw", creator: "0xW", creatorFeePct: 2 }, fetcher);
    expect(seen.every((q) => !q.has("swapFeeRecipient"))).toBe(true);
  });
});

describe("Robinhood quote API", () => {
  it("parses decimals to 18-dp fixed point", () => {
    expect(decimalToE18("1")).toBe(10n ** 18n);
    expect(decimalToE18("43.5")).toBe(435n * 10n ** 17n);
    expect(decimalToE18("1.0000000000000000019")).toBe(10n ** 18n + 1n); // truncates past 18 dp
    expect(() => decimalToE18("abc")).toThrow();
  });
  it("uses the multiplier-adjusted token mid, and flags halts and stale quotes", () => {
    const now = Date.parse("2026-10-06T16:50:30Z");
    const q = (sym: string, bid: string, ask: string, halted = false, at = "2026-10-06T16:50:23Z"): RhQuote => ({ tokenSymbol: sym, bid: "1", ask: "1", tokenBid: bid, tokenAsk: ask, isTradingHalt: halted, generatedAt: at });
    const s = sampleFromQuotes(
      [q("NVDA", "240.5", "240.7"), q("TSLA", "380", "382", true), q("AAPL", "300", "300", false, "2026-10-06T16:00:00Z"), q("XYZ", "1", "1")],
      new Map([["NVDA", NVDA], ["TSLA", TSLA], ["AAPL", AAPL]]),
      now,
    );
    expect(s.get(NVDA)).toMatchObject({ value: 2406n * 10n ** 17n, trading: true, decimals: 18 });
    expect(s.get(TSLA)?.trading).toBe(false);
    expect(s.get(AAPL)?.trading).toBe(false);
    expect(s.size).toBe(3);
  });
});

describe("Chainlink feeds", () => {
  const fakeClient = (chainNow: number, rounds: Record<string, [bigint, number] | null>, paused: Record<string, boolean> = {}) =>
    ({
      getBlock: async () => ({ timestamp: BigInt(chainNow) }),
      readContract: async ({ address, functionName }: { address: string; functionName: string }) => {
        if (functionName === "oraclePaused") return paused[address] ?? false;
        const r = rounds[address];
        if (!r) throw new Error("no feed");
        return [1n, r[0], 0n, BigInt(r[1]), 1n];
      },
    }) as unknown as PublicClient;
  const src = (token: string, feed: string) => ({ token, feed: feed as `0x${string}`, mainnetToken: feed as `0x${string}`, decimals: 18 });

  it("scales 8-decimal answers to 1e18 and checks freshness, pauses and chain liveness", async () => {
    const now = 1_790_000_000;
    const c = fakeClient(now, { "0xf1": [24_066_000_000n, now - 60], "0xf2": [38_132_000_000n, now - MAX_FEED_AGE_SEC - 1], "0xf3": [10_000_000_000n, now], "0xf4": null }, { "0xf3": true });
    const s = await sampleFeeds([src("nvda", "0xf1"), src("tsla", "0xf2"), src("aapl", "0xf3"), src("gone", "0xf4")], c, now * 1000);
    expect(s.get("nvda")).toMatchObject({ value: 24066n * 10n ** 16n, trading: true });
    expect(s.get("tsla")?.trading).toBe(false); // stale
    expect(s.get("aapl")?.trading).toBe(false); // oracle paused (corporate action)
    expect(s.has("gone")).toBe(false);
    const down = await sampleFeeds([src("nvda", "0xf1")], fakeClient(now - 3600, { "0xf1": [1n, now - 3600] }), now * 1000);
    expect(down.get("nvda")?.trading).toBe(false); // chain stalled
  });
});

describe("stock list", () => {
  it("has 35 Robinhood Stock Tokens, each with a unique address, feed and colour", () => {
    expect(STOCKS).toHaveLength(35);
    for (const key of ["address", "feed", "color", "ticker"] as const) expect(new Set(STOCKS.map((s) => s[key].toLowerCase())).size).toBe(35);
    expect(STOCKS.filter((s) => s.testnet).map((s) => s.ticker).sort()).toEqual(["AMD", "AMZN", "PLTR", "TSLA"]);
  });
});
