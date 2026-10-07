// Keeper data: price samples, published settlement inputs and the wallets
// that played through an agent. BigInts are saved as strings.
//
//   DATABASE_URL set  → Postgres (e.g. Supabase), one small key/value table,
//                       so a weekly round survives restarts and redeploys.
//   otherwise         → JSON files under LEAGUE_DATA_DIR (default data/):
//                       rounds/<id>/<phase>/<at>.json, rounds/<id>/inputs.json.
// Phases: start and end (scoring), track (the hourly chart samples).

import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import type { PriceSample } from "./snapshot";

/** start / end: the scoring windows. track: hourly samples while the round
 *  runs, for the ETF page's chart only (never used to score). */
export type Phase = "start" | "end" | "track";
export type SavedSample = { at: number; sample: Map<string, PriceSample> };
type Row = Omit<PriceSample, "value"> & { value: string };

export interface Store {
  saveSample(roundId: bigint, phase: Phase, sample: Map<string, PriceSample>, at: number): Promise<string>;
  loadSamples(roundId: bigint, phase: Phase): Promise<SavedSample[]>;
  saveInputs(roundId: bigint, inputs: unknown): Promise<string>;
  loadInputs(roundId: bigint): Promise<unknown | null>;
  agentWallets(): Promise<string[]>;
  addAgentWallet(wallet: string): Promise<void>;
}

const replacer = (_: string, v: unknown) => (typeof v === "bigint" ? v.toString() : v);
const plain = (x: unknown) => JSON.parse(JSON.stringify(x, replacer));
const toSample = (rows: Row[]) => new Map(rows.map((r) => [r.token, { ...r, value: BigInt(r.value) }]));

export class FileStore implements Store {
  constructor(private root = process.env.LEAGUE_DATA_DIR ?? "data") {}

  private dir(roundId: bigint, ...parts: string[]) {
    const d = join(this.root, "rounds", roundId.toString(), ...parts);
    mkdirSync(d, { recursive: true });
    return d;
  }

  async saveSample(roundId: bigint, phase: Phase, sample: Map<string, PriceSample>, at: number) {
    const file = join(this.dir(roundId, phase), `${at}.json`);
    writeFileSync(file, JSON.stringify([...sample.values()], replacer));
    return file;
  }

  async loadSamples(roundId: bigint, phase: Phase) {
    const d = this.dir(roundId, phase);
    return readdirSync(d)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .map((f) => ({ at: Number(f.replace(".json", "")), sample: toSample(JSON.parse(readFileSync(join(d, f), "utf8")) as Row[]) }));
  }

  async saveInputs(roundId: bigint, inputs: unknown) {
    const file = join(this.dir(roundId), "inputs.json");
    writeFileSync(file, JSON.stringify(inputs, replacer, 2));
    return file;
  }

  async loadInputs(roundId: bigint) {
    const file = join(this.dir(roundId), "inputs.json");
    return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
  }

  private agentsFile() {
    return join(this.root, "agent-wallets.json");
  }

  async agentWallets() {
    try {
      return existsSync(this.agentsFile()) ? (JSON.parse(readFileSync(this.agentsFile(), "utf8")) as string[]) : [];
    } catch {
      return [];
    }
  }

  async addAgentWallet(wallet: string) {
    const all = await this.agentWallets();
    if (all.includes(wallet)) return;
    mkdirSync(this.root, { recursive: true });
    writeFileSync(this.agentsFile(), JSON.stringify([...all, wallet]));
  }
}

const TABLE = "kickoff_stocks_kv";

export class PgStore implements Store {
  private ready: Promise<unknown> | null = null;
  constructor(private sql: postgres.Sql) {}

  // Creates the table on first use; a failed attempt is retried next time.
  private table() {
    this.ready ??= this.sql`create table if not exists ${this.sql(TABLE)} (k text primary key, v jsonb not null, at timestamptz not null default now())`.catch((e) => {
      this.ready = null;
      throw e;
    });
    return this.ready;
  }

  private async put(k: string, v: unknown) {
    await this.table();
    await this.sql`insert into ${this.sql(TABLE)} (k, v) values (${k}, ${this.sql.json(plain(v))}) on conflict (k) do update set v = excluded.v, at = now()`;
  }

  private async list(prefix: string): Promise<{ k: string; v: unknown }[]> {
    await this.table();
    return this.sql<{ k: string; v: unknown }[]>`select k, v from ${this.sql(TABLE)} where k like ${prefix + "%"} order by k`;
  }

  // Sample keys end in a 13-digit ms timestamp, so they sort by time.
  async saveSample(roundId: bigint, phase: Phase, sample: Map<string, PriceSample>, at: number) {
    const k = `rounds/${roundId}/${phase}/${at}`;
    await this.put(k, [...sample.values()]);
    return `db:${k}`;
  }

  async loadSamples(roundId: bigint, phase: Phase) {
    const rows = await this.list(`rounds/${roundId}/${phase}/`);
    return rows.map((r) => ({ at: Number(r.k.split("/").pop()), sample: toSample(r.v as Row[]) }));
  }

  async saveInputs(roundId: bigint, inputs: unknown) {
    const k = `rounds/${roundId}/inputs`;
    await this.put(k, inputs);
    return `db:${k}`;
  }

  async loadInputs(roundId: bigint) {
    const rows = await this.list(`rounds/${roundId}/inputs`);
    return rows[0]?.v ?? null;
  }

  async agentWallets() {
    return (await this.list("agents/")).map((r) => r.k.slice("agents/".length));
  }

  async addAgentWallet(wallet: string) {
    await this.put(`agents/${wallet}`, true);
  }
}

let shared: Store | null = null;

/** The league's store: Postgres when DATABASE_URL is set, files otherwise. */
export function leagueStore(): Store {
  if (shared) return shared;
  const url = process.env.DATABASE_URL;
  // prepare: false works through Supabase's transaction pooler too.
  shared = url ? new PgStore(postgres(url, { max: 3, prepare: false, idle_timeout: 20, connect_timeout: 10, onnotice: () => {} })) : new FileStore();
  return shared;
}
