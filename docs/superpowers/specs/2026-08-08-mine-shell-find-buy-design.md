# 我的中心壳重构（买数 / 我购买的数据）设计

- 日期：2026-08-08
- 分支：`bugfix/search-find-buy`
- 范围：`external-app-vue3`（移动端 `/app/mine`、门户 `/portal/mine`）
- 状态：已落地（Task 1–9 完成，全量回归通过）

## 背景

对外找数买数原型中，「我的」页已有「我的订单 / 我的数据」双 Tab，但与统一产品「我的」壳不一致：

- 缺少与截图对齐的一级入口区（成为 VIP、我的订单、消息中心等）
- 「我的订单」无 VIP / 买数 / 看数 品类 Tab
- 「我的数据」无「我购买的数据 / 我生产的数据」子 Tab
- 买数订单与已购权益能力已存在，主要是信息架构重组

## 目标

1. 落地统一「我的」壳：一级入口与「我的订单 / 我的数据」同级
2. 我方主责内容落入：
   - **我的订单 → 买数**
   - **我的数据 → 我购买的数据**
3. 非主责模块仅做入口壳 + Tab 切换 + 占位文案
4. 移动端对齐产品截图；PC 采用左栏一级导航 + 右栏内容

## 非目标

- 不实现 VIP / 看数 / 我生产的数据 / 消息中心 / 我的收藏 / 个人信息 / 成为 VIP 的真实业务
- 不改找数、下单、支付主链路（仅调整成功/入口回跳目标）
- 不拆独立子路由（仍用现有 `/app/mine`、`/portal/mine` + query）
- 不改内部 React 治理平台「我的」

## 信息架构

```
我的
├─ 一级入口
│   ├─ 成为 VIP（占位）
│   ├─ 我的订单
│   ├─ 消息中心（占位）
│   ├─ 我的收藏（占位）
│   ├─ 个人信息（占位）
│   └─ 我的数据（与「我的订单」同级）
├─ 我的订单
│   ├─ VIP（占位）
│   ├─ 买数（真内容）
│   └─ 看数（占位）
└─ 我的数据
    ├─ 我购买的数据（真内容）
    └─ 我生产的数据（占位）
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
| 占位一级入口 | `?menu=vip\|messages\|favorites\|profile`（仅展示占位内容） |

兼容映射：

- `tab=orders` → `menu=orders`（`orderTab` 缺省为 `buy`）
- `tab=data` / `tab=我的数据` → `menu=data&dataTab=purchased`

深链约定：

- 支付成功、「查看我的数据」→ `menu=data&dataTab=purchased`
- 需要看买数履约状态 → `menu=orders&orderTab=buy`

## 布局

### 移动端

对齐产品截图：

1. 顶部用户头区（头像、昵称、手机号、会员徽章）
2. 一级入口图标宫格（含「我的数据」）
3. 选中「我的订单 / 我的数据」后展示对应二级 Tab
4. 内容区：真内容或统一占位

### PC（已选方案 A）

1. 左栏：用户卡 + 一级入口列表（我的订单、我的数据、其它占位入口）
2. 右栏顶：二级 Tab（订单：VIP|买数|看数；数据：我购买的|我生产的）
3. 右栏主体：筛选 + 列表，或占位文案

## 组件结构（方案 3）

```
MineShell（共享壳：头区 + 一级入口 + 内容槽 + query 同步）
├─ OrdersPanel
│   ├─ 二级 Tab：VIP | 买数 | 看数
│   ├─ BuyDataOrders（真内容）
│   └─ PlaceholderPanel
└─ DataPanel
    ├─ 二级 Tab：我购买的数据 | 我生产的数据
    ├─ PurchasedData（真内容）
    └─ PlaceholderPanel
```

页面组装：

- `Mine.vue` = PhoneShell + MineShell（移动布局变体）
- `PortalMine.vue` = PortalShell + MineShell（PC 左栏变体）

业务逻辑下沉到 `BuyDataOrders` / `PurchasedData`；壳只负责菜单切换与 URL 同步。

## 真内容规格

### 买数（BuyDataOrders）

- 数据源：沿用现有 `orders` + `spaceOrders` 投影（`domain/myCenter`）
- 过滤：仅买数相关订单（`productType === 'dataset'`，含空间侧 dataset 镜像）
- 交互：沿用现有状态筛（全部/待付款/处理中/已完成/已关闭）、主体、渠道等能力
- 不再在买数 Tab 内提供「商品类型」切到报告/看板等（那些归「看数」占位范围）

### 我购买的数据（PurchasedData）

- 数据源：沿用现有 `visibleDatasetEntitlements` 与交付展示
- 能力：交付状态、版本、到期/续订、BI/下载等保持现状迁入

### 占位（PlaceholderPanel）

统一文案：「该模块由其它产品负责」

## 验收标准

1. 移动端呈现统一「我的」壳：用户头区 + 一级入口（含我的订单 / 我的数据）
2. PC 为左栏一级 + 右栏内容
3. 默认进入「我的订单 → 买数」，且保留现有状态/主体/渠道等筛选
4. 「我的数据 → 我购买的数据」展示现有已购数据集权益/交付
5. VIP / 看数 / 我生产的数据 / 成为 VIP / 消息中心 / 我的收藏 / 个人信息：可切换，内容为统一占位
6. 旧 query（`tab=orders|data|我的数据`）映射正确
7. 支付成功 / 「查看我的数据」深链落到「我购买的数据」

## 测试关注点

- 更新/扩展 `TrustedSpaceViews.test.ts`、`DatasetAccountViews.test.ts` 等对顶层 Tab 与默认入口的断言
- 覆盖新旧 query 兼容与深链回跳
- 买数列表仅含 dataset 类订单；会员单不混入买数 Tab

## 决策记录

| 决策 | 选择 | 说明 |
|------|------|------|
| 范围 | 整页统一壳 | 非仅改内部 Tab |
| 非主责模块 | 壳 + 占位 | 不填真实业务 |
| 买数列表 | 沿用现有筛选 | 收口到买数 Tab |
| 默认入口 | 原型买数 | 文档标注正式规划可能改为 VIP 等 |
| 实现结构 | 共享 MineShell | 移动/PC 同构，内容插槽 |
| PC 布局 | 左栏一级 + 右栏内容 | 对照方案 A |
| 路由 | query 嵌套 | 不拆新 path |
