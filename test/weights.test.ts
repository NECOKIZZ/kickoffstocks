import { describe, expect, it } from "vitest";
import { equalWeights } from "../src/web/weights";

const p = (ticker: string, crypto = false) => ({ ticker, crypto });

describe("equalWeights", () => {
  it("splits evenly, remainder to the first", () => {
    expect(equalWeights([p("A"), p("B"), p("C")])).toEqual({ A: 34, B: 33, C: 33 });
  });
  it("keeps crypto within the cap and gives the rest to stocks", () => {
    expect(equalWeights([p("A"), p("B"), p("C"), p("BTC", true), p("ETH", true)], 20)).toEqual({ A: 27, B: 27, C: 26, BTC: 10, ETH: 10 });
    expect(equalWeights([p("A"), p("B"), p("C"), p("BTC", true)], 20)).toEqual({ A: 27, B: 27, C: 26, BTC: 20 });
  });
});
