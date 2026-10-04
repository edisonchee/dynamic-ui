# CLAUDE.md

Instructions for coding agents working in this repository.

## What this repo is

A Storybook workbench for building a catalog of UI blocks that an AI agent
composes at runtime using the [A2UI](https://github.com/a2ui-project/a2ui)
protocol (v0.9.1).

The agent never sends code. It streams JSON messages (`createSurface`,
`updateComponents`, `updateDataModel`, `deleteSurface`) that name components
from a trusted catalog, their props, and the data bound to them. The client
renders those with components it already has. User interactions go back to the
agent as actions.

Treat this as a learning repo: prefer small, explicit code over clever code,
and comment the *why*.

## Layout

| Path | What it is |
| --- | --- |
| `spikes/001-renderer/` | Milestone M1 spike. Standalone (own `package.json` and lockfile): a Vite page and a Storybook that render A2UI message scenarios with our own catalog. |
| `docs/decisions/` | Decision records. `001-renderer.md` explains why we wrap the official renderer. |
| `docs/dev-env/` | Running Storybook inside a VM and opening it from the host. |

Planned from M2: a pnpm workspace with `packages/catalog` (blocks, one folder
per block with component, `spec.ts`, stories and example payloads) and
`packages/renderer` (adapter, `Surface`, fallbacks), a `mocks/` folder of
message sequences, and `scripts/` for scaffolding, catalog codegen and
validation.

## Rules

### Styling

- **Never use A2UI's CSS.** A2UI's built-in "basic catalog" components
  inject a page-wide stylesheet at runtime (`:root { color-scheme: light dark }`
  plus `--a2ui-*` variables) that leaks across the app. Never import or
  register basic-catalog components, never call `injectBasicCatalogStyles`,
  never read or set `--a2ui-*` variables. Any style coming from A2UI is a bug.
  Background: `docs/decisions/001-renderer.md`, section "Styling".
- **Plain HTML/CSS.** Every catalog component is our own semantic HTML with one
  plain CSS class per component. No design tokens or theme yet. Theming will
  come later as our own CSS variables, so keep styles easy to convert.
- **Check it holds:** in any story, `document.adoptedStyleSheets.length` is `0`
  and no element carries an `a2ui-*` class.

### Architecture

- **Adapter boundary.** Only the renderer adapter imports `@a2ui/*` (in the
  spike: `orgCatalog.tsx` and `ScenarioPlayer.tsx`). Blocks receive plain,
  already-resolved props and never import A2UI types.
- **Catalog only.** Blocks render only from catalog components. No
  agent-supplied code, HTML, styles or free-form URLs. Visual variation comes
  from enumerated variants.
- **Schemas are Zod 3.25.x**, pinned because `@a2ui/react` lists it as a peer
  dependency. Don't upgrade to Zod 4. Component schemas use `.strict()` so
  unknown props are rejected.
- **Actions are an allowlist**, declared per block and validated before they
  leave the client. The renderer does not validate action payloads; we do.
- **Mandatory content** (disclosures, confirmation steps) lives only in
  `locked`-tier blocks. The agent fills their data but can't omit or reorder
  their parts.
- **Accessibility:** streamed UI must not steal focus mid-stream, and new
  content is announced politely.

### Working

- **Verify, don't recall.** Check package versions, A2UI message shapes and
  renderer APIs against npm and the A2UI repo before writing protocol code.
  Pin exact versions.
- **When project docs and the A2UI spec disagree, the spec wins.** Note the
  conflict in the PR.
- **No real data.** Mocks use invented names, accounts and amounts. No
  credentials or internal URLs.
- **Out of scope:** live LLM calls, a custom Storybook addon, a production chat
  shell, backend or agent code.
- **Ask before** adding a dependency outside the stack: TypeScript, React,
  Vite, Storybook, Zod, Vitest, Playwright.

## Storybook

```sh
cd spikes/001-renderer
pnpm install
pnpm storybook        # http://localhost:6006
```

Storybook must stay reachable from outside a VM or container:

- `pnpm storybook` listens on `0.0.0.0:6006` with `--exact-port` (fail
  loudly instead of drifting to another port) and `--no-open`.
- `core.allowedHosts` stays non-empty, which keeps Storybook's Host-header
  check on. `ALLOWED_HOSTS=name` adds hostnames; `WATCH_POLLING=1` enables
  polling file watching for shared folders.
- Node 24 LTS (22.12+ works). pnpm is pinned with `packageManager` (use
  corepack).
- Keep `docs/dev-env/virtualbox-debian.md` in sync when ports, scripts or
  Node versions change.

## Before pushing

From `spikes/001-renderer`:

```sh
pnpm typecheck
pnpm build
pnpm build-storybook
```

Then open the stories and confirm the styling check above.
