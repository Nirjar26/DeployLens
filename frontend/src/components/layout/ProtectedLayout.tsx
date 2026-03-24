import { ReactNode } from "react";
import Sidebar from "../dashboard/Sidebar";

interface ProtectedLayoutProps {
  children: ReactNode;
  onLogout: () => void;
}

export default function ProtectedLayout({ children, onLogout }: ProtectedLayoutProps) {
  return (
    <div style={{
      display: "flex",
      height: "100vh",
      overflow: "hidden",
      backgroundColor: "var(--bg-page)",
    }}>
      <Sidebar onLogout={onLogout} />
      <main style={{
        marginLeft: "var(--sidebar-width)",
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}>
        {children}
      </main>
    </div>
  );
}
