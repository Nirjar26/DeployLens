import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div style={{
      padding: "28px 32px 20px 32px",
      borderBottom: "1px solid var(--border-light)",
      background: "var(--bg-surface)",
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: "16px",
      position: "sticky",
      top: 0,
      zIndex: 10,
    }}>
      <div>
        <h1 style={{
          margin: 0,
          fontSize: "20px",
          fontWeight: 700,
          color: "var(--text-primary)",
          letterSpacing: "-0.3px",
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            margin: "2px 0 0 0",
            fontSize: "13px",
            color: "var(--text-muted)",
          }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
}
