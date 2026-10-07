import type { Metadata } from "next";
import { PitchPage } from "@/web/components/PitchPage";

export const metadata: Metadata = {
  title: "Pitch · Profit Markets by Kickoff",
  description: "Fantasy league, real stocks: build an ETF from Robinhood Stock Tokens, beat the median, get paid Friday. Live on Robinhood Chain testnet.",
};

export default function Pitch() {
  return <PitchPage />;
}
