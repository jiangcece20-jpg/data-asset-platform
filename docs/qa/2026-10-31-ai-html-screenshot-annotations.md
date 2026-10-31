# 当前Vue实拍与图内标注修正

日期2026-10-31；分支codex/ai-v104-ui-integration。用户指出此前新版截图不像最新UI且没有标记。本轮定位到：主画面仍为旧简图，真实截图放在折叠区；86组标记都在旧简图，不能据此证明新截图已标注。

1. **主画面：已修正。** 14张当前整合版实拍直接展示，均不位于details中；旧简图默认收起，完整业务规则仍可直接阅读。没有对应当前实拍的场景明确注明。没有假装补齐所有场景实拍。
2. **图内标记：已修正。** 每张实拍都有2—4个图内标记，共38个；编号、原图坐标、说明和规则引用由同一截图标记JSON生成。图与说明可双向定位。原86个辅助规则锚点保留，总124组均有匹配引用，无重复ID或失效链接。
3. **来源：已核对。** 再次打开5191的当前Vue首页，对照白底、透镜、推荐问题、输入框和侧栏；Vue源码相对05b6565未变。14张原图哈希与采集来源保持不变，标记以HTML叠加，不修改原图像素。无标注原图入口明确标名。
4. **浏览器：已复验。** 1440×1100桌面、390×844窄屏；14图全部加载，38标记在图内且不藏在折叠区。移动端避开文字微调3处。PC窄屏独立滚动区域342px、内容1000px，右箭头后scrollLeft0→40，标记相对图片坐标253.664px保持不变；全页仍390px。图内3号与说明行实测双向target定位。浏览器错误日志为空。

主版本：Obsidian中的visual-prd.html及assets/vue-2026-10-31-layout-review/screenshot-annotations.json；复核记录与版本索引已同步。

证据：[PC实拍直接标注](assets/2026-10-31-ai-html-screenshot-annotations/result-annotated-pc.jpg)、[手机实拍标记](assets/2026-10-31-ai-html-screenshot-annotations/mobile-annotated.jpg)、[当前Vue首页复核](assets/2026-10-31-ai-html-screenshot-annotations/current-vue-home.jpg)、[结构校验](assets/2026-10-31-ai-html-screenshot-annotations/validation.json)、[14图逐张位置检查](assets/2026-10-31-ai-html-screenshot-annotations/browser-pins-pc.json)、[滚动检查](assets/2026-10-31-ai-html-screenshot-annotations/mobile-scroll.json)。

Vue、功能／算法业务规则、主流程及原始图片文件均未修改；未合main、推送或部署。动态原型的表单、订单等运行时项目不适用于本次无脚本HTML阅读页，未用旧Vue测试代替本轮标注验证。未宣称所有业务场景已有对应实拍或完成真机、后台验收。
