# Data Asset Platform Capability & AI Find Deliverables Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a management-ready data asset platform capability document and one editable AI Find requirements diagram with SVG/PNG previews.

**Architecture:** Use the approved design spec as the single source of truth. The management document presents the eight first-level modules and detailed second-level features; the diagram presents the six AI Find intents, four core capability modules, trusted foundations, outputs, delivery phases, and management metrics. The `.drawio` and `.svg` files use the same fixed layout and copy so visual and editable versions remain consistent.

**Tech Stack:** Markdown, Draw.io `mxGraphModel` XML, SVG 1.1, `xmllint`, Node.js with local `sharp` for PNG preview generation.

## Global Constraints

- Audience is management; use product and business language, not implementation details.
- Capability scope is the complete target blueprint with `已具备 / 建设中 / 待规划` status markers.
- Mark direct AI involvement with `✦ AI`; do not mark ordinary automation as AI.
- Keep the eight first-level modules exactly as approved: 资产接入、资产管理、资产发现、数据治理、资产使用、资产运营、资产服务化、平台底座.
- Keep the six AI Find intents exactly as approved: 找、懂、查、析、用、治.
- MVP emphasizes 找、懂、查、用; 析 is progressive enhancement; 治 is a later governance loop.
- Preserve source, caliber, time, quality, permission, and honest fallback as trust requirements.
- Do not modify unrelated files in the dirty worktree.
- The environment has `/usr/bin/xmllint` but no Draw.io desktop/CLI; retain the native `.drawio` source and generate preview assets separately.

---

## File Structure

- Create: `docs/product/2026-07-23-数据资产平台能力全景与AI找数需求.md`
  - Management-facing capability list, AI Find requirement summary, status legend, and links to diagram assets.
- Create: `docs/product/2026-07-23-AI找数-需求全景.drawio`
  - Editable Draw.io source with a single page named `ai-find-requirements`.
- Create: `docs/product/2026-07-23-AI找数-需求全景.svg`
  - Standalone visual preview using the same content and geometry as the Draw.io source.
- Create: `docs/product/2026-07-23-AI找数-需求全景.png`
  - Raster preview generated from the SVG for direct display in Codex and common office tools.

---

### Task 1: Management-Facing Capability Document

**Files:**
- Create: `docs/product/2026-07-23-数据资产平台能力全景与AI找数需求.md`
- Read: `docs/superpowers/specs/2026-07-23-data-asset-platform-capability-ai-find-design.md`

**Interfaces:**
- Consumes: Approved module names, second-level feature statuses, AI labels, six intent taxonomy, MVP scope, exception rules, and success metrics from the design spec.
- Produces: Final management document referenced by the diagram task and final delivery.

- [ ] **Step 1: Create the management document**

Use `apply_patch` to create the file with these sections and exact ordering:

```markdown
# 数据资产平台能力全景与 AI 找数需求

## 一、管理层摘要
## 二、状态与 AI 标记
## 三、一级模块与二级功能
### 1. 资产接入
### 2. 资产管理
### 3. 资产发现
### 4. 数据治理
### 5. 资产使用
### 6. 资产运营
### 7. 资产服务化
### 8. 平台底座
## 四、AI 找数需求全景
### 1. 产品定位
### 2. 六类意图
### 3. 四个主要功能模块
### 4. 可信底座
### 5. MVP 与后续增强
### 6. 管理指标
## 五、图表文件
```

Copy the approved second-level feature matrix from the design spec without changing module ownership or status. Keep every status explicit and append `✦ AI` only to AI-related rows.

- [ ] **Step 2: Verify document structure and completeness**

Run:

```bash
rg -n '^### [1-8]\. ' docs/product/2026-07-23-数据资产平台能力全景与AI找数需求.md
rg -n '找、懂、查、析、用、治|对话理解|智能检索与路由|查数与分析|可信与用数闭环' docs/product/2026-07-23-数据资产平台能力全景与AI找数需求.md
rg -n 'TBD|TODO|待确认' docs/product/2026-07-23-数据资产平台能力全景与AI找数需求.md
git diff --check -- docs/product/2026-07-23-数据资产平台能力全景与AI找数需求.md
```

Expected:

- The first command prints exactly eight module headings.
- The second command finds the six-intent phrase and all four capability modules.
- The third command prints nothing.
- `git diff --check` exits successfully.

- [ ] **Step 3: Commit the management document**

```bash
git add -f -- docs/product/2026-07-23-数据资产平台能力全景与AI找数需求.md
git diff --cached --check
git commit -m "docs: add management data asset capability overview"
```

Expected: one committed file and no unrelated staged changes.

---

### Task 2: Editable Draw.io AI Find Requirements Diagram

**Files:**
- Create: `docs/product/2026-07-23-AI找数-需求全景.drawio`
- Read: `docs/superpowers/specs/2026-07-23-data-asset-platform-capability-ai-find-design.md`

**Interfaces:**
- Consumes: Six intents, four capability modules, control strip, four output categories, ten trusted foundation capabilities, MVP/phasing, and management metrics.
- Produces: A valid one-page Draw.io `mxGraphModel` that Task 3 mirrors in SVG.

- [ ] **Step 1: Create the Draw.io XML source**

Use `apply_patch` to create a single uncompressed Draw.io page:

```xml
<mxfile host="app.diagrams.net" modified="2026-07-23T00:00:00.000Z" agent="Codex" version="24.7.17">
  <diagram id="ai-find-requirements" name="ai-find-requirements">
    <mxGraphModel dx="1600" dy="1000" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1654" pageHeight="1169" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <!-- title, sections, nodes, and edges -->
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

Use a 1600 × 1000 design area:

- Title and subtitle: `x=40, y=25, w=1520, h=65`.
- Left intent container: `x=40, y=120, w=360, h=470`.
  - Six intent cards in a 2 × 3 grid.
  - `找 / 懂 / 查 / 用` use blue MVP accent.
  - `析` uses orange enhancement accent.
  - `治` uses gray later-phase accent.
- Center capability container: `x=470, y=120, w=650, h=470`.
  - Four capability cards in a 2 × 2 grid.
  - Purple AI accent.
  - Control strip across the bottom of the container.
- Right result container: `x=1190, y=120, w=370, h=470`.
  - Four stacked result cards: 资产结果、可信答案、分析结论、行动闭环.
  - Green value accent.
- Trusted foundation container: `x=40, y=650, w=1520, h=190`.
  - Ten foundation cards in two rows of five.
  - Gray neutral styling.
- Bottom phasing card: `x=40, y=865, w=920, h=90`.
- Bottom metrics card: `x=990, y=865, w=570, h=90`.
- Add left-to-center and center-to-right arrows. Add one upward support arrow from the foundation container to the center capability container.

Use pure text in every `mxCell.value`; do not embed HTML tags. Use rounded rectangles, orthogonal edges, 14–16 px body text, 18–22 px section titles, and these primary colors:

```text
Blue:   stroke #2563EB, fill #EFF6FF
Purple: stroke #7C3AED, fill #FAF5FF
Green:  stroke #16A34A, fill #ECFDF5
Orange: stroke #D97706, fill #FFF7ED
Gray:   stroke #94A3B8, fill #F8FAFC
```

- [ ] **Step 2: Validate XML and required content**

Run:

```bash
xmllint --noout docs/product/2026-07-23-AI找数-需求全景.drawio
rg -n '<diagram[^>]+name="ai-find-requirements"|找 · MVP|懂 · MVP|查 · MVP|析 · 增强|用 · MVP|治 · 后续|对话理解|智能检索与路由|查数与分析|可信与用数闭环' docs/product/2026-07-23-AI找数-需求全景.drawio
rg -n '<[^>]+>' docs/product/2026-07-23-AI找数-需求全景.drawio
```

Expected:

- `xmllint` exits successfully.
- Required intent and capability text is present.
- The last command finds XML elements only; no HTML tags such as `<br>` or `<div>` occur in `mxCell.value`.

- [ ] **Step 3: Commit the editable diagram**

```bash
git add -f -- docs/product/2026-07-23-AI找数-需求全景.drawio
git diff --cached --check
git commit -m "docs: add editable AI find requirements diagram"
```

Expected: one committed `.drawio` file and no unrelated staged changes.

---

### Task 3: SVG and PNG Preview, Visual Verification, and Document Links

**Files:**
- Create: `docs/product/2026-07-23-AI找数-需求全景.svg`
- Create: `docs/product/2026-07-23-AI找数-需求全景.png`
- Modify: `docs/product/2026-07-23-数据资产平台能力全景与AI找数需求.md`
- Read: `docs/product/2026-07-23-AI找数-需求全景.drawio`

**Interfaces:**
- Consumes: The exact copy and geometry from the Draw.io source.
- Produces: Visual preview assets and final document links for delivery.

- [ ] **Step 1: Create a standalone SVG preview**

Use `apply_patch` to create an SVG with:

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
  <rect width="1600" height="1000" fill="#FFFFFF"/>
  <!-- title, intent cards, arrows, capability cards, outputs, foundations, phasing, metrics -->
</svg>
```

Mirror the Draw.io geometry, text, colors, and hierarchy exactly. Use `<text>` and `<tspan>` for line wrapping. Do not use `foreignObject`, embedded HTML, external fonts, or remote assets.

- [ ] **Step 2: Validate SVG**

Run:

```bash
xmllint --noout docs/product/2026-07-23-AI找数-需求全景.svg
rg -n '找 · MVP|懂 · MVP|查 · MVP|析 · 增强|用 · MVP|治 · 后续|对话理解|智能检索与路由|查数与分析|可信与用数闭环' docs/product/2026-07-23-AI找数-需求全景.svg
```

Expected: valid XML and all required labels present.

- [ ] **Step 3: Generate a PNG preview from the SVG**

Run:

```bash
node -e 'import("sharp").then(({default:sharp})=>sharp("docs/product/2026-07-23-AI找数-需求全景.svg").png().toFile("docs/product/2026-07-23-AI找数-需求全景.png"))'
```

Expected: command exits successfully and creates a 1600 × 1000 PNG.

- [ ] **Step 4: Verify file types and dimensions**

Run:

```bash
file docs/product/2026-07-23-AI找数-需求全景.drawio docs/product/2026-07-23-AI找数-需求全景.svg docs/product/2026-07-23-AI找数-需求全景.png
sips -g pixelWidth -g pixelHeight docs/product/2026-07-23-AI找数-需求全景.png
```

Expected:

- `.drawio` and `.svg` are XML/SVG text.
- `.png` is a PNG image.
- Width is `1600`; height is `1000`.

- [ ] **Step 5: Perform visual inspection**

Open the PNG with the local image viewer and check:

- No clipped or overlapping text.
- Six intent cards are distinct and readable.
- Four capability modules are visually dominant.
- Arrows clearly express intent → capability → result and foundation → capability.
- MVP, enhancement, and later-phase distinctions are visible.
- Trusted foundations are readable without competing with the main flow.

If a defect is found, fix both `.drawio` and `.svg`, regenerate the PNG, and repeat Steps 2–5.

- [ ] **Step 6: Add final diagram links to the management document**

Add this content under `## 五、图表文件`:

```markdown
- 可编辑源图：[AI 找数需求全景.drawio](./2026-07-23-AI找数-需求全景.drawio)
- SVG 预览：[AI 找数需求全景.svg](./2026-07-23-AI找数-需求全景.svg)
- PNG 预览：[AI 找数需求全景.png](./2026-07-23-AI找数-需求全景.png)

![AI 找数需求全景](./2026-07-23-AI找数-需求全景.png)
```

- [ ] **Step 7: Final validation and commit**

Run:

```bash
xmllint --noout docs/product/2026-07-23-AI找数-需求全景.drawio
xmllint --noout docs/product/2026-07-23-AI找数-需求全景.svg
test -s docs/product/2026-07-23-AI找数-需求全景.png
git diff --check -- docs/product/2026-07-23-数据资产平台能力全景与AI找数需求.md docs/product/2026-07-23-AI找数-需求全景.drawio docs/product/2026-07-23-AI找数-需求全景.svg
git add -f -- docs/product/2026-07-23-数据资产平台能力全景与AI找数需求.md docs/product/2026-07-23-AI找数-需求全景.svg docs/product/2026-07-23-AI找数-需求全景.png
git diff --cached --check
git commit -m "docs: add AI find diagram previews"
```

Expected: the updated management document plus SVG and PNG previews are committed; no unrelated files are staged.
