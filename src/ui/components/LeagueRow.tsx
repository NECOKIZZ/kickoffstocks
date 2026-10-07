// One ETF in the league table: rank, hand, name + creator, return, team,
// odds, Back. The table draws MEDIAN (the middle return) as a ghost line:
// above it wins, on it draws (ticket back), below it loses.

import Link from "next/link";
import { EtfChips, type Holding } from "./EtfHand";
import { Change } from "./Pills";
import { WalletAvatar, shortAddress } from "../brand/Avatar";

export interface LeagueEntry {
  rank: number;
  name: string;
  /** The creator's wallet: their identity (avatar + short address). */
  creator: string;
  /** The creator plays through an AI agent (avatar badge). */
  creatorIsAgent?: boolean;
  holdings: Holding[];
  returnPct: number;
  team: number;
  /** Profit per $5 ticket if the round ended now (null: this ETF is losing now). */
  ifWins: number | null;
  /** Right now: above MEDIAN, tied with it, or below. */
  status?: "win" | "draw" | "lose";
  href?: string;
}

export function LeagueRow({ e, winning }: { e: LeagueEntry; winning: boolean }) {
  const Row = e.href ? Link : "div";
  const status = e.status ?? (winning ? "win" : "lose");
  const tint = status === "win" ? "bg-up-bg/60" : status === "draw" ? "bg-brand-purple/10" : "";
  return (
    <Row href={e.href ?? ""} className={`card-diagonal-sm grid grid-cols-[28px_auto_1fr_auto] items-center gap-4 px-4 py-3 transition hover:bg-surface-2 md:grid-cols-[32px_auto_1fr_110px_90px_140px_auto] md:gap-6 ${tint}`}>
      <span className="t-num text-[15px] text-muted">{e.rank}</span>
      <EtfChips holdings={e.holdings} />
      <div className="min-w-0">
        <div className="truncate font-clash font-semibold">{e.name}</div>
        <div className="mt-0.5 flex items-center gap-1.5 truncate text-[12.5px] text-muted">
          <WalletAvatar address={e.creator} size={16} agent={e.creatorIsAgent} />
          <span className="t-num">{shortAddress(e.creator)}</span>
        </div>
      </div>
      <Change pct={e.returnPct} className="text-[17px] font-medium md:justify-self-end" />
      <span className="hidden text-[13px] text-muted md:block">
        <span className="t-num text-ink">{e.team}</span> on team
      </span>
      <span className="hidden text-[13px] text-muted md:block">
        {e.ifWins !== null ? (
          <>
            ticket now <span className="t-num text-ink">+${e.ifWins.toFixed(2)}</span>
          </>
        ) : status === "draw" ? (
          <span className="text-brand-purple">on MEDIAN: ticket back</span>
        ) : (
          "below MEDIAN"
        )}
      </span>
      <span className="btn-3d btn-ghost hidden h-8 px-4 text-[13px] md:inline-flex md:items-center">Back</span>
    </Row>
  );
}

/** `cutAfter`: rows above MEDIAN (default: half); `medianPct`: MEDIAN's return, when known. */
export function LeagueTable({ entries, cutAfter, medianPct }: { entries: LeagueEntry[]; cutAfter?: number; medianPct?: number | null }) {
  const cut = cutAfter ?? Math.floor(entries.length / 2);
  return (
    <div className="flex flex-col gap-1">
      {entries.map((e, i) => (
        <div key={e.rank}>
          <LeagueRow e={e} winning={i < cut} />
          {i === cut - 1 && (
            <div className="my-2 flex items-center gap-3 px-4 font-clash text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
              <span className="h-px flex-1 border-t-2 border-dashed border-accent/60" />
              MEDIAN{medianPct !== undefined && medianPct !== null ? ` ${medianPct >= 0 ? "+" : ""}${medianPct.toFixed(2)}%` : ""} · beat it to win
              <span className="h-px flex-1 border-t-2 border-dashed border-accent/60" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
