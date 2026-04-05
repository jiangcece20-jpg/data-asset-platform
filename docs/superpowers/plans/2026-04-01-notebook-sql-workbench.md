# 即席查询 Notebook 工作台 实施计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现一个 Jupyter 风格的 SQL Notebook 工作台原型，支持 SQL/Markdown/Chart 三种 Cell 类型，左侧双层面板，只读分享。

**Architecture:** 单 HTML 文件（`work/prototype/notebook.html`），内联 CSS + JS，CDN 引入 Monaco Editor / marked.js / ECharts。Mock 数据驱动，localStorage 持久化。与现有 manus.html 视觉风格统一但完全独立。

**Tech Stack:** HTML5, CSS3 (CSS Variables, Flexbox), Vanilla JS (ES6+), Monaco Editor (CDN), marked.js (CDN), ECharts (CDN)

---

## File Structure

- Create: `work/prototype/notebook.html` — 完整的 Notebook 工作台，包含所有样式、结构、逻辑

---

## Chunk 1: 基础骨架与布局

### Task 1: HTML 骨架 + CSS 变量 + 整体布局

**Files:**
- Create: `work/prototype/notebook.html`

- [ ] **Step 1: 创建 HTML 文件骨架**

创建文件，包含：
- DOCTYPE + meta + title
- CDN 引入：Monaco Editor loader、marked.js、ECharts
- CSS 变量体系（复用 manus.html 的 Ant Design 风格配色）
- 整体布局 CSS：Header + 左侧面板(240px) + 主体区域 + 底部状态栏
- HTML 结构占位

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>即席查询 - 数据资产管理平台</title>
    <!-- CDN Dependencies -->
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js"></script>
</head>
```

CSS 变量：
```css
:root {
    --primary: #1677ff;
    --primary-hover: #4096ff;
    --primary-bg: #e6f4ff;
    --success: #52c41a;
    --warning: #faad14;
    --danger: #ff4d4f;
    --text-primary: rgba(0,0,0,0.88);
    --text-secondary: rgba(0,0,0,0.65);
    --text-tertiary: rgba(0,0,0,0.45);
    --border-color: #e8e8e8;
    --bg-layout: #f5f5f5;
    --bg-container: #ffffff;
    --header-bg: #001529;
    --header-height: 48px;
    --sidebar-width: 260px;
    --statusbar-height: 28px;
    --cell-radius: 8px;
    --cell-shadow: 0 1px 4px rgba(0,0,0,0.08);
    --font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
```

整体布局 CSS：
```css
body { margin:0; font-family:var(--font-family); background:var(--bg-layout); }
.app { display:flex; flex-direction:column; height:100vh; }
.header { height:var(--header-height); background:var(--header-bg); display:flex; align-items:center; padding:0 20px; }
.main { display:flex; flex:1; overflow:hidden; }
.sidebar { width:var(--sidebar-width); border-right:1px solid var(--border-color); background:var(--bg-container); display:flex; flex-direction:column; }
.content { flex:1; display:flex; flex-direction:column; overflow:hidden; }
.toolbar { height:48px; border-bottom:1px solid var(--border-color); background:var(--bg-container); display:flex; align-items:center; padding:0 20px; gap:12px; }
.notebook-area { flex:1; overflow-y:auto; padding:24px 40px; }
.statusbar { height:var(--statusbar-height); border-top:1px solid var(--border-color); background:var(--bg-container); display:flex; align-items:center; padding:0 16px; font-size:12px; color:var(--text-tertiary); }
```

HTML 结构：
```html
<div class="app">
    <header class="header"><!-- 导航 --></header>
    <div class="main">
        <aside class="sidebar">
            <div class="sidebar-top"><!-- Notebook 列表 --></div>
            <div class="sidebar-divider"></div>
            <div class="sidebar-bottom"><!-- 表/字段辅助 --></div>
        </aside>
        <div class="content">
            <div class="toolbar"><!-- 工具栏 --></div>
            <div class="notebook-area" id="notebookArea"><!-- Cells --></div>
            <div class="statusbar" id="statusbar"><!-- 状态栏 --></div>
        </div>
    </div>
</div>
```

- [ ] **Step 2: 实现 Header 导航**

深色 Header，左侧 Logo + 平台名，右侧导航菜单项，"即席查询"高亮。

```html
<header class="header">
    <div class="header-logo">数据资产管理平台</div>
    <nav class="header-nav">
        <a href="#" class="nav-item">资产检索</a>
        <a href="#" class="nav-item">资产目录</a>
        <a href="#" class="nav-item">资源发现</a>
        <a href="#" class="nav-item">资源管理</a>
        <a href="#" class="nav-item active">即席查询</a>
        <a href="#" class="nav-item">我的</a>
    </nav>
    <div class="header-user">管理员</div>
</header>
```

- [ ] **Step 3: 实现左侧面板 — Notebook 列表区**

上半部分：标题行（"我的 Notebook" + 新建按钮）、搜索框、Notebook 列表（我的 / 收到的分享两个分组）。

列表项显示：图标 + 标题 + 副信息（Cell 数量 · 时间）。当前打开的高亮。收到的分享显示"只读 · 来自 XXX"。

- [ ] **Step 4: 实现左侧面板 — 表/字段辅助区**

下半部分：标题行（"数据表"）、表列表。点击表名展开字段树（字段名 + 类型标签）。可拖拽分割线分隔上下两部分。

- [ ] **Step 5: 实现工具栏**

Notebook 标题（可编辑 input）、保存按钮、分享按钮、全部运行按钮、更多操作下拉。

- [ ] **Step 6: 实现底部状态栏**

显示：连接状态（绿点 + "已连接"）、最后保存时间、Cell 数量。

- [ ] **Step 7: 浏览器验证并提交**

在浏览器中打开 `notebook.html`，验证：
- 整体布局正确（Header / 左侧面板 / 主体 / 状态栏）
- 左侧面板上下分区正常
- 导航"即席查询"高亮
- 响应式：窗口缩放时布局不崩

```bash
cd "/Users/jiangpangzi/Documents/11、codex/数据资产管理平台"
git add work/prototype/notebook.html
git commit -m "feat(notebook): 基础骨架与整体布局"
```

---

## Chunk 2: Mock 数据 + Notebook 管理

### Task 2: Mock 数据层

**Files:**
- Modify: `work/prototype/notebook.html` — `<script>` 区域

- [ ] **Step 1: 定义 Mock 数据结构**

```javascript
// Notebook 数据
const MOCK_NOTEBOOKS = [
    {
        id: 'nb-1',
        title: '用户行为分析',
        cells: [
            { id: 'cell-1', type: 'markdown', content: '## 用户行为分析\n分析最近30天的用户活跃数据。' },
            { id: 'cell-2', type: 'sql', content: 'SELECT date, COUNT(DISTINCT user_id) AS dau\nFROM user_events\nWHERE event_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)\nGROUP BY date\nORDER BY date;', result: null },
            { id: 'cell-3', type: 'sql', content: 'SELECT channel, COUNT(*) AS user_count\nFROM users\nGROUP BY channel\nORDER BY user_count DESC\nLIMIT 10;', result: null },
        ],
        createdAt: '2026-03-28T10:00:00',
        updatedAt: '2026-04-01T14:30:00',
        owner: 'me'
    },
    {
        id: 'nb-2',
        title: '订单数据探查',
        cells: [
            { id: 'cell-4', type: 'sql', content: 'SELECT * FROM orders LIMIT 100;', result: null },
        ],
        createdAt: '2026-03-25T09:00:00',
        updatedAt: '2026-03-30T16:20:00',
        owner: 'me'
    },
    // ... 更多 Notebook
];

// 收到的分享
const MOCK_SHARED = [
    {
        id: 'nb-shared-1',
        title: '月度GMV分析',
        sharedBy: '王磊',
        cells: [/* ... */],
        sharedAt: '2026-03-25T11:00:00',
        expiresAt: '2026-04-25T11:00:00'
    }
];

// 权限范围内的表
const MOCK_TABLES = [
    {
        id: 'tbl-1', name: 'users', comment: '用户主表',
        fields: [
            { name: 'id', type: 'BIGINT', comment: '用户ID' },
            { name: 'name', type: 'VARCHAR(64)', comment: '用户名' },
            { name: 'email', type: 'VARCHAR(128)', comment: '邮箱' },
            { name: 'channel', type: 'VARCHAR(32)', comment: '注册渠道' },
            { name: 'created_at', type: 'DATETIME', comment: '注册时间' },
        ]
    },
    {
        id: 'tbl-2', name: 'orders', comment: '订单表',
        fields: [
            { name: 'id', type: 'BIGINT', comment: '订单ID' },
            { name: 'user_id', type: 'BIGINT', comment: '用户ID' },
            { name: 'amount', type: 'DECIMAL(10,2)', comment: '订单金额' },
            { name: 'status', type: 'VARCHAR(16)', comment: '订单状态' },
            { name: 'created_at', type: 'DATETIME', comment: '下单时间' },
        ]
    },
    {
        id: 'tbl-3', name: 'user_events', comment: '用户行为事件表',
        fields: [
            { name: 'id', type: 'BIGINT', comment: '事件ID' },
            { name: 'user_id', type: 'BIGINT', comment: '用户ID' },
            { name: 'event_type', type: 'VARCHAR(32)', comment: '事件类型' },
            { name: 'event_date', type: 'DATE', comment: '事件日期' },
            { name: 'properties', type: 'JSON', comment: '事件属性' },
        ]
    },
    {
        id: 'tbl-4', name: 'products', comment: '商品表',
        fields: [
            { name: 'id', type: 'BIGINT', comment: '商品ID' },
            { name: 'name', type: 'VARCHAR(128)', comment: '商品名称' },
            { name: 'category', type: 'VARCHAR(32)', comment: '分类' },
            { name: 'price', type: 'DECIMAL(10,2)', comment: '价格' },
        ]
    }
];

// Mock SQL 执行结果
const MOCK_RESULTS = { /* 按 SQL 内容匹配返回预设结果 */ };
```

- [ ] **Step 2: 提交**

```bash
git add work/prototype/notebook.html
git commit -m "feat(notebook): Mock 数据层"
```

### Task 3: Notebook 管理（新建/打开/保存/删除）+ 列表渲染

**Files:**
- Modify: `work/prototype/notebook.html`

- [ ] **Step 1: 实现状态管理**

```javascript
const state = {
    notebooks: [...MOCK_NOTEBOOKS],
    shared: [...MOCK_SHARED],
    currentNotebookId: null,
    focusedCellId: null,
    lastSavedAt: null,
    autoSaveTimer: null,
};
```

- [ ] **Step 2: 实现 Notebook 列表渲染**

`renderNotebookList()` — 渲染左侧面板上半部分，包含"我的"和"收到的分享"两个分组。当前打开的 Notebook 高亮。支持搜索过滤。

- [ ] **Step 3: 实现新建 Notebook**

`createNotebook()` — 创建新 Notebook，默认标题"未命名 Notebook"，预置一个空 SQL Cell，自动打开并聚焦标题。

- [ ] **Step 4: 实现打开 Notebook**

`openNotebook(id)` — 切换当前 Notebook，渲染所有 Cell 到主体区域，更新工具栏标题。

- [ ] **Step 5: 实现保存（自动保存 + 手动保存）**

- `saveNotebook()` — 保存到 localStorage，更新状态栏时间
- 自动保存：编辑后 3 秒无操作触发
- Ctrl+S 手动保存，toast 提示

- [ ] **Step 6: 实现删除 Notebook**

`deleteNotebook(id)` — 二次确认弹窗，删除后切换到列表中下一个 Notebook 或显示空白态。

- [ ] **Step 7: 实现空白态（欢迎页）**

无 Notebook 时显示欢迎页：图标 + "创建你的第一个 Notebook" 按钮 + 简短功能介绍。

- [ ] **Step 8: 浏览器验证并提交**

验证：新建/打开/删除 Notebook 流程正常，列表渲染正确，搜索过滤工作，空白态显示。

```bash
git add work/prototype/notebook.html
git commit -m "feat(notebook): Notebook 管理与列表渲染"
```

---

## Chunk 3: Cell 管理 + SQL Cell

### Task 4: Cell 基础管理（添加/删除/排序）

**Files:**
- Modify: `work/prototype/notebook.html`

- [ ] **Step 1: 实现 Cell 渲染框架**

`renderCells()` — 遍历当前 Notebook 的 cells 数组，根据 type 分发渲染。每个 Cell 外层统一结构：

```html
<div class="cell" data-cell-id="xxx" data-cell-type="sql|markdown|chart">
    <div class="cell-drag-handle">⠿</div>
    <div class="cell-indicator"></div><!-- 聚焦时蓝色竖条 -->
    <div class="cell-header">
        <span class="cell-type-badge">SQL</span>
        <div class="cell-actions"><!-- 运行/更多 --></div>
    </div>
    <div class="cell-body"><!-- 编辑器/内容 --></div>
    <div class="cell-output"><!-- 结果区 --></div>
</div>
<div class="cell-add-btn" data-after="xxx">+ 添加</div>
```

- [ ] **Step 2: 实现添加 Cell**

Cell 之间的"+ 添加"按钮，hover 显示，点击弹出类型选择（SQL / Markdown / Chart）。在指定位置插入新 Cell。

- [ ] **Step 3: 实现删除 Cell**

更多菜单中的"删除"，直接删除（最后一个 Cell 不可删除）。

- [ ] **Step 4: 实现 Cell 拖拽排序**

原生 HTML5 Drag & Drop API。拖拽手柄触发，拖动时显示插入位置指示线，放下后更新 cells 数组顺序并重新渲染。

- [ ] **Step 5: 实现 Cell 聚焦**

点击 Cell 时设为聚焦状态，左侧显示蓝色竖条。`state.focusedCellId` 跟踪当前聚焦的 Cell。

- [ ] **Step 6: 提交**

```bash
git add work/prototype/notebook.html
git commit -m "feat(notebook): Cell 基础管理（添加/删除/排序/聚焦）"
```

### Task 5: SQL Cell — Monaco Editor + 执行

**Files:**
- Modify: `work/prototype/notebook.html`

- [ ] **Step 1: 初始化 Monaco Editor**

配置 Monaco loader，创建 `createMonacoEditor(container, cellId)` 函数：
- 语言：sql
- 主题：vs（亮色）
- minimap 关闭
- 行号显示
- 自动高度（最小 3 行 ~60px，最大 20 行 ~400px）
- 滚动条样式优化
- 注册表名/字段名自动补全 provider

- [ ] **Step 2: 实现 SQL Cell 渲染**

`renderSQLCell(cell)` — 创建 Cell DOM，初始化 Monaco Editor，绑定内容变更事件（更新 cell.content + 触发自动保存）。

- [ ] **Step 3: 实现 SQL 执行（Mock）**

`executeSQLCell(cellId)`:
- 获取 Cell 内容
- 权限校验：解析 SQL 中的表名，检查是否在 MOCK_TABLES 中
- 无权限：显示红色错误 + "申请权限"链接
- 有权限：显示 loading 状态 → setTimeout 模拟延迟(300-800ms) → 返回 Mock 结果
- 结果存入 cell.result

Mock 结果生成：根据 SQL 中的表名和字段，生成合理的假数据行。

- [ ] **Step 4: 实现结果区渲染**

`renderCellResult(cell)`:
- 成功：绿色 ✓ + 行数 + 耗时 + 结果表格 + 操作按钮（表格/转为图表/导出）
- 失败：红色 ✗ + 错误信息
- 执行中：骨架屏动画

结果表格支持：列宽自适应、横向滚动、斑马纹。

- [ ] **Step 5: 实现快捷键**

- Ctrl+Enter / Cmd+Enter：执行当前聚焦的 SQL Cell
- Shift+Enter：执行当前 Cell 并跳到下一个（没有则新建 SQL Cell）

- [ ] **Step 6: 浏览器验证并提交**

验证：Monaco Editor 正常加载、SQL 高亮、自动补全、执行 Mock 返回结果、结果表格渲染、快捷键工作。

```bash
git add work/prototype/notebook.html
git commit -m "feat(notebook): SQL Cell — Monaco Editor + 执行 + 结果渲染"
```

---

## Chunk 4: Markdown Cell + Chart Cell

### Task 6: Markdown Cell

**Files:**
- Modify: `work/prototype/notebook.html`

- [ ] **Step 1: 实现 Markdown Cell 渲染**

`renderMarkdownCell(cell)`:
- 默认渲染模式：用 `marked.parse()` 渲染 HTML，显示在 `.cell-body` 中
- 双击进入编辑模式：替换为 textarea，内容为原始 Markdown
- 点击外部或 Esc：退出编辑，重新渲染
- 空 Markdown Cell 显示 placeholder "双击编辑 Markdown..."

样式：渲染后的 Markdown 继承平台字体和颜色，h1-h4 有合理的大小层级，代码块有背景色，表格有边框。

- [ ] **Step 2: 浏览器验证并提交**

```bash
git add work/prototype/notebook.html
git commit -m "feat(notebook): Markdown Cell 渲染与编辑"
```

### Task 7: Chart Cell（可视化 Cell）

**Files:**
- Modify: `work/prototype/notebook.html`

- [ ] **Step 1: 实现 Chart Cell 渲染**

`renderChartCell(cell)`:
- cell 数据结构：`{ type:'chart', sourceCell:'cell-id', chartType:'bar', xField:'name', yField:'value', groupField:null }`
- 头部：显示"图表 · 数据来源: Cell #N" + 图表类型下拉 + 设置按钮
- 主体：ECharts 容器（高度 300px）
- 从 sourceCell 的 result 中读取数据，生成 ECharts option

- [ ] **Step 2: 实现图表类型切换**

支持：柱状图(bar)、折线图(line)、饼图(pie)、散点图(scatter)。切换时重新生成 option 并刷新图表。

- [ ] **Step 3: 实现图表设置面板**

点击"设置"弹出小面板：
- X 轴字段（下拉，从 result 列名中选）
- Y 轴字段（下拉）
- 分组字段（可选，下拉）
修改后实时刷新图表。

- [ ] **Step 4: 实现"转为图表"功能**

SQL Cell 结果区的"转为图表"按钮：在当前 Cell 下方插入一个 Chart Cell，自动绑定数据源，默认柱状图，自动选择第一列为 X 轴、第二列为 Y 轴。

- [ ] **Step 5: 实现数据源联动**

sourceCell 重新执行后，关联的 Chart Cell 自动刷新。

- [ ] **Step 6: 浏览器验证并提交**

验证：图表渲染正常、类型切换、设置面板、"转为图表"流程、数据源联动。

```bash
git add work/prototype/notebook.html
git commit -m "feat(notebook): Chart Cell — ECharts 可视化"
```

---

## Chunk 5: 表/字段辅助 + 分享 + 收尾

### Task 8: 左侧表/字段辅助面板

**Files:**
- Modify: `work/prototype/notebook.html`

- [ ] **Step 1: 实现表列表渲染**

`renderTableList()` — 渲染 MOCK_TABLES，每项显示表名 + 注释。点击展开/折叠字段列表。

- [ ] **Step 2: 实现字段树**

展开后显示字段列表：字段名 + 类型标签（小圆角 badge）+ 注释。点击字段名插入到当前聚焦的 SQL Cell 的 Monaco Editor 光标位置。

- [ ] **Step 3: 实现可拖拽分割线**

上下两部分之间的分割线，鼠标拖拽可调整比例，最小高度限制（各 120px）。

- [ ] **Step 4: 提交**

```bash
git add work/prototype/notebook.html
git commit -m "feat(notebook): 表/字段辅助面板"
```

### Task 9: 分享功能

**Files:**
- Modify: `work/prototype/notebook.html`

- [ ] **Step 1: 实现分享弹窗**

点击工具栏"分享"按钮弹出 Modal：
- 生成只读链接（Mock，显示一个假 URL）
- 一键复制按钮
- 有效期选择：7天 / 30天 / 永久（radio）
- 已分享记录列表

- [ ] **Step 2: 实现只读模式**

打开收到的分享 Notebook 时进入只读模式：
- 顶部显示蓝色横幅："只读 · 来自 XXX 的分享"
- 所有 Cell 不可编辑（Monaco Editor readonly，Markdown 不可双击编辑）
- 运行按钮隐藏
- 工具栏只显示"复制到我的 Notebook"按钮

- [ ] **Step 3: 实现"复制到我的 Notebook"**

Fork 一份到自己的 notebooks 列表，标题加"(副本)"后缀，自动打开。

- [ ] **Step 4: 提交**

```bash
git add work/prototype/notebook.html
git commit -m "feat(notebook): 分享功能与只读模式"
```

### Task 10: 全部运行 + 导出 + 最终打磨

**Files:**
- Modify: `work/prototype/notebook.html`

- [ ] **Step 1: 实现"全部运行"**

`runAllCells()`:
- 按顺序执行所有 SQL Cell
- 每个 Cell 执行完后更新 UI
- 某 Cell 失败时弹出确认："Cell #N 执行失败，是否继续？"

- [ ] **Step 2: 实现导出 CSV**

SQL Cell 结果区的"导出"按钮：将结果数据生成 CSV 字符串，触发浏览器下载。

- [ ] **Step 3: 实现工具栏标题编辑**

点击标题变为 input，失焦或回车保存。

- [ ] **Step 4: UI 打磨**

- Cell hover 效果（轻微阴影提升）
- 添加 Cell 按钮的 hover 动画
- 骨架屏加载动画
- Toast 提示组件（保存成功等）
- 空白态欢迎页美化
- 滚动条样式优化
- 过渡动画（Cell 添加/删除时的淡入淡出）

- [ ] **Step 5: 最终浏览器验证**

完整流程验证：
1. 首次进入看到欢迎页
2. 创建 Notebook → 编辑标题
3. 写 SQL → 执行 → 看结果
4. 添加 Markdown Cell → 编辑内容
5. 结果转为图表 → 切换图表类型
6. 左侧点击字段插入到 SQL
7. 全部运行
8. 分享 → 打开分享的 Notebook → 只读模式
9. 复制到我的 → 编辑副本
10. Ctrl+S 保存 → 刷新页面数据不丢失

- [ ] **Step 6: 最终提交**

```bash
git add work/prototype/notebook.html
git commit -m "feat(notebook): 全部运行、导出、UI打磨，完成即席查询Notebook工作台"
```
