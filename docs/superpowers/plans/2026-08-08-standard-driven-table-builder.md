# 标准驱动建表工具 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在资产平台产品切换中落地「建表工具」四步向导原型与「数据标准」轻量壳，用 mock 推荐完成选库→录入→推荐确认→演示建表，并支持缺标跳转新建标准草稿。

**Architecture:** 纯前端 React 原型。扩展 `ProductLineKey` / hash 路由 / `product-lines.json`；`table-builder` feature 承载向导状态（sessionStorage）与 mock 推荐引擎；`data-standard` feature 承载列表壳与草稿页；跨产品通过 session 草稿交接，不接真实库。

**Tech Stack:** React 19、TypeScript、Vite、Vitest、Testing Library、现有 `Button`/`Tag`/`Modal`/`toast`、hash 路由、`ProductSwitcher` Web Component。

**Spec:** `docs/superpowers/specs/2026-08-08-standard-driven-table-builder-design.md`

**Prototype status:** Tasks 1–8 已在分支 `feature/standard-driven-table-builder`（HEAD `2c4dd73`）落地；Task 9 文档同步于 2026-08-08。

## Acceptance Evidence（spec §9）

| §9 验收项 | 证据（测试 / 提交） |
| --- | --- |
| 产品切换可进入「建表工具」「数据标准」 | `routes.test.ts`（hash 解析 + 建设中状态）；`AppShell.test.tsx`（两产品线导航）；`0e5d196`、`270d7b8` |
| 不选库无法进入录入；无字段或表名皆空无法进入推荐 | `TableBuilderPage.test.tsx`：`blocks entering fields step without database`；`allows paste then requires table name before recommend` |
| 推荐后展示完整标准相关列；缺标不阻断建表 | `recommend.test.ts`（命中/缺标/码表）；`auto-adopts recommendations and allows ignore / draft jump` |
| 改选 / 忽略 / 发起草稿可见且状态正确 | `auto-adopts...`；`clears standard-derived attributes when ignoring a matched field` |
| 保存标准草稿后回到同一建表上下文 | `completes cross-page E2E flow...草稿已发起`；`DataStandardPage.test.tsx`：`prefills draft from handoff and returns to table builder after save` |
| 成功页展示库/定稿字段/可复制 DDL；失败态可演示 | `confirms create and shows success result with DDL preview + copy`；`simulates a failure demo...`；`shows 查看相关草稿...` |
| 全程无真实网络建表请求 | `walks through the failure demo path end-to-end without any real network create-table`；`table-builder` feature 无 fetch/API 调用 |

**回归：** `npm test -- src/features/table-builder src/features/data-standard src/app/routes.test.ts src/app/AppShell.test.tsx` → 8 files / 45 tests PASS（2026-08-08）。

## Global Constraints

- 仅原型：不接真实数据源、不执行真实 DDL、不发真实网络建表请求。
- 推荐内容必须覆盖：表名、字段名、类型/长度/精度、约束、码表、分类分级、命中标准与依据/置信度、缺标。
- 缺标不阻断建表；字段英文名重复必须阻断确认建表。
- 录入：手填 + 粘贴批量；不做 SQL 解析。
- 产品切换新增「数据标准」「建表工具」，状态均为「建设中」。
- `docs/` 被 gitignore：提交文档时使用 `git add -f`。
- Commit message 遵循 `type(scope): subject`（本功能 scope 用 `table-builder` / `data-standard` / `router`）。

---

## File Structure

| 路径 | 职责 |
| --- | --- |
| `src/types/tableBuilder.ts` | 建表向导与推荐领域类型 |
| `src/features/table-builder/mockStandards.ts` | 已发布标准 / 码表 mock |
| `src/features/table-builder/recommend.ts` | 表级+字段级推荐纯函数 |
| `src/features/table-builder/pasteParse.ts` | 粘贴文本解析为字段行 |
| `src/features/table-builder/ddlTemplates.ts` | 按引擎生成 DDL 字符串 |
| `src/features/table-builder/wizardStore.ts` | 向导 session 读写与草稿交接 |
| `src/features/table-builder/TableBuilderPage.tsx` | 四步向导容器 |
| `src/features/table-builder/steps/*.tsx` | Step1～4 UI |
| `src/features/table-builder/table-builder.css` | 向导样式 |
| `src/features/data-standard/mockCatalog.ts` | 标准集/标准列表占位 |
| `src/features/data-standard/DataStandardShellPage.tsx` | 标准壳列表 |
| `src/features/data-standard/DataStandardDraftPage.tsx` | 新建标准草稿 |
| `src/features/data-standard/data-standard.css` | 标准壳样式 |
| `src/app/routes.ts` | 路由 key / 产品线 / hash 解析 |
| `src/app/AppShell.tsx` | 新产品线导航与标题 |
| `src/app/App.tsx` | 挂载页面 |
| `public/widgets/product-lines.json` | 切换器可见产品清单 |

---

### Task 1: 领域类型 + mock 标准 + 推荐引擎

**Files:**
- Create: `src/types/tableBuilder.ts`
- Create: `src/features/table-builder/mockStandards.ts`
- Create: `src/features/table-builder/recommend.ts`
- Test: `src/features/table-builder/recommend.test.ts`

**Interfaces:**
- Consumes: 无
- Produces:
  - `export type FieldRecommendStatus = 'adopted' | 'reselected' | 'ignored' | 'missing' | 'draft_started'`
  - `export type PublishedStandard = { code: string; nameZh: string; nameEn: string; setName: string; dataType: string; length?: number; precision?: number; nullable: boolean; primaryKey?: boolean; codeTable?: string; classificationPath: string; grade: string; keywords: string[] }`
  - `export function recommendTable(input: { nameZh: string; nameEn: string; description: string }): TableRecommendResult`
  - `export function recommendFields(fields: Array<{ id: string; nameZh: string; nameEn: string; comment: string }>): FieldRecommendResult[]`
  - `export const PUBLISHED_STANDARDS: PublishedStandard[]`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { recommendFields, recommendTable } from './recommend';

describe('recommendTable', () => {
  it('recommends a standard-like English name from Chinese table name', () => {
    const result = recommendTable({ nameZh: '客户维度表', nameEn: '', description: '客户主体' });
    expect(result.nameZh).toContain('客户');
    expect(result.nameEn).toMatch(/^[a-z][a-z0-9_]*$/);
    expect(result.rationale.length).toBeGreaterThan(0);
  });
});

describe('recommendFields', () => {
  it('matches 客户编号 to published standard with high confidence', () => {
    const [row] = recommendFields([{ id: 'f1', nameZh: '客户编号', nameEn: '', comment: '' }]);
    expect(row.status).toBe('adopted');
    expect(row.standard?.nameEn).toBe('customer_code');
    expect(row.confidence).toBe('high');
    expect(row.dataType).toBeTruthy();
    expect(row.classificationPath).toBeTruthy();
    expect(row.grade).toBeTruthy();
  });

  it('matches 客户性别 with code table', () => {
    const [row] = recommendFields([{ id: 'f2', nameZh: '客户性别', nameEn: '', comment: '' }]);
    expect(row.standard?.nameEn).toBe('customer_gender');
    expect(row.codeTable).toMatch(/性别/);
  });

  it('marks 优惠券编码 as missing with suggested English name', () => {
    const [row] = recommendFields([{ id: 'f3', nameZh: '优惠券编码', nameEn: '', comment: '' }]);
    expect(row.status).toBe('missing');
    expect(row.standard).toBeUndefined();
    expect(row.suggestedNameEn).toMatch(/coupon/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/table-builder/recommend.test.ts`

Expected: FAIL（模块不存在）

- [ ] **Step 3: Write minimal implementation**

在 `src/types/tableBuilder.ts` 定义上述类型与 `TableRecommendResult` / `FieldRecommendResult`（含 `rationale`、`confidence: 'high' | 'medium' | 'low'`、`nullable`、`primaryKey` 等）。

在 `mockStandards.ts` 至少放入：

- `CLT_CUS_001` 客户编号 / `customer_code`
- `CLT_CUS_002` 客户性别 / `customer_gender` + 码表「性别码表」
- 若干可改选的备用标准

在 `recommend.ts`：按 `nameZh`/`comment` 对 `keywords` 精确或包含匹配；命中则 `status: 'adopted'` 并填满技术属性；未命中则 `status: 'missing'`，`suggestedNameEn` 用简单拼音/英文词根映射表（至少覆盖 coupon → `coupon_code`）。

- [ ] **Step 4: Run tests and make sure they pass**

Run: `npm test -- src/features/table-builder/recommend.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/tableBuilder.ts src/features/table-builder/mockStandards.ts src/features/table-builder/recommend.ts src/features/table-builder/recommend.test.ts
git commit -m "$(cat <<'EOF'
feat(table-builder): add mock standards and recommend engine

EOF
)"
```

---

### Task 2: 粘贴解析 + DDL 模板

**Files:**
- Create: `src/features/table-builder/pasteParse.ts`
- Create: `src/features/table-builder/ddlTemplates.ts`
- Test: `src/features/table-builder/pasteParse.test.ts`
- Test: `src/features/table-builder/ddlTemplates.test.ts`

**Interfaces:**
- Consumes: `FieldRecommendResult` 定稿字段形状（或向导字段定稿类型 `FinalField`）
- Produces:
  - `export type ParsedFieldRow = { nameZh: string; nameEn: string; comment: string }`
  - `export function parsePastedFields(text: string): { ok: true; rows: ParsedFieldRow[] } | { ok: false; message: string }`
  - `export type EngineType = 'Hive' | 'MaxCompute' | 'MySQL'`
  - `export function buildDdl(input: { engine: EngineType; database: string; tableNameEn: string; tableComment: string; fields: Array<{ nameEn: string; dataType: string; nullable: boolean; comment: string }> }): string`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { parsePastedFields } from './pasteParse';
import { buildDdl } from './ddlTemplates';

describe('parsePastedFields', () => {
  it('parses tab or comma separated rows', () => {
    const text = '客户编号\t\t客户唯一编号\n客户性别,sex,性别';
    const result = parsePastedFields(text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].nameZh).toBe('客户编号');
      expect(result.rows[1].nameEn).toBe('sex');
    }
  });

  it('rejects empty paste with example hint', () => {
    const result = parsePastedFields('   ');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('中文名');
  });
});

describe('buildDdl', () => {
  it('switches dialect by engine', () => {
    const fields = [{ nameEn: 'customer_code', dataType: 'STRING', nullable: false, comment: '客户编号' }];
    const hive = buildDdl({ engine: 'Hive', database: 'dwd', tableNameEn: 'dim_customer', tableComment: '客户', fields });
    const mysql = buildDdl({ engine: 'MySQL', database: 'dwd', tableNameEn: 'dim_customer', tableComment: '客户', fields });
    expect(hive).toMatch(/CREATE TABLE/i);
    expect(hive).toContain('dwd.dim_customer');
    expect(mysql).toMatch(/`dim_customer`/);
    expect(mysql).not.toEqual(hive);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/features/table-builder/pasteParse.test.ts src/features/table-builder/ddlTemplates.test.ts`

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

- `parsePastedFields`：按行拆分；分隔符优先 `\t`，否则逗号；列顺序固定为 中文名、英文名、注释；缺列填 `''`；零有效行返回失败文案含示例「客户编号,customer_code,客户唯一编号」。
- `buildDdl`：Hive/MaxCompute 用 `db.table` + `STRING` 风格注释；MySQL 用反引号与 `COMMENT` 子句。仅为字符串模板。

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/features/table-builder/pasteParse.test.ts src/features/table-builder/ddlTemplates.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/table-builder/pasteParse.ts src/features/table-builder/pasteParse.test.ts src/features/table-builder/ddlTemplates.ts src/features/table-builder/ddlTemplates.test.ts
git commit -m "$(cat <<'EOF'
feat(table-builder): add paste parser and DDL templates

EOF
)"
```

---

### Task 3: 向导 Store 与缺标草稿交接

**Files:**
- Create: `src/features/table-builder/wizardStore.ts`
- Test: `src/features/table-builder/wizardStore.test.ts`

**Interfaces:**
- Consumes: `EngineType`、字段推荐结果类型
- Produces:
  - `export type WizardStep = 1 | 2 | 3 | 4`
  - `export type WizardState`（含 `engine`、`database`、`table`、`fields`、`recommendations`、`step`、`createOutcome: 'success' | 'failure' | null`）
  - `export function loadWizard(): WizardState`
  - `export function saveWizard(state: WizardState): void`
  - `export function clearWizard(): void`
  - `export function createDefaultWizard(): WizardState`
  - `export type StandardDraftHandoff = { fieldId: string; nameZh: string; comment: string; suggestedNameEn: string; dataType: string; source: 'table-builder' }`
  - `export function setDraftHandoff(payload: StandardDraftHandoff): void`
  - `export function consumeDraftHandoff(): StandardDraftHandoff | null`
  - `export function markFieldDraftStarted(fieldId: string): void`（更新 wizard 中对应字段 status）
  - Storage keys: `dap.tableBuilder.wizard`、`dap.tableBuilder.draftHandoff`

- [ ] **Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearWizard,
  consumeDraftHandoff,
  createDefaultWizard,
  loadWizard,
  markFieldDraftStarted,
  saveWizard,
  setDraftHandoff,
} from './wizardStore';

describe('wizardStore', () => {
  beforeEach(() => {
    sessionStorage.clear();
    clearWizard();
  });

  it('persists wizard step and target database', () => {
    const state = createDefaultWizard();
    state.step = 2;
    state.engine = 'Hive';
    state.database = 'dwd';
    saveWizard(state);
    expect(loadWizard().database).toBe('dwd');
    expect(loadWizard().step).toBe(2);
  });

  it('hands off draft payload and marks field draft_started after save path', () => {
    const state = createDefaultWizard();
    state.fields = [{ id: 'f3', nameZh: '优惠券编码', nameEn: '', comment: '' }];
    state.recommendations = [
      {
        fieldId: 'f3',
        status: 'missing',
        suggestedNameEn: 'coupon_code',
        dataType: 'STRING',
        length: undefined,
        precision: undefined,
        nullable: true,
        primaryKey: false,
        codeTable: undefined,
        classificationPath: '',
        grade: '',
        confidence: 'low',
        rationale: '无已发布标准命中',
      },
    ];
    saveWizard(state);
    setDraftHandoff({
      fieldId: 'f3',
      nameZh: '优惠券编码',
      comment: '',
      suggestedNameEn: 'coupon_code',
      dataType: 'STRING',
      source: 'table-builder',
    });
    expect(consumeDraftHandoff()?.fieldId).toBe('f3');
    expect(consumeDraftHandoff()).toBeNull();
    markFieldDraftStarted('f3');
    expect(loadWizard().recommendations.find((r) => r.fieldId === 'f3')?.status).toBe('draft_started');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/table-builder/wizardStore.test.ts`

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

用 `sessionStorage` JSON 读写；`createDefaultWizard` 返回 step=1、空字段、`createOutcome: null`；`markFieldDraftStarted` 读-改-写 recommendations。

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/features/table-builder/wizardStore.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/table-builder/wizardStore.ts src/features/table-builder/wizardStore.test.ts src/types/tableBuilder.ts
git commit -m "$(cat <<'EOF'
feat(table-builder): add wizard session and draft handoff store

EOF
)"
```

---

### Task 4: 产品线路由 + 切换器配置 + App 挂载

**Files:**
- Modify: `src/app/routes.ts`
- Modify: `src/app/AppShell.tsx`
- Modify: `src/app/App.tsx`
- Modify: `public/widgets/product-lines.json`
- Test: `src/app/routes.test.ts`（新建）
- Modify: `src/app/AppShell.test.tsx`（补新产品线断言；若现有 ChatBI 外链断言与当前 `AppShell` 实现不一致，以当前实现为准修正测试，避免误伤）

**Interfaces:**
- Consumes: 页面组件将在 Task 5/6 接入；本任务可先挂占位组件或空壳
- Produces:
  - `ProductLineKey` 增加 `'data-standard' | 'table-builder'`
  - `AppRouteKey` 增加 `'data-standard' | 'data-standard-draft' | 'table-builder'`
  - `getProductLineFromHash('#table-builder') === 'table-builder'`
  - `getProductLineFromHash('#data-standard/draft') === 'data-standard'`
  - `getRouteFromHash('#data-standard/draft') === 'data-standard-draft'`
  - `product-lines.json` 增加两条：`hash` 分别为 `#data-standard`、`#table-builder`，`status: "建设中"`

- [ ] **Step 1: Write the failing route tests**

```ts
import { describe, expect, it } from 'vitest';
import { getProductLineFromHash, getRouteFromHash, productLines } from './routes';

describe('table-builder product routes', () => {
  it('resolves product lines from hash', () => {
    expect(getProductLineFromHash('#table-builder')).toBe('table-builder');
    expect(getProductLineFromHash('#data-standard')).toBe('data-standard');
    expect(getProductLineFromHash('#data-standard/draft')).toBe('data-standard');
  });

  it('resolves routes from hash', () => {
    expect(getRouteFromHash('#table-builder')).toBe('table-builder');
    expect(getRouteFromHash('#data-standard')).toBe('data-standard');
    expect(getRouteFromHash('#data-standard/draft')).toBe('data-standard-draft');
  });

  it('registers both product lines as 建设中', () => {
    expect(productLines.find((p) => p.key === 'table-builder')?.status).toBe('建设中');
    expect(productLines.find((p) => p.key === 'data-standard')?.status).toBe('建设中');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/routes.test.ts`

Expected: FAIL

- [ ] **Step 3: Implement routes, json, shell, app wiring**

`product-lines.json` 追加（url 用当前 pages 域名 + hash，与现有条目一致）：

```json
{
  "key": "data-standard",
  "name": "数据标准",
  "icon": "📘",
  "status": "建设中",
  "url": "https://data-asset-platform.pages.dev/#data-standard",
  "hash": "#data-standard"
},
{
  "key": "table-builder",
  "name": "建表工具",
  "icon": "🛠️",
  "status": "建设中",
  "url": "https://data-asset-platform.pages.dev/#table-builder",
  "hash": "#table-builder"
}
```

`AppShell`：

- logo：`data-standard` →「数据标准」；`table-builder` →「建表工具」
- nav：`data-standard` 下「标准集 / 数据标准 / 新建草稿」链到 `#data-standard`、`#data-standard`（列表锚点可用 query 或同页 Tab）、`#data-standard/draft`
- nav：`table-builder` 下「建表向导」→ `#table-builder`

`App.tsx`：按 route 渲染占位或后续真实页面（Task 5/6 替换）。

- [ ] **Step 4: Run tests**

Run: `npm test -- src/app/routes.test.ts src/app/AppShell.test.tsx`

Expected: PASS（含更新后的 AppShell 断言）

- [ ] **Step 5: Commit**

```bash
git add src/app/routes.ts src/app/routes.test.ts src/app/AppShell.tsx src/app/AppShell.test.tsx src/app/App.tsx public/widgets/product-lines.json
git commit -m "$(cat <<'EOF'
feat(router): add data-standard and table-builder product lines

EOF
)"
```

---

### Task 5: 数据标准轻量壳 + 新建草稿页

**Files:**
- Create: `src/features/data-standard/mockCatalog.ts`
- Create: `src/features/data-standard/DataStandardShellPage.tsx`
- Create: `src/features/data-standard/DataStandardDraftPage.tsx`
- Create: `src/features/data-standard/data-standard.css`
- Test: `src/features/data-standard/DataStandardPage.test.tsx`
- Modify: `src/app/App.tsx`（挂载真实页面）

**Interfaces:**
- Consumes: `consumeDraftHandoff`、`markFieldDraftStarted`、`loadWizard`
- Produces: 可演示列表；草稿保存后 `window.location.hash = '#table-builder'` 并 `markFieldDraftStarted`

- [ ] **Step 1: Write the failing page test**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { DataStandardDraftPage } from './DataStandardDraftPage';
import { DataStandardShellPage } from './DataStandardShellPage';
import { clearWizard, setDraftHandoff } from '../table-builder/wizardStore';

describe('DataStandard shell', () => {
  beforeEach(() => {
    sessionStorage.clear();
    clearWizard();
  });

  it('renders placeholder standard list', () => {
    render(<DataStandardShellPage />);
    expect(screen.getByRole('heading', { name: /数据标准/ })).toBeInTheDocument();
    expect(screen.getByText(/客户编号|标准集/)).toBeInTheDocument();
  });

  it('prefills draft from handoff and returns to table builder after save', async () => {
    const user = userEvent.setup();
    setDraftHandoff({
      fieldId: 'f3',
      nameZh: '优惠券编码',
      comment: '营销优惠券',
      suggestedNameEn: 'coupon_code',
      dataType: 'STRING',
      source: 'table-builder',
    });
    render(<DataStandardDraftPage />);
    expect(screen.getByDisplayValue('优惠券编码')).toBeInTheDocument();
    expect(screen.getByDisplayValue('coupon_code')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '保存草稿' }));
    expect(window.location.hash).toBe('#table-builder');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/data-standard/DataStandardPage.test.tsx`

Expected: FAIL

- [ ] **Step 3: Implement pages**

- Shell：展示标准集表格 + 已发布标准表格（来自 `mockCatalog` / 复用 `PUBLISHED_STANDARDS`）+ 入口按钮「新建标准草稿」。
- Draft：mount 时 `consumeDraftHandoff()` 预填；无交接时空白可填；「保存草稿」调用 `markFieldDraftStarted`（有 fieldId 时）并跳转 `#table-builder`；「取消」跳转 `#table-builder` 且不 mark。
- 文案标明「原型：草稿仅演示，不入库」。

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/features/data-standard/DataStandardPage.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/data-standard src/app/App.tsx
git commit -m "$(cat <<'EOF'
feat(data-standard): add shell list and draft handoff page

EOF
)"
```

---

### Task 6: 建表向导 Step ①②（选库 + 录入）

**Files:**
- Create: `src/features/table-builder/steps/StepTarget.tsx`
- Create: `src/features/table-builder/steps/StepFields.tsx`
- Create: `src/features/table-builder/TableBuilderPage.tsx`
- Create: `src/features/table-builder/table-builder.css`
- Test: `src/features/table-builder/TableBuilderPage.test.tsx`（本任务先覆盖 Step1/2）
- Modify: `src/app/App.tsx`

**Interfaces:**
- Consumes: `wizardStore`、`parsePastedFields`、`DEMO_DATABASES`（按引擎映射，写在 `mockStandards.ts` 或本 feature 常量）
- Produces: 可进入 Step3 的校验函数 `canEnterRecommend(state): string | null`（返回错误文案或 null）

- [ ] **Step 1: Write failing UI tests for gates**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { TableBuilderPage } from './TableBuilderPage';
import { clearWizard } from './wizardStore';

describe('TableBuilderPage steps 1-2', () => {
  beforeEach(() => {
    sessionStorage.clear();
    clearWizard();
    window.location.hash = '#table-builder';
  });

  it('blocks entering fields step without database', async () => {
    const user = userEvent.setup();
    render(<TableBuilderPage />);
    await user.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByText(/选择.*数据源|目标库/)).toBeInTheDocument();
  });

  it('allows paste then requires table name before recommend', async () => {
    const user = userEvent.setup();
    render(<TableBuilderPage />);
    await user.selectOptions(screen.getByLabelText('数据源类型'), 'Hive');
    await user.selectOptions(screen.getByLabelText('目标库'), 'dwd');
    await user.click(screen.getByRole('button', { name: '下一步' }));
    await user.click(screen.getByRole('button', { name: /粘贴/ }));
    await user.clear(screen.getByLabelText(/粘贴/));
    await user.type(
      screen.getByLabelText(/粘贴/),
      '客户编号,,客户唯一编号{enter}客户性别,,{enter}优惠券编码,,',
    );
    await user.click(screen.getByRole('button', { name: '解析并写入' }));
    await user.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByText(/表中文名|表英文名/)).toBeInTheDocument();
  });
});
```

（若 `{enter}` 在 user-event 中不便，改为一次性 paste 含换行的字符串。）

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/table-builder/TableBuilderPage.test.tsx`

Expected: FAIL

- [ ] **Step 3: Implement Step1/2 + page shell**

- 顶部步骤条：1 选目标库 → 2 录入 → 3 推荐确认 → 4 结果
- Step1：类型下拉 Hive/MaxCompute/MySQL；库下拉随类型变化；提示「原型演示：不连接真实数据源」
- Step2：表中文名/英文名/描述；字段表增删行；粘贴 Modal；下一步前校验：有字段且表中/英文名至少一个非空
- 每步变更 `saveWizard`

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/features/table-builder/TableBuilderPage.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/table-builder src/app/App.tsx
git commit -m "$(cat <<'EOF'
feat(table-builder): add wizard steps for target and field input

EOF
)"
```

---

### Task 7: Step ③ 推荐确认（含改选/忽略/发起草稿）

**Files:**
- Create: `src/features/table-builder/steps/StepRecommend.tsx`
- Modify: `src/features/table-builder/TableBuilderPage.tsx`
- Modify: `src/features/table-builder/TableBuilderPage.test.tsx`
- Modify: `src/types/tableBuilder.ts`（如需补齐 UI 状态字段）

**Interfaces:**
- Consumes: `recommendTable`、`recommendFields`、`PUBLISHED_STANDARDS`、`setDraftHandoff`
- Produces: 进入 Step4 前校验 `hasDuplicateEnglishNames(fields): boolean`；缺标可点「新建标准草稿」→ hash `#data-standard/draft`

- [ ] **Step 1: Extend failing tests**

```tsx
import { recommendFields } from './recommend';
import { createDefaultWizard, saveWizard } from './wizardStore';

it('auto-adopts recommendations and allows ignore / draft jump', async () => {
  const user = userEvent.setup();
  const state = createDefaultWizard();
  state.step = 2;
  state.engine = 'Hive';
  state.database = 'dwd';
  state.table = { nameZh: '客户维表', nameEn: '', description: '客户主体' };
  state.fields = [
    { id: 'f1', nameZh: '客户编号', nameEn: '', comment: '' },
    { id: 'f2', nameZh: '客户性别', nameEn: '', comment: '' },
    { id: 'f3', nameZh: '优惠券编码', nameEn: '', comment: '' },
  ];
  saveWizard(state);
  render(<TableBuilderPage />);
  await user.click(screen.getByRole('button', { name: '下一步' }));
  expect(screen.getByText('客户编号')).toBeInTheDocument();
  expect(screen.getByText(/已采纳/)).toBeInTheDocument();
  expect(screen.getByText(/缺标/)).toBeInTheDocument();
  await user.click(screen.getAllByRole('button', { name: '忽略' })[0]);
  expect(screen.getByText(/已忽略|未落标/)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '新建标准草稿' }));
  expect(window.location.hash).toBe('#data-standard/draft');
});

it('blocks confirm create when english names duplicate', async () => {
  const user = userEvent.setup();
  const state = createDefaultWizard();
  state.step = 3;
  state.engine = 'Hive';
  state.database = 'dwd';
  state.table = { nameZh: '客户维表', nameEn: 'dim_customer', description: '' };
  state.fields = [
    { id: 'f1', nameZh: '客户编号', nameEn: 'customer_code', comment: '' },
    { id: 'f2', nameZh: '客户代码', nameEn: 'customer_code', comment: '' },
  ];
  state.recommendations = recommendFields(state.fields).map((row) => ({
    ...row,
    status: 'adopted' as const,
  }));
  saveWizard(state);
  render(<TableBuilderPage />);
  await user.click(screen.getByRole('button', { name: '确认建表' }));
  expect(screen.getByText(/英文名.*重复|重复/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '确认建表' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify new cases fail**

Run: `npm test -- src/features/table-builder/TableBuilderPage.test.tsx`

Expected: 新用例 FAIL

- [ ] **Step 3: Implement StepRecommend**

进入 Step3 时若尚无 recommendations，调用推荐并默认写入表名/字段英文名/类型等，status 按引擎结果。

UI 三块：表级推荐条；字段推荐表（规格全部列）；缺标汇总。

操作：

- 改选：Modal/Select 选 `PUBLISHED_STANDARDS`，status→`reselected`
- 忽略：status→`ignored`，保留用户原文
- 新建标准草稿：`setDraftHandoff` + `location.hash = '#data-standard/draft'`
- 确认建表：无英文名重复则 `step=4`、`createOutcome='success'`（失败演示用页面开关另测）

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/features/table-builder/TableBuilderPage.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/table-builder src/types/tableBuilder.ts
git commit -m "$(cat <<'EOF'
feat(table-builder): add recommend confirmation step

EOF
)"
```

---

### Task 8: Step ④ 结果页 + 失败演示 + 端到端验收用例

**Files:**
- Create: `src/features/table-builder/steps/StepResult.tsx`
- Modify: `src/features/table-builder/TableBuilderPage.tsx`
- Modify: `src/features/table-builder/TableBuilderPage.test.tsx`
- Modify: `src/features/table-builder/table-builder.css`

**Interfaces:**
- Consumes: `buildDdl`、`wizardStore`
- Produces: 成功/失败两态；复制 DDL（`navigator.clipboard.writeText`，测试中 mock）

- [ ] **Step 1: Write failing tests**

```tsx
import { DataStandardDraftPage } from '../data-standard/DataStandardDraftPage';
import { recommendFields } from './recommend';
import { createDefaultWizard, markFieldDraftStarted, saveWizard, setDraftHandoff } from './wizardStore';

it('shows success result with DDL for selected engine', async () => {
  const state = createDefaultWizard();
  state.step = 4;
  state.engine = 'Hive';
  state.database = 'dwd';
  state.createOutcome = 'success';
  state.table = { nameZh: '客户维表', nameEn: 'dim_customer', description: '客户主体' };
  state.fields = [{ id: 'f1', nameZh: '客户编号', nameEn: 'customer_code', comment: '' }];
  state.recommendations = recommendFields(state.fields);
  saveWizard(state);
  render(<TableBuilderPage />);
  expect(screen.getByText(/dwd/)).toBeInTheDocument();
  expect(screen.getByText(/dim_customer/)).toBeInTheDocument();
  expect(screen.getByText(/CREATE TABLE/i)).toBeInTheDocument();
});

it('can toggle demo failure outcome and retry', async () => {
  const user = userEvent.setup();
  const state = createDefaultWizard();
  state.step = 4;
  state.engine = 'Hive';
  state.database = 'dwd';
  state.createOutcome = 'success';
  state.table = { nameZh: '客户维表', nameEn: 'dim_customer', description: '' };
  state.fields = [{ id: 'f1', nameZh: '客户编号', nameEn: 'customer_code', comment: '' }];
  state.recommendations = recommendFields(state.fields);
  saveWizard(state);
  render(<TableBuilderPage />);
  await user.click(screen.getByRole('button', { name: /演示失败|切换为失败/ }));
  expect(screen.getByText(/无权限/)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /重试/ }));
  expect(screen.getByText(/CREATE TABLE/i)).toBeInTheDocument();
});

it('returns from saved draft with draft_started status', async () => {
  const user = userEvent.setup();
  const state = createDefaultWizard();
  state.step = 3;
  state.engine = 'Hive';
  state.database = 'dwd';
  state.table = { nameZh: '客户维表', nameEn: 'dim_customer', description: '' };
  state.fields = [{ id: 'f3', nameZh: '优惠券编码', nameEn: 'coupon_code', comment: '' }];
  state.recommendations = recommendFields(state.fields);
  saveWizard(state);
  setDraftHandoff({
    fieldId: 'f3',
    nameZh: '优惠券编码',
    comment: '',
    suggestedNameEn: 'coupon_code',
    dataType: 'STRING',
    source: 'table-builder',
  });
  render(<DataStandardDraftPage />);
  await user.click(screen.getByRole('button', { name: '保存草稿' }));
  expect(window.location.hash).toBe('#table-builder');
  render(<TableBuilderPage />);
  expect(screen.getByText(/草稿已发起/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/features/table-builder/TableBuilderPage.test.tsx src/features/data-standard/DataStandardPage.test.tsx`

Expected: 新用例 FAIL 或未覆盖

- [ ] **Step 3: Implement StepResult + wire demo failure**

- 成功：展示库、表、字段数、时间、定稿表、DDL、复制、再建一张（`clearWizard` 后 step1）、查看相关草稿（`#data-standard`）
- 失败演示：Step3 旁或结果页「切换为失败演示」设置 `createOutcome='failure'`，文案「目标库无权限（演示）」+ 重试

- [ ] **Step 4: Full verification**

Run:

```bash
npm test -- src/features/table-builder src/features/data-standard src/app/routes.test.ts src/app/AppShell.test.tsx
npm run build
```

Expected: 测试 PASS；`tsc`/build 成功

手动冒烟（`npm run dev`）：

1. 切换器进入建表工具 / 数据标准  
2. 选 Hive + dwd → 粘贴三字段剧本 → 推荐 → 缺标发起草稿 → 保存回向导 → 确认建表 → 复制 DDL  

- [ ] **Step 5: Commit**

```bash
git add src/features/table-builder src/features/data-standard
git commit -m "$(cat <<'EOF'
feat(table-builder): add create result step and e2e prototype flow

EOF
)"
```

---

### Task 9: 计划/规格收尾（文档同步）

**Files:**
- Modify: `docs/superpowers/plans/2026-08-08-standard-driven-table-builder.md`（勾选完成项，若执行时维护）
- Optional: 在 spec 顶部状态改为「已实现原型」仅当验收通过后

- [x] **Step 1: 对照 spec §9 验收清单逐项勾选并记录证据（测试名或截图说明）** — 见上文 **Acceptance Evidence**
- [x] **Step 2: `git add -f` 更新后的 plan/spec 状态并 commit**

```bash
git add -f docs/superpowers/plans/2026-08-08-standard-driven-table-builder.md docs/superpowers/specs/2026-08-08-standard-driven-table-builder-design.md
git commit -m "$(cat <<'EOF'
docs(table-builder): mark prototype plan acceptance checklist

EOF
)"
```

---

## Self-Review (plan vs spec)

| Spec 要求 | 对应 Task |
| --- | --- |
| 产品切换两入口 | Task 4 |
| 四步向导 | Task 6–8 |
| 推荐 1–8 全覆盖 | Task 1 + Task 7 UI 列 |
| 手填+粘贴 | Task 2 + Task 6 |
| 默认采纳+逐条改 | Task 7 |
| 缺标建草稿往返 | Task 3 + Task 5 + Task 7/8 |
| 演示建表成功/失败+DDL | Task 2 + Task 8 |
| 数据标准轻量壳 | Task 5 |
| 不接真库 | Global Constraints + 无 service 调用 |
| SQL 解析不做 | 未排 Task |

无 TBD/TODO 占位；类型名在 Task 1/3 已对齐（`FieldRecommendStatus`、`StandardDraftHandoff`）。
