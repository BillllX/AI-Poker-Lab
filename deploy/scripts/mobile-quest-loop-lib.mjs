import fs from "node:fs";
import path from "node:path";

export const PILLARS = ["mobile-ux", "quest-product", "quest-impl", "quest-reward"];

export function repoRoot(cwd = process.cwd()) {
  return cwd;
}

export function statePath(root) {
  return path.join(root, "docs/engagement/mobile-quest-loop-state.json");
}

export function passPath(root, iteration) {
  return path.join(root, `docs/engagement/mobile-quest-pass-${iteration}.md`);
}

export function backlogPath(root) {
  return path.join(root, "docs/engagement/mobile-quest-backlog-wave2.json");
}

export function readState(root) {
  const raw = fs.readFileSync(statePath(root), "utf8");
  return JSON.parse(raw);
}

export function writeState(root, state) {
  state.updatedAt = new Date().toISOString();
  fs.writeFileSync(statePath(root), `${JSON.stringify(state, null, 2)}\n`);
}

export function readBacklog(root) {
  const file = backlogPath(root);
  if (!fs.existsSync(file)) {
    return { items: [] };
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function writeBacklog(root, backlog) {
  fs.writeFileSync(backlogPath(root), `${JSON.stringify(backlog, null, 2)}\n`);
}

export function pillarForIteration(iteration) {
  return PILLARS[(iteration - 1) % PILLARS.length];
}

export function backlogItemForIteration(root, iteration) {
  const backlog = readBacklog(root);
  return backlog.items.find((item) => item.iteration === iteration) ?? null;
}

export function isPassImplemented(root, iteration) {
  const file = passPath(root, iteration);
  if (!fs.existsSync(file)) {
    return false;
  }
  const content = fs.readFileSync(file, "utf8");
  if (/implemented:\s*true/i.test(content)) {
    return true;
  }
  return (
    content.includes("implemented: true") &&
    content.includes("## 变更") &&
    /- \[x\].*lint\/build/i.test(content)
  );
}

export function buildLoopPrompt(root, iteration, max, options = {}) {
  const pillar = pillarForIteration(iteration);
  const item = backlogItemForIteration(root, iteration);
  const title = item?.title ?? "读 mobile-quest-tracker.md / backlog 下一 pending 项";
  const backlogId = item?.id ?? "?";

  const lines = [
    `Texas Poker Phase 4 Mobile Quest Loop ${iteration}/${max} pillar=${pillar} backlog=${backlogId}：`,
    title,
    "【必须写代码】至少修改 src/ 或 prisma/ 一处；禁止仅设计文档过关。",
    "npm run lint && npm run build && SKIP_NPM_CI=1 bash deploy/scripts/sync-deploy-test.sh",
    `写 mobile-quest-pass-${iteration}.md（frontmatter implemented: true + codePaths + 验收勾选）`,
    `更新 mobile-quest-backlog-wave2.json 该项 status=implemented`,
    `更新 mobile-quest-loop-state.json：lastCompletedIteration=${iteration} pendingIteration=${iteration + 1}`,
    "bash deploy/scripts/mobile-quest-loop-arm-next.sh",
  ];

  if (options.nudge) {
    lines.unshift("[NUDGE — 上一轮未标记 implemented，请完成代码+状态后再 arm]");
  }

  return lines.join("；");
}

export function markBacklogImplemented(root, iteration) {
  const backlog = readBacklog(root);
  let changed = false;
  for (const item of backlog.items) {
    if (item.iteration === iteration && item.status !== "implemented") {
      item.status = "implemented";
      changed = true;
    }
  }
  if (changed) {
    writeBacklog(root, backlog);
  }
}
