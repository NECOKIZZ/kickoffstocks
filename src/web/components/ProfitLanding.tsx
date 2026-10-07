"use client";

// Profit Markets landing page. Kickoff's brand (colours, Fraunces / Clash
// Display, rounded cards, 3D buttons) in its own arrangement:
//   black hero with glows, copy on the left and the card stack on the right ·
//   a statement that lights up word by word as you scroll · how it works ·
//   the MEDIAN rule · the week (a black inset panel with the live round) ·
//   the assets · agents · why it's safe · the purple footer.
// The nav scrolls between these sections; only Play leaves the page.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button3D } from "../../ui/brand/Button3D";
import { ProfitMark } from "../../ui/brand/ProfitMark";
import { Reveal, RevealWords } from "../../ui/brand/Reveal";
import { CardStack } from "../../ui/components/CardStack";
import { SiteFooter } from "../../ui/components/SiteFooter";
import { StockCard } from "../../ui/components/StockCard";
import { STOCKS, byTicker } from "../../ui/data/stocks";
import { useRound } from "../hooks";
import { LeagueBoard } from "./league";
import { useLive } from "./landing";

const FRAUNCES = "'Fraunces', serif";
const CLASH = "'Clash Display', sans-serif";

const SECTIONS = [
  { id: "how", label: "How it works" },
  { id: "median", label: "The median" },
  { id: "week", label: "This week" },
  { id: "assets", label: "Assets" },
  { id: "agents", label: "Agents" },
];

// ── helpers ──────────────────────────────────────────────────────────────────

function useNow(every = 1000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(t);
  }, [every]);
  return now;
}

function until(target: number, now: number) {
  const s = Math.max(0, Math.floor(target - now / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m ${s % 60}s`;
}

function Eyebrow({ children, color = "var(--color-new-purple)" }: { children: React.ReactNode; color?: string }) {
  return (
    <p className="inline-flex items-center gap-2" style={{ fontFamily: CLASH, fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {children}
    </p>
  );
}

// ── nav ──────────────────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Highlight the section under the middle of the screen (none between them).
  useEffect(() => {
    const on = () => {
      const mid = window.innerHeight * 0.45;
      const hit = SECTIONS.find((s) => {
        const r = document.getElementById(s.id)?.getBoundingClientRect();
        return r && r.top <= mid && r.bottom > mid;
      });
      setActive(hit?.id ?? null);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <header
      className="fixed inset-x-0 top-0 z-50"
      style={{
        background: scrolled ? "rgba(0,0,0,0.94)" : "transparent",
        borderBottom: `1px solid ${scrolled ? "rgba(255,255,255,0.08)" : "transparent"}`,
        backdropFilter: scrolled ? "blur(20px) saturate(1.4)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(20px) saturate(1.4)" : "none",
        transition: "background .4s ease, border-color .4s ease",
      }}
    >
      <nav className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
        <a href="#top" onClick={go("top")} aria-label="Profit Markets, top of page">
          <ProfitMark tone="white" size={24} />
        </a>
        <div className="hidden items-center gap-9 lg:flex">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={go(s.id)}
              className="relative py-1 transition-colors hover:text-white"
              style={{ fontFamily: CLASH, fontSize: "0.86rem", fontWeight: 500, color: active === s.id ? "#FFFFFF" : "rgba(255,255,255,0.6)" }}
            >
              {s.label}
              <span
                aria-hidden
                className="absolute -bottom-1 left-0 h-px w-full origin-left"
                style={{ background: "#FFFFFF", transform: `scaleX(${active === s.id ? 1 : 0})`, transition: "transform .4s cubic-bezier(0.22, 1, 0.36, 1)" }}
              />
            </a>
          ))}
        </div>
        <Button3D color="green" onClick={() => router.push("/create")}>
          Play
        </Button3D>
      </nav>
    </header>
  );
}

// ── hero ─────────────────────────────────────────────────────────────────────

const HERO_CARDS = ["NVDA", "TSLA", "BTC", "AAPL", "AMZN", "ETH", "META"];

function Hero() {
  const router = useRouter();
  const { prices, changes } = useLive();
  const cards = HERO_CARDS.map((t) => byTicker(t)!).filter(Boolean);
  return (
    <section id="top" className="relative overflow-hidden" style={{ background: "#000000" }}>
      <div aria-hidden className="glow-drift pointer-events-none absolute rounded-full" style={{ width: 760, height: 760, left: "-14%", top: "-30%", background: "var(--color-new-purple)", filter: "blur(180px)", opacity: 0.38 }} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(ellipse 60% 55% at 65% 50%, black 15%, transparent 72%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 55% at 65% 50%, black 15%, transparent 72%)",
        }}
      />

      <div className="relative mx-auto grid max-w-[1240px] grid-cols-[minmax(0,1fr)] items-center gap-14 px-5 pb-24 pt-32 sm:px-8 lg:h-[100svh] lg:max-h-[960px] lg:min-h-[640px] lg:grid-cols-[1.1fr_1fr] lg:py-0">
        <div>
          <h1 style={{ fontFamily: FRAUNCES, color: "#FFFFFF", fontSize: "clamp(3.6rem, 9vw, 8.4rem)", fontWeight: 700, letterSpacing: "-0.045em", lineHeight: 0.88 }}>
            <RevealWords text="Profit" delay={150} stagger={160} />
            <br />
            <span style={{ fontStyle: "italic", fontWeight: 400 }}>
              <RevealWords text="Markets." delay={350} stagger={160} />
            </span>
          </h1>
          <Reveal delay={700} duration={1200}>
            <p className="mt-8 max-w-[26ch]" style={{ fontFamily: FRAUNCES, fontStyle: "italic", fontSize: "clamp(1.25rem, 2vw, 1.6rem)", color: "rgba(255,255,255,0.7)", lineHeight: 1.3 }}>
              Build an ETF from real stocks. Beat the median. Get paid Friday.
            </p>
          </Reveal>
          <Reveal delay={900} duration={1200}>
            <div className="mt-10">
              <Button3D color="green" size="lg" onClick={() => router.push("/create")}>
                Build your ETF
              </Button3D>
            </div>
          </Reveal>
        </div>

        <Reveal delay={400} duration={1400} from="none">
          <div className="relative flex justify-center lg:justify-end">
            <div className="hidden lg:block">
              <CardStack stocks={cards} prices={prices} changes={changes} scale={1.15} />
            </div>
            <div className="lg:hidden">
              <CardStack stocks={cards} prices={prices} changes={changes} scale={0.92} spread={0.5} />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ── statement: words light up as it scrolls by ───────────────────────────────

const STATEMENT =
  "Every week, the top half of the league gets paid by the bottom half. No house bets against you. Your stocks are only borrowed for the week, and they always come home.";

function Statement() {
  const ref = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    const on = () => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const vh = window.innerHeight;
      setP(Math.min(1, Math.max(0, (vh * 0.8 - r.top) / (r.height + vh * 0.25))));
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, []);
  const words = STATEMENT.split(" ");
  const lit = p * words.length * 1.1;
  return (
    <section className="relative rounded-t-[40px]" style={{ background: "var(--color-pitch-cream)", marginTop: -40, zIndex: 2 }}>
      <div ref={ref} className="mx-auto max-w-[1240px] px-5 py-28 sm:px-8 md:py-40">
        <Eyebrow>Why it works</Eyebrow>
        <p className="mt-8 max-w-[22ch]" style={{ fontFamily: FRAUNCES, fontSize: "clamp(2.1rem, 5vw, 4.4rem)", fontWeight: 600, letterSpacing: "-0.035em", lineHeight: 1.06 }}>
          {words.map((w, i) => (
            <span key={i} style={{ color: i < lit ? "var(--color-ink)" : "rgba(17,18,16,0.14)", transition: "color .35s ease" }}>
              {w}{" "}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}

// ── how it works ─────────────────────────────────────────────────────────────

function MiniHand() {
  const t = ["NVDA", "TSLA", "SPY"].map((x) => byTicker(x)!);
  return (
    <div className="flex items-end justify-center" style={{ height: 110 }}>
      {t.map((s, i) => (
        <div key={s.ticker} style={{ margin: "0 -8px", transform: `rotate(${(i - 1) * 9}deg) translateY(${Math.abs(i - 1) * 8}px)`, zIndex: i === 1 ? 2 : 1 }}>
          <StockCard stock={s} size="tiny64" weightPct={[40, 35, 25][i]} />
        </div>
      ))}
    </div>
  );
}

function MiniTicket() {
  return (
    <div className="flex items-center justify-center" style={{ height: 110 }}>
      <div className="relative flex items-center gap-4 rounded-[16px] px-5 py-4" style={{ background: "var(--color-ink)", color: "#FFFFFF", transform: "rotate(-4deg)" }}>
        <span className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full" style={{ background: "#FFFFFF" }} />
        <span className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full" style={{ background: "#FFFFFF" }} />
        <div>
          <p style={{ fontFamily: CLASH, fontSize: "0.6rem", letterSpacing: "0.18em", color: "rgba(255,255,255,0.5)" }}>TICKET · WEEK</p>
          <p style={{ fontFamily: FRAUNCES, fontSize: "1.8rem", fontWeight: 700, lineHeight: 1 }}>$5</p>
        </div>
        <span className="h-10 border-l border-dashed" style={{ borderColor: "rgba(255,255,255,0.25)" }} />
        <p style={{ fontFamily: CLASH, fontSize: "0.7rem", color: "var(--color-kickoff-green)" }}>
          USDG
          <br />
          earning
        </p>
      </div>
    </div>
  );
}

function MiniBars() {
  const bars = [62, 48, 40, 28, 18];
  return (
    <div className="relative flex items-end justify-center gap-2.5" style={{ height: 110 }}>
      {bars.map((b, i) => (
        <span key={i} className="w-7 rounded-t-[8px]" style={{ height: b * 1.4, background: i < 2 ? "var(--color-kickoff-green)" : i === 2 ? "var(--color-new-purple)" : "rgba(17,18,16,0.12)" }} />
      ))}
      <span className="absolute inset-x-6 border-t-2 border-dashed" style={{ bottom: 40 * 1.4, borderColor: "var(--color-new-purple)" }} />
    </div>
  );
}

function MiniPayout() {
  return (
    <div className="flex flex-col items-center justify-center gap-2" style={{ height: 110 }}>
      <div className="rounded-full px-4 py-2" style={{ background: "rgba(0,200,5,0.14)", fontFamily: CLASH, fontSize: "0.85rem", fontWeight: 600, color: "var(--color-kickoff-green-deep)" }}>
        + $11.40 USDG
      </div>
      <div className="rounded-full px-4 py-2" style={{ background: "rgba(17,18,16,0.06)", fontFamily: CLASH, fontSize: "0.85rem", fontWeight: 500, color: "rgba(17,18,16,0.6)" }}>
        NVDA · TSLA · SPY returned
      </div>
    </div>
  );
}

const STEPS = [
  { n: "01", title: "Pick your stocks", body: "3 to 10 Robinhood Stock Tokens, plus BTC and ETH up to 20%. Set the weights and name your ETF.", art: <MiniHand /> },
  { n: "02", title: "Lock them for the week", body: "Your basket (at least $10) and a $5 ticket go into the league contract. Tickets earn interest while they wait.", art: <MiniTicket /> },
  { n: "03", title: "Beat the median", body: "Every ETF is scored by its real return, priced by Chainlink. The middle one is the MEDIAN. Finish above it.", art: <MiniBars /> },
  { n: "04", title: "Get paid Friday", body: "At the close, winners split the tickets below the median, and every basket goes back to its owner.", art: <MiniPayout /> },
];

function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20" style={{ background: "var(--color-pitch-cream)" }}>
      <div className="mx-auto max-w-[1240px] px-5 pb-28 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 style={{ fontFamily: FRAUNCES, fontSize: "clamp(2.4rem, 5vw, 4rem)", fontWeight: 600, letterSpacing: "-0.035em", lineHeight: 1, color: "var(--color-ink)" }}>
            Four steps,
            <br />
            <span style={{ fontStyle: "italic", fontWeight: 400 }}>one week.</span>
          </h2>
          <p className="max-w-[40ch]" style={{ fontFamily: CLASH, fontSize: "0.98rem", lineHeight: 1.6, color: "rgba(17,18,16,0.6)" }}>
            Entries close Monday at the opening bell. Prices run all week. On Friday at the close, the league settles itself.
          </p>
        </div>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 110}>
              <div className="group flex h-full flex-col rounded-[28px] p-6 transition-transform duration-500 hover:-translate-y-1.5" style={{ background: "#FFFFFF", boxShadow: "0 1px 0 rgba(17,18,16,0.04), 0 18px 40px -24px rgba(17,18,16,0.25)" }}>
                <div className="rounded-[20px]" style={{ background: "var(--color-canvas)" }}>
                  {s.art}
                </div>
                <p className="mt-6" style={{ fontFamily: CLASH, fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.14em", color: "var(--color-new-purple)" }}>
                  {s.n}
                </p>
                <h3 className="mt-2" style={{ fontFamily: FRAUNCES, fontSize: "1.45rem", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--color-ink)" }}>
                  {s.title}
                </h3>
                <p className="mt-2" style={{ fontFamily: CLASH, fontSize: "0.9rem", lineHeight: 1.6, color: "rgba(17,18,16,0.58)" }}>
                  {s.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── the median rule ──────────────────────────────────────────────────────────

const LADDER = [
  { name: "AI Chips Max", ret: 4.2 },
  { name: "Everyday Giants", ret: 2.1 },
  { name: "Steady Index", ret: 1.3, draw: true },
  { name: "Fintech Rails", ret: 0.4 },
  { name: "Speed & Crypto", ret: -1.9 },
];

function Ladder() {
  return (
    <ul className="space-y-2">
      {LADDER.map((r, i) => {
        const win = r.ret > 1.3;
        return (
          <Reveal key={r.name} delay={i * 90} from="right">
            {r.draw && (
              <li className="mb-2 flex items-center gap-3">
                <span className="flex-1 border-t-2 border-dashed" style={{ borderColor: "rgba(255,255,255,0.7)" }} />
                <span style={{ fontFamily: CLASH, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.18em", color: "#FFFFFF" }}>MEDIAN +1.3%</span>
                <span className="flex-1 border-t-2 border-dashed" style={{ borderColor: "rgba(255,255,255,0.7)" }} />
              </li>
            )}
            <li
              className="flex items-center justify-between rounded-[16px] px-4 py-3"
              style={{ background: win ? "#FFFFFF" : r.draw ? "rgba(255,255,255,0.22)" : "rgba(17,18,16,0.22)", color: win ? "var(--color-ink)" : "#FFFFFF" }}
            >
              <span style={{ fontFamily: CLASH, fontWeight: 600, fontSize: "0.92rem" }}>{r.name}</span>
              <span className="t-num" style={{ fontSize: "0.85rem", fontWeight: 700, color: win ? "var(--color-kickoff-green-deep)" : "rgba(255,255,255,0.85)" }}>
                {r.ret > 0 ? "+" : ""}
                {r.ret.toFixed(1)}% · {win ? "wins" : r.draw ? "ticket back" : "loses ticket"}
              </span>
            </li>
          </Reveal>
        );
      })}
    </ul>
  );
}

function MedianRule() {
  const rows = [
    { k: "Above the median", v: "Win a share of the tickets below, sized by your stake and how close you came to the best ETF." },
    { k: "On the median", v: "A draw. Your ticket comes back." },
    { k: "Below the median", v: "Your ticket goes into the pot." },
    { k: "Your stocks", v: "Always come back, win or lose." },
  ];
  return (
    <section id="median" className="scroll-mt-20" style={{ background: "var(--color-pitch-cream)" }}>
      <div className="mx-auto grid max-w-[1240px] gap-4 px-5 pb-28 sm:px-8 lg:grid-cols-2">
        <div className="flex flex-col justify-between rounded-[32px] p-8 sm:p-10" style={{ background: "#FFFFFF" }}>
          <div>
            <Eyebrow>The rule</Eyebrow>
            <h2 className="mt-5" style={{ fontFamily: FRAUNCES, fontSize: "clamp(2.2rem, 4.2vw, 3.4rem)", fontWeight: 600, letterSpacing: "-0.035em", lineHeight: 1.02, color: "var(--color-ink)" }}>
              You don&rsquo;t have to beat the market.
              <span style={{ fontStyle: "italic", fontWeight: 400, color: "rgba(17,18,16,0.45)" }}> Just the median.</span>
            </h2>
            <p className="mt-5 max-w-[46ch]" style={{ fontFamily: CLASH, fontSize: "0.95rem", lineHeight: 1.65, color: "rgba(17,18,16,0.6)" }}>
              MEDIAN is a ghost team whose return is the middle ETF&rsquo;s. Half the league finishes above it every week, whether the market is up or down.
            </p>
          </div>
          <dl className="mt-10">
            {rows.map((r) => (
              <div key={r.k} className="grid gap-1 border-t py-4 sm:grid-cols-[180px_1fr] sm:gap-6" style={{ borderColor: "rgba(17,18,16,0.08)" }}>
                <dt style={{ fontFamily: CLASH, fontSize: "0.9rem", fontWeight: 600, color: "var(--color-ink)" }}>{r.k}</dt>
                <dd style={{ fontFamily: CLASH, fontSize: "0.9rem", lineHeight: 1.55, color: "rgba(17,18,16,0.58)" }}>{r.v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div
          className="relative overflow-hidden rounded-[32px] p-8 sm:p-10"
          style={{ background: "radial-gradient(100% 80% at 100% 0%, color-mix(in oklab, var(--color-new-purple) 72%, #FFFFFF) 0%, var(--color-new-purple) 45%, var(--color-new-purple-deep) 100%)" }}
        >
          <div aria-hidden className="pointer-events-none absolute rounded-full" style={{ width: 360, height: 360, right: -80, bottom: -120, background: "var(--color-kickoff-green)", filter: "blur(130px)", opacity: 0.3 }} />
          <div className="relative">
            <div className="flex items-center justify-between">
              <p style={{ fontFamily: CLASH, fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.75)" }}>A week, settled</p>
              <p className="rounded-full px-3 py-1" style={{ fontFamily: CLASH, fontSize: "0.72rem", color: "#FFFFFF", background: "rgba(255,255,255,0.14)" }}>
                Fri 4:00pm ET
              </p>
            </div>
            <div className="mt-8">
              <Ladder />
            </div>
            <p className="mt-8" style={{ fontFamily: CLASH, fontSize: "0.82rem", lineHeight: 1.6, color: "rgba(255,255,255,0.7)" }}>
              With an odd number of ETFs the middle one draws. With an even number, MEDIAN sits halfway between the two middle ones.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── the week: a black inset panel with the timeline and the live round ───────

function Week() {
  const { data: r } = useRound();
  const now = useNow(30_000);
  const router = useRouter();
  const stage = !r ? -1 : r.phase === "entries-open" ? 0 : r.phase === "running" ? 2 : 3;
  const steps = [
    { day: "Fri 4:00pm", title: "Entries open", body: "Right after last week settles." },
    { day: "Mon 9:30am", title: "Entries close", body: "Start prices at the opening bell." },
    { day: "Mon–Fri", title: "The week runs", body: "Tickets earn in the savings vault." },
    { day: "Fri 4:00pm", title: "Settled & paid", body: "Winners paid, baskets home." },
  ];
  return (
    <section id="week" className="scroll-mt-20 px-3 sm:px-4" style={{ background: "var(--color-pitch-cream)" }}>
      <div className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[36px]" style={{ background: "#000000" }}>
        <div aria-hidden className="pointer-events-none absolute rounded-full" style={{ width: 640, height: 640, left: "30%", top: -380, background: "var(--color-new-purple)", filter: "blur(160px)", opacity: 0.3 }} />
        <div className="relative mx-auto max-w-[1240px] px-5 py-20 sm:px-8 md:py-24">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <Eyebrow color="var(--color-kickoff-green)">The week</Eyebrow>
              <h2 className="mt-5" style={{ fontFamily: FRAUNCES, fontSize: "clamp(2.3rem, 4.6vw, 3.8rem)", fontWeight: 600, letterSpacing: "-0.035em", lineHeight: 1, color: "#FFFFFF" }}>
                One round a week.
                <br />
                <span style={{ fontStyle: "italic", fontWeight: 400, color: "rgba(255,255,255,0.55)" }}>It runs itself.</span>
              </h2>
            </div>
            <p className="max-w-[38ch]" style={{ fontFamily: CLASH, fontSize: "0.95rem", lineHeight: 1.6, color: "rgba(255,255,255,0.55)" }}>
              On the US market&rsquo;s clock (New York time). Nobody presses a button: the keeper opens, prices, settles and pays, every week, and publishes every input.
            </p>
          </div>

          <ol className="relative mt-16 grid gap-8 md:grid-cols-4 md:gap-4">
            <span aria-hidden className="absolute left-0 right-0 top-[7px] hidden h-px md:block" style={{ background: "rgba(255,255,255,0.12)" }} />
            <span
              aria-hidden
              className="absolute left-0 top-[7px] hidden h-px md:block"
              style={{ width: `${stage < 0 ? 0 : (stage / 3) * 100}%`, background: "var(--color-kickoff-green)", boxShadow: "0 0 12px var(--color-kickoff-green)", transition: "width 1.2s ease" }}
            />
            {steps.map((s, i) => {
              const on = i === stage || (stage === 0 && i === 0);
              return (
                <li key={s.title} className="relative">
                  <span
                    className={`relative z-[1] block h-[15px] w-[15px] rounded-full ${on ? "live-dot" : ""}`}
                    style={{ background: i <= stage ? "var(--color-kickoff-green)" : "#000000", border: `2px solid ${i <= stage ? "var(--color-kickoff-green)" : "rgba(255,255,255,0.25)"}` }}
                  />
                  <p className="mt-5" style={{ fontFamily: CLASH, fontSize: "0.75rem", letterSpacing: "0.12em", textTransform: "uppercase", color: on ? "var(--color-kickoff-green)" : "rgba(255,255,255,0.45)" }}>
                    {s.day}
                    {on && " · now"}
                  </p>
                  <p className="mt-2" style={{ fontFamily: FRAUNCES, fontSize: "1.35rem", fontWeight: 600, color: "#FFFFFF" }}>
                    {s.title}
                  </p>
                  <p className="mt-1" style={{ fontFamily: CLASH, fontSize: "0.88rem", color: "rgba(255,255,255,0.5)" }}>
                    {s.body}
                  </p>
                </li>
              );
            })}
          </ol>

          <div className="mt-16 rounded-[28px] p-2 sm:p-3" style={{ background: "var(--color-pitch-cream)" }}>
            <div className="flex flex-wrap items-center justify-between gap-4 px-4 pb-3 pt-3 sm:px-5">
              <p style={{ fontFamily: FRAUNCES, fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--color-ink)" }}>
                {r ? `Week ${r.id}` : "This week"}&rsquo;s league
              </p>
              <Link href="/league" className="btn-3d btn-ghost inline-flex h-10 items-center px-5 text-[0.875rem]">
                Full table →
              </Link>
            </div>
            {r && r.teams.length === 0 ? (
              <div className="flex flex-col items-center gap-5 rounded-[22px] px-6 py-14 text-center" style={{ background: "#FFFFFF" }}>
                <p style={{ fontFamily: FRAUNCES, fontSize: "1.6rem", fontWeight: 600, color: "var(--color-ink)" }}>No ETFs yet this week. Be the first.</p>
                <p style={{ fontFamily: CLASH, fontSize: "0.92rem", color: "rgba(17,18,16,0.55)" }}>
                  Entries close {r.phase === "entries-open" && now ? `in ${until(r.entryClose, now)}` : "Monday at 9:30am ET"}.
                </p>
                <Button3D color="purple" onClick={() => router.push("/create")}>
                  Build the first ETF
                </Button3D>
              </div>
            ) : (
              <LeagueBoard limit={6} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── assets ───────────────────────────────────────────────────────────────────

function LogoRow({ list, reverse = false }: { list: typeof STOCKS; reverse?: boolean }) {
  const row = (copy: number) => (
    <div key={copy} aria-hidden={copy === 1} className="flex items-center" style={{ gap: 14, paddingRight: 14 }}>
      {list.map((s) => (
        <Link
          key={`${copy}-${s.ticker}`}
          href={`/create?add=${s.ticker}`}
          tabIndex={copy === 1 ? -1 : 0}
          className="flex shrink-0 items-center gap-3 rounded-full py-2 pl-2 pr-5 transition-transform hover:-translate-y-0.5"
          style={{ background: "#FFFFFF", boxShadow: "0 10px 30px -18px rgba(17,18,16,0.35)" }}
        >
          <img src={s.logo} alt={copy === 0 ? s.name : ""} loading="lazy" width={34} height={34} className="rounded-full" />
          <span style={{ fontFamily: CLASH, fontSize: "0.85rem", fontWeight: 600, color: "var(--color-ink)" }}>{s.ticker}</span>
          {s.kind === "crypto" && (
            <span className="rounded-full px-2 py-0.5" style={{ fontFamily: CLASH, fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.1em", color: "var(--color-new-purple)", background: "rgba(123,98,246,0.12)" }}>
              CRYPTO
            </span>
          )}
        </Link>
      ))}
    </div>
  );
  return (
    <div className="relative overflow-hidden py-2">
      <div className={`marquee-track ${reverse ? "marquee-reverse" : ""}`}>{[0, 1].map(row)}</div>
    </div>
  );
}

function Assets() {
  const half = Math.ceil(STOCKS.length / 2);
  const a = STOCKS.slice(0, half);
  const b = [...STOCKS.slice(half)];
  return (
    <section id="assets" className="scroll-mt-20 overflow-hidden" style={{ background: "var(--color-pitch-cream)" }}>
      <div className="mx-auto grid max-w-[1240px] gap-8 px-5 pb-14 pt-28 sm:px-8 md:grid-cols-[1.2fr_1fr] md:items-end">
        <h2 style={{ fontFamily: FRAUNCES, fontSize: "clamp(2.4rem, 5vw, 4rem)", fontWeight: 600, letterSpacing: "-0.035em", lineHeight: 1, color: "var(--color-ink)" }}>
          {STOCKS.length} assets.
          <br />
          <span style={{ fontStyle: "italic", fontWeight: 400 }}>Your basket.</span>
        </h2>
        <p style={{ fontFamily: CLASH, fontSize: "0.98rem", lineHeight: 1.65, color: "rgba(17,18,16,0.6)" }}>
          Every Robinhood Stock Token with a Chainlink price feed (NVIDIA to the S&amp;P 500, silver to treasuries), plus BTC and ETH for up to a fifth of your basket. Prices
          include reinvested dividends.
        </p>
      </div>
      <div className="relative space-y-3 pb-28">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-[2] w-24" style={{ background: "linear-gradient(to right, var(--color-pitch-cream), transparent)" }} />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-[2] w-24" style={{ background: "linear-gradient(to left, var(--color-pitch-cream), transparent)" }} />
        <LogoRow list={a} />
        <LogoRow list={b} reverse />
      </div>
    </section>
  );
}

// ── agents ───────────────────────────────────────────────────────────────────

function Agents() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? "/api/mcp" : `${window.location.origin}/api/mcp`;
  return (
    <section id="agents" className="scroll-mt-20 px-3 sm:px-4" style={{ background: "var(--color-pitch-cream)" }}>
      <div className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[36px]" style={{ background: "#000000" }}>
        <div aria-hidden className="pointer-events-none absolute rounded-full" style={{ width: 520, height: 520, right: -120, top: -200, background: "var(--color-kickoff-green)", filter: "blur(170px)", opacity: 0.2 }} />
        <div className="relative mx-auto grid max-w-[1240px] items-center gap-12 px-5 py-20 sm:px-8 md:py-24 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <Eyebrow color="var(--color-kickoff-green)">Agents</Eyebrow>
            <h2 className="mt-5" style={{ fontFamily: FRAUNCES, fontSize: "clamp(2.3rem, 4.6vw, 3.6rem)", fontWeight: 600, letterSpacing: "-0.035em", lineHeight: 1.02, color: "#FFFFFF" }}>
              Let your agent
              <br />
              <span style={{ fontStyle: "italic", fontWeight: 400, color: "rgba(255,255,255,0.6)" }}>build the ETF.</span>
            </h2>
            <p className="mt-5 max-w-[44ch]" style={{ fontFamily: CLASH, fontSize: "0.95rem", lineHeight: 1.65, color: "rgba(255,255,255,0.55)" }}>
              Connect Claude, ChatGPT or your own agent to our MCP server. It reads the league, plans a basket and prepares every transaction. You sign. Your keys never leave your
              wallet.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button3D color="green" onClick={() => router.push("/agents")}>
                Agent setup
              </Button3D>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="rounded-[12px] px-4 py-2.5 text-left transition-colors hover:bg-white/10"
                style={{ fontFamily: "var(--font-jbmono), monospace", fontSize: "0.8rem", color: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.14)" }}
              >
                {copied ? "Copied ✓" : "…/api/mcp  ⧉"}
              </button>
            </div>
          </div>
          <div className="rounded-[24px] p-1.5" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="rounded-[20px] p-6" style={{ background: "#111210", fontFamily: "var(--font-jbmono), monospace", fontSize: "0.82rem", lineHeight: 1.75 }}>
              <div className="mb-5 flex gap-1.5">
                {[0, 1, 2].map((c) => (
                  <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.22)" }} />
                ))}
              </div>
              <p style={{ color: "rgba(255,255,255,0.45)" }}>you</p>
              <p style={{ color: "#FFFFFF" }}>Build me an AI-chips ETF with a bit of ETH and enter it.</p>
              <p className="mt-4" style={{ color: "var(--color-kickoff-green)" }}>agent · profit-markets</p>
              <p style={{ color: "rgba(255,255,255,0.75)" }}>
                get_round → week open, entries close Mon 9:30am ET
                <br />
                plan_lock → NVDA 30% · AMD 25% · TSM 25% · ETH 20%
                <br />
                ETF &ldquo;Silicon &amp; Ether&rdquo; · 3 transactions to sign
              </p>
              <p className="mt-4" style={{ color: "rgba(255,255,255,0.45)" }}>
                waiting for your wallet<span className="caret">▍</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── trust ────────────────────────────────────────────────────────────────────

function Trust() {
  const items = [
    { t: "Your stocks come home", b: "Baskets are only locked for the week and always go back to their owners. Nobody can move them anywhere else." },
    { t: "Every result checks out", b: "The keeper publishes every price and entry; their hash goes on-chain with the payouts. Re-run any week yourself." },
    { t: "Nobody can stall it", b: "If a week is never settled, anyone can void it after three days and everyone gets their stake back." },
  ];
  return (
    <section style={{ background: "var(--color-pitch-cream)" }}>
      <div className="mx-auto grid max-w-[1240px] gap-12 px-5 py-28 sm:px-8 lg:grid-cols-[1fr_2.2fr]">
        <div>
          <h2 style={{ fontFamily: FRAUNCES, fontSize: "clamp(2.2rem, 4vw, 3.2rem)", fontWeight: 600, letterSpacing: "-0.035em", lineHeight: 1, color: "var(--color-ink)" }}>
            Peer to peer.
            <br />
            <span style={{ fontStyle: "italic", fontWeight: 400 }}>No house.</span>
          </h2>
          <Link href="/rules#verify" className="mt-6 inline-block" style={{ fontFamily: CLASH, fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-new-purple)" }}>
            Verify a round →
          </Link>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          {items.map((i) => (
            <div key={i.t} className="border-t pt-5" style={{ borderColor: "rgba(17,18,16,0.85)" }}>
              <p style={{ fontFamily: FRAUNCES, fontSize: "1.25rem", fontWeight: 600, color: "var(--color-ink)" }}>{i.t}</p>
              <p className="mt-2" style={{ fontFamily: CLASH, fontSize: "0.9rem", lineHeight: 1.6, color: "rgba(17,18,16,0.58)" }}>
                {i.b}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Landing() {
  return (
    <div style={{ background: "var(--color-pitch-cream)", overflowX: "clip" }}>
      <Navbar />
      <Hero />
      <Statement />
      <HowItWorks />
      <MedianRule />
      <Week />
      <Assets />
      <Agents />
      <Trust />
      <div style={{ ["--bg" as string]: "var(--color-pitch-cream)" }}>
        <SiteFooter />
      </div>
    </div>
  );
}
