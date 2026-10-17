# 跨宿主派发适配

先区分 Lead 所在宿主与 worker 所在宿主。Claude 可以调度 Codex，但 shell 可用不等于 companion 已安装、已登录或任务可见。当前工具 schema/CLI help 是接口依据。

## 选择执行路径

| 当前能力 | 执行方式 | 核验 |
| --- | --- | --- |
| Codex 原生可见任务工具 | 在用户明确同意创建独立任务后，列项目并选择正确项目与 worktree，创建任务 | 返回真实 task/thread ID；pending 的 client ID 不冒充 thread ID |
| 当前宿主子代理工具 | 已授权的短期、有界任务 | 返回 agent ID；不能把子代理称作可见 Codex 任务 |
| Claude/其他 shell 宿主 + companion | 发现实际 companion 脚本、读取 help，确认后台 task/status/result/cancel 能力 | job/thread/工作目录、活性、可见性分别核实 |
| 无 Codex CLI 或无可用调度器 | 说明能力缺口，交可复制任务单；经用户确认后才降级 | 不伪造会话、不自动安装插件、不悄悄改执行方式 |

原生路径优先使用官方项目/任务/等待接口。记录原生任务标题，按宿主返回的真实值报告。不直接改桌面 SQLite，也不通过改 cwd 元数据冒充正确 worktree。

## 内置桌面派发适配器（当前使用 Companion，可替换）

随 Skill 附带 `scripts/codex_desktop.py`，负责从 Claude 插件注册表定位已安装的 Companion 并调用它；Companion 负责 app-server 持久 session 和 job 生命周期。需要 Python 3、Node.js、Codex CLI 已登录，以及 Claude 的 Codex Companion 插件。本 Skill 不复制或改写插件缓存，也不分发账号凭证。

```bash
python3 <skill>/scripts/codex_desktop.py doctor
python3 <skill>/scripts/codex_desktop.py task --cwd <已确认git工作目录> --prompt-file <自包含简报文件> --background --json
python3 <skill>/scripts/codex_desktop.py status <job-id> --cwd <同一工作目录> --json
python3 <skill>/scripts/codex_desktop.py result <job-id> --cwd <同一工作目录> --json
python3 <skill>/scripts/codex_desktop.py cancel <job-id> --cwd <同一工作目录> --json
```

- 多个安装或特殊位置用 `--companion <codex-companion.mjs绝对路径>`，放在子命令前。不会猜最新缓存版本。
- `doctor` 只检查依赖、登录和源码标记，不启动任务。`user_thread_source_marker` 仅是实现线索，不是桌面可见性证据。
- 先读取实际 Companion 的 help。以上为当前支持的参数形状；不支持时报告版本缺口，不直接改插件缓存或桌面数据库。
- 默认只读；已授权实现加 `--write`。模型默认沿用宿主设置。必须保留原派活单和精确 job ID，返回含糊先核对、不重复启动。
- 首次派发后必须取得真实 thread ID，在 Codex 桌面任务列表/原生任务读取接口中核对标题、cwd 和进度。必要时用户在桌面确认；看板、job ID、日志活性都不能代替桌面可见性。
- 若不可见，报告 `VISIBILITY_BLOCKED` 并处理已启动任务；不得降级成后台 CLI 会话。
- 本入口转发 Companion 原始状态和结果；完成后仍由 Lead 复核。看板由 Lead 根据真实状态更新。

## Companion 路径（仅此模式读取）

1. 从当前插件安装信息或配置定位 `codex-companion.mjs`，先核对路径、Node 与 CLI help；常见安装位于 Claude 插件缓存，但不要硬编码版本或假设必须存在。
2. 验证用户确认的 git cwd、base、写范围与项目归属。确认该 cwd 内没有属于同一 work order 的活动任务。若 status/result/cancel 只接受 cwd，一个 cwd 同时只承载一个本次 worker。
3. 先把 `dispatch-intent` 写进 `agent-work-orders.md`：唯一 work-order ID、attempt、adapter、cwd、简报、开始时间。创建一经发出，返回不明也占用该 attempt，直到核实。
4. 按实际 help 调用后台 task。典型形状为 `node <companion> task <自包含prompt> --cwd <git-cwd> --background --json`；仅 code-change 获授权时加 `--write`。默认不传 model/effort；用户指定或宿主明确允许选择时才传，不能继承旧脚本的硬编码型号。
5. 返回后立即记 job ID、thread ID（若有）、实际 cwd、日志/结果路径。优先结构化 status 中匹配精确 job ID，不能 grep 相邻文本当成该任务状态。
6. 初始活性可在约 45 秒内用有界检查确认；有返回不等于活着，活着不等于可见，可见不等于完成。无信号记 `dispatch-uncertain`，查精确 job/status/result 后再决定，严禁直接重发。
7. 用户选择可见多会话时独立检查能否找到该 task/thread。不可见则报告阻塞并处理已启动任务，不偷偷降为隐藏模式。修插件缓存、写数据库、重启共享 broker 都不是普通派发步骤。

## 持续监控与看板

- 有通知或 wait：以完成/阻塞事件唤醒 Lead；等待不可超过宿主限制。
- 只有查询：指定截止时间、渐进间隔和下一人工检查点，使用宿主支持的后台/定时机制；对 unchanged 静默，不空转刷日志。
- `completed` 只表示运行终止，取 result 才能知道是已实现还是主动熔断；再由 Lead 复核才能标记 accepted。
- 日志时间过旧仅表示 stale，不表示成功或失败。等待 CI、日志不可读、查询超时分别记录。取消/失败可以终止等待，但不能把缺失任务当成功取消。
- 用户要求 Fleet 式任务看板时必须启动下述监控和看板，记录 URL、监控进程身份与截止时间；到期仍有活动任务时由 Lead 续期或明确报告监控停止。页面本身不会唤醒 Lead。
- 看板只查询登记任务，不扫描全机任务、不提供启动/取消 HTTP 端点。查询异常或快照过期显示 unknown；不能静默标成完成。

### 启动逐任务监控看板

Lead 在同一台账目录维护 `task-sources.json`，它只保存运行身份和展示字段，是 work orders 的机器索引，不是第二份契约或验收真源。例如：

```json
{"tasks":[{"id":"backend-1","title":"后端任务","adapter":"companion","cwd":"/absolute/worktree","job_id":"真实job-id","thread_id":"真实thread-id","visibility":"unverified","review_state":"pending"}]}
```

`visibility` 只有实际在桌面核对后才能记 verified。原生适配器使用 `adapter: native`、真实 `thread_id` 和 `receipt: status/backend-1.json`；Lead 通过原生 status/wait 工具写入 receipt，格式为 `thread_id/status/progress/checked_at`（checked_at 为 Unix 秒）。不支持的适配器显示 unknown，不假装查询成功。

```bash
python3 <skill>/scripts/monitor_tasks.py --ledger <台账目录>
python3 <skill>/scripts/monitor_tasks.py --ledger <台账目录> --watch --interval 30 --duration 3600
python3 <skill>/scripts/board_server.py --ledger <台账目录> --port 8737
```

后两条使用宿主支持的后台进程方式启动并记录精确进程身份；不要在前台阻塞 Lead。监控仅在状态变化时输出，页面每 15 秒刷新 `task-status.json` 的逐任务卡片和 Lead 台账；超过 120 秒未更新显示过期。大量任务需调整查询方式，不能把长查询周期误当实时。结果获取与同 session 续修仍由 Lead 经适配器操作：Companion 可在确认同 cwd 的最近任务就是目标 session 后使用 `task --resume-last`，否则使用支持精确 thread ID 的原生接口，不猜测目标。

### Fleet 能力迁移验收

分别记录：桌面派发得到真实 session、桌面能看到执行进度、多个任务状态各自更新、失败/失联如实展示、完成结果可取回、同 session 续修、精确取消、Lead 恢复后沿用旧任务。每项区分代码/模拟测试与真实宿主验证。任一未验证就明确标待验证，不因为入口脚本通过便宣布旧 Fleet 全部等价。

## 变更、取消与重派

优先暂停后续写入并发送新 work order；需要取消时只定位账本里的精确任务。若 CLI 只能按 cwd cancel，先证明该 cwd 只有目标活动任务，再调用并读取其终态。无法证明就停下请求处理，不用进程名 grep + kill，也不按数据库中的任意路径递归清理。

取消响应成功不等于旧 worker 已停止。确认终态、写入停止及产物归属后才重派；复用残留分支先检查并保留用户工作，不自动删分支。新 attempt 引用旧 job、取消证据、变更原因、新契约版本和恢复策略。

## 旧 Fleet 脚本

旧 dispatch-safe/cancel-verified/watch-task 的直接 DB 写入、全局进程匹配和静默判完成不再使用。调度正确性由上述统一协议和宿主 API 保证，不将未经验证的 legacy 脚本包装成安全能力。
