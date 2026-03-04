# 03 - INTEGRATION

Wire complete user flows only after core and data layers are stable.

## Tasks

- [x] IO-INT-001 | high | depends: none | done-when: landing page links directly to `/veil` and `/pet`.
- [x] IO-INT-002 | high | depends: none | done-when: main app shell does not double-render over `/veil` pages.
- [ ] IO-INT-003 | high | depends: IO-CORE-002 | done-when: teacher hub and student app operate on one coherent pet-state model.
- [ ] IO-INT-004 | medium | depends: IO-DATA-001 | done-when: generated QR/deep links resolve correctly under `/veil/*` namespaces.
- [ ] IO-INT-005 | medium | depends: IO-INT-003 | done-when: cross-links between teacher and student surfaces are available in both UIs.
- [ ] IO-INT-006 | medium | depends: IO-DATA-003 | done-when: UI error messaging maps to API error contracts for support/debug.
- [ ] IO-INT-007 | low | depends: IO-INT-003 | done-when: route-map docs reflect final integrated paths and role switches.

## Session Notes

- Base route integration is complete; shared-state behavior remains the key integration gap.
