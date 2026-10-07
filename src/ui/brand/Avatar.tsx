// A wallet's identity on screen: its short address. (Generated avatars and the
// agent badge are off until there are designs for them.)

export const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function Identity({ address, className = "" }: { address: string; size?: number; agent?: boolean; className?: string }) {
  return <span className={`t-num ${className}`}>{shortAddress(address)}</span>;
}
