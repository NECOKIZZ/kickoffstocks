// Server-side helpers behind the API routes: the public config the browser
// and agents need, the league's stocks on the current chain, a wallet's
// entries, and transaction plans. API keys never leave the server.

import { formatUnits, getAddress, isAddress, type Address, type Hex } from "viem";
import { type AssetKind } from "../ui/data/stocks";
import { chainFromEnv, clientsFromEnv, escrowFromEnv, leagueChain, rpcFromEnv } from "./chain";
import { erc20Abi, leagueEscrowAbi, readEntries, readRound, readTeamMeta, type RoundInfo } from "./escrow";
import { livePrices, loadRoundView } from "./live";
import { leagueStore } from "./store";
import { DEFAULT_RULES, DRIFT_BPS } from "./settlement";
import { basketWeightsBps } from "../engine/league";
import { approveStep, planBack, planClaim, planClaimBasket, planLock, buyPlanSteps, normaliseWeights, swapStep, type TxStep } from "./actions";
import { planBasketBuy } from "../rh/zeroEx";
import { priceDeskBuy, QUOTE_TTL_S, randomNonce, signDeskBuy, testDeskAbi, testDeskAddress, testDeskEnabled } from "../rh/testDesk";
import { USDG_DECIMALS, USDG_MAINNET } from "../rh/chains";
import { chainStockList } from "./registry";

export const isLocal = () => leagueChain() === "local";

export interface PublicStock {
  symbol: string;
  ticker: string;
  name: string;
  kind: AssetKind;
  address: Address;
  /** Token decimals (WBTC: 8, the rest: 18). */
  decimals: number;
  logo: string | null;
  /** Mainnet Chainlink feed that scores this stock. */
  feed: Address;
  color: string;
  colorLight: string;
  price: number;
  trading: boolean | null;
  /** Percent change since the current round's start price, when known. */
  changePct: number | null;
}

/** Start prices of the latest round (token → USD), from the keeper's saved samples. */
async function roundStartPrices(): Promise<Map<string, number>> {
  try {
    const { pub } = clientsFromEnv();
    const id = await pub.readContract({ address: escrowFromEnv(), abi: leagueEscrowAbi, functionName: "roundCount" });
    if (id === 0n) return new Map();
    const samples = await leagueStore().loadSamples(id, "start");
    if (!samples.length) return new Map();
    return new Map([...samples[0].sample.values()].map((p) => [p.token, Number(p.value) / 1e18]));
  } catch {
    return new Map();
  }
}

/** League stocks with this chain's addresses (faucet tokens on testnet, mock copies on the local demo chain). */
export async function chainStocks(): Promise<{ source: string; stocks: PublicStock[] }> {
  const [live, startPrices] = await Promise.all([livePrices(), roundStartPrices()]);
  const stocks = chainStockList().map(({ stock: s, address }) => {
    const p = live?.sample.get(address.toLowerCase());
    const price = p ? Number(p.value) / 1e18 : s.price;
    const start = startPrices.get(address.toLowerCase());
    return {
      symbol: s.symbol,
      ticker: s.ticker,
      name: s.name,
      kind: s.kind,
      address,
      decimals: s.decimals,
      logo: s.logo ?? null,
      feed: s.feed,
      color: s.color,
      colorLight: s.colorLight,
      price,
      trading: p ? p.trading : null,
      changePct: start ? Math.round(((price - start) / start) * 10_000) / 100 : null,
    };
  });
  return { source: live ? live.source : "snapshot-2026-10-06", stocks };
}

export async function publicConfig() {
  const chain = chainFromEnv();
  let escrow: Address | null = null;
  let usdg: Address = USDG_MAINNET;
  let currentRound: string | null = null;
  try {
    escrow = escrowFromEnv();
    const { pub } = clientsFromEnv();
    const [stakeToken, count] = await Promise.all([
      pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "stakeToken" }),
      pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "roundCount" }),
    ]);
    usdg = stakeToken;
    currentRound = count > 0n ? count.toString() : null;
  } catch {
    // No escrow yet: the app still renders, with entering disabled.
  }
  const c = leagueChain();
  return {
    chain: c,
    chainId: chain.id,
    chainName: chain.name,
    rpcUrl: c === "local" ? rpcFromEnv() : (process.env.NEXT_PUBLIC_RH_RPC_URL ?? chain.rpcUrls.default.http[0]),
    explorer: chain.blockExplorers?.default.url ?? null,
    escrow,
    usdg,
    usdgDecimals: USDG_DECIMALS,
    currentRound,
    /** Buying: 0x on mainnet, the league's swap desk on testnet. */
    buyEnabled: c === "mainnet" ? !!process.env.ZEROEX_API_KEY : c === "testnet" && testDeskEnabled(),
    buyRoute: c === "mainnet" ? "0x" : c === "testnet" && testDeskEnabled() ? "test-desk" : null,
    /** Test USDG from the league's faucet (testnet and the local demo). */
    faucet: c !== "mainnet",
    /** Robinhood's faucet: testnet ETH for gas. */
    stockFaucet: c === "testnet" ? "https://faucet.testnet.chain.robinhood.com" : null,
    rules: {
      minTokens: DEFAULT_RULES.minTokens,
      minStocks: DEFAULT_RULES.minTokens,
      maxCryptoPct: DEFAULT_RULES.maxCryptoBps! / 100,
      maxTokens: 10,
      maxWeightPct: DEFAULT_RULES.maxWeightBps / 100,
      minBasketUsd: Number(DEFAULT_RULES.minValue / 10n ** 18n),
      ticketUsd: 5,
      maxBuyFeePct: 2,
      driftPct: DRIFT_BPS / 100,
    },
  };
}

/** A wallet's entries in the most recent rounds, with what it can claim. */
export async function loadMe(wallet: Address, lastRounds = 6) {
  const { pub } = clientsFromEnv();
  const escrow = escrowFromEnv();
  const count = Number(await pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "roundCount" }));
  const ids = Array.from({ length: Math.min(lastRounds, count) }, (_, i) => BigInt(count - i));
  const rows = await Promise.all(
    ids.map(async (id) => {
      const idx = await pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "entryIndex", args: [id, wallet] });
      if (idx === 0n) return null;
      const [info, e] = await Promise.all([
        readRound(pub, escrow, id),
        pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "entryAt", args: [id, idx - 1n] }),
      ]);
      const [meta] = [await readTeamMeta(pub, escrow, id, [e.teamKey])];
      let basket: { token: Address; amount: string }[] = [];
      if (e.isCreator) {
        const [tokens, amounts] = await pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "basketOf", args: [id, wallet] });
        basket = tokens.map((t, i) => ({ token: t, amount: amounts[i].toString() }));
      }
      const done = info.status === "Settled" || info.status === "Voided";
      // What claim() pays: the payout once settled, the ticket back if voided.
      const owed = info.status === "Voided" ? info.stake : info.status === "Settled" ? e.payout : 0n;
      return {
        roundId: id.toString(),
        status: info.status,
        end: info.end,
        teamKey: e.teamKey,
        teamName: meta.get(e.teamKey.toLowerCase())?.name ?? "",
        role: e.isCreator ? "creator" : "backer",
        stake: info.stake.toString(),
        payout: owed.toString(),
        claimed: e.claimed,
        claimable: done && !e.claimed && (owed > 0n || e.isCreator),
        basket,
      };
    }),
  );
  return rows.filter((r) => r !== null);
}

// ---------------------------------------------------------------------------
// Plans: the exact transactions for an action, for the browser or an agent.
// ---------------------------------------------------------------------------

export type PlanRequest =
  | { action: "back"; wallet: string; teamKey: string; roundId?: string }
  | { action: "lock"; wallet: string; tickers: string[]; weightsPct: number[]; name: string; buyFeePct?: number; roundId?: string; amounts?: string[] }
  | { action: "buy-basket"; wallet: string; tickers: string[]; weightsPct: number[]; usdg: number; creator?: string; feePct?: number }
  | { action: "buy-etf"; wallet: string; teamKey: string; usdg: number; roundId?: string }
  | { action: "claim"; wallet: string; roundId: string }
  | { action: "claim-basket"; wallet: string; roundId: string };

export interface Plan {
  action: PlanRequest["action"];
  steps: TxStep[];
  notes: string[];
  teamKey?: Hex;
  skipped?: { token: string; reason: string }[];
}

class PlanError extends Error {}
export const isPlanError = (e: unknown): e is Error => e instanceof PlanError;

/** USD values (basket values: 18 decimals) and USDG amounts (6 decimals). */
const usd = (x: bigint) => Number(formatUnits(x, 18));
const usdgAmt = (x: bigint) => Number(formatUnits(x, USDG_DECIMALS));

async function openRound(roundId?: string): Promise<RoundInfo> {
  const { pub } = clientsFromEnv();
  const escrow = escrowFromEnv();
  const id = roundId ? BigInt(roundId) : await pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "roundCount" });
  if (id === 0n) throw new PlanError("no round is open yet");
  const info = await readRound(pub, escrow, id);
  const now = Number((await pub.getBlock()).timestamp);
  if (info.status !== "Open" || now >= info.entryClose) throw new PlanError(`round ${id} is not taking entries`);
  return info;
}

/** Pull tWBTC / tWETH into the desk from the token's faucet, with the keeper's gas. False if it's too soon. */
async function refillDesk(desk: Address, token: Address): Promise<boolean> {
  try {
    const { pub, wallet, account, chain } = clientsFromEnv(true);
    const hash = await wallet!.writeContract({ address: desk, abi: testDeskAbi, functionName: "refill", args: [token], account: account!, chain });
    return (await pub.waitForTransactionReceipt({ hash })).status === "success";
  } catch {
    return false; // the faucet's hourly limit, or no keeper key
  }
}

/**
 * Testnet "buy": one signed quote from the league's swap desk for the whole
 * basket, at live prices. Steps: approve test USDG (if needed), then one swap.
 */
async function planDeskBuy(p: {
  action: "buy-basket" | "buy-etf";
  wallet: Address;
  usdg: Address;
  usdgTotal: bigint;
  picks: PublicStock[];
  weights: number[];
  creator: Address;
  feePct: number;
  allowance: (token: Address, spender: Address) => Promise<bigint>;
}): Promise<Plan> {
  const desk = testDeskAddress()!;
  const { pub, chain } = clientsFromEnv();
  const priced = priceDeskBuy({
    legs: p.picks.map((s, i) => ({ token: s.address, weightBps: p.weights[i], price: s.price, decimals: s.decimals })),
    usdgTotal: p.usdgTotal,
    feeBps: p.creator === p.wallet ? 0 : Math.round(p.feePct * 100),
  });
  const sym = (t: Address) => p.picks.find((s) => s.address === t)?.ticker ?? t;
  const deskHolds = (t: Address) => pub.readContract({ address: t, abi: erc20Abi, functionName: "balanceOf", args: [desk] });
  const crypto = new Set(p.picks.filter((s) => s.kind === "crypto").map((s) => s.address));
  const short: string[] = [];
  for (const l of priced.legs) {
    if ((await deskHolds(l.token)) >= l.amountOut) continue;
    // tWBTC / tWETH: the desk can pull more from their faucets (once an hour each).
    if (crypto.has(l.token) && (await refillDesk(desk, l.token)) && (await deskHolds(l.token)) >= l.amountOut) continue;
    short.push(sym(l.token));
  }
  if (short.length)
    throw new PlanError(
      `the testnet swap desk is out of ${short.join(", ")} right now; try a smaller amount${short.some((t) => t === "BTC" || t === "ETH") ? " or try again in an hour" : " or try again later"}`,
    );
  const now = Number((await pub.getBlock()).timestamp);
  const { data } = await signDeskBuy(chain.id, desk, {
    taker: p.wallet,
    tokens: priced.legs.map((l) => l.token),
    amountsOut: priced.legs.map((l) => l.amountOut),
    usdgIn: priced.usdgIn,
    feeRecipient: p.creator,
    fee: priced.fee,
    deadline: BigInt(now + QUOTE_TTL_S),
    nonce: randomNonce(),
  });
  const steps: TxStep[] = [];
  if ((await p.allowance(p.usdg, desk)) < p.usdgTotal) steps.push(approveStep(p.usdg, desk, p.usdgTotal, "Allow the swap desk to spend your test USDG"));
  steps.push(swapStep({ to: desk, data }, `Buy ${priced.legs.map((l) => sym(l.token)).join(", ")} with ${usdgAmt(p.usdgTotal).toFixed(2)} USDG, in one swap`));
  const notes = [
    `${usdgAmt(p.usdgTotal)} USDG split across ${priced.legs.length} stocks by weight, at live prices: ${priced.legs.map((l) => `${sym(l.token)} $${usdgAmt(l.amountIn).toFixed(2)}`).join(" · ")}.`,
    `Testnet: the league's swap desk fills it (0x only runs on mainnet). The quote is good for ${QUOTE_TTL_S / 60} minutes.`,
  ];
  if (priced.fee > 0n) notes.push(`${p.feePct}% creator fee (${usdgAmt(priced.fee).toFixed(2)} USDG) goes to ${p.creator}.`);
  return { action: p.action, steps, notes };
}

export async function makePlan(req: PlanRequest): Promise<Plan> {
  if (!isAddress(req.wallet)) throw new PlanError("wallet must be an address");
  const wallet = getAddress(req.wallet);
  const { pub } = clientsFromEnv();
  const escrow = escrowFromEnv();
  const usdg = await pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "stakeToken" });
  const allowance = (token: Address, spender: Address) => pub.readContract({ address: token, abi: erc20Abi, functionName: "allowance", args: [wallet, spender] });
  const { stocks } = await chainStocks();
  const byTicker = (t: string) => {
    const s = stocks.find((x) => x.ticker === t.toUpperCase());
    if (!s) throw new PlanError(`unknown or banned stock: ${t}`);
    return s;
  };

  const notEntered = async (id: bigint) => {
    const idx = await pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "entryIndex", args: [id, wallet] });
    if (idx !== 0n) throw new PlanError(`this wallet already has an entry in round ${id} (one per wallet)`);
  };

  switch (req.action) {
    case "back": {
      const info = await openRound(req.roundId);
      await notEntered(info.id);
      const teamKey = req.teamKey as Hex;
      const captain = await pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "captainOf", args: [info.id, teamKey] });
      if (/^0x0+$/.test(captain)) throw new PlanError("no team with that key in this round");
      const meta = await readTeamMeta(pub, escrow, info.id, [teamKey]);
      const steps = planBack({ escrow, usdg, roundId: info.id, stake: info.stake, teamKey, allowance: await allowance(usdg, escrow), teamName: meta.get(teamKey.toLowerCase())?.name });
      return { action: "back", steps, notes: [`Ticket: ${usdgAmt(info.stake)} USDG. Entries close ${new Date(info.entryClose * 1000).toISOString()}.`] };
    }

    case "lock": {
      const info = await openRound(req.roundId);
      await notEntered(info.id);
      const picks = req.tickers.map(byTicker);
      if (picks.filter((p) => p.kind !== "crypto").length < DEFAULT_RULES.minTokens) throw new PlanError("a basket needs at least 3 stocks or funds (BTC and ETH don't count toward the 3)");
      if (picks.length > 10) throw new PlanError("a basket has at most 10 assets");
      if (new Set(picks.map((p) => p.ticker)).size !== picks.length) throw new PlanError("each stock once");
      const name = (req.name ?? "").trim();
      if (!name || new TextEncoder().encode(name).length > 32) throw new PlanError("name: 1 to 32 bytes");
      const feeBps = Math.round((req.buyFeePct ?? 1) * 100);
      if (feeBps < 0 || feeBps > 200) throw new PlanError("buy fee: 0% to 2%");
      const weights = normaliseWeights(req.weightsPct);
      if (weights.some((w) => w > DEFAULT_RULES.maxWeightBps)) throw new PlanError("no stock above 50%");
      const cryptoBps = weights.reduce((s, w, i) => s + (picks[i].kind === "crypto" ? w : 0), 0);
      if (cryptoBps > DEFAULT_RULES.maxCryptoBps!) throw new PlanError(`crypto is ${cryptoBps / 100}% of the basket; the cap is ${DEFAULT_RULES.maxCryptoBps! / 100}%`);
      const tokens = picks.map((p) => p.address);
      // Lock what the wallet holds (or the amounts given).
      const amounts = req.amounts?.length
        ? req.amounts.map((a) => BigInt(a))
        : await Promise.all(tokens.map((t) => pub.readContract({ address: t, abi: erc20Abi, functionName: "balanceOf", args: [wallet] })));
      if (amounts.some((a) => a === 0n)) throw new PlanError(`the wallet holds none of: ${picks.filter((_, i) => amounts[i] === 0n).map((p) => p.ticker).join(", ")}`);
      // USD values with 18 decimals, whatever the token's own decimals.
      const values = amounts.map((a, i) => (a * 10n ** BigInt(18 - picks[i].decimals) * BigInt(Math.round(picks[i].price * 1e6))) / 10n ** 6n);
      const total = values.reduce((s, v) => s + v, 0n);
      const notes: string[] = [];
      if (total < DEFAULT_RULES.minValue) throw new PlanError(`basket is worth $${usd(total).toFixed(2)}; the minimum is $10`);
      const measured = basketWeightsBps(values);
      const measuredCrypto = measured.reduce((s, w, i) => s + (picks[i].kind === "crypto" ? w : 0), 0);
      if (measuredCrypto > DEFAULT_RULES.maxCryptoBps! + DRIFT_BPS / 2)
        notes.push(`Crypto is ${(measuredCrypto / 100).toFixed(1)}% of the basket at current prices. Above ${(DEFAULT_RULES.maxCryptoBps! + DRIFT_BPS) / 100}% at round start refunds the entry.`);
      measured.forEach((m, i) => {
        if (Math.abs(m - weights[i]) > DRIFT_BPS / 2)
          notes.push(`${picks[i].ticker} is ${(m / 100).toFixed(1)}% of the basket at current prices but you declared ${(weights[i] / 100).toFixed(1)}%. More than ${DRIFT_BPS / 100} points apart at round start refunds the entry.`);
      });
      const allowances: Record<string, bigint> = {};
      for (const t of [...tokens, usdg]) allowances[t.toLowerCase()] = await allowance(t, escrow);
      const { teamKey, steps } = planLock({
        escrow,
        usdg,
        roundId: info.id,
        stake: info.stake,
        tokens,
        amounts,
        weightsBps: weights,
        name,
        buyFeeBps: feeBps,
        allowances,
        symbols: Object.fromEntries(picks.map((p) => [p.address.toLowerCase(), p.symbol])),
      });
      notes.unshift(`Basket worth $${usd(total).toFixed(2)} at current prices, plus the ${usdgAmt(info.stake)} USDG ticket.`);
      return { action: "lock", steps, notes, teamKey };
    }

    case "buy-basket":
    case "buy-etf": {
      const net = leagueChain();
      if (net === "local") throw new PlanError("there's no swap on the local demo chain: use its faucet");
      if (net === "testnet" && !testDeskEnabled()) throw new PlanError("the testnet swap desk isn't set up on this deployment; get stock tokens from Robinhood's faucet");
      let tickers: PublicStock[];
      let weights: number[];
      let creator: Address;
      let feePct: number;
      if (req.action === "buy-etf") {
        const view = await loadRoundView(req.roundId ? BigInt(req.roundId) : undefined);
        const team = view?.teams.find((t) => t.teamKey.toLowerCase() === req.teamKey.toLowerCase());
        if (!team) throw new PlanError("no team with that key");
        tickers = team.holdings.map((h) => stocks.find((s) => s.address.toLowerCase() === h.token.toLowerCase())!).filter(Boolean);
        weights = team.holdings.map((h) => h.weightBps);
        creator = getAddress(team.captain);
        feePct = team.buyFeeBps / 100;
      } else {
        tickers = req.tickers.map(byTicker);
        weights = normaliseWeights(req.weightsPct);
        creator = req.creator && isAddress(req.creator) ? getAddress(req.creator) : wallet;
        feePct = creator === wallet ? 0 : (req.feePct ?? 1);
      }
      if (!(req.usdg >= 1 && req.usdg <= 10_000)) throw new PlanError("amount: 1 to 10,000 USDG");
      const usdgIn = BigInt(Math.round(req.usdg * 10 ** USDG_DECIMALS));
      if (net === "testnet") return planDeskBuy({ action: req.action, wallet, usdg, usdgTotal: usdgIn, picks: tickers, weights, creator, feePct, allowance });
      const plan = await planBasketBuy({ usdg, tokens: tickers.map((t) => t.address), weightsBps: weights, usdgIn, wallet, creator, creatorFeePct: feePct });
      const spenders = [...new Set(plan.legs.map((l) => (l.spender ?? l.tx?.to ?? "").toLowerCase()).filter(Boolean))];
      const allow = new Map<string, bigint>();
      for (const sp of spenders) allow.set(sp, await allowance(usdg, sp as Address));
      const { steps, skipped } = buyPlanSteps(plan, usdg, (sp) => allow.get(sp.toLowerCase()) ?? 0n, (t) => stocks.find((s) => s.address.toLowerCase() === t.toLowerCase())?.symbol ?? t);
      const notes = [`${req.usdg} USDG split across ${tickers.length} stocks by weight.`];
      if (feePct > 0) notes.push(`${feePct}% creator fee goes to ${creator}, taken from the USDG by 0x's swap.`);
      if (skipped.length) notes.push(`Not included: ${skipped.map((s) => `${s.token} (${s.reason})`).join("; ")}.`);
      return { action: req.action, steps, notes, skipped };
    }

    case "claim":
      return { action: "claim", steps: planClaim(escrow, BigInt(req.roundId)), notes: ["Pays your payout (or refund) and returns a creator's basket."] };
    case "claim-basket":
      return { action: "claim-basket", steps: planClaimBasket(escrow, BigInt(req.roundId)), notes: ["Only needed if a stock was paused when you claimed."] };
  }
}

// ---------------------------------------------------------------------------
// Leaderboard: from the published settlement inputs of every settled round.
// ---------------------------------------------------------------------------

export interface CreatorRow { wallet: string; name: string; rounds: number; wins: number; bestReturnPct: number; teamTickets: number; won: string }
export interface BackerRow { wallet: string; tickets: number; wins: number; net: string }

export async function loadLeaderboard() {
  const { pub } = clientsFromEnv();
  const escrow = escrowFromEnv();
  const count = Number(await pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "roundCount" }));
  const store = leagueStore();
  const creators = new Map<string, CreatorRow & { wonWei: bigint }>();
  const backers = new Map<string, BackerRow & { netWei: bigint }>();
  let settled = 0;
  for (let id = 1; id <= count; id++) {
    const inp = (await store.loadInputs(BigInt(id))) as null | {
      stake: string;
      entries: { wallet: string; teamKey: string; isCreator: boolean; payout: string; status: { kind: string; captain?: boolean } }[];
      teams: { teamKey: string; captain: string; ret: string; members: number; isWinner: boolean; isDraw?: boolean }[];
      result: { void: string | null };
    };
    if (!inp || inp.result.void) continue;
    settled++;
    const stake = BigInt(inp.stake);
    const meta = await readTeamMeta(pub, escrow, BigInt(id), inp.teams.map((t) => t.teamKey as Hex));
    for (const t of inp.teams) {
      const k = t.captain.toLowerCase();
      const row = creators.get(k) ?? { wallet: t.captain, name: "", rounds: 0, wins: 0, bestReturnPct: -Infinity, teamTickets: 0, won: "0", wonWei: 0n };
      row.rounds++;
      if (t.isWinner) row.wins++;
      row.bestReturnPct = Math.max(row.bestReturnPct, Number(BigInt(t.ret)) / 1e10);
      row.teamTickets += t.members;
      row.name = meta.get(t.teamKey.toLowerCase())?.name || row.name;
      const pay = BigInt(inp.entries.find((e) => e.wallet.toLowerCase() === k && e.status.captain)?.payout ?? "0");
      row.wonWei += pay - stake;
      creators.set(k, row);
    }
    for (const e of inp.entries) {
      if (e.isCreator || e.status.kind !== "playing") continue;
      const k = e.wallet.toLowerCase();
      const row = backers.get(k) ?? { wallet: e.wallet, tickets: 0, wins: 0, net: "0", netWei: 0n };
      row.tickets++;
      const pay = BigInt(e.payout);
      if (pay > stake) row.wins++;
      row.netWei += pay - stake;
      backers.set(k, row);
    }
  }
  const usd = (w: bigint) => (Number(w) / 10 ** USDG_DECIMALS).toFixed(2);
  return {
    settledRounds: settled,
    creators: [...creators.values()]
      .map(({ wonWei, ...r }) => ({ ...r, won: usd(wonWei) }))
      .sort((a, b) => b.wins - a.wins || Number(b.won) - Number(a.won)),
    backers: [...backers.values()]
      .map(({ netWei, ...r }) => ({ ...r, net: usd(netWei) }))
      .sort((a, b) => Number(b.net) - Number(a.net)),
  };
}
