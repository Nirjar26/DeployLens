import { ButtonHTMLAttributes, ReactNode } from "react";

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
  className,
  disabled,
  ...props
}: AuthButtonProps) {
  return (
    <button
      className={`auth-btn ${variant === "secondary" ? "auth-btn-secondary" : "auth-btn-primary"} ${className ?? ""}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <span className="spinner" aria-hidden="true" /> : icon ? <span>{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
}
