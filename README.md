# GREENSIGN

> Connected construction intelligence. Standardized inputs, confirmation-first workflows, reusable outputs.

![Version](https://img.shields.io/badge/version-0.1.0--foundation-87ff4f?style=flat-square&labelColor=111512)
![React Router](https://img.shields.io/badge/React_Router-Framework_Mode-c5cec7?style=flat-square&labelColor=111512)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-79aef2?style=flat-square&labelColor=111512)

## Foundation release

This is the first production-oriented GREENSIGN foundation. It converts the approved interactive mockup into a server-rendered React application with real URLs, a multi-company PostgreSQL schema, local Docker services, and Railway-ready packaging.

The visible workflows intentionally do **not** create records in this release. Every action reaches a confirmation endpoint and ends with **OK**, allowing product structure and navigation to be validated before persistent behavior is enabled.

The approved interactive presentation remains available at `/mockup`. The application opens at `/app/dashboard`.

### Included surfaces

- Dashboard, projects, data, and network workspaces
- Proposal designer and project intelligence
- Trade partner management, solicitations, and preconstruction RFIs
- Commitments, scope/contract risk, submittals, and procurement
- Schedule assist, closeout, and change-risk tracking
- Account, company, contacts/trades, features, connections, and subscription settings
- Per-tool enablement, setup, templates, field maps, connectors, and confirmation guardrails
- Private superuser surface available only through the `/gm_RH` global command

## Architecture

- React 19 + React Router 8 Framework Mode (the current continuation of Remix)
- TypeScript + Vite server rendering
- PostgreSQL 17 + Drizzle ORM and generated SQL migrations
- Docker Compose for the local database
- Multi-stage Docker image and Railway service configuration
- External file references rather than duplicated managed files

## Local setup

Requirements: Node.js 24+, pnpm 11+, Docker Desktop with WSL 2.

```powershell
Copy-Item .env.example .env
docker compose up -d postgres
pnpm install
pnpm db:migrate
pnpm dev
```

Open `http://localhost:5173/app/dashboard` or `http://localhost:5173/mockup`.

## Quality checks

```powershell
pnpm typecheck
pnpm test
pnpm build
```

## Version workflow

GREENSIGN uses sequential release branches. Each new approved product version starts from the accepted base on a new `agent/vX.Y.Z-description` branch. Pull requests remain draft until the local build and workflow are accepted.

## Current boundary

Authentication, OAuth providers, database writes, email delivery, document generation, external connectors, and Railway deployment are deliberately deferred. They will be enabled only after the foundation model is approved for production testing.
