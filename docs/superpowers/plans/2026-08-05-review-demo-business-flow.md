# 评审演示路线业务流程化改版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将评审演示路线改成研发、测试可共同走查的端到端业务流程脚本，并同步对应飞书文档。

**Architecture:** 以四条业务旅程替代逐页功能介绍；每个步骤统一描述角色、入口、操作、系统判断、页面结果和研发测试检查点。时间表、备用链接及 D01～D14 决策项保留为执行与记录附录。

**Tech Stack:** Markdown、本地原型 URL、飞书开放平台文档同步脚本。

## Global Constraints

- 主演示必须覆盖资产平台数据集 APP 内闭环、可信空间企业采购、报告与看板购买使用、供给不足与运营治理四条流程。
- 每一步只描述一个主要业务判断，并给出用户可观察的唯一结果。
- 用数模块只作为交付去向，不评审内部分析、报表制作和看板制作能力。
- 可信空间订单、交付和账单不在 APP 同步或镜像。
- 保留 20 分钟主演示、12 分钟压缩路线、备用链接和 D01～D14 评审记录。

---

### Task 1: 重写本地评审演示路线

**Files:**
- Modify: `docs/product/2026-07-31-对外APP找数买数用数-评审演示路线.md`
- Reference: `docs/superpowers/specs/2026-08-05-review-demo-business-flow-design.md`
- Reference: `docs/product/2026-08-03-对外APP找数买数用数-功能说明PRD.md`

**Interfaces:**
- Consumes: 已确认的四条业务旅程、现有原型链接和 PRD 业务规则。
- Produces: 可直接用于研发测试评审的 Markdown 演示脚本。

- [ ] **Step 1: 将评审目标改为业务流程走查目标**

明确本次评审用于统一业务流程、系统边界、状态结果和测试预期，不逐页念功能，也不只做产品决策确认。

- [ ] **Step 2: 增加角色与 Mock 初始状态**

列明个人用户、企业普通成员、企业管理员、运营人员，以及登录、认证、采购策略、席位、商品和订单的初始状态。

- [ ] **Step 3: 编写流程 A——资产平台数据集 APP 内闭环**

使用统一七列表格覆盖：找数、详情评估、个人/企业主体、快照/持续方案、审批、企业支付、订单、交付失败与重试、席位分配、到期与续订。

- [ ] **Step 4: 编写流程 B——可信空间企业采购**

覆盖数据集和 API 的内容评估、个人身份限制、企业认证、多方案、跳转、返回恢复及空间订单/使用/账单入口；明确 APP 不生成空间订单镜像。

- [ ] **Step 5: 编写流程 C——报告与看板购买使用**

覆盖列表内容优先、详情默认内容页、购买、我的订单和权益入口；报告默认在线阅读，看板默认看板预览。

- [ ] **Step 6: 编写流程 D——供给不足与运营治理**

覆盖结果少于 3 条时提交需求、简单反馈、商品配置发布、首次快照、变化监控、人工定级和确认高风险后暂停新购。

- [ ] **Step 7: 重排现场执行附录**

在四条流程后提供 20 分钟主演示、12 分钟压缩路线、按流程归类的备用链接、D01～D14 决策表和评审记录表。

- [ ] **Step 8: 运行本地结构校验**

Run:

```bash
rg -n "流程 A|流程 B|流程 C|流程 D|参与角色|系统判断与状态变化|研发/测试检查点|20 分钟|12 分钟|D01～D14|不生成空间订单镜像" docs/product/2026-07-31-对外APP找数买数用数-评审演示路线.md
```

Expected: 所有关键结构和边界表述均至少命中一次。

- [ ] **Step 9: 运行内容冲突检查**

Run:

```bash
rg -n "逐页念功能|APP 同步空间订单|APP 镜像空间订单|永久更新|个人支付企业订单" docs/product/2026-07-31-对外APP找数买数用数-评审演示路线.md
```

Expected: 只允许“本次不逐页念功能”等否定说明命中；不得出现与当前 PRD 相反的肯定规则。

- [ ] **Step 10: 提交本地文档**

```bash
git add -f docs/product/2026-07-31-对外APP找数买数用数-评审演示路线.md
git commit -m "docs: rewrite review route by business flow"
```

### Task 2: 同步并验证飞书演示路线

**Files:**
- Read: `/private/tmp/codex_sync_stage_only_docs.py`
- Source: `docs/product/2026-07-31-对外APP找数买数用数-评审演示路线.md`
- Target: `https://my.feishu.cn/wiki/RckvwvTMeiEH4KknFJrc7Nedn1b`

**Interfaces:**
- Consumes: Task 1 的完整本地 Markdown。
- Produces: 与本地脚本内容一致的飞书评审演示路线。

- [ ] **Step 1: 更新飞书回读标记**

同步脚本的演示文档标记至少包含：`流程 A：资产平台数据集 APP 内闭环`、`流程 B：可信空间企业采购`、`流程 C：报告与看板购买使用`、`流程 D：供给不足与运营治理`、`研发/测试检查点`、`D01～D14`。

- [ ] **Step 2: 同步演示路线**

Run:

```bash
python3 /private/tmp/codex_sync_stage_only_docs.py demo
```

Expected: 返回 `status: success`，文档标题为“对外 APP 找数、买数与用数 · 评审演示路线”。

- [ ] **Step 3: 确认写后回读**

确认同步脚本对全部新标记回读成功，且没有排期禁用词；保留同步前飞书备份文件路径。

- [ ] **Step 4: 最终一致性检查**

确认本地文档与飞书文档共同满足：四条业务流程齐全、七列步骤模板齐全、APP 与可信空间边界一致、20/12 分钟路线和 D01～D14 均保留。
