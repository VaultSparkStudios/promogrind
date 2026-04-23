import React from "react";
import { FX } from "../contexts.jsx";
import { K, KD, KL, f } from "../lib/shared.js";
import { loadData, readSyncDiagnostics, saveData, triggerQueueFlush } from "../sync.js";
import { useViewport } from "./responsive.js";

export function usePromoAppShell({ onboardingKey }) {
  const [darkMode, setDarkMode] = React.useState(() => {
    try {
      return localStorage.getItem("pg_theme") !== "light";
    } catch {
      return true;
    }
  });
  Object.assign(K, darkMode ? KD : KL);
  React.useEffect(() => {
    try {
      localStorage.setItem("pg_theme", darkMode ? "dark" : "light");
    } catch {}
    document.body.style.background = K.bg;
    document.body.style.color = K.tx;
    document.body.classList.toggle("light", !darkMode);
  }, [darkMode]);

  const toggleTheme = () => setDarkMode((current) => !current);
  const [compactMode, setCompactMode] = React.useState(() => {
    try {
      return localStorage.getItem("pg_compact") === "true";
    } catch {
      return false;
    }
  });
  const toggleCompact = () => setCompactMode((current) => {
    const next = !current;
    try {
      localStorage.setItem("pg_compact", String(next));
    } catch {}
    return next;
  });

  const [appData, setAppData] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem("promo_engine_v3")) || {};
    } catch {
      return {};
    }
  });
  const [syncStatus, setSyncStatus] = React.useState(null);
  const [syncDiagnostics, setSyncDiagnostics] = React.useState(() => readSyncDiagnostics());
  const syncTimer = React.useRef(null);

  const viewport = useViewport();

  const [currency, setCurrency] = React.useState(() => {
    try {
      return localStorage.getItem("pg_currency") || "USD";
    } catch {
      return "USD";
    }
  });
  const currencyCtxVal = React.useMemo(() => {
    const fx = FX[currency] || FX.USD;
    return { ...fx, fmt: (value) => fx.sym + f(Number(value || 0) * (fx.rate || 1)) };
  }, [currency]);

  const [isOnline, setIsOnline] = React.useState(() => {
    try {
      return navigator.onLine;
    } catch {
      return true;
    }
  });

  React.useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      setSyncDiagnostics(readSyncDiagnostics());
      try {
        if (localStorage.getItem("pg_sync_pending")) {
          saveData(appData).then(() => {
            localStorage.removeItem("pg_sync_pending");
            setSyncDiagnostics(readSyncDiagnostics());
          }).catch(() => {
            setSyncDiagnostics(readSyncDiagnostics());
          });
        }
      } catch {}
    };
    const onOffline = () => {
      setIsOnline(false);
      setSyncDiagnostics(readSyncDiagnostics());
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [appData]);

  React.useEffect(() => {
    loadData().then((data) => {
      if (data) setAppData(data);
      const nextDiagnostics = readSyncDiagnostics();
      setSyncDiagnostics(nextDiagnostics);
      if (nextDiagnostics.hasPendingWrites) triggerQueueFlush().catch(() => {});
    });
  }, []);

  const syncAppData = React.useCallback((nextData) => {
    setAppData(nextData);
    setSyncStatus("syncing");
    saveData(nextData).then(() => {
      setSyncStatus("saved");
      setSyncDiagnostics(readSyncDiagnostics());
      clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => setSyncStatus(null), 2000);
    }).catch(() => {
      setSyncStatus(null);
      try {
        localStorage.setItem("pg_sync_pending", "true");
      } catch {}
      setSyncDiagnostics(readSyncDiagnostics());
    });
  }, []);

  const [showCalcSearch, setShowCalcSearch] = React.useState(false);
  const [showOnboarding, setShowOnboarding] = React.useState(() => {
    try {
      return !localStorage.getItem(onboardingKey);
    } catch {
      return false;
    }
  });
  const dismissOnboarding = React.useCallback(() => {
    try {
      localStorage.setItem(onboardingKey, "1");
    } catch {}
    setShowOnboarding(false);
  }, [onboardingKey]);

  return {
    darkMode,
    toggleTheme,
    compactMode,
    toggleCompact,
    appData,
    setAppData,
    syncAppData,
    syncStatus,
    syncDiagnostics,
    winW: viewport.width,
    viewport,
    isMobile: viewport.isMobile,
    isTablet: viewport.isTablet,
    isDesktop: viewport.isDesktop,
    currency,
    setCurrency,
    currencyCtxVal,
    isOnline,
    showCalcSearch,
    setShowCalcSearch,
    showOnboarding,
    dismissOnboarding,
  };
}
