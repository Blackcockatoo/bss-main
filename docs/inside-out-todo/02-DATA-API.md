# 02 - DATA API

Contracts and server route behavior after core state is stable.

## Tasks

- [ ] IO-DATA-001 | high | depends: IO-CORE-002 | done-when: `/api/blessings/claim`, `/api/blessings/redeem`, and revoke/list flows pass happy + edge paths.
- [ ] IO-DATA-002 | high | depends: IO-DATA-001 | done-when: `/api/transport/messages` and `/api/transport/replies` enforce required fields and safe payload size.
- [ ] IO-DATA-003 | medium | depends: IO-DATA-002 | done-when: API errors use one consistent JSON shape across all veil routes.
- [ ] IO-DATA-004 | medium | depends: none | done-when: test coverage exists for critical blessings and transport route logic.
- [ ] IO-DATA-005 | medium | depends: IO-DATA-001 | done-when: claim creation endpoint has cooldown/rate control to avoid spam.
- [ ] IO-DATA-006 | low | depends: IO-DATA-003 | done-when: docs include request/response examples for each route family.

## Session Notes

- Keep API cleanup after shared core state merge to avoid rework.
- Hardened all four blessings API routes: claim dedup + forgedAt timestamp guard (IO-DATA-001 partial), claims list requires hub Bearer token and no longer exposes raw codes, redeem uses correct HTTP status codes (400/404/409/410), revoke requires hub Bearer token and uses correct status codes (400/404/409/410).
- Hardened blessing-claim-store: `MAX_STORE_SIZE=2000` cap, bounded `getUniqueCode` with `MAX_CODE_GEN_ATTEMPTS=32`, cleanup-on-read, and `hasActiveBlessingClaim` dedup helper.
- IO-DATA-001 needs end-to-end test coverage added (IO-DATA-004) before marking complete.
