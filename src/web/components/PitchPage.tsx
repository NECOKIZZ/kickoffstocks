"use client";

// The investor pitch (/pitch): a deck of 16:9 slides on one page, black and
// white, with drawn infographics only. Styles live in app/pitch/pitch.css.
// "Download PDF" serves public/pitch/Profit-Markets-Pitch.pdf, printed from
// this page by scripts/pitch-pdf.mjs; regenerate it after editing a slide.
//
// Market and "why now" figures are sourced on each slide. Revenue at scale is
// an illustrative model and the SOM is a target, both labelled as such.
// Traction lists what is built, never testnet volume.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProfitMark } from "../../ui/brand/ProfitMark";

const SITE = "kickoff-stocks.onrender.com";
const PDF = "/pitch/Profit-Markets-Pitch.pdf";
const DATE = "October 2026";

type Tone = "dark" | "light" | "cover";
const cols = (n: number, sm = 1) => ({ "--n": n, "--n-sm": sm }) as React.CSSProperties;

function Slide({ n, tone = "dark", sources, notes, label, children }: { n: number; tone?: Tone; sources?: string; notes?: string[]; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="pd-frame">
        <section aria-label={label} className={`pd-slide ${tone === "light" ? "pd-light" : tone === "cover" ? "pd-cover" : ""}`}>
          {children}
          {tone !== "cover" && (
            <div className="pd-foot">
              <span className="pd-foot-src">{sources ? `Sources: ${sources}` : ""}</span>
              <span className="pd-num">{n}</span>
            </div>
          )}
        </section>
      </div>
      {notes && (
        <div className="pd-notes">
          {notes.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      )}
    </div>
  );
}

const Eyebrow = ({ children }: { children: React.ReactNode }) => <p className="pd-eyebrow">{children}</p>;
const H1 = ({ children }: { children: React.ReactNode }) => <h2 className="pd-h1">{children}</h2>;

function Checks({ items }: { items: string[] }) {
  return (
    <ul className="pd-checks">
      {items.map((i) => (
        <li key={i}>
          <span className="pd-check" aria-hidden="true">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8.5l3 3 7-7" />
            </svg>
          </span>
          <span>{i}</span>
        </li>
      ))}
    </ul>
  );
}

function Ruled({ title, step, children }: { title: React.ReactNode; step?: string; children: React.ReactNode }) {
  return (
    <div className="pd-ruled">
      {step && (
        <div className="pd-step" style={{ marginBottom: "0.6cqw" }}>
          {step}
        </div>
      )}
      <div className="pd-title">{title}</div>
      <p className="pd-body">{children}</p>
    </div>
  );
}

function Stat({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <div className="pd-ruled">
      <div className="pd-stat pd-num">{value}</div>
      <p className="pd-body">{children}</p>
    </div>
  );
}

function Card({ title, step, inverse, children }: { title: React.ReactNode; step?: string; inverse?: boolean; children: React.ReactNode }) {
  return (
    <div className={`pd-card ${inverse ? "pd-inverse" : ""}`}>
      {step && (
        <div className="pd-step" style={{ marginBottom: "0.8cqw" }}>
          {step}
        </div>
      )}
      <div className="pd-title">{title}</div>
      <p className="pd-body">{children}</p>
    </div>
  );
}

/* ---------- Infographics ---------- */

/** Tokenized stocks on-chain, three readings (rwa.xyz). */
function TokenizedChart() {
  const bars = [
    { v: 0.424, label: "$424M", when: "Mid 2025" },
    { v: 0.96, label: "$960M", when: "Mar 2026" },
    { v: 3.0, label: "$3B", when: "Aug 2026" },
  ];
  const base = 200;
  const h = (v: number) => (v / 3) * 140;
  return (
    <svg className="pd-svg" viewBox="0 0 420 228" role="img" aria-label="Tokenized stocks on-chain: $424M in mid 2025, $960M in March 2026, $3B in August 2026">
      <text x="0" y="14" className="pd-faint" fontSize="12" fontWeight="600" letterSpacing="1.6">
        TOKENIZED STOCKS ON-CHAIN
      </text>
      <line x1="0" x2="420" y1={base} y2={base} className="pd-stroke" strokeWidth="1" />
      {bars.map((b, i) => {
        const x = 20 + i * 140;
        const last = i === bars.length - 1;
        return (
          <g key={b.when}>
            <rect x={x} y={base - h(b.v)} width="100" height={h(b.v)} rx="4" className={last ? "pd-ink" : "pd-tint"} />
            <text x={x + 50} y={base - h(b.v) - 10} textAnchor="middle" fontSize="20" fontWeight={last ? 500 : 400} className={last ? "pd-ink" : "pd-sub"}>
              {b.label}
            </text>
            <text x={x + 50} y={base + 22} textAnchor="middle" fontSize="13" className="pd-faint">
              {b.when}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** A week: entries close at Monday's open, the round ends at Friday's close. */
function RoundTimeline() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const x0 = 170;
  const x1 = 840;
  return (
    <svg className="pd-svg" viewBox="0 0 1000 150" role="img" aria-label="A round: build and back until Monday 9:30am ET, locked and scored until Friday 4pm ET, then settled and the next round opens">
      {days.map((d, i) => {
        const x = x0 + (i * (x1 - x0)) / 4;
        return (
          <g key={d}>
            <line x1={x} x2={x} y1="36" y2="60" className="pd-stroke" strokeWidth="1" />
            <text x={x} y="24" textAnchor="middle" fontSize="15" className="pd-faint">
              {d}
            </text>
          </g>
        );
      })}
      <rect x="0" y="44" width={x0} height="8" rx="4" className="pd-tint" />
      <rect x={x0} y="44" width={x1 - x0} height="8" className="pd-ink" />
      <rect x={x1} y="44" width={1000 - x1} height="8" rx="4" className="pd-acc" />
      <circle cx={x0} cy="48" r="9" className="pd-ink" />
      <circle cx={x1} cy="48" r="9" className="pd-ink" />

      <text x="0" y="92" fontSize="16" fontWeight="500" className="pd-ink">
        Build and back
      </text>
      <text x="0" y="114" fontSize="14" className="pd-sub">
        The week before,
      </text>
      <text x="0" y="134" fontSize="14" className="pd-sub">
        $5 tickets in USDG.
      </text>

      <text x={x0 + 22} y="92" fontSize="16" fontWeight="500" className="pd-ink">
        Mon 9:30am ET · baskets lock
      </text>
      <text x={x0 + 22} y="114" fontSize="14" className="pd-sub">
        Scored on Robinhood Chain’s Chainlink prices.
      </text>
      <text x={x0 + 22} y="134" fontSize="14" className="pd-sub">
        Tickets earn interest in a USDG vault.
      </text>

      <text x="1000" y="92" textAnchor="end" fontSize="16" fontWeight="500" className="pd-ink">
        Fri 4pm ET · ends
      </text>
      <text x="1000" y="114" textAnchor="end" fontSize="14" className="pd-sub">
        Settled and paid.
      </text>
      <text x="1000" y="134" textAnchor="end" fontSize="14" className="pd-sub">
        Next round opens.
      </text>
    </svg>
  );
}

/** Where a losing ticket goes. */
function PotSplit() {
  return (
    <svg className="pd-svg" viewBox="0 0 1000 104" role="img" aria-label="Losing tickets: 90% to ETFs above MEDIAN, 5% platform, 5% season pot">
      <text x="0" y="14" className="pd-faint" fontSize="12" fontWeight="600" letterSpacing="1.6">
        WHERE A LOSING TICKET GOES
      </text>
      <rect x="0" y="28" width="896" height="40" rx="6" className="pd-ink" />
      <rect x="900" y="28" width="48" height="40" className="pd-acc" />
      <rect x="952" y="28" width="48" height="40" rx="6" className="pd-faint" />
      <text x="20" y="54" fontSize="16" fontWeight="500" className="pd-on-ink">
        90% to ETFs above MEDIAN, split by stake × accuracy, plus all ticket interest
      </text>
      <text x="0" y="96" fontSize="14" className="pd-sub">
        Creators take 10% of their backers’ winnings.
      </text>
      <text x="1000" y="96" textAnchor="end" fontSize="14" className="pd-sub">
        <tspan className="pd-acc" fontWeight="600">
          5% platform
        </tspan>{" "}
        · 5% season pot
      </text>
    </svg>
  );
}

/** Seven ETFs on one line; MEDIAN splits winners from losers. Illustrative. */
function MedianPlot({ compact = false }: { compact?: boolean }) {
  const rets = [-3.1, -1.4, -0.2, 0.6, 1.8, 2.9, 4.4];
  const med = 0.6;
  const x = (v: number) => 40 + ((v + 4) / 9) * 920;
  if (compact) {
    const cx = (v: number) => 14 + ((v + 4) / 9) * 332;
    return (
      <svg className="pd-svg" viewBox="0 0 360 96" role="img" aria-label="Seven ETFs by weekly return; MEDIAN at +0.6%">
        <rect x={cx(med)} y="20" width={346 - cx(med)} height="52" rx="4" className="pd-tint" />
        <line x1="14" x2="346" y1="46" y2="46" className="pd-stroke" strokeWidth="1.5" />
        <line x1={cx(med)} x2={cx(med)} y1="6" y2="78" className="pd-stroke-acc" strokeWidth="2" strokeDasharray="4 3" />
        <text x={cx(med) + 6} y="13" fontSize="11" fontWeight="600" letterSpacing="1" className="pd-acc">
          MEDIAN +0.6%
        </text>
        {rets.map((r) => (
          <circle
            key={r}
            cx={cx(r)}
            cy="46"
            r="7"
            className={r === med ? "pd-acc" : r > med ? "pd-ink" : undefined}
            fill={r < med ? "none" : undefined}
            stroke={r < med ? "currentColor" : undefined}
            strokeWidth="2"
            opacity={r < med ? 0.45 : 1}
          />
        ))}
        {[-4, 0, 4].map((g) => (
          <text key={g} x={cx(g)} y="94" textAnchor="middle" fontSize="11" className="pd-faint">
            {g > 0 ? `+${g}%` : `${g}%`}
          </text>
        ))}
      </svg>
    );
  }
  return (
    <svg className="pd-svg" viewBox="0 0 1000 186" role="img" aria-label="Seven ETFs by weekly return; MEDIAN at +0.6%. Three below lose their ticket, one on MEDIAN draws, three above win">
      <rect x={x(med)} y="22" width={960 - x(med)} height="96" rx="4" className="pd-tint" />
      <line x1="40" x2="960" y1="70" y2="70" className="pd-stroke" strokeWidth="2" />
      {[-4, -2, 0, 2, 4].map((g) => (
        <text key={g} x={x(g)} y="142" textAnchor="middle" fontSize="13" className="pd-faint">
          {g > 0 ? `+${g}%` : `${g}%`}
        </text>
      ))}
      <line x1={x(med)} x2={x(med)} y1="8" y2="124" className="pd-stroke-acc" strokeWidth="2.5" strokeDasharray="6 5" />
      <text x={x(med) + 10} y="14" fontSize="13" fontWeight="600" letterSpacing="1.4" className="pd-acc">
        MEDIAN +0.6%
      </text>
      {rets.map((r) =>
        r < med ? (
          <circle key={r} cx={x(r)} cy="70" r="11" fill="none" className="pd-stroke-ink" strokeWidth="2.5" opacity="0.45" />
        ) : r === med ? (
          <circle key={r} cx={x(r)} cy="70" r="11" className="pd-acc" />
        ) : (
          <circle key={r} cx={x(r)} cy="70" r="11" className="pd-ink" />
        ),
      )}
      <text x="40" y="178" fontSize="15" className="pd-sub">
        Below MEDIAN: the ticket goes to the pot
      </text>
      <text x="960" y="178" textAnchor="end" fontSize="15" fontWeight="500" className="pd-ink">
        Above: a share of the pot, more for a bigger lead
      </text>
    </svg>
  );
}

/** TAM / SAM / SOM, nested. */
function MarketCircles() {
  return (
    <svg className="pd-svg pd-circles" viewBox="0 0 400 400" role="img" aria-label="TAM contains SAM, which contains SOM">
      <circle cx="200" cy="200" r="196" fill="none" className="pd-stroke-ink" strokeWidth="1.5" opacity="0.35" />
      <circle cx="200" cy="262" r="134" className="pd-tint" />
      <circle cx="200" cy="262" r="134" fill="none" className="pd-stroke-ink" strokeWidth="1.5" opacity="0.5" />
      <circle cx="200" cy="336" r="58" className="pd-ink" />
      <text x="200" y="64" textAnchor="middle" fontSize="20" fontWeight="600" letterSpacing="2" className="pd-sub">
        TAM
      </text>
      <text x="200" y="172" textAnchor="middle" fontSize="20" fontWeight="600" letterSpacing="2" className="pd-sub">
        SAM
      </text>
      <text x="200" y="343" textAnchor="middle" fontSize="20" fontWeight="600" letterSpacing="2" className="pd-on-ink">
        SOM
      </text>
    </svg>
  );
}

/* ---------- The deck ---------- */

export function PitchPage() {
  const [notes, setNotes] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "n" && !e.metaKey && !e.ctrlKey) setNotes((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  let n = 0;
  const next = () => ++n;
  const b = (s: string) => (
    <b className="pd-num" style={{ color: "var(--strong)", fontWeight: 500 }}>
      {s}
    </b>
  );

  return (
    <div className="pd-page">
      <header className="pd-bar">
        <Link href="/" className="pd-bar-title" aria-label="Profit Markets home">
          <ProfitMark tone="white" size={18} compact />
          <span>Pitch</span>
        </Link>
        <button type="button" className="pd-btn" aria-pressed={notes} onClick={() => setNotes(!notes)}>
          Details (N)
        </button>
        <a className="pd-btn pd-btn-primary" href={PDF} download>
          Download PDF
        </a>
        <Link className="pd-btn pd-bar-link" href="/">
          {SITE}
        </Link>
      </header>

      <main className="pd-deck" data-notes={notes ? "on" : "off"}>
        <Slide
          n={next()}
          tone="cover"
          label="Cover"
          notes={[
            "Profit Markets is Kickoff’s second product on Robinhood Chain. Anyone can build an ETF from real Robinhood Stock Tokens, enter it in a weekly round, and win if it beats the median of every ETF in the round.",
            "“ETF” here means an on-chain basket of tokenized stocks, not a regulated fund. Capital is at risk, and Robinhood Stock Tokens are not available in restricted regions, including the US.",
          ]}
        >
          <div className="flex items-center justify-between">
            <ProfitMark tone="white" size={30} />
            <span className="pd-small">{DATE}</span>
          </div>
          <div className="pd-spacer" />
          <h1 className="pd-cover-h1">
            Gamified ETFs
            <br />
            on Robinhood Chain.
          </h1>
          <p className="pd-lede">Build an ETF from real stocks, lock it for the week, and beat the median to get paid on Friday.</p>
          <div className="pd-spacer" />
          <div className="flex items-end justify-between gap-6">
            <span className="pd-small">Live on Robinhood Chain testnet</span>
            <span className="pd-small">{SITE}</span>
          </div>
        </Slide>

        <Slide
          n={next()}
          label="The problem"
          notes={[
            "Retail investors already act like fund managers: they build baskets, argue about them and follow each other’s picks. None of it is locked, scored or paid, so there is no way to tell skill from noise and no reward for being right.",
          ]}
        >
          <Eyebrow>The problem</Eyebrow>
          <H1>
            Retail investing has
            <br />
            no scoreboard.
          </H1>
          <div className="pd-spacer" />
          <div className="pd-cols" style={cols(4)}>
            <Ruled title="Picks without proof">Anyone can post a portfolio. Nobody has to lock it, so nobody can prove it.</Ruled>
            <Ruled title="Talk without stakes">Group chats argue about stocks all week. Nothing is settled on Friday.</Ruled>
            <Ruled title="Funds built top down">An ETF takes a fund company and months. The crowd’s best ideas never become one.</Ruled>
            <Ruled title="Agents with no arena">AI agents can pick stocks, but there’s nowhere to measure them against people.</Ruled>
          </div>
        </Slide>

        <Slide
          n={next()}
          tone="light"
          label="Why now"
          sources="The Block and CertiK (Robinhood Chain mainnet, July 2026); rwa.xyz (tokenized stocks); ETFGI via Advisor Perspectives (US ETF flows, Jan to Jul 2026); JPMorgan via Benzinga (retail share of US equity volume)"
          notes={[
            "Robinhood Chain went live on mainnet on 1 July 2026 with more than 90 Stock Tokens. For the first time, real US stocks are programmable tokens with reliable on-chain prices, which is what a weekly, self-settling ETF game needs.",
            "At the same time ETFs keep taking record money, and retail traders make up a fifth to a quarter of US equity volume. The audience exists; the rails just arrived.",
          ]}
        >
          <Eyebrow>Why now</Eyebrow>
          <H1>
            Stocks just became
            <br />
            programmable.
          </H1>
          <div className="pd-spacer" />
          <div className="pd-split" style={{ flex: "none", alignItems: "end" }}>
            <div className="pd-cols" style={cols(2, 2)}>
              <Stat value="90+">Stock Tokens on Robinhood Chain mainnet, live since July 2026</Stat>
              <Stat value="3×">growth in tokenized stocks on-chain this year, to $3B</Stat>
              <Stat value="$1.23T">record net inflows into US ETFs, January to July 2026</Stat>
              <Stat value="20–25%">of US stock trading volume comes from retail investors</Stat>
            </div>
            <div className="pd-card" style={{ padding: "2cqw" }}>
              <TokenizedChart />
            </div>
          </div>
        </Slide>

        <Slide
          n={next()}
          label="The solution"
          notes={[
            "The locked basket is the ETF. Its score is the real buy-and-hold return of exactly what was locked, priced by Chainlink feeds that include reinvested dividends. Nobody can edit it mid-week.",
            "MEDIAN is a ghost team at the round’s median return. Beating it means beating half the field, so the game rewards being better than the crowd, not just a rising market.",
          ]}
        >
          <Eyebrow>The solution</Eyebrow>
          <H1>
            Build an ETF. Lock it.
            <br />
            Beat the median.
          </H1>
          <p className="pd-lede">A weekly round where every ETF is a real basket of tokenized stocks, scored on real prices.</p>
          <div className="pd-spacer" />
          <div className="pd-cols" style={cols(3)}>
            <Ruled step="01" title="Build">
              Pick 3 to 10 Robinhood Stock Tokens and set the weights. BTC and ETH can make up to 20%.
            </Ruled>
            <Ruled step="02" title="Lock">
              Lock the basket with a $5 ticket. It becomes a public ETF that others can back or buy.
            </Ruled>
            <Ruled step="03" title="Beat the median">
              On Friday, ETFs above MEDIAN split the tickets below it. Your stocks come back either way.
            </Ruled>
          </div>
        </Slide>

        <Slide
          n={next()}
          tone="light"
          label="How a round works"
          notes={[
            "Rounds follow the US market week and run themselves: a keeper locks entries at Monday’s open, takes prices at Friday’s close, settles, and opens next week’s round.",
            "From Monday to Friday the $5 tickets sit in a USDG ERC-4626 savings vault (Robinhood Earn on mainnet) and the interest goes into the pot. The stocks themselves never move.",
            "Of the losing tickets, 10% is taken: 5% is platform revenue and 5% goes to a season pot that tops up thin rounds.",
          ]}
        >
          <Eyebrow>How a round works</Eyebrow>
          <H1>One week, start to payout.</H1>
          <div className="pd-spacer" />
          <div className="pd-hide-sm">
            <RoundTimeline />
            <div style={{ height: "3.4cqw" }} />
            <PotSplit />
          </div>
          <div className="pd-show-sm">
            <div style={{ display: "grid", gap: 18 }}>
              <Ruled step="THE WEEK BEFORE" title="Build and back">
                $5 tickets in USDG.
              </Ruled>
              <Ruled step="MON 9:30AM ET" title="Baskets lock">
                Scored on Robinhood Chain’s Chainlink prices. Tickets earn interest in a USDG vault.
              </Ruled>
              <Ruled step="FRI 4PM ET" title="Round ends">
                Settled and paid. The next round opens.
              </Ruled>
              <div className="pd-ruled">
                <div className="pd-step" style={{ marginBottom: 10 }}>
                  WHERE A LOSING TICKET GOES
                </div>
                <div style={{ display: "flex", gap: 3, height: 14 }}>
                  <span style={{ flex: 90, background: "var(--strong)", borderRadius: "4px 0 0 4px" }} />
                  <span style={{ flex: 5, background: "var(--accent)" }} />
                  <span style={{ flex: 5, background: "var(--faint)", borderRadius: "0 4px 4px 0" }} />
                </div>
                <p className="pd-body">90% to ETFs above MEDIAN, by stake × accuracy, plus all ticket interest. 5% platform, 5% season pot.</p>
              </div>
            </div>
          </div>
        </Slide>

        <Slide
          n={next()}
          label="Scoring"
          notes={[
            "With n ETFs in a round, MEDIAN sits at the round’s median return. ETFs above it win, an ETF exactly on it draws and gets its ticket back, ETFs below it lose their ticket.",
            "Winners split the pot by stake × accuracy, so a bigger lead earns a bigger share, with a 100× cap on any gain. Inside a team, backers split by stake and the creator takes 10% of their backers’ winnings.",
          ]}
        >
          <Eyebrow>Scoring</Eyebrow>
          <H1>
            Half the field wins.
            <br />
            The better half.
          </H1>
          <p className="pd-lede">A rising market doesn’t pay everyone. You win by beating the crowd, which makes it a game of skill.</p>
          <div className="pd-spacer" />
          <div className="pd-hide-sm">
            <MedianPlot />
          </div>
          <div className="pd-show-sm">
            <MedianPlot compact />
            <p className="pd-body" style={{ marginTop: 10 }}>
              Below MEDIAN, the ticket goes to the pot. Above it, a share of the pot, more for a bigger lead.
            </p>
          </div>
          <p className="pd-small" style={{ marginTop: "0.6cqw" }}>
            An illustrative round of seven ETFs. On MEDIAN is a draw: the ticket comes back.
          </p>
        </Slide>

        <Slide
          n={next()}
          tone="light"
          label="Product"
          notes={[
            `Everything here runs today on Robinhood Chain testnet at ${SITE}, against a deployed escrow contract, with real Robinhood quotes and Chainlink feeds.`,
            "Buy the ETF routes one USDG amount across the basket through the 0x Swap API, with the creator’s fee (up to 2%) attached. It is built and tested, and switches on at mainnet where the tokens trade.",
          ]}
        >
          <Eyebrow>Product</Eyebrow>
          <H1>Live today on testnet.</H1>
          <div className="pd-spacer" />
          <div className="pd-cols" style={cols(3)}>
            <Card title="Build an ETF">37 assets: Robinhood Stock Tokens plus BTC and ETH. Name it and set a buy fee.</Card>
            <Card title="Back an ETF">Put a $5 ticket on someone else’s ETF and share in its winnings.</Card>
            <Card title="ETF pages">Live return against MEDIAN and the S&amp;P 500, the field, and what’s inside.</Card>
            <Card title="Tickets that earn">Tickets wait in a USDG savings vault. The interest goes into the pot.</Card>
            <Card title="Runs itself">A keeper locks, scores, settles and opens the next round every week.</Card>
            <Card title="For agents">An MCP server, so any AI agent can read the league and prepare moves.</Card>
          </div>
        </Slide>

        <Slide
          n={next()}
          label="Built to be trusted"
          notes={[
            "The keeper computes settlement off-chain with the open-source engine and publishes every input. Their hash goes on-chain with the payouts, so anyone can re-run the week and check it.",
            "The contract enforces the important parts on its own: the pot must add up, no payout can exceed the cap, baskets always go back to their owners, and three days after a round anyone can void it so everyone gets their stake back.",
          ]}
        >
          <div className="pd-split">
            <div>
              <Eyebrow>Built to be trusted</Eyebrow>
              <H1>
                Peer to peer.
                <br />
                Checkable by anyone.
              </H1>
            </div>
            <Checks
              items={[
                "The platform never takes the other side of a ticket",
                "Locked stocks go back to their owner, win or lose",
                "Prices from Robinhood Chain’s Chainlink feeds, dividends included",
                "Every settlement input is published, with its hash on-chain",
                "The contract checks the pot adds up and caps every payout",
                "Three days after a round, anyone can void it and get their stake back",
              ]}
            />
          </div>
        </Slide>

        <Slide
          n={next()}
          tone="light"
          label="AI agents"
          notes={[
            "The MCP server has nine tools: get_rules, list_stocks, get_round, get_my_entries, and planners to create an ETF, back one, buy a basket or an ETF, and claim. Planners return transactions; the user’s wallet signs every one.",
            "Agents and people play in the same rounds against the same MEDIAN. That gives agent builders a public weekly benchmark with real money behind it.",
          ]}
        >
          <div className="pd-split">
            <div>
              <Eyebrow>AI agents</Eyebrow>
              <H1>
                Agents compete on
                <br />
                the same scoreboard.
              </H1>
              <p className="pd-lede">Bring Claude, ChatGPT or your own agent. It builds and backs ETFs; your wallet signs.</p>
            </div>
            <div className="pd-card" style={{ padding: "0.8cqw 2cqw" }}>
              <Checks
                items={[
                  "MCP server with nine tools, live at /api/mcp",
                  "Reads the rules, the stocks, the round and your entries",
                  "Prepares create, back, buy and claim transactions",
                  "Never holds keys: every move is signed in your wallet",
                ]}
              />
            </div>
          </div>
        </Slide>

        <Slide
          n={next()}
          label="Market"
          sources="ETFGI via Mondo Visione (US ETF assets, June 2026); CertiK (prediction market volume, 2025). SOM is our target, not a forecast."
          notes={[
            "TAM is the money already held in baskets of stocks. SAM is the money people already put behind a view each year on prediction markets, the closest habit to backing an ETF for a week.",
            "SOM: 100,000 tickets a week at $5 is $26M a year in tickets, three years after mainnet.",
          ]}
        >
          <Eyebrow>Market</Eyebrow>
          <H1>People already buy baskets and back views.</H1>
          <div className="pd-split" style={{ marginTop: "1.4cqw" }}>
            <MarketCircles />
            <div style={{ display: "grid", gap: "1.6cqw" }}>
              <Ruled title="TAM · $15.78T">Held in US ETFs, a record. The habit of owning a basket.</Ruled>
              <Ruled title="SAM · $63.5B a year">Traded on prediction markets in 2025. The habit of backing a view with money.</Ruled>
              <Ruled title="SOM · $26M a year">In tickets: 100,000 a week, three years after mainnet.</Ruled>
            </div>
          </div>
        </Slide>

        <Slide
          n={next()}
          tone="light"
          label="Business model"
          notes={[
            "The take applies only to losing tickets, so revenue grows with volume, not with which way the market moves. Draws and voided rounds pay nothing.",
            "The model assumes 45% of ticket money finishes below MEDIAN (about half loses; draws and thin rounds bring it down). It leaves out ticket interest, which goes to players, and the season pot, which is not revenue.",
          ]}
        >
          <Eyebrow>Business model</Eyebrow>
          <H1>We earn on volume, never on the market.</H1>
          <div className="pd-spacer" />
          <div className="pd-cols" style={cols(3)}>
            <Stat value="5%">
              <b style={{ color: "var(--strong)", fontWeight: 500 }}>Of losing tickets.</b> Taken at settlement, live in the contract today.
            </Stat>
            <Stat value="Fee">
              <b style={{ color: "var(--strong)", fontWeight: 500 }}>On Buy the ETF.</b> A platform fee on basket buys through 0x, next to the creator’s. At mainnet.
            </Stat>
            <Stat value="Pro">
              <b style={{ color: "var(--strong)", fontWeight: 500 }}>Private leagues.</b> Communities and brands run their own rounds. On the roadmap.
            </Stat>
          </div>
          <div style={{ height: "2.4cqw" }} />
          <div className="pd-card pd-body" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.8cqw 1.6cqw" }}>
            <span>{b("100,000")} tickets a week</span>
            <span aria-hidden="true">→</span>
            <span>{b("$225k")} below MEDIAN</span>
            <span aria-hidden="true">→</span>
            <span>{b("$11,250")} a week at 5%</span>
            <span aria-hidden="true">→</span>
            <span>{b("≈ $585k")} a year, before buy fees</span>
          </div>
          <p className="pd-small" style={{ marginTop: "0.8cqw" }}>
            Illustrative model, not a forecast. Testnet is free and nothing is charged.
          </p>
        </Slide>

        <Slide
          n={next()}
          label="Traction"
          notes={[
            "We are pre-launch. These numbers describe what is built and tested, not usage: we don’t count testnet volume as traction.",
            "The contract’s Foundry suite includes a fork test against Robinhood Chain mainnet with real Stock Tokens, and the keeper runs weekly rounds end to end on testnet.",
          ]}
        >
          <Eyebrow>Traction</Eyebrow>
          <H1>Built, tested and live on testnet.</H1>
          <div className="pd-spacer" />
          <div className="pd-cols" style={cols(4, 2)}>
            <Stat value="44">contract tests, including a mainnet fork with real Stock Tokens</Stat>
            <Stat value="73">app tests on settlement, scoring, prices and agents</Stat>
            <Stat value="37">assets to build with: Stock Tokens, BTC and ETH</Stat>
            <Stat value="9">agent tools on the MCP server</Stat>
          </div>
          <div style={{ height: "2.4cqw" }} />
          <div className="pd-pills">
            {["Escrow contract on testnet", "Weekly keeper running", "Live P&L vs MEDIAN and S&P 500", "Ticket savings vault", "Buy the ETF via 0x, built", "Open-source settlement engine"].map(
              (p) => (
                <span key={p} className="pd-pill">
                  {p}
                </span>
              ),
            )}
          </div>
        </Slide>

        <Slide
          n={next()}
          tone="light"
          label="Competition"
          notes={[
            "Brokers give people stocks but no game. Prediction markets give people a game, but not on portfolios they built. Copy trading follows a person, off-chain and custodial. Thematic ETFs are built top down.",
            "Profit Markets is the one place where anyone’s basket becomes a public ETF, competes every week, and pays its creator.",
          ]}
        >
          <Eyebrow>Competition</Eyebrow>
          <H1>Where Profit Markets fits</H1>
          <div className="pd-spacer" />
          <table className="pd-table">
            <thead>
              <tr>
                <th>Who</th>
                <th>What they do</th>
                <th className="pd-hide-sm">What’s missing</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Brokerage apps", "Buy and sell single stocks and ETFs", "No scoreboard, no way to publish a basket"],
                ["Polymarket, Kalshi", "Back the outcome of an event", "You back events, not portfolios you built"],
                ["Copy trading", "Copy another trader’s portfolio", "Custodial, no weekly head to head"],
                ["Thematic ETFs", "Baskets built by fund issuers", "Top down, months to launch"],
              ].map(([who, what, gap]) => (
                <tr key={who}>
                  <td>{who}</td>
                  <td>{what}</td>
                  <td className="pd-hide-sm">{gap}</td>
                </tr>
              ))}
              <tr className="pd-us">
                <td>Profit Markets</td>
                <td>Anyone builds an ETF, and it competes every week</td>
                <td className="pd-hide-sm">On-chain, peer to peer, creators earn</td>
              </tr>
            </tbody>
          </table>
        </Slide>

        <Slide
          n={next()}
          label="Go to market"
          notes={[
            "Kickoff already runs weekly markets on Robinhood Chain, so Profit Markets launches to an existing audience with the same wallet and the same weekly rhythm.",
            "Creators are the growth loop: they earn up to 2% on every buy of their ETF and 10% of their backers’ winnings, so they bring their own audience.",
          ]}
        >
          <Eyebrow>Go to market</Eyebrow>
          <H1>Three ways in</H1>
          <div className="pd-spacer" />
          <div className="pd-cols" style={cols(3)}>
            <Ruled title="Kickoff’s players">Kickoff already runs weekly markets on Robinhood Chain. Same wallet, same weekly habit, a second game.</Ruled>
            <Ruled title="ETF creators">Creators earn on every buy and on their backers’ wins, so each one brings an audience.</Ruled>
            <Ruled title="Agent builders">A public weekly benchmark for trading agents, reached through MCP and the tools they already use.</Ruled>
          </div>
        </Slide>

        <Slide n={next()} tone="light" label="Roadmap" notes={["Mainnet launches with ticket and round caps that rise as the contract earns a track record. The external audit comes first."]}>
          <Eyebrow>Roadmap</Eyebrow>
          <H1>From testnet to mainnet</H1>
          <div className="pd-spacer" />
          <div className="pd-cols" style={cols(3)}>
            <Card inverse step="NOW" title="Live on testnet">
              Weekly rounds, ETF pages with live P&amp;L, tickets in a savings vault, agents over MCP.
            </Card>
            <Card step="NEXT" title="Mainnet with caps">
              External audit, Robinhood Earn for tickets, Buy the ETF through 0x, a launch with ticket caps.
            </Card>
            <Card step="THEN" title="Seasons and leagues">
              Season prizes, private leagues for communities, agent rounds, more assets as Robinhood lists them.
            </Card>
          </div>
        </Slide>

        <Slide n={next()} label="Closing" notes={[`Thank you for reading. The app is live on Robinhood Chain testnet at ${SITE}: build an ETF and enter this week’s round.`]}>
          <ProfitMark tone="white" size={26} />
          <div className="pd-spacer" />
          <H1>
            Gamified ETFs, owned by
            <br />
            the people who build them.
          </H1>
          <p className="pd-lede">What takes us to mainnet: an external audit, Robinhood Earn for tickets, Buy the ETF through 0x, and a launch with caps.</p>
          <div className="pd-spacer" />
          <div className="pd-cols" style={cols(3)}>
            <Ruled title="Try it">{SITE}</Ruled>
            <Ruled title="Kickoff">kickoff.cash</Ruled>
            <Ruled title="Built on">Robinhood Chain · Chainlink · 0x</Ruled>
          </div>
        </Slide>
      </main>
    </div>
  );
}
