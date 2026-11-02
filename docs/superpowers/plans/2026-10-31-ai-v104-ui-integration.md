# AI V1.0.4 UI integration Implementation Plan

> Execute inline under superpowers:executing-plans. Reuse this isolated worktree; do not modify the source UI checkout.

**Goal:** Integrate remote `codex/ai-find-figma-local` at `4ce231886df5822f1fba9ea740581c0e7cdf2995` with the conversation/condition logic in `main @ 5da1f56`, then verify locally. Do not deploy or push main.
**Architecture:** Three-way merge from common ancestor `6ec9586`, inspect each changed hunk, and resolve AI template/test conflicts explicitly. Keep the target controller, dialogue condition editing, relaxation choices and batch publication rules. Import scoped styles, shared component props, assets and catalog-favorite dependencies together.
**Tech Stack:** Vue 3, TypeScript, Pinia, Vite, Vitest.
**Spec:** User's integration request and `external-app-vue3/INTEGRATION_AI_UI.md` from the pinned UI commit; existing conversation condition tests and current Obsidian functional/algorithm PRDs.

## Global Constraints

- UI: white PC AI layout, glass lens animation/shadow, suggestion strips, glowing input, collapsible processing; PC AI favorites hidden, compact/mobile and marketplace favorites preserved.
- No whole-file replacement of existing pages. No reintroduction of condition edit buttons/forms or requirement suspend/delete controls.
- Preserve clarification, staged condition edits, uniform relaxation confirmation, batch stop/retry, history, drafts, collection, detail/acquisition and PC/mobile behavior.
- Integration only: no backend APIs, production deployment or main push.
- Documented controller edge cases deferred while UI work was active must be evaluated during compatibility; fix only cases needed for the agreed conversation/condition behavior, with regression coverage.

## Review Focus

1. UI merge must retain dialogue editing tests and controller changes absent from the older UI base.
2. Shared CSS must not hide required feedback, difference/risk/unknown evidence, effective/staged conditions or acquisition actions.
3. Collapsed processing must distinguish active, waiting, failed and stopped states, including old clarification frames.
4. PC favorites must be absent through result/detail paths while mobile and marketplace identity-specific favorites still work.
5. Pending choices, unanswered edits, partial operations and retries must survive continuous user messages without early publication or old-condition leakage.

## Tasks

- [x] 1. Verify branch/hash and clean baseline; import UI-side tests before implementation to demonstrate expected missing UI. Merge three ways without committing, resolve UI/template/test conflicts by hunk, keep target controller and tests.
- [x] 2. Run controller/UI/catalog focused tests; add regression-first coverage for integration compatibility failures. Inspect CSS and shared prop wiring, fix affected behavior, and retain latest condition/relaxation rules.
- [x] 3. Run full tests and build; browser-check isolated local server on PC and mobile, including full request/clarification/relaxation/stop/session/catalog flows. Record evidence and integration limits in a repository report. Fresh final review under executing-plans; commit integration branch after checks. No deployment.

## Progress

- Remote fetched and pinned commit verified; common ancestor is 6ec9586, so source-side UI delta is 20 files. Direct main-to-UI diff includes older logic and must not be used as a replacement patch.

- Final: 154 files/1504 tests passed; build passed with existing large-chunk warning; independent review findings reproduced and fixed, PC/mobile browser checklist and source provenance recorded in docs/qa/2026-10-31-ai-ui-integration.md. Final Git checks passed; retain local integration branch, no deployment.
