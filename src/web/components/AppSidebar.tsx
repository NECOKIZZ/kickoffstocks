"use client";

// The app's fixed left sidebar (laptops and up): the lockup, the wallet,
// the pages in two groups, then Getting started, theme and the network, and
// Build your ETF at the bottom. Phones get a slim top bar with the drawer.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Bot, CirclePlus, Flag, Medal, Moon, Sun, Trophy, Wallet } from "lucide-react";
import { Button3D } from "../../ui/brand/Button3D";
import { MobileNav } from "../../ui/brand/MobileNav";
import { ProfitMark } from "../../ui/brand/ProfitMark";
import { useDarkMode } from "../../ui/brand/ThemeToggle";
import { ChainChip, ConnectButton } from "./ConnectButton";
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
  const router = useRouter();
  const [dark, toggle] = useDarkMode();
  const { count } = useGettingStarted();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col border-r border-line bg-surface lg:flex">
      <div className="flex items-center justify-between px-5 pb-5 pt-6">
        <Link href="/" aria-label="Profit Markets home">
          <ProfitMark size={22} />
        </Link>
      </div>
      <div className="px-4">
        <div className="rounded-[16px] border border-line bg-bg p-3">
          <p className="t-label mb-2.5 text-muted">Wallet</p>
          <ConnectButton />
        </div>
      </div>
      <nav className="mt-6 flex-1 space-y-6 overflow-y-auto px-4">
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
      <div className="space-y-1 px-4 pb-3">
        <button type="button" onClick={openGettingStarted} className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left font-clash text-[14px] font-medium text-muted hover:text-ink">
          <Flag size={17} strokeWidth={1.8} />
          <span className="flex-1">Getting started</span>
          <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: count === 5 ? "var(--up-bg)" : "var(--bg)", color: count === 5 ? "var(--up)" : "var(--muted)" }}>
            {count}/5
          </span>
        </button>
        <button type="button" onClick={toggle} className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left font-clash text-[14px] font-medium text-muted hover:text-ink">
          {dark ? <Sun size={17} strokeWidth={1.8} /> : <Moon size={17} strokeWidth={1.8} />}
          {dark ? "Light mode" : "Dark mode"}
        </button>
        <div className="px-3 pb-2 pt-1 [&>span]:!inline-flex">
          <ChainChip />
        </div>
      </div>
      <div className="border-t border-line p-4">
        <Button3D color="green" size="md" className="w-full" onClick={() => router.push("/create")}>
          Build your ETF
        </Button3D>
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
