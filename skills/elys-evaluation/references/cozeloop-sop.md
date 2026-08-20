# CozeLoop SOP

Use this when the manifest uses CozeLoop traces, prompt debug calls, or CozeLoop model configs.

## Preflight

- Confirm base URL, workspace id, and available auth source from the current environment or local config.
- Do not print tokens, cookies, or passwords.
- If both token and session auth exist, use the one that can successfully read or debug the target prompt in this run.
- Confirm the target `prompt_key`, `prompt_id`, or exact `span_name` from the manifest.
- Confirm the candidate `system_prompt` source/version and the exact model config before model calls.

## Trace / Span Reconstruction

- Query by the manifest trace key, usually `trace_id`.
- Select only the exact span named by the manifest.
- Extract the real messages, variables, model output, prompt metadata, and model config from that span.
- If the target span is missing, mark the row `target_span_not_found`.
- If the trace id is missing, mark the row `missing_trace_id`.
- Never substitute parent, child, or neighboring spans unless the user updates the manifest.

## Prompt Debug Calls

- Use the manifest's candidate source and variable mapping.
- For one-off candidate prompt tests, override prompt detail only for the debug call; do not modify online prompt configuration unless explicitly requested.
- Capture the exact model config used for candidate, baseline rerun if any, and judge calls.
- Preserve the dataset `user_prompt` exactly unless the manifest defines a deterministic serialization step.
- Keep raw request/response artifacts locally when possible so failures can be audited.

## Model Reporting

Report:

- prompt id/key/version
- workspace id
- model id and model config
- system prompt version/source under test
- user prompt construction rule
- confirmed model name, only if verified
- retry count, timeout, and row-level failures

If the actual model name is unknown, write `CozeLoop model_id=<id>` instead of inferring a brand or model family.
