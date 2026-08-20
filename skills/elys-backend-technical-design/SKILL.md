---
name: elys-backend-technical-design
description: Use when在 elys-backend 需要产出或评审后端技术方案、架构调整、API/数据/异步链路设计、模块拆分、迁移切流方案、性能容量方案或实现前影响面分析。
---

# Elys Backend Technical Design

## Core Principle

面向 Elys 后端做技术方案时，先用当前仓库证据定义问题边界，再给最小闭环方案。不要从通用架构模板、微服务理论或包名推断当前系统状态。

本 skill 参考 `samber/cc-skills-golang` 的 Go 后端原则，但 Elys 仓库规则优先：保持改动小、依赖显式、资源有界、可测试、可观测，并遵守 `AGENTS.md` 的 handler/service/repo/client 边界。

## Workflow

1. 锁定目标
   - 明确用户要的是方案、评审、迁移计划、切流计划还是实现前影响面分析。
   - 如果用户只是在修一个局部问题，默认给局部小改方案；不要自动升级成框架级重构。
   - 请求涉及 prod 日志、prod 数据或 prod 集群时，先拿用户明确许可。

2. 读当前实现
   - 先读 `AGENTS.md`，再读相关代码和测试。
   - API 方案：从 `cmd/server`、`internal/handler/http/server.go`、具体 `Register*Routes` / handler / DTO / service 调用链确认真实入口。
   - 业务方案：沿 `handler -> service -> repo/client` 查真实状态流转、错误映射、幂等和补偿。
   - 异步方案：查 `internal/workflow`、worker 启动、Temporal task queue、Redis/Kafka key、producer/consumer 和 shutdown 路径。
   - 数据方案：查 repo model、Mongo collection/index、Redis key、VikingDB 写读路径、旧数据兼容和回滚窗口。
   - 配置/启动方案：查 `cmd/server/main.go`、`internal/utils/config`、env var、feature flag 和默认值。
   - LLM/Prompt 方案：查 Promaster remote variable、render variable、`internal/utils/llmobserver` 和 CozeLoop trace 传递。

3. 判断现状
   - 用具体文件、函数、配置和测试说明当前系统怎么工作。
   - 区分“当前 main 行为”“PR/分支行为”“计划中的目标行为”。
   - 对链路型方案，必须先画出或列出当前链路，再标出目标链路相对当前链路新增、删除、改序、改输入输出、改异步边界、改数据读写的位置。
   - 如果画链路图，差异标注必须直接出现在图里的节点或边上，不能只依赖图后的差异表。
   - 不要因为 handler 已改、包名已变或某个 flag 存在，就判断运行时已经完成切流；继续追到 service、worker 和 startup wiring。

4. 设计最小闭环
   - 优先在现有模块边界内改：handler 适配输入输出，service 编排用例，repo/client 封装存储和外部依赖。
   - 新增 service 依赖时定义贴近用例的窄接口；不要创建巨大 repository interface。
   - 只有同一逻辑已经在两个以上独立位置重复，才新增通用 helper 或抽象。
   - 外部调用必须有 timeout、context 传播、错误分类和 fallback/降级说明。
   - goroutine、ticker、channel、worker 必须说明 owner、停止条件、backpressure 和测试方式。
   - Redis queue/Kafka topic/自研 polling worker 必须说明全局默认兼容策略，以及 dev debug lane 的 lane-affinity 或可审计 consumer 归因。

5. 给出验证路径
   - Go 业务逻辑改动默认需要 unit test，并说明 diff coverage 口径。
   - API 行为改动：用 `elys-http-integration-test` 还原真实 method/path/auth/参数；完成后用 `elys-api-delivery-verify` 组织 local/dev 请求、日志和指标证据。
   - 观测/指标改动：用 `elys-grafana-metrics` 或 `monitor-creator` 检查指标名、低基数 label、PromQL 和 dashboard。
   - LLM 异常或 prompt/model 方案：先拿业务对象关联的 `trace_id`，再用 `cozeloop-query` 查 spans。
   - dev 数据确认用 `elys-mongo-query`；prod 数据必须先得到用户明确许可。

6. 落盘方案文档
   - 如果用户要求保存方案，优先沿用现有 docs 领域目录：架构/重构放 `docs/refactor/`，性能可靠性放 `docs/performance/`，API/集成说明放 `docs/api/`，阶段计划放 `docs/plans/`，领域功能放对应现有目录或 `docs/<feature>-design.md`。
   - 文件名沿用仓库风格：英文 kebab/snake 命名加 `design` / `technical-design` / `plan` 后缀；不要新建空目录体系。

## Output Contract

默认用中文输出。方案必须包含这些部分；如果某项不适用，写明“不涉及”或“暂不需要”：

1. 结论
   - 推荐方案一句话。
   - 为什么这是当前最小可行方案。

2. 现状证据
   - 列出关键文件/函数/配置/测试。
   - 明确当前调用链、数据读写边界、异步链路或启动 wiring。

3. 链路差异
   - 链路图或链路步骤本身必须标出差异，例如 `[不变]`、`[新增]`、`[改参数]`、`[改输入]`、`[改输出]`、`[改数据写入]`、`[仅 shadow]`、`[enabled 改线上]`。
   - 用表格或分段列出“当前链路节点 / 目标链路节点 / 差异类型 / 改动位置 / 线上行为变化 / 回滚方式”。
   - 差异类型至少区分：新增节点、删除节点、改序、改输入、改输出、改数据读写、改异步边界、改配置、仅 shadow/观测。
   - 差异表是链路图的补充，不是替代；不能只画一个目标链路图再把差异藏在表格里。
   - 如果目标方案复用当前节点但改变参数、limit、过滤条件、排序或 fallback，也必须标出来；不要只写“复用现有链路”。
   - 如果某段链路明确不变，也写“不变”和原因，避免读者误判影响面。

4. 总体架构图
   - 方案涉及 3 个以上模块/服务、新增子系统、新异步链路或平台级职责切分时必须给；局部小改写"不涉及，见链路差异"。
   - 按 Design Checks 的 Architecture Diagram 规范产出：单向主链路 + 编号分层、语义图例、侧栏可插拔组件、内嵌关键契约、虚线例外路径、底部职责一句话。
   - 架构图和链路差异图不互相替代：架构图回答"系统长什么样、职责怎么切"，链路差异图回答"这次改了哪里"。

5. 目标和非目标
   - 目标只写本次要交付的闭环。
   - 非目标写清不会顺手重构、不会迁移、不会改的边界。

6. 方案设计
   - API/handler 变化。
   - service 状态流转、幂等、补偿。
   - repo/client 数据读写和外部依赖。
   - 数据库/索引方案：collection、字段 owner、查询形态、排序/分页、唯一约束、索引字段顺序、partial/sparse/TTL 需求、旧索引兼容和回滚窗口。
   - 配置、feature flag、灰度或 debug lane 策略。
   - metrics/logs/traces 和敏感信息边界。

7. 影响面和代码规模
   - 预计改哪些包和文件。
   - 说明是否影响 API、配置、Mongo/Redis/VikingDB、Temporal、Kafka、metrics、文档或发布流程。
   - 用“小/中/大”描述风险，不要给虚假的精确工时。

8. 验证计划
   - unit test。
   - local/dev/lane 验证。
   - 需要的日志、trace、指标、对象 ID。
   - diff coverage 是否适用；如豁免，写原因。

9. 风险与回滚
   - 数据兼容、并发、重复执行、旧代码回滚窗口。
   - 外部依赖失败、超时、限流。
   - 切流/灰度/禁用开关。

10. 待确认问题
   - 只列真正阻塞或会改变方案的问题。
   - 能通过读代码或查配置解决的，不要转嫁给用户。

## Elys Guardrails

- `handler -> service -> repo/client` 单向依赖；不要让 repo/client/model 反向依赖上层。
- `cmd/server/main.go` 只做入口和依赖装配；workflow/activity/service adapter、状态转换和 payload 转换放回所属 `internal/*` 包。
- 不在业务路径使用 `panic`、`fmt.Println`、`log.Printf`；用现有 `logger.With(ctx, ...)` 风格。
- `context.Context` 放第一个参数，并沿 HTTP、service、repo/client、external call 传播；不要在请求链中创建新的 `context.Background()`。
- 外部依赖和异步 worker 需要 timeout、重试边界、context cancellation、资源上限和停止路径。
- Mongo 索引字段顺序稳定时用 `bson.D`；集合/字段/索引变更要兼容旧代码和回滚窗口。
- Prometheus label 和 OTel attribute 必须低基数，不放 `user_id`、`post_id`、`request_id`、图片 URL、prompt 原文或模型完整输出。
- LLM span 默认走 `llmobserver.InjectOTelTrace`；新增链路优先 W3C Trace Context，不扩散私有 `trace_id/span_id` payload 字段。
- Promaster fetch prompt remote variable 和 render template variable 是两阶段；不要用局部 resolver 覆盖公共 resolver。
- Temporal debug lane 的 task queue、workflow ID、schedule gate 必须 lane-aware 并有测试。
- 新增业务分支要有测试；真实外部依赖测试必须 `//go:build integration` 或明确 env 开关，不能阻断默认 `go test ./...`。

## Design Checks By Topic

### Chain Delta

- 先给当前链路，再给目标链路；目标链路里的每个新节点都要能映射到具体包/函数/worker/repo。
- 链路图节点/边必须内嵌差异标识；推荐格式是 `[不变] Node`、`[新增] Node`、`[改参数: 30->100] Node`、`[仅 shadow: 不改线上] Node`、`[enabled 改线上] Edge`。
- 对每个差异点写清它改变的是候选集合、排序、过滤、状态机、异步重试、持久化、外部调用、配置还是观测。
- 参数级变化也算差异，例如 limit 从 30 到 100、排序从 created_at 到 score、Redis key 加 lane suffix、Temporal activity payload 新增字段。
- Shadow-only 差异要标明“不改变线上行为”，并说明何时变成 enabled 行为。
- 回滚要能对应到差异点：关哪个 flag、恢复哪个输入、保留或停止哪个写入。

### Architecture Diagram

范本：《Elys Proactive Agent 技术方案 v2》 https://hcnqwxuq730f.feishu.cn/wiki/JErvwCqdXiXhksk2tIec3cj9n2g （画板 token `LxpVwQpVeh1khJb5TWMcTkZPnWb`，正文另有文本版链路图，双形态并存）。以下规范全部提炼自该图。

何时画：

- 涉及 3 个以上模块/服务、新增子系统、新异步链路、平台级职责切分时必须画。
- 局部修一个 handler/service 只画 Chain Delta 链路图；不要为局部改动画全景架构图。

结构规范：

1. 单向主链路 + 编号分层：主链路自上而下（或自左而右）只有一条主干，每层"编号 + 名称 + 职责 tag + 一句话职责边界"（例：`5 Scheduler｜纯规则 + 定时器 [零模型成本] 只回答"何时执行"`）。读者不看正文也知道从哪读起。
2. 标题下一行写核心设计原则和阅读方式（例："规则管量 · 小模型管义 · 模型只出现在 M1/M2 —— 主链路自上而下，右侧为可插拔领域 Worker"）。
3. 图例必须有，且颜色/线型编码语义而不是装饰，至少覆盖三个维度：
   - 成本/职责类别：纯规则零模型成本、模型调用、现有能力复用各一种颜色。
   - 变更类别：本方案新增 vs 复用现有，与 Chain Delta 的 `[新增]`/`[不变]` 标注口径一致。
   - 例外路径：紧急旁路、兜底、shadow 用虚线并单列图例。
4. 主链路与可插拔组件分离：领域 Worker、扩展能力放侧栏，与主链路之间只画窄接口箭头，箭头必须带标签（事件名/调用名，如 `MATCH_FOUND 事件回流`、`daily 唤起`）；组件的职责边界声明写进框内（如"Worker 只管怎么做，何时看/做/发由平台决定"）。
5. 回流、反馈环、旁路显式画成边：反馈回流、自触发防护、紧急旁路都要在图上出现，不能只写在正文里。
6. 关键契约内嵌图中：模型输出枚举（`NOOP/CREATE/UPDATE/...`）、核心字段示意（`kind | goal | evidence_refs`）、payload 名（`ProactiveTurn`/`ExecutionResult`）直接放进节点，让图可脱离正文独立读懂。
7. 成本敏感点可数：图上一眼能数出几处 LLM 调用、几处外部依赖（范本的"模型只出现在 M1/M2 两处"）。
8. 后置/拓展项用虚线框放外围，与一期交付范围明确区分。
9. 底部一句话总结职责切分（例："平台管何时看/何时做/何时发｜Worker 管怎么做｜模型只出现在 M1/M2"）。

产出形态：

- 方案 markdown 里优先 Mermaid flowchart：`subgraph` 表达编号分层，`classDef` 表达图例颜色类别，虚线边表达例外路径；写不了 Mermaid 时退化为分层文本图（text 代码块里竖排箭头，范本正文第 1 节就是这种形态），编号分层、边标签、差异标注要求不变。
- Mermaid 骨架：

  ```mermaid
  flowchart TB
    classDef rule fill:#eaf7ee,stroke:#2f9e52
    classDef model fill:#f3ecfc,stroke:#8b5cf6
    classDef reuse fill:#eaf2fe,stroke:#4c88f0
    classDef newc fill:#fff4e5,stroke:#f59e0b
    subgraph L1["1 信号源｜多源事件汇入"]
      SIG["IM/Feed/记忆/Worker 回流"]
    end
    subgraph L2["2 触发层｜规则管量 + 小模型管义 [零模型成本]"]
      TRIG["规则 Trigger"]:::rule
      INTENT["小模型 Intent [新增]"]:::newc
    end
    subgraph L3["3 Agenda Generator (M1) [模型调用]"]
      M1["输入: 全量活跃 Agenda + 新信号<br/>输出: NOOP/CREATE/UPDATE/MERGE/CLOSE"]:::model
    end
    WORKER["领域 Worker [新增]<br/>边界: 只管怎么做"]:::newc
    L1 --> L2 --> L3
    WORKER -- "MATCH_FOUND 事件回流" --> L1
    SIG -. "红色预警 Direct Wake 旁路" .-> L3
  ```

- 交付到飞书文档时：正文保留 Mermaid/文本版作为可检索 fallback，画板版用 `lark-cli whiteboard +update`（支持 mermaid 输入）渲染，形成范本那样的"画板 + 文本"双形态。

### API

- 真实 path/method/auth 从 router 拼出来，不凭注释或文件名猜。
- 如果 service 返回字段新增或变化，必须检查 handler/DTO/response 转换是否透传；直接透传也要在交付说明写证据。
- 错误码和响应结构要从现有 handler 风格延续，不单独发明一套。

### Data

- 明确每个持久化字段的 owner、写入时机、读路径、软删除/分页条件。
- 先区分在线特征来源、业务事实源和观测/回放数据：在线计算需要的特征继续从业务库/repo batch read 获取，例如 comments、user actions、profiles；不要在请求/Workflow 热路径从 OLAP 反查特征。
- Mongo 只承载用户可见或业务判定需要的事实源，例如评论、点赞、mark/ignore、行为事件原始事实。全量 candidate trace、shadow/replay payload、LLM decision 回写、后验归因等高基数 append-only 分析事件，优先上报 CozeLoop/ClickHouse，而不是新建在线 Mongo trace collection。
- 如果确实需要在线快速定位一次分析链路，最多在 Mongo 保留轻量 TTL summary/ref，例如 `trace_id`、业务对象 id、config version、event count；完整候选明细、分数、bucket、LLM output 和 attribution 明细仍放 CozeLoop/ClickHouse。
- 索引方案必须从真实查询形态反推：filter 条件、sort 字段、分页 cursor、update/claim 条件、唯一约束和预期数据量。
- Mongo 新增或调整索引时写清 index keys、options、name、是否 unique、是否 partial/sparse/TTL；需要稳定字段顺序时用 `bson.D`，尤其是 `partialFilterExpression`。
- 不要假设 `CreateMany` 会覆盖旧索引；索引改名、options 变化和大集合建索引要说明兼容策略、上线顺序、回滚窗口和是否需要手工运维步骤。
- 判断是否需要 backfill；如果不需要，写清旧数据 fallback。
- 并发写要说明唯一索引、幂等 key、claim 条件或事务边界。

### Async

- 说明 producer、queue/topic/key、consumer、状态机、重试、超时、补偿和扫尾策略。
- 对 pending/terminal state、late callback、重复消息、worker 重启后的行为给出明确结论。
- 泳道验收不能只看 HTTP 命中；要能按 task_id/comment_id/request_id 证明 producer pod、consumer pod、queue/topic、debug_version 和 image/tag。

### Observability

- 每个新增关键分支要有可定位日志或 metric，但避免高基数 label。
- 需要 dashboard 时先定义 latency、QPS、error rate、错误分类和低基数过滤维度。
- CozeLoop/OTel 证据只写 trace id、span 摘要、LLM metadata 和结构化错误分类。

### Architecture Migration

- 先冻结边界，再拆 startup/runtime，再拆 facade/repo，最后 event-ify side effects。
- 判断微服务拆分前，先证明模块已经有清晰 bounded context、独立数据 owner、独立 runtime、可观测边界和可回滚切流策略。
- 对 Feed 等复合链路，必须检查 posts、user_feeds、comments、notifications、refresh、hot-post、matcher、workflow 和 AI 聚合的耦合后再下结论。

## Anti-Patterns

- 用“Clean Architecture / DDD / 微服务”名词替代当前代码证据。
- 只看 handler 或包名就判断架构已经迁移完成。
- 为一次局部修复新增框架、容器、全局 registry 或宽接口。
- 因为 samber 通用 Go skill 推荐 slog/SQL/DI 库，就推动 Elys 迁移 logger、数据库访问或 DI 体系；Elys 现有约定优先。
- 把 dev/lane 验收说成 prod 结论。
- 把集成测试、HTTP 黑盒或手工验证当作 unit diff coverage 的替代品。
- 输出大段原始日志、真实用户敏感数据、token、cookie 或生产导出数据。
