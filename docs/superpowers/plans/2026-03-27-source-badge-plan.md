# 来源徽标展示 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在资源发现列表和详情页表头中增加来源徽标，并按来源类型区分视觉样式。

**Architecture:** 为 mock 数据补充来源类型与来源系统字段，增加来源徽标文案/样式辅助函数，然后更新资源发现列表与详情页表头渲染逻辑。

**Tech Stack:** HTML、CSS、JavaScript 单文件原型

---

## Chunk 1: 数据与样式

### Task 1: 补充来源字段并增加来源徽标样式

**Files:**
- Modify: `manus.html`

- [ ] **Step 1: 为资源与资产补充来源字段**
- [ ] **Step 2: 增加来源徽标样式**

## Chunk 2: 渲染逻辑

### Task 2: 接入列表与详情页表头展示

**Files:**
- Modify: `manus.html`

- [ ] **Step 1: 增加来源徽标辅助函数**
- [ ] **Step 2: 修改资源发现列表名称区**
- [ ] **Step 3: 修改详情页表头名称区**

## Chunk 3: 验证

### Task 3: 结构和脚本验证

**Files:**
- Modify: `manus.html`

- [ ] **Step 1: 检查来源字段和样式已接入**
- [ ] **Step 2: 检查列表与详情页模板已输出来源徽标**
- [ ] **Step 3: 运行脚本语法校验**
