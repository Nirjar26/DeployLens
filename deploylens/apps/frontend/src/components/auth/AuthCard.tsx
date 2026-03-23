import { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
};

export default function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="auth-card-wrap">
      <div className="wordmark">DeployLens</div>
      <h1 className="auth-title">{title}</h1>
      <p className="auth-subtitle">{subtitle}</p>
      {children}
      <div className="auth-footer">{footer}</div>
    </div>
  );
}
