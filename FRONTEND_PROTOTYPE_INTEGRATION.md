# Frontend Prototype Integration Plan

## Goal

Use `codex/frontend-engineering-baseline` as the source for a unified Vite/React frontend prototype app. Codex, Qoder, and other agents can develop separate frontend modules on their own branches, then merge into one integration branch for hosted prototype publishing.

## Recommended Branch Model

- `codex/frontend-engineering-baseline`: current frontend baseline source branch.
- `integration/prototype-showcase`: recommended neutral integration and publishing branch.
- `codex/<module-name>`, `qoder/<module-name>`: module branches owned by each agent.

Prefer publishing from a neutral integration branch instead of making every agent merge directly into a Codex-named branch.

## Publish Target

Publish from the Vite/React app:

```bash
npm test
npm run build
```

Host the generated `dist/` directory. The app already has `public/_redirects` for SPA fallback:

```txt
/* /index.html 200
```

## Current Main Branch

The repository `main` branch is currently mostly static prototype files:

- `permission-center.html`
- `prototype/permission-center.html`
- `prototype/feishu-approval-prototype/`

That shape is not ideal for multi-agent frontend work because single-file prototypes are easy to overwrite, hard to test, and weakly modularized.

## Current Frontend Worktree

Current worktree:

```txt
.worktrees/frontend-engineering-baseline
```

Current branch:

```txt
codex/frontend-engineering-baseline
```

This worktree contains tracked changes plus many untracked files. Before merging or publishing, explicitly stage only the intended files.

## First Baseline Include List

### 1. Project Setup

- `package.json`
- `package-lock.json`
- `index.html`
- `tsconfig.json`
- `tsconfig.node.json`
- `vite.config.ts`
- `vitest.setup.ts`
- `public/_redirects`

### 2. App Entry And Shell

- `src/main.tsx`
- `src/app/App.tsx`
- `src/app/AppShell.tsx`
- `src/app/routes.ts`
- `src/styles/global.css`
- `src/styles/tokens.css`

### 3. Shared Components

- `src/components/base/`
- `src/components/feedback/`
- `src/components/forms/`
- `src/components/data-display/`
- `src/components/interaction/` only when AI/chat modules need it

### 4. Pages Currently Mounted In Navigation

If the current `src/app/App.tsx` navigation is kept, these modules must build:

- `src/features/asset-search/`
- `src/features/asset-catalog/`
- `src/features/detail/`
- `src/features/resource-discovery/`
- `src/features/resource-management/`
- `src/features/product-pages/`
- `src/features/lineage/`
- `src/features/approval-integration/`
- `src/features/my/`

### 5. Mocks, Services, Types

- `src/mocks/`
- `src/services/`
- `src/types/`

## Approval Module Include List

Required files for the approval integration prototype:

- `src/features/approval-integration/ApprovalIntegrationPage.tsx`
- `src/features/approval-integration/ApprovalIntegrationPage.test.tsx`
- `src/features/approval-integration/approval-integration.css`
- `src/features/approval-integration/approvalData.ts`
- `src/features/approval-integration/components/PendingPanel.tsx`
- `src/features/approval-integration/components/SubmittedPanel.tsx`

The `my` page reuses approval components, so include it if the `我的` navigation remains enabled:

- `src/features/my/MyPage.tsx`
- `src/features/my/MyPage.test.tsx`
- `src/features/my/my-page.css`

## Do Not Include By Default

These look like local tooling or temporary output and should not be staged by default:

- `.cursor/`
- `.superpowers/`
- `.vercel-tmp/`

## Suggested Commit Order

### Commit 1: Frontend Prototype Baseline

Scope:

- Project config
- App shell
- Global styles
- Shared components
- Stable modules required by current navigation

Message:

```txt
feat(frontend): add unified prototype app baseline
```

### Commit 2: Approval Integration Prototype

Scope:

- `src/features/approval-integration/`
- `src/features/my/` approval reuse
- Related tests

Message:

```txt
feat(approval): add approval integration prototype
```

### Commit 3+: Other Agent Modules

Examples:

```txt
feat(resource): update resource management prototype
feat(lineage): add lineage prototype page
```

## Agent Collaboration Rules

1. Each agent should primarily edit its own `src/features/<module>/`.
2. Shared component changes should be small and clearly documented.
3. Route integration happens in `src/app/routes.ts` and `src/app/App.tsx`.
4. Before merge, run:

```bash
npm test -- <changed-test-file>
npm run build
```

5. Before publishing from `integration/prototype-showcase`, run:

```bash
git status --short
npm test
npm run build
```

## Recommended Next Steps

1. Create `integration/prototype-showcase` from `codex/frontend-engineering-baseline`.
2. Stage only the baseline and approval files listed above.
3. Split into two or three clear commits.
4. Ask Qoder to rebase or cherry-pick its module branch onto `integration/prototype-showcase`.
5. Publish only from `integration/prototype-showcase`.
