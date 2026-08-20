# ELYS / EVE Development Standards

## Contents

- Repository grounding
- Git identity and remote transport
- Plan and checklist discipline
- Architecture and scope
- File and documentation hygiene
- External dependencies
- Testing and experience verification
- Backend development and deployment
- Mobile development
- Official Flutter specialist skills
- Completion claims

## Repository Grounding

- Fetch the relevant remotes before relying on repository instructions when
  network access and repository state allow it. Fetching must not overwrite user
  changes.
- Determine the remote default branch and inspect its latest guidance files.
  Search the root and relevant ancestor/module directories for names such as
  `AGENTS.md`, `agents.md`, `Agent.md`, `DEV.md`, `dev.md`, `CLAUDE.md`,
  `CONTRIBUTING.md`, and applicable `README.md` files.
- Read guidance from the latest remote default branch where possible, then read
  current-branch/local guidance for branch-specific additions. If they conflict,
  follow the user's instructions first, then the most specific current repository
  rule; surface any conflict that changes behavior.
- Do not hardcode one checkout path for repository guidance. Resolve the current
  repository and relevant package dynamically.
- Read the real call path, configuration, startup wiring, tests, and nearby
  conventions before designing or editing. A filename, handler, flag, or package
  name alone is not runtime evidence.

## Git Identity and Remote Transport

- Before any remote read or write, inspect `git status --short --branch`,
  `git remote -v`, the active branch/upstream, and the authenticated GitHub
  identity. For ELYS/Nature Select writes, verify that `gh api user --jq .login`
  returns `ruanjianjian` unless the user explicitly selected another account.
- Treat `Permission denied (publickey)` from an SSH `origin` as a transport and
  credential mismatch, not proof that the repository or branch is unavailable.
  Resolve the exact `OWNER/REPO` from the verified remote or GitHub CLI; never
  guess a similarly named repository.
- If SSH fails but the expected GitHub CLI account can access the repository,
  use an explicit HTTPS URL for that command. Keep the existing remote and
  worktree untouched. Do not automatically run `git remote set-url`,
  `git config --global`, `gh auth setup-git`, add SSH keys, or embed a token in
  a URL or log.
- Use the GitHub CLI credential protocol as a non-persistent helper when needed:

  ```bash
  repo_url="https://github.com/OWNER/REPO.git"
  git -c credential.helper= \
    -c credential.https://github.com.helper='!gh auth git-credential' \
    ls-remote "$repo_url" HEAD
  git -c credential.helper= \
    -c credential.https://github.com.helper='!gh auth git-credential' \
    fetch --prune "$repo_url" \
    '+refs/heads/*:refs/remotes/origin/*'
  ```

  This refreshes the local `origin/*` tracking namespace without changing the
  configured `origin`. Stop and report the blocker if the HTTPS probe also
  fails; do not silently mutate persistent authentication settings.
- Push the current branch through the same explicit HTTPS path when delivery
  requires it:

  ```bash
  branch="$(git branch --show-current)"
  test -n "$branch"
  git -c credential.helper= \
    -c credential.https://github.com.helper='!gh auth git-credential' \
    push "$repo_url" "HEAD:refs/heads/$branch"
  remote_sha="$(
    git -c credential.helper= \
      -c credential.https://github.com.helper='!gh auth git-credential' \
      ls-remote "$repo_url" "refs/heads/$branch" | awk '{print $1}'
  )"
  test "$remote_sha" = "$(git rev-parse HEAD)"
  git -c credential.helper= \
    -c credential.https://github.com.helper='!gh auth git-credential' \
    fetch "$repo_url" \
    "+refs/heads/$branch:refs/remotes/origin/$branch"
  ```

  Read back the remote branch SHA after the push and refresh its
  `refs/remotes/origin/$branch` ref before reporting success. GitHub CLI login
  alone is not push evidence.
- If a reviewed rebase or amended history truly requires a non-fast-forward
  update, capture the exact current remote SHA immediately before pushing and
  use `--force-with-lease="refs/heads/$branch:$expected_remote_sha"`. Never use
  plain `--force`, never use a stale lease, and never overwrite a remote update
  made after the expected SHA was captured.
- Keep responsibilities explicit: `git` owns local stage, commit, fetch, and
  push; `gh` provides authenticated GitHub discovery/API operations and the
  temporary HTTPS credential helper. A successful `gh pr create` or API call
  does not prove that Git transport succeeded.

## Plan and Checklist Discipline

- Read `plan.md` before `checklist.md`, then implement against both.
- Keep implementation aligned with the agreed plan and acceptance criteria.
  Avoid speculative features, framework migrations, and nearby cleanup.
- Treat `checklist.md` as a durable progress ledger for long tasks. Update one
  checkbox immediately after its behavior and verification are complete.
- Do not batch-mark the checklist at the end and do not mark work complete based
  only on code presence.
- After context compression or task resume, re-read the checklist, relevant plan,
  current diff, and recent verification evidence before continuing.
- Maintain ownership: if the checklist is incomplete, stale, contradictory, or
  technically unsafe, reconcile it instead of executing it mechanically.

## Architecture and Scope

- Prefer the smallest closed-loop change that delivers the requested behavior.
- Keep responsibilities cohesive and dependencies explicit. Preserve existing
  module boundaries and avoid reverse dependencies.
- Add an abstraction only when it removes demonstrated complexity, consolidates
  repeated behavior, or matches an established repository pattern.
- Do not add global registries, broad interfaces, new frameworks, or cross-domain
  helpers for a local fix.
- Keep production files at or below 500 lines where practical. If the current
  change would enlarge an already oversized file, extract the touched
  responsibility along a real ownership boundary. Generated code and tests are
  exempt; do not split files mechanically just to satisfy a number.
- Keep one coherent major goal in one PR. Do not fragment a goal into frequent
  PRs solely to reduce diff size.

## File and Documentation Hygiene

- Give each new handwritten production file a concise purpose comment near the
  top, no longer than 100 Chinese characters or the repository's equivalent
  language. Skip it when the language or repository convention forbids such
  headers or the file is generated.
- Update existing module documentation when behavior, ownership, configuration,
  or operating procedures change.
- Add a `README.md` or `readme.md` for a new long-lived domain/module directory
  when it clarifies ownership and usage. Do not create README files in generated,
  vendor, fixture, trivial leaf, or framework-mandated directories.
- Do not create temporary Markdown documents unless the task needs them. Remove
  temporary documents after use.
- Create a long-lived document only when its owner and update path are clear.
  Keep it current or remove it when obsolete.
- Avoid duplicate plan, checklist, review, and status documents that can drift
  from one another.

## External Dependencies

- Investigate an external contract before implementing against it. Prefer the
  repository's existing clients, test scripts, schemas, official documentation,
  controlled requests, and real traces.
- For a provider/consumer boundary, record the frozen contract version, source
  artifact, owners, exact field/state/error semantics, compatibility, shared
  fixtures, and conformance plan before parallel implementation.
- Do not treat a compiling mock as proof that an external API works.
- Record request/response shape, authentication boundary, timeout, retries,
  error mapping, rate limits, idempotency, and fallback behavior where relevant.
- Propagate context and cancellation through external calls. Bound retries,
  goroutines, queues, workers, and in-memory buffers.
- Keep secrets and direct personal data out of code, logs, tests, screenshots,
  and reports.

## Testing and Experience Verification

- Write tests from acceptance behavior and the user's observable journey:
  Given the real starting state, when the user or caller performs the action,
  then the expected business outcome and failure behavior occur.
- Unit tests may mock narrow external boundaries, but mocked interface plumbing
  is not sufficient completion evidence.
- Select supporting test layers according to the feature's risk. Do not require
  every task to pass mock, contract, replay, integration, lane, simulator, and
  device checks as a fixed sequence.
- Use the project's existing test framework and fixtures. Do not introduce a new
  runner without a concrete need.
- Run applicable layers:
  - unit tests for business rules and high-risk edges;
  - API/integration tests through the real handler/service/repository boundary;
  - E2E or manual experience verification for the critical user flow;
  - regression tests for the original failure;
  - real-device/profile verification for mobile behavior;
  - lane/dev smoke or pressure checks when the goal requires deployment,
    performance, or capacity evidence.
- Real external systems may be isolated behind explicit integration tags or
  environment gates so default test suites stay safe and deterministic. Run the
  gated test when its evidence is required.
- Never weaken assertions, add `skip`, or delete a failing case merely to make a
  suite green.
- Report actual commands, environment, test scope, and meaningful result. Do not
  call targeted tests a full gate.
- Keep the user-facing delivery state centered on `开发中`,
  `真实 E2E 验证中`, `真实 E2E 已通过/未通过`, or `待用户人工验收`.
  Expose supporting layers when they explain a blocker or risk, or when the user
  asks for them.

Record authoritative tests using exactly:

| 测试需求点 | 测试的内容（用户视角） | 是否通过 | 测试的证据 |
| --- | --- | --- | --- |

Describe the action and result from the user's perspective. Evidence must be
reproducible, not merely say "tested".

When a test conclusion depends on a model call, preserve the complete model
input and output in the evidence, plus model/version, timestamp, and trace or
request identifier when available. A durable log artifact is acceptable for
long payloads, but a paraphrase is not. Redact credentials and secrets without
removing the business evidence.

## Backend Development and Deployment

- Use `elys-backend-technical-design` before non-trivial backend implementation,
  especially for API/data/async changes, module boundaries, migrations,
  performance, capacity, or impact analysis.
- Preserve `handler -> service -> repo/client` dependency direction and current
  repository conventions.
- Trace behavior through startup wiring, workers, data stores, feature flags, and
  observability before claiming a chain is connected.
- For every ELYS test or acceptance path that exercises backend behavior, use
  `elys-backend-local-run` as the default. Run the current worktree on the Mac
  through the repository's `make local` chain and connect to real dev
  dependencies through mirrord and Infisical. Do not substitute local databases,
  direct `go run`, copied secrets, or a mock-only service path.
- After every coherent backend behavior update, including review repair, prove
  the local process loaded the current worktree state and rerun the affected
  authoritative API or user journey. Reuse a healthy supervised process and hot
  reload where supported; do not perform an unnecessary cold start after every
  file save. Evidence from code before the update is stale.
- Default to API-only. Worker/all validation must follow
  `elys-backend-local-run` safeguards and requires an explicitly requested
  asynchronous chain plus controlled shared-queue impact.
- Use `elys-dev-deploy` only for an explicitly requested remote dev/lane
  deployment or when the required acceptance boundary cannot be represented by
  local execution against dev dependencies. Examples include dev services that
  must call back into the backend, controlled inbound routing, shared-environment
  behavior, and release/deployment proof.
- When remote validation is needed, use a backend lane to isolate the current
  backend feature branch where its boundary is sufficient. Only `elys-backend`
  supports this lane path; Loom API has no independent lane, and backend lanes
  do not provide IM communication.
- Use ordinary shared-dev deployment only when the required path truly needs the
  shared environment or a stable remote target for human acceptance. Document
  why `elys-backend-local-run` cannot cover that boundary before deploying.
- During ordinary shared-dev conflict handling, use the current run detail's
  `featureBranch` as the ownership boundary. Resolve a conflict only when that
  value equals the active task branch, and only in the run's temporary
  `release/...` branch. After pushing that resolution and executing
  `我已解决完冲突`, re-read the run detail. If the next blocker names another
  feature branch, stop without merging, editing, committing, pushing, or
  executing an action for that branch unless the user explicitly authorizes
  cross-branch conflict resolution for the current run. With that authorization,
  resolve and push only the temporary `release/...` branch; never modify another
  owner's feature branch. Shared dev contains multiple in-progress features; a
  blocked pipeline alone is not permission to repair every owner's conflicts.
  Never remove or reorder branches to bypass the blocker. Without authorization,
  report the current branch conflict as resolved while deployment remains
  blocked by the named owner branch. Escalate a real contract incompatibility
  instead of hiding it in merge work.
- Do not claim deployment success until run details prove the source branch,
  commit, target environment, and successful terminal state.

## Mobile Development

- Use `elys-app-dev` for Elys app changes and follow its module, generated-code,
  routing, Pigeon, tracking, and native-boundary rules.
- Read [flutter-official-skills.md](flutter-official-skills.md) for Flutter
  changes and invoke only the official specialist skills that match the current
  work. They supplement project rules; they do not replace `elys-app-dev`,
  repository guidance, or established architecture and dependencies.
- Implement iOS native code in Swift and preserve the repository's iOS layering
  and concurrency requirements.
- Keep Android product implementation in Flutter unless the task touches an
  explicitly existing native integration boundary. Do not create an Android
  native implementation when the Flutter path is the product owner.
- Keep Flutter fallback behavior working when iOS adds native UI.
- Whenever an iOS physical-device build, install, or run is needed, use profile
  mode by default, such as `flutter run --profile`, `flutter build ios
  --profile`, or the repository-equivalent Xcode Profile configuration. Use
  debug or release mode only when repository rules or the user explicitly
  require it.
- Record the device, build commit, command/configuration, and resulting build or
  run status. A debug simulator run cannot substitute for required iOS
  physical-device evidence.

## Official Flutter Specialist Skills

- Prefer the installed official Flutter skill for a matching task instead of
  recreating framework guidance from memory.
- Load the smallest applicable set. Do not load all Flutter skills for every
  mobile change.
- Before accepting a skill's package, routing, architecture, serialization, or
  test example, inspect the repository's existing implementation and dependency
  choices. Preserve compatible local conventions unless the task explicitly
  requires a migration.
- Some official workflows use Dart and Flutter MCP tools. Detect whether those
  tools are actually available; otherwise use the repository's Flutter/Dart
  commands and report the missing interactive evidence rather than claiming it.

## Completion Claims

- Distinguish code complete, tests passed, user flow verified, deployed, released,
  pressure-tested, PR submitted, and PR approved.
- A process still running, a mocked request succeeding, or CI merely starting is
  not completion.
- For small scoped changes, require the relevant automated tests and the
  authoritative real user-journey evidence.
- For high-risk backend, performance, capacity, or chain changes, require the
  applicable lane/dev and load evidence before claiming that broader goal.
- Default implementation completion means the required real end-to-end journey
  passed and the exact build/environment is ready for human acceptance.
- Before handoff, provide exact client/backend commits, deployed environment,
  test account and data prerequisites, user steps, expected results, known
  limitations, and recovery or rollback notes.
- When the explicit goal says completion requires online deployment and pressure
  testing, only a successful online pressure test satisfies it.
- PR submission and reviewer approval belong to `engineering-delivery`.
