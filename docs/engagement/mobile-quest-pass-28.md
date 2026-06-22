---
iteration: 28
backlogId: B28
implemented: true
codePaths:
  - src/components/ActivityStrip.module.css
  - src/components/MobileQuestHub.module.css
  - scripts/check-mobile-quest-chrome-height.mjs
---

# Pass 28 · 移动端总高 ≤96px

- ActivityStrip / Hub collapsedBar 各 `max-height: 48px`（640px 以下）
- `node scripts/check-mobile-quest-chrome-height.mjs` 验收 48+48≤96
