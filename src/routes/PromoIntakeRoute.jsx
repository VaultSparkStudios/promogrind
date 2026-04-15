import React from "react";
import { K } from "../lib/shared.js";
import { Tl } from "../ui.jsx";
import PromoIntakePanel from "../components/PromoIntakePanel.jsx";
import ShadowBookPanel from "../components/ShadowBookPanel.jsx";

/**
 * First extracted route as part of the long-running `App.jsx` decomposition.
 * Renders the promo intake pipeline above the Shadow Book Mode projection so
 * users who paste a promo also immediately see the cash they're leaving on
 * the table at books they don't yet have.
 *
 * Establishes the pattern for future extractions: a route component lives in
 * `src/routes/`, imports its dependencies, and is referenced by slug in the
 * TABS array in `src/App.jsx`. Keep route components presentational — shared
 * state stays in App.jsx contexts.
 */
export default function PromoIntakeRoute() {
  const openCalculator = (slug) => {
    if (!slug) return;
    try {
      window.location.hash = `#/${slug}`;
    } catch {}
  };
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div>
        <Tl t="Promo Intake" badge="NEW" bc={K.gn} />
        <PromoIntakePanel onOpenCalculator={openCalculator} />
      </div>
      <ShadowBookPanel />
    </div>
  );
}
