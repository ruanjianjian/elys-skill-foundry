# Judger Design

LLM judgers are evaluation-specific. Design the judge from the manifest's `output_contract` and `llm_judger_tasks`.

## Separation of Duties

- Deterministic checks: JSON parseability, required fields, enums, counts, weight sums, id coverage, and schema constraints.
- Business-rule checks: exact or normalized comparison to gold labels, expected routing, policy outcome, or human annotation.
- LLM semantic judge: quality, relevance, faithfulness, usefulness, intent preservation, ambiguity, or subjective ranking.

Do not ask the LLM judge to do deterministic validation that code can do more reliably.

## Judge Prompt Requirements

The judge prompt must include:

- the product stage and evaluation goal
- baseline and candidate definitions, if comparing outputs
- the original true input
- gold label or reference answer, if available
- the exact rubric for each semantic task
- allowed winner/pass/fail labels
- strict JSON output schema for this evaluation only
- instruction to keep explanations concise and evidence-based

## Judge JSON Contract

The judge must output strict JSON. Field names are chosen per manifest. A common pattern is:

```json
{
  "task_1": {
    "score_or_label": "allowed value",
    "rationale": "short reason"
  },
  "task_2": {
    "pass": true,
    "rationale": "short reason"
  },
  "judge_summary": "one concise sentence for the detail table"
}
```

For non-comparison evaluations, omit winner fields. For multimodal evaluations, include the visible evidence or missing-evidence criterion required by the manifest.

## Reporting the Judge

The final report must include:

- the judge task list
- model id/name and config actually used
- judge JSON parse rate
- a note on known judge limitations
- the exact judge prompt or a link/path to it
