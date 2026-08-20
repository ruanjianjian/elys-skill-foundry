# ELYS Skill Foundry

一个页面、五张卡片，向团队推荐五个持续维护的工程 Skills：

- `/elys-backend-technical-design`
- `/elys-code-development`
- `/elys-evaluation`
- `/engineering-delivery`
- `/codex-weekly-session-report`

页面使用 React 与 `liquid-gooey` 实现液态标题轮播。每张卡片都可以复制对应的 `SKILL.md`，或下载包含完整配套文件的 ZIP。

公开文件位于 `skills/`，下载包位于 `downloads/`。下载 ZIP 后解压到本地 Agent 的 Skills 目录即可使用。

## 本地运行

```bash
npm install
npm run build
python3 -m http.server 4173
```

访问 `http://127.0.0.1:4173/`。

## 隐私

公开 Skill 在发布前使用 `gitleaks --redact` 扫描，不包含已识别的凭证或密钥。
