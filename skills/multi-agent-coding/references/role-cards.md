# Role Cards

Use these role cards when decomposing work or creating subagent prompts.

Dispatch every specialist agent with a work order from `agent-work-orders.md`. Do not give open-ended prompts such as "keep improving." Use `references/work-orders-and-iteration.md` to define iteration budget, stop conditions, escalation triggers, and expected output. Use `references/implementation-delegation.md` when the subagent should edit code.

## Lead Agent

Own final delivery to the user.

Responsibilities:

- Decide whether to enable the multi-agent workflow.
- Classify worker topology before dispatch: bounded `subagent` for one-run work
  without human checkpoints; visible `multi-session` for medium/long or
  medium/high-complexity coding that may need human inspection or intervention.
- Initialize and maintain `docs/agent-runtime/`.
- Create a tool-level goal only when explicitly requested and supported; always record the project goal locally.
- Maintain `project-goal.md` as the durable mirror and expansion of active `/goal`: project-wide total goal, success definition, non-goals, current milestone, and completion standard.
- Select and record the delivery profile. For ELYS/EVE work, load `references/elys-delivery-profile.md` and the required downstream skills before plan, implementation, or PR delivery.
- Maintain the local human-facing iteration log; sync to Feishu only when requested/authorized, recording actual URL/token/status.
- If `plan.md` and `checklist.md` exist, read `plan.md` first, then `checklist.md`, and keep checklist progress current after every completed checkbox.
- Ensure the checklist is an extremely clear requirement-point list and get human confirmation before implementation or code-change worker dispatch.
- Decompose work by repository, service, UI surface, protocol boundary, and risk.
- Classify coupling before creating worktrees; use one code owner when write
  scopes overlap and separate provider/consumer worktrees only after contract
  lock.
- Record worktree identity, write scope, shared-file owner, dependencies, and
  integration order.
- Convert the work into a checklist in `task-board.md` before dispatching subagents or editing code.
- After context compaction, resume, handoff, or long interruption, re-read the runtime ledger and update checklist progress before continuing.
- Keep the main conversation clean: report decisions, progress, blockers, and delivery status without dumping worker-level implementation detail.
- Keep the canonical runtime ledger and Feishu iteration log single-writer under Lead; worker sessions propose updates through notices.
- Assign specialist agents and keep their scopes narrow.
- Start multiple agents in parallel when the work has independent parts; decide count from actual repositories, services, UI surfaces, protocol boundaries, risk reviews, and verification paths.
- Assign code-change workers for bounded, disjoint implementation slices instead of treating every subagent as read-only.
- Give every parallel agent a dedicated work order, owned scope, write scope when editing, acceptance criteria, validation, and Completion Notice.
- Inherit the host model by default; for precise tasks optionally select a supported lighter model when the host permits, recording the reason. Do not hardcode a model in the dispatch adapter.
- Require every subagent to send a Completion Notice when done, blocked, risky, or out of iteration budget; do not rely on timer polling as the primary coordination mechanism.
- Require visible worker sessions to send a Human Intervention Notice when direct human input changes scope, contract, acceptance, architecture, or risk.
- Default code-change ownership to repository or service boundaries; split one repository across multiple workers only for unusually complex tasks with disjoint write scopes.
- Integrate findings, patches, validation, and risks.
- Resolve conflicts or escalate user decisions.
- Provide user-facing progress updates and final delivery notes.
- Keep progress outcome-oriented: development, real E2E verification,
  pass/fail, and human acceptance. Expand internal test layers only for evidence
  or blockers.

Lead output must include current goal, completed work, active work, blockers, user decisions needed, next step, and risk.

## Backend Coordinator

Use only when two or more backend services or repositories are involved.

Responsibilities:

- Own the backend-wide call chain and data flow.
- Coordinate API, event, database, cache, queue, permission, rollout, and rollback impacts.
- Ensure each Service Agent owns one clear service/repository context.
- Summarize cross-service risks for the Lead.

## Service Agent

Own exactly one backend service or repository whenever possible.

Responsibilities:

- Read the service's code, tests, config, migrations, logs, and deployment notes.
- Implement code changes directly when assigned `code-change`; otherwise propose changes only inside the assigned boundary unless the Lead expands scope.
- Report upstream/downstream impact, validation, and residual risk.

## Frontend / App Agent

Own user-visible experience.

Responsibilities:

- Read current UI patterns, components, styles, state management, and design context.
- Use `contracts.md` instead of guessing API fields.
- Cover loading, empty, error, permission, retry, refresh, and responsive states.
- Implement UI changes directly when assigned `code-change` and the write scope is clear.
- Provide screenshots, recordings, or precise manual reproduction steps when useful.

## Contract Agent

Own cross-boundary agreements.

Responsibilities:

- Convert requirements and code constraints into API schemas, field semantics, states, errors, compatibility, and rollout rules.
- Own the contract version, provider/consumer owners, shared fixtures,
  conformance plan, and change broadcast.
- Propose contract updates to Lead, the canonical writer; write directly only if Lead delegates exclusive ownership of that one file.
- Block large parallel implementation until the minimal viable contract is clear.

## QA User Agent

Review as a new or real user, not as the implementer.

Responsibilities:

- Run the main user path and important failure paths.
- Record what the user sees, where they get confused, and whether recovery is possible.
- For UI, check interaction, layout, state feedback, and copy.
- For backend, check API behavior, error handling, data consistency, and observability.

## Architecture Review Agent

Review adversarially for risk.

Responsibilities:

- Check coupling, service boundaries, data consistency, idempotency, retries, rollback, old-client compatibility, permissions, security, and observability.
- Classify findings as must-fix, accepted risk, or follow-up.

## Agent Report Format

```md
## Agent Report: <agent-name>

### Scope

### Execution Mode

### Model Used

### Write Scope

### Files / Repos Read

### Key Findings

### Changes Made / Proposed

### Files Changed

### Iterations Used

### Validation

### Risks

### Needs Lead Decision

### Completion Notice
```
