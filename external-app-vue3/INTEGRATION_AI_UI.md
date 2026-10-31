# PC 找数页面整合说明

日期：2026-10-31。交付分支：`codex/ai-find-figma-local`。
基线提交：`6ec9586`（Merge AI find batch scope cleanup）。
本次为本地前端版本，未部署、未推送；不代表服务端接口已接通。

## 交付范围

本次提交保存同一工作区此前已确认的两部分改动：

1. PC 找数买数列表：Figma 风格、筛选/搜索/视图交互完善、空结果提交需求入口、内部资源信息预览；商城收藏在列表、详情、“我的收藏”之间联动，并按身份在浏览器本地存储。
2. PC AI 找数：白底对话布局、历史会话侧栏、可折叠处理步骤、玻璃透镜动效、豆包参考的建议问题短条、白底蓝色光晕输入框；去掉 PC AI 页顶部、侧栏、结果卡片、详情弹窗的收藏操作，精简辅助文字。

商城的收藏功能保留。AI 页隐藏收藏不删除既有收藏数据；共享卡片和详情流程通过 `showFavorite` 参数控制，默认开启，PC AI 传入 `false`，移动端保留原行为。

## 主要文件与依赖

- `src/components/ai-v104/AiFindPrototype.vue`：布局、事件接线、入口及展示开关。
- `src/components/ai-v104/ai-find-figma.css`：桌面样式，主要由 `.figma-ai` / `.ai-find-shell` 限定；辅助描述目前通过样式隐藏，必要业务状态保留。
- `src/components/ai-v104/AiProcessingSteps.vue`：折叠过程组件，接收现有 frame，不代替搜索状态机。
- `src/components/ai-v104/PrototypeProductCard.vue`、`PrototypeProductFlow.vue`：`showFavorite` 参数必须同步合并和透传。
- `src/App.vue`、`src/layouts/PortalShell.vue`：AI 路由的页面 class；App 还包含商城收藏身份切换的监听，处理冲突时不要整文件覆盖。
- `src/views/portal/PortalSearch.vue`、`portal-market-figma.css`：PC 商城列表。
- `src/stores/catalog.ts`、`src/components/mine/FavoritesPanel.vue`、`MineShell.vue`、`src/views/portal/PortalProductDetail.vue`：商城收藏与详情联动。
- `public/ai-search-lens-caustics-soft.png`：最终确认的透明玻璃素材，淡灰蓝投影及折射亮纹已包含在图内；浮动、扫光、数据粒子由 CSS 实现，不依赖 MP4。
- `public/hero-data-core.png`：PC 商城首页素材。

早期 AI 素材试稿不在本次提交内，整合时不需要复制。

## 和功能分支整合时

以目标分支最新业务逻辑为准，逐段合并布局和样式，不要把本分支的页面文件直接覆盖过去。本次没有修改 `demoConversation.ts` 等搜索状态机文件，也没有移除“修改条件、条件放宽”逻辑；若目标分支正在移除这些功能，继续采用目标分支的流程、数据结构、按钮和对应测试，再套用这里的视觉。

重点核对：

- `AiFindPrototype.vue` 的 `compact` 分支、会话切换/删除/草稿、发送/停止/重试、澄清、结果、采数及商品详情/获取流程。
- 处理步骤组件使用的 frame 字段与目标分支是否一致；失败、停止不能显示为已完成。
- 页面 CSS 中关于条件面板的选择器仅为样式，不能作为保留或重新引入功能的依据。
- 商城收藏和 AI 演示会话原有收藏属于不同状态来源，本次未统一后端收藏接口；不要假设二者共享状态。
- 收藏的 localStorage 为本地演示持久化，服务端整合时需要按实际认证身份和接口实现迁移。
- 当前按根路径提供 `/ai-search-lens-caustics-soft.png` 和 `/hero-data-core.png`；若目标部署使用子路径，调整资源 URL/base 配置并实测。
- `App.vue` 和 `PortalShell.vue` 同时包含商城和 AI 页面改动。若只摘取 AI UI，保留 AI 路由 class、所需 CSS/组件/素材，商城部分另行选择。

## 验证与验收

2026-10-31 本地验证：

- `npm test`：153 个测试文件、1468 项测试通过。
- `npm run build`：通过；现有大包体警告仍存在。构建脚本使用 `vue-tsc -b --noCheck`，不能将此结果视为严格类型检查通过。
- `git diff --check`：通过。
- 浏览器已检查白底首页、玻璃淡投影、推荐短条、收藏入口移除和蓝色发光输入框。

整合后至少复验：PC/移动端布局、建议问题点击、普通/多任务搜索、澄清、停止/失败重试、会话和草稿、无结果提交需求、商品详情/获取；确认 PC AI 所有可见路径没有收藏按钮，商城收藏仍能按身份保存并在“我的收藏”查看。

本地启动：在 `external-app-vue3` 运行 `npm run dev -- --host 127.0.0.1`。
页面：`http://127.0.0.1:5180/#/portal/ai-chat?entry=ai`，列表为 `#/portal/search`。
本次不包含正式环境部署。请先在整合分支解决兼容问题并验证，再安排测试环境验收。
