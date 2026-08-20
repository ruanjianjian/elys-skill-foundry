#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$ROOT_DIR"

PYTHON_BIN="${PYTHON_BIN:-python3}"
EVAL_SCRIPT="${EVAL_SCRIPT:-scripts/elys_action_corrected_eval.py}"

usage() {
  cat <<'USAGE'
Usage:
  run-feed-rewrite-eval.sh build-dataset [extra args...]
  run-feed-rewrite-eval.sh prepare-eval [extra args...]
  run-feed-rewrite-eval.sh dry-run [extra args...]
  run-feed-rewrite-eval.sh full-run [extra args...]
  run-feed-rewrite-eval.sh build-final [extra args...]

This wrapper delegates to scripts/elys_action_corrected_eval.py. It is only for
the feed_rewrite profile; other Elys evaluations need their own manifest/profile.
USAGE
}

if [[ $# -lt 1 ]]; then
  usage
  exit 2
fi

phase="$1"
shift

case "$phase" in
  build-dataset)
    "$PYTHON_BIN" "$EVAL_SCRIPT" build-dataset "$@"
    ;;
  prepare-eval)
    "$PYTHON_BIN" "$EVAL_SCRIPT" prepare-eval "$@"
    ;;
  dry-run)
    "$PYTHON_BIN" "$EVAL_SCRIPT" run-new --limit 10 --dry-run-diverse "$@"
    "$PYTHON_BIN" "$EVAL_SCRIPT" score-new \
      --new-outputs outputs/elys_action_corrected_eval/dry_new_outputs.jsonl \
      --new-scores outputs/elys_action_corrected_eval/dry_new_scores.jsonl
    "$PYTHON_BIN" "$EVAL_SCRIPT" run-judge \
      --samples outputs/elys_action_corrected_eval/dry_valid_samples.jsonl \
      --old-outputs outputs/elys_action_corrected_eval/dry_old_outputs.jsonl \
      --new-outputs outputs/elys_action_corrected_eval/dry_new_outputs.jsonl \
      --judge-outputs outputs/elys_action_corrected_eval/dry_judge_outputs.jsonl \
      --limit 10
    ;;
  full-run)
    "$PYTHON_BIN" "$EVAL_SCRIPT" run-new "$@"
    "$PYTHON_BIN" "$EVAL_SCRIPT" score-new
    "$PYTHON_BIN" "$EVAL_SCRIPT" run-judge
    ;;
  build-final)
    "$PYTHON_BIN" "$EVAL_SCRIPT" build-final "$@"
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    echo "Unknown phase: $phase" >&2
    usage >&2
    exit 2
    ;;
esac
