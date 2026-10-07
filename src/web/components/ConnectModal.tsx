"use client";

// "Connect a wallet": every wallet this browser has (EIP-6963), so nobody is
// stuck with whichever extension grabbed window.ethereum; errors in plain
// words that wrap inside the dialog; and, for people without a wallet, what
// one is, where to get it, and how to open this page inside a phone wallet.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, ChevronRight, Loader2, Wallet, X } from "lucide-react";
import { useConnect, useConnectors, type Connector } from "wagmi";

/** A wallet / RPC error, said for a person rather than a developer. */
export function walletErrorMessage(e: unknown): string {
  const err = e as { name?: string; code?: number; cause?: { code?: number }; shortMessage?: string; message?: string } | null;
  const code = err?.code ?? err?.cause?.code;
  const text = `${err?.name ?? ""} ${err?.shortMessage ?? ""} ${err?.message ?? ""}`;
  if (code === 4001 || /UserRejected|rejected|denied|cancel/i.test(text))
    return "The request was cancelled in your wallet. If you just installed it, finish creating your wallet first (set a password, save your recovery phrase), then try again.";
  if (code === -32002 || /already pending|already processing/i.test(text))
    return "Your wallet already has a request waiting. Click the wallet icon in your browser's toolbar to open it.";
  if (/ProviderNotFound|ConnectorNotFound|not found|not installed/i.test(text))
    return "We couldn't reach that wallet. It may be switched off or not installed. Pick another one below, or install one.";
  if (/insufficient funds/i.test(text)) return "Not enough ETH for the network fee. Get free testnet ETH from the faucet in Getting started.";
  if (/chain|network/i.test(text) && /switch|add|unrecognized/i.test(text))
    return "Your wallet couldn't switch to Robinhood Chain. Open your wallet, add or select Robinhood Chain, then try again.";
  const first = (err?.shortMessage ?? err?.message ?? String(e)).split("\n")[0];
  return first.length > 160 ? `${first.slice(0, 157)}…` : first;
}

function useWalletList(connectors: readonly Connector[]) {
  // EIP-6963 wallets announce themselves with a name and icon; the generic
  // "Injected" connector only matters when nothing announced itself.
  const named = connectors.filter((c) => c.type === "injected" && c.id !== "injected");
  const hasInjected = typeof window !== "undefined" && !!(window as { ethereum?: unknown }).ethereum;
  const list = named.length ? named : hasInjected ? connectors.filter((c) => c.type === "injected") : [];
  const seen = new Set<string>();
  return list.filter((c) => (seen.has(c.name) ? false : (seen.add(c.name), true)));
}

const GET_WALLETS = [
  { name: "MetaMask", note: "The most used. Chrome, Firefox, Brave, Edge, phones.", href: "https://metamask.io/download/" },
  { name: "Rabby", note: "Clear about what you're signing. Desktop browsers.", href: "https://rabby.io/" },
  { name: "Robinhood Wallet", note: "From Robinhood. Phones.", href: "https://robinhood.com/web3-wallet/" },
];

export function ConnectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const connectors = useConnectors();
  const { connectAsync } = useConnect();
  const wallets = useWalletList(connectors);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      setShown(false);
      setError(null);
      setPending(null);
      return;
    }
    const raf = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  async function pick(c: Connector) {
    setError(null);
    setPending(c.uid);
    try {
      await connectAsync({ connector: c });
      onClose();
    } catch (e) {
      setError(walletErrorMessage(e));
    } finally {
      setPending(null);
    }
  }

  const here = typeof window === "undefined" ? "" : `${window.location.host}${window.location.pathname}`;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="cw-title">
      <div
        className="absolute inset-0"
        onClick={onClose}
        style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", opacity: shown ? 1 : 0, transition: "opacity .3s ease" }}
      />
      <div
        className="relative max-h-[92vh] w-full max-w-[460px] overflow-y-auto rounded-t-[28px] bg-bg text-ink shadow-lift sm:rounded-[28px]"
        style={{ transform: shown ? "none" : "translateY(20px)", opacity: shown ? 1 : 0, transition: "transform .45s cubic-bezier(0.22, 1, 0.36, 1), opacity .3s ease" }}
      >
        <div className="px-6 pb-2 pt-6 sm:px-7">
          <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full text-muted hover:bg-surface">
            <X size={18} />
          </button>
          <h2 id="cw-title" className="t-heading pr-10 text-[28px]">
            Connect a wallet
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">A wallet is a free app that holds your account and approves each step. We never see your password or keys.</p>
        </div>

        <div className="px-6 pt-4 sm:px-7">
          <p className="t-label mb-2 text-muted">On this device</p>
          {wallets.length ? (
            <ul className="space-y-2">
              {wallets.map((c) => (
                <li key={c.uid}>
                  <button
                    type="button"
                    onClick={() => pick(c)}
                    disabled={!!pending}
                    className="flex w-full items-center gap-3 rounded-[16px] border border-line bg-surface px-4 py-3.5 text-left transition hover:border-ink/30 disabled:opacity-60"
                  >
                    {c.icon ? <img src={c.icon} alt="" width={30} height={30} className="rounded-[8px]" /> : <Wallet size={26} className="text-muted" />}
                    <span className="flex-1">
                      <span className="block font-clash text-[16px] font-semibold">{c.id === "injected" ? "Browser wallet" : c.name}</span>
                      {pending === c.uid && <span className="block text-[13px] text-muted">Approve in your wallet window…</span>}
                    </span>
                    {pending === c.uid ? <Loader2 size={18} className="animate-spin text-muted" /> : <ChevronRight size={18} className="text-muted" />}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-[16px] bg-surface px-4 py-4 text-[15px] leading-relaxed text-muted">No wallet found in this browser. Get one below. It takes about two minutes.</p>
          )}
          {error && (
            <div role="alert" className="mt-3 break-words rounded-[14px] px-4 py-3 text-[14px] leading-relaxed" style={{ background: "var(--down-bg)", color: "var(--down)" }}>
              {error}
            </div>
          )}
        </div>

        <div className="mt-6 border-t border-line px-6 pb-6 pt-5 sm:px-7">
          <p className="t-label mb-2 text-muted">No wallet yet?</p>
          <ul className="space-y-1">
            {GET_WALLETS.map((w) => (
              <li key={w.name}>
                <a href={w.href} target="_blank" rel="noreferrer" className="flex items-start gap-3 rounded-[12px] px-2 py-2.5 hover:bg-surface">
                  <span className="flex-1">
                    <span className="block font-clash text-[15px] font-semibold">{w.name}</span>
                    <span className="block text-[13px] text-muted">{w.note}</span>
                  </span>
                  <ArrowUpRight size={16} className="mt-1 text-muted" />
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[13px] leading-relaxed text-muted">
            After installing, create your wallet in it, then come back and refresh this page. On a phone, open this page inside your wallet app&rsquo;s browser:
          </p>
          <a
            href={`https://metamask.app.link/dapp/${here}`}
            className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold text-accent underline-offset-4 hover:underline"
          >
            Open in the MetaMask app <ArrowUpRight size={14} />
          </a>
        </div>
      </div>
    </div>,
    document.body,
  );
}
