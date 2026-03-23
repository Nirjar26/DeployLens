import { InputHTMLAttributes, ReactNode } from "react";

type AuthInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  rightElement?: ReactNode;
};

export default function AuthInput({ label, error, rightElement, id, ...props }: AuthInputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="auth-field">
      <label htmlFor={inputId} className="auth-label">
        {label}
      </label>
      <div className="auth-input-shell">
        <input id={inputId} className={`auth-input ${error ? "auth-input-error" : ""}`} {...props} />
        {rightElement ? <div className="auth-input-right">{rightElement}</div> : null}
      </div>
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}
