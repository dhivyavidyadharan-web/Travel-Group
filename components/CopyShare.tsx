"use client";

import { useState } from "react";

export default function CopyShare({ url, whatsappUrl }: { url: string; whatsappUrl: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-line bg-page px-4 py-3 font-mono text-sm break-all">{url}</div>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          className="btn-primary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
            } catch {
              window.prompt("Copy this link", url);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? "✓ Copied" : "Copy link"}
        </button>
        <a className="btn bg-[#25D366] text-white hover:brightness-95" href={whatsappUrl} target="_blank" rel="noreferrer">
          Share on WhatsApp
        </a>
      </div>
    </div>
  );
}
