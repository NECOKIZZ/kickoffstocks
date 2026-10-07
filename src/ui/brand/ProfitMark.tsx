/**
 * Profit Markets lockup: the Kickoff mark, a hairline, then "Profit Markets"
 * in Fraunces ("Markets" in italic) with a small green line that ticks up
 * like a chart. `tone` follows the background: white on dark, ink on light,
 * or the theme's ink (`mono`).
 */
export function ProfitMark({ tone = "mono", size = 26, compact = false }: { tone?: "white" | "ink" | "mono"; size?: number; compact?: boolean }) {
  const ink = tone === "white" ? "#FFFFFF" : tone === "ink" ? "#111210" : "var(--logo-mono)";
  return (
    <span className="inline-flex items-center" style={{ gap: size * 0.42, color: ink }} aria-label="Kickoff Profit Markets">
      <svg width={size} height={size * (502 / 500)} viewBox="0 0 500 502" aria-hidden="true">
        <circle cx="400" cy="100" r="100" fill={ink} />
        <path d="M150 0L500 502H327.5L150 251.5V500H0V0H150Z" fill={ink} />
      </svg>
      <span aria-hidden="true" style={{ width: 1, height: size * 0.9, background: ink, opacity: 0.22 }} />
      <span className="relative inline-flex items-baseline whitespace-nowrap" style={{ fontFamily: "'Fraunces', serif", fontSize: size * 0.74, lineHeight: 1, letterSpacing: "-0.02em" }}>
        <span style={{ fontWeight: 650 }}>Profit</span>
        {!compact && <span style={{ fontWeight: 400, fontStyle: "italic", marginLeft: "0.22em", opacity: 0.85 }}>Markets</span>}
        <svg
          className="profit-tick"
          width={size * 0.62}
          height={size * 0.42}
          viewBox="0 0 26 18"
          aria-hidden="true"
          style={{ marginLeft: "0.3em", alignSelf: "center", overflow: "visible" }}
        >
          <path d="M1 15 L8 9 L13 12 L24 2" fill="none" stroke="var(--color-kickoff-green)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="24" cy="2" r="2.6" fill="var(--color-kickoff-green)" />
        </svg>
      </span>
    </span>
  );
}
