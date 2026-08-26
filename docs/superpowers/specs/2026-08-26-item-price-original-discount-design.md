# 单品原价 + 营销折扣 + 结算双路径

- 日期：2026-08-26
- 分支：`feature/item-price-original-discount`
- 范围：运营后台单品定价（原价/折扣）、前台计价与展示、APP/门户结算页支付双路径
- 状态：用户已确认方案 B，折扣默认 10.0 必填，结算双路径 APP + 门户均做

## 背景

后台「价格与权益」Tab 中个人/企业单品仅有一个「价格」字段，无法表达营销原价与折扣。前台详情虽有会员主路径 + 单品次路径，但结算页仍是单按钮确认支付，未对齐参考图（订单信息 + 「直接购买 / 成为会员」+ 立省气泡）。

## 目标

1. 后台为个人/企业单品分别配置**原价**与**营销折扣**，自动预览对外售价。
2. 定价模型 **A**：先算单品营销价，会员权益（免费/折扣）叠在该售价上。
3. APP 与门户结算页：非会员且商品有会员权益时，展示双路径与「会员购买立省 ¥X.X」气泡。
4. 详情页按钮文案与结算语义对齐（「直接购买」而非「原价购买」）。

## 非目标

- 空间商品、入驻商家、免费商品、企业合同采购等特殊链路改造。
- 会员购买页本身（仍走现有 `/app/checkout/member` 占位）。
- 列表/搜索卡片全面重做价展示（有营销折时在结算/详情沿用划线原价即可）。

## 价格模型

```
单品营销价 = 原价 × (营销折扣 ÷ 10)   // 保留 1 位小数
会员折后价 = 单品营销价 × 会员折扣系数   // 保留 1 位小数；免费 = 0
```

- 个人 / 企业单品**各自独立**配置原价与折扣。
- 启用单品时，原价与折扣均**必填**；折扣默认 **10.0**（不打营销折，售价 = 原价）。
- `CommerceOffer.price` 继续存**对外单品营销价**（兼容现有读取 `offer.price` 的逻辑）。
- 新增可选字段 `originalPrice`、`discountZhe` 存于 `CommerceOffer`，便于展示划线原价。

### 字段校验

| 字段 | 规则 |
| --- | --- |
| 原价 | 启用单品时必填；> 0；≤ 9,999,999；最多 1 位小数 |
| 营销折扣 | 启用单品时必填；> 0 且 ≤ 10；最多 1 位小数；默认 10.0 |
| 对外售价 | 只读：`itemSalePrice(originalPrice, discountZhe)` |

### 兼容旧数据

从 store 同步表单时，若 offer 无 `originalPrice` / `discountZhe`：视为 `discountZhe = 10`，`originalPrice = offer.price`。

## 后台 UI（价格与权益 Tab）

个人 / 企业单品行由「价格 ¥」改为：

```
[√] 启用  原价 ¥ [____]  折扣 [10.0] 折  →  售价 ¥xxx.x
```

- `data-testid` 保留 `-enabled`；新增 `-original-price`、`-discount-zhe`、`-sale-price-preview`。
- 上架校验失败字段仍映射到 `pricing` Tab（`itemPrice` / 新字段 `itemOriginalPrice` / `itemDiscountZhe`）。

## 前台展示

| 场景 | 行为 |
| --- | --- |
| 营销折 < 10 | 可展示划线原价 + 单品营销价 |
| 营销折 = 10 | 只展示单品营销价 |
| 非会员 + 有会员权益 + 可购单品 | 结算页双路径 |
| 已是会员 | 单按钮，按会员价或免费 |

### 详情页按钮（productAccess）

- 次路径：`直接购买 ¥{单品营销价}`（替换「原价购买」）
- 主路径仍为开通会员相关文案

## 结算双路径（APP CheckoutItem + 门户 PortalCheckout）

**出现条件**：非入驻、非会员、可开通会员、商品含 `member` 且含 `item_purchase`。

**布局（参考支付宝即时到账弹窗）**：

1. 订单信息：订单编号（预览号）、商品名称、付款金额、商品描述（`offerDescription`）
2. 次按钮：**直接购买** — 应付 = 单品营销价，走现有 `purchaseCommerceProductForSubject`
3. 主按钮：**成为会员**（品牌/绿色主色）+ 气泡「会员购买立省 ¥X.X」
   - 折扣权益：`立省 = 单品营销价 − 会员折后价`
   - 免费权益：`立省 = 单品营销价`
4. 点击「成为会员」→ `/app/checkout/member?returnProduct={id}`（门户同路由）

已有会员、无会员权益、入驻商家：保持现有单按钮「确认支付」。

## 实现边界

| 区域 | 文件 |
| --- | --- |
| 计价纯函数 | `domain/itemPricing.ts` + test |
| 上架校验 | `domain/salesListing.ts` + test |
| 类型 | `types/domain.ts` — `CommerceOffer` 增可选字段 |
| 后台表单 | `views/admin/ResourceEdit.vue` + test |
| 双路径域逻辑 | `domain/checkoutDualPath.ts` + test |
| 结算 UI | `views/mobile/CheckoutItem.vue`、`views/portal/PortalCheckout.vue` + tests |
| 详情按钮 | `domain/productAccess.ts` + test |

## 验收

- 后台启用个人单品：填原价 100、折扣 8.5 → 预览售价 ¥85.0；保存后 offer.price = 85，originalPrice = 100，discountZhe = 8.5。
- 折扣默认 10.0、原价 199 → 售价 ¥199.0，无划线原价。
- 上架缺原价/非法折扣 → 价格 Tab 报错拦截。
- 非会员打开 `prod-logistics-monthly` 结算：见双按钮 + 立省气泡；点直接购买扣单品价；点成为会员跳会员页。
- 已购会员结算：仍单按钮会员价，无双路径。
- 门户结算与 APP 规则一致。

## 文档

落地后在功能说明 PRD 价格配置小节补充原价/折扣说明；完整模块 PRD F11 价格字段同步；`version-index.md` 增一行。
