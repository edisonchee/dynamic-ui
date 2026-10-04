# 001 — Renderer: wrap the official A2UI renderer

- **Status:** Proposed (awaiting review at the end of M1)
- **Date:** 2026-10-04
- **Evidence:** [`spikes/001-renderer/`](../../spikes/001-renderer/) (run `pnpm install && pnpm dev` there)

## Question

To render A2UI messages with our own block catalog, should we:

- **A.** wrap the official renderer (`@a2ui/web_core` + `@a2ui/react`) and
  register our catalog with it, or
- **B.** write a thin renderer of our own behind our adapter?

## Decision

**A. Wrap the official renderer.** Use `@a2ui/web_core` for message parsing,
surface state, data binding and validation, and `@a2ui/react/v0_9` for
rendering. Register **only our catalog**, made of our own plain HTML/CSS
components. **Never use A2UI's CSS** or its built-in "basic catalog"
components (see Styling). Every import from `@a2ui/*` lives in
`packages/renderer/src/adapter/`. Blocks never import A2UI.

## Versions used

Checked on npm and in the A2UI repo
(`a2ui-project/a2ui@1444719`, 2026-10-02). Pinned exactly in the spike.

| Package | Version | Why this one |
| --- | --- | --- |
| A2UI protocol | **v0.9.1** | Current production release. The spec is closed (no more changes). v1.0 is a release candidate. v0.8 is legacy. |
| `@a2ui/web_core` | 0.12.0 | Latest. Accepts both `"v0.9"` and `"v0.9.1"` message versions. Also ships v0.8 and v1.0 adapters. |
| `@a2ui/react` | 0.12.0 | Latest. We import from the `@a2ui/react/v0_9` subpath. The package root still points at legacy v0.8. |
| `zod` | 3.25.76 | **Peer dependency of `@a2ui/react`** (`^3.25.76`). Zod 4 is out (4.6.x) but we can't use it for schemas we hand to the renderer. |
| `react` / `react-dom` | 19.3.0 | Latest. Renderer accepts 18 or 19. |
| `vite` / `@vitejs/plugin-react` | 8.3.2 / 6.1.1 | Latest. |
| `typescript` | 5.9.3 | What A2UI builds with. TS 7.0.2 is the npm `latest` tag. The choice is left to M2 (see Open questions). |

## How the official renderer works (the parts we rely on)

```
agent JSON ──► MessageProcessor ──► SurfaceModel (per surfaceId)
                (web_core)            ├─ components: Map<id, component>
                                      └─ dataModel:  JSON tree
                                              │
                                              ▼
                                       <A2uiSurface surface>   (react/v0_9)
                                              │  looks up each component's type
                                              ▼  in the surface's catalog
                                       our React block, props already resolved
```

- **`MessageProcessor(catalogs, onAction)`** takes messages one at a time or
  in batches. It throws on a message it can't accept and keeps all earlier state.
- **Surface:** one rendering area, keyed by `surfaceId`. `createSurface` picks
  its catalog by `catalogId` from the catalogs the processor knows.
- **Catalog:** `new Catalog(id, protocolVersion, components)`. Each component
  has an **API** (`name` + Zod schema of props) and a **view** (React).
- **Generic binder:** `createComponentImplementation(api, View)` resolves every
  dynamic prop before `View` runs. `{ path: "/account/balance" }` becomes a
  string, and an `Action` prop becomes a `() => void`. Data changes re-render
  only the affected component (signals under the hood).
- **Actions:** clicking calls `onAction({ name, surfaceId, sourceComponentId,
  timestamp, context })`, with `context` bindings resolved at click time.

## Evidence from the spike

| # | Scenario | Observed |
| --- | --- | --- |
| 1 | Plain Card: our `Card`, `Column`, `Text` and `Button`, three messages | Renders. Action logged with `context.accountId` resolved. |
| 2 | A domain block, `AccountSummary` (Zod API + React view), inside our `Column` | Renders. Action logged. **No fork needed.** |
| 3 | `updateDataModel` 1.5s after first render | Balance changes in place. No component messages resent. |
| 4 | Unknown component type `PieChart` | Siblings render. The unknown node shows a hard-coded red inline `<div>Unknown component type: PieChart</div>`. |
| 5 | Malformed `updateComponents` mid-stream | `processMessages` throws a long Zod union error. Earlier state survives. Later messages still apply. |
| 6 | Required data never sent | Block renders with empty strings. **Action still fires with `context: {}`.** |
| 7 | Extra prop `style` on a `.strict()` schema | The **whole** `updateComponents` message is rejected. Surface stays at `[Loading root...]`. |

## Styling: never use A2UI's CSS

A2UI ships a "basic catalog" of ready-made components (`Card`, `Column`,
`Text`, `Button`, …). The spike tried them first, then removed them, because
**they inject CSS into the host page at runtime**:

- The first time any of them mounts, `@a2ui/web_core` attaches a stylesheet to
  the **whole document** (a constructable stylesheet, so there's no CSS file to
  find). It sets `:root { color-scheme: light dark }` plus dozens of
  `--a2ui-*` variables. The components themselves carry inline styles that read
  those variables.
- The stylesheet is never removed. In Storybook it leaked from one story into
  the next.
- `color-scheme: light dark` hands the page over to the OS theme. In dark mode
  that gave white text on Storybook's white canvas.

Rules that follow:

- **No A2UI CSS, ever.** No basic-catalog components, no `--a2ui-*`
  variables, no `injectBasicCatalogStyles`. Every component is ours, styled
  only by our own CSS.
- **Theming will be ours, with our own CSS variables.** Nothing from A2UI may
  set or override page-level styles.
- What A2UI still renders with inline styles: `A2uiSurface`'s
  `[Loading root...]` placeholder and its red "Unknown component type" text (we
  replace both in M4). Importing `@a2ui/react` also adds one `<style>` tag
  for `.a2ui-date-time-input`, which matches nothing because we never use
  that class.
- Check that it stays this way: in a story, `document.adoptedStyleSheets.length`
  must be `0` and no element may carry an `a2ui-*` class. CI could assert both
  (M6).

## Why A over B

1. **The catalog extension point already exists.** Scenario 2 is exactly what
   we need. The hook is public API (`Catalog`, `createComponentImplementation`),
   not a patch.
2. **B means rebuilding most of `web_core`:** JSON Pointer binding with
   collection scopes, two-way binding for inputs, `checks` validation, client
   functions (`formatString`, `required`, …), signal-based reactivity, protocol
   validation, and v0.8/v1.0 adapters. That would be the bulk of the project,
   not a thin layer.
3. **Spec churn is the upstream's problem in A.** The packages ship monthly and
   already contain a v1.0 adapter. Under B, every spec change is ours to make.
4. **Same validator in Storybook, CI and the client.** `web_core` exports a
   `PayloadValidator`, so `pnpm validate` (M4) can use the same rules the
   renderer uses.

## What A does not give us (we build these in the adapter)

These are requirements from the brief that the official renderer doesn't cover.
Scenario numbers point to the evidence.

| Gap | Plan |
| --- | --- |
| Action payloads aren't validated (6) | Our `onAction` wrapper checks the event name against the block spec's `actions` allowlist and the context against its Zod schema before anything leaves the client. Invalid actions are logged, not sent. |
| Unknown-component fallback is hard-coded inline red text (4) | Not replaceable in 0.12.0's public API. Plan: validate each message against our catalog before handing it to the processor, and render our own fallback. Confirm in M4. |
| Errors are verbose Zod unions (5) | The adapter turns them into one designer-readable line plus the raw detail. |
| One bad component rejects the whole message (7) | This is spec-correct and safer, but a single typo blanks a surface. M4 `broken` mocks must render a visible fallback, not `[Loading root...]`. |
| `locked` tier (mandatory content) | Not an A2UI concept. Enforced by our block schemas: locked blocks expose no props that could omit or reorder their parts. |
| A11y: polite announcements, no focus theft mid-stream | Not handled by the renderer. Our `Surface` wrapper adds an `aria-live="polite"` region. Verify focus behaviour in M5. |
| Missing required data renders empty silently (6) | Spec-driven placeholder or skeleton states in blocks (M3) plus `edge` mocks (M4). |

## Consequences

- **Zod is fixed at 3.25.x** until `@a2ui/react` moves to Zod 4. The brief only
  says "Zod", so this fits. Record it in `CLAUDE.md` so nobody upgrades it by accident.
- **Bundle cost:** the spike's production bundle grows from 220 kB to about 510 kB
  minified (about 145 kB gzip). The extra weight is `lit`, `markdown-it`, preact
  signals and Zod, all pulled in by the A2UI packages. That's fine for
  Storybook. The chat client team should know before they adopt the renderer.
- **No markdown.** A2UI's built-in `Text` renders markdown into HTML. Our own
  `Text` renders plain text only, which matches the "no HTML" rule.
- **We depend on a pre-1.0 upstream.** Minor releases may break things. The
  adapter boundary keeps that blast radius to one folder, and exact pins keep
  upgrades deliberate.

## Where the brief and the spec disagree

The brief says the spec wins. Each item below needs a call before M3 or M4.

1. **`props` vs `bindings`.** The brief's spec format keeps literal `props` and
   data-model `bindings` separate. In A2UI, *any* prop can be a literal or a
   `{ path }` binding (`DynamicString`, `DynamicNumber`, …). **Proposal:** keep
   one `props` schema and mark each prop as `bindable` or `literal`. The adapter
   maps bindable props to `CommonSchemas.Dynamic*`.
2. **Actions.** The brief has blocks emit typed actions. In A2UI the **agent**
   writes the event name and context into the message. The block only exposes
   an `Action` prop and calls it. **Proposal:** the spec's `actions` map names
   the block's action props and the context schema each one allows. The adapter
   validates at click time (see Gaps).
3. **Message version string.** The brief's examples use `"version": "v0.9"`.
   v0.9.1 messages use `"v0.9.1"`. The renderer accepts both. **Proposal:** new
   mocks use `"v0.9.1"` with `meta.specVersion: "v0.9.1"`.
4. **`catalogId`.** `org-catalog` works, but the spec recommends a URI and says
   the catalog JSON Schema's `$id` should match it. **Proposal:** keep the
   placeholder through M2, then switch to a URI-shaped id in M3 when
   `catalog.json` is first generated (e.g. `https://example.org/a2ui/catalogs/org/v1`).
   This is already an open decision in the brief.

## Open questions

- **TypeScript 5.9 or 7?** 7.x is now `latest`. Before M2 commits to it, check
  that Storybook, typescript-eslint and Vitest work with it.
- **What happens to the spike?** Keep it as a reference until M3 lands, then
  delete it.
