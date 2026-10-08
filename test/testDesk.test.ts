// The testnet swap desk: pricing the basket, and a signed quote that the
// real contract accepts (on anvil; skipped when anvil or the forge build
// output is missing: cd contracts && forge build).
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { createPublicClient, createWalletClient, http, parseAbi, type Address, type Hex } from "viem";
import { foundry } from "viem/chains";
import { mnemonicToAccount } from "viem/accounts";
import { priceDeskBuy, signDeskBuy, testDeskAbi, deskQuoteHash, type DeskQuote } from "../src/rh/testDesk";
import { erc20Abi } from "../src/league/escrow";

const A = (n: number) => `0x${n.toString(16).padStart(40, "0")}` as Address;

describe("priceDeskBuy", () => {
  it("takes the creator fee, splits the rest by weight and prices each leg", () => {
    const { legs, usdgIn, fee } = priceDeskBuy({
      legs: [
        { token: A(1), weightBps: 5000, price: 400, decimals: 18 }, // TSLA
        { token: A(2), weightBps: 3000, price: 150, decimals: 18 },
        { token: A(3), weightBps: 2000, price: 80_000, decimals: 8 }, // BTC
      ],
      usdgTotal: 12_000_000n,
      feeBps: 100,
    });
    expect(fee).toBe(120_000n);
    expect(usdgIn).toBe(11_880_000n);
    expect(legs.map((l) => l.amountIn)).toEqual([5_940_000n, 3_564_000n, 2_376_000n]);
    expect(legs[0].amountOut).toBe(14_850_000_000_000_000n); // $5.94 / $400 = 0.01485 TSLA
    expect(legs[2].amountOut).toBe(2_970n); // $2.376 / $80k = 0.0000297 BTC (8 decimals)
  });
});

const ANVIL = [process.env.ANVIL_BIN, `${homedir()}/.foundry/bin/anvil`, "/usr/local/bin/anvil"].find((p) => p && existsSync(p));
const ART = (file: string, name: string) => `contracts/out/${file}/${name}.json`;
const haveArtifacts = ["TestSwapDesk", "TestUSDG", "TestToken"].every((n) => existsSync(ART(`${n}.sol`, n)));
const run = ANVIL && haveArtifacts ? describe : describe.skip;

const PORT = 8900 + Math.floor(Math.random() * 300);
const RPC = `http://127.0.0.1:${PORT}`;
const MNEMONIC = "test test test test test test test test test test test junk"; // anvil's public dev mnemonic
const acct = (i: number) => mnemonicToAccount(MNEMONIC, { addressIndex: i });

run("TestSwapDesk on anvil", () => {
  let anvil: ChildProcess;
  const pub = createPublicClient({ chain: foundry, transport: http(RPC) });
  const walletFor = (i: number) => createWalletClient({ account: acct(i), chain: foundry, transport: http(RPC) });
  const prevKey = process.env.SWAP_QUOTER_KEY;

  beforeAll(async () => {
    anvil = spawn(ANVIL!, ["--port", String(PORT), "--silent"], { stdio: "ignore" });
    for (let i = 0; i < 50; i++) {
      try {
        await pub.getBlockNumber();
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    throw new Error("anvil did not start");
  }, 20_000);
  afterAll(() => {
    anvil?.kill();
    if (prevKey === undefined) delete process.env.SWAP_QUOTER_KEY;
    else process.env.SWAP_QUOTER_KEY = prevKey;
  });

  async function deploy(name: string, args: unknown[]): Promise<Address> {
    const j = JSON.parse(readFileSync(ART(`${name}.sol`, name), "utf8"));
    const hash = await walletFor(0).deployContract({ abi: j.abi, bytecode: j.bytecode.object as Hex, args });
    return (await pub.waitForTransactionReceipt({ hash })).contractAddress!;
  }
  async function send(i: number, address: Address, abi: readonly unknown[], functionName: string, args: unknown[]) {
    const hash = await walletFor(i).writeContract({ address, abi: abi as never, functionName: functionName as never, args: args as never });
    expect((await pub.waitForTransactionReceipt({ hash })).status).toBe("success");
  }

  it("fills a server-signed basket quote in one transaction", async () => {
    const quoter = acct(5);
    process.env.SWAP_QUOTER_KEY = `0x${Buffer.from(quoter.getHdKey().privateKey!).toString("hex")}`;
    const usdg = await deploy("TestUSDG", []);
    const tsla = await deploy("TestToken", ["Tesla", "TSLA", 18, 5n * 10n ** 18n]);
    const amd = await deploy("TestToken", ["AMD", "AMD", 18, 5n * 10n ** 18n]);
    const desk = await deploy("TestSwapDesk", [usdg, quoter.address]);
    await send(0, desk, testDeskAbi, "refill", [tsla]);
    await send(0, desk, testDeskAbi, "refill", [amd]);
    const taker = acct(1);
    await send(1, usdg, parseAbi(["function faucet()"]), "faucet", []);

    const priced = priceDeskBuy({
      legs: [
        { token: tsla, weightBps: 6000, price: 400, decimals: 18 },
        { token: amd, weightBps: 4000, price: 160, decimals: 18 },
      ],
      usdgTotal: 12_000_000n,
      feeBps: 100,
    });
    const now = Number((await pub.getBlock()).timestamp);
    const q: DeskQuote = {
      taker: taker.address,
      tokens: [tsla, amd],
      amountsOut: priced.legs.map((l) => l.amountOut),
      usdgIn: priced.usdgIn,
      feeRecipient: acct(2).address,
      fee: priced.fee,
      deadline: BigInt(now + 600),
      nonce: `0x${"11".repeat(32)}`,
    };
    expect(await pub.readContract({ address: desk, abi: testDeskAbi, functionName: "quoteHash", args: [q] })).toBe(deskQuoteHash(foundry.id, desk, q));
    const { data } = await signDeskBuy(foundry.id, desk, q);

    await send(1, usdg, erc20Abi, "approve", [desk, 12_000_000n]);
    const hash = await walletFor(1).sendTransaction({ to: desk, data });
    expect((await pub.waitForTransactionReceipt({ hash })).status).toBe("success");
    const bal = (t: Address, w: Address) => pub.readContract({ address: t, abi: erc20Abi, functionName: "balanceOf", args: [w] });
    expect(await bal(tsla, taker.address)).toBe(priced.legs[0].amountOut);
    expect(await bal(amd, taker.address)).toBe(priced.legs[1].amountOut);
    expect(await bal(usdg, taker.address)).toBe(38_000_000n);
    expect(await bal(usdg, acct(2).address)).toBe(120_000n);
  }, 30_000);
});
