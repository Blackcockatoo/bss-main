# Inside-Out Todo System

Use this folder as the single planning system for future chats.

Goal: always build from inside to outside.

## Layer Order (strict)

1. `01-CORE.md` (state, identity, persistence, engines)
2. `02-DATA-API.md` (contracts, routes, validation)
3. `03-INTEGRATION.md` (cross-route wiring, app-to-app flow)
4. `04-QA-RELEASE.md` (smoke tests, regression, release notes)

Do not start a higher layer while a lower layer has unfinished high-priority work, unless blocked.

## Status Markers

- `[ ]` pending
- `[~]` in progress
- `[x]` completed
- `[!]` blocked

Task line format:

`[ ] TASK-ID | priority | depends: TASK-ID/none | done-when: objective completion check`

Example:

`[ ] IO-CORE-002 | high | depends: IO-CORE-001 | done-when: /pet and /veil use one shared pet state source`

## Session Start Rules

1. Read `00-NOW.md` first.
2. Continue the first `[~]` item.
3. If no `[~]` exists, pick the highest-priority `[ ]` item in the lowest unfinished layer.
4. Update status immediately when work starts/finishes.
5. Add one short bullet to the file's Session Notes with what changed.

## Files in this folder

- `00-NOW.md`: only top active work (max 3 tasks)
- `01-CORE.md`: inside systems
- `02-DATA-API.md`: contracts and route behavior
- `03-INTEGRATION.md`: app wiring and flow links
- `04-QA-RELEASE.md`: verification and launch checks
- `NEW-CHAT-BOOT.md`: copy/paste prompt for new chats
