// Footer: a purple panel inset from the page (its own colour, unlike every
// page above it), a closing line with the Play button, link columns, and the
// wordmark cropped at the bottom edge.

import Link from "next/link";
import { ProfitMark } from "../brand/ProfitMark";

const KICKOFF = "https://kickoff.cash";

const cols: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Play",
    links: [
      { label: "This week's league", href: "/league" },
      { label: "Build an ETF", href: "/create" },
      { label: "Leaderboard", href: "/leaderboard" },
      { label: "My entries", href: "/me" },
    ],
  },
  {
    heading: "Build",
    links: [
      { label: "Agents", href: "/agents" },
      { label: "API", href: "/agents#api" },
      { label: "Contracts", href: "/rules#contracts" },
      { label: "Verify a round", href: "/rules#verify" },
    ],
  },
  {
    heading: "Kickoff",
    links: [
      { label: "Football markets", href: KICKOFF },
      { label: "Rules", href: "/rules" },
      { label: "GitHub", href: "https://github.com/NECOKIZZ/kickoffstocks" },
      { label: "Risk notice", href: "/rules#risk" },
    ],
  },
];

export function SiteFooter() {
  return (
    <div className="px-3 pb-3 pt-10 sm:px-4 sm:pb-4" style={{ background: "var(--bg)" }}>
      <footer
        className="relative overflow-hidden rounded-[32px] text-white"
        style={{ background: "radial-gradient(120% 90% at 85% 0%, color-mix(in oklab, var(--color-new-purple) 72%, #FFFFFF) 0%, var(--color-new-purple) 45%, var(--color-new-purple-deep) 100%)" }}
      >
        <div aria-hidden className="pointer-events-none absolute rounded-full" style={{ width: 420, height: 420, left: -120, top: -160, background: "var(--color-kickoff-green)", filter: "blur(160px)", opacity: 0.18 }} />
        <div className="relative mx-auto max-w-6xl px-6 pt-16 sm:px-10">
          <div className="flex flex-wrap items-end justify-between gap-8 border-b border-white/15 pb-12">
            <p className="max-w-[16ch]" style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(2rem, 4.2vw, 3.4rem)", fontWeight: 600, lineHeight: 1.02, letterSpacing: "-0.03em" }}>
              Beat the median. <span style={{ fontStyle: "italic", fontWeight: 400, opacity: 0.75 }}>Keep the profit.</span>
            </p>
            <Link href="/create" className="btn-3d btn-green inline-flex h-12 items-center px-7 text-[0.95rem]">
              Play this week →
            </Link>
          </div>
          <div className="grid gap-10 py-12 md:grid-cols-4">
            <div>
              <ProfitMark tone="white" size={24} />
              <p className="mt-5 max-w-[30ch] font-clash text-[0.82rem] leading-[1.7] text-white/65">
                Kickoff&rsquo;s weekly stock league on Robinhood Chain. Build an ETF from real Robinhood Stock Tokens and beat the MEDIAN.
              </p>
            </div>
            {cols.map((col) => (
              <div key={col.heading}>
                <p className="mb-5 font-clash text-[0.66rem] font-bold uppercase tracking-[0.18em] text-white/50">{col.heading}</p>
                <ul className="flex flex-col gap-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <a href={l.href} className="font-clash text-[0.88rem] text-white/85 no-underline transition-colors hover:text-white">
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="pb-6 font-clash text-[0.72rem] leading-relaxed text-white/50">
            © 2026 kickoff.cash · &ldquo;ETF&rdquo; means an on-chain basket of tokenized stocks, not a regulated fund. Capital is at risk. Robinhood Stock Tokens are not available in
            restricted regions, including the US.
          </p>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none select-none whitespace-nowrap text-center"
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: "clamp(4rem, 15.5vw, 15rem)",
            fontWeight: 700,
            letterSpacing: "-0.05em",
            lineHeight: 0.72,
            marginBottom: "-0.06em",
            color: "transparent",
            backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.28), rgba(255,255,255,0.04))",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
          }}
        >
          Profit <span style={{ fontStyle: "italic", fontWeight: 400 }}>Markets</span>
        </div>
      </footer>
    </div>
  );
}
