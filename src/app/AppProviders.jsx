import React from "react";
import { AppDataCtx, CompactCtx, CurrencyCtx, ToastProvider } from "../contexts.jsx";

export function AppProviders({
  appData,
  syncAppData,
  user,
  syncDiagnostics,
  syncStatus,
  isOnline,
  compactMode,
  currencyCtxVal,
  children,
}) {
  return (
    <ToastProvider>
      <AppDataCtx.Provider value={{ appData, syncAppData, user, syncDiagnostics, syncStatus, isOnline }}>
        <CompactCtx.Provider value={compactMode}>
          <CurrencyCtx.Provider value={currencyCtxVal}>
            {children}
          </CurrencyCtx.Provider>
        </CompactCtx.Provider>
      </AppDataCtx.Provider>
    </ToastProvider>
  );
}

export function FeatureFlagProviders({
  appData,
  syncAppData,
  user,
  syncDiagnostics,
  syncStatus,
  isOnline,
  children,
}) {
  return (
    <ToastProvider>
      <AppDataCtx.Provider value={{ appData, syncAppData, user, syncDiagnostics, syncStatus, isOnline }}>
        {children}
      </AppDataCtx.Provider>
    </ToastProvider>
  );
}
