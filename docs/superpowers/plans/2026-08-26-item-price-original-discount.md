# 单品原价折扣与结算双路径 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 后台单品配置原价+营销折扣，前台按「营销价→会员权益」计价，APP/门户结算页非会员展示直接购买 vs 成为会员双路径。

**Architecture:** 计价收口到 `itemPricing.ts`；`CommerceOffer.price` 仍为对外营销价并新增 `originalPrice`/`discountZhe`；双路径条件与立省文案在 `checkoutDualPath.ts`；结算页共用域逻辑、各自模板。

**Tech Stack:** Vue 3.4、TypeScript 5.5、Vitest 3、`external-app-vue3`

**Spec:** `docs/superpowers/specs/2026-08-26-item-price-original-discount-design.md`

## Global Constraints

- 定价模型 A：会员权益叠在单品营销价上。
- 折扣默认 10.0，启用单品时原价与折扣均必填。
- 折后价保留 1 位小数。
- 不改空间/入驻/免费/合同链路。
- 测试：`cd external-app-vue3 && pnpm test`。
- 本会话不自动 commit，除非用户要求。

---

### Task 1: itemPricing 域模块

**Files:**
- Create: `external-app-vue3/src/domain/itemPricing.ts`
- Create: `external-app-vue3/src/domain/itemPricing.test.ts`
- Modify: `external-app-vue3/src/types/domain.ts` — `CommerceOffer` 增 `originalPrice?`, `discountZhe?`

**Interfaces:**
- Produces: `ITEM_DISCOUNT_ZHE_DEFAULT`, `itemSalePrice`, `originalPriceOk`, `itemDiscountZheOk`, `hasMarketingDiscount`, `roundPrice1`

---

### Task 2: salesListing 校验扩展

**Files:**
- Modify: `external-app-vue3/src/domain/salesListing.ts`
- Modify: `external-app-vue3/src/domain/salesListing.test.ts`

**Interfaces:**
- Consumes: `itemPricing` 校验函数
- Extends `PublishForm` with `personalOriginalPrice`, `personalDiscountZhe`, `enterpriseOriginalPrice`, `enterpriseDiscountZhe`
- Maps new fields to `itemPrice` tab via `tabForPublishField`

---

### Task 3: 后台 ResourceEdit

**Files:**
- Modify: `external-app-vue3/src/views/admin/ResourceEdit.vue`
- Modify: `external-app-vue3/src/views/admin/ResourceEdit.test.ts`

- `ItemOfferForm` 增 `originalPrice`, `discountZhe`
- `syncItemOffer` / `normalizeItemOffer` 读写新字段并计算 `price`
- UI 替换单品价格输入为三字段 + 预览

---

### Task 4: checkoutDualPath + productAccess

**Files:**
- Create: `external-app-vue3/src/domain/checkoutDualPath.ts`
- Create: `external-app-vue3/src/domain/checkoutDualPath.test.ts`
- Modify: `external-app-vue3/src/domain/productAccess.ts`
- Modify: `external-app-vue3/src/domain/productAccess.test.ts`

- `shouldShowCheckoutDualPath`, `memberPurchaseSavingsLabel`, `previewOrderNo`
- productAccess: 「原价购买」→「直接购买」

---

### Task 5: 结算页双路径 UI

**Files:**
- Modify: `external-app-vue3/src/views/mobile/CheckoutItem.vue`
- Modify: `external-app-vue3/src/views/portal/PortalCheckout.vue`
- Modify: `external-app-vue3/src/views/mobile/CheckoutItem.test.ts`
- Add portal checkout test if missing

---

### Task 6: PRD 同步

**Files:**
- Modify: `docs/product/2026-08-03-对外APP找数买数用数-功能说明PRD.md`
- Modify: `docs/product/version-index.md`
