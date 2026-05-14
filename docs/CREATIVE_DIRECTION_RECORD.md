# Creative Direction Record

**ADDITIVE ONLY. Never delete or edit prior entries. Append only.**

This is the authoritative ledger of all human creative direction for this project.
It exists for IP protection, creative continuity, and agent alignment.

## Enforcement rule

An agent MUST append an entry to this file whenever the human gives:
- Creative direction of any kind
- Feature assignments or goals
- Brand, tone, or visual guidance
- Canon-affecting decisions
- Naming decisions
- Any explicit "do this / don't do this" creative instruction

Agents MUST NOT add entries autonomously without human input.
Agents MUST NOT modify or remove existing entries.

---

## Entry categories

| Category | Use when |
|---|---|
| **Direction** | Human specifies what the project should do or become |
| **Assignment** | Human assigns a specific feature, task, or goal |
| **Guidance** | Human gives style, tone, brand, or quality guidance |
| **Canon** | Human makes a lore, world, or story decision |
| **Rejection** | Human rejects a direction, idea, or approach |
| **Approval** | Human approves a proposed direction |

---

## Entries

### YYYY-MM-DD — Entry title

- Category: Direction / Assignment / Guidance / Canon / Rejection / Approval
- Human input (verbatim or close paraphrase):
- Area affected: (feature / brand / tone / canon / scope / other)
- Previous state: (what was true before)
- New required direction: (what must now be true)
- Why it matters: (impact on product, canon, or brand)
- Supersedes prior entry: (entry date if applicable, else "—")

### 2026-05-13 — Account access must be self-service and membership copy must not overpromise

- Category: Direction
- Human input (verbatim or close paraphrase): Confirmation email never arrived, there was no forgot/reset password area, and the single-sync VaultSpark membership may not be working so it may not deserve prominent mention.
- Area affected: feature / trust / launch gate / copy
- Previous state: PromoGrind had sign-up/sign-in UI, but no visible confirmation resend or password reset path, and some surfaces claimed one shared VaultSpark account worked across all Studio tools.
- New required direction: account creation must include visible self-service recovery paths, production readiness must verify confirmation/reset behavior, and public/auth copy should promise only PromoGrind account sync/access unless cross-project VaultSpark membership is proven live.
- Why it matters: missing auth recovery blocks real users at the first moment of trust. Overstated membership claims create avoidable credibility risk during public launch.
- Supersedes prior entry: —

### 2026-05-13 — Closeout and GitHub push required after production-readiness pass

- Category: Assignment
- Human input (verbatim or close paraphrase): "closeout and push & commit to GitHub - Update all memory/context/CDR/task board files and anything else that need updates"
- Area affected: process / scope
- Previous state: S85 auth and production-readiness changes were implemented locally and verified, but closeout write-back, memory refresh, commit, and push were still pending.
- New required direction: perform the full Studio OS closeout, update all canonical repo-truth and memory surfaces, commit, and push to GitHub.
- Why it matters: deploy and next-session truth need to reflect the new auth gate, while manual proof blockers remain clear and evidence-gated.
- Supersedes prior entry: 2026-05-01 closeout assignment

### 2026-04-30 — Public-launch quality bar: every feature/page must work and be cohesive

- Category: Direction
- Human input (verbatim or close paraphrase): "Is every single feature/page working and up to date and cohesive?" plus a follow-on instruction to make sure all features/tools/calculators work and there are no errors before public launch.
- Area affected: scope / quality bar / launch gate
- Previous state: launch hardening was already in progress with `LAUNCH_PROOFS.json`, automated UX route integrity, browser smoke, and bundle/sanitization gates, but cohesion was being asserted from automated gates alone — no founder-level requirement that every surface be manually verified before announce.
- New required direction: before any public announcement, the project must satisfy three layers of confidence simultaneously — (1) automated gates green (tests, smoke:ux, smoke:browser, sanitization, doctor), (2) operator-attested manual proofs (Stripe smoke, friend beta) recorded as evidence in `LAUNCH_PROOFS.json` via the new scripted runners, and (3) explicit dashboard/runtime error capture from the deployed site (no console errors during normal user flows). Cohesion is treated as a composite of these three, not just (1).
- Why it matters: it raises the launch bar from "automated gates pass" to "founder confidence + automated gates + recorded human evidence," matching the public-launch reputation cost. It also legitimizes the time spent on dashboard error diagnosis as in-scope launch work rather than extra polish.
- Supersedes prior entry: —

### 2026-04-30 — Honest blocker handling — never fabricate operator-side evidence

- Category: Approval
- Human input (verbatim or close paraphrase): Operator confirmed in-session "I did all the affiliate links I could" and asked the agent to implement the next-highest-impact items at quality bar in optimal order. Implicitly approved the agent's plan to leave the partner-approval gap intact rather than weaken the launch gate, while shipping scripted runners that record operator-supplied evidence for Stripe smoke and friend beta when those passes happen.
- Area affected: scope / launch gate
- Previous state: prior CDR + DECISIONS already required not fabricating affiliate URLs; was unstated whether automated runners could optimistically flip manual proofs.
- New required direction: scripted operator runners (`run-stripe-smoke.mjs`, `run-friend-beta-checklist.mjs`) and the post-deploy ingester (`ingest-launch-verification.mjs`) all keep the wall between automated CI truth and operator-attested evidence. CI never auto-flips manual proofs; manual runners only flip status when the operator answers each step `y` and supplies real IDs/notes; the ingester writes only to its own additive artifact surface.
- Why it matters: the moment an automated tool can mark a manual proof complete, the proof surface stops being a real gate. Keeping the wall intact is what lets the launch announcement carry honest weight.
- Supersedes prior entry: —

### 2026-04-22 — Make PromoGrind more immersive, cohesive, and operator-grade

- Category: Direction
- Human input (verbatim or close paraphrase): Analyze where work stopped, audit the project, and plan refinements that add depth, innovative features, better UI/UX, stronger feedback loops, more gamification and immersion, better AI/intelligence, stronger Studio OS/Hub/Social Dashboard cohesion, improved security and speed, and lower token/API waste without sacrificing quality.
- Area affected: feature / brand / tone / scope
- Previous state: the app had substantial feature depth but weak cohesion across calculators, AI, workflows, community, and Studio truth surfaces.
- New required direction: the product should evolve toward a unified operator system with stronger feedback loops, richer gamified progression, deeper AI guidance, tighter Studio integration, and more disciplined capital/token efficiency.
- Why it matters: this sets the quality bar for future implementation work and clarifies that product depth must compound into one elite operating experience rather than remain a collection of strong but fragmented features.
- Supersedes prior entry: —

### 2026-04-23 — Session 74 review note

- CDR reviewed — no new human creative-direction entries this session.

### 2026-04-23 — Public root must land on the PromoGrind landing page first

- Category: Direction
- Human input (verbatim or close paraphrase): "the vaultsparkstudios.com/promogrind link shouldn't redirect me right to the app, it should take me to the game's landing page which has buttons to go to the app"
- Area affected: feature / brand / scope
- Previous state: the public root path dropped visitors directly into the app shell, bypassing the landing/marketing surface.
- New required direction: the public root and VaultSpark entry link must land on the PromoGrind landing page first, with explicit buttons that take users into the app.
- Why it matters: acquisition/referral traffic needs context and a deliberate entry path instead of being thrown straight into the authenticated product shell.
- Supersedes prior entry: —

### 2026-04-24 — Public unveil requires best-in-class polish and honest launch status

- Category: Direction
- Human input (verbatim or close paraphrase): Audit every bug, flag, page, workflow, security issue, broken feature, broken navigation, and UX issue; add valuable tests/checks; get the project ready for public unveil and marketing; make the VaultSpark Studios landing page match current project state; use highly creative, sophisticated thinking to make the project exceptional.
- Area affected: feature / brand / tone / scope / marketing
- Previous state: PromoGrind had strong product depth but scattered launch checks and VaultSpark website copy that overstated/misstated the project state.
- New required direction: public-unveil work must pair ambitious polish with strict truthfulness: green local gates, verified UX/navigation, clear security posture, current legal/SEO copy, and marketing that says FORGE/public-unlaunched until external launch proofs are complete.
- Why it matters: public marketing must create trust before traffic arrives; overstated status, dead links, stale copy, or unverified flows would damage launch credibility.
- Supersedes prior entry: —

### 2026-04-24 — Implement highest-impact items in one optimal pass

- Category: Assignment
- Human input (verbatim or close paraphrase): Implement all next highest-impact PromoGrind items at the highest/optimal quality in one pass, in the recommended efficient order; then close out, update memory/context/CDR/task-board files, commit, and push to GitHub.
- Area affected: feature / scope / process
- Previous state: the next-impact list mixed repo-controllable improvements with external launch proofs that required operator/tester action.
- New required direction: implement all code-controllable improvements in one rigorous pass, keep external proof blockers honest rather than fabricating completion, and leave the repo closed out with all context surfaces updated and pushed.
- Why it matters: PromoGrind's public-unveil posture depends on both high product quality and strict launch truth; code improvements should compound without erasing real proof requirements.
- Supersedes prior entry: —

### 2026-04-28 — Close out with complete repo truth and GitHub push

- Category: Assignment
- Human input (verbatim or close paraphrase): "closeout and push & commit to GitHub - Update all memory/context/CDR/task board files and anything else that need updates"
- Area affected: process / scope
- Previous state: Session 79 implementation work was complete locally, but closeout write-back, audit/memory refresh, commit, and push were still pending.
- New required direction: perform full Studio OS closeout for PromoGrind, refresh all canonical repo-truth and memory surfaces, then commit and push the resulting state to GitHub.
- Why it matters: the next session and deployment checks need a truthful handoff that distinguishes shipped repo work from still-external launch proofs.
- Supersedes prior entry: —

### 2026-05-12 — Implement all next highest-impact launch-hardening items in one pass

- Category: Assignment
- Human input (verbatim or close paraphrase): "Implement all items at the highest/optimal quality in one pass (in optimal efficiency recommended order)" after asking for the next seven highest-impact PromoGrind improvements.
- Area affected: feature / tooling / launch gate / scope
- Previous state: the next-impact list mixed repo-controllable launch-hardening work with external proof items requiring operator/tester/partner action.
- New required direction: implement every repo-controllable improvement in the optimal order, raise the launch-gate quality bar, and keep non-repo proof blockers honest rather than marking them complete without real evidence.
- Why it matters: PromoGrind needs a deploy pipeline that catches runtime/math/tooling failures while still preserving truthful public-launch status around monetization, Stripe, friend beta, and affiliate approvals.
- Supersedes prior entry: —

### 2026-04-28 — Make PromoGrind best-in-class across product, intelligence, and trust

- Category: Direction
- Human input (verbatim or close paraphrase): Audit the project and recommend refinements that improve current features, add depth and innovative features, improve UI/UX and user feedback loops, make the app more gamified, engaging, and immersive for consumers, improve AI/intelligence integration, improve security, speed, organization, efficiency, and reduce token/API consumption without sacrificing quality.
- Area affected: feature / brand / tone / scope / process
- Previous state: PromoGrind had strong launch-hardening and engagement systems, but the next product direction had not been consolidated into one ranked consumer-grade improvement plan.
- New required direction: future work should compound toward a deeply personalized, trustworthy, AI-assisted promo operating system with rich feedback loops, measurable mastery, visible trust controls, faster operation, and disciplined AI/API spend.
- Why it matters: the product should feel like an elite consumer co-pilot rather than a bundle of calculators and dashboards; every improvement should increase retention, trust, decision quality, or launch readiness.
- Supersedes prior entry: —

### 2026-05-01 — Closeout requires complete repo truth and GitHub push

- Category: Assignment
- Human input (verbatim or close paraphrase): "closeout and push & commit to GitHub - Update all memory/context/CDR/task board files and anything else that need updates"
- Area affected: process / scope
- Previous state: Session 82 implementation was complete locally with code, scripts, artifact ingest, and verification passing, but canonical closeout surfaces and GitHub push were still pending.
- New required direction: perform full Studio OS closeout, refresh every affected repo-truth and memory surface, then commit and push the completed S82 state to GitHub.
- Why it matters: the next session and deployment checks need a coherent handoff that distinguishes shipped repo work from still-external launch proofs and from live status that only turns green after deploy.
- Supersedes prior entry: —
### 2026-05-13 — PromoGrind account signup must be separate from Studio membership

- Category: Direction
- Human input (verbatim or close paraphrase): "We should make the promogrind create account and sign up separate from the studio membership as I cannot get the studio membership fully integrated and working across all projects yet"
- Area affected: feature / brand / scope / account UX
- Previous state: S85 had softened cross-Studio membership claims but still left some account/profile/static copy implying Vault account services, connected VaultSpark tools, or broad Studio sync.
- New required direction: PromoGrind create-account/sign-up must present as a PromoGrind-only account until Studio membership is fully integrated and verified across projects. Do not prominently advertise Studio membership from account creation.
- Why it matters: users need truthful expectations at signup, and the product should not promise a cross-project identity/membership behavior that is not working end-to-end yet.
- Supersedes prior entry: refines the 2026-05-12 launch-hardening direction by making account/membership separation a current product truth.
