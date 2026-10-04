# Spike 001 — A2UI renderer

Throwaway code for milestone M1. Its only job is to answer one question with
running code: **can we render A2UI with the official React renderer, or do we
need to write our own?**

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
| `src/App.tsx` | The page. A placeholder for now. |
