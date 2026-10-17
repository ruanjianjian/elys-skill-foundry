# Review Checklists

Use these checklists before delivery. Keep findings in `validation-log.md`.

## QA User Review

Check from the user's perspective:

- The authoritative real user journey works end to end in an environment that
  contains every required dependency.
- New user can understand what to do.
- Loading, empty, error, permission, and retry states behave correctly.
- Boundary inputs do not break the flow.
- Refresh, back navigation, duplicate submission, and interrupted network are handled when relevant.
- UI layout works for required screen sizes.
- Copy is clear and not implementation-driven.

## Backend Review

Check:

- API behavior matches `contracts.md`.
- Errors are stable and useful to callers.
- Data writes are idempotent where needed.
- Retries and duplicate events are safe.
- Logs and metrics expose useful debug handles.
- Migrations and rollbacks are understood.
- Permissions and visibility are enforced server-side.

## Cross-Service Review

Check:

- Call chain is clear.
- Source of truth is explicit.
- Partial failure is handled.
- Version skew and partial rollout are safe.
- Queue/event ordering assumptions are documented.
- Backfill, replay, or retry behavior is safe.
- Provider and consumer implement the same locked contract and fixtures.

## Architecture Review

Check:

- Boundaries are clear and not over-coupled.
- The design does not introduce avoidable global state.
- The implementation is reversible or has a rollback path.
- The abstraction is justified by real complexity.
- Corner cases are named, not hand-waved.
- Accepted risks are explicit.

## Goal-Driven Delivery Review

When `plan.md` / `checklist.md` or Goal-Driven Delivery Mode is active, also check:

- Implementation matches `plan.md` and does not over-implement.
- `checklist.md` is a clear requirement-point list and has human confirmation before implementation.
- `checklist.md` is current and every completed checkbox was updated promptly.
- File size, purpose headers, and folder README rules follow the current user's requirements and repository conventions; do not impose a historical template on unrelated work.
- Temporary markdown files were removed; long-lived markdown is current.
- External dependencies were researched before dependent code was written.
- Integration testing is recorded.
- Deployment, release, or load-test evidence exists when the active goal or risk
  profile requires it.

## Delivery Summary Requirements

Final user-facing delivery must state:

- What changed.
- Which repositories or modules changed.
- How it was verified.
- What was not verified.
- Residual risks.
- User decisions or follow-up items.

Use the authoritative-test table:

| 测试需求点 | 测试的内容（用户视角） | 是否通过 | 测试的证据 |
| --- | --- | --- | --- |

Do not expose every internal mock, contract, replay, lane, simulator, or device
check as a separate delivery state. Expand those details only when they explain
a failure, blocker, or residual risk, or when the user asks for them.

If a test depends on a model call, require the complete model input and output
in the evidence, along with model/version, time, and trace/request identifier
when available.
