# Implementation Delegation

Use this reference when a subagent should do code work, not only analysis.

Select whether that worker is an ordinary subagent or a visible worker session
with `execution-topology.md`. The code ownership rules below apply to both.

## Execution Modes

- `explore`: investigate and answer a specific question. No file edits.
- `code-change`: edit files directly in the subagent's forked workspace and return a patch summary.
- `verify`: run tests, manual QA, or architecture review. Edits only when explicitly requested.

For implementation work, prefer `code-change` worker agents over read-only explorers when the task can be bounded to a clear write scope.

## Decomposition Defaults

Default to repository or service ownership:

- Multi-repository task: assign one code-change worker per repository or service, plus Lead-owned integration.
- Multi-backend-service task: assign one Service Agent worker per service when each service needs code changes.
- Frontend/backend task: assign separate workers for frontend and backend only after `contracts.md` is clear enough.
- Single-repository task: use one code-change worker unless the task is unusually complex and can be split into disjoint write scopes.

Split one repository across multiple code-change workers only when all are true:

- The task is large enough that parallel implementation materially helps.
- Each worker has a non-overlapping write scope.
- The integration order is clear.
- Tests or validation can isolate each slice.
- The Lead has enough context to merge and resolve conflicts.

If those conditions are not met, keep one worker for the repository and use other agents for exploration, QA, architecture review, or contract work.

Classify coupling before creating worktrees:

- High coupling or overlapping files: one code-change worker and one worktree;
  use other agents for exploration or verification.
- Medium coupling through a stable API/event boundary: freeze the contract and
  shared fixtures before separate provider and consumer worktrees start.
- Low coupling with disjoint files and behavior: parallel worktrees are allowed.

A worktree isolates Git state; it does not make shared files, protocols, or
runtime dependencies independent. Assign one owner for every shared file and for
integration wiring.

## Worker Delegation Rules

When assigning a worker:

- Give it one owned repository, service, module, feature slice, or UI surface.
- Define the exact write scope. Use file paths or module directories when possible.
- Ensure write scopes are disjoint across parallel workers.
- Tell the worker it is not alone in the codebase.
- Tell the worker not to revert edits made by others.
- Tell the worker to adapt to existing user or agent changes.
- Tell the worker to edit files directly in its forked workspace.
- Require a final list of changed paths.
- Require validation commands or a clear explanation of why validation could not run.
- Record repository, worktree path, branch, base/head commit, contract version,
  dependencies, shared-file owner, and integration order.

Lead should not redo the same owned slice while the worker is running. Lead should work on non-overlapping tasks, contracts, integration planning, or validation.

For a visible worker session, record task/thread identity in the work order and
keep the canonical ledger under Lead ownership. Human input in that session may
clarify the existing work order; scope-changing input requires a Human
Intervention Notice before implementation continues.

Lead should also keep the main conversation concise: summarize work orders, progress, blockers, and user decisions instead of pasting every worker detail into the user-facing thread. Detailed findings belong in runtime ledger files and worker reports.

Lead should not timer-poll long-running code-change workers as the primary coordination method. Require every worker to send a Completion Notice when it is done, blocked, risky, or out of iteration budget. If the environment cannot push messages, the worker's final report is the Completion Notice.

## Code-Change Work Order Additions

Add these fields to `agent-work-orders.md` for every `code-change` worker:

```md
### Execution Mode
code-change

### Write Scope

### Integration Handoff
- Changed paths required:
- Tests required:
- Patch constraints:
- Known concurrent work:
- Contract version:
- Integration order:
- Shared-file owner:

### Completion Notice
- Notify:
- Method:
- Send when:
- Required fields:
```

## Worker Prompt Snippet

```text
You are a worker agent for a bounded code-change task.

You are not alone in the codebase. Other agents or the user may edit nearby files. Do not revert changes you did not make. Adapt your implementation to the current file state.

Own only this write scope:
<write scope>

Edit files directly in your forked workspace. Run the requested validation if possible. Stop and send a Completion Notice if the task is done, blocked, risky, out of iteration budget, requires changing contracts, requires expanding scope, requires a product/security/data decision, or requires editing outside your write scope.

Completion Notice / final report must include:
- Files changed
- Summary of implementation
- Validation run
- Risks or blockers
- Any ledger updates needed
```

## Lead Integration Rules

When a worker returns:

1. Inspect changed paths before accepting.
2. Check that the patch stayed inside write scope.
3. Run or review validation.
4. Merge or adapt the patch.
5. Copy the Completion Notice into `agent-communications.md`.
6. Update `task-board.md`, `validation-log.md`, and any affected contract or decision logs.
7. Update the local iteration log when the result changes human-visible progress, blockers, decisions, or validation; sync Feishu only if enabled and authorized.

If the worker needs to change a frozen contract, do not accept an implementation-
only workaround. Pause affected workers, update and broadcast the contract and
fixtures, then resume with refreshed acceptance criteria.

If the worker patch is rejected, record why in `agent-work-orders.md` or `validation-log.md` so the same failed approach is not repeated.
