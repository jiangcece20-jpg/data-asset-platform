# Demo Route Flowcharts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create one uncompressed, ten-page Draw.io source file that turns the current demo route into PRD-friendly flowcharts.

**Architecture:** Store every chart as an independent `<diagram>` page inside one `.drawio` XML document. Reuse a single visual vocabulary across pages, keep the main path left-to-right, and use role lanes plus short rule callouts so each page can be read without copying the PRD tables.

**Tech Stack:** Draw.io XML 24.0.0, uncompressed `mxGraphModel`, `xmllint`, `rg`, Git

## Global Constraints

- Create only `docs/product/2026-08-14-对外APP找数买数用数-演示路线流程图.drawio`; do not export PNG, SVG, or PDF.
- Include exactly ten pages in this order: `overview`, `flow-a-purchase`, `flow-a-delivery`, `flow-b-qualification`, `flow-b-usage`, `flow-c-content`, `flow-d-demand`, `flow-d-governance`, `flow-e-onboarding`, `flow-e-purchase`.
- Exclude struck-through steps A6, A7, A11–A13, C5, and C6.
- Preserve original step identifiers on all detailed process nodes.
- Use pure text in `mxCell.value`; use `&#xa;` for line breaks and `html=0` in styles.
- Use a horizontal PRD-friendly canvas with background `#F8FAFC`, title size 20, node and edge-label size 15, rounded rectangles, orthogonal 2 px connectors, and no gradients or decorative icons.
- Use blue for user actions, purple for platform processing, orange for administrator or operator actions, green for trusted-space or external actions, red for blocked or failed paths, and pale yellow or gray for rule callouts.
- Use solid arrows for the main path and dashed arrows for asynchronous callbacks or mirrored records.
- Keep fixed-cycle, order-snapshot, three-axis-state, trusted-space authority, mutually exclusive demand-result, human-confirmed high-risk, and seller-self-collection rules visible on their relevant pages.

---

### Task 1: Create the Draw.io container and overview page

**Files:**
- Create: `docs/product/2026-08-14-对外APP找数买数用数-演示路线流程图.drawio`

**Interfaces:**
- Consumes: `docs/product/2026-07-31-对外APP找数买数用数-评审演示路线.md` and `docs/superpowers/specs/2026-08-14-demo-route-flowcharts-design.md`.
- Produces: one valid `<mxfile>` with ten named `<diagram>` elements; `overview` is populated and the remaining pages contain valid empty roots ready for later tasks.

- [ ] **Step 1: Confirm the target does not already contain user work**

Run:

```bash
git status --short -- 'docs/product/2026-08-14-对外APP找数买数用数-演示路线流程图.drawio'
```

Expected: no output. If the file exists or is modified, stop instead of overwriting it.

- [ ] **Step 2: Create the ten-page XML container**

Create an uncompressed `<mxfile host="app.diagrams.net" agent="drawio-chart" version="24.0.0">`. Every page must contain this model shape:

```xml
<mxGraphModel grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="2400" pageHeight="1350" math="0" shadow="0" background="#F8FAFC">
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
  </root>
</mxGraphModel>
```

Use page IDs `overview`, `flow-a-purchase`, `flow-a-delivery`, `flow-b-qualification`, `flow-b-usage`, `flow-c-content`, `flow-d-demand`, `flow-d-governance`, `flow-e-onboarding`, and `flow-e-purchase`; use the same strings as page names.

- [ ] **Step 3: Populate the overview page**

Add the title `找数、买数与用数业务总览` and a five-stage top row:

```text
找数与评估 → 购买或空间跳转 → 订单与权威状态 → 交付和用数 → 需求回流或卖数
```

Add five route rows beneath it:

```text
A APP 数据集：关键词找数 → APP 下单 → 固定周期锁单 → 三轴交付 → 数据集用数
B 可信空间：内容评估 → 企业资格 → 跳转空间成交 → 权威订单回传 → 下载/用数或空间沙箱
C 报告与看板：内容优先评估 → APP 购买 → 报告阅读/看板使用
D 需求与治理：供给不足提需求 → 三选一反馈；商品配置发布 → 变化监控 → 人工高风险处置
E 入驻商家：卖家准入 → 看板上架 → 买家购买 → 卖家确认到账 → 平台发权
```

Place two prominent callouts: `APP 内成交：A / C / E` and `可信空间成交：B，空间事实权威`.

- [ ] **Step 4: Validate the container and overview**

Run:

```bash
xmllint --noout 'docs/product/2026-08-14-对外APP找数买数用数-演示路线流程图.drawio'
rg -c '<diagram ' 'docs/product/2026-08-14-对外APP找数买数用数-演示路线流程图.drawio'
rg -n '<diagram[^>]+name="(overview|flow-a-purchase|flow-a-delivery|flow-b-qualification|flow-b-usage|flow-c-content|flow-d-demand|flow-d-governance|flow-e-onboarding|flow-e-purchase)"' 'docs/product/2026-08-14-对外APP找数买数用数-演示路线流程图.drawio'
```

Expected: XML validation exits 0, page count is 10, and all ten page names appear once.

- [ ] **Step 5: Commit the container and overview**

```bash
git add -f 'docs/product/2026-08-14-对外APP找数买数用数-演示路线流程图.drawio'
git commit -m "docs(flow): add demo route overview"
```

---

### Task 2: Populate APP and trusted-space purchase flows

**Files:**
- Modify: `docs/product/2026-08-14-对外APP找数买数用数-演示路线流程图.drawio`

**Interfaces:**
- Consumes: the ten-page container from Task 1 and the original A/B/C route tables.
- Produces: complete pages `flow-a-purchase`, `flow-a-delivery`, `flow-b-qualification`, `flow-b-usage`, and `flow-c-content`.

- [ ] **Step 1: Populate `flow-a-purchase`**

Use lanes `用户 / 企业成员`, `APP`, and `企业采购` with this main path:

```text
A1 搜索“货车轨迹”
→ APP 返回已包装、已发布商品
→ A2 查看样例、字段与探查报告
→ A3 选择企业或个人购买主体
→ APP 刷新主体价格与许可
→ A4 查看唯一价格、固定购买周期和席位
→ A5 提交采购申请
→ APP 固化商品、价格、周期、许可、席位和审批路径快照
→ 待审批
```

Attach callouts: `用户不能选择周期或数据截止日期` and `订单/申请创建后，商品变化不改写快照`.

- [ ] **Step 2: Populate `flow-a-delivery`**

Use lanes `企业管理员 / 成员` and `APP / 交付服务`:

```text
已支付订单
→ A8 首次交付失败
→ 三轴：付款=已支付、权益=处理中、交付=交付失败
→ A9 发起交付重试
→ 交付=重试中
→ 交付成功？
→ 是：A10 权益有效、交付完成 → 进入用数或下载
→ 否：保持已支付事实并允许后续处理
→ A14 周期临近结束或已结束
→ 停止更新并保留最近有效版本
→ 按最新价格与最新商品周期续订
```

Use a red failure branch and a callout `重试幂等；成功不重复发权`.

- [ ] **Step 3: Populate `flow-b-qualification`**

Use lanes `个人 / 企业成员`, `APP`, and `可信空间`:

```text
B1/B2 评估数据集或 API 内容
→ B3 当前是否为已认证企业？
→ 否：个人可浏览但不能下单 → B4 发起企业认证 → 返回原商品并重新校验
→ 是：校验空间连接与商品状态
→ B5 选择同步方案并跳转可信空间
→ 空间完成确认流程
⇢ B6 返回 APP 并恢复原商品、企业和方案
→ 显示结果未知/处理中，等待权威核验
```

The callback from trusted space to APP must be dashed. Add callouts `APP 不修改空间价格` and `回跳不等于成交成功`.

- [ ] **Step 4: Populate `flow-b-usage`**

Use lanes `企业成员`, `APP`, and `可信空间`:

```text
B7 空间订单权威回传
⇢ APP 创建只读订单镜像
→ 商品类型？
→ API：B9 前往可信空间查看账单
→ 数据集：B8 企业是否已开通找数买数？
→ 否：提示开通
→ 是：方案是否支持下载？
→ 是：在 APP / 万联灵析进入用数或下载
→ 否：仅前往可信空间沙箱
```

Use dashed edges for the order mirror and callout `是否经 APP 跳转购买不影响判断`.

- [ ] **Step 5: Populate `flow-c-content`**

Use lanes `用户 / 企业成员`, `APP`, and `企业管理员`:

```text
C1 查看报告或看板卡片
→ 商品类型？
→ 报告：C2 默认在线阅读样章与目录
→ 看板：C3 默认查看公开指标与趋势
→ C4 个人购买：固定周期 + 在线支付 → 本人权益
→ 企业购买：C7 管理员付款 → 企业权益创建
→ C8 从订单或权益入口打开内容
→ 报告在线阅读 / 看板预览
→ 周期结束后停止新增版本或刷新，保留最近合法内容
```

Add callout `内容商品在 APP 内成交；周期只读且锁单`.

- [ ] **Step 6: Validate and commit A/B/C pages**

Run:

```bash
xmllint --noout 'docs/product/2026-08-14-对外APP找数买数用数-演示路线流程图.drawio'
rg -n 'A6|A7|A11|A12|A13|C5|C6' 'docs/product/2026-08-14-对外APP找数买数用数-演示路线流程图.drawio'
rg -n '&lt;|&lt;br|&lt;b|html=1' 'docs/product/2026-08-14-对外APP找数买数用数-演示路线流程图.drawio'
```

Expected: XML validation exits 0; both `rg` checks return no matches. Then run:

```bash
git add -f 'docs/product/2026-08-14-对外APP找数买数用数-演示路线流程图.drawio'
git commit -m "docs(flow): add purchase route charts"
```

---

### Task 3: Populate demand, governance, and seller flows

**Files:**
- Modify: `docs/product/2026-08-14-对外APP找数买数用数-演示路线流程图.drawio`

**Interfaces:**
- Consumes: the container and populated A/B/C pages from Tasks 1–2 plus the D/E route tables.
- Produces: complete pages `flow-d-demand`, `flow-d-governance`, `flow-e-onboarding`, and `flow-e-purchase`, followed by full-file validation.

- [ ] **Step 1: Populate `flow-d-demand`**

Use lanes `用户`, `APP`, and `运营人员`:

```text
D1-1 搜索有效结果少于 3 条
→ 显示“提交数据需求”入口并带入关键词/筛选
→ D1-2 用户提交需求
→ 状态=待处理
→ D1-3 运营填写反馈并三选一
→ 推荐现有商品 / 需要定制 / 暂不支持
→ D1-4 保存唯一结果并发送一次站内提醒
→ D1-5 用户查看结论、反馈和下一步
```

Use a three-way decision and add callouts `三个结果互斥` and `推荐商品必须已发布`.

- [ ] **Step 2: Populate `flow-d-governance`**

Use lanes `运营人员`, `商品平台`, and `资产监控`:

```text
D2-1 配置内容、价格/会员权益和固定周期
→ D2-2 审核通过
→ D2-3 发布商品
→ D2-4 查看有效订单与交付保障至
→ D2-5 首次成功检查保存完整快照
→ D2-6 后续检查与上次成功快照比较
→ 发现变化？
→ 否：保持可售
→ 是：D2-7 人工定级低/中/高并填写原因
→ 是否人工确认高风险？
→ 否：记录事件，不暂停新购
→ 是：D2-8 有权限运营确认并暂停新购
→ 存量权益继续，前台显示暂停原因
```

Add callouts `一次检查失败不能自动下架` and `多项变化取最高风险，不累加分数`.

- [ ] **Step 3: Populate `flow-e-onboarding`**

Use lanes `申请人 / 卖家`, `APP`, and `运营人员`:

```text
E1-1 进入卖家中心
→ E1-2 提交身份收款与数据合规材料
→ 状态=材料审核中
→ E1-3 运营审核准入
→ 通过？
→ 否：驳回或补正，禁止上架
→ 是：状态=已准入
→ E2-1 选择看板、锁定版本并提交上架申请
→ E2-2 运营审核通过即发布
→ 前台可检索和购买
→ E2-3 投诉或巡检命中时强制暂停新购、下架或暂停卖家
```

Add callouts `买家企业认证不等于卖家准入` and `同一卖家 + 对象版本不得重复在审或在架`.

- [ ] **Step 4: Populate `flow-e-purchase`**

Use lanes `个人买家`, `APP`, and `已准入卖家`:

```text
E3-1 发现并评估已发布商家看板
→ E3-2 确认个人价格和固定周期
→ 创建 APP 订单，结算模式=卖家自收款
→ 状态=待卖家确认到账
→ E3-3 卖家核对收款
→ 是否到账？
→ 否：进入争议，只读并联系运营
→ 是：状态=已结算，APP 幂等发权
→ E3-4 买家从我的数据或订单打开看板
```

Add callouts `平台不代收、不担保资金` and `未确认到账不得发权`.

- [ ] **Step 5: Run full structural and content validation**

Run:

```bash
xmllint --noout 'docs/product/2026-08-14-对外APP找数买数用数-演示路线流程图.drawio'
rg -c '<diagram ' 'docs/product/2026-08-14-对外APP找数买数用数-演示路线流程图.drawio'
rg -c '<mxGraphModel ' 'docs/product/2026-08-14-对外APP找数买数用数-演示路线流程图.drawio'
rg -n 'A6|A7|A11|A12|A13|C5|C6|&lt;|&lt;br|&lt;b|html=1' 'docs/product/2026-08-14-对外APP找数买数用数-演示路线流程图.drawio'
git diff --check -- 'docs/product/2026-08-14-对外APP找数买数用数-演示路线流程图.drawio'
```

Expected: XML validation and diff check exit 0; both counts are 10; forbidden-content search returns no matches.

Check active-step coverage with:

```bash
for step in A1 A2 A3 A4 A5 A8 A9 A10 A14 B1 B2 B3 B4 B5 B6 B7 B8 B9 C1 C2 C3 C4 C7 C8 D1-1 D1-2 D1-3 D1-4 D1-5 D2-1 D2-2 D2-3 D2-4 D2-5 D2-6 D2-7 D2-8 E1-1 E1-2 E1-3 E2-1 E2-2 E2-3 E3-1 E3-2 E3-3 E3-4; do rg -q "${step}" 'docs/product/2026-08-14-对外APP找数买数用数-演示路线流程图.drawio' || exit 1; done
```

Expected: exit 0.

- [ ] **Step 6: Inspect page order and commit the completed source**

Run:

```bash
rg -o '<diagram[^>]+name="[^"]+"' 'docs/product/2026-08-14-对外APP找数买数用数-演示路线流程图.drawio'
git status --short --branch
```

Expected: ten names appear in the specified order and only the Draw.io source remains uncommitted. Then run:

```bash
git add -f 'docs/product/2026-08-14-对外APP找数买数用数-演示路线流程图.drawio'
git commit -m "docs(flow): complete demo route charts"
```
