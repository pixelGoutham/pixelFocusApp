---
name: Timer persistence via TimerContext
description: Why timer state must live in a global context (not page-local state) and how background accuracy works.
---

## Rule
All Pomodoro and Stopwatch state lives in `TimerContext` (not in the page component). Pages read/write from context via `useTimer()`.

**Why:** wouter unmounts the page component when the route changes, destroying any `useState` values. This caused complete timer resets on tab switch.

## How to apply
- Timer state is persisted to localforage keys `pixel_pomodoro_state` / `pixel_stopwatch_state` on every update.
- For accuracy when tab is hidden (browsers throttle setInterval): store `timerEndTimestamp = Date.now() + secondsLeft * 1000` when the timer starts. On each tick AND on `visibilitychange`, calculate `secondsLeft = Math.ceil((timerEndTimestamp - Date.now()) / 1000)`.
- On mount, restore from localforage. If `running=true` and `timerEndTimestamp` is in the past, the timer expired in the background — auto-advance phase.
- Phase-complete side effects (logging sessions, toasts) are registered via `setPomPhaseCompleteCallback()` in Pomodoro.tsx's useEffect, so the callback always has fresh closure values.
