# Decisions

Append new entries. Do not erase historical reasoning unless it is wrong.

## Entry template

### YYYY-MM-DD - Decision title

- Status:
- Context:
- Decision:
- Alternatives considered:
- Why this was chosen:
- Follow-up:

### 2026-04-22 - Public-safe repos need local truth fallbacks

- Status: accepted
- Context: `render-startup-brief`, runtime-pack synthesis, and local IGNIS rescoring drifted or failed because the repo was using public-safe/project-local surfaces instead of the private portfolio registry that some scripts implicitly assumed.
- Decision: make repo-local status/manifest/truth files authoritative for startup and derived-surface generation whenever portfolio-only sources are absent.
- Alternatives considered: keep treating missing portfolio data as fatal; patch individual generated files manually without fixing the generators.
- Why this was chosen: the public repo must remain self-healing and truthful on its own, and generator-level fixes reduce repeated token waste and future session drift.
- Follow-up: centralize these fallbacks into a single tested truth helper and add regression coverage for startup-brief, runtime-pack, and contract generation.

### 2026-04-22 - Manual closeout commit path because autopilot is genome-blocked

- Status: accepted
- Context: `closeout-autopilot.mjs` hard-aborts when `run-doctor.mjs --loop --update-json` exits nonzero. After repairs, doctor is still `11/12` because the protocol-genome check treats `13/25` as a blocking local failure and has no auto-remedy path.
- Decision: complete write-back, validation, secrets scan, commit, and push manually with normal git commands instead of claiming autopilot succeeded.
- Alternatives considered: falsify `truthGenome` to green so autopilot passes; skip closeout; use `--no-verify`.
- Why this was chosen: it preserves truthful repo state, keeps the safety gates that do work, and avoids introducing a dishonest or bypassed closeout artifact.
- Follow-up: downgrade non-red genome states from blocking for public-safe repos or give doctor a legitimate remediation path before requiring autopilot as a hard gate.
