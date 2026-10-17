# ELYS Skill Foundry — Skills in Motion

[在线片库](https://ruanjianjian.github.io/elys-skill-foundry/)：9 个技能、9 个不同的短片世界。悬停看它能帮你解决什么，再按需安装。

| 技能                          | 画面世界           | 核心价值 / 状态                                                 |
| ----------------------------- | ------------------ | --------------------------------------------------------------- |
| ns-spec-cards                 | 手绘人物与实体卡片 | **重点展示** · 简短问题、逐卡交互，快速与 AI 对齐               |
| test-journal                  | 纸片侦探           | **重点展示** · 体验出发，抓关键 Bug，沉淀复测动线               |
| multi-agent-coding            | 实体会话调度台     | Claude 派活给可见 Codex session，跟进进度、取回结果、原会话续修 |
| web-testing                   | 黏土浏览器游乐场   | 必要步骤抓住真实体验卡点                                        |
| mobile-testing                | 午夜城市与手机门   | 从 App 到系统交互，体验走到底                                   |
| elys-backend-technical-design | 实体建筑模型       | 看清责任与边界，再动工                                          |
| elys-code-development         | 机械修理厂         | **即将淘汰** · 原功能按需查看                                   |
| elys-evaluation               | 光学实验           | 同批样本比较，差异可回溯                                        |
| codex-weekly-session-report   | 编辑手账           | **即将淘汰** · 有来源的工作周报                                 |

恢复原始纸白网格、钴蓝/朱红/深墨色板。默认是简洁技能卡，悬停后短片直接在卡片里显出，没有专门视频区。每片 14–16 秒，独立原创配乐；同时只播放一支。**悬停播放，离开即停，声音只属于当前短片。** 声音关闭偏好保存，普通点击不会重新开声。浏览器限制有声自动播放时提示点击开声。手机点按播放/暂停，支持键盘聚焦、减少动态、静态模式和离屏/隐藏暂停。

图画与剧情是能力宣传示意，不代表真实业务录屏或验收结论。页面无外部 CDN 或字体依赖，使用同站 H.264/AAC 视频和海报。原标题与卡片角标由本地 React/Liquid 装饰岛恢复液态形变，保留视频 DOM 及声音状态；标题轮换、列伸缩、点击反馈统一响应动态开关。原创资产、完整提示词见 [制作记录](docs/collection-art.md)。

## 安装入口

原公开文件在 `skills/`，完整配套 ZIP 在 `downloads/`，此次未改动这些文件；delivery已从页面移除，旧文件仅保留历史。新增 `ns-spec-cards`、`test-journal` 提供 Nature-Select/ns-skills 源链接及安装说明，需要仓库权限，不重新公开分发源码。`multi-agent-coding` 已补充介绍、用法与短片；安装分发路径待确定，当前不提供未经核实的下载链接。

技能不捆绑或自动安装测试驱动。网页可复用 Chrome DevTools MCP、Playwright 等可用工具；移动端可复用 Mobile MCP、Maestro 或项目已有驱动。只补缺少的工具，安装成功与当前会话可操作分别确认。

## 本地运行

```sh
npm ci
npm run build
npx http-server . -a 127.0.0.1 -p 4173
```

打开 `http://127.0.0.1:4173/`。MP4 已提交，无需重建。检查视频定位时使用支持 HTTP Range/206 的静态服务；Python 简单服务器不提供可靠的 MP4 seek。

## 重新生成短片

需本机 Chrome、Python 3、ffmpeg（libx264/AAC）。`collection-catalog.js` 是生成的片目，`collection-renderer.js` 汇总 `motion-collection/` 确定性 Canvas 场景，`catalog.js` 管技能入口和文案。

先为每片生成配乐，例如：

```sh
python3 scripts/make-collection-score.py --id ns-spec-cards --duration 16 --bpm 120 --genre ink-rock --out /absolute/artifacts/scores/ns-spec-cards.wav
FOUNDRY_ARTIFACT_DIR=/absolute/artifacts npm run build:collection
# 只重建某片或海报
node scripts/render-collection.mjs --ids=ns-spec-cards
node scripts/render-collection.mjs --posters-only --ids=test-journal
```

`FOUNDRY_ARTIFACT_DIR` 默认本机任务 `~/DevData/Artifacts/20261017-skills-promo/foundry/collection-v3/`，其中 `scores/<id>.wav` 为渲染输入。9 片参数见生成片目。配乐使用标准库纯合成，无第三方音乐采样。原画已提交在 `media/collection-art/`，决策卡另复用 `media/cinematic-art/` 原画。视频/海报输出到 `media/collection/`，1280×720、30fps，H.264/AAC faststart；WAV、渲染 profile、逐帧截图和日志留在任务产物目录，不发布。

`CHROME_PATH` 可覆盖 Chrome 入口。旧片与旧试片保留作历史参考，首页使用九支新片。`gooey-title.jsx` 与 `build:gooey` 负责重建本地液态标题/角标运行包，`surface-motion.js` 管理列伸缩和反馈；不恢复旧七卡 React Grid。

## 交付与验证

规格、验收边界及独立测试报告见 [docs/motion-films.md](docs/motion-films.md)。GitHub Pages 从 `main` 根目录发布，兼容 `/elys-skill-foundry/` 子目录。旧 `?cut=cinematic` 链接也显示整套新片。
