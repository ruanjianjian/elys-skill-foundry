# Maintainer Handoff

Use this document when another model or maintainer needs to audit, extend, or port the weekly-session-report workflow. This is the portable architecture contract; installation-specific paths, schedules, credentials, review state, and published app IDs belong outside the skill bundle.

## Read First

1. Read `SKILL.md` for the end-to-end behavior contract.
2. Read `references/review-and-publish.md` before changing review controls or publishing.
3. Inspect the scripts and tests before proposing new helpers.
4. Inspect the current automation configuration and latest review-state file separately; do not infer live state from this document.

## Purpose

Turn accessible Codex sessions into a conservative, evidence-backed Chinese weekly work report, then gate external publication behind an owner-only local review flow.

The workflow must answer two different questions without mixing them:

- What work is supported by session evidence during the requested window?
- What content has the owner explicitly approved for public sharing?

## Data Flow

```text
state_5.sqlite + rollout JSONL
  -> collect_codex_sessions.py
  -> sessions.jsonl / sessions.tsv / summary.json
  -> content-level classification and project-level deduplication
  -> source report HTML + private session audit HTML
  -> standalone renderer
  -> sandboxed storage bridge + localhost review server
  -> review-feedback.json + review-state.json
  -> owner feedback applied to source
  -> regenerated preview and in-app Browser E2E
  -> explicit publish approval
  -> optional Miaoda release and release-status verification
```

## Source-of-Truth Boundaries

| Concern | Source of truth | Notes |
| --- | --- | --- |
| Candidate sessions | Local Codex index plus rollout event timestamps | Creation time, update time, title, and thread-list results are not sufficient. |
| Work classification | User requests, execution evidence, and final results | Ambiguous sessions stay outside formal totals. |
| Project status | Verifiable artifacts such as PRs, commits, tests, releases, documents, or messages | Discussion and plans are not delivery. |
| Desktop Token metric | Profile daily-usage buckets for the exact window | Other token fields are different metrics and must not be substituted. |
| Code volume | Source-backed product PR additions and deletions | Exclude automation-only and skill-sync changes. |
| Review feedback | Run-scoped `review-feedback.json` sidecar | Browser state alone does not change source content or authorize publication. |
| Review lifecycle | Run-scoped `review-state.json` | Checksums bind approval to one source, preview, and reporting window. |
| Publication | Release API result with `status=finished` and an `online_url` | Local rendering is not publication. |

## Non-Negotiable Invariants

- Calculate the requested business timezone first and use a half-open Monday-to-Monday window.
- Decide activity from rollout event timestamps so older sessions continued in the window are included.
- Read session content; never classify or claim completion from titles alone.
- Count automation separately from human work, and merge retries, subagents, canaries, and continuation sessions into their parent outcome.
- Keep `待确认` out of formal work totals.
- Distinguish local completion, PR opened, PR merged, deployment, publication, and externally verified effects.
- Keep the private session audit out of the public report and publish directory.
- Keep the public page read-only. Owner review controls belong to localhost or another authenticated owner surface.
- Apply feedback to source, regenerate, and re-review before publication. Clicking confirm or writing a note is not publish approval.
- Do not modify an active schedule or publish a release during a read-only handoff review.

## Implementation Matrix

| Capability | State | Evidence in this skill | Remaining gap |
| --- | --- | --- | --- |
| Session candidate scan | Implemented | `scripts/collect_codex_sessions.py` | Classification still requires content review. |
| Older continued-session detection | Implemented | Collector checks rollout event timestamps | Add regression coverage before changing timestamp parsing. |
| Work classification and deduplication | Partially implemented | Rules in `SKILL.md` | Model or human judgment remains necessary. |
| Profile Token metric | Contract only | Metric rules in `SKILL.md` | No bundled authenticated fetch-and-sum helper. |
| PR and code-volume metrics | Contract only | Metric rules in `SKILL.md` | No bundled multi-repository collector. |
| Skill-invocation metrics | Installation-specific | Not part of the generic collector | Define a stable event schema before scripting. |
| Review storage bridge | Implemented and unit-tested | Bridge/server scripts and tests | Still requires generated-page E2E. |
| Generated-page review E2E | Procedural | Checklist in `SKILL.md` | Must run in the actual controllable in-app Browser. |
| Miaoda publication | Optional external step | Command/checklist only | Requires local auth, configured app, and access-scope verification. |

## Change Placement Rules

- Put reusable behavior and evidence rules in `SKILL.md`.
- Put detailed reusable procedures in a one-level-deep `references/` file.
- Put deterministic and fragile operations in `scripts/` with tests.
- Put user paths, schedules, app IDs, URLs, and business timezone in the automation or local config.
- Put weekly evidence, sidecars, checksums, and release records in a run directory.
- Do not copy current review feedback, session content, credentials, or live automation state into a distributable skill.

## Review Checklist for a New Maintainer

Return an evidence matrix with `已实现 / 部分实现 / 未实现 / 无法确认` before proposing edits.

Check these questions:

1. Can the collector prove it finds old sessions with in-window rollout events?
2. Can every public claim be traced to session or artifact evidence?
3. Are automation runs excluded from human session counts?
4. Are Token, PR, code, and skill-use metrics labeled by their exact source and limitations?
5. Can stale feedback or a changed source bypass the checksum gate?
6. Can a public visitor reach owner controls or write review state?
7. Does the release verifier distinguish upload, processing, success, and access scope?
8. Which important steps remain prompt-only and should become tested scripts?

## Suggested Discussion Prompt

```text
Read SKILL.md, references/maintainer-handoff.md, references/review-and-publish.md,
the current automation configuration, and the latest review-state file.

Do a read-only architecture and correctness review. Do not edit the schedule,
do not publish, and do not mutate review state. Return:
1. an evidence matrix: implemented / partial / missing / unverifiable;
2. the top correctness and maintainability risks;
3. where the automation prompt duplicates or conflicts with the skill;
4. a small migration plan that first scripts the highest-risk prompt-only steps;
5. exact files you would change, but no changes until the owner approves.
```
