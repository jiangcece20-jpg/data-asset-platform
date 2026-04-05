# 一级菜单浮层 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为原型的 header 新增一级菜单入口按钮和顶部浮层导航，并支持从浮层跳转到现有模块页面。

**Architecture:** 在现有单文件 HTML 原型中增加菜单入口、浮层样式、浮层内容容器和一组菜单元数据，通过少量新增函数驱动菜单渲染、切换和跳转，尽量复用现有页面切换逻辑与通知机制。

**Tech Stack:** 原生 HTML、CSS、JavaScript 单文件原型

---

## Chunk 1: 文档与结构确认

### Task 1: 记录需求和改动边界

**Files:**
- Create: `docs/superpowers/specs/2026-03-26-platform-menu-overlay-design.md`
- Create: `docs/superpowers/plans/2026-03-26-platform-menu-overlay.md`

- [ ] **Step 1: 写明目标与交互**

记录入口按钮位置、浮层布局、左右分栏内容与点击跳转规则。

- [ ] **Step 2: 约束实现方式**

约束为单文件原型内实现，尽量复用现有跳转函数和通知机制。

## Chunk 2: 原型实现

### Task 2: 新增 header 入口和浮层样式

**Files:**
- Modify: `manus.html`

- [ ] **Step 1: 在 header 左侧增加一级菜单入口按钮**
- [ ] **Step 2: 新增顶部浮层、左侧菜单区和右侧说明区结构**
- [ ] **Step 3: 新增与现有深色 header 兼容的浮层样式**

### Task 3: 接入菜单数据与交互

**Files:**
- Modify: `manus.html`

- [ ] **Step 1: 定义一级菜单配置数据**
- [ ] **Step 2: 实现浮层打开、关闭、菜单切换和跳转函数**
- [ ] **Step 3: 接入点击遮罩关闭和 Esc 关闭行为**

## Chunk 3: 验证

### Task 4: 验证结构和关键行为已接入

**Files:**
- Modify: `manus.html`

- [ ] **Step 1: 检查 header 中已出现入口按钮 DOM**
- [ ] **Step 2: 检查浮层 DOM、菜单配置和交互函数已写入**
- [ ] **Step 3: 将修改后的文件复制回原型源文件路径**
