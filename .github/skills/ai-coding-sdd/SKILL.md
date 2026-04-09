---
name: ai-coding-sdd
description: >
  Guide the AI to use the SDD-driven workflow for product design, development, or iteration.
  Trigger when the user asks to: design a new product, build a prototype, iterate a feature,
  start a new project, create a demo, or mentions "SDD", "SDD workflow", "SDD方法", "产品设计",
  "开发新功能", "新功能", "从零开始", "做个demo", "写个需求", "开发一个".
---

# AI Coding SDD Workflow (软件设计文档驱动的AI编程)

## 核心目标 (Overview)
这个 Skill 定义了一个标准化的、循序渐进的产品设计与开发协作工作流。它通过合并上下文、明确技术栈、区分新老项目分支以及强制验收测试，来确保 AI 编程的高效性、准确性和可维护性。

## 全局资产复用 (Global Assets Reuse)
所有项目共享统一的 UI/UX 和技术栈规范，AI 在编码和生成 SDD 时必须遵循。
- **全局规范文件：** 优先查找 `{{VSCODE_USER_PROMPTS_FOLDER}}/` 目录下的 `global-ui-ux.md` 和 `global-tech-stack.md`。如果该目录下没有，再查找当前项目根目录或 `.github/` 目录。
- **强制要求：** 每次新对话或新项目开始时，AI 必须尝试读取这些全局规范文件，与 PRD、SDD、Plan 一同作为上下文加载。
- **SDD 中不重复定义：** SDD 的 UI/UX 和技术栈章节只写该项目的特殊定制，通用部分直接声明"继承全局规范"即可。

## 文件组织约定 (File Conventions)
所有项目统一遵循以下文件结构，确保多项目管理不混乱：

```text
项目根目录/
├── docs/
│   ├── [产品名称]-PRD.md        ← 产品需求文档
│   ├── [产品名称]-SDD.md        ← 软件设计文档
│   └── changelog.md             ← 迭代变更记录（分支B时更新）
├── prototypes/                  ← 单文件 HTML 原型目录 (用于快速演示)
│   ├── index.html
│   └── search.html
├── .github/plans/
│   └── [产品名称]_build.plan.md ← 执行计划
└── src/                          ← 工程化代码目录 (Vue/React等)
```

## 动态分支：判断项目所处阶段 (Dynamic Branching)
在开始之前，首先判断用户的需求是"从零开发新项目"还是"日常迭代老项目/小功能"。

### ➡️ 分支 A：从零开发新项目 (0 to 1)
严格执行以下 5 步完整流程。**注意：每完成一步，必须停下来等待用户确认！**

#### 第一步：产品需求文档 (PRD) [🛑 STOP & ASK FOR APPROVAL]
- **目标：** 集中收纳产品目标、问题定义与核心价值定位。
- **行动：** 与用户沟通后，起草 `docs/[产品名称]-PRD.md`。
- **核心要素：** 核心目标、问题定义、产品定位、用户故事/使用场景、页面结构/信息架构、MVP 范围界定、参考产品/竞品。

#### 第二步：软件设计文档 (SDD) [🛑 STOP & ASK FOR APPROVAL]
- **目标：** 将 PRD 转化为详细的技术蓝图。
- **行动：** 起草 `docs/[产品名称]-SDD.md`。
- **核心要素：** 技术栈选型、项目目录结构、UI/交互规范、页面线框图、架构设计与数据流、数据结构/模型、组件拆解与接口。
- **双轨输出策略 (Dual-Track Output)：** 默认情况下，项目设计必须同时支持"快速原型"和"工程化开发"。在架构设计中，需明确规划：
  1. **Prototypes (原型轨)**：每个核心页面对应的独立 `.html` 文件名。
  2. **Engineering (工程轨)**：对应的 `src/` 目录下的组件和路由结构。

#### 第三步：执行计划与验收标准 (Plan) [🛑 STOP & ASK FOR APPROVAL]
- **目标：** 将 SDD 拆解为可操作的编码任务，并绑定测试标准。
- **行动：** 创建 `.github/plans/[产品名称]_build.plan.md`。
- **核心要素：** 划分 Phase、复选框 (`- [ ]`)、任务边界与依赖（单 Task 控制在 1-3 个文件）、验收标准 (AC)。
- **任务编排要求：** 
  - **Phase 1 必须是"原型开发"**：优先在 `prototypes/` 目录下生成各个页面的独立 `.html` 文件，供用户快速预览和确认 UI/UX。
  - **后续 Phase 为"工程化落地"**：在原型确认后，再将原型代码拆解、迁移到 `src/` 目录下的标准工程结构中。
- **Phase 检查点：** 每个 Phase 结束后设置检查点：本地可运行、核心功能可演示、无报错。

#### 第四步：编码与自我检验 (Coding & Self-Verification)
- **目标：** 执行计划，并在交付前进行自我测试。
- **行动：** 严格按照 plan.md 逐步执行。
- **强制要求：** 勾选 `[x]` 之前，AI 必须逐项完成以下检查清单并向用户汇报：

**自我检验清单 (每个 Task 交付前必须确认)：**
- [ ] 页面可正常渲染，无控制台报错
- [ ] 运行 Linter 检查，确保无语法/类型错误
- [ ] 所有交互（点击、输入、跳转）可正常响应
- [ ] 空状态、加载态、错误态均已处理
- [ ] 未引入 SDD 未声明的依赖
- [ ] 代码文件结构符合 SDD 目录规范
- [ ] 符合该 Task 的验收标准 (AC)

#### 第五步：交付与部署 (Delivery)
- **目标：** 完成开发闭环。
- **行动：** 本地运行验证通过后，协助部署到预览环境，生成链接，记录已知限制。

---

### ➡️ 分支 B：日常迭代与小功能开发 (1 to N)
跳过繁琐的从零建档流程，采用轻量级迭代：

#### 第一步：变更影响分析与文档更新
- **行动：** 读取现有的 PRD 和 SDD。评估新功能影响，更新 PRD/SDD，并在 `docs/changelog.md` 记录变更。

#### 第二步：更新执行计划
- **行动：** 在现有的 `plan.md` 中追加 Phase/Task。写明验收标准 (AC) 和 **回归检查清单 (Regression Checklist)**。

#### 第三步：编码与自我检验
- **行动：** 执行新增计划。勾选前完成自我检验清单和回归测试。
- **同步更新：** 如果修改了工程代码 (`src/`)，必须询问用户是否需要同步更新对应的原型文件 (`prototypes/`)。

---

## 错误恢复 (Error Recovery)
当开发过程中出现问题时，按以下策略处理：
1. **编码报错时：** 先读取完整报错信息，定位到具体文件和行号，只修复出错部分，禁止大范围重写。
2. **方向偏离时：** 立即停止编码，回到 SDD 文档重新对齐设计意图。
3. **严重失控时：** 回退到上一个通过验收的 Phase 检查点，丢弃当前 Phase 的所有变更，重新开始。
4. **反复报错（同一问题修复超过 3 次）：** 停止尝试，向用户汇报问题、已尝试的方案和失败原因，请求用户决策。

## 上下文管理 (Context Management)
1. **每次新对话开始时：** AI 必须主动读取全局规范、PRD、SDD、Plan 文档，恢复上下文。
2. **编码时：** 始终在文件顶部注释标注所属模块和 Plan Task ID。
3. **聚焦执行：** 单次对话聚焦一个 Phase，避免跨 Phase 操作导致上下文爆炸。

## 绝对规则与最佳实践 (Absolute Rules & Best Practices)
1. **步步确认 (Iterative Confirmation)：** 绝不允许一口气生成所有文档或代码。完成任何一个节点后必须停下来询问用户。
2. **先读后写 (Read Before Write)：** 跨会话或迭代时，必须主动读取 `.md` 文档，严禁凭空捏造。
3. **避免技术栈幻觉 (No Tech Stack Hallucination)：** 严格遵守 SDD 定义的技术栈，绝不混用框架。
4. **语言要求 (Language Requirement)：** 始终使用**简体中文 (Chinese-simplified)** 进行回复和编写文档。