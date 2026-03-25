import { useEffect } from "react";

type KeyboardShortcutConfig = {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  handler: () => void;
  skipWhenTyping?: boolean;
};

export function useKeyboardShortcuts(shortcuts: KeyboardShortcutConfig[], enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const elem = document.activeElement as HTMLElement;
      const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(elem?.tagName || "");

      for (const shortcut of shortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = (shortcut.ctrlKey ?? false) === (e.ctrlKey || e.metaKey);
        const shiftMatch = (shortcut.shiftKey ?? false) === e.shiftKey;
        const altMatch = (shortcut.altKey ?? false) === e.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          if (shortcut.skipWhenTyping && isTyping) continue;

          e.preventDefault();
          shortcut.handler();
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts, enabled]);
}
