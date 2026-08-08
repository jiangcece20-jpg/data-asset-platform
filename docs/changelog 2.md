# Changelog

## 2026-08-08 — V2.6 我的中心 + 卖家中心

### 重大变更：我的中心统一壳 + 卖家中心独立面板

本轮将"我的中心"重构为统一的导航壳，统一 PC（门户）和移动端入口，并将"卖家中心"从独立区域并入我的中心，作为子菜单。

---

### 功能变更详情

#### 1. 我的中心统一壳（MineShell）

**文件：** `src/components/mine/MineShell.vue`

- 新增统一的 `MineShell` 组件，同时服务移动端（`layout=mobile`）和门户 PC（`layout=portal`）两种布局
- 移动端：顶部用户卡 + 横向菜单横滑条（VIP / 我的订单 / 消息中心 / 我的收藏 / 个人信息 / 我的数据 / 卖家中心）+ 内容面板
- 门户端：左侧侧边栏（用户信息卡 + 导航菜单）+ 右侧内容区
- 统一的菜单状态管理，支持 URL query 驱动的深链路由

#### 2. 我的中心 Query 解析与兼容层

**文件：** `src/domain/mineQuery.ts`

- `parseMineQuery` 解析 URL query，提取 `menu / orderTab / dataTab / sellerTab / subject`
- 兼容旧版 query 参数（`tab=data` → `menu=data`，`tab=求上架` → `menu=seller`）
- `mineQueryPatch` 生成 URL patch，保持其他 query 参数不变
- 类型定义：`MineMenu / OrderTab / DataTab / SellerTab / MineSubject`

#### 3. 我的订单 — 个人/企业维度过滤

**文件：** `src/components/mine/OrdersPanel.vue`

- 订单列表新增「个人 / 企业」品类切换 Tab（`subjectFilter: personal | enterprise`）
- query 参数 `subject=personal|enterprise` 控制当前选中的品类
- 企业订单跳转到 `/portal/enterprise` 页面；企业未认证时引导认证
- 订单卡片支持跳转商品详情、发起支付、查看账单

#### 4. 我的数据面板（新增）

**文件：** `src/components/mine/DataPanel.vue`（从 `OrdersPanel` 抽离）

- 我的数据分为两个 Tab：
  - **已购数据**（`purchased`）：买数订单交付的数据集下载链接
  - **产数数据**（`produced`）：用户自己产出的数据集
- query 参数 `dataTab=purchased|produced` 控制当前 Tab
- 已购数据展示：数据集名称、交付时间、文件格式、下载链接
- 产数数据展示：数据集名称、创建时间、数据量、操作按钮

#### 5. 卖家中心独立面板

**文件：** `src/components/mine/SellerPanel.vue` + `src/views/mobile/SellerOrders.vue`

- 卖家中心并入我的中心，作为 `menu=seller` 的子面板
- 四个 Tab：入驻申请 / 新建上架 / 卖家订单 / 我的上架单
- 入驻状态门控（Gate）：未入驻 / 审核中 / 已暂停时展示拦截提示
- **卖家订单（自收款 MVP）**：
  - 列表展示买家名称、订单金额、下单时间、买家留言
  - 待确认到账订单：展示「确认到账」和「未收到」两个操作按钮
  - 状态：待确认到账 / 已确认已发权 / 争议未到账
  - 确认后买家看板权益自动开通；争议进入争议流程
  - 平台不垫资，纯代收代付

#### 6. 门户接入我的中心壳

**文件：**
- `src/layouts/PortalShell.vue` — 左侧边栏路由
- `src/views/portal/PortalDemand.vue` — 数据需求提报表单
- `src/views/portal/PortalDemandForm.vue`（新增独立页）— 数据需求提报独立页面

- 门户左侧边栏接入与我的中心一致的菜单体系
- 数据需求提报支持独立页面路由 `/portal/demand-form`，同时保留弹窗式
- 门户深链 query 参数统一走 `menu/orderTab/dataTab/subject` 规范

#### 7. 审批管理集成页面（新增）

**文件：** `src/views/admin/ApprovalManagement.vue`（新增）

- 数据集采购审批：成员以企业主体申请数据集，管理员审批通过后继续付款
- 企业数据权益分配：管理员将数据集授权给全员或指定成员
- 门户企业中心（`PortalEnterprise.vue`）新增企业采购审批列表 + 我的企业采购视图

---

### 组件清单

| 组件 | 类型 | 说明 |
|---|---|---|
| `MineShell` | 新增 | 统一我的中心壳，mobile + portal 双布局 |
| `OrdersPanel` | 改造 | 我的订单，抽出品类 personal/enterprise 过滤 |
| `DataPanel` | 新增 | 我的数据，已购/产数两 Tab |
| `SellerPanel` | 新增 | 卖家中心四 Tab 面板，替代原独立卖家区域 |
| `SellerOrders` | 新增 | 卖家订单，自收款 MVP |
| `SellerApply` | 复用 | 入驻申请 |
| `SellerListingApply` | 复用 | 新建上架 |
| `SellerListingsPanel` | 复用 | 我的上架单 |
| `PortalDemandForm` | 新增 | 数据需求提报独立页 |
| `ApprovalManagement` | 新增 | 审批管理集成页 |

---

### 路由变更

| 路由 | 变更 |
|---|---|
| `/portal/demand-form` | 新增独立需求提报页 |
| `/portal/enterprise` | 增强：新增企业采购审批 + 我的企业采购 |
| `/app/mine` | 接入 `MineShell` 移动端布局 |
| `/portal/mine` | 接入 `MineShell` 门户布局 |

---

### 遗留与后续

- ⏳ 卖家订单自收款尚未对接真实支付网关（平台代收代付）
- ⏳ 数据集交付的下载链接为 mock 数据，生产需对接对象存储
- ⏳ 企业采购审批流尚未对接飞书/钉钉审批系统
- ⏳ 审批管理独立页（`ApprovalManagement.vue`）待合并 `ApprovalIntegration` 的路由逻辑

## 2026-05-16

- 按需求文档与主 HTML 原型返工资源管理页：补齐工作台待办分类、资源列表审批/批量操作、异常处理模式、目录树节点操作与挂载资源详情。
- 新增资源管理独立业务页：恢复左侧工作台/资源列表/目录管理导航、工作台统计、资源列表工具栏与目录管理面板。
- 返工资源发现页以贴近 HTML 原型：恢复左侧业务目录、资源发现筛选面板、范围/状态/类型分段筛选、紧凑资源卡片列表与收藏动作。
- 返工资产目录页以贴近 HTML 原型：恢复左侧业务线目录、顶部面包屑、负责人筛选、我的表、排序、标签筛选、类型 Tab 与紧凑资产卡片列表。
- 保留 React 数据筛选交互，支持业务目录、关键词、资产类型和我的表过滤。
- 调整资产目录搜索为与资产检索一致的提交式搜索框，并为资产卡片新增收藏/取消收藏按钮。

## 2026-05-15

- 新增 `docs/product/2026-05-15-前端组件库与AI原型对齐及开发部署蓝图.md`。
- 明确本轮采用 1-to-N 迭代流程，聚焦已有 HTML 原型的组件库沉淀、AI 能力接入边界预留、后续开发部署步骤。
- 明确本轮不做 AI 找数 V2 独立页，不修改 `prototype/ai-find-data-v2.html` 页面行为。
- 本轮跳过 AI 找数 PRD、六层架构、现有 HTML 原型更新，原因是产品行为和用户场景未发生变化。

## 2026-05-15

- 返工资产检索页以贴近 HTML 原型：恢复浅色中轴 Hero、发现 Tabs、紧凑发现列表、热门专题、右侧平台概览/专题推荐/AI 助手和原型响应式断点。
- 调整资产检索搜索结果卡片密度，使其更接近原 HTML 的资产卡片列表。

## 2026-05-15

- 新增资源发现完整业务页：统一发现池、业务目录快捷节点、推荐资源、范围/状态/类型筛选、关键词搜索、待维护资源与未归属资源展示。
- 新增资源发现页本地 mock 资源，区分已上架资产与待维护/不上架资源。

## 2026-05-15

- 新增资产目录完整业务页：业务线目录树、目录面包屑、概览统计、关键词筛选、我的表开关、类型 Tab、目录资产列表与空状态。
- 为资源 mock 增加 `catalogPath`，支撑资产目录按业务域和主题域聚合浏览。

## 2026-05-15

- 新增资产检索完整业务页：搜索 Hero、热门词、实时建议、发现面板、结果列表、类型筛选、权限动作与空结果状态。
- 扩展资源 mock 数据字段，支撑资产域、更新日期、热度与质量分展示。

## 2026-05-15

- 新增前端工程基线：Vite + React + TypeScript。
- 新增组件库基线与组件示例页。
- 新增资源、权限、查询、AI 协议 mock service 边界。
- 明确本轮未实现 AI 找数 V2 独立页。
