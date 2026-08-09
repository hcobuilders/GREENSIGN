# GREENSIGN

> Connected construction intelligence. Standardized inputs, confirmation-first workflows, reusable outputs.

![Version](https://img.shields.io/badge/version-0.8.2-87ff4f?style=flat-square&labelColor=111512)
![React Router](https://img.shields.io/badge/React_Router-Framework_Mode-c5cec7?style=flat-square&labelColor=111512)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-79aef2?style=flat-square&labelColor=111512)

## v0.8.2 100 MB project uploads

- Increased the project drawing and specification limit from 25 MB to 100 MB per file for both new-project intake and later document uploads.
- Centralized the limit so server validation and both upload interfaces remain synchronized.

## v0.8.1 resilient intake and feedback completion

- Fixed PDF parsing so source bytes remain intact for storage, and made multi-file parsing atomic so failed intakes leave no partial documents or orphan projects.
- Added a visible multi-file upload queue, actionable inline failure states, safe retry behavior, and persistent parsed source records for drawings and specifications.
- Completed the current feedback audit with a simplified Projects toolbar, clear Project number language, address-aware custom parameters, connected workflow-metric filters, improved status tags, and environment spacing.
- Enhanced right-click feedback with the selected interface element and click position so future notes identify their exact target.

## v0.8.0 approval-first AI assistance

- Added a global, project-aware AI copilot across project intake and every construction workflow, with natural-language entry through the command bar.
- Added OpenAI Responses API integration with strict structured outputs, server-only credentials, configurable model routing, prompt versioning, usage/latency records, source evidence, and immutable approval history.
- Automatically prepares a project-intake review after document uploads while preserving the deterministic parser and the existing For Approval confirmation workflow.
- Added connected draft generation for project intelligence, scope review, trade-partner matching, solicitations, proposals, RFIs, commitments, submittals, procurement, schedule, closeout, and change risk.
- Added a Godmode AI Control Center for cloud-processing approval, model routes, editable prompt versions, activation/rollback, and permanent safety boundaries.
- Added a deterministic offline assistant so the complete review and approval interface remains testable without transmitting documents or configuring an API key.

## v0.7.0 linked project intake and Godmode controls

- Added confirmation-first draft project intake with drawing/specification uploads, stored originals, deterministic PDF/text extraction, editable parsed project facts, parsed CSI scope candidates, and approval into an operating project.
- Linked project documents, scope records, proposals, solicitations/bid packages, due dates, and persistent trade-partner recipients throughout the application.
- Rebuilt Network as a persistent contractor directory with structured addresses, licenses, prequalification, insurance, qualifications, and past-project information.
- Completed Godmode Versions, Environments, and Interface Map editors, including immutable layout lifecycle controls and in-preview element color pickers.
- Completed account/company/tool settings, unlinked proposal management, customizable shared tags, styled address and command suggestions, and direct destinations for application actions.
- Increased the responsive type system for 1080p and 4K use while preserving full-window-width workspaces.

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
- OpenAI Responses API with structured outputs and approval-first application actions
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

Authentication, OAuth providers, external email delivery, generated PDF/DOCX output, external connectors, and Railway deployment remain deferred. AI assistance is operational when cloud processing is explicitly approved and a server-side `OPENAI_API_KEY` is configured; otherwise the same review surfaces use the deterministic offline assistant. All AI results remain approval-gated drafts and external, destructive, publishing, commitment, and financial actions are blocked.
