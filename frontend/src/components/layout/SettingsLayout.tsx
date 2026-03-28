import { ReactNode } from "react";

interface SettingsLayoutProps {
  children: ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div style={{
      width: "100%",
      maxWidth: "100%",
      padding: "0 32px 48px 32px",
      boxSizing: "border-box",
    }}>
      {children}
    </div>
  );
}
