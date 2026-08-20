# Codex Weekly Session Report

这是一个可复用的 Codex Skill，用于把本地 Codex session 整理成证据驱动的中文工作周报，并先生成本地预览，再在本人明确审核通过后发布到 Feishu/Miaoda。

## 安装

把 `codex-weekly-session-report/` 放到：

```text
~/.codex/skills/
```

或解压本目录提供的 zip 后，将该目录复制到上述位置。

## 使用

```text
/codex-weekly-session-report
```

也可以直接说：

```text
回看上周 Codex session，生成本地预览，先不要发布。
```

## 交接给 Claude 或其他维护者

先让维护者阅读：

```text
SKILL.md
references/maintainer-handoff.md
references/review-and-publish.md
```

`maintainer-handoff.md` 说明了数据流、正确性不变量、已脚本化和仍需人工/模型判断的部分，以及修改时的边界。机器路径、自动化时间、审核状态和妙搭应用实例不放进可移植 skill；这些信息应由当前机器单独生成一份运行实例 handoff。

## 前置条件

- Python 3.9+
- `~/.codex/state_5.sqlite`
- 可访问的 Codex rollout JSONL 文件
- 如需发布妙搭：已登录的 `lark-cli` 和自己的 HTML 应用 ID

## 发布闸门

每周先生成本地预览。审核所有模块后，明确回复：

```text
审核通过，发布
```

本地页面支持逐卡确认、删除、恢复、备注，以及一条整体备注。审核结果会由仅监听 `127.0.0.1` 的预览服务自动写入 `review-feedback.json`；审核完成后只需告诉 Codex，无需再复制反馈。“复制审核反馈”只作为 sidecar 不可用时的兜底。

Standalone 页面会继续保留 iframe sandbox，并通过 skill 自带的受限存储桥保存和同步审核状态。交付前必须在 Codex 内置浏览器里实际写备注、核对 sidecar、刷新、读取真实剪贴板并清理测试数据；不能只看按钮是否出现。

预览服务由自动化启动；手动运行时使用：

```bash
python3 scripts/serve_review_preview.py --html /absolute/report.html --feedback /absolute/review-feedback.json
```

## 安全边界

包内不包含任何个人路径、访问口令、Token、妙搭应用 ID 或公司内部数据。发布到妙搭前必须自行填写 `config.example.json` 中的路径和应用配置，并确认公开页面不包含隐私信息。
