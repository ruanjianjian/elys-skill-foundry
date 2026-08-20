#!/usr/bin/env python3
"""Inject a narrow review-state bridge into a rendered standalone HTML page."""

from pathlib import Path
import sys


BRIDGE_ID = "work-status-review-storage-bridge"
BRIDGE = f"""<script id="{BRIDGE_ID}">
(() => {{
  const channel = "work-status-signature-page.storage.v1";
  const allowedPrefix = "work-status-signature-page.";
  const feedbackEndpoint = "http://127.0.0.1:8765/__work_status_review_feedback";
  const forceReadonly = new URLSearchParams(window.location.search).get("readonly") === "1";
  const isLocalOuterPage = !forceReadonly && (
    window.location.protocol === "file:" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );
  const syncReviewState = async () => {{
    if (!isLocalOuterPage) return false;
    try {{
      const response = await window.fetch(feedbackEndpoint, {{
        method: "POST",
        headers: {{ "Content-Type": "application/json" }},
        body: JSON.stringify({{
          card_state: JSON.parse(
            window.localStorage.getItem("work-status-signature-page.card-state.v1") || "{{}}",
          ),
          overall_note:
            window.localStorage.getItem("work-status-signature-page.review-note.v1") || "",
          source_url: window.location.href,
        }}),
      }});
      return response.ok;
    }} catch (error) {{
      return false;
    }}
  }};
  window.addEventListener("message", async (event) => {{
    const payload = event.data;
    if (
      payload?.channel !== channel ||
      payload?.type !== "request" ||
      typeof payload.key !== "string" ||
      !payload.key.startsWith(allowedPrefix)
    ) return;
    const response = {{
      channel,
      type: "response",
      requestId: payload.requestId,
      ok: false,
      value: null,
      synced: false,
    }};
    try {{
      if (payload.action === "context") {{
        response.value = {{
          isLocal: isLocalOuterPage,
          forceReadonly,
          feedbackEndpoint,
        }};
        response.ok = true;
      }} else if (payload.action === "sync") {{
        response.synced = await syncReviewState();
        response.ok = true;
      }} else if (payload.action === "copy" && typeof payload.value === "string") {{
        try {{
          await window.navigator.clipboard.writeText(payload.value);
          response.ok = true;
        }} catch (clipboardError) {{
          const helper = window.document.createElement("textarea");
          helper.value = payload.value;
          helper.style.position = "fixed";
          helper.style.opacity = "0";
          window.document.body.append(helper);
          helper.focus();
          helper.select();
          response.ok = window.document.execCommand("copy");
          helper.remove();
        }}
      }} else if (payload.action === "get") {{
        response.value = window.localStorage.getItem(payload.key);
        response.ok = true;
      }} else if (payload.action === "set" && typeof payload.value === "string") {{
        window.localStorage.setItem(payload.key, payload.value);
        response.synced = await syncReviewState();
        response.ok = true;
      }}
    }} catch (error) {{
      response.ok = false;
    }}
    event.source?.postMessage(response, "*");
  }});
  if (isLocalOuterPage) {{
    window.setTimeout(() => void syncReviewState(), 0);
  }}
}})();
</script>"""


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: inject_review_storage_bridge.py <standalone.html>")
    path = Path(sys.argv[1]).resolve()
    document = path.read_text(encoding="utf-8")
    if BRIDGE_ID in document:
        return
    marker = "<body>"
    if marker not in document:
        raise SystemExit(f"missing {marker!r} in {path}")
    document = document.replace(
        "connect-src blob: data:;",
        "connect-src 'self' http://127.0.0.1:8765 blob: data:;",
        1,
    )
    path.write_text(document.replace(marker, marker + "\n" + BRIDGE, 1), encoding="utf-8")


if __name__ == "__main__":
    main()
