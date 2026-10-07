"use client";

// Connect: injected wallets (MetaMask, Rabby, Robinhood Wallet…), in Kickoff's
// style: a 3D accent button, then a wallet chip with your avatar, address and
// ticket balance. On testnet the chip offers free test USDG (TestUSDG's
// faucet) when you're low. A wallet on another chain gets a switch button.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { STOCKS } from "../../ui/data/stocks";
import { erc20Abi, formatUnits, parseAbi } from "viem";
import { useConnection, useDisconnect, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { Button3D } from "../../ui/brand/Button3D";
import { WalletAvatar, shortAddress } from "../../ui/brand/Avatar";
import { useAgentWallets, useConfig } from "../hooks";
import { ConnectModal, walletErrorMessage } from "./ConnectModal";

export const short = shortAddress;

const faucetAbi = parseAbi(["function faucet()"]);

export function useTicketBalance(address?: `0x${string}`) {
  const { data: cfg } = useConfig();
  return useReadContract({
    address: cfg?.usdg,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: cfg?.chainId as never,
    query: { enabled: !!cfg?.usdg && !!address, refetchInterval: 20_000 },
  });
}

/** `dropUp` opens the wallet menu above the chip (the sidebar keeps it at the bottom). */
export function ConnectButton({ size = "sm", dropUp = false }: { size?: "sm" | "md"; dropUp?: boolean }) {
  const { address, chainId, isConnected } = useConnection();
  const [picker, setPicker] = useState(false);
  const closePicker = useCallback(() => setPicker(false), []);
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const { data: cfg } = useConfig();
  const qc = useQueryClient();
  const agents = useAgentWallets();
  const { data: bal, refetch } = useTicketBalance(address);
  const { writeContractAsync, isPending: topping } = useWriteContract();
  const [note, setNote] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const btnSize = size === "sm" ? "sm" : "md";
  if (!mounted)
    return (
      <Button3D size={btnSize} color="accent">
        Connect wallet
      </Button3D>
    );

  if (!isConnected || !address)
    return (
      <>
        <Button3D size={btnSize} color="accent" onClick={() => setPicker(true)}>
          Connect wallet
        </Button3D>
        <ConnectModal open={picker} onClose={closePicker} />
      </>
    );

  if (cfg && chainId !== cfg.chainId)
    return (
      <span className="inline-flex max-w-full flex-col gap-2">
        <Button3D
          size={btnSize}
          color="purple"
          onClick={async () => {
            setNote(null);
            try {
              await switchChainAsync({ chainId: cfg.chainId as never });
            } catch (e) {
              setNote(walletErrorMessage(e));
            }
          }}
        >
          Switch to {cfg.chain === "local" ? "the local chain" : cfg.chainName}
        </Button3D>
        {note && (
          <span role="alert" className="max-w-[320px] break-words rounded-[12px] px-3 py-2 text-[13px] leading-snug" style={{ background: "var(--down-bg)", color: "var(--down)" }}>
            {note}
          </span>
        )}
      </span>
    );

  const decimals = cfg?.usdgDecimals ?? 6;
  const tickets = bal !== undefined ? Number(formatUnits(bal, decimals)) : null;
  const unit = cfg?.chain === "mainnet" ? "USDG" : "tUSDG";
  const low = tickets !== null && tickets < 10;
  const canFaucet = cfg?.chain === "testnet" && !!cfg.usdg;
  // Testnet crypto slice: our own tWBTC / tWETH faucet tokens (deployments.json).
  const testCrypto = cfg?.chain === "testnet" ? STOCKS.filter((s) => s.kind === "crypto" && s.testnet) : [];

  async function claimCrypto() {
    setNote(null);
    try {
      for (const s of testCrypto) await writeContractAsync({ address: s.testnet!, abi: faucetAbi, functionName: "faucet", chainId: cfg!.chainId as never });
      setNote("Sent: test BTC + ETH on the way");
      setTimeout(() => qc.invalidateQueries(), 4000);
    } catch (e) {
      setNote(walletErrorMessage(e));
    }
  }

  async function topUp() {
    setNote(null);
    try {
      const hash = await writeContractAsync({ address: cfg!.usdg, abi: faucetAbi, functionName: "faucet", chainId: cfg!.chainId as never });
      setNote(`Sent: ${hash.slice(0, 10)}…`);
      setTimeout(() => {
        refetch();
        qc.invalidateQueries();
      }, 4000);
    } catch (e) {
      setNote(walletErrorMessage(e));
    }
  }

  return (
    <div ref={ref} className="relative flex flex-wrap items-center gap-2">
      {tickets !== null && (
        <span className="hidden whitespace-nowrap text-[12.5px] font-semibold text-muted sm:inline" title={`${unit} in your wallet (tickets are paid in ${unit})`}>
          {tickets.toFixed(2)} {unit}
        </span>
      )}
      {canFaucet && low && (
        <button
          type="button"
          onClick={topUp}
          disabled={topping}
          title={note ?? "Claim 50 free test USDG (once an hour)"}
          className="whitespace-nowrap rounded-[8px] border px-2.5 py-1.5 text-[12px] font-bold disabled:opacity-50"
          style={{ borderColor: "var(--ui-accent)", color: note && !note.startsWith("Sent") ? "var(--down)" : "var(--ui-accent)" }}
        >
          {topping ? "Topping up…" : (
            <>
              Get<span className="hidden sm:inline"> test</span> USDG
            </>
          )}
        </button>
      )}
      <button
        type="button"
        className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 text-[13px] font-semibold text-ink transition hover:brightness-95"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <WalletAvatar address={address} size={26} agent={agents.has(address.toLowerCase())} />
        <span className="t-num">{short(address)}</span>
      </button>
      {note && (
        <span
          role={note.startsWith("Sent") ? "status" : "alert"}
          className="w-full max-w-[320px] break-words rounded-[12px] px-3 py-2 text-[13px] leading-snug"
          style={note.startsWith("Sent") ? { background: "var(--up-bg)", color: "var(--up)" } : { background: "var(--down-bg)", color: "var(--down)" }}
        >
          {note}
        </span>
      )}
      {open && (
        <div className={`absolute z-50 w-56 overflow-hidden rounded-[16px] border border-line bg-bg p-1.5 shadow-lift ${dropUp ? "bottom-full left-0 mb-2" : "right-0 top-full mt-2"}`}>
          <Link href="/me" className="block rounded-[10px] px-3 py-2 text-[14px] hover:bg-surface" onClick={() => setOpen(false)}>
            My entries
          </Link>
          <button type="button" className="block w-full rounded-[10px] px-3 py-2 text-left text-[14px] hover:bg-surface" onClick={() => navigator.clipboard?.writeText(address)}>
            Copy address
          </button>
          {cfg?.stockFaucet && (
            <a href={cfg.stockFaucet} target="_blank" rel="noreferrer" className="block rounded-[10px] px-3 py-2 text-[14px] hover:bg-surface">
              Testnet ETH + stocks ↗
            </a>
          )}
          {testCrypto.length > 0 && (
            <button type="button" className="block w-full rounded-[10px] px-3 py-2 text-left text-[14px] hover:bg-surface" title="Once an hour: about $80 each of test BTC and ETH" onClick={claimCrypto}>
              Get test BTC + ETH
            </button>
          )}
          <button
            type="button"
            className="block w-full rounded-[10px] px-3 py-2 text-left text-[14px] text-down hover:bg-surface"
            onClick={() => {
              disconnect();
              setOpen(false);
            }}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

export function ChainChip() {
  const { data: cfg } = useConfig();
  return (
    <span className="hidden items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[12px] font-semibold text-muted lg:inline-flex">
      <span className={`size-2 rounded-full ${cfg?.chain === "mainnet" ? "bg-brand-mint" : "bg-brand-purple"}`} />
      {cfg?.chain === "local" ? "Local demo chain" : cfg?.chain === "testnet" ? "Robinhood Chain testnet" : "Robinhood Chain"}
    </span>
  );
}
