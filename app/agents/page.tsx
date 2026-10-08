import { Shell, PageHead, Container } from "@/web/components/Shell";
import { AgentPrompt } from "@/web/components/AgentPrompt";
import { McpUrl } from "@/web/components/McpUrl";

export const metadata = { title: "Agents · Kickoff Stocks" };

const ASKS = ["What's happening in this round?", "Back the ETF above MEDIAN with $5", "Build me an AI chips ETF", "Did I win? Claim it for me"];

const TOOLS: [string, string][] = [
  ["get_round", "ETFs ranked by return, MEDIAN, who's winning or drawing, odds per ticket"],
  ["list_stocks", "the Robinhood Stock Tokens a basket can hold, with live prices"],
  ["get_my_entries", "a wallet's entries and what it can claim"],
  ["get_rules", "chain, contracts, ticket size, basket limits"],
  ["plan_create_etf", "approvals + lock a basket with a $5 ticket"],
  ["plan_back_team", "a $5 ticket on an ETF"],
  ["plan_buy_basket · plan_buy_etf", "buy stocks with USDG: 0x on mainnet, one swap on testnet (creator earns their fee)"],
  ["plan_claim", "payout or refund, and the creator's basket back"],
];

const ENDPOINTS: [string, string, string][] = [
  ["POST", "/api/mcp", "MCP server (Streamable HTTP, no login)"],
  ["GET", "/agent.md", "the guide agents follow"],
  ["GET", "/api/config", "chain, league contract, USDG, rules"],
  ["GET", "/api/stocks", "league stocks with this chain's addresses and live prices"],
  ["GET", "/api/rounds/current", "ETFs ranked by return, MEDIAN, odds per ticket"],
  ["GET", "/api/me?wallet=0x…", "a wallet's entries and what it can claim"],
  ["POST", "/api/plan", "exact transactions for back · lock · buy-basket · buy-etf · claim"],
];

export default function Agents() {
  return (
    <Shell>
      <PageHead label="Agents" title="Bring your own agent">
        Claude, ChatGPT, Cursor or an agent you built: connect it to Kickoff Stocks and it can read the round, build ETFs and back teams for you. It prepares every
        transaction; your wallet signs. We never hold a key, and we don&rsquo;t run agents.
      </PageHead>
      <Container>
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <section className="space-y-8">
            <div>
              <div className="t-label text-muted">1 · Add the MCP server to your agent</div>
              <div className="mt-3">
                <McpUrl />
              </div>
              <p className="mt-3 text-[14px] text-muted">
                In Claude: Settings → Connectors → Add custom connector. In Cursor or Claude Code: add it as an HTTP MCP server. No login: the tools only read the league and
                prepare transactions.
              </p>
            </div>
            <div>
              <div className="t-label text-muted">…or paste this message</div>
              <div className="mt-3">
                <AgentPrompt />
              </div>
              <p className="mt-3 text-[14px] text-muted">For agents without MCP: it reads our guide and uses the same plans over plain HTTP.</p>
            </div>
            <div>
              <div className="t-label text-muted">2 · Just ask</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {ASKS.map((a) => (
                  <span key={a} className="card-diagonal-sm bg-surface px-4 py-2 text-[14px]">
                    &ldquo;{a}&rdquo;
                  </span>
                ))}
              </div>
            </div>
          </section>
          <aside className="card-diagonal bg-surface p-6 md:p-7 lg:self-start">
            <div className="t-heading text-[22px]">Good to know</div>
            <ul className="mt-4 space-y-3 text-[15px] text-ink/80">
              <li>· Your agent shows you every transaction and waits for your yes. Nothing moves without your wallet&rsquo;s signature.</li>
              <li>· Your keys stay in your wallet. The agent and this site never see them.</li>
              <li>· Testnet is free: testnet ETH from Robinhood&rsquo;s faucet, test USDG from the wallet chip, and stocks bought with it in one swap.</li>
              <li>· We don&rsquo;t give tips: your agent reads the same public data you see here.</li>
            </ul>
          </aside>
        </div>

        <details className="group card-diagonal mt-16 border border-line p-6 md:p-8" open>
          <summary className="t-heading cursor-pointer list-none text-[22px]">
            For developers <span className="font-sans text-[14px] text-muted group-open:hidden">(MCP tools, API, CLI) ↓</span>
          </summary>
          <div className="mt-6 space-y-6 text-[15px] text-ink/80">
            <div className="overflow-x-auto rounded-[16px] border border-line">
              <table className="w-full min-w-[560px] text-left text-[14px]">
                <thead className="text-[12px] text-muted">
                  <tr className="border-b border-line">
                    <th className="px-4 py-2 font-medium">MCP tool</th>
                    <th className="px-4 py-2 font-medium">What it does</th>
                  </tr>
                </thead>
                <tbody>
                  {TOOLS.map(([t, d]) => (
                    <tr key={t} className="border-b border-line last:border-0">
                      <td className="t-num px-4 py-2.5">{t}</td>
                      <td className="px-4 py-2.5 text-muted">{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              Everything is public JSON. Plans return calldata (<code className="t-num text-[13px]">to · data · value</code> on the league&rsquo;s chain) for the user&rsquo;s
              wallet to sign in order. The guide agents read is <a className="underline" href="/agent.md">/agent.md</a>; the installable skill is{" "}
              <a className="underline" href="https://github.com/NECOKIZZ/kickoffstocks/tree/main/skills/kickoff-stocks" target="_blank" rel="noreferrer">
                skills/kickoff-stocks
              </a>
              .
            </p>
            <div id="api" className="overflow-x-auto rounded-[16px] border border-line">
              <table className="w-full min-w-[560px] text-left text-[14px]">
                <tbody>
                  {ENDPOINTS.map(([m, p, d]) => (
                    <tr key={p} className="border-b border-line last:border-0">
                      <td className="t-num w-16 px-4 py-2.5 text-muted">{m}</td>
                      <td className="t-num px-4 py-2.5">{p}</td>
                      <td className="px-4 py-2.5 text-muted">{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <pre className="t-num overflow-x-auto rounded-[16px] bg-brand-ink p-5 text-[13px] leading-relaxed text-brand-paper/85">{`# plan over plain HTTP, then have the user's wallet send each step in order
curl -s -X POST $SITE/api/plan -H 'content-type: application/json' \\
  -d '{"action":"back","wallet":"0x…","teamKey":"0x…"}'

# or sign with a local key (bots, testing)
AGENT_PRIVATE_KEY=0x… LEAGUE_API=$SITE npx tsx scripts/agent.mts run '{"action":"back","teamKey":"0x…"}'`}</pre>
          </div>
        </details>
      </Container>
    </Shell>
  );
}
