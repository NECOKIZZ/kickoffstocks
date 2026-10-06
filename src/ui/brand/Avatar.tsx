// Default avatars: your wallet address is your identity, so every address
// gets its own avatar drawn from Kickoff's brand: the logo's geometry (a
// circle and the K's wedge) in a Kickoff colour pair, picked and turned by a
// hash of the address. Same address, same avatar, everywhere.
//
// Wallets that play through an AI agent wear a small badge.

import { Bot } from "lucide-react";
import { BRAND } from "../data/palette";

const PAIRS: [bg: string, fg: string][] = [
  [BRAND.purple, BRAND.cream],
  [BRAND.green, BRAND.ink],
  [BRAND.ink, BRAND.green],
  [BRAND.ink, BRAND.purple],
  [BRAND.cream, BRAND.purple],
  [BRAND.canvas, BRAND.ink],
  [BRAND.purpleDeep, BRAND.green],
  [BRAND.greenDeep, BRAND.cream],
];

/** FNV-1a over the lower-case address: cheap, stable, well spread. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (const c of s.toLowerCase()) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0;
  return h;
}

export interface AvatarSpec {
  bg: string;
  fg: string;
  shape: number; // 0..3
  turn: number; // 0, 90, 180, 270
  mirror: boolean;
}

export function avatarSpec(address: string): AvatarSpec {
  const h = hash(address);
  const [bg, fg] = PAIRS[h % PAIRS.length];
  return { bg, fg, shape: (h >>> 3) % 4, turn: ((h >>> 5) % 4) * 90, mirror: ((h >>> 7) & 1) === 1 };
}

/** The four compositions, on a 100×100 tile. */
function Shape({ n, fg }: { n: number; fg: string }) {
  switch (n) {
    case 0: // the Kickoff mark: K wedge + ball
      return (
        <>
          <circle cx="72" cy="28" r="16" fill={fg} />
          <path d="M34 14 L84 86 H60 L34 50 V86 H14 V14 Z" fill={fg} />
        </>
      );
    case 1: // ball and its shadow
      return (
        <>
          <circle cx="40" cy="58" r="28" fill={fg} />
          <circle cx="76" cy="26" r="11" fill={fg} opacity="0.55" />
        </>
      );
    case 2: // wedge on the diagonal (the K's leg)
      return (
        <>
          <path d="M0 100 L100 0 V100 Z" fill={fg} opacity="0.9" />
          <circle cx="30" cy="30" r="13" fill={fg} />
        </>
      );
    default: // half pitch + centre spot
      return (
        <>
          <path d="M0 58 H100 V100 H0 Z" fill={fg} />
          <circle cx="50" cy="58" r="17" fill={fg} />
        </>
      );
  }
}

export function WalletAvatar({ address, size = 28, agent = false, className = "" }: { address: string; size?: number; agent?: boolean; className?: string }) {
  const s = avatarSpec(address);
  const id = `av-${address.slice(2, 10).toLowerCase()}`;
  return (
    <span className={`relative inline-flex shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`Avatar for ${address.slice(0, 6)}…${address.slice(-4)}`}>
        <defs>
          <clipPath id={id}>
            <circle cx="50" cy="50" r="50" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${id})`}>
          <rect width="100" height="100" fill={s.bg} />
          <g transform={`rotate(${s.turn} 50 50)${s.mirror ? " translate(100 0) scale(-1 1)" : ""}`}>
            <Shape n={s.shape} fg={s.fg} />
          </g>
        </g>
      </svg>
      {agent && (
        <span
          title="Plays through an AI agent"
          className="absolute grid place-items-center rounded-full"
          style={{
            right: -2,
            bottom: -2,
            width: Math.max(12, size * 0.45),
            height: Math.max(12, size * 0.45),
            background: "var(--ui-accent)",
            color: "var(--ui-accent-contrast)",
            border: "2px solid var(--bg)",
          }}
        >
          <Bot size={Math.max(8, size * 0.28)} strokeWidth={2.5} />
        </span>
      )}
    </span>
  );
}

export const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** Avatar + short address: how a player appears everywhere. */
export function Identity({ address, size = 24, agent = false, className = "" }: { address: string; size?: number; agent?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <WalletAvatar address={address} size={size} agent={agent} />
      <span className="t-num">{shortAddress(address)}</span>
    </span>
  );
}
