# 对外APP问数找数买数 · 交互原型（Vue3）

对应设计文档：`docs/product/2026-07-09-对外APP找数买数-六层次蓝图与产品设计.md`、`docs/superpowers/specs/2026-07-11-external-app-data-discovery-commerce-design.md`、`docs/superpowers/specs/2026-07-31-asset-platform-dataset-commerce-bi-delivery-design.md`。

技术栈：Vue 3 + TypeScript + Vite + Vue Router + Pinia + Tailwind CSS。移动端与 PC 运营后台共享同一份 Pinia mock 状态，在后台修改商品、审批、企业权益或线索状态后，切换到"移动端原型"即可立即看到变化，无需刷新页面。

与仓库现有的 React/Vite 内部数据资产平台（`src/`）完全隔离，是独立的原型工程。

## 运行

```bash
cd external-app-vue3
npm install
npm run dev
```

浏览器打开终端提示的地址（默认 http://localhost:5180），页面顶部应显示「找数买数原型」和橙色「找」字；若看到「数据资产管理平台」或 ChatBI 权限中心，说明端口被其它工程占用，请换端口或先停掉冲突服务。

## 目录结构

- `src/types/domain.ts` 核心领域模型（四类商品 Product / Entitlement / Order / ListingRequest 等）
- `src/data/products.ts` 四类商品唯一种子数据（数据集 / API / 行业报告 / 自有看板）
- `src/domain/productAccess.ts` 商品主动作纯函数决策层
- `src/stores/` Pinia store：catalog / user / entitlements / orders / trials / demand / approval / ai / listingRequests
- `src/components/mobile/product-detail/` 类型化详情组件（ProductDetailTabs / ProductSummaryCard / ProductPrimaryAction / ContentGate / DatasetDetail / ApiDetail / ReportDetail / DashboardDetail）
- `src/views/mobile/` 移动端页面（找数首页、问答案、找数据、商品详情、企业认证、空间意向单、需求提交、求上架、我的等）
- `src/views/admin/` PC 运营后台七个业务域页面
- `src/layouts/` 手机壳（PhoneShell）与后台侧边栏（AdminShell）

## 四类商品与交易规则

| 类型 | 获取方式 | 试用 | 权益 |
|------|---------|------|------|
| 资产平台数据集 | APP 内个人/企业单品购买 | 不提供 | 订单锁定商品固定购买周期；支付后交付到 BI 托管数据集 |
| 空间数据集 | APP 提交意向单，运营确认到账后转买数订单 | 有无样例标签（未登录可看样例） | 到账后履约中；数据接到本平台才进「我的数据」 |
| API | APP 提交意向单，运营确认到账后转买数订单 | 有无试用接口标签（本平台不真调） | 到账后履约中；空间开通调用后已完成，仍在空间使用 |
| 行业报告 | 免费 / 会员 / 个人或企业单品 | — | 固定购买周期内按商品约定获得版本；已获版本继续保留阅读权 |
| 自有看板 | 免费 / 会员 / 个人或企业单品 | — | 固定购买周期内按商品约定刷新；周期结束后保留最近有效版本 |

运营将资源变为可售商品：打开 `/#/admin/resources` → 编辑 → 保存草稿 → 上架。列表不再提供「包装为商品」弹窗；停新购与下架也在同一编辑页完成，不经过审核按钮，也不创建逆向工单。

资产平台未完成商品包装的候选资产仅在运营后台可见，前台不作为商品曝光；搜索无结果仍可进入需求提报/求供给闭环。一期保持“一个商品绑定一个资源”，不设计商品包。

## 核心演示链路

1. `/#/app/product/prod-truck-trajectory`：资产平台数据集 → 个人/企业主体切换 → 确认单品价与固定购买周期 → APP 下单支付 → BI 交付 → “我的数据”
2. `/#/app/mine/enterprise`：管理员设置企业采购策略；普通成员提交采购申请、查看进度，审批通过后用企业余额支付
3. `/#/app/product/prod-enterprise-activity`：空间数据集 → 空间名称「万联易达可信空间」、数据集有无样例 → 主按钮「提交意向单」
4. `/#/app/product/prod-qualification-api`：接口文档 → 样例出入参、API 有无试用接口 → 提交意向单
5. `/#/app/product/prod-logistics-monthly`：报告打码 → 个人/企业单品购买 → 固定购买周期内版本权益
6. `/#/app/product/prod-freight-index`：看板打码 → 单品购买 → 固定购买周期权益
7. `/#/app/product/prod-port-dashboard-free`：免费完整看板
8. `/#/admin/approval/integration`：可信空间集成治理 + 资产平台资源变更监控任务（一期占位与 mock 告警）

## 空间商品意向单演示

可直接访问以下路径（Hash 路由）：

1. `/#/app/product/prod-qualification-api`：资格核验 API。主按钮「提交意向单」；登录用户（含个人）可提交。未登录先登录，可先看样例出入参和 API 有无试用接口。不要走跳空间购买。
2. `/#/admin/space-intents`：运营领取意向单。确认企业、确认方案、线下试用都在线下完成，系统不增加这些节点。系统里「确认到账」后转为买数订单；「去空间处理」只用于协调履约。数据集接入后进「我的数据」；API 开通后订单完成并给使用说明。
3. `/#/app/product/prod-enterprise-activity`：空间数据集。展示空间名称「万联易达可信空间」和数据集有无样例；APP 不展示自有/互联。提交意向单后先不付款。
4. `/#/app/mine?tab=orders`：未到账只在「意向单」（已提交、处理中、已关闭）；到账后只在「买数」。APP 自营报告企业订单可直接打开 `/#/app/mine?tab=orders&subject=enterprise`。
5. `/#/app/mine/enterprise/bills`：查看 API 用量账单（API 仍在空间使用后的账单查阅）。
6. `/#/admin/products`：点击「同步空间商品」，观察目录快照和同步状态；运营可按自有/互联筛选。
7. `/#/admin/approval/integration`：查看空间事件版本、死信、镜像状态与主动对账入口。

### Mock 场景与角色

- 状态保存在内存 mock 中；浏览器刷新会恢复种子数据。页面顶部可在「移动端原型」和「PC 运营后台」之间切换，二者共享当前内存状态。
- 默认个人是陈静（`mem-1`）；完成企业认证后她是万联供应链管理有限公司的**管理员**，可查看全部企业空间订单、企业账单总额和完整账单下载。
- 种子成员王涛（`mem-2`）是**普通成员**。完成企业认证后，可在企业中心顶部用“原型身份”开关切换管理员/普通成员：成员只能查看企业策略和成员列表，不能配置策略、分配席位或邀请成员；可查看本人提交的企业采购并在审批通过后继续企业余额支付。成员只能看到本人经办的空间订单与本人账单范围，页面不显示企业总额。
- APP 自营报告（例如 `/#/app/checkout/item/prod-logistics-monthly`）在结算页可选择**个人/企业购买主体**：个人产生个人 APP 订单与个人权益；认证企业产生企业 APP 订单与企业权益。该选择不适用于空间数据集/API（走意向单）。

浏览器烟测已确认：390×844 和 1440×900 页面均无横向溢出；资产平台数据集个人购买及企业“成员申请 → 管理员审批 → 企业余额支付 → BI 交付”、空间商品提交意向单与运营代办、订单/账单以及后台资源/订单/集成治理均已实测。快照过期和真实空间回调仍由 Vitest/mock 覆盖。

### 权威边界

本平台是用户成交主体（合同、收款）。提交意向单不付款。确认企业、确认方案、线下试用为线下流程，系统不增加节点。运营确认到账后转为买数订单。数据集接到本平台用数；API 仍在空间使用。自有空间名称「万联易达可信空间」。APP 不展示自有/互联。

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

## 需求回流演示场景

### 场景 A：相似需求聚合 → 发布 → 逐户回告

- **操作**：PC 后台 → 审批与集成 → 需求供给 → 「待聚合需求」中把 4 条港口吞吐量相似需求（跨搜索无结果／求上架／试用反馈来源）聚合为一个供给任务 → 进入规划 → 进入加工 → 填写商品 ID → 「发布并回告」
- **预期结果**：
  - 每条仍在订阅的原始需求各生成一条独立回告（`pending`）
  - 送达回告后可记录 `已购买` / `已放弃` 等结果，且不改写原需求记录
  - 移动端「我的－试用与需求」中，客户只看到自己的需求与已送达回告

### 场景 B：单条撤回不影响共享任务 + 终态重开

- **操作**：在供给任务详情中对某条需求点「撤回」；再对一条「暂不支持」的需求点「重开」
- **预期结果**：
  - 共享任务与其他客户的需求、回告不受影响（`close_subscription_only`）；若是任务中唯一需求则任务释放为已取消
  - 重开生成一条新需求，携带 `reopenedFromId` 与原结论，原终态记录不被修改

## 交易售后演示场景

### 场景 C：客户退款（先冻结 → 执行 → 成功后撤销）

- **操作**：后台 → 审批与集成 → 交易售后 → 打开某退款工单 → 退款处置面板点「退款成功并撤销权益」
- **预期结果**：
  - 发起退款即冻结权益；「撤销」在退款成功前禁用
  - 退款成功后才撤销权益；退款失败/驳回则恢复权益（独立合规冻结不随失败解除）
  - 同一 `idempotencyKey` 的重复回调不产生第二笔流水或第二份权益

### 场景 D：合规批量主动退款

- **操作**：编排器 `initiateComplianceBatchRefund` 对受影响客户在同一工单下 fan-out 全额退款
- **预期结果**：一个 S1 工单串联多笔退款，无需客户逐一申请，全部成功后统一撤销权益

### 场景 E：企业合同终止与席位收回

- **操作**：售后详情 → 席位面板 →「终止合同并批量收回席位」；或对单成员「收回该席位」
- **预期结果**：
  - 到终止日批量撤销企业权益、收回全部席位，要求管理员+成员双层通知
  - 单成员退出只收回该席位，不改变企业套餐与其他席位
  - 商品迁移先授予替代权益并验证可用，再撤销原权益，迁移窗口内无服务中断

## 配置与集成治理演示场景

### 场景 F：会员价格误配 → 回滚

- **操作**：后台 → 运营配置 → 会员价格卡片 → 不填审核人点「发布」被拦截（需双人）；填入第二审核人发布调价，再从版本历史回滚到上一版
- **预期结果**：
  - 价格/AI 来源类配置及批量≥100 商品/全用户入口一律双人审核
  - 回滚生成新版本、after 等于目标版本；错误版本保留为「已回滚」可查
  - 回滚只恢复配置，不自动恢复被暂停/下架/召回的商品

### 场景 G：可信空间回调死信 → 人工修正 → 旧事件丢弃

- **操作**：后台 → 审批与集成 → 集成治理 → 对死信事件点「人工修正」
- **预期结果**：
  - 首次失败后最多重试 3 次，超过进入死信队列
  - 人工修正写入更高处理版本并开集成工单；随后重放的旧版本事件被判为 `stale_dropped`
  - 重复 `idempotencyKey` 幂等丢弃；无效签名拒绝；同步超时不被误判为下架

## 部署（Cloudflare Pages）

本工程已部署在 Cloudflare Pages，项目名 `external-app`。使用 Vue Router 的 hash 路由，访问地址务必带 `#` 路径：

- 固定生产地址（始终指向最新一次部署）：
  - 移动端 APP：<https://external-app.pages.dev/#/app/home>
  - 运营后台：<https://external-app.pages.dev/#/admin>
- 每次部署还会生成一个带哈希前缀的临时地址，如 `https://<hash>.external-app.pages.dev`。

### 方式一：命令行手动发布（一次性）

```bash
cd external-app-vue3
npm run build                 # 产物输出到 dist/
npx wrangler login            # 首次需浏览器授权一次
npx wrangler pages deploy dist --project-name external-app
```

首次若项目不存在，`deploy` 会提示新建，选择 Create a new project、生产分支填 `main` 即可。之后再发布不会重复询问。

> 注意：`deploy` 上传的是当前 `dist/` 目录，务必先 `npm run build` 以免发布到旧构建。

### 方式二：连接仓库自动发布（推荐，push 即部署）

在 Cloudflare Dashboard → Workers & Pages → Create → Pages → 连接 GitHub 仓库 `data-asset-platform`，构建设置：

- Root directory（根目录）：`external-app-vue3`
- Build command：`npm run build`
- Build output directory：`dist`

配置后，向 `main` 推送即触发 Cloudflare 自动构建并发布，无需手动 `wrangler`。

### 常见问题

- **打开是「无法访问/连接被拒」**：多为本地没启动服务或访问了错误端口；线上直接用上面的 `*.pages.dev` 地址即可。
- **`npm run dev` 报 esbuild 版本不匹配**：删除依赖重装即可对齐版本——`rm -rf node_modules package-lock.json && npm install`。
- **页面白屏、路由 404**：确认地址带了 `#`（hash 路由），如 `/#/app/home` 而非 `/app/home`。
