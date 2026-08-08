# 我的中心壳重构（买数 / 我购买的数据 / 卖家中心）设计

- 日期：2026-08-08
- 分支：`bugfix/search-find-buy`（已合入 `main`）
- 范围：`external-app-vue3`（移动端 `/app/mine`、门户 `/portal/mine`）
- 状态：已落地并部署 Cloudflare；产品口径已回写功能说明 PRD V2.6

## 背景

对外找数买数原型中，「我的」页已有「我的订单 / 我的数据」双 Tab，但与统一产品「我的」壳不一致：

- 缺少与截图对齐的一级入口区（成为 VIP、我的订单、消息中心等）
- 「我的订单」无 VIP / 买数 / 看数 品类 Tab
- 「我的数据」无「我购买的数据 / 我生产的数据」子 Tab
- 卖家中心原为 APP 独立枢纽大卡片页，且 PC 遗漏
- 买数订单与已购权益能力已存在，主要是信息架构重组

## 目标

1. 落地统一「我的」壳：一级入口与「我的订单 / 我的数据 / 卖家中心」同级
2. 我方主责内容落入：
   - **我的订单 → 买数**
   - **我的数据 → 我购买的数据**（含数据集 + 个人报告上架入口）
   - **卖家中心 → 功能菜单**（入驻申请 / 新建上架 / 卖家订单 / 我的上架单）
3. 非主责模块仅做入口壳 + Tab 切换 + 占位文案
4. 移动端对齐产品截图；PC 采用左栏一级导航 + 右栏内容（含卖家）

## 非目标

- 不实现 VIP / 看数 / 我生产的数据 / 消息中心 / 我的收藏 / 个人信息 / 成为 VIP 的真实业务
- 不改找数、下单、支付主链路（仅调整成功/入口回跳目标）
- 不拆独立子路由（仍用现有 `/app/mine`、`/portal/mine` + query）
- 不改内部 React 治理平台「我的」
- 不把报告成品改为本期上架 SKU（上架对象仍为用数可上架对象）

## 信息架构

```
我的
├─ 一级入口
│   ├─ 成为 VIP（占位）
│   ├─ 我的订单
│   ├─ 消息中心（占位）
│   ├─ 我的收藏（占位）
│   ├─ 个人信息（占位）
│   ├─ 我的数据
│   └─ 卖家中心
├─ 我的订单
│   ├─ VIP（占位）
│   ├─ 买数（真内容）
│   └─ 看数（占位）
├─ 我的数据
│   ├─ 我购买的数据（真内容：数据集 + 个人报告「上架」）
│   └─ 我生产的数据（占位）
└─ 卖家中心
    ├─ 入驻申请
    ├─ 新建上架
    ├─ 卖家订单
    └─ 我的上架单
```

### 默认入口

- **原型默认**：`menu=orders&orderTab=buy`（我的订单 → 买数）
- **文档备注**：按整体产品规划，正式默认入口可能调整（例如 VIP）。本原型按买数主场景处理。

## 路由与兼容

| 含义 | Query |
|------|--------|
| 我的订单 · 买数（默认） | `?menu=orders&orderTab=buy` |
| 我的订单 · VIP | `?menu=orders&orderTab=vip` |
| 我的订单 · 看数 | `?menu=orders&orderTab=view` |
| 我的数据 · 我购买的数据 | `?menu=data&dataTab=purchased` |
| 我的数据 · 我生产的数据 | `?menu=data&dataTab=produced` |
| 卖家中心 · 我的上架单（默认） | `?menu=seller&sellerTab=listings` |
| 卖家中心 · 新建上架 | `?menu=seller&sellerTab=listing`（可带 `productId`） |
| 卖家中心 · 入驻申请 / 卖家订单 | `?menu=seller&sellerTab=apply\|orders` |
| 占位一级入口 | `?menu=vip\|messages\|favorites\|profile`（仅展示占位内容） |

兼容映射：

- `tab=orders` → `menu=orders`（`orderTab` 缺省为 `buy`）
- `tab=data` / `tab=我的数据` → `menu=data&dataTab=purchased`
- `tab=求上架` → `menu=seller`
- 旧 `/app/seller` 引导至 `menu=seller`

深链约定：

- 支付成功、「查看我的数据」→ `menu=data&dataTab=purchased`
- 需要看买数履约状态 → `menu=orders&orderTab=buy`
- 个人报告「上架」→ `menu=seller&sellerTab=listing&productId=...`

## 布局

### 移动端

1. 顶部用户头区
2. 一级入口横滑（含卖家中心）
3. 选中订单/数据/卖家后展示对应二级 Tab
4. 内容区：真内容或统一占位

### PC

1. 左栏：用户卡 + 一级入口列表（含卖家中心）
2. 右栏顶：二级 Tab
3. 右栏主体：筛选 + 列表，或占位文案

## 组件结构

```
MineShell
├─ OrdersPanel → BuyDataOrders / PlaceholderPanel
├─ DataPanel → PurchasedData / PlaceholderPanel
└─ SellerPanel → SellerApply / SellerListingApply / SellerOrders / SellerListingsPanel
```

## 真内容规格（增量）

### 我购买的数据

- 数据集：沿用 `visibleDatasetEntitlements` 与交付展示
- 个人报告：展示个人 `item` + catalog `report`；「上架」跳转卖家新建上架单

### 卖家中心

- 功能菜单拆分，不做枢纽大卡片
- 未准入时闸门提示去入驻申请

## 验收标准

1. 移动/PC 一级入口含卖家中心；无橙色独立入口条
2. 卖家二级功能可独立切换
3. 个人报告可见「上架」并落到新建上架单
4. 其余买数/已购数据集验收保持不变

## 决策记录

| 决策 | 选择 | 说明 |
|------|------|------|
| 卖家入口 | 「我的」一级 | 非独立 APP 枢纽页 |
| 卖家布局 | 功能菜单 | 非大卡片 hub |
| PC 卖家 | 本期同步 | 不再标后续增强 |
| 报告上架按钮 | 发起入口 | SKU 边界仍按规划仅看板 |
