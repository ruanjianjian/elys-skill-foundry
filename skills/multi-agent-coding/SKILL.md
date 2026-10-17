---
name: multi-agent-coding
description: 多 Agent 派活与持续治理统一入口，支持 Codex、Claude 或其他 Lead。把需求或方案拆成有边界的任务，确认子代理或可见多会话，冻结契约、按依赖派发、维护唯一台账、复核集成、真实验收并交接 PR 流程。用于跨仓/跨端/长周期协作、多 Codex 并行开发、派活看板或 codex-fleet；单个窄任务无需启动完整编排。
---

# Multi-Agent Coding：派活与持续治理

一个 Lead 对用户负责，一份台账维持项目事实，多名 worker 各有明确写入范围。Lead 可以是 Codex、Claude 或其他 agent；由当前宿主选择工具，不以特定插件为通用前提。原 codex-fleet 的派发、波次、披露和收口规则已合并到这里。

只在用户请求实际协作开发时运行流程。比较、审阅或编辑本 Skill 不授权启动开发 worker、创建项目目标或写飞书。单个独立任务且不需持续治理，可用宿主单任务工具。

## Fleet 能力保留契约

本 Skill 接管旧 codex-fleet 的完整协作能力，不能只保留流程文字：

- Claude 或其他 Lead 能派发 Codex 桌面可见的独立 session，用户能进入查看进度与历史；原生接口、Companion 或其他经过验证的适配器均可，不绑定实现品牌。
- 用户要求 Fleet 式派活/看板时，启动任务看板并持续监控每个已登记任务。不能用静态 Markdown 页面冒充运行监控。
- 每任务保留身份、repo/worktree、依赖、执行阶段、最新进度、阻塞/错误、桌面可见性、结果与 Lead 复核状态。执行完成与验收通过分开。
- 支持取回结果、处理反馈、同任务续修及精确取消；适配器不支持某项就报告该项缺口，不静默丢失功能或换成隐藏任务。
- 恢复旧项目时沿用 session、work order 和台账，不重派 worker。能力迁移验收见 [dispatch-adapters.md](references/dispatch-adapters.md)。

## 1. 目标与唯一台账

- 从需求、项目指令和当前代码确定目标、非目标与完成标准。已有定稿方案就提炼验收项，不重新做产品发现。
- 读 [runtime-ledger.md](references/runtime-ledger.md)，用本 Skill 的 `scripts/init_runtime.py --root <项目根>` 初始化。默认 `docs/agent-runtime/`；既有持久任务目录用 `--dir <目录>`，不建第二套契约/决策/测试矩阵。
- `project-goal.md` 保存总目标；工具级 goal 仅在用户明确要求且宿主支持时创建，不覆盖已有活动目标、不自设 token 预算。没有工具目标也能持续治理。
- 有 `plan.md` 就先读，再读 `checklist.md`；已有 checklist 是详细进度真源，task-board 只作协调视图。否则在 task-board 建需求点清单，不以执行日志替代验收要求。
- 迭代日志默认本地维护；用户或当前项目明确要求飞书时才同步。未要求记 not-requested；授权但不可用记 pending/blocked，不虚构 URL。

## 2. 拆分与确认

读 [execution-topology.md](references/execution-topology.md) 和 [work-orders-and-iteration.md](references/work-orders-and-iteration.md)。

- 短期子代理：边界已定、一次执行能收回、无需用户中途进入。可见多会话：长周期、压缩上下文、多轮审修、需要用户查看历史或直接干预。
- 用产品语言解释推荐、原因、可见性与成本，把目标项目/仓库、任务范围、执行方式、人工检查点合成派活单请用户确认。已明确确认的内容不重复问；可见任务只在用户明确确认创建后启动，不用隐藏代理冒充。
- 按仓库/服务优先分工；高耦合/重叠文件只设一个 code owner；稳定契约两端可分 worktree；不相交任务并行。多后端服务可设 Backend Coordinator + Service Agents，按需读 [role-cards.md](references/role-cards.md)。
- 验证真实 base，不假定 main。记录 repo/worktree、branch、base/head、写入范围、公共文件唯一写者、依赖、集成顺序与交付单元。同分支共写先同步，禁止擅自 force-push。
- 跨模块先读 [contract-lock.md](references/contract-lock.md)，冻结 API/事件/状态/错误、数据归属、兼容、配置、幂等/CAS 时序和 fixtures。产品语义由用户拍板；等价技术实现由 Lead 记录。
- 契约矛盾先停受影响任务并上报，不各自解释。相关在途 PR/分支和横切机制 × 写入路径写入 repo-map，约定集成接线负责人。

## 3. 自包含派活

实现前读 [implementation-delegation.md](references/implementation-delegation.md)，选宿主读 [dispatch-adapters.md](references/dispatch-adapters.md)。

Claude 派活到 Codex 桌面端时，优先选择已验证可见的宿主接口；当前随 Skill 附带的 `scripts/codex_desktop.py` 可调用已安装的 Codex Companion，创建持久 session 并查询进度、结果或取消任务。必须核实返回的 session 在桌面可见；不得用后台 `codex exec` 替代。具体命令、依赖检查和可见性验证见上述适配说明。

每单必含：ID、角色、目标/清单项、执行方式、宿主/session/job 身份、模型依据、repo/worktree/base、精确写入范围、唯一契约路径与版本、必读材料和复用先例、非目标、验收/验证方式、最大迭代数、停止/升级条件、通知方式、集成负责人及 Git 权限。长简报放 `briefs/<id>.md`，台账仅链接，不复制正文。

- 模型默认沿用宿主设置；明确边界时可选宿主支持的较轻模型（如可用的 Luna high），记录理由并遵循宿主规则。
- worker 实际实现独立 slice，Lead 不同时重写同一片。explore 只读；code-change 改专属范围；verify 做验证不顺手修产品。
- Git 权限明确二选一：授权 worker commit/push 任务分支，或仅交补丁由 Lead 提交。不能同时要求“不做 Git 写入”和“自行 push”。worker 不创建/更新 PR。
- 无依赖任务同波并行；下游以 Lead 复核上游交付和必要测试为门控，不等 PR 合并。依赖分支绑定 head；上游改变需重审消费者。
- 派发前记录 intent/唯一 work-order ID，派发后立即记 task/job/日志/目录。超时或响应含糊先核对是否已创建，不盲目重发。

## 4. 复核与持续治理

读 [communication-protocol.md](references/communication-protocol.md)。

- 默认经 Lead 协调。支持通信时可为明确阻塞直接问答，但不能私改契约，结果必须回 Lead；无通信工具时由 Lead 转发。
- worker 在完成、受阻、风险、迭代耗尽时发 Completion Notice；用户在 worker 内改变范围/契约/验收时，暂停受影响工作并发 Human Intervention Notice。
- 通知/宿主 wait 优先，无推送用有截止时间的状态核对。看板不是完成证据；日志静默、进程消失、job completed 都不能代替结果复核。不可确认记 unknown/blocked。
- Lead 检查 result、diff、越界、契约和当前测试，区分“自称完成 / 熔断上报 / 复核通过”再开下游门控。
- 检查目标偏移的时点：首条纵向链路、未规划决策、拟改测试预期、恢复上下文、worker 完成、波次/冲突解决、最终集成。ELYS 必须读取并执行当前 elys-stop-review：worker 负责自身检查点，Lead 负责波次、冲突解决和最终候选；记录触发原因、当前代码指纹、结论与证据路径。ASK_USER / OWNER_GATE / EVIDENCE_BLOCKED 阻断受影响任务和依赖该结果的下游，不得标记通过或进入验收/Delivery；完成决策或补齐证据后重新执行检查，取得 PROCEED 才恢复。独立且不受影响的任务可继续。
- 局部等价实现可自纠；产品/范围找用户；契约/数据/权限/架构矛盾停下升级。批准后更新契约、决策、简报和 fixtures，再明确恢复。取消须验证精确任务终态；无法确认不重派，不杀全局 worker/broker。
- 状态/决定/阻塞变化及时更新台账；压缩/恢复后先重读目标、plan/checklist、board、contracts、work orders、open questions 和验证记录，再继续。向用户用白话披露“做了什么、数据怎么流、为什么、怎么验证”。

## 5. 集成、验收与交付

读 [handoff-and-integration.md](references/handoff-and-integration.md) 和 [review-checklists.md](references/review-checklists.md)。

- Lead 收口候选，按“谁产出 → 谁消费 → 语义丢了什么”审跨任务接缝；相关外部分支做隔离集成预演，复查新写入路径，不吞入无关改动。
- 编译/mock/单层测试不能替代真实旅程。固定四列：`测试需求点 | 测试的内容（用户视角） | 是否通过 | 测试的证据`；状态未执行/通过/失败/EVIDENCE_BLOCKED。按风险选 Web/Mobile/后端测试，不机械要求所有环境。
- 涉及客户端交互、UI/视觉或用户旅程验收时，Web 必须读取并使用 web-testing，Flutter/iOS/Android 原生及系统 UI 必须读取并使用 mobile-testing；跨端分别调用，不用一端通过代表另一端。纯后端/单元测试不强制套用客户端 Skill。将所需 Skill 和覆盖面写进 worker 简报与验收计划；缺少 Skill/驱动时报告受影响项 EVIDENCE_BLOCKED，不静默跳过或声称已执行。ELYS dev 账号与环境验证先读 [dev-test-access.md](references/dev-test-access.md)。
- 运行证据绑定 commit → 构建物 → 实例/设备 → 样本/trace。模型结论保留脱敏完整输入输出、版本与请求标识，不能只留总结。
- 人类验收前定稿所有候选内容，代码候选 clean；提供版本、环境/数据前置、步骤、预期、限制和恢复方式。验收记录绑定 head 与证据；改 HEAD 后检查差异并重验受影响路径。人工验收延续统一按 `engineering-delivery/references/acceptance-continuity.md`，不因 SHA 变化本身重复索要确认；显式人工/精确 SHA 门禁仍适用。
- 用户要求 PR 时，满足边界后显式调用适用且可用的 engineering-delivery，传仓库、base、集成分支、唯一验证记录、accepted SHA 和 acceptance record；它接管 PR/review。不可用则报告缺口，按明确授权的项目流程交接。
- 合入后不向已结束的集成分支继续 push；后续基于默认分支另行交付。不自动删除仍被使用的 worktree/用户任务。
- 按用户完成标准收尾。默认报告“开发中 / 真实 E2E 验证中 / 真实 E2E 已通过或未通过 / 待用户人工验收”；目标含 PR/review 则报告其实际状态。未验证不算完成。

## 专项适配与检查

- ELYS/EVE：读 [elys-delivery-profile.md](references/elys-delivery-profile.md)，以当前项目技能和指令为准，不硬编码个人克隆路径。
- 指定严格 plan/checklist/goal：读 [goal-driven-delivery.md](references/goal-driven-delivery.md)，不自行追加发布、压测或全仓文档改造。
- 交接前运行 `python3 <本Skill目录>/scripts/validate_runtime.py --root <项目根> --dir <台账目录> --phase delivery`。工具只查记录结构，不证明业务验收。
