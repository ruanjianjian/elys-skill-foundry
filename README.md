# ELYS Skill Foundry

一个页面、五张卡片，向团队推荐五个持续维护的工程 Skills：

- `/elys-backend-technical-design`
- `/elys-code-development`
- `/elys-evaluation`
- `/engineering-delivery`
- `/codex-weekly-session-report`

页面使用 React 与 `liquid-gooey` 实现液态标题轮播，点击卡片即可复制 Skill 名称。

## 本地运行

```bash
npm install
npm run build
python3 -m http.server 4173
```

访问 `http://127.0.0.1:4173/`。

## 隐私

页面只展示可向团队传播的通用能力，不包含本机绝对路径、凭证、个人或群聊 ID、生产配置与私密业务数据。
