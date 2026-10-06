"use client";

// The MCP server address for this site, with a copy button.

import { useEffect, useState } from "react";

export function McpUrl() {
  const [origin, setOrigin] = useState("https://<this site>");
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}/api/mcp`;
  return (
    <div className="card-diagonal flex flex-wrap items-center justify-between gap-3 bg-surface p-4">
      <code className="t-num break-all text-[14px]">{url}</code>
      <button
        type="button"
        className="btn-3d btn-accent h-9 px-4 text-[13px]"
        onClick={() => {
          navigator.clipboard?.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? "Copied ✓" : "Copy"}
      </button>
    </div>
  );
}
