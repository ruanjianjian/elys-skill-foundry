# ELYS Skill Foundry

一个页面、七张卡片，分享持续维护的工程与客户端验收 Skills：

- `/elys-backend-technical-design`
- `/elys-code-development`
- `/elys-evaluation`
- `/engineering-delivery`
- `/codex-weekly-session-report`
- `/web-testing`：用户流程、UI/视觉、响应式、无障碍、网络/性能和 E2E 回归。
- `/mobile-testing`：Flutter、SwiftUI/UIKit、Android、系统 UI、视觉/动效、生命周期和真机证据。

页面使用 React 与 `liquid-gooey` 实现液态标题轮播。每张卡片都可以复制对应的 `SKILL.md`，或下载包含完整配套文件的 ZIP。

公开文件位于 `skills/`，下载包位于 `downloads/`。下载 ZIP 后解压到本地 Agent 的 Skills 目录即可使用。

客户端验收 Skill 请下载完整 ZIP（包含 references）；只复制 SKILL.md 不包含专项检查清单。在 Codex 中可用 `$web-testing` 或 `$mobile-testing` 加上目标、环境和验收范围调用。

这两个 Skill 是测试编排说明，不捆绑或自动安装驱动。Web 需可用浏览器自动化工具（例如 Playwright / Chrome DevTools MCP）；Mobile 需 Mobile Next MCP、Maestro 或项目已有驱动，以及对应 SDK、设备和 App 构建。它们不依赖旧的 ui-test 或 browser-testing-with-devtools Skill。工具配置存在不等于当前会话可调用。

工具来源：[Playwright](https://github.com/microsoft/playwright)、[Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp)、[Mobile Next MCP](https://github.com/mobile-next/mobile-mcp)、[Maestro](https://github.com/mobile-dev-inc/maestro)。本仓库仅分发统一验收说明，不重新分发这些工具。结构校验通过不代表具体 App 已通过验收。

## 本地运行

```bash
npm install
npm run build
python3 -m http.server 4173
```

访问 `http://127.0.0.1:4173/`。

## 隐私

公开 Skill 在发布前使用 `gitleaks --redact` 扫描，不包含已识别的凭证或密钥。
