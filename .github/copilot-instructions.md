# Copilot Instructions

## Project Snapshot
- Vite + React 19 + TypeScript SPA that tracks stream-tapping performance; entry point is `src/main.tsx` rendering `App`.
- State and business logic live inside `src/hooks/useTapTracker.ts`; UI composition is in `src/App.tsx` with Tailwind utility classes.
- Charts rely on `recharts`; shared utilities for keys and persistence are under `src/utils`.

## Core Data Flow
- `useTapTracker` listens to global `keydown`/`keyup` events, debounces repeats, and tracks active keys per hotkey pair; it returns `metrics`, `bpmSeries`, and `totalTaps`.
- Taps are sliced to a rolling 20s history (`HISTORY_MS`) and a dedicated rolling BPM series window (30s) for the chart.
- Metrics calculate taps/sec, BPM (scaled by `snap`), unstable rate (stddev ×10), and BPM variance off the most recent tap window.
- Stats reset after inactivity detected by `shouldResetStats`, but `totalTaps` persists across runs within the session.

## Key Binding & Storage
- Bindings are two-key tuples per hotkey (`primary`/`secondary`); `KeyBindingControl` handles capture and leverages `normalizeKey`/`formatKeyLabel` for UX.
- Local persistence uses `localStorage` keys `streaming-x-keybindings` and `streaming-x-snap`; always update `save*`/`load*` helpers when adding new persisted values.
- Avoid binding conflicts by checking `allKeys` in `App`; match that pattern if you introduce more configurable inputs.

## Styling & UI
- Tailwind 4 pipeline via `@import "tailwindcss"` in `src/index.css`; prefer utility classes over bespoke CSS.
- Component containers use dark-slate palette with subtle borders and transparency—follow existing classes for visual consistency.
- `BpmChart` expects `BpmSample[]` with `seconds` derived from the first sample timestamp; keep data pre-processing in the container, not in the chart component.

## Development Workflow
- Install dependencies and run `npm run dev` (or `npm run build` / `npm run preview`); lint with `npm run lint`, formatting via `npm run format`.
- TypeScript is in `strict` mode; extend `TapMetrics` and related consumers together to keep the app compiling.
- React Compiler Babel plugin is enabled in `vite.config.ts`; stick to function components and hooks to benefit from the compiler.

## Extending the App
- Add new metrics by expanding `TapMetrics`, deriving values in `useTapTracker`, and surfacing them in `StatsPanel` or new UI panels.
- When changing key-tracking behavior, preserve the `pressedKeysRef` / `activeKeyRef` guards so simultaneous key presses remain mutually exclusive.
- For additional charts, source data from `bpmSeriesState` or derive new memoized datasets next to `chartData` in `App`.
