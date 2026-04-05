# 搜索下拉建议层 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为资产检索页搜索框增加实时下拉命中建议、键盘导航和操作提示栏。

**Architecture:** 在现有单文件原型中扩展搜索框 DOM、样式和前端状态，增加建议候选构建逻辑与键盘交互，同时复用既有详情跳转和全文搜索能力。

**Tech Stack:** 原生 HTML、CSS、JavaScript 单文件原型

---

## Chunk 1: 结构与样式

### Task 1: 新增搜索建议层 DOM 和样式

**Files:**
- Modify: `manus.html`

- [ ] **Step 1: 在搜索框下方增加建议层容器**
- [ ] **Step 2: 新增候选项、命中提示和底部快捷操作栏样式**

## Chunk 2: 交互逻辑

### Task 2: 增加候选数据和输入交互

**Files:**
- Modify: `manus.html`

- [ ] **Step 1: 扩展 mock 数据，补充中文展示名或别名**
- [ ] **Step 2: 实现输入时的候选匹配与渲染**
- [ ] **Step 3: 实现上下键切换、Enter 打开、Esc 收起、点击外部关闭**

## Chunk 3: 验证

### Task 3: 验证关键结构已接入

**Files:**
- Modify: `manus.html`

- [ ] **Step 1: 确认搜索输入框已绑定实时输入逻辑**
- [ ] **Step 2: 确认建议层和快捷操作提示已存在**
- [ ] **Step 3: 确认候选跳转逻辑已接入资产和资源详情**
