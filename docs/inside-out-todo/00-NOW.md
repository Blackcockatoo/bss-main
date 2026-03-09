# 00 - NOW

Last updated: 2026-03-07

Keep this file to max 3 active items.

## Active Focus

- [ ] IO-DATA-001 | high | depends: IO-CORE-002 | done-when: blessings claim/redeem/revoke passes end-to-end checks with valid and invalid inputs.
- [ ] IO-DATA-004 | medium | depends: IO-DATA-001 | done-when: test coverage exists for critical blessings and transport route logic.
- [ ] IO-INT-003 | high | depends: IO-CORE-002 | done-when: teacher hub and student app operate on one coherent pet-state model.

## Parking Lot (next up)

- IO-CORE-008
- IO-DATA-002
- IO-DATA-003
- IO-INT-004

## Session Notes

- Initialized inside-out todo system and seeded current priorities.
- Upgraded veil digital DNA route/component for IO-CORE-001 reliability: dynamic client loader, responsive helix, pointer controls, and explicit degraded fallback with retry path.
- Verified `/veil/digital-dna` smoke on desktop/mobile/orientation + forced fallback path with Playwright script and no uncaught runtime errors.
- Started IO-CORE-002 with a new shared pet state source (`metapet-shared-pet-state-v1`) and connected `/pet`, `/veil`, `/veil/kid/pair`, and `/veil/pair/connect/[token]` to the same identity/vitals/bond contract.
- Finished IO-CORE-002 by removing the final direct crest fallback in kid pairing and adding focused unit tests for shared identity/vitals/bond persistence + pairing metadata updates.
- Finished IO-CORE-003 by introducing a shared veil role-state contract (`src/lib/veil/role-state.ts`) and migrating guard/switch links to shared helpers for query parsing, storage persistence, and canonical role-switch hrefs.
- Started IO-CORE-004 by adding a shared core migration runner and local-storage migration hooks for guardian state, shared pet state, and veil role state.
- Finished IO-CORE-004 by normalizing and migrating legacy local-storage keys into canonical contracts without duplicating entries, then wiring startup migration into `/pet` and `/veil` plus focused migration tests.
- Completed IO-CORE-005 by adding explicit audio failure fallback/retry controls in veil Digital DNA (including forced `?forceAudioError=1` path) while preserving existing 3D fallback + switch-to-2D recovery.
- Completed IO-CORE-006: added `/veil/error.tsx` with branded Veil error boundary, themed `/veil/loading.tsx` to match cyan/slate Veil palette, and improved `/veil/kid/error.tsx` to sanitize raw JS error messages before showing to kids.
- Completed IO-CORE-007: added `HubId`, `BondId`, `ClaimCode` branded types, `RoleContext`, `ValidatedPairingInviteResult`, and cast helpers to `types.ts`. Moved `VeilRole` canonical definition to `types.ts`. Fixed `resolveVeilRole` role-persistence bug. Hardened all four blessings API routes (claim dedup + timestamp guard, claims list auth + code redaction, redeem correct HTTP status codes, revoke auth + correct status codes). Hardened `blessing-claim-store` with `MAX_STORE_SIZE` cap, bounded `getUniqueCode` retry loop, and cleanup-on-read.
