"use client";

// Hero card stack: one card sharp at the front, the rest queued up and to the
// right, each further back smaller, dimmer and more blurred. Every few seconds
// the front card slides out and the next one comes into focus. Hover pauses
// it and tilts the front card toward the pointer; clicking a back card brings
// it forward.

import { useEffect, useRef, useState } from "react";
import type { StockInfo } from "../data/stocks";
import { StockCard } from "./StockCard";

const VISIBLE = 4;

export function CardStack({
  stocks,
  prices = {},
  changes = {},
  interval = 3200,
  scale = 1.25,
  spread = 1,
}: {
  stocks: StockInfo[];
  prices?: Record<string, number>;
  changes?: Record<string, number>;
  interval?: number;
  /** Size of the front card relative to the big stock card (218×312). */
  scale?: number;
  /** How far the queued cards fan out (1 = desktop). */
  spread?: number;
}) {
  const n = stocks.length;
  const [front, setFront] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (paused || n < 2) return;
    const t = setInterval(() => setFront((f) => (f + 1) % n), interval);
    return () => clearInterval(t);
  }, [paused, n, interval]);

  const w = 218 * scale;
  const h = 312 * scale;
  const dx = 92 * spread;
  const dy = 50 * spread;

  return (
    <div
      ref={box}
      className="relative"
      style={{ width: w + dx * (VISIBLE - 1), height: h + dy * (VISIBLE - 1), perspective: 1200 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        setPaused(false);
        setTilt({ x: 0, y: 0 });
      }}
      onMouseMove={(e) => {
        const r = box.current!.getBoundingClientRect();
        // Tilt only over the front card (bottom-left corner of the box).
        const fx = (e.clientX - r.left) / w - 0.5;
        const fy = (e.clientY - (r.bottom - h)) / h - 0.5;
        setTilt(Math.abs(fx) <= 0.6 && Math.abs(fy) <= 0.6 ? { x: fx, y: fy } : { x: 0, y: 0 });
      }}
    >
      {stocks.map((s, i) => {
        const d = (i - front + n) % n; // 0 = front
        const leaving = d === n - 1 && n > VISIBLE; // just left the front
        const hidden = d >= VISIBLE && !leaving;
        const k = Math.min(d, VISIBLE);
        const isFront = d === 0;
        const transform = leaving
          ? `translate(${-dx * 1.4}px, ${dy * 1.6}px) scale(${scale * 0.92}) rotate(-8deg)`
          : `translate(${k * dx}px, ${-k * dy}px) scale(${scale * (1 - k * 0.07)}) rotate(${k * 4}deg)` +
            (isFront ? ` rotateY(${tilt.x * 14}deg) rotateX(${-tilt.y * 12}deg)` : "");
        return (
          <div
            key={s.ticker}
            onClick={() => !isFront && setFront(i)}
            className={isFront ? "" : "cursor-pointer"}
            style={{
              position: "absolute",
              left: 0,
              bottom: 0,
              width: 218,
              height: 312,
              transformOrigin: "bottom left",
              transform,
              filter: isFront ? "none" : `blur(${k * 2.6}px) brightness(${1 - k * 0.16}) saturate(${1 - k * 0.12})`,
              opacity: leaving || hidden ? 0 : 1 - k * 0.1,
              zIndex: leaving ? 30 : 20 - k,
              transition: isFront && (tilt.x || tilt.y)
                ? "transform .25s ease-out, filter .9s ease, opacity .9s ease"
                : "transform 1s cubic-bezier(0.22, 1, 0.36, 1), filter .9s ease, opacity .8s ease",
              willChange: "transform, filter, opacity",
            }}
          >
            {isFront && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute"
                style={{ inset: "12% -2% -4%", background: s.color, filter: "blur(70px)", opacity: 0.38, zIndex: -1, transition: "background 1s ease" }}
              />
            )}
            <StockCard stock={s} size="big" price={prices[s.ticker]} changePct={changes[s.ticker]} />
          </div>
        );
      })}
    </div>
  );
}
