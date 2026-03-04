# New Chat Boot Prompt

Copy and paste this at the start of a new chat:

```text
Continue this repo using the inside-out todo system.

Required startup order:
1) Read docs/inside-out-todo/README.md
2) Read docs/inside-out-todo/00-NOW.md
3) Then read the first unfinished layer in this strict order:
   - docs/inside-out-todo/01-CORE.md
   - docs/inside-out-todo/02-DATA-API.md
   - docs/inside-out-todo/03-INTEGRATION.md
   - docs/inside-out-todo/04-QA-RELEASE.md

Execution rules:
- Continue the first [~] task if present.
- If none are [~], pick the highest-priority [ ] task in the lowest unfinished layer.
- Update statuses in-place as work progresses.
- Add a short bullet to Session Notes in the file you touched.
- Report changed files and verification steps.
```

Quick start reminder:

- Do inside first (core), then data, then integration, then QA.
