# Work Orders and Iteration

Lead Agents must dispatch workers with bounded work orders. A worker can run as
an ordinary subagent or a human-visible session; select that topology using
`execution-topology.md`. A work order is the control plane for worker behavior:
it tells the worker what to optimize, what model to use when configurable, what
not to touch, how many iterations to perform, how to validate, when to notify
Lead, and when to stop or escalate.

Do not rely on vague instructions such as "keep improving this" or "iterate until good." Those instructions create hidden scope and make progress hard to audit.

Do not make Lead depend on timer polling for long-running implementation work. Each work order must require the subagent to send a Completion Notice when it finishes, blocks, exhausts iterations, or hits risk. If direct push messaging is unavailable, the final report is the notice.

## Work Order Template

Record work orders in `agent-work-orders.md`.

```md
## Work Order <id> - <agent role>

### Execution Topology
- Mode: subagent | multi-session
- Decision reason:
- Human checkpoints:
- Human confirmation reference:

### Worker Session Identity
- Required: yes | no
- Task / thread ID:
- Title:
- Project / host:
- Adapter: native-task | subagent | companion
- Attempt / dispatch intent time:
- Job / agent ID (not a thread ID):
- Log / result path:
- Dispatch certainty / liveness / visibility:
- Status: proposed | active | waiting-human | blocked | done | closed

### Execution Mode

### Model Selection
- Model:
- Reason:
- Preconditions met:

### Objective

### Project Goal Link

### Owned Scope

### Write Scope

### Worktree Identity
- Repository:
- Worktree path:
- Branch:
- Base / head commit:

### Contract Dependency
- Contract name / version:
- Provider or consumer:
- Shared fixtures:

### Explicit Non-Goals

### Must-Read Context

### Relevant Ledger Files

### Constraints

- Git authority: patch-only | commit-and-push-task-branch
- PR authority: none (Lead hands accepted candidate to delivery)
- Known concurrent writers:
### Acceptance Criteria

### Iteration Contract
- Max iterations:
- Per-iteration actions:
- Required validation:
- Stop when:
- Escalate when:

### Completion Notice
- Notify:
- Method:
- Send when:
- Required fields:

### Expected Output

### Integration Handoff
- Integration order:
- Shared-file owner:
- Target integration branch:

### Ledger Writeback
```

## Iteration Contract

Use this loop inside the worker's assigned scope:

1. Re-read the objective, owned scope, non-goals, acceptance criteria, and relevant ledger files.
2. Inspect the assigned code or artifact.
3. Make the smallest coherent improvement toward the objective.
4. Run the assigned validation or explain why it cannot run.
5. Compare the result against acceptance criteria.
6. If criteria are not met and iterations remain, perform another targeted iteration.
7. Stop and send a Completion Notice when done, blocked, risky, or out of iteration budget.

The worker may not expand scope, change P0 requirements, alter contracts, accept high risk, skip required validation, or make product decisions without Lead approval. A visible worker session must use a Human Intervention Notice when a human message changes any of those boundaries.

For `code-change` work orders, the worker should edit files directly in its forked workspace. It must stay inside Write Scope, must not revert changes made by others, and must list changed paths in the iteration report.

## Model Selection

Inherit the host model by default. A supported lighter model (for example Luna high) may be selected only when host rules permit and Lead/Manager has made the task precise:

- Objective is concrete.
- Owned scope and write scope are bounded.
- Acceptance criteria are explicit.
- Non-goals and escalation triggers are written.
- Required context and ledger files are listed.
- The worker is not expected to make product, security, data, permission, or architecture tradeoff decisions.

Keep the default or a stronger model when the work is open-ended, the contract is not locked, the implementation boundary is uncertain, the task requires deep architecture judgment, or the subagent must infer missing requirements.

## Stop Conditions

A subagent must stop and send a Completion Notice when:

- Acceptance criteria are met.
- The maximum iteration count is reached.
- Required context is missing.
- Validation cannot be run.
- A contract, schema, state, or error behavior needs to change.
- Another worker needs to edit the same file or shared integration surface.
- The task requires editing outside owned scope.
- There is a user-facing, security, permission, data, migration, rollout, or rollback decision.
- The subagent finds a blocker that another agent must answer.

## Completion Notice

Use this template at the end of every work order. Copy the notice into `agent-communications.md`.

```md
## Completion Notice

- From:
- Work order:
- Status: done | blocked | risky | iteration-budget-exhausted
- Summary:
- Files changed:
- Validation:
- Ledger updates made:
- Needs Lead action:
- Needs human-facing log update:
- Remaining uncertainty:
```

## Lead Feedback Loop

When Lead reviews a subagent result and wants another pass, issue an iteration feedback block instead of an informal "try again."

```md
## Iteration Feedback for <work-order-id>

- What passed:
- What failed:
- New or clarified acceptance criteria:
- Additional context:
- Scope change:
- Remaining iteration budget:
- Required validation before next report:
```

If feedback changes scope, contracts, or decisions, update the relevant ledger files before the next iteration starts.

When a frozen contract changes, Lead must pause affected work orders, update the
contract and shared fixtures, broadcast the new version, and reissue acceptance
criteria before workers resume.

## Worker Iteration Report

```md
## Iteration Report: <work-order-id>

### Model Used

### Iterations Used

### Changes Made

### Files Changed

### Validation Run

### Acceptance Criteria Status

### Remaining Issues

### Blockers / Escalations

### Proposed Ledger Updates

### Completion Notice Sent
```

## Practical Defaults

- Use 1 iteration for investigation-only tasks.
- Use 2 iterations for narrow implementation or UI polish tasks.
- Use 3 iterations for complex implementation within one repository.
- Require Lead approval before allowing more than 3 iterations.
- For QA and Architecture Review agents, iteration usually means finding, classifying, and re-checking fixes rather than editing code.
