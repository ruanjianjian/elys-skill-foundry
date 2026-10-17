# ELYS / EVE Delivery Profile

仅对当前 ELYS/EVE 项目启用。通用派活规则仍在主 Skill；项目技术规范从当前可用技能和目标仓库指令读取，不复刻静态旧版本。

## 开工

- 读需求、当前 repo 的 AGENTS.md、相关代码和现成用例；不硬编码某台机器的克隆。
- ELYS 可用 elys-start 做定位；后端复杂方案用 elys-backend-technical-design，实施用 elys-code-development。先完整读取实际要调用的技能。
- 已有 plan/checklist 不重开需求发现；从方案提炼用户验收点，补实际未决决策。确认 checklist、项目、执行方式和写入范围后派发。
- 总目标写 project-goal；工具 goal 仅在用户要求且宿主允许时创建。飞书按本次授权与交付规范启用，不自动把公开或其他项目内容写入内部知识库。

## 实施与接缝

采用主 Skill 的单写者、契约冻结、波次与通知协议。原 Fleet 的 STOP Review 检查点保留：首条纵向链路、未规划选择、测试预期变化、上下文恢复、任务完成、波次/冲突解决和集成候选；使用当前 elys-stop-review，尊重 ASK_USER/OWNER_GATE/EVIDENCE_BLOCKED。

收口前按当前 elys-solution-preflight 执行适用的 Rescan，检查期间新增复用能力、外部冲突和跨任务数据链，不能以单模块全绿替代接缝验证。

## 环境和真实验收

后端默认按当前 elys-local-run / elys-local-stack 让当前 worktree 连接真实 dev 依赖完成本地验证，不自行部署远端泳道。用户明确要求其他环境时先检查当前项目规则和授权；冲突则上报，不机械套用历史配置。
Flutter、iOS 原生和系统 UI 分别验证；客户端验收必须按主 Skill 的路由使用 mobile-testing / web-testing，不能降成可选建议。证据绑定当前 commit、构建、实例/设备、样本与 trace；旧包、壳内 stub、mock 不能作真实平台通过。
使用 ELYS dev 测试账号前必须读取 [dev-test-access.md](dev-test-access.md)，核实实际后端环境、账号白名单和操作范围；本地进程不等于本地数据。

## Delivery 边界

候选全部内容先定稿 commit、clean、final STOP Review，再取得用户验收。使用当前 checkpoint 工具将 acceptance record 放在候选外并绑定 accepted_head_sha。
显式调用 engineering-delivery，传台账与唯一验证记录的真实路径。它负责 PR 创建/更新、review、适用的审批/交付记录，以及当前规范要求的正式提交后普通 dev 冒烟和合入后 Catalog 生命周期；本 Skill 不另跑一套。
Delivery 改 HEAD 后检查实际影响、重验受影响路径并执行适用的 STOP Review。人工验收延续按 `engineering-delivery/references/acceptance-continuity.md`；不把旧观察伪装为新 head 实测，也不单因换 SHA 要求用户重验。显式人工/精确 SHA 门禁仍适用。
完成标准若包含 PR review，review pending 不是完成。用户接受风险也只记录风险接受，不把缺失证据改成通过。
