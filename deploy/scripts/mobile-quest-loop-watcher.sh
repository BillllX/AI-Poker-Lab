#!/usr/bin/env bash
# Re-emit pending Phase 4 Mobile Quest ticks until pass is implemented (code shipped).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STATE="${ROOT}/docs/engagement/mobile-quest-loop-state.json"
NUDGE_SEC="${MOBILE_QUEST_NUDGE_SEC:-180}"

cd "$ROOT"

emit_pending() {
  node --input-type=module <<NODE
import {
  buildLoopPrompt,
  isPassImplemented,
  readState,
  repoRoot,
  writeState,
} from "${ROOT}/deploy/scripts/mobile-quest-loop-lib.mjs";

const root = repoRoot("${ROOT}");
const state = readState(root);
const max = state.maxIterations ?? 40;
const last = state.lastCompletedIteration ?? 0;
const pending = state.pendingIteration ?? last + 1;

if (state.status === "paused") {
  console.log("AGENT_LOOP_PAUSED_MOBILE_QUEST");
  process.exit(0);
}

if (state.status === "done") {
  console.log(
    \`AGENT_LOOP_DONE_MOBILE_QUEST \${JSON.stringify({
      reason: state.doneReason ?? "already_done",
      lastCompletedIteration: state.lastCompletedIteration ?? 0,
    })}\`,
  );
  process.exit(0);
}

if (last >= max && isPassImplemented(root, max)) {
  console.log(
    \`AGENT_LOOP_DONE_MOBILE_QUEST \${JSON.stringify({ reason: "max_iterations_reached", iterations: max })}\`,
  );
  state.status = "done";
  writeState(root, state);
  process.exit(0);
}

if (isPassImplemented(root, pending)) {
  process.exit(0);
}

const pillar = ["mobile-ux", "quest-product", "quest-impl", "quest-reward"][(pending - 1) % 4];
const prompt = buildLoopPrompt(root, pending, max, { nudge: true });

console.log(
  \`AGENT_LOOP_TICK_MOBILE_QUEST \${JSON.stringify({
    iteration: pending,
    maxIterations: max,
    pillar,
    pacing: "completion-driven",
    nudge: true,
    prompt,
  })}\`,
);
NODE
}

echo "Mobile Quest watcher started (nudge every ${NUDGE_SEC}s until pass has implemented: true + code)"

while true; do
  if [[ ! -f "$STATE" ]]; then
    sleep "$NUDGE_SEC"
    continue
  fi

  last=$(node -e "const s=require('./docs/engagement/mobile-quest-loop-state.json'); console.log(s.lastCompletedIteration??0)")
  max=$(node -e "const s=require('./docs/engagement/mobile-quest-loop-state.json'); console.log(s.maxIterations??40)")
  pending=$(node -e "const s=require('./docs/engagement/mobile-quest-loop-state.json'); console.log(s.pendingIteration??((s.lastCompletedIteration??0)+1))")
  status=$(node -e "const s=require('./docs/engagement/mobile-quest-loop-state.json'); console.log(s.status??'running')")

  if [[ "$status" == "paused" ]]; then
    echo "Mobile Quest watcher paused (status=paused)."
    break
  fi

  if [[ "$status" == "done" ]]; then
    bash "$(dirname "$0")/mobile-quest-loop-arm-next.sh" --now
    echo "Mobile Quest watcher exiting (status=done)."
    break
  fi

  if [[ "$last" -ge "$max" ]]; then
    if node --input-type=module -e "import { isPassImplemented, repoRoot } from '${ROOT}/deploy/scripts/mobile-quest-loop-lib.mjs'; process.exit(isPassImplemented(repoRoot('${ROOT}'), ${max}) ? 0 : 1)"; then
      emit_pending
      echo "Mobile Quest watcher exiting (all iterations complete)."
      break
    fi
  fi

  if ! node --input-type=module -e "import { isPassImplemented, repoRoot } from '${ROOT}/deploy/scripts/mobile-quest-loop-lib.mjs'; process.exit(isPassImplemented(repoRoot('${ROOT}'), ${pending}) ? 0 : 1)"; then
    emit_pending
  fi

  sleep "$NUDGE_SEC"
done
