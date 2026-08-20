# Profile: feed_rewrite

This profile captures the corrected Elys Action matching rewrite evaluation. It is an example and reusable profile for the same surface only; do not apply it to other stages without a new manifest.

## Manifest Summary

```yaml
eval_name: feed_rewrite_corrected
business_stage: Elys Action matching rewrite / Feed Rewrite
target_trace_or_span:
  source: cozeloop
  span_name: post.understand_match.match_understander_understand.oneshot.Feeds_Rewrite.M
  trace_key: trace_id
baseline_source:
  type: production_span_output
  location: assistant output from the target span
candidate_source:
  type: prompt_text
  location: user-provided Social Radar + Classification prompt, run against the same true user_prompt
system_prompt_under_test:
  version_label: user-confirmed Social Radar + Classification prompt
  content_source: pasted_text or linked Feishu doc from the evaluation request
  baseline_version: production system prompt from the target CozeLoop span
input_contract:
  fields:
    - true user_prompt recovered from target span
  user_prompt_format: CozeLoop target span user message, preserved exactly from production trace
  invalid_rules:
    - missing trace_id
    - target span not found
model_config:
  candidate:
    provider_or_platform: CozeLoop debug_streaming
    model_id_or_name: CozeLoop model_id=37 unless rerun manifest overrides it
    parameters: json_mode=true, max_tokens=4096, temperature=0.1, top_p=0.9
  baseline:
    provider_or_platform: production CozeLoop span output
    model_id_or_name: read from target span when available
    parameters: read from target span when available
  judge:
    provider_or_platform: CozeLoop debug_streaming
    model_id_or_name: CozeLoop model_id=9 unless rerun manifest overrides it
    parameters: json_mode=true, max_tokens=4096, temperature=0.0, top_p=0.9
output_contract:
  format: json
  schema:
    - analysis.publisher_intent
    - analysis.match_strategy
    - classifications
    - persona_queries and persona_query_strategies
    - post_queries and post_query_strategies
    - memory_queries and memory_query_strategies
    - total_weight
gold_label_source:
  type: sheet_title
deterministic_metrics:
  - JSON parse rate
  - required field completeness
  - classification weight legality
  - AD subtype legality
  - query / strategy length alignment
  - primary strategy count
llm_judger_tasks:
  - compare old vs new rewrite quality on the same input
  - judge whether new classifications match sheet gold category
  - judge whether post_query_strategies are reasonable
report_sections:
  - dataset correction and coverage
  - overall metrics
  - per-sheet summary
  - representative success and failure cases
  - detail table link
  - judge prompt
```

## Existing Script

Use from the project root:

```bash
python3 scripts/elys_action_corrected_eval.py build-dataset
python3 scripts/elys_action_corrected_eval.py prepare-eval
python3 scripts/elys_action_corrected_eval.py run-new --limit 10 --dry-run-diverse
python3 scripts/elys_action_corrected_eval.py score-new --new-outputs outputs/elys_action_corrected_eval/dry_new_outputs.jsonl --new-scores outputs/elys_action_corrected_eval/dry_new_scores.jsonl
python3 scripts/elys_action_corrected_eval.py run-judge --samples outputs/elys_action_corrected_eval/dry_valid_samples.jsonl --old-outputs outputs/elys_action_corrected_eval/dry_old_outputs.jsonl --new-outputs outputs/elys_action_corrected_eval/dry_new_outputs.jsonl --judge-outputs outputs/elys_action_corrected_eval/dry_judge_outputs.jsonl --limit 10
```

After dry-run confirmation, run the same phases without dry-run limits:

```bash
python3 scripts/elys_action_corrected_eval.py run-new
python3 scripts/elys_action_corrected_eval.py score-new
python3 scripts/elys_action_corrected_eval.py run-judge
python3 scripts/elys_action_corrected_eval.py build-final
```

## Known Corrected Run

- source rows: 153
- valid target span rows in the corrected dataset: 112
- invalid rows retained in final detail: 41
- invalid reasons in the corrected run: `missing_trace_id`, `target_span_not_found`
- prior local output dir: `outputs/elys_action_corrected_eval`

These numbers describe that historical run only. Recompute them for every rerun.
