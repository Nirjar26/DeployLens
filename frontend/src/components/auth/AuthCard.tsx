import { CSSProperties, ReactNode } from "react";

type AuthCardProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
};

export default function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  const cardWrapStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    maxWidth: "400px",
    margin: "0 auto",
    padding: "48px 32px",
  };

  const wordmarkStyle: CSSProperties = {
    fontSize: "24px",
    fontWeight: 700,
    color: "var(--accent)",
    margin: 0,
  };

  const titleStyle: CSSProperties = {
    fontSize: "28px",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: 0,
  };

  const subtitleStyle: CSSProperties = {
    fontSize: "14px",
    color: "var(--text-secondary)",
    margin: 0,
  };

  const footerStyle: CSSProperties = {
    fontSize: "13px",
    color: "var(--text-secondary)",
    textAlign: "center",
  };

  return (
    <div style={cardWrapStyle}>
      <div style={wordmarkStyle}>DeployLens</div>
      <h1 style={titleStyle}>{title}</h1>
      <p style={subtitleStyle}>{subtitle}</p>
      {children}
      <div style={footerStyle}>{footer}</div>
    </div>
  );
}
