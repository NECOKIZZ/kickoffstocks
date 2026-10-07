// Prints /pitch to public/pitch/Profit-Markets-Pitch.pdf, one slide per
// 1280x720 page (the print styles in app/pitch/pitch.css).
//
//   npm run build && npm start   # in another shell
//   node scripts/pitch-pdf.mjs [http://localhost:3000/pitch]
//
// Needs Playwright with Chromium. If it isn't installed in this project, point
// PLAYWRIGHT at a copy, e.g. PLAYWRIGHT=$(npm root -g)/playwright/index.mjs.

const { chromium } = await import(process.env.PLAYWRIGHT ?? "playwright");
const url = process.argv[2] ?? "http://localhost:3000/pitch";
const out = new URL("../public/pitch/Profit-Markets-Pitch.pdf", import.meta.url);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.emulateMedia({ media: "print" });
await page.pdf({ path: out.pathname, width: "1280px", height: "720px", printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log(`Saved ${out.pathname}`);
