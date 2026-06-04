# FocusForge

A fully offline productivity OS for students — built as a React+Vite web app. No login, no cloud, no backend. All data stored in localforage (IndexedDB). Export/import via a single JSON backup file.

## Run & Operate

- `pnpm --filter @workspace/focusforge run dev` — run the FocusForge web app (via workflow)
- `pnpm --filter @workspace/api-server run dev` — run the API server (not used by FocusForge)
- `pnpm run typecheck` — full typecheck across all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- React 19 + Vite, Tailwind CSS v4, shadcn/ui components
- State: localforage (IndexedDB, no backend)
- Charts: recharts
- Routing: wouter
- Animations: framer-motion
- CSV parsing: papaparse
- Dates: date-fns

## Where things live

- `artifacts/focusforge/src/lib/store.ts` — data types + localforage CRUD
- `artifacts/focusforge/src/lib/StoreContext.tsx` — React context + seed data
- `artifacts/focusforge/src/components/Layout.tsx` — collapsible sidebar shell
- `artifacts/focusforge/src/pages/` — all 11 pages (Dashboard, Calendar, Tasks, Matrix, Pomodoro, Stopwatch, Analytics, StudyPlanner, MockTests, Flashcards, Settings)

## Features

- **Dashboard** — study time stats, today's schedule, daily goal ring, heatmap, upcoming tasks
- **Calendar** — weekly grid view, click-to-add tasks, CSV import (Date,Start,End,Subject,Task,Priority)
- **Tasks** — filterable task list, add/edit/delete, priority & quadrant assignment
- **Eisenhower Matrix** — drag-and-drop tasks between quadrants
- **Pomodoro** — 25/5 timer with ring animation, session logging, audio ping, per-subject tracking
- **Stopwatch** — lap timer, study session logging
- **Analytics** — bar/pie charts, 28-day heatmap, weekly goal progress, subject breakdown
- **Study Planner** — weekly hour planning grid, generate from tasks
- **Mock Tests** — score tracking, trend line chart, subject breakdown
- **Flashcards** — spaced repetition (hard/medium/easy), review mode + browse mode
- **Settings** — profile, pomodoro defaults, JSON export/import backup, clear all data

## Architecture decisions

- No backend: all data in localforage (IndexedDB). Works offline, no auth needed.
- CSV import maps Priority field to Eisenhower quadrants automatically.
- Subject colors are deterministic (rotating palette by insertion order).
- Seed data injected on first launch (before onboarding is complete).
- Single JSON backup file exports all tables: tasks, sessions, flashcards, mockTests, settings.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Don't import from `@workspace/api-client-react` — there's no backend for FocusForge.
- `getSubjectColor()` in Dashboard.tsx uses a module-level cache; import it from there.
- Pomodoro audio requires a user gesture to initialize AudioContext (browser policy).
