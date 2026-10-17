# Skill Foundry 悬停片库与新版试片

用户目标：在技能本身的卡片里直接看动效，理解用途并按需安装。目标站点 https://ruanjianjian.github.io/elys-skill-foundry/ 。

首页取消独立播放器，9个技能各自承载视频。桌面悬停、键盘聚焦直接预览；手机点按播放/暂停。每次只播一支，离开或离屏暂停。BGM独立共享，默认尝试播放；浏览器拦截有声自动播放时明确等待第一次点击，允许随时关闭并记住偏好。系统减少动态/静态模式不自动播放，仍可手动观看。

用户否定首批3种风格样片后，先制作一支16秒原创角色/场景叙事试片。通过 `?cut=cinematic#ns-spec-cards` 在同一张决策卡里观看；其余8项仍用原片。未将这支试片当作用户已选定整套风格。图形和插画都是能力宣传示意，不代表业务运行或验收实录。

| ID | 级 | 验收标准 | 落点 | 状态 |
| --- | --- | --- | --- | --- |
| FOUNDRY-01 | 核 | 无独立大播放器；9张技能卡能悬停/聚焦直接预览，切换时只播放一支，离开暂停；手机可点按播放暂停。 | Web 页面 | Agent 浏览器走查通过 |
| FOUNDRY-02 | 核 | BGM默认开启意图，受浏览器限制时首次点击启动；可关闭且重载保留；视频静音避免重叠；减少动态不自动播放，390/320px布局无横向溢出。 | Web 页面 | Agent 浏览器走查通过 |
| FOUNDRY-03 | 核 | 保留7项SKILL.md复制与完整ZIP下载，新2项提供源仓库及安装说明；2个实际页面示例可放大关闭；复制备用入口可用。 | Web 页面 | Agent 浏览器走查通过 |
| FOUNDRY-04 | 核 | 新版试片链接在同一技能卡加载16秒原创角色叙事短片；能实际解码播放，海报可读，MP4可下载；其余8片保持原资源。 | Web 页面 | Agent 浏览器走查通过 |

新片镜头：被纸卡淹没的工作台 → 眼睛极近景 → 抽卡 → 选择/留言/确认 → 三张纸卡逐张归位 → 同一工作台清爽回场 → 实体索引卡片尾。原创插画用内置imagegen制作，镜头、前景纸卡、透视翻面、文字和转场用确定性Canvas代码绘制；16秒120BPM原创合成配乐按镜头安排停顿和重音。不复用参考视频的角色、画面或音轨。

参考研究：实际播放用户提供的三条小红书视频，并核对多个时间点；学习连续角色、统一美术、远中近切镜、具体动作隐喻。浏览器研究工具没有音频回传，未声称听证参考音乐；新配乐独立原创。

- https://www.xiaohongshu.com/explore/6ab8e48f000000001c00c560
- https://www.xiaohongshu.com/explore/6ab8e3c900000000190301db
- https://www.xiaohongshu.com/explore/6acfdf200000000015011206

私库中的新2项只提供链接，不将技能源码重新公开分发。现有7个技能与ZIP内容不变。

本地生成：`npm ci`、`npm run build`；原9片 `npm run build:films`；新版试片 `npm run build:pilot`（需已准备的原创插画JPG、任务Artifacts中的score.wav、本机Chrome与ffmpeg）。资源在media/cinematic-art和media/pilots；渲染文件及稳定Chrome profile在任务Artifacts/foundry/cinematic及chrome-cinematic-render-profile。`FOUNDRY_ARTIFACT_DIR`、`CHROME_PATH`可覆盖入口。

测试报告：[下载独立HTML](test-reports/2026-10-17-web-2b0ae9d.html)（下载后用浏览器打开；受测代码：[2b0ae9d](https://github.com/ruanjianjian/elys-skill-foundry/tree/2b0ae9de4c7618735cb88c4779d824ef6e2126b2)）。

`tj check`：4条AC已覆盖，缺0、提醒0；正式报告仅最新PROMO-04一条核心动线、4步截图、0段模型调用。主页22项集成与新版试片8项集成全部通过，console/pageerror为0；9片真实悬停解码、390/320布局、BGM首击启动与关闭持久化、触屏、减少动态、安装和示例入口均实测。试片在原HTTP地址真实播放并定位6.8/12.5/14.8秒截图，本地静态服务提供Range/206，与视频定位要求一致。

原创资产及内置imagegen提示词见[制作记录](cinematic-art.md)。配乐为纯合成原创，完成16秒/48kHz/立体声与峰值0.68信号验证；未做耳听评价。浏览器报告不代表用户已认可新片审美，也不代表9个技能各自业务已验收；物理手机浏览器未测试。历史报告保留，不混为当前结论。
