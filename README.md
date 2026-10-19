# ELYS Skill Foundry — Skills in Motion

[在线片库](https://ruanjianjian.github.io/elys-skill-foundry/)：10 个技能、10 个不同的短片世界。悬停看它能帮你解决什么，再按需安装。

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
| engineering-delivery          | 夜航快递           | **即将淘汰** · PR 评审与交付跟进                                |
| codex-weekly-session-report   | 编辑手账           | **即将淘汰** · 有来源的工作周报                                 |

恢复原始纸白网格、钴蓝/朱红/深墨色板。默认是简洁技能卡，悬停后短片直接在卡片里显出；每片14–16秒，同时只播放一支。网页配乐改用 **Scott Buckley《Supernova》**，作者以 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 免费开放，MP3和页面一起托管，没有视频播放器或外站播放脚本。

**悬停续播，离开即停；声音关闭偏好保存，普通点击和刷新不会重新开声。** 浏览器限制有声自动播放时提示点击开声。手机点按播放/暂停，支持键盘、减少动态、静态模式和离屏/隐藏暂停。短片本身始终静音，下载的原MP4仍保留各自原创配乐。

音乐署名：‘Supernova’ by Scott Buckley — released under CC-BY 4.0. www.scottbuckley.com.au 。原MP3保留；网页播放用户选择的B段节选（原曲1:00.6起），仅首尾短淡化，浏览器调整音量并在预览期间循环播放。[官方曲目](https://www.scottbuckley.com.au/library/supernova/) · [音频许可与出处](media/audio/README.md)。

图画与剧情是能力宣传示意，不代表真实业务实录或验收结论。画面、海报、MP3和页面脚本均由同站提供。原标题与卡片角标保留本地React/Liquid装饰岛和原有液态动效。[制作记录](docs/collection-art.md)。

## 安装入口

原公开文件在 `skills/`，完整配套 ZIP 在 `downloads/`，原有文件保持不变；delivery、代码开发和周报均保留并标记即将淘汰。新增 `ns-spec-cards`、`test-journal` 提供 Nature-Select/ns-skills 源链接及安装说明，需要仓库权限，不重新公开分发源码。`multi-agent-coding` 提供[完整 ZIP](downloads/multi-agent-coding.zip)与[SKILL.md](skills/multi-agent-coding/SKILL.md)，包括脚本、参考说明、模板、Agent元数据及评测材料；不包含本机缓存、登录态或外部插件。Claude→Codex桌面派活所需Codex CLI登录与Companion适配器按包内说明准备。

技能不捆绑或自动安装测试驱动。网页可复用 Chrome DevTools MCP、Playwright 等可用工具；移动端可复用 Mobile MCP、Maestro 或项目已有驱动。只补缺少的工具，安装成功与当前会话可操作分别确认。

## 本地运行

```sh
npm ci
npm run build
npx http-server . -a 127.0.0.1 -p 4173
```

打开 `http://127.0.0.1:4173/`。MP4 已提交，无需重建。检查视频定位时使用支持 HTTP Range/206 的静态服务；Python 简单服务器不提供可靠的 MP4 seek。

## 重新生成短片

需本机 Chrome、Python 3 + NumPy、ffmpeg（libx264/AAC）。`collection-catalog.js` 是生成的片目，`collection-renderer.js` 汇总 `motion-collection/` 确定性 Canvas 场景，`catalog.js` 管技能入口和文案。

先为每片生成配乐，例如：

```sh
python3 scripts/make-collection-score.py --id ns-spec-cards --duration 16 --bpm 126 --genre shibuya-pop --out /absolute/artifacts/scores/ns-spec-cards.wav
FOUNDRY_ARTIFACT_DIR=/absolute/artifacts npm run build:collection
FOUNDRY_ARTIFACT_DIR=/absolute/artifacts node scripts/remix-collection.mjs
# 只重建某片或海报
node scripts/render-collection.mjs --ids=ns-spec-cards
node scripts/render-collection.mjs --posters-only --ids=test-journal
```

`FOUNDRY_ARTIFACT_DIR` 默认本机任务 `~/DevData/Artifacts/20261017-skills-promo/foundry/collection-v3/`，其中 `scores/<id>.wav` 为渲染输入。10 片参数见生成片目。配乐使用独立 NumPy 声源与 FreePats CC0 钢琴/尼龙吉他单音色编曲，没有使用参考歌曲或视频的音轨。音色及来源说明在 `media/instruments/tactile/`。原画已提交在 `media/collection-art/`，决策卡另复用 `media/cinematic-art/` 原画。视频/海报输出到 `media/collection/`，1280×720、30fps，H.264/AAC faststart；WAV、渲染 profile、逐帧截图和日志留在任务产物目录，不发布。

只更新音乐时，先按片目参数生成 `scores/<id>.wav` 及同名 JSON，然后执行：

```sh
FOUNDRY_ARTIFACT_DIR=/absolute/artifacts node scripts/remix-collection.mjs
```

此步骤保留 H.264 视频 packet，只重作 AAC 音轨；两遍响度归一目标 -15 LUFS / -2.5 dBTP，编码后再测量，确认视频 packet SHA 一致。旧 MP4、原始 WAV、响度及 hash 记录留在指定产物目录。`music-v3` 三项主推分别使用明亮流行、侦探 Big Beat、工业半拍；其余覆盖 Jungle、夜驾 Synthwave、无鼓钢琴、朋克、Glitch、Bossa 与 Swing 爵士。[配乐方向表](docs/motion-films.md#2026-10-17-历史资产十种独立声音)记录速度与乐器差异。

音乐分别定义在 `scripts/score_neon.py`、`scripts/score_kinetic.py`、`scripts/score_tactile.py`、`scripts/score_precise.py`。每首自行定义声源、鼓组和段落，`make-collection-score.py` 仅路由、校验与写 WAV。

`CHROME_PATH` 可覆盖 Chrome 入口。旧片与旧试片保留作历史参考，首页使用十支新片。`gooey-title.jsx` 与 `build:gooey` 负责重建本地液态标题/角标运行包，`surface-motion.js` 管理列伸缩和反馈；不恢复旧七卡 React Grid。

## 交付与验证

规格、验收边界及独立测试报告见 [docs/motion-films.md](docs/motion-films.md)。GitHub Pages 从 `main` 根目录发布，兼容 `/elys-skill-foundry/` 子目录。旧 `?cut=cinematic` 链接也显示整套新片。

The website preloads the user-selected B edit of Supernova: 507 KB, 25.263 seconds, original 60.600–85.863s, with only 8ms edge fades. The previously rejected bass-heavy 123.789s opening is no longer referenced. It does not load the 9.4 MB full track on hover. Audio starts alongside the video request, without waiting for the video buffer. First-visit sound is ON; an explicitly saved OFF choice is respected. Browser autoplay restrictions may still require the first click on a skill preview.
