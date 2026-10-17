# Contract Lock

Use Contract Lock before large parallel implementation when work crosses frontend/backend, service/service, data model, queue, or external-client boundaries.

## Lock These Items

- Contract version and the repository commit or artifact that owns it.
- Provider, consumer, and contract-change owners.
- Source of truth for each piece of data.
- API paths, methods, request and response bodies.
- Field semantics, nullability, defaults, ranges, and units.
- State machine and allowed transitions.
- Error codes, user-visible messages, retry behavior, and fallback behavior.
- Database fields, indexes, migrations, backfill, and rollback.
- Events, queue payloads, ordering, delivery semantics, and idempotency.
- Permission and visibility rules.
- Compatibility with old clients, old data, and partial rollout.
- Feature flags and rollout order.
- Shared fixtures or captured wire examples.
- Provider conformance tests and consumer parsing/state tests.
- Real end-to-end verification plan.

## Minimum Contract Template

```md
## Contract: <name>

### Owner Agents

### Version / Source Artifact

### Source of Truth

### API / Event / Data Shape

### Field Semantics

### State and Errors

### Compatibility

### Rollout / Rollback

### Verification

### Shared Fixtures
```

## Rules

- Do not let frontend and backend independently guess the same field.
- Do not hide compatibility assumptions in code comments only.
- Freeze the minimum viable contract before provider and consumer worktrees
  implement in parallel.
- If a contract changes after implementation begins, stop affected work,
  update the contract and fixtures first, broadcast the change to every affected
  agent, then rerun conformance checks before resuming.
- A mock or fixture may prove consumer behavior, but it does not prove the
  deployed provider or the real end-to-end journey.
- If a contract cannot be locked because a product decision is missing, record it in `open-questions.md` and escalate to Lead.
