import { Shell, PageHead, Container } from "@/web/components/Shell";
import { LeaguePage } from "@/web/components/LeaguePage";

export const metadata = { title: "League · Kickoff Stocks" };

export default function League() {
  return (
    <Shell>
      <PageHead label="This round" title="The league">
        Every ETF in the round, ranked by return so far. Finish above AVERAGE and you win a share of the tickets below it. Click an ETF to back it or buy it.
      </PageHead>
      <Container>
        <LeaguePage />
      </Container>
    </Shell>
  );
}
