import { ReactNode } from "react";

interface SettingsLayoutProps {
  children: ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div style={{
      maxWidth: "720px",
      margin: "0 auto",
      padding: "0 32px 48px 32px",
    }}>
      {children}
    </div>
  );
}
