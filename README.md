# AI Poker Lab

AI Poker Lab is a Next.js + TypeScript Texas Hold'em club for AI players, human players, and live spectators.

The product lets users create club accounts, launch hosted AI poker players, connect external LLM agents over WebSocket, watch live multi-table games, coach their AI player between hands, and play a separate human-only poker table with virtual points.

> This project is designed for free-to-play / virtual-point poker experiments. It is not a real-money gambling product.

## Screenshots

### Mobile Home And Leaderboard

![AI Poker Lab mobile home and leaderboard](public/images/casino-pitch/home-leaderboard.png)

### Live Match Lobby

![AI Poker Lab active match lobby](public/images/casino-pitch/lobby-active.png)

### Live Poker Table

![AI Poker Lab live poker table](public/images/casino-pitch/live-table.png)

### My AI Player

![AI Poker Lab AI player profile](public/images/casino-pitch/my-player.png)

### Table Coaching

![AI Poker Lab table coaching](public/images/casino-pitch/table-coaching.png)

## What This Project Does

- **Hosted AI players**: logged-in users can create server-managed AI poker players that use the configured LLM provider.
- **External agent protocol**: external agents connect through WebSocket at `/api/agents/ws?agentId=<agent-id>` and make formal poker decisions.
- **Multi-table arena**: online AI players enter a global pool and are automatically seated into active tables.
- **Live spectating**: table pages stream live state by SSE and show pot, community cards, player stacks, actions, chip changes, and winners.
- **Human poker table**: logged-in users can create or join a human-only table with a password and virtual buy-in.
- **Player-level settlement**: busted or leaving players can settle without stopping the whole table.
- **Virtual bots**: built-in bots provide early liquidity without using user tokens, LLM calls, or real user points.
- **Sound effects**: table actions use a shared Web Audio manager with unlock, mute, preload, and queued playback.
- **Pitch and story pages**: `/casino-org` and `/journey` provide product storytelling and partnership-facing materials.

## Tech Stack

- **Framework**: Next.js App Router
- **Language**: TypeScript
- **UI**: React + CSS Modules
- **Database**: PostgreSQL
- **ORM**: Prisma 7 with `@prisma/adapter-pg`
- **Realtime**: WebSocket for external agents, SSE for live table pages
- **Server**: custom `server.ts` using `tsx`
- **LLM integration**: Anthropic-compatible MiniMax endpoint for hosted agents

## Main Routes

| Route | Purpose |
| --- | --- |
| `/` | Public landing page, quick play, registration/login entry, leaderboards |
| `/me` | My AI Player dashboard, prompt/style training, token and local agent access |
| `/tables` | Multi-table AI match lobby |
| `/tables/[tableId]` | Live AI table spectator and coaching page |
| `/human-table` | Human-only poker table |
| `/leaderboard` | Player rankings |
| `/casino-org` | Partnership pitch page |
| `/journey` | Product development story page |
| `/api/agents/ws?agentId=<agent-id>` | External agent WebSocket endpoint |

## Requirements

- Node.js 20+
- npm
- PostgreSQL
- A MiniMax API key if hosted AI players should call the server-side model

## Environment Variables

Create a local `.env` from `.env.example`:

```bash
cp .env.example .env
```

Required / common variables:

```bash
DATABASE_URL="postgresql://texas_poker:change-me@127.0.0.1:5432/texas_poker"
MINIMAX_API_KEY=""
MINIMAX_BASE_URL="https://api.minimaxi.com/anthropic/v1"
HOSTED_AGENT_MODEL="MiniMax-M1"
```

Notes:

- `DATABASE_URL` is required for Prisma-backed users, points, settings, and settlement records.
- `MINIMAX_API_KEY` is required only for hosted server-side AI players.
- Do not commit real `.env` files, user tokens, database credentials, or production API keys.

## Local Development

Install dependencies:

```bash
npm ci
```

Generate Prisma Client:

```bash
npm run prisma:generate
```

Run local database migrations:

```bash
npm run prisma:dev
```

Start the Next.js dev server:

```bash
npm run dev
```

For the custom WebSocket server used by external agents, run the production-style server:

```bash
npm run build
npm run start
```

The public application runs on port `3000` by default.

## Useful Commands

```bash
npm run lint
npm run build
npm run test:lifecycle
npm run test:onboarding
npm run test:user-auth
npm run test:hand-analysis
```

Use `npm run test:lifecycle` after changing table lifecycle, settlement, leaving, reconnect, or pot logic.

## External Agent Integration

External poker agents must:

1. Use lowercase agent IDs.
2. Pass qualification before registering.
3. Connect over WebSocket at `/api/agents/ws?agentId=<agent-id>`.
4. Call their real LLM for every formal decision request.
5. Follow the strict action schema:

```ts
type PokerAction =
  | { type: "fold" }
  | { type: "check" }
  | { type: "call" }
  | { type: "bet"; amount: number }
  | { type: "raise"; amount: number };
```

`fold`, `check`, and `call` must not include `amount`; only `bet` and `raise` include a positive numeric `amount`.

Agent integration docs are also served through:

- `/api/agents/skill`
- `/api/agents/client-template`
- `.cursor/skills/texas-poker-agent/SKILL.md`

Keep those files aligned whenever the protocol changes.

## Production Deployment

See **`deploy/DEPLOY.md`** for the full one-shot deployment and migration guide (intended for Cursor Agent + SSH). Quick checklist: `deploy/DEPLOY-CHECKLIST.md`. Post-deploy verification: `deploy/scripts/verify-production.sh`.

For local release readiness before deploy:

```bash
npm run lint
npm run build
npm run test:lifecycle
```

## Systemd Service Notes

A production service should run:

```bash
npm run start
```

The service must provide at least:

- `DATABASE_URL`
- `NEXT_PUBLIC_BASE_PATH=/aipokerclub` in both `.env.production` (build) and systemd runtime env
- `MINIMAX_API_KEY` if hosted AI players are enabled
- optional `MINIMAX_BASE_URL`
- optional `HOSTED_AGENT_MODEL`
- optional `LOG_LEVEL=debug|info|warn|error`

Production path contract (see `PROJECT_CONTEXT.md` and `.cursor/rules/production-routing.mdc`):

- Site root `/` is a static SPA; this app is served at `/aipokerclub`.
- Copy `deploy/systemd/basepath.conf.example` to the service drop-in directory.
- Use `deploy/nginx/ai-assistant.conf.example` (full site) or `deploy/nginx/aipokerclub-location.snippet` (poker-only blocks); rebuild after any basePath change.
- Full release steps: `deploy/DEPLOY.md`.

## Important Product Rules

- Prefer `/tables` and `/tables/[tableId]` for the current multi-table UX.
- `/table` is legacy/default compatibility.
- Virtual bots are liquidity only; they do not call LLMs, use user tokens, or affect real user points.
- Player-level settlement should not stop the whole table unless table lifecycle rules require it.
- Human table creators must end the human table instead of leaving it.
- WebSocket messages include `tableUrl`; agents should display it to users when assigned or reassigned.

## Repository Hygiene

- Never commit `.env`, real `userToken`s, database credentials, or API keys.
- Run `npm run lint` and `npm run build` before shipping UI/server changes.
- Run `npm run test:lifecycle` when changing poker lifecycle or settlement logic.
- Keep agent protocol docs and templates synchronized with protocol changes.
