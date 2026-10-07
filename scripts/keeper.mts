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
//   park   <roundId>   Puts the round's tickets in the savings vault (after entries close).
//   unpark <roundId>   Brings them back; the interest goes into the pot.
//   auto   <roundId> [--samples 3] [--every-min 5] [--source …] [--no-park]
//          Waits for the round, samples at start (then parks the tickets if a
//          savings vault is set), samples at the end, unparks and settles.
//   status <roundId>
//   watch  [--samples 3] [--every-min 5] [--source …] [--no-schedule]
//          Runs forever next to the app: opens each week's round (entries close
//          Monday 9:30am New York, ends Friday 4pm) and runs `auto` on it.
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
import { leagueStore, type Phase } from "../src/league/store";
import { nextWeeklyRound } from "../src/league/schedule";
import { cryptoTokens } from "../src/league/registry";
import { priceSourceFromEnv, samplePrices, type PriceSource } from "../src/league/prices";

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (name: string, def?: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const flag = (name: string) => args.includes(`--${name}`);
const store = leagueStore();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function open(times?: { entryClose: number; end: number }) {
  const { pub, wallet, account, chain } = clientsFromEnv(true);
  const escrow = escrowFromEnv();
  const now = Math.floor(Date.now() / 1000);
  const entryClose = times?.entryClose ?? now + Number(opt("entry-min", "60")) * 60;
  const end = times?.end ?? entryClose + Number(opt("run-min", "60")) * 60;
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
  const file = await store.saveSample(roundId, phase, s, at);
  log(`saved ${phase} sample from ${source} (${s.size} tokens${stale ? `, ${stale} not live` : ""}) → ${file}`);
}

async function settle(roundId: bigint) {
  const windowMs = Number(opt("window-min", "30")) * 60_000;
  const minSamples = Number(opt("min-samples", "3"));
  const dry = flag("dry-run");
  const { pub, wallet, account, chain } = clientsFromEnv(!dry);
  const escrow = escrowFromEnv();

  let info = await readRound(pub, escrow, roundId);
  if (info.status !== "Open") throw new Error(`round ${roundId} is ${info.status}`);
  if (info.parked && !dry) {
    await unpark(roundId);
    info = await readRound(pub, escrow, roundId);
  }
  const chainNow = Number((await pub.getBlock()).timestamp); // the contract goes by chain time
  if (!dry && chainNow < info.end) throw new Error("round has not ended yet");
  const entries = await readEntries(pub, escrow, roundId);
  const tokens = roundTokens(entries);
  const inWindow = async (phase: Phase, from: number) =>
    (await store.loadSamples(roundId, phase))
      .filter((s) => s.at >= from && s.at <= from + windowMs)
      .map((s) => s.sample);
  const startSamples = await inWindow("start", info.entryClose * 1000);
  const endSamples = await inWindow("end", info.end * 1000);
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
    bonus: info.yield,
    cryptoTokens: cryptoTokens(),
  });
  const decimals = await pub.readContract({ address: await pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "stakeToken" }), abi: erc20Abi, functionName: "decimals" });
  const fmt = (x: bigint) => formatUnits(x, decimals);
  const file = await store.saveInputs(roundId, s.inputs);
  log(`round ${roundId}: ${entries.length} entries, ${s.teams.length} teams, void=${s.void ?? "no"}`);
  if (info.yield > 0n) log(`  ticket interest in the pot: ${fmt(info.yield)}`);
  if (s.median !== null) log(`  MEDIAN ${(Number(s.median) / 1e10).toFixed(3)}%`);
  for (const t of s.teams) log(`  ${t.isWinner ? "WIN " : t.isDraw ? "DRAW" : "    "} ${t.captain} ${(Number(t.ret) / 1e10).toFixed(3)}% (${t.members} on team)`);
  log(`  platform ${fmt(s.platformCut)}, season in ${fmt(s.seasonIn)}, season out ${fmt(s.seasonOut)}`);
  if (problems.length) log(`  price problems: ${problems.join(", ")}`);
  log(`  inputs → ${file} (hash ${s.inputsHash})`);
  if (dry) return log("dry run: nothing sent");
  const hash = await submitSettlement(pub, wallet!, escrow, roundId, s, account!, chain);
  log(`settled round ${roundId} (tx ${hash})`);
}

async function tx(functionName: "parkTickets" | "unparkTickets", roundId: bigint) {
  const { pub, wallet, account, chain } = clientsFromEnv(true);
  const hash = await wallet!.writeContract({ address: escrowFromEnv(), abi: leagueEscrowAbi, functionName, args: [roundId], account: account!, chain });
  const r = await pub.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error(`${functionName} reverted: ${hash}`);
  return hash;
}

async function park(roundId: bigint) {
  const { pub } = clientsFromEnv();
  const vault = await pub.readContract({ address: escrowFromEnv(), abi: leagueEscrowAbi, functionName: "yieldVault" });
  if (/^0x0+$/.test(vault)) return log("no savings vault set: tickets stay in the escrow");
  log(`parked round ${roundId}'s tickets in ${vault} (tx ${await tx("parkTickets", roundId)})`);
}

async function unpark(roundId: bigint) {
  const hash = await tx("unparkTickets", roundId);
  const info = await readRound(clientsFromEnv().pub, escrowFromEnv(), roundId);
  log(`unparked round ${roundId}: interest ${info.yield} (base units) goes into the pot (tx ${hash})`);
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
    // Resumable: samples already saved for this phase (before a restart) count.
    const have = (await store.loadSamples(roundId, phase)).length;
    for (let i = have; i < n; i++) {
      await sample(roundId, phase, source);
      if (i < n - 1) await sleep(every);
    }
    if (phase === "start" && !info.parked && !flag("no-park")) await park(roundId).catch((e) => log(`park skipped: ${e instanceof Error ? e.message : e}`));
  }
  await settle(roundId);
}

// Runs next to the app (e.g. on Render) and runs the weekly league by itself:
// when there's no open round it opens the next one (entries close Monday
// 9:30am New York, it ends Friday 4pm), then runs `auto` on it: samples at
// the open, parks the tickets, samples at the close, settles, and so on every
// week. LEAGUE_SCHEDULE=off (or --no-schedule) only runs rounds opened by hand.
// On a host that sleeps when idle (Render's free tier), it also pings the
// app's public URL so the instance stays up.
async function watch() {
  const pingUrl = process.env.KEEPER_PING_URL ?? process.env.RENDER_EXTERNAL_URL;
  if (pingUrl) {
    const ping = () => fetch(`${pingUrl}/api/rounds/current`).catch(() => {});
    setInterval(ping, 10 * 60_000);
    log(`pinging ${pingUrl} every 10 min to stay awake`);
  }
  const weekly = !flag("no-schedule") && process.env.LEAGUE_SCHEDULE !== "off";
  let lastOpened = 0;
  log(`watching for rounds${weekly ? " (weekly schedule on)" : ""}: data in ${process.env.DATABASE_URL ? "Postgres" : `files (${process.env.LEAGUE_DATA_DIR ?? "data"}/, lost on redeploy without a disk)`}, prices from ${priceSourceFromEnv()}…`);
  // Check the store now, not at Monday's open.
  try {
    await store.loadSamples(0n, "start");
    log("store: OK");
  } catch (e) {
    log(`store: NOT REACHABLE (${e instanceof Error ? e.message : String(e)}): price samples can't be saved, fix DATABASE_URL`);
  }
  for (;;) {
    let wait = 60_000;
    try {
      const { pub } = clientsFromEnv();
      const latest = (await pub.readContract({ address: escrow(), abi: leagueEscrowAbi, functionName: "roundCount" })) as bigint;
      const info = latest > 0n ? await readRound(pub, escrow(), latest) : null;
      if (info?.status === "Open") {
        log(`round ${latest}: running auto`);
        await auto(latest);
      } else if (weekly && Date.now() - lastOpened > 15 * 60_000) {
        // (the 15-minute guard covers an RPC that hasn't caught up with the last open yet)
        const r = nextWeeklyRound(Date.now());
        await open({ entryClose: r.entryClose / 1000, end: r.end / 1000 });
        lastOpened = Date.now();
      }
    } catch (e) {
      log(`watch: ${e instanceof Error ? e.message : String(e)} (retrying in 10 min)`);
      wait = 10 * 60_000;
    }
    await sleep(wait);
  }
}
const escrow = escrowFromEnv;

async function status(roundId: bigint) {
  const { pub } = clientsFromEnv();
  const info = await readRound(pub, escrowFromEnv(), roundId);
  const entries = await readEntries(pub, escrowFromEnv(), roundId);
  log(`round ${roundId}: ${info.status}, ${entries.length} entries, stake ${info.stake} (base units)`);
  log(`  entries close ${new Date(info.entryClose * 1000).toISOString()}, ends ${new Date(info.end * 1000).toISOString()}`);
  if (info.parked || info.yield > 0n) log(`  tickets ${info.parked ? "parked in the savings vault" : "back"}; interest so far ${info.yield}`);
  log(`  samples: start ${(await store.loadSamples(roundId, "start")).length}, end ${(await store.loadSamples(roundId, "end")).length}`);
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
  else if (cmd === "park") await park(id());
  else if (cmd === "unpark") await unpark(id());
  else if (cmd === "status") await status(id());
  else if (cmd === "watch") await watch();
  else console.log("usage: keeper.mts open|sample|settle|park|unpark|auto|status|watch (see the header of this file)");
} catch (e) {
  console.error(`error: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}
process.exit(0); // don't wait for idle database connections to close
