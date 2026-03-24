import { CSSProperties, InputHTMLAttributes, ReactNode } from "react";

type AuthInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  rightElement?: ReactNode;
};

export default function AuthInput({ label, error, rightElement, id, ...props }: AuthInputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  const fieldStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  };

  const labelStyle: CSSProperties = {
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--text-primary)",
  };

  const inputShellStyle: CSSProperties = {
    position: "relative",
    display: "flex",
    alignItems: "center",
  };

  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    border: `1px solid ${error ? "var(--status-failed)" : "var(--border-light)"}`,
    borderRadius: "var(--radius-md)",
    backgroundColor: "var(--bg-surface)",
    color: "var(--text-primary)",
    fontSize: "14px",
    fontFamily: "var(--font-sans)",
    transition: "all var(--transition-fast)",
    outline: "none",
  };

  const inputRightStyle: CSSProperties = {
    position: "absolute",
    right: "10px",
    display: "flex",
    alignItems: "center",
  };

  const errorStyle: CSSProperties = {
    fontSize: "12px",
    color: "var(--status-failed)",
    fontWeight: 500,
    margin: 0,
  };

  const ghostIconBtnStyle: CSSProperties = {
    background: "none",
    border: "none",
    padding: "4px",
    cursor: "pointer",
    color: "var(--text-muted)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all var(--transition-fast)",
  };

  return (
    <div style={fieldStyle}>
      <label htmlFor={inputId} style={labelStyle}>
        {label}
      </label>
      <div style={inputShellStyle}>
        <input
          id={inputId}
          style={inputStyle}
          {...props}
        />
        {rightElement ? (
          <div style={inputRightStyle}>
            {typeof rightElement === "object" && rightElement !== null && "type" in rightElement && rightElement.type === "button"
              ? rightElement
              : <button type="button" style={ghostIconBtnStyle}>{rightElement}</button>}
          </div>
        ) : null}
      </div>
      {error ? <p style={errorStyle}>{error}</p> : null}
    </div>
  );
}
