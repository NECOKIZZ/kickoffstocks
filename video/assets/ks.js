// Shared builders for the Kickoff Stocks demo video: stock data (the 6 Oct
// 2026 Robinhood Chain feed snapshot, src/ui/data/stocks.ts), the stock card
// (docs/design/stock-card), the app shell, a cursor, and seek-safe helpers.
// Deterministic only: no clocks, no Math.random.
(function () {
  const L = (t) => "assets/logos/" + t + ".png";
  // ticker: [name, kind, price, color, colorLight]
  const S = {
    NVDA: ["NVIDIA", "stock", 240.66, "#4FAE12", "#EBF7E2"],
    TSLA: ["Tesla", "stock", 381.32, "#D40A0A", "#FDE6E8"],
    AAPL: ["Apple", "stock", 332.51, "#09B2C7", "#E1F6F8"],
    MSFT: ["Microsoft", "stock", 534.09, "#6A3BF0", "#ECE6FD"],
    AMZN: ["Amazon", "stock", 255.63, "#E58212", "#FCF0E3"],
    GOOGL: ["Alphabet Class A", "stock", 347.43, "#E86A00", "#FDEEE2"],
    META: ["Meta Platforms", "stock", 744.49, "#0A6BD4", "#E4EFFD"],
    AMD: ["AMD", "stock", 657.21, "#06726E", "#E1EEEE"],
    PLTR: ["Palantir Technologies", "stock", 191.93, "#006D91", "#E0EDF2"],
    TSM: ["Taiwan Semiconductor", "stock", 483.65, "#B71532", "#F6E3E6"],
    COIN: ["Coinbase", "stock", 188.42, "#5471F5", "#EAEEFE"],
    SPCX: ["SpaceX", "stock", 173.38, "#796006", "#EFECE1"],
    MU: ["Micron Technology", "stock", 1065.55, "#0465AF", "#E1EDF5"],
    MSTR: ["Strategy Inc.", "stock", 164.88, "#CD9200", "#F9F2E0"],
    NBIS: ["Nebius Group", "stock", 253.18, "#92AC06", "#F2F5E1"],
    RKLB: ["Rocket Lab", "stock", 74.14, "#915006", "#F2EAE1"],
    IONQ: ["IonQ", "stock", 43.4, "#8362ED", "#F0ECFD"],
    RGTI: ["Rigetti Computing", "stock", 15.11, "#576CB7", "#EBEDF6"],
    GME: ["GameStop", "stock", 24.74, "#D7397B", "#FAE7EF"],
    USAR: ["USA Rare Earth", "stock", 13.92, "#A35E16", "#F4ECE3"],
    SPY: ["SPDR S&P 500 ETF", "etf", 780.08, "#0B764D", "#E2EFEA"],
    QQQ: ["Invesco QQQ", "etf", 759.94, "#9030A4", "#F2E6F4"],
    SGOV: ["iShares 0-3M Treasury", "etf", 101.19, "#33854A", "#E7F0E9"],
    USO: ["US Oil Fund", "etf", 144.08, "#A83903", "#F5E7E1"],
    SLV: ["iShares Silver", "etf", 55.31, "#639DFE", "#ECF3FF"],
    EWY: ["iShares South Korea", "etf", 188.58, "#5B6C09", "#EBEDE1"],
    BTC: ["Bitcoin", "crypto", 84209.58, "#B49F03", "#F6F3E1"],
    ETH: ["Ether", "crypto", 2610.07, "#8D90FF", "#F1F2FF"],
  };

  const money = (v, d = 2) => "$" + v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  const pct = (v, d = 2) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(d) + "%";
  const arrow = (v) => (v >= 0 ? "▲ " : "▼ ") + Math.abs(v).toFixed(2) + "%";

  function glow(c, l) {
    return [
      `radial-gradient(38% 22% at 28% 52%, ${c} 0%, rgba(0,0,0,0) 100%)`,
      `radial-gradient(30% 34% at 66% 40%, ${c} 0%, rgba(0,0,0,0) 100%)`,
      `radial-gradient(34% 16% at 64% 74%, ${l} 0%, rgba(0,0,0,0) 100%)`,
      `radial-gradient(28% 14% at 30% 80%, ${l} 0%, rgba(0,0,0,0) 100%)`,
      `linear-gradient(180deg, #000 0%, #000 20%, ${c} 48%, ${c} 60%, ${l} 82%, ${l} 100%)`,
    ].join(",");
  }
  const glyph = (px) =>
    `<svg width="${px}" height="${px * 1.004}" viewBox="0 0 500 502"><circle cx="400" cy="100" r="100" fill="#fff"/><path d="M150 0L500 502H327.5L150 251.5V500H0V0H150Z" fill="#fff"/></svg>`;
  const tickerPx = (n, big) => (big ? (n >= 5 ? 50 : n === 4 ? 60 : 72) : n >= 5 ? 34 : n === 4 ? 41 : 50);

  // size: big (218×312) | medium (150×215) | tiny (64×84)
  function card(t, size = "big", o = {}) {
    const [name, kind, price0, c, l] = S[t];
    const price = o.price ?? price0;
    const id = o.id ? ` id="${o.id}"` : "";
    const cls = o.cls ? " " + o.cls : "";
    if (size === "tiny") {
      return `<div class="sc${cls}"${id} style="width:64px;height:84px;border-radius:12px">
        <div style="position:absolute;inset:-10px;filter:blur(6px);background:linear-gradient(180deg,#000 0%,${c} 40%,${l} 80%)"></div>
        <div class="in" style="align-items:center;justify-content:space-between;padding:8px 4px 6px">
          <div class="badge" style="width:26px;height:26px"><img src="${L(t)}" style="width:17px;height:17px"></div>
          <div style="display:flex;flex-direction:column;align-items:center;gap:3px">
            <div style="font-weight:900;font-size:12px;letter-spacing:-0.04em;color:#111">${t}</div>
            ${o.weight != null ? `<div class="wt">${o.weight}%</div>` : ""}
          </div></div></div>`;
    }
    const big = size === "big";
    const w = big ? 218 : 150, h = big ? 312 : 215, r = big ? 22 : 16;
    const k = kind === "etf" ? "FUND" : kind === "crypto" ? "CRYPTO" : "";
    const px = tickerPx(t.length, big);
    const ch = o.pct != null ? `<div class="ch ${o.pct >= 0 ? "u" : "d"}" style="font-size:${big ? 10 : 9}px">${arrow(o.pct)}</div>` : "";
    return `<div class="sc${cls}"${id} style="width:${w}px;height:${h}px;border-radius:${r}px;${big ? "box-shadow:0 24px 48px -18px rgba(0,0,0,.6);" : ""}">
      <div class="glow" style="background:${glow(c, l)}"></div>
      <img class="wm" data-layout-ignore src="${L(t)}" style="width:${big ? 170 : 118}px;height:${big ? 170 : 118}px;right:${big ? -38 : -28}px;top:${big ? 118 : 80}px">
      <div class="in" style="padding:${big ? 15 : 10}px">
        <div class="top">
          <div style="display:flex;gap:5px;align-items:center">
            <div class="kind" style="gap:${big ? 7 : 5}px;font-size:${big ? 11 : 9}px">${glyph(big ? 20 : 15)}${k}</div>
            ${big && o.weight != null ? `<div class="wt" style="padding:5px 8px">${o.weight}%</div>` : ""}
          </div>
          <div class="badge" style="width:${big ? 30 : 22}px;height:${big ? 30 : 22}px;${big ? "box-shadow:0 0 0 2px rgba(255,255,255,.25)" : ""}"><img src="${L(t)}" style="width:${big ? 20 : 14}px;height:${big ? 20 : 14}px"></div>
        </div>
        <div style="display:flex;flex-direction:column;margin-top:${big ? 24 : 16}px">
          <div class="tk" style="font-size:${px}px">${t}</div><div class="tk o" data-layout-ignore style="font-size:${px}px">${t}</div>
          ${big ? `<div class="nm" style="font-size:11px">${name}</div>` : ""}
        </div>
        ${big
          ? `<div class="bar" style="padding:9px 10px 9px 13px;border-radius:16px"><div style="display:flex;flex-direction:column;gap:2px"><div class="px" style="font-size:14px">${money(price)}</div>${ch}</div><div class="add">${o.added ? "✓" : "+"}</div></div>`
          : `<div class="bar" style="flex-direction:column;align-items:flex-start;gap:1px;padding:7px 10px;border-radius:11px"><div class="px" style="font-size:11px">${money(price)}</div>${ch}</div>`}
      </div></div>`;
  }

  const ICON = {
    league: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    build: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    board: '<path d="M7 3h10l-2 6H9L7 3zM12 9v3"/><circle cx="12" cy="16" r="5"/>',
    entries: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2"/>',
    agents: '<rect x="4" y="8" width="16" height="11" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01"/>',
    rules: '<path d="M4 5a2 2 0 0 1 2-2h5v17H6a2 2 0 0 0-2 2V5zM20 5a2 2 0 0 0-2-2h-5v17h5a2 2 0 0 1 2 2V5z"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  };
  const ico = (k) => `<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>`;
  const mark = (px, fill = "#111210") =>
    `<svg width="${px}" height="${px * 1.004}" viewBox="0 0 500 502"><circle cx="400" cy="100" r="100" fill="${fill}"/><path d="M150 0L500 502H327.5L150 251.5V500H0V0H150Z" fill="${fill}"/></svg>`;
  const trend = (px) => `<svg width="${px}" height="${px * 0.6}" viewBox="0 0 20 12" fill="none" stroke="#00C805" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 11l5-5 3 3 7-7M12 2h4v4"/></svg>`;

  // wallet: null (Connect wallet) | {addr, bal}
  function sidebar(active, wallet, walletId) {
    const it = (k, label, key) => `<div class="item${active === key ? " on" : ""}">${ico(k)}${label}</div>`;
    const w = wallet
      ? `<div class="wallet connected"${walletId ? ` id="${walletId}"` : ""}><span style="display:flex;align-items:center"><span class="dot"></span><span class="mono" style="font-size:13px">${wallet.addr}</span></span><span class="mono" style="font-size:12px;color:#B9BCB0">${wallet.bal}</span></div>`
      : `<div class="wallet"${walletId ? ` id="${walletId}"` : ""}>Connect wallet</div>`;
    return `<div class="side">
      <div class="brand">${mark(22)}<span class="bar"></span><span class="word">Profit <i>Markets</i></span>${trend(16)}</div>
      <div class="sec">PLAY</div>${it("league", "League", "league")}${it("build", "Build an ETF", "build")}${it("board", "Leaderboard", "board")}${it("entries", "My entries", "entries")}
      <div class="sec" style="margin-top:14px">MORE</div>${it("agents", "Agents", "agents")}${it("rules", "Rules", "rules")}
      <div class="spacer"></div>
      <div class="item">${ico("flag")}Getting started<span class="chip">${wallet ? "3/5" : "0/5"}</span></div>
      <div class="item">${ico("sun")}Theme</div>
      ${w}</div>`;
  }

  const TAPE = ["NVDA", "TSLA", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "AMD", "PLTR", "TSM", "COIN", "MU", "SPY", "QQQ", "BTC", "ETH"];
  const TAPE_CH = [2.41, -1.12, 0.38, 1.06, 0.74, 1.31, -0.42, 3.18, 2.06, 1.92, -0.88, 2.77, 0.61, 0.95, 1.4, -0.36];
  function tickerTape(id) {
    const one = TAPE.map((t, i) => {
      const c = TAPE_CH[i];
      const p = S[t][2] * (1 + c / 100);
      return `<span class="tk"><img src="${L(t)}"><span>${t}</span><span class="pr">${p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span><span class="${c >= 0 ? "up" : "dn"}">${arrow(c)}</span></span>`;
    }).join("");
    return `<div class="ticker" data-layout-ignore><div class="track" id="${id}">${one}${one}</div><div class="note">Robinhood quotes, live · since round start</div></div>`;
  }

  const CURSOR = `<svg viewBox="0 0 24 24" width="34" height="34"><path d="M4 2.5l15.5 9.2-6.9 1.6-3.4 6.6L4 2.5z" fill="#111210" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;

  // Seek-safe count-up: textContent is a pure function of tween progress.
  function count(tl, el, from, to, at, dur, fmt, ease = "power2.out") {
    const o = { v: from };
    el.textContent = fmt(from);
    tl.fromTo(o, { v: from }, { v: to, duration: dur, ease, onUpdate: () => (el.textContent = fmt(o.v)) }, at);
  }
  // Cursor move + click (press dip + ripple).
  function click(tl, cur, rip, x, y, at, move = 0.7) {
    tl.to(cur, { x, y, duration: move, ease: "power3.inOut" }, at);
    tl.to(cur, { scale: 0.82, duration: 0.08, ease: "power1.in" }, at + move);
    tl.to(cur, { scale: 1, duration: 0.18, ease: "back.out(3)" }, at + move + 0.08);
    if (rip) {
      tl.set(rip, { x: x + 6, y: y + 4 }, at + move);
      tl.fromTo(rip, { scale: 0.2, opacity: 0.9 }, { scale: 1.4, opacity: 0, duration: 0.55, ease: "power2.out", immediateRender: false }, at + move);
    }
    return at + move + 0.26;
  }
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Layout-audit waiver for deliberate layering (a modal over a blurred page,
  // a fanned deck): the audit reads the flag on each text element itself.
  function layered(sel) {
    document.querySelectorAll(sel).forEach((el) => el.setAttribute("data-layout-allow-overlap", ""));
  }

  window.KS = { layered, S, L, money, pct, arrow, card, sidebar, tickerTape, ico, mark, trend, CURSOR, count, click, rng };
})();
