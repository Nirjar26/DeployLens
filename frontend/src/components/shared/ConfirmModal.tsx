import { useEffect, useState } from "react";

type ConfirmModalProps = {
  isOpen: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  confirmVariant: "danger" | "primary";
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
};

function WarningIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.25L2.75 20.5h18.5L12 3.25zm0 5.75a1 1 0 011 1v4.25a1 1 0 11-2 0V10a1 1 0 011-1zm0 9a1.25 1.25 0 100-2.5A1.25 1.25 0 0012 18z"
        fill="currentColor"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2.5a9.5 9.5 0 100 19 9.5 9.5 0 000-19zm0 5.25a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4zm1 9h-2v-5h2v5z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function ConfirmModal({
  isOpen,
  title,
  body,
  confirmLabel,
  confirmVariant,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        onCancel();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isSubmitting, onCancel]);

  if (!isOpen) return null;

  async function handleConfirm() {
    try {
      setIsSubmitting(true);
      await onConfirm();
      onCancel();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="confirm-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onCancel();
        }
      }}
      role="presentation"
    >
      <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
        <div className="confirm-modal-header">
          <span
            className={confirmVariant === "danger" ? "confirm-modal-icon danger" : "confirm-modal-icon primary"}
          >
            {confirmVariant === "danger" ? <WarningIcon /> : <InfoIcon />}
          </span>
          <h2 id="confirm-modal-title">{title}</h2>
          <p>{body}</p>
        </div>
        <div className="confirm-modal-footer">
          <button type="button" className="settings-btn settings-btn-secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            type="button"
            className={
              confirmVariant === "danger"
                ? "settings-btn settings-btn-danger"
                : "settings-btn settings-btn-primary"
            }
            onClick={() => void handleConfirm()}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="settings-spinner" aria-hidden="true" />
                Working...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
