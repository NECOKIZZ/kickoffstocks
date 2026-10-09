// "Buy the ETF" on Robinhood Chain testnet. 0x doesn't serve the testnet, so
// the league runs TestSwapDesk (contracts/src/TestSwapDesk.sol) in its place:
// we quote the whole basket at the live prices (the same mainnet Chainlink
// feeds that score rounds), sign the quote with the quoter key, and the taker
// swaps test USDG for every stock in ONE transaction. Like the 0x path, a
// quote can pay the ETF's creator their buy fee in USDG.
//
// Server-side only: the quoter key (SWAP_QUOTER_KEY, else the keeper's key)
// never reaches the browser. It can only sign quotes for testnet tokens.

import { encodeAbiParameters, encodeFunctionData, getAddress, keccak256, parseAbi, toHex, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import deployments from "../../deployments.json";
import { splitBuy } from "../league/basket";

export const testDeskAbi = parseAbi([
  "struct Quote { address taker; address[] tokens; uint256[] amountsOut; uint256 usdgIn; address feeRecipient; uint256 fee; uint256 deadline; bytes32 nonce; }",
  "function buy(Quote q, bytes sig)",
  "function quoteHash(Quote q) view returns (bytes32)",
  "function quoter() view returns (address)",
  "function refill(address token)",
]);

/** How long a signed quote stays valid: room for the approval to confirm first. */
export const QUOTE_TTL_S = 10 * 60;

export function testDeskAddress(): Address | null {
  const a = process.env.SWAP_DESK_ADDRESS ?? (deployments as { testnet?: { contracts?: { swapDesk?: string } } }).testnet?.contracts?.swapDesk;
  return a ? getAddress(a) : null;
}

function quoterKey(): Hex | null {
  return (process.env.SWAP_QUOTER_KEY ?? process.env.KEEPER_PRIVATE_KEY ?? process.env.DEPLOYER_PRIVATE_KEY ?? null) as Hex | null;
}

export const testDeskEnabled = () => !!testDeskAddress() && !!quoterKey();

export interface DeskQuote {
  taker: Address;
  tokens: Address[];
  amountsOut: bigint[];
  usdgIn: bigint;
  feeRecipient: Address;
  fee: bigint;
  deadline: bigint;
  nonce: Hex;
}

/** Mirrors TestSwapDesk.quoteHash. */
export function deskQuoteHash(chainId: number, desk: Address, q: DeskQuote): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        { type: "uint256" },
        { type: "address" },
        { type: "address" },
        { type: "address[]" },
        { type: "uint256[]" },
        { type: "uint256" },
        { type: "address" },
        { type: "uint256" },
        { type: "uint256" },
        { type: "bytes32" },
      ],
      [BigInt(chainId), desk, q.taker, q.tokens, q.amountsOut, q.usdgIn, q.feeRecipient, q.fee, q.deadline, q.nonce],
    ),
  );
}

export interface DeskLeg {
  token: Address;
  weightBps: number;
  /** USDG base units spent on this stock. */
  amountIn: bigint;
  /** Token base units received. */
  amountOut: bigint;
}

/**
 * Price the basket: the USDG after the creator fee is split by weight, and
 * each leg buys `amountIn / price` of the stock. No spread: it's test money.
 */
export function priceDeskBuy(p: {
  legs: { token: Address; weightBps: number; price: number; decimals: number }[];
  usdgTotal: bigint;
  feeBps: number;
}): { legs: DeskLeg[]; usdgIn: bigint; fee: bigint } {
  const fee = (p.usdgTotal * BigInt(Math.round(p.feeBps))) / 10_000n;
  const usdgIn = p.usdgTotal - fee;
  const split = splitBuy(p.legs.map((l) => l.token), p.legs.map((l) => l.weightBps), usdgIn);
  const legs = split.map((s) => {
    const l = p.legs.find((x) => x.token === s.token)!;
    if (!(l.price > 0)) throw new Error(`no price for ${l.token}`);
    // amountIn is USD × 1e6 (USDG has 6 decimals); price × 1e6 keeps it integral.
    const amountOut = (s.amountIn * 10n ** BigInt(l.decimals)) / BigInt(Math.round(l.price * 1e6));
    return { token: l.token, weightBps: l.weightBps, amountIn: s.amountIn, amountOut };
  });
  return { legs, usdgIn, fee };
}

/** Sign a quote with the quoter key and return the desk's `buy` calldata. */
export async function signDeskBuy(chainId: number, desk: Address, q: DeskQuote): Promise<{ data: Hex; quote: DeskQuote }> {
  const key = quoterKey();
  if (!key) throw new Error("no quoter key: set SWAP_QUOTER_KEY or KEEPER_PRIVATE_KEY");
  const sig = await privateKeyToAccount(key).signMessage({ message: { raw: deskQuoteHash(chainId, desk, q) } });
  return { data: encodeFunctionData({ abi: testDeskAbi, functionName: "buy", args: [q, sig] }), quote: q };
}

export const randomNonce = (): Hex => toHex(crypto.getRandomValues(new Uint8Array(32)));
