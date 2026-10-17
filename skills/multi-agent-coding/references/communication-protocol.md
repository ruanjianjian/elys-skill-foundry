# Communication Protocol

Agent-to-agent communication is allowed for concrete blockers. It must not create hidden context.

## Modes

- Lead-mediated: default. Lead relays and records cross-agent information.
- Direct Handshake: two agents resolve a narrow blocker directly.
- Broadcast Update: Lead announces a changed contract, decision, or task state to affected agents.
- Completion Notice: a subagent tells Lead it is done, blocked, risky, or out of iteration budget.
- Human Intervention Notice: a visible worker session reports human input that changes a shared boundary.
- User Escalation: Lead asks the user when the issue exceeds agent authority.

If the current environment has no real agent-to-agent messaging, Lead must forward the original question and original answer while still recording the exchange.

Do not use timer polling as the primary coordination mechanism for long-running code-change workers. The work order must require the subagent to notify Lead through a Completion Notice. Lead may do bounded status checks only on resume, timeout risk, or delivery reconciliation.

## Allowed Direct Handshake Cases

- One agent is blocked by another agent's concrete information.
- Frontend needs backend field semantics, error state, state machine, or mock data.
- Backend services need call chain, event payload, idempotency, compatibility, or rollout order.
- QA needs an implementation owner to confirm expected behavior.
- Architecture Review needs evidence from an implementation owner.
- Two agents may conflict and need to align before Lead integration.

## Not Allowed Through Direct Handshake Alone

Escalate to Lead, and possibly the user, for:

- Scope changes.
- Product or user-experience direction.
- Data deletion or migration.
- Permission, security, billing, or privacy changes.
- Skipping P0 acceptance.
- Accepting high risk.
- Final delivery conclusions.

## Agent Message

```md
## Agent Message

- From:
- To:
- Context:
- Blocking:
- Question:
- Options considered:
- Expected answer format:
- Needed by:
```

## Agent Response

```md
## Agent Response

- From:
- To:
- Answer:
- Evidence:
- Impact:
- Needs contract update:
- Needs decision-log update:
- Remaining uncertainty:
```

## Broadcast Update

```md
## Broadcast Update

- Change:
- Reason:
- Affected agents:
- Affected files:
- Required action:
- Deadline / ordering:
```

## Completion Notice

Every work order must define how the subagent sends this notice. If direct push messaging is unavailable, the subagent's final report is the notice.

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

## Human Intervention Notice

Use this when a human message inside a visible worker session changes scope,
contract, acceptance, priority, architecture, data, security, rollout, or risk.
The worker pauses affected work until Lead reconciles shared state.

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

## Writeback Rules

- Copy every Direct Handshake into `agent-communications.md`.
- Copy every Completion Notice into `agent-communications.md`.
- Copy every Human Intervention Notice into `agent-communications.md`.
- Update `contracts.md` if protocol, schema, state, errors, events, compatibility, rollout, or rollback changed.
- Update `decision-log.md` if product behavior, UX direction, storage, permission, security, rollout, or an important tradeoff changed.
- Update `task-board.md` if status, blockers, owner, or next step changed.
- Update `project-iteration-log.md` when the notice changes human-visible progress, blockers, decisions, or validation; sync Feishu only if enabled and authorized.
- Update `open-questions.md` if uncertainty remains.
- Update `validation-log.md` if test strategy or findings changed.
