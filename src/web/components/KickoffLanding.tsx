"use client";

// The landing page in Kickoff's design language: floating glass pill nav over
// a purple hero, a black band with the live pot, "How it works" on cream with
// glass diagonal cards, the statement, a stock-logo marquee, then the black
// footer. Same rounded 50px lips between sections as kickoff.cash.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button3D } from "../../ui/brand/Button3D";
import { NavUnderlineItem } from "../../ui/brand/NavUnderline";
import { Reveal, RevealWords } from "../../ui/brand/Reveal";
import { StocksMark } from "../../ui/components/SiteHeader";
import { SiteFooter } from "../../ui/components/SiteFooter";
import { StockDeck } from "../../ui/components/StockDeck";
import { STOCKS, byTicker } from "../../ui/data/stocks";
import { useRound } from "../hooks";
import { LeagueBoard } from "./league";
import { useLive } from "./landing";

const NAV_LINKS = [
  { label: "How it Works", href: "#how-it-works" },
  { label: "League", href: "/league" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Agents", href: "/agents" },
  { label: "Rules", href: "/rules" },
];

const FRAUNCES = "'Fraunces', serif";
const CLASH = "'Clash Display', sans-serif";

function Navbar() {
  const [hidden, setHidden] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 150);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const onScroll = () => setHidden(window.scrollY > window.innerHeight * 0.75);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div
      className="fixed left-0 right-0 top-5 z-50 flex justify-center px-4"
      style={{
        transform: hidden || !mounted ? "translateY(-120%)" : "translateY(0)",
        opacity: hidden || !mounted ? 0 : 1,
        transition: "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.45s ease",
        pointerEvents: hidden ? "none" : "auto",
      }}
    >
      <nav className="glass flex w-full max-w-4xl items-center justify-between px-4 py-3" style={{ borderRadius: 999, overflow: "visible" }}>
        <Link href="/" className="ml-2 shrink-0" aria-label="Kickoff Stocks">
          <StocksMark white size={28} />
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <NavUnderlineItem key={l.label} href={l.href} active={false} muted="rgba(255,255,255,0.75)" activeColor="#FFFFFF">
              {l.label}
            </NavUnderlineItem>
          ))}
        </div>
        <Button3D color="purple" onClick={() => router.push("/create")}>
          Play
        </Button3D>
      </nav>
    </div>
  );
}

function Hero() {
  return (
    <section className="hero-landing relative flex min-h-screen flex-col justify-start overflow-hidden pb-[192px] pt-[80px]" style={{ background: "rgba(123, 98, 246, 0.7)" }}>
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage: "linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div className="relative flex w-full flex-col items-center px-6 text-center" style={{ zIndex: 2, paddingTop: "6vh" }}>
        <Reveal duration={1000}>
          <p style={{ fontFamily: FRAUNCES, color: "rgba(255,255,255,0.85)", fontSize: "clamp(1.1rem, 2.4vw, 1.9rem)", fontStyle: "italic", lineHeight: 1.2, marginBottom: "0.35em" }}>
            Beat MEDIAN, <span style={{ color: "#FFFFFF", fontStyle: "normal", fontWeight: 600 }}>keep the stack.</span>
          </p>
        </Reveal>
        <h1 className="leading-none" style={{ fontFamily: FRAUNCES, color: "#FFFFFF", fontSize: "clamp(3.2rem, 8vw, 7.5rem)", fontWeight: 700, letterSpacing: "-0.025em" }}>
          <RevealWords text="Stock Leagues." delay={250} stagger={140} />
        </h1>
        <Reveal delay={500}>
          <p className="mx-auto mt-6 max-w-[46ch]" style={{ fontFamily: CLASH, color: "rgba(255,255,255,0.8)", fontSize: "clamp(0.95rem, 1.6vw, 1.1rem)", lineHeight: 1.6 }}>
            Build an ETF from real Robinhood Stock Tokens, lock it with a $5 ticket, and finish above MEDIAN to take a share of the tickets below it.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/** The fanned stock cards at the hero / black-band seam (Kickoff's players image). */
function HeroCards() {
  const { prices, changes } = useLive();
  const big = ["TSLA", "AAPL", "NVDA", "AMZN"].map((t) => byTicker(t)!);
  const medium = ["TSLA", "AAPL", "NVDA", "AMZN", "META"].map((t) => byTicker(t)!);
  return (
    <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2" style={{ zIndex: 15 }}>
      <div className="hidden xl:block">
        <StockDeck stocks={big} prices={prices} changes={changes} />
      </div>
      <div className="hidden md:block xl:hidden">
        <StockDeck stocks={medium} prices={prices} changes={changes} size="medium" />
      </div>
      <div className="md:hidden">
        <StockDeck stocks={medium.slice(1, 4)} prices={prices} changes={changes} size="medium" />
      </div>
    </div>
  );
}

function useCountUp(target: number | null, ms = 1400) {
  const [v, setV] = useState<number | null>(null);
  useEffect(() => {
    if (target === null) return;
    const from = v ?? 0;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - t0) / ms, 1);
      setV(from + (target - from) * (1 - Math.pow(1 - p, 4)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, ms]);
  return v;
}

const money = (x: number) => `$${x.toLocaleString("en-US", { minimumFractionDigits: x % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

/** Black band: this round's pot, live (Kickoff's accumulator figure). */
function RoundPot() {
  const { data: r } = useRound();
  const pot = r ? Number(BigInt(r.pot) + BigInt(r.ticketYield ?? "0")) / 1e6 : null;
  const shown = useCountUp(pot);
  return (
    <section
      className="relative flex w-full flex-col items-center justify-center overflow-hidden text-center"
      style={{ background: "#000000", minHeight: 500, paddingBottom: 62, marginTop: -120, zIndex: 25 }}
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ width: 520, height: 520, background: "var(--color-kickoff-green)", filter: "blur(180px)", opacity: 0.1 }} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0" style={{ height: 220, background: "linear-gradient(to top, rgba(123,98,246,0.22), transparent)" }} />
      <div className="relative mx-auto w-full max-w-4xl px-6">
        <Reveal duration={1100}>
          <p style={{ fontFamily: FRAUNCES, fontSize: "clamp(4rem, 12vw, 9rem)", fontWeight: 700, color: "#FFFFFF", lineHeight: 1, letterSpacing: "-0.03em" }}>
            {shown === null ? "$5" : money(Math.round(shown * 100) / 100)}
          </p>
        </Reveal>
        <Reveal delay={200}>
          <p style={{ fontFamily: CLASH, fontSize: "clamp(0.85rem, 1.6vw, 1.1rem)", color: "rgba(255,255,255,0.55)", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: "0.9em", lineHeight: 1.8 }}>
            {r ? (
              <>
                in round {r.id}&rsquo;s tickets,{" "}
                <span style={{ color: "var(--color-kickoff-green)" }}>{r.teams.length} ETFs chasing MEDIAN</span>
              </>
            ) : (
              <>
                a ticket, <span style={{ color: "var(--color-kickoff-green)" }}>every round, on Robinhood Chain</span>
              </>
            )}
          </p>
        </Reveal>
        {r && r.ticketsParked && (
          <Reveal delay={350}>
            <p className="mt-3" style={{ fontFamily: CLASH, fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>
              Tickets are earning interest in the savings vault right now. It all goes into the pot.
            </p>
          </Reveal>
        )}
      </div>
    </section>
  );
}

const HOW_STEPS = [
  { title: "Pick 3 to 10 stocks", body: "Real Robinhood Stock Tokens: NVIDIA, Tesla, Apple, the S&P 500 and 30 more. Set the weights, give your ETF a name." },
  { title: "Lock it with a $5 ticket", body: "Your basket (at least $10) sits in the league contract for the round, still yours. It comes back when the round ends." },
  { title: "Beat MEDIAN", body: "ETFs are ranked by return. MEDIAN is the middle team. Finish above it and you split the tickets below it. Tie it and your ticket comes back." },
  { title: "Your money keeps working", body: "Tickets earn interest in a savings vault while the round runs, and it all goes into the pot. Your stocks keep their dividends." },
];

/** Ranked ETFs with the MEDIAN ghost line: the mechanic at a glance. */
function MedianLadder() {
  const rows = [
    { name: "AI Chips Max", ret: 4.2 },
    { name: "Everyday Giants", ret: 2.1 },
    { name: "MEDIAN", ret: 1.3, ghost: true },
    { name: "Steady Index", ret: 1.3, draw: true },
    { name: "Fintech Rails", ret: 0.4 },
    { name: "Speed & Chips", ret: -1.9 },
  ];
  return (
    <div className="card-diagonal glass w-full max-w-[420px] p-5" style={{ background: "rgba(255,255,255,0.55)" }}>
      <p style={{ fontFamily: CLASH, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--color-new-purple)" }}>This round</p>
      <ul className="mt-4 space-y-1.5">
        {rows.map((r) =>
          r.ghost ? (
            <li key={r.name} className="flex items-center gap-3 py-1">
              <span className="h-px flex-1 border-t-2 border-dashed" style={{ borderColor: "var(--color-new-purple)" }} />
              <span style={{ fontFamily: CLASH, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.16em", color: "var(--color-new-purple)" }}>MEDIAN {r.ret.toFixed(1)}%</span>
              <span className="h-px flex-1 border-t-2 border-dashed" style={{ borderColor: "var(--color-new-purple)" }} />
            </li>
          ) : (
            <li
              key={r.name}
              className="card-diagonal-sm flex items-center justify-between px-4 py-2.5"
              style={{ background: r.ret > 1.3 ? "rgba(0,200,5,0.14)" : r.draw ? "rgba(123,98,246,0.12)" : "rgba(17,18,16,0.05)" }}
            >
              <span style={{ fontFamily: CLASH, fontWeight: 600, fontSize: "0.9rem", color: "var(--color-ink)" }}>{r.name}</span>
              <span className="t-num" style={{ fontSize: "0.85rem", fontWeight: 700, color: r.ret > 1.3 ? "var(--color-kickoff-green-deep)" : r.draw ? "var(--color-new-purple)" : "rgba(17,18,16,0.5)" }}>
                {r.ret > 0 ? "+" : ""}
                {r.ret.toFixed(1)}% · {r.ret > 1.3 ? "wins" : r.draw ? "draw" : "loses"}
              </span>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function HowItWorks() {
  const router = useRouter();
  return (
    <>
      <div className="rounded-t-[50px]" style={{ background: "var(--color-pitch-cream)", height: 90, width: "100%", marginTop: -60, position: "relative", zIndex: 30 }} />
      <section id="how-it-works" className="relative w-full overflow-hidden" style={{ background: "var(--color-pitch-cream)", minHeight: 600, paddingTop: 52, paddingBottom: 150 }}>
        <div className="pointer-events-none absolute rounded-full" style={{ top: "50%", left: "5%", width: 300, height: 300, background: "var(--color-new-purple)", filter: "blur(120px)", opacity: 0.38 }} />
        <div className="pointer-events-none absolute rounded-full" style={{ top: "55%", right: "5%", width: 280, height: 280, background: "var(--color-new-purple)", filter: "blur(110px)", opacity: 0.32 }} />
        <div className="relative mx-auto max-w-6xl px-6 text-center" style={{ zIndex: 1 }}>
          <h2 style={{ fontFamily: FRAUNCES, fontSize: "clamp(2.8rem, 6vw, 5rem)", fontWeight: 700, color: "#0A0A0A", letterSpacing: "-0.03em", lineHeight: 1 }}>
            <RevealWords text="How it works." />
          </h2>
        </div>
        <div className="relative mx-auto mt-16 grid max-w-6xl items-center gap-14 px-6 md:grid-cols-2" style={{ zIndex: 1 }}>
          <div className="flex flex-col gap-2">
            {HOW_STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 120} from="left">
                <div className="card-diagonal-sm glass flex items-start gap-5 px-7 py-6">
                  <span style={{ fontFamily: FRAUNCES, fontSize: "2rem", fontWeight: 700, lineHeight: 1, color: "var(--color-new-purple)", minWidth: "2.2rem" }}>{i + 1}</span>
                  <div className="text-left">
                    <h3 style={{ fontFamily: FRAUNCES, fontSize: "1.15rem", fontWeight: 600, color: "var(--color-ink)", marginBottom: 6 }}>{s.title}</h3>
                    <p style={{ fontFamily: CLASH, fontSize: "0.9rem", lineHeight: 1.65, color: "rgba(17,18,16,0.55)" }}>{s.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="flex flex-col items-center gap-8">
            <Reveal from="right" className="w-full">
              <div className="flex justify-center">
                <MedianLadder />
              </div>
            </Reveal>
            <Button3D color="purple" size="lg" onClick={() => router.push("/create")}>
              Build your ETF
            </Button3D>
          </div>
        </div>
      </section>
    </>
  );
}

function Statement() {
  return (
    <section className="relative overflow-hidden rounded-t-[50px] text-center" style={{ background: "var(--color-pitch-cream)", padding: "clamp(7rem, 16vh, 12rem) 1.5rem", marginTop: -50, zIndex: 35 }}>
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ width: 640, height: 640, background: "var(--color-new-purple)", filter: "blur(200px)", opacity: 0.12 }} />
      <div className="relative mx-auto max-w-5xl" style={{ zIndex: 1 }}>
        <Reveal>
          <p style={{ fontFamily: CLASH, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--color-new-purple)", marginBottom: "2.2rem" }}>
            The first stock league on Robinhood Chain
          </p>
        </Reveal>
        <h2 style={{ fontFamily: FRAUNCES, fontSize: "clamp(2.6rem, 6.5vw, 5.5rem)", fontWeight: 700, color: "var(--color-ink)", letterSpacing: "-0.03em", lineHeight: 1.05 }}>
          <RevealWords text="Beat MEDIAN." stagger={120} />
          <br />
          <span style={{ color: "rgba(17,18,16,0.35)" }}>
            <RevealWords text="Not the whole market." delay={400} stagger={100} />
          </span>
        </h2>
        <Reveal delay={700}>
          <p className="mx-auto" style={{ fontFamily: FRAUNCES, fontStyle: "italic", fontSize: "clamp(1.05rem, 2vw, 1.4rem)", color: "rgba(17,18,16,0.55)", marginTop: "2.6rem", maxWidth: 560, lineHeight: 1.55 }}>
            Half the league wins every round. The closer you are to the best ETF, the bigger your share. Land right on MEDIAN and your ticket comes home.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function LiveLeague() {
  return (
    <section className="relative rounded-t-[50px] bg-bg" style={{ marginTop: -50, zIndex: 36, padding: "5rem 0 7rem" }}>
      <div className="mx-auto max-w-[1180px] px-4 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="t-label text-accent">Live</p>
            <h2 className="t-heading mt-3 text-[34px] md:text-[44px]">This round&rsquo;s league</h2>
          </div>
          <Link href="/league" className="btn-3d btn-ghost inline-flex h-10 items-center px-5 text-[0.875rem]">
            Full table →
          </Link>
        </div>
        <div className="mt-10 rounded-[24px] bg-surface p-2 md:p-3">
          <LeagueBoard limit={8} />
        </div>
      </div>
    </section>
  );
}

function StockMarquee() {
  const row = (copy: number) => (
    <div key={copy} aria-hidden={copy === 1} className="flex items-center" style={{ gap: 72, paddingRight: 72 }}>
      {STOCKS.map((s) => (
        <Link key={`${copy}-${s.ticker}`} href={`/create?add=${s.ticker}`} className="flex shrink-0 flex-col items-center gap-3" tabIndex={copy === 1 ? -1 : 0}>
          <img src={s.logo} alt={copy === 0 ? s.name : ""} loading="lazy" width={56} height={56} className="rounded-full" style={{ filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.6))", opacity: 0.92 }} />
          <span style={{ fontFamily: CLASH, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.45)" }}>{s.ticker}</span>
        </Link>
      ))}
    </div>
  );
  return (
    <section className="relative overflow-hidden rounded-t-[50px]" style={{ background: "#000000", padding: "6rem 0 7rem", marginTop: -50, zIndex: 37 }}>
      <Reveal>
        <p className="mb-12 text-center" style={{ fontFamily: CLASH, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>
          35 stocks and funds. Every round.
        </p>
      </Reveal>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-[2] w-[120px]" style={{ background: "linear-gradient(to right, #000000, transparent)" }} />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-[2] w-[120px]" style={{ background: "linear-gradient(to left, #000000, transparent)" }} />
        <div className="marquee-track">{[0, 1].map(row)}</div>
      </div>
      <div className="mx-auto mt-20 grid max-w-5xl gap-10 px-6 md:grid-cols-[1fr_1.1fr] md:items-center">
        <div>
          <p style={{ fontFamily: CLASH, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--color-kickoff-green)" }}>Agents</p>
          <h3 className="mt-4" style={{ fontFamily: FRAUNCES, fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 700, color: "#FFFFFF", lineHeight: 1.05, letterSpacing: "-0.02em" }}>
            Bring your own agent.
          </h3>
          <p className="mt-4 max-w-[44ch]" style={{ fontFamily: CLASH, fontSize: "0.95rem", lineHeight: 1.65, color: "rgba(255,255,255,0.55)" }}>
            Claude, ChatGPT or your own: connect it to our MCP server and it can read the round, build ETFs and back teams. It hands you every transaction to sign. Your keys never leave your wallet.
          </p>
        </div>
        <div className="glass-dark card-diagonal p-6">
          <ol className="space-y-4" style={{ fontFamily: CLASH, fontSize: "0.92rem", color: "rgba(255,255,255,0.8)" }}>
            <li><span className="mr-3" style={{ fontFamily: FRAUNCES, color: "var(--color-kickoff-green)", fontWeight: 700 }}>1</span>Add the Kickoff Stocks MCP server to your agent.</li>
            <li><span className="mr-3" style={{ fontFamily: FRAUNCES, color: "var(--color-kickoff-green)", fontWeight: 700 }}>2</span>Ask: &ldquo;Build me an AI-chips ETF and enter it.&rdquo;</li>
            <li><span className="mr-3" style={{ fontFamily: FRAUNCES, color: "var(--color-kickoff-green)", fontWeight: 700 }}>3</span>Sign what it prepares. Your avatar gets the agent badge.</li>
          </ol>
          <div className="mt-6">
            <Link href="/agents" className="btn-3d btn-green inline-flex h-10 items-center px-5 text-[0.875rem]">
              Agent setup →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function KickoffLanding() {
  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="relative" style={{ overflowX: "clip" }}>
        <Hero />
        <HeroCards />
        <div className="relative w-full rounded-t-[50px]" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,1) 30%)", height: 180, marginTop: -100, zIndex: 20 }} />
      </div>
      <RoundPot />
      <HowItWorks />
      <Statement />
      <LiveLeague />
      <StockMarquee />
      <div className="relative" style={{ zIndex: 38 }}>
        <SiteFooter />
      </div>
    </div>
  );
}
