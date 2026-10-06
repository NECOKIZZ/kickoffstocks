import Link from "next/link";

// Kickoff buttons: always 3D. "primary" follows the theme accent (purple in
// light mode, green in dark), "mint" is Kickoff green, "ghost" a quiet 3D
// button, "text" a plain link.
type Variant = "primary" | "mint" | "purple" | "ghost" | "text";

const styles: Record<Variant, string> = {
  primary: "btn-3d btn-accent",
  mint: "btn-3d btn-green",
  purple: "btn-3d btn-purple",
  ghost: "btn-3d btn-ghost",
  text: "font-clash font-semibold text-ink hover:opacity-70",
};

export function Button({
  href,
  variant = "primary",
  size = "md",
  children,
  className = "",
  onClick,
  disabled,
  type = "button",
}: {
  href?: string;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const pad = variant === "text" ? "" : size === "lg" ? "px-8" : size === "sm" ? "px-3.5" : "px-5";
  const sz = `${size === "lg" ? "h-12 text-[0.95rem]" : size === "sm" ? "h-8 text-[0.78rem]" : "h-10 text-[0.875rem]"} ${pad}`;
  const cls = `inline-flex items-center justify-center gap-1.5 ${sz} ${styles[variant]} ${className}`;
  return href ? (
    <Link href={href} className={cls}>
      {children}
    </Link>
  ) : (
    // eslint-disable-next-line react/button-has-type
    <button type={type} className={cls} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
