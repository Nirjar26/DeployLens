import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import Toast, { ToastItem, ToastKind } from "../components/shared/Toast";

type ToastApi = {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

function durationForKind(kind: ToastKind): number {
  return kind === "error" ? 6000 : 4000;
}

function makeToast(kind: ToastKind, title: string, message?: string): ToastItem {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind,
    title,
    message,
    durationMs: durationForKind(kind),
  };
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, title: string, message?: string) => {
    setToasts((current) => {
      const next = [makeToast(kind, title, message), ...current];
      return next.slice(0, 3);
    });
  }, []);

  const api = useMemo<ToastApi>(() => ({
    success: (title, message) => push("success", title, message),
    error: (title, message) => push("error", title, message),
    info: (title, message) => push("info", title, message),
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Toast toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return { toast: context };
}
