import { ReactNode } from "react";

interface SettingsLayoutProps {
  children: ReactNode;
  maxWidth?: string;
}

export default function SettingsLayout({ children, maxWidth = "720px" }: SettingsLayoutProps) {
  return (
    <div style={{
      maxWidth,
      margin: "0 auto",
      padding: "0 32px 48px 32px",
    }}>
      {children}
    </div>
  );
}
