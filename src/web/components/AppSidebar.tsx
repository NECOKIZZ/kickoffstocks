"use client";

// The app's sidebar (laptops and up): a card floating off the left edge with
// the lockup, the pages in two groups, then Getting started, the theme
// button and the wallet button at the bottom. Phones get a top bar with the
// drawer.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Bot, CirclePlus, Flag, Medal, SunMoon, Trophy, Wallet } from "lucide-react";
import { MobileNav } from "../../ui/brand/MobileNav";
import { ProfitMark } from "../../ui/brand/ProfitMark";
import { ThemeToggle } from "../../ui/brand/ThemeToggle";
import { ConnectButton } from "./ConnectButton";
import { openGettingStarted, useGettingStarted } from "./GettingStarted";

const GROUPS = [
  {
    label: "Play",
    items: [
      { label: "League", href: "/league", icon: Trophy },
      { label: "Build an ETF", href: "/create", icon: CirclePlus },
      { label: "Leaderboard", href: "/leaderboard", icon: Medal },
      { label: "My entries", href: "/me", icon: Wallet },
    ],
  },
  {
    label: "More",
    items: [
      { label: "Agents", href: "/agents", icon: Bot },
      { label: "Rules", href: "/rules", icon: BookOpen },
    ],
  },
];

export const APP_TABS = GROUPS.flatMap((g) => g.items.map(({ label, href }) => ({ label, href })));

function NavItem({ href, label, icon: Icon, active }: { href: string; label: string; icon: typeof Trophy; active: boolean }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-[12px] px-3 py-2.5 font-clash text-[14px] transition-colors"
      style={{
        background: active ? "var(--bg)" : "transparent",
        color: active ? "var(--ink)" : "var(--muted)",
        fontWeight: active ? 600 : 500,
        boxShadow: active ? "var(--card-shadow)" : "none",
      }}
    >
      <Icon size={17} strokeWidth={active ? 2.2 : 1.8} style={{ color: active ? "var(--ui-accent)" : undefined }} />
      <span className="group-hover:text-ink">{label}</span>
    </Link>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { count } = useGettingStarted();
  return (
    <aside className="fixed bottom-3 left-3 top-3 z-40 hidden w-[244px] flex-col rounded-[24px] border border-line bg-bg shadow-card lg:flex">
      <div className="flex items-center justify-between px-5 pb-6 pt-5">
        <Link href="/" aria-label="Profit Markets home">
          <ProfitMark size={22} />
        </Link>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3">
        {GROUPS.map((g) => (
          <div key={g.label}>
            <p className="t-label mb-2 px-3 text-muted">{g.label}</p>
            <div className="space-y-0.5">
              {g.items.map((it) => (
                <NavItem key={it.href} {...it} active={pathname.startsWith(it.href)} />
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="px-3 pb-2">
        <button type="button" onClick={openGettingStarted} className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left font-clash text-[14px] font-medium text-muted hover:bg-surface hover:text-ink">
          <Flag size={17} strokeWidth={1.8} />
          <span className="flex-1">Getting started</span>
          <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: count === 5 ? "var(--up-bg)" : "var(--surface)", color: count === 5 ? "var(--up)" : "var(--muted)" }}>
            {count}/5
          </span>
        </button>
        <div className="flex items-center gap-3 px-3 py-1.5">
          <SunMoon size={17} strokeWidth={1.8} className="text-muted" />
          <span className="flex-1 font-clash text-[14px] font-medium text-muted">Theme</span>
          <ThemeToggle />
        </div>
      </div>
      <div className="px-4 pb-4 pt-2 [&_a]:block [&_button]:w-full [&>div>div]:w-full">
        <ConnectButton size="md" dropUp />
      </div>
    </aside>
  );
}

/** Phones and tablets: the drawer, the lockup and the wallet. */
export function AppTopBar() {
  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-line px-4 py-2.5 lg:hidden"
      style={{ background: "color-mix(in srgb, var(--bg) 88%, transparent)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
    >
      <div className="flex items-center gap-2">
        <MobileNav tabs={APP_TABS} />
        <Link href="/" aria-label="Profit Markets home">
          <ProfitMark size={20} />
        </Link>
      </div>
      <ConnectButton />
    </header>
  );
}
