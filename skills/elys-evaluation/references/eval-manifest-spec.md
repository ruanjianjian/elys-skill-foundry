# Eval Manifest Spec

The `eval_manifest` is the contract for one evaluation run. Create it before touching data or running models.

## Required Fields

```yaml
eval_name: short stable name, e.g. feed_rewrite_2026_05
business_stage: exact Elys product or pipeline stage under test
target_trace_or_span:
  source: cozeloop | offline_file | feishu_sheet | mixed
  prompt_key: optional prompt key if known
  span_name: optional exact span name if trace-based
  trace_key: field used to locate traces, e.g. trace_id
baseline_source:
  type: production_span_output | old_prompt_run | offline_expected | none
  location: exact source and extraction rule
candidate_source:
  type: prompt_text | coze_prompt_key | local_model | offline_output
  location: prompt URL, file path, prompt key, or model endpoint
system_prompt_under_test:
  version_label: exact candidate system prompt version or source
  content_source: pasted_text | feishu_doc | local_file | coze_prompt_key
  baseline_version: old system prompt version or production prompt source, if comparing
input_contract:
  fields: input fields and priority order
  construction: how model input is assembled
  user_prompt_format: exact required format for each test case
  invalid_rules: when a sample cannot be evaluated
output_contract:
  format: json | text | multimodal | other
  schema: required fields, enums, constraints, and examples for this run
model_config:
  candidate:
    provider_or_platform: CozeLoop | AI Router | other
    model_id_or_name: exact model id/name
    parameters: temperature, top_p, max_tokens, json_mode, seed, etc.
  baseline:
    provider_or_platform: source for old output or rerun model
    model_id_or_name: exact model id/name when rerun
    parameters: exact parameters when rerun
  judge:
    provider_or_platform: CozeLoop | AI Router | other
    model_id_or_name: exact model id/name
    parameters: temperature, top_p, max_tokens, json_mode, etc.
gold_label_source:
  type: sheet_title | manual_column | human_review | none
  mapping: normalization rules and ambiguity handling
deterministic_metrics:
  - metric name, exact rule, denominator, and failure handling
llm_judger_tasks:
  - semantic judgement task, allowed outputs, JSON fields, and rubric
report_sections:
  - report sections and table columns required for this run
dry_run_plan:
  sample_count: number and selection rule
  success_criteria: what must pass before full-run
full_run_acceptance_criteria:
  row_count: expected final detail rows
  failure_policy: how failed rows are retained
  writeback_verification: how report/detail outputs are checked
```

## Confirmation Checklist

- The baseline and candidate are comparable on the same input.
- Dataset cases are valid `user_prompt` inputs for this stage, with the required formatting defined.
- The candidate `system_prompt` version is explicitly identified and is the version being evaluated.
- The model, platform, and parameters for candidate, baseline reruns, and judge calls are confirmed.
- The target span or prompt key belongs to the business stage under test.
- The input fields are real model inputs, not downstream or neighboring-step prompts.
- The output schema is specific to this evaluation and not copied from another profile.
- Deterministic metrics and LLM judge tasks are separated.
- The report audience and decision to support are clear.

## Anti-Drift Rules

- Do not evaluate a CSV or Sheet just because it has columns named `user_prompt`, `system_prompt`, or `assistant_prompt`.
- Do not mix evaluation targets: the test cases are `user_prompt` inputs; the candidate being evaluated is the specified `system_prompt` version.
- Do not run a candidate system prompt before confirming model id/name and parameters.
- Do not replace a missing target span with a nearby span.
- Do not silently drop invalid rows. Keep them with `error_reason`.
- Do not call a judge "Claude", "Opus", or any named model unless the current run verifies that exact model.
- Do not run the full evaluation before the dry-run proves that parsing, judging, and reporting match the manifest.
