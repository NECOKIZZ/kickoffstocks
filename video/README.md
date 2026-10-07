# Demo video (HyperFrames)

The 3-minute judges' demo for Profit Markets by Kickoff, built with
[HyperFrames](https://github.com/heygen-com/hyperframes): every scene is HTML + GSAP in
Kickoff's own brand, rendered to MP4. Nothing here is part of the website: the Next.js app
never reads this folder.

- `SCRIPT.md`: the voiceover, scene by scene, with timecodes, plus the sample round's numbers.
- `index.html`: the timeline (12 scenes, transitions between them).
- `compositions/`: one file per scene.
- `assets/`: brand CSS and fonts (local, so renders are offline and deterministic), stock logos, `ks.js` (stock card, app shell, cursor and count-up helpers).

## Preview and render
Node 22+ and FFmpeg.
```bash
cd video
npx hyperframes preview                     # studio in the browser: scrub, edit text, retime
npx hyperframes check                       # lint + runtime + layout + contrast
npx hyperframes render -o renders/kickoff-demo.mp4 -q looks
```
Renders go to `renders/` (git-ignored).

## Data
Stock prices are the 6 Oct 2026 Robinhood Chain feed snapshot (`src/ui/data/stocks.ts`).
The round shown is a sample (every UI scene says so in the corner). The "at scale" numbers
in the revenue scene are an illustrative model, labeled as such. The rules on screen match
the engine: the median ETF draws, 10% take on losing tickets (5% platform, 5% season pot),
creators take 10% of their backers' winnings.

The ticket-interest counter (scene 8) and the revenue panel (scene 11) exist only in the
video for now.
