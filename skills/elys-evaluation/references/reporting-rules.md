# Reporting Rules

The report is determined by the manifest. Do not reuse the `feed_rewrite` table shape for unrelated evaluations.

## Required Content

Every Elys evaluation report should include:

- evaluation goal and decision supported
- dataset source and correction/validation process
- coverage: source rows, eligible rows, invalid rows by reason
- baseline and candidate definitions
- user prompt format and construction rule for the test cases
- system prompt version/source under test
- model configuration for candidate and judge calls
- deterministic metrics
- LLM judge metrics, if used
- per-segment summary when the manifest defines segments
- representative successes and failures
- limitations and known ambiguities
- link or path to full detail table
- actual judge prompt or link/path to it

## Detail Table

The detail table columns are manifest-specific. Include enough fields to audit each row:

- source locator and sample id
- true input
- baseline output or reference, if any
- candidate output
- deterministic check result
- judge result
- error reason

For long outputs, keep full local artifacts and write shortened Feishu cells only when necessary.

## Accuracy Rules

- Metrics must state their denominator.
- Invalid or unlocatable rows must be counted separately from evaluated rows.
- Do not hide model or parse failures inside aggregate scores.
- If gold labels are ambiguous, report the ambiguity but keep the manifest-defined counting rule.
- After writing Feishu artifacts, read them back and verify required sections and row counts when permissions allow.
