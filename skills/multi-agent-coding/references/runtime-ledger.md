# Runtime Ledger

一份持久台账由 Lead 单写，worker 只在通知中提出更新。默认 docs/agent-runtime；已有目录用 init_runtime.py 的 --dir 指定，不使用 --force 覆盖活动记录。

## 记录分工

| 文件 | 唯一职责 |
| --- | --- |
| project-goal.md | 总目标、非目标、当前阶段、完成标准；用户要求时关联工具 goal |
| task-board.md | 需求点清单或既有 checklist 的协调摘要、波次、任务状态和人工确认 |
| requirement-brief.md | 需求与 P0 验收条件 |
| repo-map.md | repo/worktree/base/head、写入者、依赖、公共文件、交付单元、外部冲突与横切矩阵 |
| contracts.md | 唯一冻结契约与 fixtures、版本、provider/consumer/change owner |
| decision-log.md | 产品拍板与技术选择；未决/确认/变更状态 |
| agent-work-orders.md | 每单目标、范围、权限、模型、版本、派发 intent/attempt 与 job/thread、通知和结果 |
| agent-communications.md | 阻塞问答、广播、完成通知和用户介入通知 |
| project-iteration-log.md | 本地白话迭代记录；启用飞书时兼作 URL/token/同步状态索引 |
| open-questions.md | 未决问题、负责人、影响和是否阻塞 |
| validation-log.md | 四列用户旅程证据、准确版本、已验证/未验证与残余风险 |

## 目标与清单

工具级 goal 仅在用户明确要求且宿主支持时创建，复用或核对已有活动目标，不覆盖。未要求用 not-requested；不可用记录原因。项目目标文件始终保留完整结果和完成标准。

有 plan.md/checklist.md 时先读方案再读清单，详细 checkbox 只更新 checklist；task-board 仅镜像阶段。没有则在 task-board 写需求点清单。开发前确认清单与执行方式，每完成一项及时更新，不把工具执行成功当需求完成。

## 迭代日志与飞书

默认 Type: Local Markdown，Sync status: not-requested。记录时间、目标、变化、决定、阻塞和下一步，不转存原始会话。飞书仅在用户或当前项目要求且授权时启用；此时 Type: Feishu Doc，记录真实 URL/token、知识库与同步策略。已启用但不可用写 pending/blocked，本地保存待同步摘要，不虚构链接。Lead 独占写入；无需飞书的项目不因没有 URL 失败。

## 台账恢复与更新

派发前写 work order，创建后立即追加 adapter/job/thread/cwd/head/log/result/attempt；响应含糊也保留 intent，防重派。子代理 ID 不冒充 thread ID。
状态只由实际通知和 Lead 复核推进。每次决定、结果或阻塞变化，更新有关文件；压缩/恢复后读目标、plan/checklist、board、contracts、work orders、open questions、validation，再继续工作。
任务单和简报只能有一个正文真源，长单独立成 briefs/id.md 后，agent-work-orders 保留索引与运行身份。

## 旧 Fleet 迁移

不搬动正在被 worker 引用的文件，也不把运行中 worker 再派一次。旧目录沿用：
- decisions.md 对应 decision-log.md；
- test-matrix.md 对应 validation-log.md；
- README.md 的依赖/波次/交付规划对应 task-board + repo-map；
- briefs、explainers、overview 保留，contracts 原址唯一。
在 task-board 记录物理真源路径。安全时将旧文件改名并更新所有引用，或在同一台账目录创建指向原文件的相对链接；不得复制两份可编辑正文。旧格式未完成迁移时做人工内容审计，不能运行初始化器制造一套空模板来冒充完整台账。

## 验证边界

validate_runtime.py --root <root> --dir <ledger> --phase kickoff|parallel|delivery 检查标准台账结构；--strict 将警告当失败。旧 Fleet 格式需迁移字段后才用此检查。它不证明清单已获真实确认、任务可见或 E2E 已通过，Lead 必须看原始证据。

用户旅程固定四列：测试需求点 | 测试的内容（用户视角） | 是否通过 | 测试的证据。状态只用未执行/通过/失败/EVIDENCE_BLOCKED；内部测试细节作为证据，不作为虚构的用户完成阶段。模型结论保留完整脱敏输入输出、版本、时间和请求标识。
