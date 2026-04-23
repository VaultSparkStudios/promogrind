import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { captureException, initAnalytics } from "./analytics.js";

const App = React.lazy(() => import("./App.jsx"));

class BootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    captureException(error, { componentStack: errorInfo?.componentStack || "" });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, color: "#e2e8f0", fontFamily: "monospace" }}>
          Something went wrong. Refresh to try again.
        </div>
      );
    }
    return this.props.children;
  }
}

function LoadingApp() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0a0e17", color: "#cbd5e1", fontFamily: "monospace", fontSize: 12 }}>
      Loading PromoGrind…
    </div>
  );
}

function scheduleBackgroundWork(callback) {
  if (typeof window === "undefined") return;
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(() => callback(), { timeout: 1500 });
    return;
  }
  window.setTimeout(callback, 300);
}

scheduleBackgroundWork(() => {
  import("./sw-register.js").then(({ registerSW }) => registerSW()).catch(() => {});
  initAnalytics();
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BootErrorBoundary>
      <BrowserRouter basename={import.meta.env.VITE_APP_BASE_PATH || "/"}>
        <Suspense fallback={<LoadingApp />}>
          <App />
        </Suspense>
      </BrowserRouter>
    </BootErrorBoundary>
  </React.StrictMode>,
);
