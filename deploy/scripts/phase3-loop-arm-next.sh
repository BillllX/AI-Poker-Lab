#!/usr/bin/env bash
# Arm the next Phase 3 loop tick after a pass completes.
# Sets pendingIteration and emits AGENT_LOOP_TICK_PHASE3 (stdout wake for Cursor Agent).
# Usage: bash deploy/scripts/phase3-loop-arm-next.sh [--now]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STATE="${ROOT}/docs/engagement/phase3-loop-state.json"
DEBOUNCE_SEC="${PHASE3_LOOP_DEBOUNCE_SEC:-5}"

emit_tick() {
  node <<'NODE'
const fs = require("fs");
const path = require("path");

const statePath = path.join(process.cwd(), "docs/engagement/phase3-loop-state.json");
const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
const max = state.maxIterations ?? 100;
const last = state.lastCompletedIteration ?? 0;
const pending = state.pendingIteration ?? last + 1;

if (state.status === "paused") {
  console.log("AGENT_LOOP_PAUSED_PHASE3");
  process.exit(0);
}

if (pending > max) {
  console.log(
    `AGENT_LOOP_DONE_PHASE3 ${JSON.stringify({ reason: "max_iterations_reached", iterations: max })}`,
  );
  state.status = "done";
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
  process.exit(0);
}

const pillars = ["feature", "ux", "perf", "seo"];
const pillar = pillars[(pending - 1) % 4];
const prompt =
  `Texas Poker Phase 3 Loop ${pending}/${max} pillar=${pillar}：` +
  "读 phase3-tracker.md 取该 pillar 下一 ⬜ 项；" +
  "【必须写代码】至少修改 src/ 或 prisma/ 一处并跑通 lint/build，禁止仅写文档；" +
  "同会话内完成后立即开始下一轮，不要等用户确认；" +
  "gpt-5.5-medium 审产品、composer-2.5-fast 审 UX/实现、gpt-5.3-codex 审性能；" +
  "npm run lint && npm run build；bash deploy/scripts/sync-deploy-test.sh；" +
  "更新 tracker（标 ✅）与 phase3-pass-" +
  pending +
  ".md；state lastCompletedIteration=" +
  pending +
  " 后 bash deploy/scripts/phase3-loop-arm-next.sh。";

console.log(
  `AGENT_LOOP_TICK_PHASE3 ${JSON.stringify({
    iteration: pending,
    maxIterations: max,
    pillar,
    pacing: "completion-driven",
    prompt,
  })}`,
);

state.pendingIteration = pending;
state.updatedAt = new Date().toISOString();
if (pending >= max) {
  state.status = "pending_done";
}
fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
NODE
}

cd "$ROOT"

if [[ ! -f "$STATE" ]]; then
  echo '{"lastCompletedIteration":0,"pendingIteration":1,"maxIterations":100,"status":"running","pacing":"completion-driven"}' >"$STATE"
fi

if [[ "${1:-}" == "--now" ]]; then
  emit_tick
else
  (
    sleep "$DEBOUNCE_SEC"
    emit_tick
  ) &
  echo "Phase 3 tick armed in ${DEBOUNCE_SEC}s (see phase3-loop-state.json)"
fi
