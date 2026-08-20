---
name: engineering-delivery
description: Use for EVE or ELYS PR delivery after implementation is ready, including PR preflight, syncing and rebasing the latest base, conflict resolution, pr-review and pr-submit, GitHub reviewer routing, 阮鉴鉴 owner approval, Zaaaaade-initiated Elys Notification topics with 阮鉴鉴 personal-account mentions, monitoring JayGe or KK feedback, repairing and resubmitting the same PR, and continuing until the PR is approved. Also use when an existing ELYS PR has review feedback or needs its delivery loop resumed. For implementation before PR readiness, use elys-code-development.
---

# Engineering Delivery

## Contract

Own the complete PR delivery state, not only PR creation. Start when code is ready
to submit or an existing PR needs review work. Continue through owner approval,
group-topic review, feedback repair, resubmission, and final approval.

`PR created`, `PR updated`, `CI running`, `group card sent`, and `waiting for
review` are intermediate states. Do not report delivery complete until the
current PR head is approved or merged under the terminal-state rules below.

For implementation standards, testing discipline, backend/mobile rules, and
pre-PR verification, use `elys-code-development`. Do not duplicate them here.

## State Machine

| State | Meaning | Next action |
| --- | --- | --- |
| `READY` | Implementation evidence is ready | Run PR preflight, review gate, and `pr-submit` |
| `PR_OPEN` | `pr-submit` completed and the same PR exists at the intended head | Register owner approval batch; Bridge sends the card after the source Codex turn is idle |
| `OWNER_PENDING` | Waiting for 阮鉴鉴 to approve the already-submitted current head | Do not modify or resubmit the PR |
| `TOPIC_REVIEW` | Zaaaaade group card/topic and a structured JayGe/KK mention sent by 阮鉴鉴 exist | Monitor topic and GitHub |
| `REWORK_PENDING` | Actionable reviewer feedback exists for the current head | Repair the same PR and verify it |
| `RESUBMITTING` | Repair is verified | Run the review gate and `pr-submit`, then register the next owner-review version |
| `APPROVED` | Current head is approved or merged | Stop monitoring and finish |
| `BLOCKED` | Required identity/state/evidence is unsafe | Report exact blocker |

Never create a new PR, Feishu topic, or Codex task for a normal feedback cycle.
Reuse the same PR, source task, repository/worktree, group card, and topic.

## 1. Entry Gate

Before PR operations:

- Confirm the implementation goal, canonical requirement/spec URL, one-sentence
  `需求目标`, intended PR scope, and actual verification evidence.
- If implementation or required evidence is incomplete, return to
  `elys-code-development`; do not submit a partial PR as if ready.
- If collaboration mode is Plan Mode, produce only a decision-complete delivery
  plan. Do not stage, commit, push, create/update a PR, send Feishu, or write the
  PR record.
- Preserve user changes and exclude local env files, secrets, debug dumps,
  screenshots, generated artifacts, abandoned detours, and stale review reports
  unless explicitly part of the PR.

## 2. PR Preflight And Base Sync

Run and inspect:

```bash
git status --short --branch
git remote -v
gh auth status
git fetch --all --prune
git status --short
git diff --stat
git diff --name-status
git diff --cached --stat
git diff --cached --name-status
```

Resolve the repository root, current branch, upstream, remote default/base branch,
worktree state, authenticated GitHub identity, current head, and any open PR for
the branch. Update the existing PR instead of creating a duplicate.

Before review or PR submission, compare against the latest remote base:

```bash
BASE=<remote default branch, usually origin/main>
git merge-base "$BASE" HEAD
git rev-list --left-right --count "$BASE"...HEAD
```

- Rebase the feature branch onto the latest base unless repository conventions
  require merge or the user has prohibited mutation.
- Resolve only conflicts needed by the current branch and intended PR scope.
  Do not edit or take ownership of unrelated branches.
- After a rebase of a remotely published branch, use `--force-with-lease`, never
  plain force.
- Re-run relevant verification after conflict resolution or rebase.

## 3. Review Gate And PR Submission

Use the latest applicable `pr-review` against the real merge-base diff. Do not
submit when the gate fails or required verification is missing.

Before running the gate, check the latest `pr-review` in
`Nature-Select/ns-skills` and refresh the installed global copy when it changed.
Produce and commit the structured review report unless the user explicitly
overrides that artifact.

Use `pr-submit` for staging, commit, push, PR creation/update, body construction,
and GitHub mechanics, with these ELYS/EVE overrides:

- Do not perform TeamOps discovery, binding, validation, linking, or PR-body
  fields. TeamOps is not part of this delivery workflow even if the downstream
  `pr-submit` skill contains older TeamOps instructions.
- Use concise Chinese for commit message, PR title, and PR body.
- Default to ready-for-review, not Draft.
- Preserve one coherent major goal in one PR.
- Always request both GitHub reviewers `shaojie-dev` and `phpmaple`.
- Keep the canonical requirement/spec URL and exact one-sentence `需求目标`
  consistent across the PR body, owner card, group card, and topic request.
- Record only checks that actually ran and distinguish targeted verification
  from the full project gate.
- For product/application behavior changes, generate or update the tester-facing
  QA feature story. Skip it only for scopes where it is genuinely inapplicable
  and record the reason.
- Require the applicable technical plan and smoke-test document before formal
  handoff; do not fabricate links when either is blocked.

The ordering is strict: `review gate -> pr-submit -> owner-review card`. The PR
shown in an owner-review card is therefore already formally submitted at the
recorded head. Owner approval is a handoff decision for that head, not permission
to run the gate or submit it. After an approval callback, do not modify code,
rerun the review gate, push, call `pr-submit`, or create another delivery version.

Use this PR body structure:

```markdown
## 需求目标
<one concise sentence describing the user/business outcome>

需求文档：<canonical requirement/spec URL>

## 背景
<why this PR exists>

## 主要改动
- ...

## Review 结论
- Gate: PASS/FAIL
- pr-review 报告：<link>
- QA feature story：<link or 不适用：reason>
- P1/P2/P3 summary

## 验证
- `<command>`: 通过/失败，<short note>

## 已知问题
- <known debt or none>

## Reviewer 关注点
- <specific files/flows/risks>
```

## 4. Reviewer Routing

Keep responsible human reviewers, Feishu topic bots, and GitHub reviewers as
separate roles. If one PR spans surfaces, include every relevant route and say why.

| Surface | Responsible human reviewer | Feishu topic bot |
| --- | --- | --- |
| Backend, recommendation, Feed, content distribution | 杨少杰 | JayGe |
| App, iOS, Android, Flutter, mini program | 顾枫 | KK |
| Web, H5, official site, admin frontend, elysWebApp | 顾枫 | KK |

Only JayGe or KK is mentioned in the group-card topic. Zaaaaade publishes the
formal group card and initiates its topic; the authenticated `阮鉴鉴` personal
account sends the structured mention inside that topic. Do not send a formal
reviewer private-message card to 杨少杰、顾枫、JayGe, or KK.

## 5. Owner Approval And Group Handoff

After the ready-for-review PR exists and `pr-submit` has completed successfully:

1. Treat one Codex response as one atomic owner-review batch. Collect every PR
   made ready by this response before registration; never call the registration
   helper once per PR.
2. Build one Chinese Feishu schema 2.0 PR section per delivery with formal
   `PR 已正式提交` wording. Include the PR, branch, target environment,
   `需求目标`, requirement/spec URL, main changes, actual verification,
   documents, risks, and `来源：Codex`.
3. Set `human_reviewer` and `topic_review_bot` for every PR from the routing
   table. Do not resolve or persist a JayGe/KK `open_id` during registration.
4. Register the complete batch through the Bridge exactly once. Registration is
   not the same as sending the Feishu card: the source Codex response must finish
   first, then the resident Bridge sends the owner-only card after the source
   session has no open turn.

```bash
python3 /Users/ryanjade/.codex/skills/engineering-delivery/scripts/register_delivery.py \
  --payload /absolute/path/to/engineering-delivery.json
```

Payload contract (a single PR still uses a one-item `deliveries` array):

```json
{
  "deliveries": [
    {
      "pr_url": "https://github.com/.../pull/123",
      "pr_number": "123",
      "pr_title": "中文 PR 标题",
      "branch": "feature/example",
      "target_environment": "dev / staging / prod / 未部署",
      "human_reviewer": "杨少杰",
      "topic_review_bot": "JayGe",
      "card": {"schema": "2.0", "header": {}, "body": {"elements": []}}
    }
  ]
}
```

5. Inspect both `card_delivery` and `bridge_service_state` in the successful
   registration response. Enter `OWNER_PENDING` only when `card_delivery` is
   `deferred_until_source_session_idle` and `bridge_service_state` is
   `registered`. An empty `owner_message_id` is expected in that state: do not
   retry, manually send Feishu, or create another batch/card.
6. If `card_delivery` is `registered_bridge_unavailable`, registration is
   durable but automatic card delivery is blocked. Report `BLOCKED` with the
   returned `bridge_service_label`; do not claim that the card will be sent
   after the response ends. Restore the resident Bridge through its controlled
   deployment procedure. Its recovery loop will send only the latest unsent
   version for each source thread and PR.
7. The resident Bridge sends exactly one owner-only combination card to
   `阮鉴鉴` after the source session becomes idle, then binds the Feishu card
   action back to this same source Codex session. Each PR has its own approval
   button and annotation form. A partial decision is persisted only; the Bridge
   returns nothing to Codex until every PR in the batch has one decision.
8. Enter `OWNER_PENDING`. Report `batch_id`, every `delivery_id` and version,
   source session id, source cwd, pending status, and card delivery mode. If the
   owner `message_id` is empty and the Bridge is `registered`, state that the
   card is registered and will be sent after this Codex response ends. Do not
   claim completion.
9. After all decisions are collected, the resident Bridge—not the source model—
   executes every approved item's deterministic formal handoff before submitting
   the callback turn:
    - V1: use the persisted stable UUID and the Zaaaaade identity to send exactly
      one PR card to `Elys Notification` and initiate/reuse that card's topic;
      then use the authenticated 阮鉴鉴 personal account to send exactly one
      structured JayGe/KK review mention inside that topic;
    - V2+: reuse the Zaaaaade-created V1 formal card and existing topic, then use
      the authenticated 阮鉴鉴 personal account to send one new structured
      JayGe/KK review mention for the newly approved current head;
    - persist/recover the card message id and topic correlation, then register or
      resume the persistent watcher for that PR/topic.
   Raw duplicate sends are forbidden. Reconcile uncertain outcomes using the
   persisted delivery id and stable UUID. A model response is never the actuator
   for these side effects.
10. Only after the approved-item handoff is confirmed does the Bridge send one
   concise callback as one user message to this exact source Codex task. Approved
   items are factual notifications requiring no task action. Annotated items alone
   carry repair instructions. A mixed batch still arrives as one atomic callback.
   The callback must not ask an approved item to restore development, repair code,
   rerun a gate, push, call `pr-submit`, create another delivery version, send
   Feishu, or create a Codex automation.
11. Enter `TOPIC_REVIEW`. Treat a new commit as invalidating approval for the old
   head.

Use this callback shape; keep it short because the source task already owns the
full PR context:

```text
engineering-delivery 审核结果已收齐。

通过：<PR URL>，<delivery version>，head <SHA>。
该 head 已完成 review gate 与 pr-submit；不要修改、push 或再次提交。
Bridge 已完成交付接力：Zaaaaade 已在 Elys Notification 发布或复用正式 PR 卡并
发起其话题，阮鉴鉴个人账号已在该话题中结构化 @<JayGe|KK> 请求 review；
持久 watcher 已启动。
当前 Codex task 无需操作。无变化时静默；只有新增有效反馈才恢复本 session。
```

If an item received an annotation instead of approval, do not apply the approved
handoff instruction to that item. Record the annotation as owner feedback and
handle it through the same-PR rework cycle; mixed decisions still arrive as one
atomic callback message.

Hard gates:

- `CODEX_THREAD_ID` must exist for registration.
- The registration script must succeed.
- The source task must not expose an interactive owner card before its own
  response has ended; owner-card send is Bridge-owned delayed work.
- The formal group card and topic root are Bridge-owned deterministic artifacts,
  use the persisted stable UUID, and must be published/initiated through the
  Zaaaaade identity.
- The formal group handoff is created from the persisted owner decision; it must
  not depend on callback wording, model interpretation, or a model-invoked script.
- A timeout or missing message id is an uncertain outcome; reconcile with the
  same UUID instead of blindly resending.
- On Feishu `99992402 field validation failed`, preserve the attempt and exact
  error, then reconcile with the same UUID; never retry with an empty or new UUID.
- A topic mention must be sent by the authenticated `阮鉴鉴` personal account,
  open id `ou_cd2350ad4f8d94b17855ab7b51fc8ef4`.
- Zaaaaade, the Bridge's bot/app identity, or another human account must not send
  the topic mention. Bridge may orchestrate the call only through the authenticated
  阮鉴鉴 personal account.
- Query `Elys Notification` bots at send time, match `bot_name`
  case-insensitively, and require exactly one JayGe/KK match. Plain text
  `@JayGe` or `@KK` is not a fallback.

Fixed recipients:

```text
Owner: 阮鉴鉴
open_id: ou_cd2350ad4f8d94b17855ab7b51fc8ef4
p2p_chat_id: oc_d504a86a5cf954f64b5e0788472cacf9

Group: Elys Notification
chat_id: oc_7aaa4e52499c2568a5383bdff46f49ab
```

Topic request content must include the structured mention, PR URL, canonical
requirement/spec URL, unchanged one-sentence `需求目标`, and a concise request.
The Zaaaaade topic root and the 阮鉴鉴-authored mention are separate identity
events; neither identity may substitute for the other.

## 6. Review Loop

Immediately after the topic mention, read
[pr-review-loop.md](references/pr-review-loop.md) completely and execute it as
the continuation of this workflow. Do not invoke a separate review-loop skill.

Monitoring is Bridge-owned infrastructure, not a Codex automation. Feishu topic
replies arrive through EventKey; GitHub state is read by the Bridge's deterministic
`gh` probe with a persisted snapshot/cursor. Unchanged probes stay silent and do
not start a Codex turn. Only a new relevant or ambiguous delta may restore the
source task. Never create a user-visible Codex scheduled task, recurring automation,
or heartbeat for this review loop. Persist enough correlation state to restore the
source task, repository, worktree, branch, PR, group card, and topic after restart.

## 7. PR Record

After the formal group card and topic mention are confirmed, insert the newest
PR at the top of the `PR记录` table:

```text
https://hcnqwxuq730f.feishu.cn/wiki/Ti2cwIWkciKuw3kPNNvcc1VEnoc
```

The Docx wiki node is titled `Elys项目`, object token
`C7aUdRbs6oSCsWx8uuOc8ZOOnWb`.

- Fetch by keyword `PR记录` before writing and preserve all existing rows.
- Insert immediately after the header, newest first.
- Include PR link/surface, concise brief, Asia/Shanghai date in `YYYY.MM.DD`,
  current review state, project doc if any, required technical plan, and required
  smoke-test document.
- Verify by fetching the table again.
- When the PR becomes `APPROVED`, update the same row's review state instead of
  inserting a duplicate.
- If the table cannot be updated safely, report the intended row and blocker;
  do not claim full delivery completion.

## Terminal States

Before every monitoring cycle and after every PR update, inspect the current PR
head, review state, unresolved blocking threads/comments, checks, and merge state.

Success:

- The PR is merged; or
- The current head has the required authoritative approval and no unresolved
  blocker that invalidates that approval.

Approval attached to an older head is stale after a new repair commit. Continue
the loop until the current head is approved.

On success:

1. Set state to `APPROVED`.
2. Mark the Bridge watcher terminal; there is no Codex recurring task to cancel.
3. Update the existing PR record to `review 已通过` or `已合并`.
4. Report the PR URL, approved head, approval/merge evidence, and final checks.

Not success:

- PR open with review pending;
- CI green without approval;
- topic quiet or reviewer merely acknowledged;
- changes requested or unresolved blocker;
- owner approval missing for a repair;
- PR closed without merge.

Closed without merge or explicitly cancelled is a terminal stop, but not a
successful delivery.

## Common Failures

- Treating PR creation as completion.
- Treating owner approval as permission to rerun the review gate or `pr-submit`
  even though the reviewed PR head was already formally submitted.
- Starting a second PR/topic/task for review repair.
- Expanding a reviewer-feedback repair beyond the confirmed feedback and PR
  scope.
- Using a stale approval from a previous PR head.
- Sending a reviewer private card instead of the group-card topic mention.
- Letting an identity other than Zaaaaade publish the formal group card or
  initiate its topic.
- Letting Zaaaaade or another app/bot/human identity send the JayGe/KK mention
  instead of the authenticated 阮鉴鉴 personal account.
- Treating empty `owner_message_id` after registration as failure when
  `card_delivery` says the card is deferred until source-session idle.
- Claiming a deferred card will be sent when `card_delivery` is
  `registered_bridge_unavailable` or `bridge_service_state` is not `registered`.
- Sending or testing an owner review card while the source Codex turn is still
  open, which makes early button clicks race the same session turn.
- Blindly resending an ambiguous Feishu card with a new UUID.
- Executing TeamOps steps inherited from an older downstream `pr-submit`.
- Adding a duplicate PR record row after approval.
- Claiming full verification when only targeted checks ran.
