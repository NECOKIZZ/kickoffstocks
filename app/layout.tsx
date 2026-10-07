import type { Metadata } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/web/Providers";

// Stock card type (design handoff). The site itself uses Kickoff's fonts,
// loaded as links below: Fraunces (large type), Clash Display (UI), Inter (body).
const archivo = Archivo({ subsets: ["latin"], weight: ["500", "700", "800", "900"], variable: "--font-archivo" });
const jbMono = JetBrains_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-jbmono" });

const TITLE = "Profit Markets by Kickoff | Build an ETF, beat the median";
const DESCRIPTION =
  "Kickoff's weekly stock league on Robinhood Chain. Build an ETF from real Robinhood Stock Tokens, lock it with a $5 ticket, and beat the median to get paid Friday.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_ORIGIN ?? "https://stocks.kickoff.cash"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, siteName: "Kickoff", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

// Kickoff's theme script: apply the saved theme before paint (no light-mode
// flash), and tag <html> with .js so scroll-reveal only hides content when
// scripts actually run.
const themeScript = `
document.documentElement.classList.add('js');
try {
  var s = localStorage.getItem('kickoff-theme');
  var d = s ? s === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (d) document.documentElement.classList.add('dark');
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${jbMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* Brand fonts, as links: CSS @import gets stripped by the Tailwind build */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&display=swap" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,300;1,9..144,400;1,9..144,500&family=Inter:ital,opsz,wght@0,14..32,300..700;1,14..32,400&display=swap"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
