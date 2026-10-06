// Kickoff Stocks keeper. Runs rounds on LeagueEscrow.
//
//   npx tsx --env-file=.env.local scripts/keeper.mts <command> [options]
//
//   open   --entry-min 60 --run-min 60 [--stake 5] [--cap 100] [--max-backers 20]
//          Opens a round: entries close in --entry-min minutes, the round ends
//          --run-min minutes after that.
//   sample <roundId> start|end [--source chainlink|robinhood]
//          Takes one price sample of every league token and saves it.
//   settle <roundId> [--window-min 30] [--min-samples 3] [--dry-run]
//          Settles from the saved samples taken inside each window
//          (start: entryClose … +window, end: end … +window).
//   auto   <roundId> [--samples 3] [--every-min 5] [--source …]
//          Waits for the round, samples at start and end, then settles.
//   status <roundId>
//
// Prices: LEAGUE_PRICE_SOURCE (or --source) chainlink (default, Robinhood
// Chain's Chainlink feeds) or robinhood (Robinhood's quote API, for short
// demo rounds). Testnet rounds read the same stocks' mainnet feeds.
//
// Env: ESCROW_ADDRESS, KEEPER_PRIVATE_KEY, RH_RPC_URL, PRICE_RPC_URL,
//      LEAGUE_CHAIN (testnet|mainnet|local), LEAGUE_DATA_DIR (default ./data).

import { formatUnits, parseUnits } from "viem";
import { clientsFromEnv, escrowFromEnv, leagueChain } from "../src/league/chain";
import { erc20Abi, leagueEscrowAbi, readEntries, readRound, roundTokens, submitSettlement } from "../src/league/escrow";
import { buildSnapshot } from "../src/league/snapshot";
import { settleRound } from "../src/league/settlement";
import { FileStore, type Phase } from "../src/league/store";
import { priceSourceFromEnv, samplePrices, type PriceSource } from "../src/league/prices";

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (name: string, def?: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const flag = (name: string) => args.includes(`--${name}`);
const store = new FileStore();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function open() {
  const { pub, wallet, account, chain } = clientsFromEnv(true);
  const escrow = escrowFromEnv();
  const now = Math.floor(Date.now() / 1000);
  const entryClose = now + Number(opt("entry-min", "60")) * 60;
  const end = entryClose + Number(opt("run-min", "60")) * 60;
  const stakeToken = await pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "stakeToken" });
  const decimals = await pub.readContract({ address: stakeToken, abi: erc20Abi, functionName: "decimals" });
  const stake = parseUnits(opt("stake", "5")!, decimals);
  const hash = await wallet!.writeContract({
    address: escrow,
    abi: leagueEscrowAbi,
    functionName: "openRound",
    args: [BigInt(entryClose), BigInt(end), stake, Number(opt("cap", "100")), Number(opt("max-backers", "20"))],
    account: account!,
    chain,
  });
  await pub.waitForTransactionReceipt({ hash });
  const id = await pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "roundCount" });
  log(`opened round ${id}: entries close ${new Date(entryClose * 1000).toISOString()}, ends ${new Date(end * 1000).toISOString()} (tx ${hash})`);
}

async function sample(roundId: bigint, phase: Phase, source: PriceSource) {
  // Local demo chain: stamped with chain time (anvil's clock can be moved
  // forward to end a round early).
  const at = leagueChain() === "local" ? Number((await clientsFromEnv().pub.getBlock()).timestamp) * 1000 : Date.now();
  const s = await samplePrices(source, at);
  const stale = [...s.values()].filter((p) => !p.trading).length;
  const file = store.saveSample(roundId, phase, s, at);
  log(`saved ${phase} sample from ${source} (${s.size} tokens${stale ? `, ${stale} not live` : ""}) → ${file}`);
}

async function settle(roundId: bigint) {
  const windowMs = Number(opt("window-min", "30")) * 60_000;
  const minSamples = Number(opt("min-samples", "3"));
  const dry = flag("dry-run");
  const { pub, wallet, account, chain } = clientsFromEnv(!dry);
  const escrow = escrowFromEnv();

  const info = await readRound(pub, escrow, roundId);
  if (info.status !== "Open") throw new Error(`round ${roundId} is ${info.status}`);
  const chainNow = Number((await pub.getBlock()).timestamp); // the contract goes by chain time
  if (!dry && chainNow < info.end) throw new Error("round has not ended yet");
  const entries = await readEntries(pub, escrow, roundId);
  const tokens = roundTokens(entries);
  const inWindow = (phase: Phase, from: number) =>
    store
      .loadSamples(roundId, phase)
      .filter((s) => s.at >= from && s.at <= from + windowMs)
      .map((s) => s.sample);
  const startSamples = inWindow("start", info.entryClose * 1000);
  const endSamples = inWindow("end", info.end * 1000);
  const start = buildSnapshot(startSamples, tokens, minSamples);
  const end = buildSnapshot(endSamples, tokens, minSamples);
  const problems = [...start.problems, ...end.problems].map((p) => `${p.token}:${p.reason}`);
  const seasonPot = (await pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "seasonPot" })) as bigint;

  const s = settleRound({
    roundId,
    stake: info.stake,
    capMultiple: info.capMultiple,
    maxBackers: info.maxBackers,
    seasonPot,
    entries,
    start: start.prices,
    end: end.prices,
    priceProblems: problems,
  });
  const decimals = await pub.readContract({ address: await pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "stakeToken" }), abi: erc20Abi, functionName: "decimals" });
  const fmt = (x: bigint) => formatUnits(x, decimals);
  const file = store.saveInputs(roundId, s.inputs);
  log(`round ${roundId}: ${entries.length} entries, ${s.teams.length} teams, void=${s.void ?? "no"}`);
  if (s.average !== null) log(`  AVERAGE ${(Number(s.average) / 1e10).toFixed(3)}%`);
  for (const t of s.teams) log(`  ${t.isWinner ? "WIN " : t.isDraw ? "DRAW" : "    "} ${t.captain} ${(Number(t.ret) / 1e10).toFixed(3)}% (${t.members} on team)`);
  log(`  platform ${fmt(s.platformCut)}, season in ${fmt(s.seasonIn)}, season out ${fmt(s.seasonOut)}`);
  if (problems.length) log(`  price problems: ${problems.join(", ")}`);
  log(`  inputs → ${file} (hash ${s.inputsHash})`);
  if (dry) return log("dry run: nothing sent");
  const hash = await submitSettlement(pub, wallet!, escrow, roundId, s, account!, chain);
  log(`settled round ${roundId} (tx ${hash})`);
}

async function auto(roundId: bigint) {
  const source = sourceOpt();
  const n = Number(opt("samples", "3"));
  const every = Number(opt("every-min", "5")) * 60_000;
  const { pub } = clientsFromEnv();
  const info = await readRound(pub, escrow(), roundId);
  for (const [phase, at] of [
    ["start", info.entryClose * 1000],
    ["end", info.end * 1000],
  ] as const) {
    const wait = at - Date.now();
    if (wait > 0) {
      log(`waiting ${Math.round(wait / 60000)} min for ${phase}…`);
      await sleep(wait + 5_000);
    }
    for (let i = 0; i < n; i++) {
      await sample(roundId, phase, source);
      if (i < n - 1) await sleep(every);
    }
  }
  await settle(roundId);
}
const escrow = escrowFromEnv;

async function status(roundId: bigint) {
  const { pub } = clientsFromEnv();
  const info = await readRound(pub, escrowFromEnv(), roundId);
  const entries = await readEntries(pub, escrowFromEnv(), roundId);
  log(`round ${roundId}: ${info.status}, ${entries.length} entries, stake ${info.stake} (base units)`);
  log(`  entries close ${new Date(info.entryClose * 1000).toISOString()}, ends ${new Date(info.end * 1000).toISOString()}`);
  log(`  samples: start ${store.loadSamples(roundId, "start").length}, end ${store.loadSamples(roundId, "end").length}`);
}

const sourceOpt = (): PriceSource => {
  const s = opt("source");
  return s === "chainlink" || s === "robinhood" ? s : priceSourceFromEnv();
};

const id = () => {
  if (!args[1]) throw new Error("round id required");
  return BigInt(args[1]);
};

try {
  if (cmd === "open") await open();
  else if (cmd === "sample") await sample(id(), args[2] as Phase, sourceOpt());
  else if (cmd === "settle") await settle(id());
  else if (cmd === "auto") await auto(id());
  else if (cmd === "status") await status(id());
  else console.log("usage: keeper.mts open|sample|settle|auto|status (see the header of this file)");
} catch (e) {
  console.error(`error: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}
