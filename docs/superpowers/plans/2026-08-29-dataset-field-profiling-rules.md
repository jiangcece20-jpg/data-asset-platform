# 数据集字段探查规则（第一期·原型）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把第一期探查口径落到对外 APP 原型：类型合并、文案、时间粒度切换、mock 与单测对齐。

**Architecture:** 领域类型去掉独立 `identifier`/`categorical`，统一为 `string`（唯一性 + Top10）。时间型改为年/年季/年月三套分布，UI 默认年月可切换。本计划只改 `external-app-vue3` 原型；SelectDB 抽样/全量 SQL 与异步任务属后续后端计划，不在此交付。

**Tech Stack:** Vue 3、TypeScript、Vitest、Vue Test Utils

**Spec:** `docs/superpowers/specs/2026-08-29-dataset-field-profiling-rules-design.md`

## Global Constraints

- 空值率/唯一值率可抽样，默认上限 100 万；前台文案带「采样」提示
- 直方图等宽 10 桶；字符串 Top10；时间默认年月
- 标识型不做独立 kind；字符串合并算唯一性 + Top10
- 测试：`cd external-app-vue3 && npm test -- --run <files>`
- 文档目录被 `.gitignore`，需 `git add -f` 才能纳入版本库

## File map

| 文件 | 职责 |
|------|------|
| `external-app-vue3/src/types/domain.ts` | `FieldProfiling` 联合类型 |
| `FieldProfilingPanel.vue` + `.test.ts` | 移动端探查 UI |
| `PortalDatasetDetail.vue` | PC 门户探查 UI |
| `ResourceEdit.vue` | 后台探查配置说明文案 |
| `data/products.ts` / `resources.ts` / `sellerDatasets.ts` / `mockProducts.ts` | mock 探查结果 |
| 相关 `*.test.ts` | 类型与展示断言 |

---

### Task 1: 收敛领域类型

**Files:**
- Modify: `external-app-vue3/src/types/domain.ts`

**Produces:**
- `FieldProfilingKind = 'numeric' | 'string' | 'datetime' | 'boolean'`
- `StringFieldProfiling { kind:'string'; uniqueness:string; topValues:DistributionBucket[] }`
- `DateTimeFieldProfiling` 含 `distributionYear` / `distributionQuarter` / `distributionMonth`
- 删除 `CategoricalFieldProfiling` / `IdentifierFieldProfiling` 导出

- [ ] **Step 1: 改类型定义**

将探查相关段落替换为：

```ts
export type FieldProfilingKind = 'numeric' | 'string' | 'datetime' | 'boolean'

export interface DistributionBucket {
  label: string
  count: number
  percent: number
}

interface FieldProfilingBase {
  fieldName: string
  kind: FieldProfilingKind
  /** 空值率；大表抽样时文案含「采样」，如 "0.8%（采样）" */
  nullRate: string
  distinctCount: number
  anomalies?: string
  updatedAt: string
}

export interface NumericFieldProfiling extends FieldProfilingBase {
  kind: 'numeric'
  min: string
  max: string
  avg: string
  median?: string
  p25?: string
  p75?: string
  /** 等宽 10 桶（min=max 时可 1 桶） */
  histogram: DistributionBucket[]
}

/** 字符串探查：不区分标识/分类，同时给唯一性 + Top10 */
export interface StringFieldProfiling extends FieldProfilingBase {
  kind: 'string'
  /** 唯一值率；抽样时文案含「采样」，如 "98.5%（采样）" */
  uniqueness: string
  topValues: DistributionBucket[]
}

export interface DateTimeFieldProfiling extends FieldProfilingBase {
  kind: 'datetime'
  minDate: string
  maxDate: string
  span: string
  distributionYear: DistributionBucket[]
  distributionQuarter: DistributionBucket[]
  distributionMonth: DistributionBucket[]
}

export interface BooleanFieldProfiling extends FieldProfilingBase {
  kind: 'boolean'
  trueCount: number
  falseCount: number
  truePercent: number
}

export type FieldProfiling =
  | NumericFieldProfiling
  | StringFieldProfiling
  | DateTimeFieldProfiling
  | BooleanFieldProfiling
```

- [ ] **Step 2: Commit**

```bash
git add external-app-vue3/src/types/domain.ts
git commit -m "refactor(detail): 合并字符串探查类型并拆时间粒度"
```

---

### Task 2: 移动端探查面板 + 单测

**Files:**
- Modify: `external-app-vue3/src/components/mobile/product-detail/FieldProfilingPanel.vue`
- Modify: `external-app-vue3/src/components/mobile/product-detail/FieldProfilingPanel.test.ts`

**Consumes:** Task 1 类型  
**Produces:** 字符串展示唯一性+Top10；时间粒度 chip 默认「年月」

- [ ] **Step 1: 写/改失败用例**

在 `FieldProfilingPanel.test.ts`：

1. `activity_level` mock 改为 `kind:'string'`，带 `uniqueness` + `topValues`
2. `register_date` 改为三套 `distribution*`
3. 断言文案：`字符串`（非「分类型」）、含唯一性、含 Top10
4. 新增：点时间字段后默认见「年月」chip 选中，可切到「年」

示例断言片段：

```ts
await wrapper.get('[data-dim="activity_level"]').trigger('click')
expect(wrapper.text()).toContain('字符串')
expect(wrapper.text()).toContain('唯一性')
expect(wrapper.text()).toContain('TOP 值分布')

await wrapper.get('[data-dim="register_date"]').trigger('click')
expect(wrapper.get('[data-grain="month"][aria-selected="true"]').exists()).toBe(true)
await wrapper.get('[data-grain="year"]').trigger('click')
expect(wrapper.text()).toContain(/* year bucket label from mock */)
```

- [ ] **Step 2: 跑测确认红**

```bash
cd external-app-vue3 && npm test -- --run src/components/mobile/product-detail/FieldProfilingPanel.test.ts
```

Expected: FAIL（旧 categorical / 无 grain 切换）

- [ ] **Step 3: 改面板实现**

要点：

```ts
function isString(s: FieldProfiling): s is StringFieldProfiling { return s.kind === 'string' }
// 去掉 isCategorical / isIdentifier

const timeGrain = ref<'year' | 'quarter' | 'month'>('month')
watch(currentStat, () => { timeGrain.value = 'month' })

// string: 指标含唯一性；分布用 topValues
// datetime: distributionData 按 timeGrain 取 distributionYear|Quarter|Month
```

模板：时间型在分布标题旁加三个 grain 按钮（`data-grain="year|quarter|month"`）。  
`kindLabel.string = '字符串'`。

- [ ] **Step 4: 绿测 + Commit**

```bash
cd external-app-vue3 && npm test -- --run src/components/mobile/product-detail/FieldProfilingPanel.test.ts
git add external-app-vue3/src/components/mobile/product-detail/FieldProfilingPanel.vue \
  external-app-vue3/src/components/mobile/product-detail/FieldProfilingPanel.test.ts
git commit -m "feat(detail): 探查面板支持字符串合并与时间粒度切换"
```

---

### Task 3: PC 门户探查面板对齐

**Files:**
- Modify: `external-app-vue3/src/views/portal/components/PortalDatasetDetail.vue`

- [ ] **Step 1: 同步类型守卫、字符串指标、时间 grain UI**（与移动端同一交互语义）
- [ ] **Step 2: Commit**

```bash
git add external-app-vue3/src/views/portal/components/PortalDatasetDetail.vue
git commit -m "feat(detail): 门户探查报告对齐字符串与时间粒度"
```

---

### Task 4: 后台文案 + mock 数据迁移

**Files:**
- Modify: `external-app-vue3/src/views/admin/ResourceEdit.vue`（探查配置说明）
- Modify: `external-app-vue3/src/data/products.ts`
- Modify: `external-app-vue3/src/data/resources.ts`
- Modify: `external-app-vue3/src/data/sellerDatasets.ts`
- Modify: `external-app-vue3/src/data/mockProducts.ts`
- 若有断言 kind 的测试：一并改

**规则：**

- 所有 `kind:'identifier'|'categorical'` → `kind:'string'`，补齐 `uniqueness` + `topValues`（Top 最多 10）
- 所有 `datetime`：拆成 `distributionYear/Quarter/Month`；删旧 `distribution`
- 至少一处 numeric `histogram` 做成 **10 个等宽桶** 作口径样板
- 大表示例的 `nullRate`/`uniqueness` 带「（采样）」

后台说明改为类似：

> 勾选字段开放探查。数值/时间/布尔按字段类型探查；字符串同时计算唯一性与 Top10，不区分标识/分类。

- [ ] **Step 1: 改文案与全部 mock**
- [ ] **Step 2: 跑相关测试**

```bash
cd external-app-vue3 && npm test -- --run \
  src/components/mobile/product-detail/FieldProfilingPanel.test.ts \
  src/data/products.test.ts \
  src/data/resources.test.ts \
  src/views/admin/ResourceEdit.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add external-app-vue3/src/views/admin/ResourceEdit.vue \
  external-app-vue3/src/data/products.ts \
  external-app-vue3/src/data/resources.ts \
  external-app-vue3/src/data/sellerDatasets.ts \
  external-app-vue3/src/data/mockProducts.ts \
  external-app-vue3/src/data/products.test.ts \
  external-app-vue3/src/data/resources.test.ts \
  external-app-vue3/src/views/admin/ResourceEdit.test.ts
git commit -m "chore(mock): 探查 mock 对齐字符串合并与年月默认粒度"
```

---

### Task 5: 联调自检

- [ ] `npm test -- --run` 覆盖 Task 2–4 文件，全绿
- [ ] 手测路径（可选）：商品详情 → 探查报告 → 字符串见唯一性+Top10；时间默认年月可切年/年季
- [ ] 将本计划 `git add -f` 并 commit：

```bash
git add -f docs/superpowers/plans/2026-08-29-dataset-field-profiling-rules.md
git commit -m "docs(detail): 字段探查第一期原型实现计划"
```

## Out of scope（后续后端计划）

- SelectDB `TABLESAMPLE` / 100 万上限实现
- 直方图全量 SQL、Top10 全量、超时重试
- `UPDATE_TIME` / `VisibleVersionTime` 拉取与降级
- 异步探查任务调度

## Spec coverage checklist

| Spec 条款 | Task |
|-----------|------|
| 空值/唯一值抽样文案 | 1, 4 |
| 数值 10 桶 | 4（mock 样板）；类型注释在 1 |
| 字符串唯一性+Top10 | 1–4 |
| 时间年/季/月，默认月 | 1–3 |
| 标识型不做 | 1 |
| 后台只勾选开放 | 4 文案 |
| SelectDB 更新时间 | Out of scope（原型仍展示 `updatedAt` 字段） |
