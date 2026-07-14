# AI 找数 · 前端工程还原 SDD

- 日期：2026-07-14
- 依据：`docs/product/2026-07-13-AI找数-模块PRD.md`（V2.1）、原型 `ai-find-data-v3.html`
- 范围：全量还原 v3 场景；替换旧 v1 `src/features/ai-find`；接入主导航

## 1. 现有架构与约定

- React 18 + TS + Vite + vitest（jsdom + testing-library），hash 路由（`src/app/routes.ts` → `App.tsx` switch）
- 组件库：`src/components`（Tabs / Tag / Button / DataTable / Drawer / EmptyState / toast 单例）
- 数据分层：`src/types/*` 类型、`src/mocks/*` mock；样式 BEM + `src/styles/tokens.css` 变量

## 2. 模块拆分

```
src/types/aiFind.ts                     类型：TableAsset / AssetCard / ChatbiResult / Slots / RouteAction / ChatEntry
src/mocks/aiFind.ts                     mock：表资产(schema/血缘/样例池)、找数结果、查数结果、指标注册表数据、歧义词
src/features/ai-find/
  intent.ts                             纯函数：parseSlots / routeQuery（四层管道，PRD §6 的代码对应物）
  AIFindDataPage.tsx                    编排：左对话流 + 右四态 + 上下文 + 抽屉状态
  components/ChatbiResultPanel.tsx      查数结果 7 种渲染 + 来源与口径面板
  components/TableInfoPanel.tsx         表信息页（元信息/说明/schema/去即席查询）
  components/ReportPreviewPanel.tsx     报表/看板嵌入预览
  components/AssetDetailDrawer.tsx      统一详情抽屉（复用 Drawer 壳 + Tabs/Tag/DataTable，结构对齐 DetailPage）
  ai-find.css                           重写（BEM：ai-find__* / ai-drawer__*，全部用 tokens）
  intent.test.ts                        路由判定单测（覆盖 PRD §8 场景矩阵）
  AIFindDataPage.test.tsx               页面 smoke 测试
```

## 3. 关键设计

- **意图管道为纯函数**：`routeQuery(text, ctx, askCount) → RouteAction`（联合类型：chatbi / find / confirmMetric / definition / forecast / detailTable / mappingNotFound / ask / notFound）。页面只做 action → UI 的映射，规则可单测、可解释。
- **对话流为数据**：`ChatEntry[]` 联合类型驱动渲染（用户消息 / 意图说明 / 资产卡组 / 查数摘要 / 追问选项 / 确认选项 / 口径卡），查数摘要持有 `ChatbiResult` 引用实现历史回看。
- **右侧四态**：`RightPanel = empty | chatbi | preview | table` 单一状态。
- **统一详情抽屉**：复用 `Drawer` 组件做壳（外层 scope 类放宽到 940px），内部用 `Tabs` + `Tag` + `DataTable` 复刻 DetailPage 的双层头部 + Tab 矩阵 + 右侧信息栏；安全等级/脱敏逻辑与原型一致。
- **跨模块跳转**：去即席查询 = `location.hash = 'workbench'` + toast 说明携带的上下文；打开原报表 = toast（BI 为外部系统）。
- **回复延迟**：打字动画 700ms，测试用 `findBy*` 等待，不依赖 fake timers。

## 4. 测试策略

- `intent.test.ts`：PRD §8 场景矩阵逐条断言 RouteAction（查数 4+3 类、找资产、映射、确认、降级、明细、定义、预测、兜底、上下文补位）。
- `AIFindDataPage.test.tsx`：渲染欢迎语；发送"昨天 GMV 是多少"出摘要卡；点表卡开表信息页；smoke 级。
- `tsc -b` + `vite build` 通过。

## 5. Documentation Sync

### 2026-07-14

- Changed：新增 `#ai-find` 路由与导航项；重写 `src/features/ai-find`（v1 页面删除）；新增 `src/types/aiFind.ts`、`src/mocks/aiFind.ts`
- Verification：`tsc -b` 通过；`vitest` 全量通过（ai-find 32 条 + 其余模块回归；`.worktrees/frontend-engineering-baseline` 中 6 条失败为陈旧基线副本，与本次无关）；`vite build` 通过
- PRD 无需变更（行为与 V2.1 场景矩阵一致，intent.test.ts 即场景矩阵的可执行版本）

## 6. 风险与取舍

- 图表用轻量 SVG（与原型一致），暂不引入 echarts，避免包体与联调成本；后续真实数据接入时再评估。
- mock 与 v1 的 `mocks/ai.ts`（AI 协议事件流）互不依赖；v1 页面删除，`mocks/ai.ts` 保留给组件边界测试使用。
- 权限、角色策略按 PRD 非目标处理（仅状态示意）。
