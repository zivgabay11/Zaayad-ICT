# CLAUDE.md

Guidance for Claude Code (and other AI agents) when working in this repository.

## Project Overview

**Horus** is a prototype example web app for military planners to quickly generate and
visualize operational plans using a set of tools, an interactive map, and a
conversational AI Agent.

> **Note:** This is a prototype built for demonstration purposes. It uses
> mock-data (no real backend) to simulate the experience of a real-world
> application. State is persisted client-side in `localStorage`.

## Tech Stack

- **React** + **TypeScript**
- **Vite** (build tooling, dev server, env injection)
- **Tailwind CSS** (`@tailwindcss/vite`) — Material 3 inspired styling
- **react-i18next** / **i18next** — multi-lingual (English + Hebrew RTL)
- **@google/genai** — Gemini API for the conversational AI Agent
- **Leaflet** / **react-leaflet** / **@geoman-io/leaflet-geoman-free** — interactive maps & drawing
- **@dnd-kit** / **dnd-timeline** — drag & drop, Gantt/timeline interactions
- **Tiptap** (+ `tiptap-markdown`) — rich text editing
- **Recharts** — charts; **motion** — animations; **lucide-react** — icons
- **react-pdf** — document viewing; **zod** — schema validation

## Commands

Run all commands from the `frontend/` folder.

```bash
npm install       # install dependencies
npm run dev       # start dev server on port 4000 (host 0.0.0.0)
npm run build     # production build (vite build)
npm run preview   # preview a production build
npm run start     # serve build on port 8080 (uses $PORT if set)
npm run lint      # type-check only: tsc --noEmit
npm run clean     # remove dist/
```

There is **no test suite**. `npm run lint` runs `tsc --noEmit` and is the
primary correctness gate — run it after making changes.

## Environment

- Set `GEMINI_API_KEY` in `.env.local` (git-ignored). Required for the AI Agent.
- Vite injects it via `define` in [vite.config.ts](vite.config.ts) as
  `process.env.GEMINI_API_KEY`. Agent code also reads `VITE_GEMINI_API_KEY`.
- `@` is aliased to the project root (see `resolve.alias` in the Vite config and
  `paths` in [tsconfig.json](tsconfig.json)).

## Architecture

### Folder structure: feature-by-folder

Each feature lives in its own top-level folder under `src/`, typically with
`screens/`, `widgets/`, and optionally `hooks/`, `services/`, and `utilities/`
subfolders.

- `src/common/` — shared code used across features:
  - `context/` — React Context providers (global state)
  - `widgets/` — shared UI components (`Card`, `Field`, `MapPanel`, `DocPanel`, etc.)
  - `utilities/` — `types.ts` (all shared TS types), `mockData.ts` (all mock data), `colors.ts`, `formatting.ts`
  - `chat/` — the AI Agent (`agent.ts`) and chat UI (`widgets/ChatPanel.tsx`, `ChatSidebar.tsx`)
- Feature folders: `auth/`, `plans/`, `definitions/`, `calendar/`, `intelligence/`,
  `objective/`, `mission/`, `method/`, `tasks/`, `combat_script/`, `diagram/`,
  `general/`, and more.
- `src/locales/` — `en.json` and `he.json` translation resources.

### Entry points

- [src/main.tsx](src/main.tsx) — mounts `<App />` wrapped in `PlanProvider`; imports `./i18n`.
- [src/App.tsx](src/App.tsx) — root layout: collapsible sidebar + chat panel + content area, section routing (via `currentSection` state, not a router), and providers (`MapProvider`, `DocProvider`, `AnalysisProvider`).

### State management

State is React Context + `localStorage`, not Redux/router.

- **PlanContext** ([src/common/context/PlanContext.tsx](src/common/context/PlanContext.tsx)) —
  the core store. Holds `plans`, `activePlanId`/`activePlan`, CRUD (`createPlan`,
  `updatePlan`, `deletePlan`), and a **propose/commit/discard** flow
  (`pendingUpdates`, `proposeUpdate`, `commitUpdate`, `discardUpdate`) used by the
  AI Agent to suggest edits the user can accept or reject. Seeds from `mockPlans`
  and persists to `localStorage` keys `horus_plans` / `horus_active_plan_id`.
- **MapContext**, **DocContext**, **AnalysisContext** — UI/panel state for the
  map, document panel, and diagram analysis features.
- Navigation is state-driven via `currentSection` in `App.tsx`. There is no
  React Router; sections are rendered with conditional logic.

### AI Agent

- Implemented in [src/common/chat/agent.ts](src/common/chat/agent.ts) via
  `horusAgentFlow(request)` using `@google/genai` (Gemini) **client-side**.
- Uses Gemini **function-calling tools** to read/update the plan:
  `getCurrentScreen`, `searchPlan`, `updatePlanProperty`, and calendar tools
  (`addCalendarEvent`, `updateCalendarEvent`, `deleteCalendarEvent`).
- Returns `{ response, updatedPlan?, proposedUpdates?, navigateTo? }`. Proposed
  updates flow into PlanContext's pending-update mechanism for user approval.
- Responds in the active UI language (English/Hebrew).

### Authentication

Hard-coded, client-side only. [src/auth/screens/LoginScreen.tsx](src/auth/screens/LoginScreen.tsx)
validates against `mockUsers` in `mockData.ts` (all use password `temp00`).
No real auth/backend — do not treat this as secure.

### Internationalization (i18n)

- Configured in [src/i18n.ts](src/i18n.ts). Default language is **Hebrew** (`he`), fallback `he`.
- All user-facing strings go through `t('...')`; keys live in `src/locales/{en,he}.json`.
- The app is fully RTL-aware: in Hebrew the sidebar and chat move to the right.
  Use `i18n.dir()` / `isRtl` for direction-sensitive layout.
- Localized data fields use `Record<string, string>` (e.g. `name: { en, he }`).

## Conventions

- **Types:** shared types live in [src/common/utilities/types.ts](src/common/utilities/types.ts). Reuse them; localized text is `Record<string, string>`.
- **Mock data:** all mock data lives in [src/common/utilities/mockData.ts](src/common/utilities/mockData.ts). Add new mock data there, not scattered across features.
- **Placement:** put feature-specific code in that feature's folder; only promote to `src/common/` when shared across features.
- **Styling:** Tailwind utility classes with dark-mode variants (`dark:`). Follow Material 3 and keep components responsive.
- **Icons:** use `lucide-react`.
- **i18n:** never hard-code user-facing strings — add keys to both `en.json` and `he.json`.
- After changes, run `npm run lint` (`tsc --noEmit`) to verify types.

## Notes & Gotchas

- HMR can be disabled via `DISABLE_HMR=true` (used in AI Studio to prevent flicker during agent edits) — see the Vite config; do not "fix" that.
- `localStorage` is the source of truth at runtime; the provider merges new mock
  fields into stored plans for dev convenience. Clearing site storage resets to mock data.
