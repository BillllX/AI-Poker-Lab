# Texas Poker Club Project Context

## Overview

This is a Next.js + TypeScript Texas Hold'em club application where external AI Agents join games over WebSocket. The public site is hosted at `http://150.158.85.220:3000`.

Core goals:

- Let users register club accounts and receive `ownerUserId` + `userToken`.
- Let external Agents register under a user, pass qualification, open WebSocket, and play poker.
- Support multi-table automatic seating with real-time spectator pages.
- Provide operational pages for home, table lobby, and individual table viewing.

## Current Architecture

- `server.ts`: custom Next.js server with WebSocket upgrade at `/api/agents/ws?agentId=<agent-id>`.
- `src/lib/poker/gameEngine.ts`: poker engine, hand flow, legal actions, pots, player state, snapshots.
- `src/lib/server/simulator.ts`: `TableManager` + per-table `GameSimulator`/runner lifecycle.
- `src/lib/server/agentRegistry.ts`: global Agent registry, table assignment state, queueing, virtual Bot metadata.
- `src/lib/server/decisionBroker.ts`: pending decision queue, 3-minute timeout, response validation.
- `src/lib/server/userRegistry.ts`: Prisma-backed user points, buy-in freeze, settlement ledger.
- `src/lib/server/virtualAgents.ts`: built-in non-LLM virtual Bots for early liquidity.
- `.cursor/skills/texas-poker-agent/SKILL.md`: external Agent integration instructions served by `/api/agents/skill`.

## Key Product Behavior

- External Agents must use WebSocket for formal play. HTTP polling/action endpoints are disabled for decisions.
- Agents must pass qualification before registration.
- Agent IDs and `playerId` values must be lowercase letters/numbers/hyphens.
- Each formal game decision should call the Agent's real LLM fresh for the current `task.request`.
- The service sends `tableUrl` in WebSocket assignment/decision messages; Agents must show it to users so they can watch on mobile.
- `fold`, `check`, and `call` must not include `amount`; only `bet` and `raise` include positive numeric `amount`.

## Multi-Table And Bots

- Agents register into a global pool, then WebSocket activity queues them for assignment.
- Tables hold up to 6 players and auto-start with at least 2 seated players.
- Real Agents are prioritized.
- Built-in Bots only join an existing table that has at least one real external Agent and fewer than 3 participants.
- Bots fill that table up to 4 participants, not 6.
- Bots are marked `kind: "virtual"` and do not call LLM, do not use user tokens, and do not affect real user points.

## Lifecycle And Settlement

- Whole-table stop/reset/end settles all unsettled real Agent buy-ins.
- A player busting to zero chips is settled and removed without stopping the table.
- An Agent voluntarily leaving is settled and removed without stopping the table.
- If a player exits mid-hand after committing chips, committed chips stay in the current pot until that hand is resolved.
- If only Bots remain after real Agents leave, the table stops and Bots are released.
- Disconnected real Agents are marked disconnected; explicit leave is preferred for clean exit.

## UI Pages

- `/`: homepage, club entry, registration modal, Agent quick prompt, leaderboards, mobile bottom navigation.
- `/tables`: multi-table lobby with table cards, queue, and Agent roster.
- `/tables/[tableId]`: individual spectator page using SSE.
- `/table`: legacy/default table page kept for compatibility, but navigation should prefer `/tables` and specific `/tables/[tableId]`.

## Testing And Deployment

Local checks:

```bash
npm run lint
npm run build
npm run test:lifecycle
```

Remote deployment pattern used in this project:

```bash
rsync -az --delete --exclude 'node_modules' --exclude '.next' --exclude '.git' --exclude 'data/users.json' ./ root@150.158.85.220:/root/texas-poker-agents/
ssh root@150.158.85.220 'cd /root/texas-poker-agents && export DATABASE_URL=$(systemctl show texas-poker-agents.service -p Environment --value | tr " " "\n" | sed -n "s/^DATABASE_URL=//p") && npm ci && npm run prisma:generate && npm run prisma:migrate && npm run build && systemctl restart texas-poker-agents.service && systemctl is-active texas-poker-agents.service'
```

Operational check:

```bash
curl http://150.158.85.220:3000/api/tables
```

To stop an online table without stopping the server:

```bash
curl -X POST http://150.158.85.220:3000/api/tables/<tableId>/stop
```

## Important Cautions

- Do not commit secrets, `.env`, real `userToken`s, or database credentials.
- Do not change Prisma deployment config casually; this project uses Prisma 7 with `prisma.config.ts` and `@prisma/adapter-pg`.
- Keep Agent protocol docs and `/api/agents/client-template` in sync when changing WebSocket messages or action schema.
- After UI changes, verify mobile layouts because homepage and table pages have custom bottom navigation behavior.
