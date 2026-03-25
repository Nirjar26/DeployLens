import { useEffect, useMemo, useState } from "react";

export type ToastKind = "success" | "error" | "info";

export type ToastItem = {
  id: string;
  kind: ToastKind;
  title: string;
  message?: string;
  durationMs: number;
};

type ToastProps = {
  toasts: ToastItem[];
  onClose: (id: string) => void;
};

function SuccessIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 1.5a6.5 6.5 0 110 13 6.5 6.5 0 010-13zm2.95 4.4l-3.43 3.6-1.47-1.39a.75.75 0 10-1.03 1.08l2.01 1.91c.3.28.77.27 1.05-.02l3.95-4.14a.75.75 0 10-1.08-1.04z" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 1.5a6.5 6.5 0 110 13 6.5 6.5 0 010-13zm2.47 3.97a.75.75 0 10-1.06-1.06L8 5.88 6.6 4.41a.75.75 0 10-1.06 1.06L6.94 6.9 5.47 8.3a.75.75 0 101.06 1.06L8 7.95l1.4 1.41a.75.75 0 001.06-1.06L9.06 6.9l1.41-1.43z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 1.5a6.5 6.5 0 110 13 6.5 6.5 0 010-13zm0 2.7a.85.85 0 100 1.7.85.85 0 000-1.7zm.8 8V6.9H7.2v5.3h1.6z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M4.22 4.22a.75.75 0 011.06 0L8 6.94l2.72-2.72a.75.75 0 111.06 1.06L9.06 8l2.72 2.72a.75.75 0 01-1.06 1.06L8 9.06l-2.72 2.72a.75.75 0 01-1.06-1.06L6.94 8 4.22 5.28a.75.75 0 010-1.06z" />
    </svg>
  );
}

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: (id: string) => void }) {
  const [remaining, setRemaining] = useState(100);

  useEffect(() => {
    const tickMs = 80;
    const decrement = (tickMs / toast.durationMs) * 100;
    const interval = window.setInterval(() => {
      setRemaining((current) => Math.max(0, current - decrement));
    }, tickMs);
    return () => window.clearInterval(interval);
  }, [toast.durationMs]);

  useEffect(() => {
    const timer = window.setTimeout(() => onClose(toast.id), toast.durationMs);
    return () => window.clearTimeout(timer);
  }, [toast.durationMs, toast.id, onClose]);

  const Icon = useMemo(() => {
    if (toast.kind === "success") return SuccessIcon;
    if (toast.kind === "error") return ErrorIcon;
    return InfoIcon;
  }, [toast.kind]);

  return (
    <div className="toast-item">
      <div className={`toast-icon ${toast.kind}`}><Icon /></div>
      <div className="toast-content">
        <div className="toast-title">{toast.title}</div>
        {toast.message ? <div className="toast-message">{toast.message}</div> : null}
      </div>
      <button type="button" className="toast-close" onClick={() => onClose(toast.id)} aria-label="Close">
        <CloseIcon />
      </button>
      <div className="toast-progress-track">
        <div className={`toast-progress-fill ${toast.kind}`} style={{ width: `${remaining}%` }} />
      </div>
    </div>
  );
}

export default function Toast({ toasts, onClose }: ToastProps) {
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((item) => (
        <ToastCard key={item.id} toast={item} onClose={onClose} />
      ))}
    </div>
  );
}
