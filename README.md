# ELYS Skill Foundry — Skills in Motion

[在线片库](https://ruanjianjian.github.io/elys-skill-foundry/)：9个技能、9支12秒动效短片。用画面说明麻烦怎样变成清楚的下一步，再按需安装。

- `ns-spec-cards`：讨论 → 逐张确认。
- `test-journal`：截图 → 最新核心动线报告。
- `web-testing`：网页 → 用户动线与可见结果。
- `mobile-testing`：App / 系统交互 → 分层验证证据。
- `elys-backend-technical-design`：散乱改动 → 当前代码上的契约方案。
- `elys-code-development`：实现 → 红绿测试与端到端证据。
- `elys-evaluation`：主观判断 → 同批样本比较。
- `engineering-delivery`：PR → 评审与交付结论。
- `codex-weekly-session-report`：零散会话 → 有来源的工作周报。

短片使用银铬、黑、电蓝和酸绿，按120BPM节拍编排图形变化；每片独立MP4可下载。图形与示例数据为**能力示意**，不代表真实业务验收、部署或线上效果。默认静音，主动点“开启节拍”才出声；支持原生播放/暂停/进度/全屏，静态模式、系统减少动态设置、离屏和隐藏暂停。

首页不依赖CDN、外部字体或运行时框架，使用同站H.264/AAC视频和海报，手机端优先展示短片。

## 安装入口

既有7项的公开文件在 `skills/`，完整配套ZIP在 `downloads/`；这次不改动这些技能源码和包内容。可复制对应SKILL.md，完整references/scripts应下载ZIP。

新增 `ns-spec-cards`、`test-journal` 只提供 Nature-Select/ns-skills 源链接和安装说明，需要对应仓库权限，不在此重新公开分发源文件。

技能说明不捆绑或自动安装驱动。网页需可用浏览器工具（如 Playwright / Chrome DevTools MCP），移动端需 Mobile MCP、Maestro 或项目已有驱动及实际设备/构建。安装工具不代表当前会话已就绪，模拟器、真机、离线和线上结论分别记录。

## 本地运行

```sh
npm ci
npm run build
python3 -m http.server 4173 --bind 127.0.0.1
```

打开 `http://127.0.0.1:4173/`。`npm run build` 检查源文件语法；已提交的MP4无需重建即可预览。

## 重新生成短片

需本机Chrome、Python3、ffmpeg（libx264/AAC）。

```sh
npm run build:films
# 只更新海报/四幕静帧
npm run posters
# 只生成一项
node scripts/render-films.mjs --skill=ns-spec-cards
```

`catalog.js` 是技能目录与文案；`film-renderer.js` 是无外部资源、无随机状态的逐帧Canvas2D绘制。`scripts/make-beat.py` 使用纯合成的鼓组、贝斯生成原创节拍，不使用第三方采样或音乐。每片1280×720、30fps、12秒，ffmpeg编码H.264/AAC与faststart。视频默认输出到 `~/DevData/Artifacts/20261017-skills-promo/foundry/videos/`，再复制到 `media/films/`；海报在 `media/posters/`，四幕静帧在任务Artifacts的 `foundry/review/`。WAV、渲染profile和日志不发布。`FOUNDRY_ARTIFACT_DIR`、`CHROME_PATH` 可指定产物目录和Chrome入口。

旧液态标题源文件保留作为参考，新首页不加载旧React/gooey运行包。`build:gooey` 仅用于维护旧效果。

## 交付与验证

规格与报告见 [docs/motion-films.md](docs/motion-films.md)。GitHub Pages 从 `main` 分支根目录发布，所有路径兼容 `/elys-skill-foundry/` 子目录。
