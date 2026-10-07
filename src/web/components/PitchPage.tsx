"use client";

// The pitch: one page for judges and investors, in the landing page's brand.
// Every claim here is something the repo ships today; the money at scale is
// labelled as an illustrative model, not traction.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button3D } from "../../ui/brand/Button3D";
import { ProfitMark } from "../../ui/brand/ProfitMark";
import { Reveal, RevealWords } from "../../ui/brand/Reveal";
import { CardStack } from "../../ui/components/CardStack";
import { SiteFooter } from "../../ui/components/SiteFooter";
import { byTicker } from "../../ui/data/stocks";
import { useLive } from "./landing";

const FRAUNCES = "'Fraunces', serif";
const CLASH = "'Clash Display', sans-serif";
const ESCROW = "0xcd17bd5ac4d7c709bbf92399a4d2af34d2b3a8cf";

function Eyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  const color = dark ? "var(--color-kickoff-green)" : "var(--color-new-purple)";
  return (
    <p className="inline-flex items-center gap-2" style={{ fontFamily: CLASH, fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {children}
    </p>
  );
}

function H2({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <h2 className="mt-4" style={{ fontFamily: FRAUNCES, fontSize: "clamp(2.2rem, 4.4vw, 3.6rem)", fontWeight: 600, letterSpacing: "-0.035em", lineHeight: 1.02, color: dark ? "#FFFFFF" : "var(--color-ink)" }}>
      {children}
    </h2>
  );
}

const body = (dark = false): React.CSSProperties => ({ fontFamily: CLASH, fontSize: "1rem", lineHeight: 1.65, color: dark ? "rgba(255,255,255,0.66)" : "rgba(17,18,16,0.62)" });

function Section({ id, dark = false, children }: { id?: string; dark?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} style={{ background: dark ? "#000000" : "var(--color-pitch-cream)" }}>
      <div className="mx-auto max-w-[1240px] px-5 py-24 sm:px-8 md:py-32">{children}</div>
    </section>
  );
}

const HERO_CARDS = ["NVDA", "TSLA", "BTC", "AAPL", "AMZN", "ETH", "META"];

function Hero() {
  const router = useRouter();
  const { prices, changes } = useLive();
  const cards = HERO_CARDS.map((t) => byTicker(t)!).filter(Boolean);
  return (
    <section className="relative overflow-hidden" style={{ background: "#000000" }}>
      <div aria-hidden className="glow-drift pointer-events-none absolute rounded-full" style={{ width: 760, height: 760, left: "-14%", top: "-30%", background: "var(--color-new-purple)", filter: "blur(180px)", opacity: 0.38 }} />
      <header className="relative mx-auto flex max-w-[1240px] items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" aria-label="Profit Markets home">
          <ProfitMark tone="white" size={24} />
        </Link>
        <span style={{ fontFamily: CLASH, fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)" }}>Pitch · Colosseum, Robinhood Chain track</span>
      </header>
      <div className="relative mx-auto grid max-w-[1240px] grid-cols-[minmax(0,1fr)] items-center gap-14 px-5 pb-24 pt-10 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:pb-32 lg:pt-16">
        <div>
          <Eyebrow dark>A new mode of Kickoff</Eyebrow>
          <h1 className="mt-6" style={{ fontFamily: FRAUNCES, color: "#FFFFFF", fontSize: "clamp(3rem, 7vw, 6.4rem)", fontWeight: 700, letterSpacing: "-0.045em", lineHeight: 0.92 }}>
            <RevealWords text="Fantasy league," delay={100} stagger={120} />
            <br />
            <span style={{ fontStyle: "italic", fontWeight: 400 }}>
              <RevealWords text="real stocks." delay={400} stagger={120} />
            </span>
          </h1>
          <Reveal delay={700} duration={1200}>
            <p className="mt-8 max-w-[34ch]" style={{ fontFamily: FRAUNCES, fontStyle: "italic", fontSize: "clamp(1.2rem, 1.9vw, 1.5rem)", color: "rgba(255,255,255,0.72)", lineHeight: 1.35 }}>
              Build an ETF from real Robinhood Stock Tokens, lock it for the week with a $5 ticket, and finish above the median to get paid on Friday.
            </p>
          </Reveal>
          <Reveal delay={900} duration={1200}>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button3D color="green" size="lg" onClick={() => router.push("/create")}>
                Try it on testnet
              </Button3D>
              <Button3D color="purple" size="lg" onClick={() => document.getElementById("model")?.scrollIntoView({ behavior: "smooth" })}>
                The business
              </Button3D>
            </div>
          </Reveal>
        </div>
        <Reveal delay={400} duration={1400} from="none">
          <div className="relative flex justify-center lg:justify-end">
            <div className="hidden lg:block">
              <CardStack stocks={cards} prices={prices} changes={changes} scale={1.1} />
            </div>
            <div className="lg:hidden">
              <CardStack stocks={cards} prices={prices} changes={changes} scale={0.9} spread={0.5} />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Problem() {
  const items = [
    { k: "Investing apps", t: "Built for going it alone.", b: "You, a chart, and silence. Being right about a stock earns you nothing extra, and nobody sees it." },
    { k: "Fantasy leagues", t: "Social, and fun.", b: "But you never own the players. The picks aren’t assets, and the house sets the odds." },
  ];
  return (
    <Section>
      <Eyebrow>The problem</Eyebrow>
      <H2>
        Everyone has a stock pick. <span style={{ fontStyle: "italic", fontWeight: 400 }}>Nobody gets paid for being right.</span>
      </H2>
      <div className="mt-14 grid gap-6 md:grid-cols-2">
        {items.map((i) => (
          <Reveal key={i.k}>
            <div className="h-full rounded-[32px] p-8 md:p-10" style={{ background: "var(--color-canvas)" }}>
              <p style={{ fontFamily: CLASH, fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(17,18,16,0.5)" }}>{i.k}</p>
              <p className="mt-3" style={{ fontFamily: FRAUNCES, fontSize: "1.9rem", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--color-ink)" }}>{i.t}</p>
              <p className="mt-3" style={body()}>{i.b}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function Product() {
  const steps = [
    { n: "01", t: "Pick real stocks", b: "3 to 10 Robinhood Stock Tokens, plus up to 20% in BTC and ETH. 37 assets, each scored by its own Chainlink feed." },
    { n: "02", t: "Lock it with $5", b: "The basket and a $5 USDG ticket go into the league contract for the week. The basket always comes back." },
    { n: "03", t: "Beat the median", b: "Finish above the median by Friday’s close and win a share of the tickets below it. Exactly on it: your ticket comes back." },
  ];
  return (
    <Section dark>
      <Eyebrow dark>The product</Eyebrow>
      <H2 dark>
        Three steps. <span style={{ fontStyle: "italic", fontWeight: 400 }}>One week.</span>
      </H2>
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {steps.map((s) => (
          <Reveal key={s.n}>
            <div className="h-full rounded-[32px] border p-8" style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}>
              <p style={{ fontFamily: "var(--font-jbmono), monospace", color: "var(--color-kickoff-green)" }}>{s.n}</p>
              <p className="mt-4" style={{ fontFamily: FRAUNCES, fontSize: "1.7rem", fontWeight: 600, color: "#FFFFFF" }}>{s.t}</p>
              <p className="mt-3" style={body(true)}>{s.b}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Reveal>
          <div className="h-full rounded-[32px] p-8" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <p style={{ fontFamily: FRAUNCES, fontSize: "1.4rem", fontWeight: 600, color: "#FFFFFF" }}>Tickets earn while you wait</p>
            <p className="mt-2" style={body(true)}>Once entries close, the round’s tickets sit in a USDG savings vault (Robinhood Earn on mainnet). The interest goes into the winners’ pot. Locked stocks never move.</p>
          </div>
        </Reveal>
        <Reveal>
          <div className="h-full rounded-[32px] p-8" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <p style={{ fontFamily: FRAUNCES, fontSize: "1.4rem", fontWeight: 600, color: "#FFFFFF" }}>Bring your own agent</p>
            <p className="mt-2" style={body(true)}>An MCP server lets Claude, ChatGPT or any agent read the league, build an ETF and back a team. The agent prepares every transaction; the user’s wallet signs.</p>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

function Live() {
  const facts = [
    { v: "Live", k: "on Robinhood Chain testnet, running weekly by itself" },
    { v: "44", k: "contract tests, incl. a mainnet fork with real Stock Tokens" },
    { v: "37", k: "assets: Robinhood Stock Tokens, funds, BTC and ETH" },
    { v: "100%", k: "of results verifiable: inputs published, hash on-chain" },
  ];
  return (
    <Section>
      <Eyebrow>What’s live</Eyebrow>
      <H2>
        Not a deck. <span style={{ fontStyle: "italic", fontWeight: 400 }}>A working league.</span>
      </H2>
      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {facts.map((f) => (
          <Reveal key={f.k}>
            <div className="h-full border-t pt-6" style={{ borderColor: "rgba(17,18,16,0.85)" }}>
              <p style={{ fontFamily: FRAUNCES, fontSize: "3rem", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1, color: "var(--color-ink)" }}>{f.v}</p>
              <p className="mt-3" style={body()}>{f.k}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <p className="mt-12" style={body()}>
        League contract on testnet:{" "}
        <a href={`https://explorer.testnet.chain.robinhood.com/address/${ESCROW}`} target="_blank" rel="noreferrer" className="break-all underline underline-offset-4" style={{ color: "var(--color-new-purple)" }}>
          {ESCROW}
        </a>
        . Week 1 entries close Monday 12 October at the US open.
      </p>
    </Section>
  );
}

function Model() {
  const flow = [
    { k: "Losing tickets", v: "the bottom half", b: "Only tickets below the median pay in. Winners and the exact median keep theirs." },
    { k: "Take · 10%", v: "5% + 5%", b: "5% to the platform, 5% to a season pot that tops up thin rounds." },
    { k: "Creators", v: "10% of backers’ winnings", b: "Good ETF builders earn from the people who back them." },
  ];
  return (
    <Section id="model" dark>
      <Eyebrow dark>How we make money</Eyebrow>
      <H2 dark>
        Peer to peer. <span style={{ fontStyle: "italic", fontWeight: 400 }}>We never bet against our players.</span>
      </H2>
      <div className="mt-14 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-1">
          {flow.map((f) => (
            <Reveal key={f.k}>
              <div className="flex h-full flex-col gap-2 rounded-[28px] p-7 lg:flex-row lg:items-baseline lg:gap-8" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <div className="lg:w-[40%]">
                  <p style={{ fontFamily: CLASH, fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>{f.k}</p>
                  <p className="mt-1" style={{ fontFamily: FRAUNCES, fontSize: "1.6rem", fontWeight: 600, color: "var(--color-kickoff-green)" }}>{f.v}</p>
                </div>
                <p className="lg:flex-1" style={body(true)}>{f.b}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <div className="h-full rounded-[32px] p-8" style={{ background: "var(--color-pitch-cream)" }}>
            <p style={{ fontFamily: CLASH, fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(17,18,16,0.55)" }}>Illustrative model · not traction</p>
            <p className="mt-3" style={{ fontFamily: FRAUNCES, fontSize: "1.6rem", fontWeight: 600, color: "var(--color-ink)" }}>At 100k tickets a week</p>
            <dl className="mt-5 divide-y" style={{ borderColor: "rgba(17,18,16,0.12)" }}>
              {[
                ["Tickets staked", "$500,000"],
                ["Losing tickets (~45%)", "$225,000"],
                ["Platform take (5%)", "$11,250 / week"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-3" style={{ ...body(), color: "rgba(17,18,16,0.72)" }}>
                  <dt>{k}</dt>
                  <dd className="t-num" style={{ color: "var(--color-ink)" }}>{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6" style={{ fontFamily: FRAUNCES, fontSize: "3.2rem", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1, color: "var(--color-kickoff-green-deep)" }}>≈ $585k</p>
            <p className="mt-2" style={body()}>a year from the league take alone. Next: a platform fee on one-click “Buy the ETF” through 0x on mainnet.</p>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

function WhyChain() {
  const items = [
    { t: "Real assets, not proxies", b: "Robinhood Stock Tokens are the real thing on-chain, so an ETF here is a basket you actually own." },
    { t: "Prices anyone can check", b: "Every token has a Chainlink feed on Robinhood Chain, dividends included. Scoring is total return." },
    { t: "Money that works", b: "USDG tickets earn in Robinhood Earn while the week runs, and the interest goes into the pot." },
  ];
  return (
    <Section>
      <Eyebrow>Why Robinhood Chain</Eyebrow>
      <H2>
        Only possible <span style={{ fontStyle: "italic", fontWeight: 400 }}>here.</span>
      </H2>
      <div className="mt-14 grid gap-8 sm:grid-cols-3">
        {items.map((i) => (
          <Reveal key={i.t}>
            <div className="border-t pt-5" style={{ borderColor: "rgba(17,18,16,0.85)" }}>
              <p style={{ fontFamily: FRAUNCES, fontSize: "1.35rem", fontWeight: 600, color: "var(--color-ink)" }}>{i.t}</p>
              <p className="mt-2" style={body()}>{i.b}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function Roadmap() {
  const steps = [
    { when: "Now", t: "Testnet league, weekly", b: "Contracts, keeper, verifiable settlement, live P&L charts, agents over MCP." },
    { when: "Next", t: "Mainnet", b: "Real Stock Tokens and USDG, tickets parked in Robinhood Earn." },
    { when: "Then", t: "Buy the ETF", b: "One-click baskets through 0x, with creator and platform fees." },
    { when: "Later", t: "Seasons", b: "Season prizes for top creators and scouts, paid from the season pot." },
  ];
  return (
    <Section dark>
      <Eyebrow dark>Roadmap</Eyebrow>
      <H2 dark>From testnet to every Kickoff player.</H2>
      <ol className="mt-14 grid gap-6 md:grid-cols-4">
        {steps.map((s, i) => (
          <Reveal key={s.t}>
            <li className="h-full rounded-[28px] p-7" style={{ background: i === 0 ? "var(--color-kickoff-green)" : "rgba(255,255,255,0.04)", border: i === 0 ? "none" : "1px solid rgba(255,255,255,0.12)" }}>
              <p style={{ fontFamily: CLASH, fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: i === 0 ? "#111210" : "rgba(255,255,255,0.5)" }}>{s.when}</p>
              <p className="mt-3" style={{ fontFamily: FRAUNCES, fontSize: "1.4rem", fontWeight: 600, color: i === 0 ? "#111210" : "#FFFFFF" }}>{s.t}</p>
              <p className="mt-2" style={i === 0 ? { ...body(), color: "rgba(17,18,16,0.75)" } : body(true)}>{s.b}</p>
            </li>
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}

function Close() {
  const router = useRouter();
  return (
    <Section>
      <div className="flex flex-col items-center text-center">
        <ProfitMark tone="ink" size={34} />
        <h2 className="mt-8" style={{ fontFamily: FRAUNCES, fontSize: "clamp(2.6rem, 6vw, 5rem)", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 0.98, color: "var(--color-ink)" }}>
          Real stocks. <span style={{ fontStyle: "italic", fontWeight: 400, color: "var(--color-kickoff-green-deep)" }}>Real</span> stakes.
        </h2>
        <p className="mt-5" style={{ fontFamily: FRAUNCES, fontStyle: "italic", fontSize: "1.4rem", color: "rgba(17,18,16,0.7)" }}>
          Build an ETF. Beat the median. Get paid Friday.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Button3D color="green" size="lg" onClick={() => router.push("/create")}>
            Build an ETF
          </Button3D>
          <Button3D color="purple" size="lg" onClick={() => router.push("/rules")}>
            Read the rules
          </Button3D>
        </div>
        <p className="mt-8" style={body()}>
          Open source:{" "}
          <a href="https://github.com/NECOKIZZ/kickoffstocks" target="_blank" rel="noreferrer" className="underline underline-offset-4" style={{ color: "var(--color-new-purple)" }}>
            github.com/NECOKIZZ/kickoffstocks
          </a>
        </p>
      </div>
    </Section>
  );
}

export function PitchPage() {
  return (
    <div style={{ background: "var(--color-pitch-cream)", overflowX: "clip" }}>
      <Hero />
      <Problem />
      <Product />
      <Live />
      <Model />
      <WhyChain />
      <Roadmap />
      <Close />
      <div style={{ ["--bg" as string]: "var(--color-pitch-cream)" }}>
        <SiteFooter />
      </div>
    </div>
  );
}
