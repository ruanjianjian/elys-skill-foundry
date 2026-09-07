---
name: mobile-testing
description: Mobile 客户端综合测试与验收统一入口。用于 Flutter、iOS SwiftUI/UIKit、Android 原生或混合 App 的用户流程、系统弹窗、UI/视觉、无障碍、生命周期和性能验证，支持模拟器/真机探索与 Maestro 回归。用户说“移动端验收”“Flutter/iOS 交互测试”“App 视觉验证”时使用；移动网页归 web-testing。
---

# Mobile 综合验收

围绕用户旅程验证真实界面，把 Flutter、原生页面、系统 UI 与平台插件之间的切换纳入同一份验收报告。只请求测试时不修改产品代码；用户要求修复时才实施。

## 统一执行流程

1. 从任务和仓库指令确认 App、构建版本、bundle/application ID、平台、账号/后端环境、核心旅程及验收条件。确认实际测试的是生产宿主、测试壳还是有 stub 的演示构建。
2. 检查现有设备和构建工具，列出设备再选择精确 ID；多台活跃设备时优先任务所属设备，归属不明确不要占用他人的运行会话。记录 OS、设备型号、构建模式、语言、字体倍率、主题和方向。不要用“列出了真机”代替真机可交互证据。
3. 为每条旅程标记实际渲染面：Flutter widget、SwiftUI/UIKit、Android 原生、WebView、系统弹窗/相册/键盘。读 [跨层检查](references/platform-and-visual-checks.md)，选相关状态组成用例矩阵。
4. 选择一个工具执行主要探索路径：Mobile Next MCP 或 Maestro MCP；已有项目驱动适合时直接复用。读取当前工具 schema，不编造名称、选择器或设备 ID。MCP 本会话未加载时可用已安装 CLI/项目驱动；配置存在不代表工具已连接。
5. 操作前取屏幕层级/截图，操作后重新观察并断言用户可见结果、数据持久化和跨页面一致性。原生 UI 在 Flutter 树中不可见时切换原生观测方式，不能直接判为产品缺陷，也不能只调用 debug handler 就宣称真实点击通过。
6. UI 变更保存并查看截图；手势、动效、键盘避让、前后台恢复需要过程证据。性能使用适合设备和构建模式的测量；Flutter debug 或模拟器时序不能代替真机 Profile/Release 性能。
7. 用户要求回归代码时，按项目约定固化流程：Maestro YAML 用于跨页面/系统交互，Flutter widget/golden/integration tests 用于 Flutter 层，XCTest/XCUITest 用于 iOS 原生层。先验证真实路径，使用稳定语义标识和用户结果断言。
8. 交付中文报告和证据；恢复本次更改的可恢复设备设置，只结束本任务创建的测试会话。已有应用数据、模拟器和其他活跃任务不重置。

## 工具和项目适配

| 需求 | 路径 | 证据边界 |
|---|---|---|
| 即时探索、截图、原生层级/手势 | Mobile Next MCP 或 Maestro MCP | 一次实际操作的观察 |
| 固化业务流程与重复回归 | Maestro CLI/MCP、项目现有 E2E | 指定设备、构建和用例覆盖 |
| Flutter 组件行为与视觉基线 | widget/golden tests | Flutter 渲染层，不含系统 UI |
| Flutter 与原生宿主集成 | integration tests + 原生驱动/项目桥接 | 需分别观察跨层结果 |
| iOS 原生与系统 UI | XCTest/XCUITest 或能访问原生树的驱动 | 真实点击、原生呈现与返回链 |
| 帧耗时、启动与内存 | Flutter DevTools、Instruments、平台 profiler | 实测设备和构建模式限定 |

Maestro MCP 先 list_devices，再 inspect_screen / take_screenshot，最后 run；陌生命令先 cheat_sheet。CLI 先查看当前 help，已验证的 YAML 可用 maestro test 执行。Mobile Next MCP 按实时工具列表发现操作。测试过程中不自动安装另一套驱动或改全局配置来掩盖错误。

先读取项目 AGENTS.md 和适用的构建/启动说明，遵循项目既有宿主和脚本。测试壳里的分享、地图、上传、视频、通知等 stub 只能证明壳内 UI，涉及这些能力的验收需真实宿主/后端或明确 BLOCKED。不要把某个历史分支里的 debug bridge 名称写死为当前契约。此入口不依赖其他 Skill；设备驱动、SDK 和 App 构建需在测试环境另行准备。

## 结果格式

使用项目产物目录或本次独立临时目录，返回绝对路径。

- 概况：App/构建版本、宿主、设备/OS、模式、后端、角色、渲染面、mock/stub。
- 用例表：ID | 平台/渲染面 | 前置/步骤 | 预期 | 实测 | PASS/FAIL/BLOCKED/SKIPPED | 证据。
- 缺陷：严重度、复现步骤、用户影响、期望与实际、截图/录屏/日志、产品缺陷或驱动限制的判断依据。
- 验证分层：静态/单元、Flutter 组件/golden、模拟器运行、真机交互、视觉/动效、性能，各自说明已验与未验。
- 结论：在声明范围内通过、失败或不完整；列出各状态数量与剩余阻塞。不能用构建成功、mock 绿灯、设备枚举或人工调 handler 代替完整旅程。

截图基线更新应经设计意图确认；人工体验确认只能由真实反馈支持。支付、分享/发消息、删除真实数据和云端上传遵循已有授权；普通测试不隐含清空 App 数据或整个模拟器。
