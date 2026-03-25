import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/tokens.css";
import "./styles.css";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ToastProvider } from "./hooks/useToast";
import AppErrorBoundary from "./components/shared/AppErrorBoundary";

console.log("DeployLens: main.tsx loaded, rendering app...");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppErrorBoundary>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AppErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>,
);
