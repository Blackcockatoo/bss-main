# 01 - CORE

Inside systems first: renderer reliability, state model, persistence, role/session behavior.

## Tasks

- [x] IO-CORE-001 | high | depends: none | done-when: DNA helix works on `/veil/digital-dna` in desktop/mobile and shows clear fallback when engine load fails.
- [x] IO-CORE-002 | high | depends: IO-CORE-001 | done-when: `/pet` and `/veil` share one source of truth for pet identity, vitals, and bond-facing state.
- [x] IO-CORE-003 | high | depends: IO-CORE-002 | done-when: teacher/kid role switching is controlled by one shared role state contract.
- [x] IO-CORE-004 | medium | depends: IO-CORE-002 | done-when: local persistence migration keeps existing user data without resets or duplication.
- [x] IO-CORE-005 | medium | depends: IO-CORE-001 | done-when: 3D/audio unsupported devices show graceful fallback + retry path.
- [ ] IO-CORE-006 | medium | depends: none | done-when: `/veil` route group has stable error boundary and loading states.
- [ ] IO-CORE-007 | medium | depends: IO-CORE-002 | done-when: shared type definitions exist for bond ids, claim tokens, and role context.
- [ ] IO-CORE-008 | low | depends: IO-CORE-002 | done-when: architecture note explains state flow from core store to teacher/kid UI.

## Session Notes

- Started with helix reliability because it blocks confidence in the core layer.
- Patched `/veil/digital-dna` to use dynamic client loading and upgraded veil helix engine handling with explicit `loading/ready/error` states, responsive sizing, pointer+pinch controls, and fallback UI with retry/2D switch.
- Ran automated smoke (`scripts/smoke-veil-digital-dna.mjs`) against desktop/mobile/orientation/fallback and confirmed no uncaught runtime errors on the normal route.
- Added `src/lib/shared-pet-state.ts` as a shared identity/vitals/bond contract and wired `/pet`, `/veil`, and veil pairing routes to read/write it (including crest hash replacement for previous hardcoded kid crest fallbacks).
- Added focused shared-state unit coverage in `src/lib/shared-pet-state.test.ts` and removed the remaining direct `pet-crest-local` fallback from kid pairing by routing through the shared crest helper.
- Added `src/lib/veil/role-state.ts` as the single teacher/kid role contract and routed all role switches + guards through shared helpers (`resolveVeilRole`, storage/query accessors, and canonical switch href builders), with focused tests in `src/lib/veil/role-state.test.ts`.
- Completed IO-CORE-004 by adding a shared migration runner (`src/lib/core-persistence-migration.ts`) and idempotent local-storage migration hooks for guardian state, shared pet state, and veil role state, including normalization/deduplication safeguards and focused tests.
- Verified IO-CORE-004 with targeted migration suites (`src/auralia/persistence.test.ts`, `src/lib/shared-pet-state.test.ts`, `src/lib/veil/role-state.test.ts`, `src/lib/core-persistence-migration.test.ts`) plus full TypeScript no-emit check.
- Completed IO-CORE-005 by decoupling audio/3D readiness in `src/components/veil/DigitalDNAHub.tsx`, adding explicit audio fallback with Retry + Switch-to-Visual path, and extending smoke coverage to forced audio failure in `scripts/smoke-veil-digital-dna.mjs`.
