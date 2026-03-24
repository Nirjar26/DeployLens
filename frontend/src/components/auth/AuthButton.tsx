import { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

type AuthButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
  icon?: ReactNode;
  variant?: "primary" | "secondary";
};

export default function AuthButton({
  children,
  isLoading = false,
  icon,
  variant = "primary",
  disabled,
  ...props
}: AuthButtonProps) {
  const buttonStyle: CSSProperties = {
    width: "100%",
    padding: "10px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    borderRadius: "var(--radius-md)",
    fontSize: "14px",
    fontWeight: 600,
    fontFamily: "var(--font-sans)",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all var(--transition-fast)",
    opacity: disabled ? 0.5 : 1,
    ...(variant === "secondary"
      ? {
          backgroundColor: "var(--bg-sunken)",
          color: "var(--text-primary)",
          borderColor: "var(--border-light)",
          border: "1px solid var(--border-light)",
        }
      : {
          backgroundColor: "var(--accent)",
          color: "#ffffff",
          border: "none",
        }),
  };

  const spinnerStyle: CSSProperties = {
    display: "inline-block",
    width: "14px",
    height: "14px",
    borderRadius: "var(--radius-full)",
    border: "2px solid rgba(255, 255, 255, 0.2)",
    borderTopColor: "#ffffff",
    animation: "spin 0.8s linear infinite",
  };

  return (
    <button
      style={buttonStyle}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <span style={spinnerStyle} aria-hidden="true" /> : icon ? <span>{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
}
