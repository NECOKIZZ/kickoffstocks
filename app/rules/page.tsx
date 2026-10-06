import { Shell, PageHead, Container } from "@/web/components/Shell";
import { ContractInfo } from "@/web/components/ContractInfo";

export const metadata = { title: "Rules · Kickoff Stocks" };

function H({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="t-heading mt-14 scroll-mt-24 text-[28px] first:mt-0">
      {children}
    </h2>
  );
}

// Worked example: computed with the settlement engine (src/engine/league.ts).
const EXAMPLE = [
  ["A", "+3.0%", "wins", "1.00", "$15.76", "$12.45"],
  ["B", "+2.0%", "wins", "0.09", "$5.94", "$5.65"],
  ["C", "+1.0%", "draw (on AVERAGE)", "—", "$5.00", "$5.00"],
  ["D", "−1.0%", "loses", "—", "$0", "$0"],
  ["E", "−2.0%", "loses", "—", "$0", "$0"],
];

export default function Rules() {
  return (
    <Shell>
      <PageHead label="Rules" title="How the league works">
        Plain rules, the same ones the contract and the settlement code follow.
      </PageHead>
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1fr_340px]">
          <article className="max-w-[68ch] text-[16px] leading-relaxed text-ink/85 [&_li]:mt-2 [&_p]:mt-4 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-5">
            <H>A round</H>
            <p>Each round has an entry window, then a running period. When entries close, the start prices are taken. When the round ends, the end prices are taken and the ETFs are ranked by return.</p>
            <p>Prices come from Robinhood Chain&rsquo;s Chainlink feeds, one per Stock Token, readable on-chain by anyone. A feed quotes one token&rsquo;s value, which includes reinvested dividends, so returns are total returns. Several samples are averaged at the start and at the end, so one odd tick can&rsquo;t decide a round. A stale feed, a paused oracle (a corporate action in progress) or a stalled chain voids the round and refunds everyone. Short demo rounds may use Robinhood&rsquo;s own quote API instead; the round&rsquo;s published inputs say which.</p>

            <H>Creators</H>
            <ul>
              <li>Pick at least 3 stocks or funds (up to 10 assets in all), none above 50%, worth at least $10 in total.</li>
              <li>Only Robinhood Stock Tokens with a Chainlink feed can be picked: 35 stocks and funds.</li>
              <li>Lock the basket in the league contract with a $5 USDG ticket, and give the ETF a name.</li>
              <li>The basket comes back to you when the round ends, win or lose. Only the ticket is at stake.</li>
              <li>Same stocks at the same weights (to 1%) as an existing ETF? You join that team. The first creator is its captain.</li>
              <li>Everyone can be a creator.</li>
            </ul>

            <H>Backers</H>
            <ul>
              <li><b>Back the team:</b> a $5 ticket on someone&rsquo;s ETF. It wins or loses with that ETF. The creator keeps 10% of what their backers win.</li>
              <li><b>Buy the ETF:</b> buy the same basket through 0x, straight into your wallet. The creator earns the buy fee they set (0&ndash;2%), paid by the swap. Nothing is locked; it&rsquo;s your portfolio.</li>
              <li>Do either, or both. One entry per wallet per round.</li>
            </ul>

            <H>Who wins</H>
            <p>ETFs are ranked by return. Every round has a ghost team, <b>AVERAGE</b>, borrowed from Fantasy Premier League: its return is the median return of the round (the middle ETF, or halfway between the two middle ones).</p>
            <ul>
              <li><b>Above AVERAGE:</b> you win a share of the pot.</li>
              <li><b>On AVERAGE:</b> a draw. Your ticket comes back, no gain, no loss. In a round with an odd number of ETFs, the middle one always draws.</li>
              <li><b>Below AVERAGE:</b> your ticket goes into the pot.</li>
            </ul>
            <p>Why the median and not the mean: one wild ETF can drag a mean up or down and decide everyone&rsquo;s result; the median only moves if half the league moves. If at least half the ETFs tie for the best return, they all win. A round needs at least 4 ETFs; otherwise everyone is refunded.</p>

            <H>How the pot is split</H>
            <p>The losing tickets form the pot. 10% is taken: 5% for the platform, 5% for the season pot (which tops up thin rounds). While the round runs, all its tickets sit in a savings vault (Robinhood Earn on mainnet) and the interest is added to the pot. The rest goes to the winning teams, by team size × accuracy. Accuracy is how close an ETF came to the best return: the best ETF scores 1, and it drops steeply with distance. Inside a team, every ticket gets the same share, and the creator takes 10% of their backers&rsquo; winnings. A team can win at most 100× what it staked.</p>
            <p>Example: 5 ETFs, each with its creator and 3 backers ($20 per team, $100 in tickets). AVERAGE is +1.0%, ETF C&rsquo;s return.</p>
            <div className="mt-4 overflow-x-auto rounded-[20px] border border-line">
              <table className="w-full min-w-[520px] text-left text-[14px]">
                <thead className="text-[12px] text-muted">
                  <tr className="border-b border-line">
                    <th className="px-4 py-2 font-medium">ETF</th>
                    <th className="px-4 py-2 font-medium">Return</th>
                    <th className="px-4 py-2 font-medium">Result</th>
                    <th className="px-4 py-2 font-medium">Accuracy</th>
                    <th className="px-4 py-2 font-medium">Creator gets</th>
                    <th className="px-4 py-2 font-medium">Each backer gets</th>
                  </tr>
                </thead>
                <tbody className="t-num">
                  {EXAMPLE.map((r) => (
                    <tr key={r[0]} className="border-b border-line last:border-0">
                      {r.map((c, i) => (
                        <td key={i} className="px-4 py-2">{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[14px] text-muted">The $40 of losing tickets: $4 taken ($2 platform, $2 season pot), $36 shared (plus any ticket interest). Amounts include the $5 ticket back. Every creator also gets their basket back.</p>

            <H id="verify">Settlement you can check</H>
            <p>A keeper takes the prices and runs the open-source settlement. It publishes every input (prices, entries, payouts) and writes their hash on-chain with the payouts. The contract checks that the money adds up and that no payout is out of bounds. Anyone can re-run the maths with <code className="t-num text-[14px]">scripts/verify.mts</code> or on each round&rsquo;s results page.</p>
            <p>Prices keep moving between your entry and the round start, so the check at the start allows a little drift: weights within 5 points of what you declared and a basket of at least $9.50. Beyond that, the entry is refunded.</p>
            <p>If a round isn&rsquo;t settled within 3 days of its end, anyone can bring the tickets back from the savings vault and void it, and everyone is refunded. If a stock token is paused when you claim, your other tokens and your payout still arrive, and you can retry the paused one later.</p>

            <H id="risk">Risks</H>
            <ul>
              <li>&ldquo;ETF&rdquo; here means an on-chain basket of tokenized stocks, not a regulated fund.</li>
              <li>Stock prices move: your basket can lose value while it&rsquo;s locked, and a losing ticket is lost.</li>
              <li>Robinhood Stock Tokens are issued by Robinhood as tokenized debt securities that track the stock (not shares), and follow Robinhood&rsquo;s rules, including where they&rsquo;re available. Not available in restricted regions, including the US.</li>
              <li>Parked tickets sit in a third-party savings vault while the round runs. A loss there is covered by the season pot first.</li>
              <li>Smart contracts can have bugs. Play with money you can afford to lose.</li>
            </ul>
          </article>
          <aside id="contracts" className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start">
            <ContractInfo />
          </aside>
        </div>
      </Container>
    </Shell>
  );
}
