# Release Parity Evidence

## Session 118 — 2026-07-24

Scope: local production build served through the Vite preview runtime.

| Viewport | Theme | Artifact | Bytes | SHA-256 |
| --- | --- | --- | ---: | --- |
| 1440 × 900 | Dark | `s118-desktop-dark.png` | 386,957 | `838E0B42ACFCB7A2A1892037A4DB72B040AE36DD65DCE7C6098F17076B2F9A9B` |
| 1440 × 900 | Light | `s118-desktop-light.png` | 440,170 | `0CE7732C7DDAFA30EE12CAA4BF30A2504D002881D9A300537366EA142832F1C1` |
| 390 × 844 | Dark | `s118-mobile-dark.png` | 269,939 | `6360A04085B731462A8F0C5E3BCF56078DADA8D5AF79CB7CD4AF8CCDED4998DC` |
| 390 × 844 | Light | `s118-mobile-light.png` | 295,375 | `4FC620A1386BDA5D29C0D7D494EF32A3133D0DE1EAEF09B7A8EA2D7B7E726560` |

Runtime evidence:

- desktop and mobile renders completed in both project themes
- live computed-style contrast audit, including alpha compositing against the effective background, found 0 failing visible text nodes in dark and light themes after the semantic accent-ink repair
- the deterministic palette contract checks 37 semantic foreground/background pairs per theme
- `npm run verify:launch-local` passed directly with 588/588 tests
- no native/mobile application surface exists; PromoGrind is browser-first

Image-test status: **PARTIAL**. Screenshots were captured and hashed, but the connected image viewer failed with a Windows credential-protection error, so no AI pixel-inspection pass is claimed. The screenshots were transient verification artifacts and are not committed.
