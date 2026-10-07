// Kickoff's black footer: the mark and kickoff.cash, then link columns.

import { Logo } from "../brand/Logo";

const KICKOFF = "https://kickoff.cash";

const cols: { heading: string; links: { label: string; href?: string }[] }[] = [
  {
    heading: "Play",
    links: [
      { label: "League", href: "/league" },
      { label: "Create an ETF", href: "/create" },
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
    <footer style={{ background: "#000000", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-4">
        <div>
          <div className="mb-5 flex items-center gap-2">
            <Logo variant="white" size={24} />
            <span className="font-display text-[1rem] font-bold text-white">
              stocks.kickoff<span style={{ color: "var(--primary)" }}>.cash</span>
            </span>
          </div>
          <p className="font-clash text-[0.8rem] leading-[1.7] text-white/30">
            Kickoff&rsquo;s stock league on Robinhood Chain. Build an ETF from real Robinhood Stock Tokens and beat MEDIAN.
          </p>
          <p className="mt-6 font-clash text-[0.72rem] text-white/20">
            © 2026 kickoff.cash · &ldquo;ETF&rdquo; means an on-chain basket of tokenized stocks, not a regulated fund. Capital is at risk.
          </p>
        </div>
        {cols.map((col) => (
          <div key={col.heading}>
            <p className="mb-5 font-clash text-[0.65rem] font-bold uppercase tracking-[0.18em] text-white/25">{col.heading}</p>
            <ul className="flex flex-col gap-3">
              {col.links.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="font-clash text-[0.85rem] text-white/45 no-underline transition-colors hover:text-white">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}
