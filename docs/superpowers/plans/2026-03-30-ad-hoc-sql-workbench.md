# Ad Hoc SQL Workbench Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing prototype into a top-level ad hoc SQL workbench with permission-scoped table browsing, multi-table SQL editing, draft saving, and query history.

**Architecture:** Reuse the existing `page-sql` and `page-sql-noperm` prototype structure in `work/prototype/manus.html`, then layer in a new top navigation entry, permission-scoped table discovery, workbench states, and mock draft/history data. Keep the solution in a single HTML prototype file, following the repo's current interaction style and mock-data-driven architecture.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, inline mock data

---

## File Structure

- Modify: `work/prototype/manus.html`
  - Add top-level `即席查询` navigation item
  - Upgrade the current SQL page to a global workbench layout
  - Add mock data for permission-scoped tables, drafts, and history
  - Add new state handling and interactions for the SQL workbench
- Optionally modify: `work/prototype/manus.figma_capture.html`
  - Keep capture-only URL state support aligned if the prototype is later re-exported to Figma
- Verify: `work/prototype/manus.html`
  - Inline script syntax check through Node

## Chunk 1: Navigation and Entry Restructuring

### Task 1: Add top-level `即席查询` navigation entry

**Files:**
- Modify: `work/prototype/manus.html`
- Test: `work/prototype/manus.html`

- [ ] **Step 1: Locate the current top navigation block**

Inspect the header nav around the existing items:
- `资产检索`
- `资产目录`
- `资源发现`
- `资源管理`
- `我的`
- `血缘追溯`

- [ ] **Step 2: Insert the new navigation item before `我的`**

Add:

```html
<div class="header-nav-item" data-page="adhoc-sql" onclick="switchPage('adhoc-sql', this)">即席查询</div>
```

Keep the naming consistent with the final selected page id.

- [ ] **Step 3: Rename or remap the existing SQL page**

Choose one of:

```html
<div class="page sql-page" id="page-adhoc-sql">
```

or keep the page id as `page-sql` and explicitly map the menu click to it. Prefer the first option if it keeps the nav semantics clearer.

- [ ] **Step 4: Verify menu highlighting logic**

Review:
- `switchPage(...)`
- any helper that derives current page from nav state

Ensure the new menu can become active like other一级菜单.

- [ ] **Step 5: Run syntax verification**

Run:

```bash
node -e "const fs=require('fs'); const p='work/prototype/manus.html'; const html=fs.readFileSync(p,'utf8'); const m=html.match(/<script>([\s\S]*)<\/script>/); if(!m) throw new Error('no inline script found'); new Function(m[1]); console.log('JS syntax OK');"
```

Expected: `JS syntax OK`

## Chunk 2: Workbench Layout Upgrade

### Task 2: Replace single-table SQL layout with a global workbench layout

**Files:**
- Modify: `work/prototype/manus.html`
- Test: `work/prototype/manus.html`

- [ ] **Step 1: Identify the current SQL page structure**

Inspect:
- context bar
- field sidebar
- editor area
- result area

- [ ] **Step 2: Redesign the page into a three-column workbench**

Target sections:

```html
<div class="adhoc-toolbar">...</div>
<div class="adhoc-layout">
  <aside class="adhoc-table-panel">...</aside>
  <main class="adhoc-main">...</main>
  <aside class="adhoc-field-panel">...</aside>
</div>
```

Required content:
- left: permission-scoped tables
- center: editor + result
- right: field metadata

- [ ] **Step 3: Add empty-state guidance**

When no table is selected, render a friendly empty state in the editor area explaining:
- select tables on the left
- click fields on the right
- multi-table `JOIN` is supported

- [ ] **Step 4: Preserve query result rendering**

Reuse the current result rendering approach where possible so the prototype remains consistent and simpler to maintain.

- [ ] **Step 5: Run syntax verification**

Run the Node inline-script syntax check again.

Expected: `JS syntax OK`

## Chunk 3: Permission-Scoped Table Discovery

### Task 3: Add mock data and interactions for “我有权限的表”

**Files:**
- Modify: `work/prototype/manus.html`
- Test: `work/prototype/manus.html`

- [ ] **Step 1: Add dedicated mock data sets**

Create focused mock data structures for:
- permission tables
- recent tables
- favorite tables

Each item should include:

```js
{
  id: 'dwd_order_detail',
  cnName: '订单明细宽表',
  fullName: 'wlyd_mc_beijing.dwd_order_detail',
  type: 'table',
  sourceType: '数仓引擎',
  sourceSystem: 'MaxCompute',
  hasPermission: true,
  favorite: false
}
```

- [ ] **Step 2: Render the left panel list**

Support:
- keyword search
- recent section
- permission table section
- favorite section

- [ ] **Step 3: Add table selection state**

When the user clicks a table:
- add it to current referenced tables
- update the right field panel
- make it insertable into SQL

- [ ] **Step 4: Support multi-table selection**

Allow multiple selected tables to appear in a “current query tables” area above the editor.

- [ ] **Step 5: Verify no-permission tables do not appear**

Mock data may include non-permission resources for future use, but the workbench list must only display permission-scoped tables.

## Chunk 4: Field Assistance and SQL Composition

### Task 4: Upgrade field assistance for multi-table querying

**Files:**
- Modify: `work/prototype/manus.html`
- Test: `work/prototype/manus.html`

- [ ] **Step 1: Refactor field rendering to be table-aware**

Current `renderSQLFields()` is single-table-oriented. Update it so the right panel can switch based on the currently focused selected table.

- [ ] **Step 2: Add field panel UI controls**

Add:
- current table title
- field search
- field list
- optional table switch chips if multiple tables are selected

- [ ] **Step 3: Keep click-to-insert behavior**

Retain insertion into the SQL editor:

```js
insertFieldToSQL(fieldName)
```

Enhance if needed to optionally insert qualified names such as:

```sql
t1.order_id
```

but keep the first prototype version simple unless the page becomes confusing.

- [ ] **Step 4: Add insert-table-name helper**

Add a helper action so selecting a table can insert:

```sql
wlyd_mc_beijing.dwd_order_detail
```

into the editor when needed.

- [ ] **Step 5: Verify interactions manually**

Manual checks:
- select one table
- select a second table
- click a field
- confirm the editor content updates correctly

## Chunk 5: Drafts and Query History

### Task 5: Add draft save and history query flows

**Files:**
- Modify: `work/prototype/manus.html`
- Test: `work/prototype/manus.html`

- [ ] **Step 1: Add mock datasets for drafts and history**

Suggested structures:

```js
const MOCK_SQL_DRAFTS = [...]
const MOCK_SQL_HISTORY = [...]
```

Include:
- name
- sql
- tables
- updatedAt or executedAt
- status

- [ ] **Step 2: Add top toolbar entries for drafts and history**

Support one of these UI patterns:
- side drawer
- inline toggle panel
- top sub-tab switch

Prefer the lightest option that matches the current prototype style.

- [ ] **Step 3: Implement “保存草稿” interaction**

Requirements:
- first save asks for or infers a draft name
- repeated save overwrites the current draft
- show a success notification

- [ ] **Step 4: Implement “历史查询” loading**

Clicking a history item should:
- refill the editor
- repopulate referenced tables
- update the right-side field panel context
- not automatically rerun the query

- [ ] **Step 5: Add unsaved-change reminder state**

Before replacing current SQL with another draft/history item, prompt or mock-prompt the user if there are unsaved changes.

## Chunk 6: Permission Validation and Error States

### Task 6: Enforce permission-scoped execution and error presentation

**Files:**
- Modify: `work/prototype/manus.html`
- Test: `work/prototype/manus.html`

- [ ] **Step 1: Add pre-execution validation**

Before `runSQL()` proceeds, validate:
- SQL is not empty
- referenced tables are within the permission set

- [ ] **Step 2: Add mock table-reference parsing**

Prototype-level parsing can be lightweight. It only needs to support obvious table reference detection well enough for demos.

- [ ] **Step 3: Render permission error state**

Show a clear message such as:

```text
当前 SQL 引用了您暂无权限的表：xxx，暂不可执行
```

Optionally link to the existing permission request flow.

- [ ] **Step 4: Add syntax-error and execution-failure mock states**

Support three outcome types:
- success
- syntax error
- execution failure

Do not clear the editor when errors happen.

- [ ] **Step 5: Verify result-state transitions manually**

Manual checks:
- successful query
- empty SQL
- syntax-like error
- unauthorized table

## Chunk 7: Detail Page Integration and Final Polish

### Task 7: Keep detail-page quick-entry compatibility

**Files:**
- Modify: `work/prototype/manus.html`
- Test: `work/prototype/manus.html`

- [ ] **Step 1: Update detail-page entry points**

Ensure the existing detail-page action that opens SQL still routes into the upgraded workbench.

- [ ] **Step 2: Support “carry current table into workbench”**

When entering from a detail page:
- select the current table automatically
- prefill example SQL
- set the field panel to that table

- [ ] **Step 3: Keep no-permission path intact**

If the user lacks query permission, route to the existing no-permission page instead of the workbench.

- [ ] **Step 4: Align capture prototype if needed**

If `work/prototype/manus.figma_capture.html` is still being used for export, mirror the relevant page-id changes so it does not drift from the main prototype.

- [ ] **Step 5: Final verification**

Run:

```bash
node -e "const fs=require('fs'); const p='work/prototype/manus.html'; const html=fs.readFileSync(p,'utf8'); const m=html.match(/<script>([\s\S]*)<\/script>/); if(!m) throw new Error('no inline script found'); new Function(m[1]); console.log('JS syntax OK');"
```

Manual checklist:
- top nav shows `即席查询`
- menu order is correct
- global entry opens empty workbench
- detail entry opens table-prefilled workbench
- drafts can save and reload
- history can reload
- unauthorized SQL is blocked

