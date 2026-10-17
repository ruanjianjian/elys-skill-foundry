# Skill Foundry 动效片库

用户目标：直接看画面理解技能用途，选择需要的技能并安装；短片可下载用于宣传。目标站点 https://ruanjianjian.github.io/elys-skill-foundry/ 。

范围：既有7个技能 + ns-spec-cards、test-journal，共9项。每项独立12秒、1280×720 / 30fps MP4，120 BPM原创合成节拍。银铬、黑、电蓝、酸绿；每3秒一个段落，动态图形说明问题→方法→结果。图形为能力示意，不代表真实测试或部署实录。

| ID | 级 | 验收标准 | 落点 | 状态 |
| --- | --- | --- | --- | --- |
| FOUNDRY-01 | 核 | 首屏展示大幅短片；9项都有不同图形剧情的短片和海报，可切换、播放、暂停、拖动进度和下载MP4。 | Web 页面 | Agent 本机走查通过 |
| FOUNDRY-02 | 核 | 默认静音，可主动开启节拍；静态/系统减少动态呈现结果帧，离屏/隐藏暂停；390px视口无横溢出。 | Web 页面 | Agent 本机走查通过 |
| FOUNDRY-03 | 核 | 保留7项SKILL.md复制与完整ZIP下载，新2项提供源仓库及安装说明；实际页面示例可放大关闭；群介绍可复制。 | Web 页面 | Agent 本机走查通过 |

私库中的新2项只提供链接，不将技能源码重新公开分发。现有7个技能与ZIP内容不变。页面不自动安装驱动，不收集用户输入；视频默认静音，主动点按才开启声音。

生成：`npm ci`；`npm run build:films`（需本机Chrome、Python3与ffmpeg）。脚本确定性绘制每帧后编码H.264/AAC，输出到任务 Artifacts/foundry/videos 并复制为站点 media/films；海报在media/posters，四幕静帧在Artifacts/foundry/review。可用`CHROME_PATH`、`FOUNDRY_ARTIFACT_DIR`覆盖本机入口及产物位置。浏览器渲染profile稳定复用任务Artifacts/foundry/chrome-render-profile，不使用登录态。

测试报告：[下载独立 HTML](test-reports/2026-10-17-web-494401c.html)（下载后用浏览器打开；受测代码：[494401c](https://github.com/ruanjianjian/elys-skill-foundry/tree/494401ca7902b214e00080a2c43e18f55bcd1626)）。

`tj check`：3条AC全部覆盖，缺0、提醒0。当前报告只有PROMO-03一条核心动线、3步截图、0段模型调用，历史尝试不进入正式报告。本机17项集成检查通过：9支影片均实际解码播放、9张海报解码、14个旧SKILL/ZIP资源可读；390/320px无横向溢出、系统减少动态停止于10.2秒结果帧、默认静音与主动开声正常、console/pageerror为0。安装说明、群介绍复制和实际页面示例开关另经浏览器实走。

本报告验证片库网页与媒体、安装资料入口，不代表9个技能的具体业务验收均通过。用户审美验收、物理手机浏览器未进行。
