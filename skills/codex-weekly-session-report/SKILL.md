---
name: codex-weekly-session-report
description: Create evidence-based Codex work-session reports and a reviewable local work-status page. Use whenever someone asks to review last week or any date range of Codex sessions, summarize project work, audit session history, build a weekly work dashboard, or prepare a Feishu/Miaoda signature page. Always inspect rollout content and event timestamps, include older sessions that continued during the window, separate automation from human work, and use the two-stage local-preview-then-approved-publish workflow when sharing externally.
compatibility: Requires Python 3.9+ and a local Codex state_5.sqlite with accessible rollout JSONL files. Review-page E2E needs a controllable local browser. Feishu/Miaoda publishing is optional and requires lark-cli plus a configured app ID.
---

# Codex Weekly Session Report

Build a conservative, evidence-backed work report from accessible Codex sessions. Do not classify by title alone, and do not treat a local estimate as a product or Desktop UI metric.

## 1. Configure

Before scanning, resolve these values from the user, project, or environment:

- `CODEX_HOME`, defaulting to `~/.codex`.
- Local timezone. For “last week”, use Monday 00:00 through the next Monday 00:00 in that timezone.
- Optional page paths: source fragment, standalone preview, and publish directory.
- Optional Miaoda app ID and publish URL. Never invent them.

If the user wants to share the result with coworkers or leadership, use the generic public-sharing rules in `references/review-and-publish.md` and remove local paths, secrets, private-life details, raw IDs, and internal logs.

For maintenance, handoff, or architecture-review requests, read `references/maintainer-handoff.md` before changing the skill or its automation. Keep portable workflow rules in this skill, machine-specific paths and schedules in the automation configuration, and per-run evidence or review state outside the skill bundle.

## 2. Collect Evidence

Run the bundled collector before writing conclusions:

```bash
python3 scripts/collect_codex_sessions.py \
  --last-week \
  --timezone America/New_York \
  --out-dir /tmp/codex-weekly-session-report
```

For a fixed range:

```bash
python3 scripts/collect_codex_sessions.py \
  --start 2026-07-27 \
  --end 2026-08-03 \
  --timezone America/New_York \
  --out-dir /tmp/codex-weekly-session-report
```

The collector reads every indexed thread with a rollout path, then decides whether it was active by each rollout event timestamp. It must not filter candidates only by `created_at`, `updated_at`, or title. This is what catches older long-running sessions continued during the week.

Treat these fields as the evidence boundary:

- `active_in_window`: at least one rollout event timestamp is inside the window.
- `continued_older_sessions`: active sessions created before the window.
- `candidate_for_review`: active by rollout timestamp, or an explicit access gap requiring manual review.
- `rollout_error`, missing files, missing timestamps, and no assistant result: access gaps, not successful work.

Read `sessions.jsonl` and the relevant rollout files. Capture the title, meaningful user requests, process/tool evidence, final result, and dates. Use `sessions.tsv` for compact review and `summary.json` for counts.

## 3. Classify and Merge

Include only clear work: engineering, product/operations, data analysis, evaluation, release/deploy, debugging, work communication, documentation, or workflow/process construction.

Exclude private life, entertainment, casual experiments without work output, and automation repeats from human-work totals. Put ambiguous sessions in `待确认` and keep them out of formal work counts.

Merge repeated sessions by project and outcome, not by title or session count. Merge retries, subagents, canaries, PR review loops, and continuation sessions when they serve the same outcome. Distinguish discussion, local-only work, PR opened, PR merged, deployed, and externally verified results.

Automation counts are separate. Never count an automation run as a human session, and never let automation or skill-sync code changes inflate product PR/code metrics.

## 4. Token and Code Metrics

When the report claims compatibility with the Codex Desktop profile UI, use the profile daily usage buckets from `/backend-api/wham/profiles/me` and sum the exact requested week. Do not substitute `threads.tokens_used`, rollout `total_tokens`, screenshots, or a cached/input/output derivation. If the profile endpoint is unavailable, say that the metric is unavailable.

For code volume, use a clearly defined source-backed metric such as product PR additions/deletions in the window. Exclude automation-only and skill-sync changes. Never call a line count “code written” if it is only a plan or generated diff that was not applied.

## 5. Two-Stage Review and Publish

When a local page or Feishu/Miaoda page is requested, always use this gate:

### Stage A: local preview only

1. Update the supplied page template with evidence-backed content.
2. Generate the standalone HTML, inject `scripts/inject_review_storage_bridge.py`, and show the absolute local preview path. Keep the rendered iframe sandboxed; do not add `allow-same-origin` merely to obtain storage.
3. Include four review modules: top metrics, what is being progressed, actual difficulties, and next steps.
4. In the local owner copy, provide card-level confirm, delete, restore, and note controls; also provide one overall-review note and a `复制审核反馈` fallback. Save browser state through the injected bridge and automatically mirror it to a run-scoped `review-feedback.json` sidecar.
5. Start `scripts/serve_review_preview.py` on `127.0.0.1` for the current standalone page and sidecar. Keep the hosted/public copy read-only: the bridge may sync only when the outer page is `file://`, `localhost`, or `127.0.0.1`.
6. Generate a separate local-only session review list containing included, excluded, and uncertain sessions. Never embed this private audit list in the public source or standalone page.
7. Write a review-state record containing the window, source path, preview path/URL, sidecar path, source and preview checksums, storage-bridge/server paths and checksums, status `awaiting_user_review`, modules, card titles, and review capabilities.
8. Do not call any Miaoda publish command in this stage.
9. Ask the user to review every module. When they say comments are complete, read the sidecar directly; `复制审核反馈` is only a fallback if the sidecar is absent or stale. Browser review state still does not alter source HTML and is never publish authorization.

After the regular renderer runs, inject the bridge into the exported standalone page:

```bash
python3 scripts/inject_review_storage_bridge.py /absolute/path/to/work-status-standalone.html
```

Then serve the local review page and persist browser comments to a sidecar:

```bash
python3 scripts/serve_review_preview.py \
  --html /absolute/path/to/work-status-standalone.html \
  --feedback /absolute/path/to/run/review-feedback.json \
  --host 127.0.0.1 \
  --port 8765
```

### Mandatory review-page E2E

Do not hand off the preview based only on HTML parsing, unit tests, a button label, or generic headless Playwright. When the Codex in-app Browser is available, test the actual generated page there through a localhost URL. Browser automation may reject `file://`; that means the file-tab path is unverified, not that the feature passed.

Run this observable flow:

1. Enter the detail view and verify every review card has `确认这条`, `写备注`, and `删除`; verify the overall note and `复制审核反馈` are visible in owner mode.
2. Write a temporary card note and overall note, confirm one card, delete and restore one disposable card, and wait until the UI reports `已同步到本地审核文件`.
3. Read `review-feedback.json` and verify it contains the same temporary notes and card state. Reload, return to the detail view, and verify the same state from visible UI.
4. Click `复制审核反馈` and read the actual clipboard. The copied text must contain both temporary notes; a button changing to `已复制` is not evidence.
5. Remove all temporary notes and confirmation state, wait for the sidecar to clear, reload again, and verify the page returns to zero test notes with no test text in the clipboard or sidecar.
6. Force or inspect read-only mode and verify all owner controls are hidden.

If any step cannot be executed, report the exact unverified surface. Never call the interaction E2E-complete.

### Stage B: explicit approval, then publish

1. Continue only after an explicit message such as `审核通过，发布`.
2. If the user says comments are complete, read the configured sidecar and validate its `updated_at`, expected card IDs, overall note, and card state. Do not inspect browser storage or browser-profile files.
3. If the sidecar is absent or stale, ask the user to refresh the local preview once. Use the output of `复制审核反馈` only as a fallback.
4. Apply every explicit deletion and note to the source, using confirmation only as acceptance evidence; regenerate and re-run the review-page E2E; reset status to `awaiting_user_review`, and stop.
5. Before publishing, re-read the review state and verify the source checksum and preview match the approved window.
6. Publish the same configured Miaoda HTML app. Poll until `status=finished` and an `online_url` is returned. Never report local generation as publication.
7. Record the release ID, URL, publish time, and access-scope status. If the app is creator-only, say so and point to the Miaoda management page for manual visibility configuration.

See `references/review-and-publish.md` for the exact checklist and `config.example.json` for portable path/app configuration.

## 6. Report Contract

Write Chinese by default, using plain language and conclusion-first ordering:

1. `本周工作摘要`: 3-7 important conclusions.
2. `已完成事项`: item, actual result, and evidence.
3. `进行中事项`: current state, next step, owner if inferable.
4. `关键决策与变更`.
5. `风险、阻塞与失败尝试`.
6. `下周待办建议`: executable priorities.
7. `数据概览`: scanned, active, human, automation, included, excluded, uncertain, and access gaps.
8. `待确认会话`: title, boundary reason, and why it is excluded from formal totals.

Never present an inference as a verified result. State the exact date range, timezone, accessible sources, missing rollouts, and unverified external effects.
