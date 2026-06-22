#!/usr/bin/env bash
# Re-emit pending Phase 3 ticks until phase3-pass-{N}.md exists (agent wake nudges).
# Run in background with Cursor monitored shell + notify_on_output on AGENT_LOOP_TICK_PHASE3.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STATE="${ROOT}/docs/engagement/phase3-loop-state.json"
NUDGE_SEC="${PHASE3_NUDGE_SEC:-180}"

cd "$ROOT"

emit_pending() {
  node <<'NODE'
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const statePath = path.join(root, "docs/engagement/phase3-loop-state.json");
const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
const max = state.maxIterations ?? 100;
const last = state.lastCompletedIteration ?? 0;
const pending = state.pendingIteration ?? last + 1;

if (state.status === "paused") {
  console.log("AGENT_LOOP_PAUSED_PHASE3");
  process.exit(0);
}

if (last >= max) {
  console.log(
    `AGENT_LOOP_DONE_PHASE3 ${JSON.stringify({ reason: "max_iterations_reached", iterations: max })}`,
  );
  state.status = "done";
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
  process.exit(0);
}

const passPath = path.join(root, `docs/engagement/phase3-pass-${pending}.md`);
if (fs.existsSync(passPath)) {
  process.exit(0);
}

const pillars = ["feature", "ux", "perf", "seo"];
const pillar = pillars[(pending - 1) % 4];
const prompt =
  `Texas Poker Phase 3 Loop ${pending}/${max} pillar=${pillar}：` +
  "读 phase3-tracker.md 取该 pillar 下一 ⬜ 项；" +
  "【必须写代码】至少修改 src/ 或 prisma/ 一处并跑通 lint/build，禁止仅写文档；" +
  "gpt-5.5-medium 审产品、composer-2.5-fast 审 UX/实现、gpt-5.3-codex 审性能；" +
  "npm run lint && npm run build；bash deploy/scripts/sync-deploy-test.sh；" +
  "更新 tracker（标 ✅）与 phase3-pass-" +
  pending +
  ".md；完成后 bash deploy/scripts/phase3-loop-arm-next.sh。";

console.log(
  `AGENT_LOOP_TICK_PHASE3 ${JSON.stringify({
    iteration: pending,
    maxIterations: max,
    pillar,
    pacing: "completion-driven",
    nudge: true,
    prompt,
  })}`,
);
NODE
}

echo "Phase 3 watcher started (nudge every ${NUDGE_SEC}s while pass file missing)"

while true; do
  if [[ ! -f "$STATE" ]]; then
    sleep "$NUDGE_SEC"
    continue
  fi

  last=$(node -e "const s=require('./docs/engagement/phase3-loop-state.json'); console.log(s.lastCompletedIteration??0)")
  max=$(node -e "const s=require('./docs/engagement/phase3-loop-state.json'); console.log(s.maxIterations??100)")
  pending=$(node -e "const s=require('./docs/engagement/phase3-loop-state.json'); console.log(s.pendingIteration??((s.lastCompletedIteration??0)+1))")
  status=$(node -e "const s=require('./docs/engagement/phase3-loop-state.json'); console.log(s.status??'running')")

  if [[ "$status" == "paused" ]]; then
    echo "Phase 3 watcher paused (status=paused)."
    break
  fi

  if [[ "$last" -ge "$max" ]]; then
    emit_pending
    echo "Phase 3 watcher exiting (all iterations complete)."
    break
  fi

  if [[ ! -f "${ROOT}/docs/engagement/phase3-pass-${pending}.md" ]]; then
    emit_pending
  fi

  sleep "$NUDGE_SEC"
done
