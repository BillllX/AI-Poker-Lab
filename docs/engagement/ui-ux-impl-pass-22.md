# UI/UX 实现 Loop Pass #22/30

> **Polish** · basePath 合规守护 + 音效路径修复

## 实现

- **audioManager**：`/audio/...` 运行时 fetch / Audio 改用 `withBasePath()`，修复生产子路径下音效 404
- **basePath.ts**：补充何时用 `withBasePath` vs Next `Link`/`router.push` 的注释
- **check:basepath**：新增 `scripts/check-basepath-compliance.mjs`，扫描 client 侧裸 `fetch("/…")` / `EventSource("/…")`

## 文件

- `src/lib/client/audioManager.ts`
- `src/lib/client/basePath.ts`
- `scripts/check-basepath-compliance.mjs`
- `package.json`

## 验证

- `npm run check:basepath && npm run lint && npm run build` ✓
