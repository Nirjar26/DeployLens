import { useEffect, useState } from "react";

type CopyButtonProps = {
  text: string;
  size?: "sm" | "md";
};

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M5 2.5A1.5 1.5 0 016.5 1h7A1.5 1.5 0 0115 2.5v8a1.5 1.5 0 01-1.5 1.5H12V10h1.5v-8h-7V3H5V2.5z" />
      <path d="M2.5 4A1.5 1.5 0 001 5.5v8A1.5 1.5 0 002.5 15h7A1.5 1.5 0 0011 13.5v-8A1.5 1.5 0 009.5 4h-7zm0 1.5h7v8h-7v-8z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M13.85 3.65a.75.75 0 00-1.06-1.06L6.5 8.88 3.2 5.58a.75.75 0 10-1.06 1.06l3.83 3.83a.75.75 0 001.06 0l6.82-6.82z" />
    </svg>
  );
}

export default function CopyButton({ text, size = "sm" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      className={`copy-btn ${size} ${copied ? "copied" : ""}`}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      }}
      aria-label="Copy"
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
}
