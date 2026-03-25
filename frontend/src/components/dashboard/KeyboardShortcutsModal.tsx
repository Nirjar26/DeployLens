import { CSSProperties } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function KeyboardShortcutsModal({ open, onClose }: Props) {
  if (!open) return null;

  const overlayStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  };

  const modalStyle: CSSProperties = {
    background: "var(--bg-surface)",
    border: "1px solid var(--border-light)",
    borderRadius: "var(--radius-lg)",
    padding: "24px",
    maxWidth: "360px",
    width: "90%",
    boxShadow: "var(--shadow-lg)",
  };

  const headerStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "20px",
  };

  const titleStyle: CSSProperties = {
    fontSize: "16px",
    fontWeight: 700,
    color: "var(--text-primary)",
  };

  const closeButtonStyle: CSSProperties = {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    color: "var(--text-muted)",
    transition: "color var(--transition-fast)",
  };

  const shortcutsListStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  };

  const shortcutRowStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "13px",
  };

  const shortcutKeyStyle: CSSProperties = {
    display: "flex",
    gap: "4px",
  };

  const keyBadgeStyle: CSSProperties = {
    background: "var(--bg-sunken)",
    border: "1px solid var(--border-medium)",
    borderRadius: "var(--radius-sm)",
    padding: "2px 7px",
    fontFamily: "var(--font-mono, 'Courier New', monospace)",
    fontSize: "11px",
    fontWeight: 600,
    color: "var(--text-primary)",
  };

  const shortcutDescStyle: CSSProperties = {
    color: "var(--text-secondary)",
    fontSize: "13px",
  };

  const footerStyle: CSSProperties = {
    marginTop: "20px",
    paddingTop: "16px",
    borderTop: "1px solid var(--border-light)",
    display: "flex",
    justifyContent: "flex-end",
  };

  const closeBtnStyle: CSSProperties = {
    padding: "6px 16px",
    height: "32px",
    border: "1px solid var(--border-light)",
    borderRadius: "var(--radius-md)",
    background: "var(--bg-sunken)",
    color: "var(--text-primary)",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <div style={titleStyle}>Keyboard shortcuts</div>
          <button
            style={closeButtonStyle}
            onClick={onClose}
            title="Close"
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <div style={shortcutsListStyle}>
          {/* "/" Shortcut */}
          <div style={shortcutRowStyle}>
            <div style={shortcutDescStyle}>Focus branch search</div>
            <div style={shortcutKeyStyle}>
              <div style={keyBadgeStyle}>/</div>
            </div>
          </div>

          {/* "R" Shortcut */}
          <div style={shortcutRowStyle}>
            <div style={shortcutDescStyle}>Sync now</div>
            <div style={shortcutKeyStyle}>
              <div style={keyBadgeStyle}>R</div>
            </div>
          </div>

          {/* "Esc" Shortcut */}
          <div style={shortcutRowStyle}>
            <div style={shortcutDescStyle}>Close drawer / modal</div>
            <div style={shortcutKeyStyle}>
              <div style={keyBadgeStyle}>Esc</div>
            </div>
          </div>

          {/* "?" Shortcut */}
          <div style={shortcutRowStyle}>
            <div style={shortcutDescStyle}>Show this help</div>
            <div style={shortcutKeyStyle}>
              <div style={keyBadgeStyle}>?</div>
            </div>
          </div>
        </div>

        <div style={footerStyle}>
          <button
            style={closeBtnStyle}
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
