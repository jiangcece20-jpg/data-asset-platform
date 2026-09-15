# Data Asset Platform Panorama Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a management-ready, editable data asset platform panorama that shows all eight first-level modules and 64 second-level functions while highlighting exactly nine AI capabilities.

**Architecture:** Use one uncompressed Draw.io `mxGraphModel` as the editable source of truth. Mirror its copy, geometry, hierarchy, and colors in a standalone 1600 × 1000 SVG, generate the PNG mechanically from that SVG, and link all three formats from the existing management document.

**Tech Stack:** Markdown, Draw.io `mxGraphModel` XML, SVG 1.1, `xmllint`, Node.js with local `sharp`, macOS `sips`.

## Global Constraints

- Audience: management, product owners, and project decision-makers.
- Canvas: exactly 1600 × 1000, landscape, single page.
- Layout: exactly two rows by four columns in this order: 资产接入、资产管理、资产发现、数据治理；资产使用、资产运营、资产服务化、平台底座.
- Content: exactly 64 second-level functions from `docs/product/2026-07-23-数据资产平台能力全景与AI找数需求.md`.
- AI scope: highlight exactly nine approved functions with purple styling and `✦ AI`.
- Status scope: do not show `已具备`, `建设中`, or `待规划`.
- Draw.io: uncompressed editable `mxGraphModel`; all valued `mxCell` elements use pure text and `html=0`.
- SVG: no `foreignObject`, HTML, scripts, embedded images, external fonts, or remote resources.
- PNG: generated from the final SVG and exactly 1600 × 1000.
- Copy: Draw.io and SVG feature names must match the management document after whitespace normalization.
- Scope: no application code or unrelated files.

---

### Task 1: Editable Draw.io Platform Panorama

**Files:**
- Create: `docs/product/2026-07-24-数据资产平台能力全景.drawio`
- Read: `docs/superpowers/specs/2026-07-24-data-asset-platform-panorama-design.md`
- Read: `docs/product/2026-07-23-数据资产平台能力全景与AI找数需求.md`
- Read: `/Users/jiangpangzi/.codex/skills/drawio-chart/SKILL.md`
- Read: `/Users/jiangpangzi/.codex/skills/drawio-chart/references/style-spec.md`
- Read: `/Users/jiangpangzi/.codex/skills/drawio-chart/references/xml-and-layout.md`
- Read: `/Users/jiangpangzi/.codex/skills/drawio-chart/references/export-and-files.md`

**Interfaces:**
- Consumes: The eight module names, 64 function names, nine AI labels, geometry, and colors fixed by the approved design spec.
- Produces: A one-page editable Draw.io source whose element IDs, copy, and geometry Task 2 mirrors in SVG.

- [ ] **Step 1: Create the one-page Draw.io skeleton**

Use `apply_patch` to create an uncompressed XML document with this root structure:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="2026-07-24T00:00:00.000Z" agent="Codex" version="24.7.17">
  <diagram id="data-asset-platform-panorama" name="data-asset-platform-panorama">
    <mxGraphModel dx="1600" dy="1000" grid="1" gridSize="10" page="1" pageScale="1" pageWidth="1600" pageHeight="1000" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <!-- title, subtitle, AI legend, eight module cards, 64 feature cells, footer -->
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

Expected top-level geometry:

```text
title/subtitle: x=40, y=25, w=1520, h=70
row 1 cards:    y=130, h=390
row 2 cards:    y=540, h=390
card columns:   x=40 / 430 / 820 / 1210, w=350
footer:         x=40, y=950, w=1520, h=30
```

- [ ] **Step 2: Add the eight module cards and all 64 feature cells**

Create one rounded white card per module with a deep-blue title bar. Add one independently editable feature cell for every item below:

```text
资产接入（7）:
数据源管理
元数据采集
自动扫描
资产注册
同步记录
采集任务与变更发现
元数据智能补全与采集诊断

资产管理（8）:
资产目录
分类分级
标签管理
负责人管理
生命周期与上下架
版本管理
资产分组与专题
智能分类与标签推荐

资产发现（7）:
全局搜索
目录浏览
资源发现
资产详情
专题与最近浏览
语义检索与智能推荐
AI 找数

数据治理（8）:
数据标准
数据质量
数据血缘
影响分析
敏感识别
问题整改
标准推荐与口径消歧
质量异常解释

资产使用（9）:
权限申请
审批
订阅
收藏
下载
API 调用
使用指引
即席查询
报表与看板预览

资产运营（7）:
热度与使用次数
用户评价
健康度
价值评估
运营报表与 ROI
低活跃资产治理
AI 运营摘要与治理建议

资产服务化（8）:
数据产品
指标服务
API 服务
数据市场
上下架管理
服务授权与版本
调用统计
交付与履约

平台底座（10）:
组织用户
角色权限
审计日志
消息通知
系统与审批集成
私有化部署
License 与模块授权
开放 API 与 Webhook
多租户与运维监控
AI 模型路由与评测
```

Use an inner content area of `x=cardX+12`, `y=cardY+58`, `w=326`. Use a 4 px vertical gap and these row heights:

```text
7 functions: 38 px
8 functions: 34 px
9 functions: 30 px
10 functions: 27 px
```

Use `fontSize=13`, `spacingLeft=10`, vertical center alignment, and pure text. Ordinary feature cell IDs start with `feature-`; the nine AI feature cell IDs start with `ai-` as defined in Step 3.

- [ ] **Step 3: Apply the exact AI treatment**

Give the following nine feature cells IDs beginning with `ai-` and apply:

```text
fillColor=#FAF5FF
strokeColor=#7C3AED
fontColor=#5B21B6
strokeWidth=1.5
rounded=1
html=0
```

Required AI IDs and labels:

```text
ai-ingest-metadata        → ✦ AI 元数据智能补全与采集诊断
ai-manage-classify       → ✦ AI 智能分类与标签推荐
ai-discovery-semantic    → ✦ AI 语义检索与智能推荐
ai-discovery-find        → ✦ AI 找数
ai-govern-sensitive      → ✦ AI 敏感识别
ai-govern-standard       → ✦ AI 标准推荐与口径消歧
ai-govern-quality        → ✦ AI 质量异常解释
ai-operate-summary       → ✦ AI 运营摘要与治理建议
ai-foundation-routing    → ✦ AI 模型路由与评测
```

For approved function names that already begin with `AI`, add only the `✦` symbol before the original name. For all other AI functions, add the full `✦ AI` marker before the original name. This keeps every AI row visibly marked while avoiding duplicated text such as `AI AI 找数`.

- [ ] **Step 4: Add title, legend, and footer**

Use these exact strings:

```text
数据资产平台能力全景
8 大能力域 · 64 项二级能力 · AI 能力横向嵌入全链路
✦ AI  AI 直接参与理解、推荐、生成、分析、诊断或评测
AI 不是孤立模块，而是横向嵌入资产接入、管理、发现、治理、运营和平台底座
```

Title and subtitle remain left-aligned. Put the purple AI legend at the upper right. Keep the footer visually subordinate.

- [ ] **Step 5: Validate the Draw.io source**

Run:

```bash
xmllint --noout docs/product/2026-07-24-数据资产平台能力全景.drawio
test "$(xmllint --xpath 'count(//diagram)' docs/product/2026-07-24-数据资产平台能力全景.drawio)" = "1"
test "$(xmllint --xpath 'count(//mxCell[starts-with(@id,\"feature-\") or starts-with(@id,\"ai-\")])' docs/product/2026-07-24-数据资产平台能力全景.drawio)" = "64"
test "$(xmllint --xpath 'count(//mxCell[starts-with(@id,\"ai-\")])' docs/product/2026-07-24-数据资产平台能力全景.drawio)" = "9"
test "$(xmllint --xpath 'count(//mxCell[@value and not(contains(@style,\"html=0\"))])' docs/product/2026-07-24-数据资产平台能力全景.drawio)" = "0"
if rg -n '已具备|建设中|待规划|html=1|<br|<div|https?://' docs/product/2026-07-24-数据资产平台能力全景.drawio; then exit 1; fi
```

Expected: valid XML, one page, exactly 64 feature cells, exactly nine AI feature cells, all valued cells use `html=0`, and prohibited text/resources are absent.

- [ ] **Step 6: Commit the editable source**

Run:

```bash
git add -f -- docs/product/2026-07-24-数据资产平台能力全景.drawio
git diff --cached --check
git diff --cached --name-status
git commit -m "docs: add editable data asset platform panorama"
```

Expected: the commit contains exactly the new Draw.io source.

---

### Task 2: SVG/PNG Previews, Visual Verification, and Management Document Links

**Files:**
- Create: `docs/product/2026-07-24-数据资产平台能力全景.svg`
- Create: `docs/product/2026-07-24-数据资产平台能力全景.png`
- Modify: `docs/product/2026-07-23-数据资产平台能力全景与AI找数需求.md`
- Read: `docs/product/2026-07-24-数据资产平台能力全景.drawio`

**Interfaces:**
- Consumes: The exact element IDs, copy, geometry, hierarchy, and visual styles from the Draw.io source.
- Produces: Standalone SVG and PNG previews plus management-document links to all three formats.

- [ ] **Step 1: Create the standalone SVG**

Use `apply_patch` to create:

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
  <rect width="1600" height="1000" fill="#FFFFFF"/>
  <!-- title, subtitle, legend, eight module cards, 64 feature rows, footer -->
</svg>
```

Mirror the final Draw.io source exactly:

- same title, subtitle, legend, footer, module order, and feature order;
- same card and row geometry;
- same blue module headers and purple AI rows;
- one `<g id="feature-*">` or `<g id="ai-*">` per feature cell;
- standard `<rect>`, `<text>`, and `<tspan>` elements only;
- no content or status labels beyond the approved design.

- [ ] **Step 2: Validate SVG structure and content**

Run:

```bash
xmllint --noout docs/product/2026-07-24-数据资产平台能力全景.svg
test "$(xmllint --xpath 'count(//*[local-name()=\"g\" and (starts-with(@id,\"feature-\") or starts-with(@id,\"ai-\"))])' docs/product/2026-07-24-数据资产平台能力全景.svg)" = "64"
test "$(xmllint --xpath 'count(//*[local-name()=\"g\" and starts-with(@id,\"ai-\")])' docs/product/2026-07-24-数据资产平台能力全景.svg)" = "9"
if rg -n 'foreignObject|<html|<script|@font-face|xlink:href=|<image|<use|已具备|建设中|待规划' docs/product/2026-07-24-数据资产平台能力全景.svg; then exit 1; fi
rg -n '资产接入|资产管理|资产发现|数据治理|资产使用|资产运营|资产服务化|平台底座' docs/product/2026-07-24-数据资产平台能力全景.svg
```

Expected: valid SVG, exactly 64 feature groups, exactly nine AI feature groups, all eight modules found, and no forbidden elements or status labels.

- [ ] **Step 3: Compare Draw.io and SVG feature copy**

Keep every SVG feature group flat, without a nested `<g>`, then run this exact read-only comparison:

```bash
node --input-type=module <<'NODE'
import { readFileSync } from 'node:fs';

const drawio = readFileSync(
  'docs/product/2026-07-24-数据资产平台能力全景.drawio',
  'utf8',
);
const svg = readFileSync(
  'docs/product/2026-07-24-数据资产平台能力全景.svg',
  'utf8',
);

const normalize = (value) =>
  value
    .replace(/&#xa;|&#10;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

const drawioFeatures = new Map(
  [...drawio.matchAll(/<mxCell id="((?:feature|ai)-[^"]+)" value="([^"]*)"/g)]
    .map(([, id, value]) => [id, normalize(value)]),
);

const svgFeatures = new Map(
  [...svg.matchAll(/<g id="((?:feature|ai)-[^"]+)">([\s\S]*?)<\/g>/g)]
    .map(([, id, body]) => [
      id,
      normalize(body.replace(/<[^>]+>/g, ' ')),
    ]),
);

const ids = new Set([...drawioFeatures.keys(), ...svgFeatures.keys()]);
const mismatches = [...ids].filter(
  (id) => drawioFeatures.get(id) !== svgFeatures.get(id),
);

console.log(
  `drawio=${drawioFeatures.size} svg=${svgFeatures.size} mismatches=${mismatches.length}`,
);
if (
  drawioFeatures.size !== 64 ||
  svgFeatures.size !== 64 ||
  mismatches.length !== 0
) {
  for (const id of mismatches) {
    console.error(
      `${id}\n  drawio=${drawioFeatures.get(id)}\n  svg=${svgFeatures.get(id)}`,
    );
  }
  process.exit(1);
}
NODE
```

Expected: `drawio=64 svg=64 mismatches=0`. Any mismatch must be corrected in both source files before continuing.

- [ ] **Step 4: Generate and verify the PNG**

Run:

```bash
node -e 'import("sharp").then(({default:sharp})=>sharp("docs/product/2026-07-24-数据资产平台能力全景.svg").png().toFile("docs/product/2026-07-24-数据资产平台能力全景.png"))'
test -s docs/product/2026-07-24-数据资产平台能力全景.png
file docs/product/2026-07-24-数据资产平台能力全景.drawio docs/product/2026-07-24-数据资产平台能力全景.svg docs/product/2026-07-24-数据资产平台能力全景.png
sips -g pixelWidth -g pixelHeight docs/product/2026-07-24-数据资产平台能力全景.png
```

Expected: Draw.io XML, SVG text, and a 1600 × 1000 PNG.

- [ ] **Step 5: Perform original-resolution visual inspection**

Open the final PNG with the local image viewer and inspect the full image plus cropped views of each row.

Acceptance checklist:

```text
Eight cards are equal in visual hierarchy.
All 64 function names are readable.
No text is clipped, overlapped, touching a border, or wrapping into another row.
Exactly nine AI rows are purple and visibly marked ✦ AI.
No status colors or status labels appear.
The title, subtitle, legend, and footer are readable.
The image remains understandable when scaled to a presentation slide.
```

If a problem is found, fix both Draw.io and SVG, regenerate PNG, repeat Steps 2–5, and document the correction.

- [ ] **Step 6: Add links and preview to the management document**

Replace the current `## 五、图表文件` section with:

```markdown
### 1. 数据资产平台能力全景

- 可编辑源图：[数据资产平台能力全景.drawio](./2026-07-24-数据资产平台能力全景.drawio)
- SVG 预览：[数据资产平台能力全景.svg](./2026-07-24-数据资产平台能力全景.svg)
- PNG 预览：[数据资产平台能力全景.png](./2026-07-24-数据资产平台能力全景.png)

![数据资产平台能力全景](./2026-07-24-数据资产平台能力全景.png)

### 2. AI 找数需求全景

- 可编辑源图：[AI 找数需求全景.drawio](./2026-07-23-AI找数-需求全景.drawio)
- SVG 预览：[AI 找数需求全景.svg](./2026-07-23-AI找数-需求全景.svg)
- PNG 预览：[AI 找数需求全景.png](./2026-07-23-AI找数-需求全景.png)

![AI 找数需求全景](./2026-07-23-AI找数-需求全景.png)
```

- [ ] **Step 7: Final focused validation and commit**

Run:

```bash
xmllint --noout docs/product/2026-07-24-数据资产平台能力全景.drawio
xmllint --noout docs/product/2026-07-24-数据资产平台能力全景.svg
test -s docs/product/2026-07-24-数据资产平台能力全景.png
rg -n '数据资产平台能力全景\\.drawio|数据资产平台能力全景\\.svg|数据资产平台能力全景\\.png|!\\[数据资产平台能力全景\\]' docs/product/2026-07-23-数据资产平台能力全景与AI找数需求.md
git diff --check -- docs/product/2026-07-24-数据资产平台能力全景.drawio docs/product/2026-07-24-数据资产平台能力全景.svg docs/product/2026-07-23-数据资产平台能力全景与AI找数需求.md
git add -f -- docs/product/2026-07-24-数据资产平台能力全景.drawio docs/product/2026-07-24-数据资产平台能力全景.svg docs/product/2026-07-24-数据资产平台能力全景.png docs/product/2026-07-23-数据资产平台能力全景与AI找数需求.md
git diff --cached --check
git diff --cached --name-status
git commit -m "docs: add data asset platform panorama previews"
```

Expected: the commit contains the new SVG and PNG, any visual correction to Draw.io, and the management-document link update; no unrelated files are staged.
