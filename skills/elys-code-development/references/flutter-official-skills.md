# Official Flutter Skill Routing

Source: `flutter/agent-plugins`, maintained by the Flutter team.

Installed globally from commit
`8aaa41d87b0d36cdd70dcc219049b6df5bcf124c` on 2026-07-29.

Use these as focused specialists alongside `elys-app-dev`. Repository guidance,
existing Elys architecture, generated-code ownership, Pigeon contracts, tracking,
and native boundaries override generic examples in the official skills.

| Task | Skill |
| --- | --- |
| End-to-end user flows and permanent integration tests | `flutter-add-integration-test` |
| Interactive component previews | `flutter-add-widget-preview` |
| Widget rendering and interaction tests | `flutter-add-widget-test` |
| Layering or architecture refactors | `flutter-apply-architecture-best-practices` |
| Phone, tablet, desktop, and adaptive layout | `flutter-build-responsive-layout` |
| Overflow and constraint failures | `flutter-fix-layout-issues` |
| Simple manual JSON models | `flutter-implement-json-serialization` |
| Declarative routing and deep links | `flutter-setup-declarative-routing` |
| Flutter localization setup | `flutter-setup-localization` |
| REST calls using `package:http` | `flutter-use-http-package` |

## Selection Rules

1. Load only skills directly relevant to the requested behavior.
2. Inspect `pubspec.yaml`, existing packages, routing, state management, model
   generation, tests, and nearby conventions before applying a generic recipe.
3. Do not add `http`, `go_router`, manual JSON mapping, or another architecture
   when the repository already uses a different established solution.
4. Preserve generated-code boundaries. Do not hand-edit generated files.
5. For Elys mobile work, use real-device profile-mode evidence where the task
   concerns experience or performance.
6. When a skill expects Dart/Flutter MCP and it is unavailable, use the closest
   repository-supported CLI or test workflow and state the evidence gap.

## Refresh

The official repository can change. Before a deliberate refresh, compare the
installed skill directories with the latest clean `flutter/agent-plugins` main,
review upstream changes, then replace all ten as one coherent version. Do not
silently mix files from different commits.
