"use client";

// An ETF's return over the round, against MEDIAN and the S&P 500 (SPY), from
// the keeper's hourly chart samples (/api/rounds/:id/history). Display only:
// the round is scored from its start and end prices.

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchHistory, type HistoryPoint, type RoundView } from "../api";

const W = 760;
const H = 260;
const pct = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(2)}%`;
const ny = (ms: number, withDay = true) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: withDay ? "short" : undefined, hour: "numeric", minute: "2-digit" }).format(ms);

export function EtfChart({ r, teamKey }: { r: RoundView; teamKey: string }) {
  const started = r.phase !== "entries-open";
  const { data, error } = useQuery({
    queryKey: ["history", r.id, teamKey],
    queryFn: () => fetchHistory(r.id, teamKey),
    enabled: started,
    refetchInterval: r.phase === "running" ? 5 * 60_000 : false,
  });
  const [showMed, setShowMed] = useState(true);
  const [showSpy, setShowSpy] = useState(true);
  const [hover, setHover] = useState<number | null>(null);
  const pts = data?.points ?? [];
  const hasSpy = pts.some((p) => p.spy !== null);

  const geo = useMemo(() => {
    if (pts.length < 2) return null;
    const t0 = r.entryClose * 1000;
    const t1 = Math.max(r.end * 1000, pts[pts.length - 1].t);
    const vals = pts.flatMap((p) => [p.etf, showMed ? p.median : null, showSpy ? p.spy : null]).filter((v): v is number => v !== null);
    let lo = Math.min(0, ...vals);
    let hi = Math.max(0, ...vals);
    const pad = Math.max(0.25, (hi - lo) * 0.12);
    lo -= pad;
    hi += pad;
    const x = (t: number) => ((t - t0) / (t1 - t0)) * W;
    const y = (v: number) => H - ((v - lo) / (hi - lo)) * H;
    const path = (key: keyof Omit<HistoryPoint, "t">) => {
      let d = "";
      let pen = false;
      for (const p of pts) {
        const v = p[key];
        if (v === null) {
          pen = false;
          continue;
        }
        d += `${pen ? "L" : "M"}${x(p.t).toFixed(1)} ${y(v).toFixed(1)} `;
        pen = true;
      }
      return d;
    };
    const step = hi - lo > 8 ? 2 : hi - lo > 4 ? 1 : 0.5;
    const grid: number[] = [];
    for (let g = Math.ceil(lo / step) * step; g <= hi; g += step) grid.push(Math.round(g * 100) / 100);
    const etf = path("etf");
    const last = [...pts].reverse().find((p) => p.etf !== null)!;
    const days = [0, 1, 2, 3, 4].map((d) => ({ x: x(t0 + d * 86_400_000) / W, label: new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short" }).format(t0 + d * 86_400_000) }));
    return { x, y, grid, etf, med: path("median"), spy: path("spy"), area: `${etf}L${x(last.t).toFixed(1)} ${y(0).toFixed(1)} L0 ${y(0).toFixed(1)} Z`, last, days };
  }, [pts, showMed, showSpy, r.entryClose, r.end]);

  const at = hover !== null ? pts[hover] : null;

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!geo) return;
    const box = e.currentTarget.getBoundingClientRect();
    const tx = ((e.clientX - box.left) / box.width) * W;
    let best = 0;
    pts.forEach((p, i) => {
      if (Math.abs(geo.x(p.t) - tx) < Math.abs(geo.x(pts[best].t) - tx)) best = i;
    });
    setHover(best);
  }

  return (
    <section aria-label="Return over the round" className="rounded-[32px] border border-line p-6 md:p-8">
      <div className="flex flex-wrap items-start gap-4">
        <div>
          <h2 className="t-heading text-[24px]">{r.phase === "settled" ? "The week" : "Live P&L"}</h2>
          <p className="mt-1 text-[14px] text-muted">
            {at && at.etf !== null ? (
              <>
                <span className="t-num text-ink">{ny(at.t)} ET</span> · this ETF <span className="t-num text-ink">{pct(at.etf)}</span>
                {at.median !== null && showMed && <> · MEDIAN <span className="t-num">{pct(at.median)}</span></>}
                {at.spy !== null && showSpy && <> · S&amp;P 500 <span className="t-num">{pct(at.spy)}</span></>}
              </>
            ) : (
              "Return of the locked basket since Monday’s open, updated hourly."
            )}
          </p>
        </div>
        <div className={`ml-auto flex flex-wrap gap-2 ${geo ? "" : "hidden"}`}>
          <Toggle on={showMed} onClick={() => setShowMed(!showMed)} swatch="border-t-[3px] border-dashed border-[var(--brand-purple)]">
            MEDIAN
          </Toggle>
          {hasSpy && (
            <Toggle on={showSpy} onClick={() => setShowSpy(!showSpy)} swatch="border-t-[3px] border-dotted border-muted">
              S&amp;P 500
            </Toggle>
          )}
        </div>
      </div>

      {!started ? (
        <Empty>The chart starts at Monday’s open, when the round locks. Until then the basket isn’t scored.</Empty>
      ) : error ? (
        <Empty>Couldn’t load the chart: {error.message}</Empty>
      ) : !data ? (
        <div className="mt-6 h-[260px] animate-pulse rounded-[20px] bg-surface" />
      ) : !geo ? (
        <Empty>The first points land within the hour after Monday’s open.</Empty>
      ) : (
        <div className="relative mt-6" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-[260px] w-full" role="img" aria-label={`This ETF ${pct(geo.last.etf ?? 0)} since Monday’s open`}>
            {geo.grid.map((g) => (
              <line key={g} x1={0} x2={W} y1={geo.y(g)} y2={geo.y(g)} stroke="currentColor" className={g === 0 ? "text-muted/40" : "text-line"} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            ))}
            <path d={geo.area} className="fill-[color-mix(in_oklab,var(--color-kickoff-green)_12%,transparent)]" />
            {showSpy && <path d={geo.spy} fill="none" stroke="var(--muted)" strokeWidth={2} strokeDasharray="2 5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
            {showMed && <path d={geo.med} fill="none" stroke="var(--brand-purple)" strokeWidth={2.5} strokeDasharray="7 6" vectorEffect="non-scaling-stroke" />}
            <path d={geo.etf} fill="none" stroke="var(--color-kickoff-green)" strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            {at && <line x1={geo.x(at.t)} x2={geo.x(at.t)} y1={0} y2={H} stroke="currentColor" className="text-muted/50" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
          </svg>
          {/* Dots and labels in HTML so they keep their shape on a stretched chart. */}
          <Dot x={geo.x((at ?? geo.last).t) / W} y={geo.y((at ?? geo.last).etf ?? 0) / H} />
          {geo.grid.map((g) => (
            <span key={g} className="t-num pointer-events-none absolute right-0 -translate-y-1/2 bg-bg/80 px-1 text-[11px] text-muted" style={{ top: `${(geo.y(g) / H) * 100}%` }}>
              {pct(g).replace(".00", "")}
            </span>
          ))}
          <div className="relative mt-2 h-4 text-[12px] text-muted">
            {geo.days.map((d) => (
              <span key={d.label} className="absolute" style={{ left: `${d.x * 100}%` }}>
                {d.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Dot({ x, y }: { x: number; y: number }) {
  return <span className="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-bg bg-[var(--color-kickoff-green)]" style={{ left: `${x * 100}%`, top: `${y * 260}px` }} />;
}

function Toggle({ on, onClick, swatch, children }: { on: boolean; onClick: () => void; swatch: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-[13px] font-medium transition ${on ? "border-ink/20 bg-surface text-ink" : "border-line text-muted"}`}
    >
      <span className={`w-4 ${swatch} ${on ? "" : "opacity-40"}`} aria-hidden="true" />
      {children}
    </button>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="mt-6 flex h-[200px] items-center justify-center rounded-[20px] bg-surface px-6 text-center text-[14px] text-muted">{children}</p>;
}
