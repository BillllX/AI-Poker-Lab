#!/usr/bin/env bash
# Arm the next Phase 4 Mobile Quest loop tick.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STATE="${ROOT}/docs/engagement/mobile-quest-loop-state.json"
DEBOUNCE_SEC="${MOBILE_QUEST_LOOP_DEBOUNCE_SEC:-5}"

emit_tick() {
  node --input-type=module <<NODE
import {
  buildLoopPrompt,
  readState,
  repoRoot,
  writeState,
  backlogItemForIteration,
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

if (pending > max) {
  console.log(
    \`AGENT_LOOP_DONE_MOBILE_QUEST \${JSON.stringify({ reason: "max_iterations_reached", iterations: max })}\`,
  );
  state.status = "done";
  writeState(root, state);
  process.exit(0);
}

const pillar = ["mobile-ux", "quest-product", "quest-impl", "quest-reward"][(pending - 1) % 4];
const prompt = buildLoopPrompt(root, pending, max);
const item = backlogItemForIteration(root, pending);

console.log(
  \`AGENT_LOOP_TICK_MOBILE_QUEST \${JSON.stringify({
    iteration: pending,
    maxIterations: max,
    pillar,
    backlogId: item?.id,
    pacing: "completion-driven",
    prompt,
  })}\`,
);

state.pendingIteration = pending;
if (pending >= max) {
  state.status = "pending_done";
}
writeState(root, state);
NODE
}

cd "$ROOT"

if [[ ! -f "$STATE" ]]; then
  echo '{"lastCompletedIteration":0,"pendingIteration":1,"maxIterations":40,"status":"running","pacing":"completion-driven"}' >"$STATE"
fi

if [[ "${1:-}" == "--now" ]]; then
  emit_tick
else
  (
    sleep "$DEBOUNCE_SEC"
    emit_tick
  ) &
  echo "Mobile Quest tick armed in ${DEBOUNCE_SEC}s (see mobile-quest-loop-state.json)"
fi
