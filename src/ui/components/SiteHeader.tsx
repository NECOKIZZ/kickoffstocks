"use client";

// Kickoff's app header: sticky, blurred, the monochrome Kickoff mark with the
// "Stocks" tag on the left, tabs in the centre (the selected one gets the
// accent underline), theme + wallet on the right. Phones get the drawer.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ProfitMark } from "../brand/ProfitMark";
import { MobileNav } from "../brand/MobileNav";
import { NavUnderlineItem } from "../brand/NavUnderline";
import { ThemeToggle } from "../brand/ThemeToggle";
import { ChainChip, ConnectButton } from "../../web/components/ConnectButton";

export const APP_TABS = [
  { label: "League", href: "/league" },
  { label: "Create", href: "/create" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "My Entries", href: "/me" },
  { label: "Agents", href: "/agents" },
  { label: "Rules", href: "/rules" },
];

export function AnnouncementBar({ children }: { children: React.ReactNode }) {
  return <div className="bg-brand-ink py-2.5 text-center font-clash text-[13px] text-brand-paper/80">{children}</div>;
}

/** The Kickoff × Profit Markets lockup. */
export function StocksMark({ size = 24, white = false }: { size?: number; white?: boolean }) {
  return <ProfitMark size={size} tone={white ? "white" : "mono"} />;
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <header
      className="sticky top-0 z-50 border-b border-line"
      style={{ background: "color-mix(in srgb, var(--bg) 82%, transparent)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
    >
      <div className="mx-auto flex max-w-[1180px] items-center gap-2 px-4 sm:grid sm:gap-0 sm:px-6" style={{ minHeight: 58, gridTemplateColumns: "1fr auto 1fr" }}>
        <div className="flex items-center gap-2" style={{ justifySelf: "start" }}>
          <MobileNav tabs={APP_TABS} />
          <Link href="/" aria-label="Kickoff Stocks home" className="flex sm:pl-2">
            <StocksMark />
          </Link>
        </div>
        <nav className="hidden items-center justify-center gap-6 sm:flex" style={{ minHeight: 40 }}>
          {APP_TABS.map((t) => (
            <NavUnderlineItem
              key={t.href}
              active={pathname.startsWith(t.href)}
              onClick={() => router.push(t.href)}
              className="flex h-full items-end whitespace-nowrap pb-[9px] text-[0.84rem]"
            >
              {t.label}
            </NavUnderlineItem>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 py-2 sm:ml-0 sm:gap-2.5 sm:py-0" style={{ justifySelf: "end" }}>
          <ChainChip />
          <span className="hidden sm:flex">
            <ThemeToggle />
          </span>
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
