import type { Metadata } from "next";
import { PitchPage } from "@/web/components/PitchPage";
import "./pitch.css";

export const metadata: Metadata = {
  title: "Pitch · Profit Markets by Kickoff",
  description: "Gamified ETFs on Robinhood Chain: build an ETF from real Robinhood Stock Tokens, lock it for the week, and beat the median to get paid on Friday.",
};

export default function Pitch() {
  return <PitchPage />;
}
