# HTML阅读结构与当前截图复核

分支 codex/ai-v104-ui-integration；日期2026-10-31。产品主版本仍在Obsidian。

1. HTML按“入口与布局 → 通用能力 → 业务流程与场景”重排，最后集中验收边界、来源及历史归档。当前截图就近展示，规则简图明确不代表Vue实际布局。
2. 原s0聚焦直接搜索；处理步骤、输入限制和只读条件等通用说明集中到common-progress。保留全部86个标注锚点，迁移后按作用域连续编号。独立只读复核发现条件归属／必须偏好说明遗漏，已补回；两处旧章节指引同时更新。
3. 复走PC首页、会话、结果、过程折叠、双项放宽、对话组合暂存、统一确认和采数，以及移动端首页、展开步骤、详情和修改范围澄清。原12张当前图均重拍，新增PC会话和移动端首页，共14张；采集HEAD5eb4bb3，实现05b6565，UI来源4ce2318。
4. 功能与算法PRD各只增加配套图文阅读链接，正文规则及编号保持不变。HTML原SVG和功能／算法／模块的Mermaid定义未变。Vue源码相对05b6565以及工作区均无变化。
5. 本机5192预览：PC1440×1000和窄屏390×844；14图加载和比例正常，标注跳转及target强调有效，窄屏全页390px，流程大图局部1280px可滚动。控制台错误为空。检查274条本地引用，无缺失资源、重复ID或失效页内锚点。

证据：[布局](assets/2026-10-31-ai-html-reorganization/html-layout-pc.jpg)、[通用规则](assets/2026-10-31-ai-html-reorganization/html-common-final-pc.jpg)、[流程图](assets/2026-10-31-ai-html-reorganization/html-flow-pc.jpg)、[窄屏](assets/2026-10-31-ai-html-reorganization/html-layout-mobile.jpg)、[结构校验](assets/2026-10-31-ai-html-reorganization/validation.json)、[截图清单](assets/2026-10-31-ai-html-reorganization/manifest.json)。

仅本地文档与图像更新。未改Vue、不重跑无关全量代码测试，未合main、推送或部署。窄屏为浏览器模拟，不代表移动真机或后台服务验收。
