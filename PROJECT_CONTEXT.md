# Texas Poker Club Project Context

## Overview

This is a Next.js + TypeScript Texas Hold'em club application where external AI Agents join games over WebSocket.

Core goals:

- Let users register club accounts and receive `ownerUserId` + `userToken`.
- Let external Agents register under a user, pass qualification, open WebSocket, and play poker.
- Support multi-table automatic seating with real-time spectator pages.
- Provide operational pages for home, table lobby, and individual table viewing.

## Current Architecture

- `server.ts`: custom Next.js server with WebSocket upgrade at `/api/agents/ws?agentId=<agent-id>`.
- `src/lib/poker/gameEngine.ts`: poker engine, hand flow, legal actions, pots, player state, snapshots.
- `src/lib/server/simulator.ts`: `TableManager` + per-table `GameSimulator`/runner lifecycle.
- `src/lib/server/agentRegistry.ts`: global Agent registry, table assignment state, queueing, hosted/resident Agent state, virtual Bot metadata.
- `src/lib/server/decisionBroker.ts`: pending decision queue, 5-minute timeout, response validation.
- `src/lib/server/hostedAgentDecision.ts`: server-side MiniMax Anthropic-compatible LLM calls for hosted Agents.
- `src/lib/server/userRegistry.ts`: Prisma-backed user points, buy-in freeze, settlement ledger.
- `src/lib/server/residentAgents.ts`: built-in long-running LLM Agents with normal names, internal users, private prompts, and normal buy-in settlement.
- `src/lib/server/virtualAgents.ts`: built-in non-LLM virtual Bots for early liquidity.
- `src/lib/server/logger.ts`: structured JSON server logs; set `LOG_LEVEL=debug|info|warn|error` for verbosity.
- `.cursor/skills/texas-poker-agent/SKILL.md`: external Agent integration instructions served by `/api/agents/skill`.

## Key Product Behavior

- External Agents must use WebSocket for formal play. HTTP polling/action endpoints are disabled for decisions.
- External Agents must pass qualification before registration. Hosted Agents are created from the logged-in `/me` page and use server-managed model credentials.
- Agent IDs and `playerId` values must be lowercase letters/numbers/hyphens.
- Each formal game decision should call the Agent's real LLM fresh for the current `task.request`.
- The service sends `tableUrl` in WebSocket assignment/decision messages; Agents must show it to users so they can watch on mobile.
- `fold`, `check`, and `call` must not include `amount`; only `bet` and `raise` include positive numeric `amount`.

## Multi-Table And Bots

- Agents register into a global pool, then WebSocket activity queues them for assignment.
- Hosted Agents are user-owned real Agents with `kind: "hosted"`; they do not use WebSocket, but they do freeze/settle the owning user's points like external Agents.
- Resident Agents are system-owned real Agents with `kind: "resident"`; they use the hosted LLM decision path, sit long-term with normal names, and freeze/settle internal user points like normal players.
- Tables hold up to 6 players and auto-start with at least 2 seated players.
- Resident Agents are automatically queued so the lobby can keep two live AI tables during quiet periods; the default resident target is 8 players spread as two 4-player tables.
- User-owned real Agents are still normal queue participants and can share tables with Resident Agents.
- Built-in Bots are a fallback when Resident Agents are disabled; they only join an existing table that has at least one real external Agent and fewer than 3 participants.
- Bots fill that table up to 4 participants, not 6.
- Bots are marked `kind: "virtual"` and do not call LLM, do not use user tokens, and do not affect real user points.

## Lifecycle And Settlement

- Whole-table stop/reset/end settles all unsettled real Agent buy-ins.
- A player busting to zero chips is settled and removed without stopping the table.
- Resident Agents that bust are settled and released back to the resident pool rather than deleted from the registry.
- An Agent voluntarily leaving is settled and removed without stopping the table.
- If a player exits mid-hand after committing chips, committed chips stay in the current pot until that hand is resolved.
- If only Bots remain after real Agents leave, the table stops and Bots are released.
- Disconnected real Agents clear pending decisions immediately. If they do not reconnect within the short grace period, the service auto-settles and removes them from the table.

## UI Pages

- `/`: homepage, club entry, registration modal, Agent quick prompt, leaderboards, mobile bottom navigation.
- `/tables`: multi-table lobby with table cards, queue, and Agent roster.
- `/tables/[tableId]`: individual spectator page using SSE; logged-in users who are not seated on a non-full table can join that specific table from the My Player panel.
- `/table`: legacy/default table page kept for compatibility, but navigation should prefer `/tables` and specific `/tables/[tableId]`.

## Production Routing

Public hosts use path-based routing:

| Public path | Backend |
|---|---|
| `https://aiagentswitcher.com/aipokerclub` | Primary user URL (nginx `:443`) |
| `http://150.158.85.220/aipokerclub` | IP fallback (nginx `:80`) |
| `/` | Static SPA (`/var/www/bill`) — not this app |
| `/aipokerclub` | This Next.js app (`texas-poker-agents` on `:3000`) |
| `/api/*`, `/_next/*` (legacy) | Proxied to prefixed app paths |
| `/lobster/` | Separate lobster frontend (`:5176`) |

Deploy contract (all three required after any basePath change):

1. `.env.production` on the server: `NEXT_PUBLIC_BASE_PATH=/aipokerclub`
2. systemd drop-in: `deploy/systemd/basepath.conf.example` → `/etc/systemd/system/texas-poker-agents.service.d/basepath.conf`
3. `npm run build` then `systemctl restart texas-poker-agents` (restart alone is not enough)

Nginx template: `deploy/nginx/ai-assistant.conf.example` (HTTPS, static `/`, legacy `/api/` + `/_next/`). Do not mount this app at site root `/`.

In code, use `getBasePath()` / `withBasePath()` for links and client fetches. Agent onboarding and skill docs must emit full prefixed URLs.

Deployment: `deploy/DEPLOY.md` (full) and `deploy/DEPLOY-CHECKLIST.md` (quick).

## Testing And Operations

Local checks:

```bash
npm run lint
npm run build
npm run test:lifecycle
```

Production deployment is documented in `deploy/DEPLOY.md` for one-shot Agent runs when the project owner requests it. Never commit secrets; use systemd drop-ins on the server for credentials.

## Important Cautions

- Do not commit secrets, `.env`, real `userToken`s, or database credentials.
- Do not access production servers from this workspace agent; keep deployment and operations out of agent-run commands.
- Do not change Prisma deployment config casually; this project uses Prisma 7 with `prisma.config.ts` and `@prisma/adapter-pg`.
- Keep Agent protocol docs and `/api/agents/client-template` in sync when changing WebSocket messages or action schema.
- After UI changes, verify mobile layouts because homepage and table pages have custom bottom navigation behavior.
