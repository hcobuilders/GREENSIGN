# GREENSIGN

> Connected construction intelligence. Standardized inputs, confirmation-first workflows, reusable outputs.

![Version](https://img.shields.io/badge/version-0.6.0-87ff4f?style=flat-square&labelColor=111512)
![React Router](https://img.shields.io/badge/React_Router-Framework_Mode-c5cec7?style=flat-square&labelColor=111512)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-79aef2?style=flat-square&labelColor=111512)

## v0.6.0 Godmode layout studio

- Separated private Godmode from every operating environment with its own route, navigation, loader, actions, and interface language.
- Added a PostgreSQL-backed layout studio for global colors, typography, scale, density, geometry, application frames, dashboard columns, and per-tool workspace layouts.
- Every layout save creates an immutable version with Preview, Activate, Duplicate, and Restore-as-New controls for safe experimentation and rollback.
- Rebuilt project overview information into one production command center with latest estimate/proposal access and bidding-package actions.
- Added editable project leads, editable workflow tables, real column filters, CSV imports/templates, a complete procurement schema with automatic late-order risk, and working workspace-intelligence actions.
- Made dashboard cards editable, status-aware, color-configurable, menu-driven, and reorderable by drag and drop.

## v0.5.0 project operating system

- Rebuilt every open project as a responsive, full-width operating workspace with persistent project tools, a unified overview, and a detailed information/coverage pane.
- Reworked dashboard project cards around bid signals, dates, values, and direct project/file actions; metrics now open navigable detail drawers and approved actions leave the queue.
- Changed manual project creation to a confirmation-first drawer that writes only on Create Project and opens the new workspace immediately.
- Added working cross-project Data, trade-partner Network, Feedback Audit, and connected Godmode destinations.
- Made all environment and tool settings editable and persistent without a scrolling navigation trap.
- Expanded global commands to cover every construction tool and its create action while preserving natural-language project navigation, `/ver`, one-key slash focus, Escape exit, and non-blocking feedback.

## v0.3.0 responsive command and feedback

- Added a legible responsive type and spacing scale for 1080p, 4K, tablet, and compact viewports.
- Expanded the global command bar with one-key slash entry, Escape-to-exit, active high-visibility styling, autocomplete, five-second inline error tips, command discovery, and natural-language project navigation.
- Added `/ver` runtime diagnostics for version, build timestamp, server/database health, environment, route, and viewport.
- Added project open actions and focused project dashboards.
- Standardized status and tag capitalization.
- Added persistent contextual feedback capture: right-click outside form controls to attach a note, page, URL, viewport, and timestamp.
- Enabled persistent creation, state changes, revision tracking, and deletion across all construction workflows, including proposals, contractors, solicitations, and scope reviews.
- Made company and per-tool settings persistent and connected the private Godmode metrics to live environment data.

## v0.4.0 flagged feedback

- Restored full-width layouts at every desktop resolution while retaining fluid type scaling.
- Added JSON/CSV project import from the dashboard New action.
- Added persistent View and Approve controls to dashboard activity items.
- Scoped construction tool navigation and commands to an open project.
- Reset and unfocus the command bar immediately after successful commands.

## Foundation release

This is the first production-oriented GREENSIGN foundation. It converts the approved interactive mockup into a server-rendered React application with real URLs, a multi-company PostgreSQL schema, local Docker services, and Railway-ready packaging.

The visible workflows intentionally do **not** create records in this release. Every action reaches a confirmation endpoint and ends with **OK**, allowing product structure and navigation to be validated before persistent behavior is enabled.

The approved interactive presentation remains available at `/mockup`. The application opens at `/app/dashboard`.

## v0.2.0 interface rebuild

- Restored the final top-navigation design and removed the duplicated persistent sidebar.
- Split construction tools and account settings into focused header popovers.
- Rebuilt Projects as a functional PostgreSQL-backed table with search, filters, select-all, bulk status changes, bulk deletion, inline text/status editing, and calendar date inputs.
- Restored distinct workflow steps, metrics, working tables, intelligence panels, and actions for every construction tool.
- Fixed global commands, including `/projects`, tool shortcuts, settings navigation, and private `/gm_RH` access.
- Kept Quick Add exclusively in the top bar and styled the command `RUN` control as plain green text.

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

Authentication, OAuth providers, email delivery, document generation, external connectors, and Railway deployment remain deferred. Project, workflow, settings, feedback, and company-environment writes are PostgreSQL-backed in the current operating build.
