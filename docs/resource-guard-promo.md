# 资源看板 · 宣传短片与安装入口

## 用户原始需求

“参考这个东西，加上好看的宣传视频。更新这个网页。”

参考与发布地址：https://ruanjianjian.github.io/elys-skill-foundry/?v=foundry-12
产品来源：https://github.com/ruanjianjian/mac-dev-resource-guard

## 范围

在原有片库中新增资源看板，保留决策卡、测试日志的重点展示和三项旧技能的淘汰标记。
新增原创 16 秒宣传片、海报、公开安装入口及可复制的推广文案；提供短片单独下载。
宣传画面是能力示意，不是产品录屏或性能测量。不承诺释放空间数量，不扩充工具实际清理范围。
站点保持原有配色、卡片交互、Supernova 网页配乐、静态模式和手机点按操作。

## 验收标准

| ID | 级 | 验收标准 | 落点 | 状态 |
| --- | --- | --- | --- | --- |
| AC-01 | 核 | 桌面片库展示 11 项且原内容保留；资源看板悬停播放、离开暂停；可复制安装与推广文案，下载完整可解码 MP4。文案说明默认隐藏、快捷键、安装前提与回收边界。 | web-desktop | ✅ agent浏览器实测；未收到人工确认 |
| AC-02 | 核 | 手机宽度 390 / 320 px 无横向溢出；点按播放、再次点按暂停；静态/减少动态模式不自动播放，仍能主动播放及查看安装说明。 | web-mobile | ✅ Chromium手机模拟实测；未覆盖物理手机 |

## 核心测试用例

- TC-01 / discover-share / web-desktop：打开片库，核对新旧卡片；悬停和离开资源看板；打开使用说明；复制安装与推广文字；实际下载短片，核对字节和媒体信息。
- TC-02 / preview-install / web-mobile：通过资源看板直达链接进入，点按播放与暂停；打开说明；检查 390 / 320 px；启用静态模式及系统减少动态，再确认主动播放。
- 发布后补验：线上资源与本地哈希一致、卡片播放、深链接、真实 MP4 下载和原有卡片播放；结果保存在本轮测试报告。

## 动效设计

四幕各 4 秒，120 BPM、1280×720、30 fps。入场 0.3 秒，出场 0.23 秒，局部按键依次入场；
图形确定性渲染，网页离屏/隐藏自动暂停，用户可随时打断；减少动态时保留静态卡片。

1. 唤起：开发现场轻一点；显示快捷键与内存、磁盘入口。
2. 维护：安装后自动维护，每12小时检查过期Xcode缓存；后台与运行中任务分别显示状态。
3. 复核：先复核占用与保护，再将可回收模块收进托盘；活跃、受保护、状态不明内容保留；说明构建需接入入口。
4. 收尾：资源看板名称、快捷键、安装后自动维护及公开仓库。

## 资产与复现

原画：内置 imagegen 生成，编码为 JPEG 后保存于
`media/collection-art/mac-dev-resource-guard.jpg`。
海报与视频：`media/collection/mac-dev-resource-guard.jpg` / `.mp4`。
动作：`motion-collection/resource.js`；原创合成配乐：`scripts/make-resource-score.py`。
无新增运行时依赖；网页仍使用原有同源 Supernova 配乐，下载 MP4 内含原创配乐。

```sh
python3 scripts/make-resource-score.py --out /absolute/artifacts/scores/mac-dev-resource-guard.wav
FOUNDRY_ARTIFACT_DIR=/absolute/artifacts node scripts/render-collection.mjs --ids=mac-dev-resource-guard
FOUNDRY_ARTIFACT_DIR=/absolute/artifacts node scripts/remix-collection.mjs --ids=mac-dev-resource-guard
```

视频 H.264 + AAC、faststart；配乐响度目标 -15 LUFS，峰值不高于 -1 dBTP。
只按元数据与解码检查声音，不将其称为人工耳听验收。
新增 MP4 约 1.4 MB，原画和海报按需加载；不在加载页面时下载全部视频。
生成原画仅制作时调用 imagegen，网站访问不调用生成服务。

## 原画完整提示词

```text
Use case: ads-marketing. Asset type: original cinematic 16:9 background plate for a miniature product film about a Mac developer resource-cleanup menu-bar app. A beautifully art-directed miniature precision workshop on a deep petrol teal tabletop, tactile brushed aluminum and warm ivory resin. Wide near-overhead three-quarter camera, understated modern Japanese industrial product photography, long soft afternoon studio shadows, premium materials and restrained grain. Center-right contains a large perfectly EMPTY flat working mat in muted teal, covering the middle and lower-right 65% so animated cache blocks and a small floating panel can be composited later. At far right a small shallow EMPTY brushed aluminum sorting tray with clear rim; at back right a few compact dark teal stacked machine modules with a single small emerald pilot light, these represent work in progress that stays untouched. At far left edge a cropped low-profile silver keyboard with blank unmarked keys, and one minimal cylindrical dial; keep upper left 40% open dark teal negative space for large readable typographic captions to be overlaid. Quiet sculptural realism, purposeful geometric composition, no human, no robot, no rubbish, no broom, no computer interface, no glowing HUD, no circuit-board wallpaper, no flowchart or arrows. No text, no letters, no numbers, no logos, no watermark. All stationary objects should stay close to the edges; the central work area must be large, empty, and uninterrupted. Landscape 16:9.
```

## 2026-10-27 · 1.3 安装说明同步

用户原话：“把新版安装说明和介绍同步到 GitHub README 和之前的宣传网页，给我一个能直接转发给同事的链接，全程后台做，别弹面板。”

AI 转述（非需求真值）：将页面、复制安装说明、群介绍和短片统一为已合入的1.3能力，新增终端安装/接入/升级示例；不修改清理引擎。使用独立无界面浏览器验收，不操作用户桌面。

| ID | 级 | 验收标准 | 落点 | 状态 |
| --- | --- | --- | --- | --- | --- |
| AC-P13-01 | 核 | 桌面直达资源看板1.3，展开说明并复制安装、推广文字，包含完整安装、项目接入、升级、保护边界；短片结尾不再写默认不开自动回收 | web-desktop | ✅ 独立headless Chromium实测，复制接收器隔离，视频下载哈希一致 |
| AC-P13-02 | 核 | 手机390/320px说明和命令完整，无横向溢出，复制文本一致，视频可解码 | web-mobile | ✅ headless Chromium 390/320px实测；未覆盖实体手机 |

TC-P13-01 / guard-install / web-desktop：打开资源卡片，展开说明、复制两类文案、播放及下载新版短片并核对哈希。
TC-P13-02 / guard-install / web-mobile：390/320px展开说明与命令，检查溢出、复制、主动播放。
发布后核对 Pages 部署提交、线上脚本/视频哈希与直达入口。视频仍是能力示意，不是原生录屏。
