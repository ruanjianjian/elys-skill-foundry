# Agent Communications

## Direct Handshakes

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

## Broadcast Updates

```md
## Broadcast Update

- Change:
- Reason:
- Affected agents:
- Affected files:
- Required action:
- Deadline / ordering:
```

## Completion Notices

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

## Human Intervention Notices

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
