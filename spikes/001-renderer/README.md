# Spike 001 — A2UI renderer

Throwaway code for milestone M1. Its only job is to answer one question with
running code: **can we render A2UI with the official React renderer, or do we
need to write our own?** The answer lives in
[`docs/decisions/001-renderer.md`](../../docs/decisions/001-renderer.md).

This folder is standalone (its own `package.json` and lockfile) on purpose.
It does not depend on the M2 workspace, so it can be deleted without touching
anything else.

## Run it

```sh
cd spikes/001-renderer
pnpm install
pnpm dev       # open the printed localhost URL
pnpm build     # typecheck + production build, proves it compiles
```

## What each file does

| File | Why it exists |
| --- | --- |
| `package.json` | Exact versions (no `^` or `~` ranges) so the spike installs the same way every time. |
| `.nvmrc` | Node version for `nvm use` (24, the current LTS). |
| `tsconfig.json` | `strict` + `noUncheckedIndexedAccess`; `moduleResolution: Bundler` because Vite, not Node, resolves imports. |
| `vite.config.ts` | Adds the React plugin (JSX transform + fast refresh). Nothing else. |
| `index.html` | Vite's entry point. It loads `src/main.tsx` as an ES module. |
| `src/main.tsx` | Mounts `<App />` into `#root` inside `StrictMode`. |
| `src/App.tsx` | The plain Vite page: every scenario on one page, plus an action log. |
| `src/ScenarioPlayer.tsx` | Replays a list of message steps into a `MessageProcessor` and renders its surfaces with `<A2uiSurface>`. |
| `src/orgCatalog.tsx` | Our `org-catalog`: Column, Card, Text, Button and an `AccountSummary` block. Each is a Zod schema (what the agent may send) plus a plain HTML React view. |
| `src/catalog.css` | Plain CSS for those components, one class each. No A2UI CSS is used anywhere. |
| `src/messages.ts` | A hard-coded A2UI v0.9 message sequence (what an agent would stream). |
| `src/scenarios.ts` | Seven recorded "streams": golden paths plus deliberately broken input. |

## What the scenarios showed

Recorded in full in the decision record. In short: our own catalog works
without forking (no A2UI built-in components or CSS needed), data updates
re-render in place, unknown components render an inline placeholder, and
malformed messages throw (earlier state survives). Action payloads are
**not** validated by the renderer. We have to add that.
