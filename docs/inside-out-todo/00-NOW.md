# 00 - NOW

Last updated: 2026-03-04

Keep this file to max 3 active items.

## Active Focus

- [ ] IO-CORE-006 | medium | depends: none | done-when: `/veil` route group has stable error boundary and loading states.
- [ ] IO-CORE-007 | medium | depends: IO-CORE-002 | done-when: shared type definitions exist for bond ids, claim tokens, and role context.
- [ ] IO-DATA-001 | high | depends: IO-CORE-002 | done-when: blessings claim/redeem/revoke passes end-to-end checks with valid and invalid inputs.

## Parking Lot (next up)

- IO-CORE-008
- IO-DATA-002
- IO-INT-003

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
