<!-- truth-audit-version: 1.0 -->
# Truth Audit

Last reviewed: 2026-03-31
Overall status: yellow
Next action: Re-check the shared Vault membership UX after the website agent finishes the global auth rollout, then run `npm run smoke:launch` before flipping any public-facing launch claims or feature flags.

---

## Source Hierarchy

1. `context/PROJECT_STATUS.json`
2. `context/LATEST_HANDOFF.md`
3. `context/CURRENT_STATE.md`
4. Founder-facing derived Markdown

---

## Protocol Genome (/25)

| Dimension | Score | Notes |
|---|---|---|
| Schema alignment | 5 | `PROJECT_STATUS.json` now reflects the free Vault membership model and launch-state gating |
| Prompt/template alignment | 5 | Prompts are current and Studio OS write-back executed |
| Derived-view freshness | 5 | Handoff, task board, status, SIL, launch docs, and smoke validation guidance refreshed this session |
| Handoff continuity | 5 | Session 23 audit and next-move priorities now captured clearly |
| Contradiction density | 4 | Main repo-local contradiction resolved; remaining risk is external auth-rollout drift and historical stale copy |
| **Total** | **24 / 25** | Strong protocol compliance; remaining drift is mostly external coordination and historical residue |

---

## Drift Heatmap

| Area | Canonical source | Derived surfaces | Status | Last checked | Action |
|---|---|---|---|---|---|
| Product access model | `src/auth.js`, user clarification, shared Vault membership canon | app shell, landing page, status docs | yellow | 2026-03-31 | Re-check after website-agent rollout lands; repo-local copy now aligned |
| Domain strategy | `context/DECISIONS.md` | old TASK_BOARD / status references to `promogrind.com` as blocker | green | 2026-03-31 | Current surfaces now treat custom domain as optional |
| Audit freshness | `context/PROJECT_STATUS.json` | prior truth placeholders, stale dates | green | 2026-03-31 | Refreshed this session |
| Launch-state honesty | `src/launchState.js` | app tool surfaces, pricing claims, launch docs, smoke command | yellow | 2026-03-31 | Keep flags off until backends are actually live; use `npm run smoke:launch` before release work |

---

## Contradictions

1. **Yellow:** Shared Vault membership rollout is being fixed in another repo, so PromoGrind’s updated copy should be re-validated once that global auth UX settles.
2. **Yellow:** Historical Markdown still contains older assumptions about guest access and `promogrind.com` urgency, even though active truth surfaces are now corrected.

---

## Freshness

- `context/PROJECT_STATUS.json`: 2026-03-31
- `context/LATEST_HANDOFF.md`: 2026-03-31
- `context/CURRENT_STATE.md`: 2026-03-31
- Derived founder-facing views: 2026-03-31 review completed locally; upstream registry not changed in this repo

---

## Recommended Actions

1. Re-verify PromoGrind against the final shared Vault membership UX once the website agent ships it.
2. Run `npm run smoke:launch` before soft-launch pushes or any public truth/copy changes.
3. Turn on `VITE_PG_FEATURE_*` flags only when the corresponding backend/service is actually live.
4. Keep extending the trust/compliance copy pass from the main app + landing page to high-intent SEO pages.
