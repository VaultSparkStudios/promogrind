import React, { useEffect } from "react";
import { useToast } from "../contexts.jsx";

export function CheckoutListener() {
  const toast = useToast();

  useEffect(() => {
    const handler = () => toast && toast("Paid upgrades launching soon - stay tuned!");
    window.addEventListener("pg:checkout-unavailable", handler);
    return () => window.removeEventListener("pg:checkout-unavailable", handler);
  }, [toast]);

  return null;
}
