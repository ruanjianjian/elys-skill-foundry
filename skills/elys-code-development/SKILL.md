---
name: elys-code-development
description: >-
  Implements and verifies ELYS/EVE changes against frozen cross-boundary
  contracts, repository rules, authoritative user-journey tests, and real
  end-to-end acceptance evidence. For every coherent ELYS backend behavior
  update, use elys-backend-local-run as the default validation path by running
  the current worktree locally against real dev dependencies before PR delivery.
  Use for feature work, bug fixes, review repairs, refactors, backend/mobile
  integration, plan.md/checklist.md execution, external dependencies, deployment
  validation, simulators, or real devices. Use engineering-delivery for PR-only
  handoff or review repair delivery.
---

# ELYS Code Development

## Operating Contract

Own the implementation outcome like a senior architect. Keep the solution cohesive,
low-coupling, evidence-based, maintainable, and no broader than the agreed goal.
Do not mechanically execute a stale plan or checklist.

Before planning or changing code, read
[development-standards.md](references/development-standards.md) completely and
apply every relevant rule.

## Workflow

1. Ground in the current repository.
   - Fetch remote refs when available without overwriting local work.
   - Before fetch or push, inspect the active branch/upstream, remote URL, and
     GitHub CLI identity. If an SSH remote fails with `Permission denied
     (publickey)` while the expected GitHub account has HTTPS access, follow the
     one-command HTTPS fallback in `development-standards.md`. Do not rewrite
     `origin`, global Git configuration, SSH keys, or local changes merely to
     work around the transport mismatch.
   - Discover and read the latest applicable repository guidance; do not assume
     every repository calls it `AGENTS.md`.
   - Read the relevant implementation, configuration, startup wiring, tests,
     and existing documentation before editing.
2. Establish the execution contract.
   - Read `plan.md` completely when it exists or is named by the user.
   - Read `checklist.md` completely and use it as the progress ledger when it
     exists or is named by the user.
   - Resolve material conflicts between the plan, checklist, repository rules,
     and current code before implementing affected behavior.
   - Read the frozen `contracts.md` entry for every provider/consumer boundary.
     Confirm the contract version, source artifact, field/state/error semantics,
     compatibility, shared fixtures, and whether this work provides or consumes
     the contract. Stop and escalate material drift instead of guessing.
3. Route specialist work.
   - For non-trivial `elys-backend` design or changes affecting APIs, data,
     async chains, architecture, migration, performance, or capacity, use
     `elys-backend-technical-design` before implementation.
   - For every ELYS test or acceptance path that exercises backend behavior, use
     `elys-backend-local-run`: run the current `elys-backend` worktree locally
     through its supported `make local` path while connecting to real dev
     dependencies. Repeat the affected validation after every coherent backend
     behavior update, including review fixes.
   - For Elys Flutter or native client work, use `elys-app-dev`.
   - For Flutter work, also read
     [flutter-official-skills.md](references/flutter-official-skills.md) and use
     only the official Flutter specialist skills that match the task. Elys
     repository rules and `elys-app-dev` take precedence over generic examples.
   - Whenever an iOS physical-device build, install, or run is required, use
     Flutter/Xcode profile mode by default. Use another build mode only when the
     repository rules or the user explicitly require it.
   - Use `elys-dev-deploy` only when remote dev/lane deployment is explicitly
     required or the local-run boundary cannot represent the required path. Do
     not substitute a generic Yunxiao deployment skill.
   - An explicit request to execute ordinary shared-dev deployment authorizes
     resolving every mechanical branch-integration conflict surfaced by that
     deployment run, without a second per-branch confirmation. Modify and push
     only the run's temporary `release/...` branch; never modify any feature
     branch. Stop only when a conflict requires a product/contract decision
     rather than a mechanical integration choice.
4. Implement the smallest complete behavior.
   - Follow repository boundaries and conventions.
   - Add or change tests from user-visible acceptance behavior. Select unit,
     mock, contract, replay, integration, simulator, lane, dev, or device checks
     according to risk; they support the result rather than becoming separate
     user-facing delivery stages.
   - Update the checklist immediately after each accepted item is actually
     implemented and verified.
5. Verify with real evidence.
   - Define authoritative tests as
     `测试需求点 | 测试的内容（用户视角） | 是否通过 | 测试的证据`.
   - Run the internal checks needed to reach the real end-to-end user journey.
     Do not require every task to pass every test layer.
   - When a conclusion depends on a model call, retain the complete model input
     and output, model/version, timestamp, and trace/request identifier in the
     evidence. Use a durable artifact link for long logs; do not substitute a
     summary.
   - State whether the required real E2E path passed, failed, or remains blocked.
     Expand supporting test details when they explain a failure, blocker, risk,
     or when the user asks.
   - Prepare the exact build/commits, environment, test account/data, user steps,
     expected results, known limitations, and recovery notes before human
     acceptance.
6. Hand off.
   - When the implementation and required evidence are ready for PR submission,
     invoke `engineering-delivery`.
   - Include any verified SSH-to-HTTPS transport requirement in the handoff so
     delivery can fetch and push through the same authenticated path.
   - Do not duplicate PR submission, Feishu handoff, or review-loop rules here.

## ELYS Backend Local Validation Default

The default ELYS backend validation topology is: current worktree code runs on
the developer Mac, while mirrord and Infisical connect it to the real dev Mongo,
Redis, ES, Temporal, Kafka, and internal services. This is local execution
against dev dependencies, not a dev or K8s deployment.

1. Invoke `elys-backend-local-run` before starting the first backend-dependent
   test. Follow its repository discovery, permission gates, `make local`,
   API-only default, health checks, device addressing, evidence, and stop rules.
   Never replace it with local databases, a hand-written `.env`, or direct
   `go run`.
2. After every coherent backend behavior update, including a reviewer-requested
   fix, prove that the running process has loaded the current worktree state and
   rerun the affected authoritative API or user journey. Earlier local-run
   evidence does not validate newer code.
3. Reuse a healthy supervised local session and its supported hot reload when
   possible. "Every update" means every behaviorally meaningful implementation
   iteration must be revalidated; it does not require an unnecessary cold start
   after each file save.
4. Keep API-only as the default. Start worker/all roles only through
   `elys-backend-local-run` when the user explicitly requires that chain and its
   shared dev queues can be controlled safely.
5. Use remote lane/shared-dev deployment only as additional evidence when the
   required path cannot be represented locally, such as dev services calling
   back into the backend, filtered inbound traffic, shared-environment behavior,
   or an explicit deployment/release requirement. State the uncovered boundary
   before invoking `elys-dev-deploy`.
6. Record the backend path, branch, HEAD plus dirty state, local mode/lane,
   dev-dependency connectivity, health results, exact test, and business/trace
   evidence. A compiling mock, unit test, or stale local process is not ELYS
   backend acceptance evidence.

## iOS Physical-Device Build Discipline

For Elys human acceptance on a physical iPhone, a successful Xcode compile is
not enough. The installed App must be able to launch independently after Flutter
tooling detaches.

1. Use the repository's mobile device script and pinned toolchain. For the
   current Elys mobile repository, the standard human-acceptance invocation is:

   ```bash
   mise exec -- env \
     ENV=dev BUILD_TYPE=develop FLUTTER_MODE=profile \
     apps/elys/ios/run_device.sh <device-id> --no-resident
   ```

   Re-read the repository guidance before copying this command to another
   checkout or after the script contract changes.
2. Use Profile mode by default for a build that a human will open from the home
   screen. On iOS 14+, a Flutter Debug build cannot create a `FlutterEngine`
   after it is detached from Flutter tooling or Xcode; launching that build from
   the home screen terminates the App. Debug is valid only for an explicitly
   attached debugging session and must never be handed off as a standalone
   acceptance build.
3. Do not replace a requested build/install with Patrol, XCTest, or another E2E
   harness unless automated device interaction was explicitly requested or is a
   frozen acceptance requirement. A simple physical-device build should stay on
   the repository's normal `run_device.sh` path.
4. Before restarting a slow build, inspect the active `flutter`, `xcodebuild`,
   and device-install processes plus the current artifact timestamp. Do not run
   a second cold build while the first is still compiling. If compilation
   finished but installation was interrupted, determine the remaining documented
   install/launch step instead of blindly repeating certificate installation,
   dependency resolution, Pod installation, and compilation.
5. Treat each expensive stage separately: signing material, `pub get`,
   `pod install`, Xcode compile, device install, and launch. Record which stage
   failed and its elapsed time. Warnings such as a CocoaPods lock/executable
   version mismatch or a missing Ruby `plist` gem are environment debt; do not
   misreport them as the root cause when Pods completed, but fix recurring
   toolchain drift in the machine bootstrap rather than accepting permanent
   noise.
6. A reused E2E artifact is not authoritative for a new target. If device
   automation is actually required, verify the built bundle contains the current
   test and require a non-zero executed-test count. `TEST EXECUTE SUCCEEDED` with
   `total=0` is a failed verification, not a pass.
7. Human-acceptance readiness requires all of the following evidence:
   - the requested mode, `ENV`, and `BUILD_TYPE` are present in build/runtime
     output;
   - Xcode compilation completed successfully;
   - the expected bundle was installed on the named device;
   - Flutter tooling or the IDE detached;
   - a fresh home-screen-equivalent launch remains alive long enough to render
     the first usable screen, with no immediate crash in the device console.

Do not report `待用户人工验收` until every applicable item above is proven. A
successful `flutter run` launch command, service-protocol connection, or install
message by itself is insufficient.

## Shared Dev Conflict Boundary

Ordinary dev integrates multiple in-progress feature branches. A single Yunxiao
run can therefore surface conflicts from several owners in sequence. A user
request to execute ordinary dev authorizes release-branch-only resolution of all
mechanical conflicts in that run; it is never permission to modify or take over
the participating feature branches.

1. Read the latest blocking detail for the same `pipelineRunId`, especially
   `featureBranch`, `featureBranchCommitId`, and `releaseBranch`.
2. Resolve the current blocking feature commit only in the run's temporary
   `release/...` branch, regardless of which participating feature branch owns
   the commit. Never push to that feature branch.
3. Resolve only the files required for the current integration step, verify the
   result, push the run's `release/...` branch, then execute the scripted
   conflict action equivalent to `我已解决完冲突` once.
4. Re-read the run detail after the action. If another participating feature
   branch blocks, repeat the same release-branch-only flow without asking for a
   second authorization.
5. Do not remove, reorder, or rewrite other shared-dev branches to bypass their
   conflicts. Leave the run available for the corresponding owner.
6. Do not call the deployment successful until the pipeline reaches a
   successful terminal state.

The same boundary applies when another branch blocks before the current task
branch is reached: continue only in the temporary `release/...` branch and never
modify the other owner's feature branch. A material cross-branch contract
incompatibility still requires owner coordination, not an opportunistic merge
inside the shared-dev release branch.

## Resume Discipline

After context compression, interruption, session resume, or handoff:

1. Re-read `checklist.md` and the relevant parts of `plan.md`.
2. Inspect the current branch, worktree status, recent commits, and diff.
3. Reconcile completed, pending, and blocked checklist items against evidence.
4. Continue only after the task state is reconstructed.

Do not infer progress from memory alone and do not mark checklist items complete
without implementation and verification evidence.

## Completion Boundary

Code written is not the same as implementation verified. Implementation verified
is not the same as PR review passed, deployed, released, or load-tested.

Use the active requirement's completion standard:

- Finish implementation only after all applicable test and user-flow evidence
  is complete.
- Default implementation completion requires the authoritative real user journey
  to pass end to end and be ready for human acceptance.
- If the goal or dependency chain includes dev/lane deployment, prove the
  deployed branch and commit.
- If the goal includes release or pressure testing, do not call the goal complete
  until the required environment is live and the pressure/capacity check passes.
- Use `engineering-delivery` for the separate PR submission and review-passed
  completion state.

Default user-facing states are `开发中`, `真实 E2E 验证中`,
`真实 E2E 已通过/未通过`, and `待用户人工验收`. Internal test layers are
evidence, not additional delivery states.
