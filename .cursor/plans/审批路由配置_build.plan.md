# 审批路由配置 - 执行计划

> Plan ID: `approval-route-rebuild` | 关联 SDD：审批路由配置-SDD.md
> 分支：frontend-engineering-baseline

---

## Phase 1：数据层改造

### Task 1.1：扩展 WorkOrderType 类型与 mock 数据

**验收标准 (AC)：**
- [ ] `WorkOrderType` 类型新增 `applicableConditions: ConditionField[]` 和 `bindingFlowCode: string` 字段
- [ ] mock 数据中所有 6 种工单类型已填充这两个字段，映射关系与 SDD 一致
- [ ] `ApprovalRouteRule` 类型移除 `flow` 字段，新增 `objectTypes: string[]`、`securityLevels: string[]` 字段
- [ ] `buildConditionSummary()` 函数根据新字段动态生成汇总描述

**文件：**
- `src/features/permission-management/PermissionManagementPage.tsx`（类型定义区 + mock 数据）
- `src/types/permissions.ts`（如有独立类型文件则更新）

---

### Task 1.2：扩展 FeishuApprovalFlow 与 NodeApprovalScheme mock

**验收标准 (AC)：**
- [ ] 飞书流程 mock 数据包含 4 种流程（资源治理 / 权限申请 / 负责人交接 / 血缘修正）
- [ ] 节点审批方案 mock 数据每个流程至少包含 2 个方案
- [ ] 路由规则列表 mock 数据与新字段结构对齐

**文件：**
- `src/features/permission-management/PermissionManagementPage.tsx`（mock 数据区）

---

## Phase 2：通用组件

### Task 2.1：ConditionFieldCheckbox 组件

**验收标准 (AC)：**
- [ ] 渲染 Checkbox 列表，选项横向排列，单独一行
- [ ] 选中状态显示打勾图标，未选中显示空心边框
- [ ] 支持"全选" / "清空" 快捷操作
- [ ] 传入 `label`、`options`、`value`、`onChange` 四个 props 即可工作
- [ ] 单元测试：渲染正常、全选/清空行为正确、onChange 回调参数正确

**文件：**
- `src/components/forms/ConditionFieldCheckbox.tsx`
- `src/components/forms/ConditionFieldCheckbox.test.tsx`

---

## Phase 3：表单组件

### Task 3.1：WorkOrderTypeSelect 组件

**验收标准 (AC)：**
- [ ] 下拉选择工单类型，选中后展示自动带出的飞书流程名称（只读，灰色文字）
- [ ] 同时触发节点方案下拉框数据刷新（通过 `onFlowCodeChange` 回调）

**文件：**
- `src/features/permission-management/WorkOrderTypeSelect.tsx`

---

### Task 3.2：RouteRuleDrawer 组件

**验收标准 (AC)：**
- [ ] 支持新建和编辑两种模式，通过 `initialData?: Partial<ApprovalRouteRule>` 区分
- [ ] 工单类型选择后自动带出飞书流程（只读展示）
- [ ] 节点方案下拉框根据当前飞书流程动态过滤
- [ ] 条件字段（对象类型、安全等级）根据工单类型的 `applicableConditions` 动态渲染
- [ ] 安全等级仅在工单类型声明了 `securityLevels` 条件时显示
- [ ] 保存时输出完整 `ApprovalRouteRule` 结构（包含自动推导的 flow）
- [ ] 表单校验：规则名称、工单类型、节点方案、优先级必填

**文件：**
- `src/features/permission-management/RouteRuleDrawer.tsx`

---

## Phase 4：页面集成

### Task 4.1：路由规则 Tab 集成 RouteRuleDrawer

**验收标准 (AC)：**
- [ ] 点击"新建路由规则"按钮，打开 `RouteRuleDrawer`（新建模式）
- [ ] 表格行"编辑"按钮打开 `RouteRuleDrawer`（编辑模式，传入当前行数据）
- [ ] 表格行"复制"按钮打开 `RouteRuleDrawer`（新建模式，预填复制数据）
- [ ] 表格"命中条件"列 hover 显示完整条件详情浮层
- [ ] 删除按钮带二次确认
- [ ] 列表刷新（Mock 层面即可，保存后更新本地 state）

---

## Phase 5：回归与收尾

### Task 5.1：回归检查

**回归检查清单：**
- [ ] 工单查询 Tab：工单类型字段仍正常展示
- [ ] 待我审批 Tab：审批动作按钮正常
- [ ] 飞书流程 Tab：流程列表和状态正常
- [ ] 审批角色 Tab：角色列表正常
- [ ] 节点方案 Tab：方案列表正常
- [ ] 同步健康 Tab：健康状态正常
- [ ] 审批记录 Tab：记录列表正常
- [ ] 页面整体无控制台 Error

### Task 5.2：文档同步

- [ ] 更新 `docs/changelog.md`，记录本次迭代内容

---

## 任务依赖关系

```
Phase 1（数据层）
  └── Task 2.1（ConditionFieldCheckbox）← 依赖 Phase 1
        └── Task 3.1（WorkOrderTypeSelect）← 依赖 Task 2.1
              └── Task 3.2（RouteRuleDrawer）← 依赖 Task 3.1
                    └── Task 4.1（页面集成）← 依赖 Task 3.2
                          └── Task 5.1（回归检查）
                                └── Task 5.2（文档同步）
```

> Phase 2（Task 1.2）可与 Task 1.1 并行执行。
