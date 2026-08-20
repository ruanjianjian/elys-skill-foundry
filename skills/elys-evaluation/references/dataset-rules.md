# Dataset Rules

## Goal

The dataset must represent the exact Elys business stage named in the manifest. Field names are not enough; verify provenance.

For prompt evaluations, each dataset case is normally a `user_prompt` input. The evaluation target is the candidate `system_prompt` version named in the manifest. Do not treat a dataset row's `system_prompt` as the candidate under test unless the manifest explicitly says that row-level system prompts are part of the experiment.

## Source Priority

1. **Trace/span reconstruction**: If rows contain `trace_id`, `span_id`, or another trace key, recover the true model input, output, variables, prompt metadata, and model config from the manifest target span.
2. **Prompt platform export**: If using CozeLoop or another prompt platform export, verify prompt key, version, variables, and output all belong to the target task.
3. **Offline CSV/Sheet**: Use only after confirming each field is produced by or sent to the target business stage.
4. **Manual examples**: Accept only with explicit human-written input/output contracts and no claim that they are production traces.

## User Prompt Format

Before dry-run, define and validate what a correct `user_prompt` case looks like for this stage:

- required fields or XML/JSON blocks
- allowed empty fields and default handling
- ordering or priority rules among text, image, video, link, memory, or context fields
- required escaping or serialization rules
- whether the prompt is a raw user message, a templated prompt with variables filled, or a CozeLoop message object
- examples of one valid case and one invalid case

Rows that fail the format rule should be marked with a precise `error_reason`, not repaired silently.

## Required Row State

Every source row should become one detail row with:

- `sample_id`
- source locator, e.g. sheet name + row number or trace id
- gold label or expected answer, if any
- reconstructed true input
- baseline output, if applicable
- candidate output, if run
- deterministic metric results
- LLM judge result, if run
- `error_reason` when any required part is missing

Rows with missing trace ids, missing target spans, parse failures, or model failures remain in the final detail table. They may be excluded from semantic metrics, but coverage must show them.

## Dataset Confirmation

Before full evaluation, show a small diverse sample with:

- original source locator
- gold label or expected target
- true `user_prompt` as sent to the evaluated model/prompt
- candidate `system_prompt` version label and source
- baseline output summary
- candidate output summary if dry-run already happened
- extraction notes or errors

Ask the user to confirm the dataset is the right evaluation surface when the source, target span, or field provenance is new or recently corrected.
