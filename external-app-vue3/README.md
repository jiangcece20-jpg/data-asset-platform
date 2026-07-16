# 对外APP问数找数买数 · 交互原型（Vue3）

对应设计文档：`docs/product/2026-07-09-对外APP找数买数-六层次蓝图与产品设计.md`、`docs/superpowers/specs/2026-07-11-external-app-data-discovery-commerce-design.md`。

技术栈：Vue 3 + TypeScript + Vite + Vue Router + Pinia + Tailwind CSS。移动端与 PC 运营后台共享同一份 Pinia mock 状态，在后台修改商品、审批、企业权益或线索状态后，切换到"移动端原型"即可立即看到变化，无需刷新页面。

与仓库现有的 React/Vite 内部数据资产平台（`src/`）完全隔离，是独立的原型工程。

## 运行

```bash
cd external-app-vue3
npm install
npm run dev
```

浏览器打开终端提示的地址（默认 http://localhost:5173），页面顶部可切换"移动端原型"（手机壳模拟）与"PC 运营后台"。

## 目录结构

- `src/types/domain.ts` 核心领域模型（四类商品 Product / Entitlement / Order / ListingRequest 等）
- `src/data/products.ts` 四类商品唯一种子数据（数据集 / API / 行业报告 / 自有看板）
- `src/domain/productAccess.ts` 商品主动作纯函数决策层
- `src/stores/` Pinia store：catalog / user / entitlements / orders / trials / demand / approval / ai / listingRequests
- `src/components/mobile/product-detail/` 类型化详情组件（ProductDetailTabs / ProductSummaryCard / ProductPrimaryAction / ContentGate / DatasetDetail / ApiDetail / ReportDetail / DashboardDetail）
- `src/views/mobile/` 移动端页面（找数首页、问答案、找数据、商品详情、企业认证、APP/空间购买、需求提交、求上架、我的等）
- `src/views/admin/` PC 运营后台七个业务域页面
- `src/layouts/` 手机壳（PhoneShell）与后台侧边栏（AdminShell）

## 四类商品与交易规则

| 类型 | 获取方式 | 试用 | 权益 |
|------|---------|------|------|
| 数据集 | 仅可信空间购买 | 不提供 | 空间订单交付 |
| API | 仅可信空间购买 | 固定脱敏沙箱 | 空间订单交付 |
| 行业报告 | 免费 / 会员 / 单品 | — | 单品永久绑定购买时版本 |
| 自有看板 | 免费 / 会员 / 单品 | — | 单品默认有效 12 个月 |

候选资产可被搜索但不展示样例值、价格或试用入口，支持求上架闭环。

## 六条演示链路

1. `/#/app/product/prod-enterprise-activity`：已上架数据集四 Tab → 企业认证 → 可信空间购买
2. `/#/app/product/prod-driver-credit-candidate`：候选数据集 → 求上架 → 我的进度 → PC 推进
3. `/#/app/product/prod-qualification-api`：接口文档 → 固定脱敏在线调试 → 可信空间购买
4. `/#/app/product/prod-logistics-monthly`：报告打码 → 开会员或单品购买 → 当前版本解锁
5. `/#/app/product/prod-freight-index`：看板打码 → 单品购买 → 12 个月权益
6. `/#/app/product/prod-port-dashboard-free`：免费完整看板

## 说明

原型不接真实支付、AI、可信空间或资产平台，所有状态均为内存 mock，刷新页面会重置。

`preview` 为旧构建产物、`dist` 为本地验证产物，两者都不是源文件。

## 逆向流程演示场景

### 场景 1：商业调整暂停 `prod-logistics-monthly`

- **操作**：PC 运营后台 → 商品中心 → 物流行业月报 → 点击「暂停销售」→ 选择「商业调整」→ 填写原因和负责人 → 预览影响 → 确认执行
- **预期结果**：
  - 移动端搜索和发现页不再展示该商品的新购入口
  - 历史 `mem-1` 用户的 `ent-history-001` 权益不受影响，可继续查看
  - 创建一个 S3 级别逆向工单（因为 `mem-1` 有客户影响）
  - 推荐位和「热门」标签被自动移除

### 场景 2：合规风险召回 `prod-logistics-monthly`

- **操作**：PC 运营后台 → 商品中心 → 物流行业月报 → 点击「召回」→ 选择「合规风险」→ 填写原因和负责人 → 预览影响 → 确认执行
- **预期结果**：
  - 商品服务状态变为 `suspended`，可用性变为 `paused`
  - `ent-history-001` 权益被冻结（`frozen`）
  - 移动端商品详情页显示「服务风险处置中」通知，阻止历史访问
  - 创建一个 S1 级别逆向工单
  - 逆向工单需经过完整生命周期：受理 → 影响分析 → 方案确认 → 执行 → 客户处置 → 跨系统核验 → 关闭

### 场景 3：商业调整暂停 `prod-port-dashboard-free`

- **操作**：PC 运营后台 → 商品中心 → 港口看板（免费）→ 点击「暂停销售」→ 选择「商业调整」→ 填写原因和负责人 → 预览影响 → 确认执行
- **预期结果**：
  - 商品停止接受新获取（免费查看入口消失）
  - 无客户影响（该商品为免费商品，无在途订单或权益）
  - 不创建逆向工单，但记录审计条目
  - 移动端商品详情页显示「已暂停新购」通知
