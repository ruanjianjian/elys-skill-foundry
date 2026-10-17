# Execution Topology

Use this reference before dispatching any coding worker. Role, execution mode,
and execution topology are separate decisions:

- Role: backend, app, QA, architecture review, and so on.
- Execution mode: `explore`, `code-change`, or `verify`.
- Execution topology: `subagent` or `multi-session`.

## Decision Gate

Use `subagent` only when all are true:

- The work is bounded and should finish in one worker run.
- Requirements, contract, write scope, acceptance, and escalation rules are locked.
- No human decision, intermediate review, or direct steering is expected.
- Losing the worker's conversational history would not impair follow-up work.

Use `multi-session` when any strong signal exists:

- The implementation is medium/long duration or likely to cross context windows.
- The coding work is medium/high complexity and is expected to need human confirmation.
- The human needs to inspect the worker's full history or intervene directly.
- Product, UX, contract, architecture, data, rollout, or risk choices may arise mid-work.
- The worker owns a repository/service slice that will have repeated implementation and review rounds.
- The work includes a long-running test, PR, or review/fix loop.

When uncertain, choose `multi-session` for a code-owning slice only if a human
checkpoint is plausible. Do not upgrade a narrow, fully specified patch merely
because the overall project is large.

Record the result in `task-board.md` before implementation:

```md
## Execution Topology

- Mode: single-session + subagents | multi-session
- Decision reason:
- Human checkpoints:
- Explicitly confirmed choice:
- Confirmed by / time:
```

The checklist and topology can be confirmed in the same human confirmation,
but topology confirmation must be explicit. Lead must not create workers before
the human confirms one of these two choices: `multi-session` or
`single-session + subagents`.

## Human-Facing Explanation

Do not ask the human to decide from internal labels alone. Explain the judgment
in plain language using this structure:

```text
我建议这次使用：多会话 / 一个主会话加普通子 agent。

原因：
- 这项工作预计会持续多久、复杂在哪里；
- 中间有哪些地方可能需要你确认或直接介入；
- 是否有必要保留每个开发 worker 可独立查看的完整历史。

你会得到：
- 多会话：每个主要开发工作面都有可打开、可查看历史、可直接介入的独立任务；
- 单会话 + 子 agent：沟通更集中、启动和同步成本更低，但你不能独立进入子 agent 的一次性执行过程。

代价或风险：说明会话数量、同步成本、worktree/集成成本，以及不用推荐方案会失去什么。

请确认使用哪一种，我确认后再创建开发 worker。
```

Use facts from the current task, not generic claims such as "the task is
complex." Examples of useful evidence are repository count, expected duration,
known decision checkpoints, contract uncertainty, and likely review rounds.
Keep the explanation short enough for a non-technical product owner to decide.

## Multi-Session Setup

Each visible worker session is task-scoped. It is not a permanent identity for
a module and does not own the whole project.

1. Lead obtains explicit human confirmation of the checklist, topology, and proposed worker boundaries.
2. Lead selects the available host adapter from `dispatch-adapters.md` (Codex native tasks or Claude/other host companion) to create
   one visible, user-owned Codex task per independent code-owning slice. This
   task is the logical worker; do not substitute a hidden subagent after the
   human confirmed multi-session.
3. Prefer one worker session per repository or service. Split one repository
   only when the work is unusually complex and write scopes are disjoint.
4. For code changes, give the session a dedicated worktree, branch, baseline,
   exclusive write scope, integration owner, and integration order.
5. Give the session a stable title such as `<project> / <repo> / <work-order>`.
6. Record task/thread id, title, project/host, repository/worktree, status, and
   human checkpoint in `agent-work-orders.md` and the Active Worker Sessions table.
7. Send the complete work order as the first session message. Do not rely on the
   worker discovering context from the Lead task.

Separate Codex tasks do not automatically share full history or canonical
state. Human visibility is the reason to use them; the work order, notices, and
Lead-owned ledger are still required for coordination.

If the environment cannot create a visible task or worktree, record the missing
capability and request explicit confirmation before falling back to a bounded
subagent; explain the visibility or intervention ability that is lost.

## Worker Session Charter

The first message to a worker session must include:

- Project `/goal` and the confirmed checklist slice.
- Work order id, role, objective, execution mode, and model selection.
- Repository, worktree, branch, baseline, owned scope, and write scope.
- Must-read files, skills, contracts, decisions, and environment notes.
- Acceptance criteria, required validation, iteration budget, and non-goals.
- Stop and escalation conditions.
- Integration owner and handoff format.
- Completion Notice and Human Intervention Notice requirements.

The worker edits only its owned worktree. It may maintain local implementation
notes, but it must not independently rewrite the canonical project ledger,
checklist, contract, or Feishu iteration log. It proposes ledger changes in a
notice; Lead reconciles and writes them once.

## Human Intervention

The human may inspect and talk directly to a visible worker session. The worker
may apply clarifications that stay inside the confirmed work order. It must
pause affected code work and emit this notice when the instruction changes
scope, contract, acceptance, priority, architecture, data, security, rollout,
or risk:

```md
## Human Intervention Notice

- Worker session:
- Work order:
- Human instruction:
- Classification: clarification | scope-change | contract-change | decision | risk-acceptance
- Affected files / workers:
- Work paused:
- Proposed ledger updates:
- Needs Lead action:
```

Lead records the instruction in `agent-communications.md`, updates the relevant
checklist, contract, decision, work order, and iteration log (Feishu if enabled), broadcasts the new
version, then explicitly resumes affected workers. Human messages inside one
worker session must not silently redefine another worker's contract.

## Coordination And Lifecycle

Worker session states are:

- `proposed`: topology is not yet human-confirmed.
- `active`: implementation may proceed.
- `waiting-human`: worker needs a human decision or review.
- `blocked`: a dependency or risk prevents progress.
- `done`: work order acceptance is met and a Completion Notice exists.
- `closed`: Lead integrated or explicitly rejected/descoped the result.

Lead remains accountable for project integration and delivery. Completion is
reported in the worker session and, when supported, sent directly to Lead. When
cross-session push is unavailable, Lead performs a bounded read at declared
checkpoints, after a user intervention, on resume, or during integration. This
is reconciliation, not continuous timer polling.

Close or archive a user-owned worker session only when authorized after its result is integrated, rejected, or
formally handed off. Start a new work order when ownership materially changes;
do not keep broadening an old session until its history becomes another source
of context drift.
