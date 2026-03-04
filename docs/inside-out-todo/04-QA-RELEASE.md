# 04 - QA RELEASE

Final verification layer. Do this after lower layers are complete.

## Tasks

- [ ] IO-QA-001 | high | depends: IO-CORE-001 | done-when: `/veil/digital-dna` helix mode passes desktop + mobile smoke checks.
- [ ] IO-QA-002 | high | depends: IO-DATA-001 | done-when: blessing claim/redeem/revoke flow passes with valid, expired, and revoked cases.
- [ ] IO-QA-003 | high | depends: IO-INT-003 | done-when: teacher pair -> kid confirm -> constellation update works end to end.
- [ ] IO-QA-004 | medium | depends: IO-INT-001 | done-when: landing CTAs route cleanly and consistently to `/veil` and `/pet`.
- [ ] IO-QA-005 | medium | depends: IO-QA-001 | done-when: no runtime console errors on core veil routes.
- [ ] IO-QA-006 | medium | depends: IO-QA-002 | done-when: `docs/route-smoke-checklist.md` is updated with integrated teacher/kid checks.
- [ ] IO-QA-007 | low | depends: IO-QA-001 | done-when: release note includes risks, known issues, and rollback steps.

## Default Verification Commands

- `npm run dev`
- `npm run lint`
- Manual route smoke across `/`, `/pet`, `/veil`, `/veil/kid`, `/veil/digital-dna`

## Session Notes

- Keep QA focused on end-to-end behavior, not just isolated route checks.
