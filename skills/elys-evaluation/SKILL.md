---
name: elys-evaluation
description: Use when evaluating Elys prompts, model outputs, CozeLoop traces, Feishu evaluation sets, LLM judges, reusable eval profiles, or PE reports across any Elys product stage.
---

# Elys Evaluation

## Core Rule

Treat every Elys evaluation as a new measurement design unless the user explicitly names an existing profile. Do not reuse a previous JSON schema, judge prompt, metrics table, report shape, prompt key, or CozeLoop span just because the task sounds similar.

Every evaluation must be driven by an `eval_manifest`. The manifest is the source of truth for the current run. For prompt evaluations, treat dataset cases as `user_prompt` inputs and the thing under test as a specific `system_prompt` version, unless the manifest explicitly says otherwise.

## Required Workflow

1. **Define**: Draft an `eval_manifest` from the user's goal. Read [references/eval-manifest-spec.md](references/eval-manifest-spec.md). Confirm the candidate `system_prompt` version and exact model config before any model run. Stop for confirmation before dataset reconstruction or full evaluation when the target, dataset, output contract, or judge task is new.
2. **Dataset**: Validate that samples are correctly formatted `user_prompt` inputs for the intended business stage, not merely plausible prompt columns. Read [references/dataset-rules.md](references/dataset-rules.md). Show a small sample with true inputs, baseline outputs, and gold labels before full evaluation.
3. **Dry-run**: Run a small, diverse batch through candidate `system_prompt` generation, deterministic checks, and the LLM judge. Confirm JSON parsing, metric extraction, model parameters, and report columns match the manifest.
4. **Full-run**: Run all eligible samples only after dry-run succeeds and the dataset is confirmed. Preserve failed or unlocatable rows with explicit error reasons.
5. **Report**: Produce local artifacts and a concise Feishu-ready report. Read [references/reporting-rules.md](references/reporting-rules.md). Attach the actual judge prompt and model configuration used.
6. **Package**: If the evaluation will recur, save the manifest, commands, judge contract, and reporting shape as a profile under `profiles/`.

## CozeLoop Usage

Use CozeLoop as an execution and trace source only through the manifest-defined target. Read [references/cozeloop-sop.md](references/cozeloop-sop.md) when the run needs trace/span lookup, prompt debug calls, or model configuration capture.

Never claim a model family or version from memory. Report the exact model name if verified from CozeLoop; otherwise report the exact `model_id` and config.

## Judger Design

LLM judgers are generated per evaluation. Read [references/judger-design.md](references/judger-design.md) before writing or running a judge. The judge JSON shape must follow the current manifest, not the `feed_rewrite` example.

## Existing Profiles

- `feed_rewrite`: First reusable profile for Action matching rewrite evaluation. Read [profiles/feed_rewrite.md](profiles/feed_rewrite.md) only when the user asks to evaluate or rerun the same Feed Rewrite / Action matching rewrite surface.

For `visual_understand`, comment generation, ranking, moderation, or any other stage, create a new manifest or profile before running.
