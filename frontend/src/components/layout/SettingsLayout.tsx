import { ReactNode } from "react";

interface SettingsLayoutProps {
  children: ReactNode;
  maxWidth?: string;
}

export default function SettingsLayout({ children, maxWidth = "100%" }: SettingsLayoutProps) {
  return (
    <div style={{
      width: "100%",
      maxWidth,
      padding: "0 32px 48px 32px",
      boxSizing: "border-box",
    }}>
      {children}
    </div>
  );
}
