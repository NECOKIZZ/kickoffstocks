// App frame: the fixed sidebar (top bar on phones), the live ticker, the page,
// a one-line legal note, and the Getting started checklist. No footer: the
// app is a workspace; the marketing footer lives on the landing page.

import Link from "next/link";
import { AnnouncementBar } from "../../ui/components/SiteHeader";
import { AppSidebar, AppTopBar } from "./AppSidebar";
import { GettingStarted } from "./GettingStarted";
import { LiveTicker } from "./LiveTicker";

export function Shell({ children, announce }: { children: React.ReactNode; announce?: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:pl-[268px]">
      <AppSidebar />
      <AppTopBar />
      {announce && <AnnouncementBar>{announce}</AnnouncementBar>}
      <LiveTicker />
      <main className="min-h-[70vh]">{children}</main>
      <div className="mx-auto mt-20 flex max-w-[1280px] flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-6 text-[12px] text-muted md:px-6">
        <p>Profit Markets by Kickoff, on Robinhood Chain. &ldquo;ETF&rdquo; means an on-chain basket of tokenized stocks, not a regulated fund. Not investment advice.</p>
        <div className="flex gap-4">
          <Link href="/rules" className="hover:text-ink">Rules</Link>
          <Link href="/rules#risk" className="hover:text-ink">Risk</Link>
          <a href="https://github.com/NECOKIZZ/kickoffstocks" className="hover:text-ink">GitHub</a>
          <a href="https://kickoff.cash" className="hover:text-ink">Kickoff</a>
        </div>
      </div>
      <GettingStarted />
    </div>
  );
}

export function PageHead({ label, title, children }: { label: string; title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-8 pt-12 md:px-6 md:pt-16">
      <div className="t-label text-muted">{label}</div>
      <h1 className="t-heading mt-3 text-[34px] md:text-[48px]">{title}</h1>
      {children && <div className="mt-4 max-w-[62ch] text-[16px] text-muted">{children}</div>}
    </div>
  );
}

export function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-[1280px] px-4 md:px-6 ${className}`}>{children}</div>;
}
