# Review and Publish Checklist

This skill is intentionally two-stage. The local report is a draft; the public page is a release artifact.

## Stage A: local draft

- Define the Monday-to-Monday window and timezone.
- Run `collect_codex_sessions.py` and review rollout evidence.
- Update the page template and generate its standalone HTML.
- Check the four modules: top metrics, current work, actual difficulties, and next steps.
- Check every card for plain-language wording, evidence, status, and audience safety.
- Keep local confirm/delete/restore, card notes, overall notes, and copy-feedback controls available to the owner copy.
- Inject `scripts/inject_review_storage_bridge.py` after rendering so the sandboxed preview can persist review state without `allow-same-origin`.
- Start `scripts/serve_review_preview.py` on `127.0.0.1` and mirror every review change into a run-scoped `review-feedback.json`.
- Write a review-state file with source, preview, bridge/server checksums, preview URL, sidecar path, and `awaiting_user_review`.
- Run the mandatory in-app Browser E2E: write notes, verify the sidecar, reload, inspect actual clipboard text, clean test state and sidecar, reload, and verify public read-only mode.
- Return the local file path or local preview URL.
- Do not publish.

## User approval protocol

The user should:

- finish comments in the local preview and tell Codex comments are complete; then
- after the revised preview is generated and checked, reply `审核通过，发布`.

Read comments from the configured `review-feedback.json`; validate its timestamp and expected card IDs before applying it. If the sidecar is missing or stale, ask the user to refresh the local preview once. `复制审核反馈` remains a fallback only. Never inspect browser storage or browser-profile files. Browser review changes do not automatically alter source HTML or authorize a public release.

## Stage B: publish

After explicit approval:

1. Apply any stated changes to the source HTML.
2. Re-render the standalone HTML and inject the review storage bridge.
3. Verify the review window and source checksum are unchanged since approval.
4. Measure the HTML, compressed package, and uncompressed package before upload:
   - HTML <= 10 MB
   - tar.gz <= 20 MB
   - uncompressed files <= 200 MB
5. Publish the configured app with the authenticated user identity:

```bash
lark-cli apps +html-publish --as user --app-id "$MIAODA_APP_ID" --path "$PUBLISH_DIR" --json
```

6. Poll the returned release with `apps +release-get`.
7. Only `status=finished` with `online_url` is a successful release.
8. Record the release ID and access scope. Do not expose access tokens, raw internal IDs, or local private paths in the public report.

If the static app cannot enforce per-user edit permissions, keep the public page read-only and use a separate local owner copy or an explicit owner gate. A true identity-based edit ACL requires a full-stack app with Feishu login and server-side persistence.
