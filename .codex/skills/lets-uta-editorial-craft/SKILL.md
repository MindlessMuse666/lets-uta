---
name: lets-uta-editorial-craft
description: Build and review the local Vocaloid karaoke player with Svelte 5 Runes, contract-first architecture, accessible editorial cyber-pop UI, line-based karaoke highlighting, local media processing, and acceptance-driven slice delivery. Use for frontend, full-stack, UI architecture, design-system, or karaoke-player tasks in this repository.
---

# Vocaloid Editorial Craft

**Version: v2 (17 августа, 2026)**

Use this skill for every implementation or review task in the karaoke player repository.

## 1. Source of truth and workflow

1. Read `TECH-TASK.md` completely before changing code.
2. Read the current slice and its acceptance criteria.
3. Inspect the repository before choosing files or abstractions.
4. Work on one slice per session, in the documented order.
5. Keep domain contracts exact. Do not invent database columns, routes, types, or callbacks.
6. Write tests from acceptance criteria and failure scenarios.
7. Run the documented gate before closing a slice.
8. If a required contract is absent, stop and output the exact `CONTRACT GAP` block.

Do not hide missing requirements behind `any`, undocumented fields, local-only DTOs, or speculative fallback behavior.

## 2. Svelte 5 Runes

Use only Svelte 5 syntax:

- Declare props with `let { ... }: Props = $props()`.
- Declare mutable state with `$state`.
- Declare computed state with `$derived`.
- Use `$effect` only for DOM, media-element, or external synchronization.
- Use snippets and `{@render ...}` instead of legacy slots.
- Use callback props such as `onclick={handleClick}`.
- Keep event handlers small and move reusable logic to domain functions.

Never use:

- `export let`;
- reactive `$:` statements;
- `<slot />`;
- `on:click` and other legacy event directives;
- `createEventDispatcher`;
- browser imports of server-only modules.

For media elements, keep the element reference in component state and synchronize it through a narrowly scoped `$effect`. Do not mirror every media event into a global store.

## 3. Architecture boundaries

- Keep SQLite, filesystem, FFmpeg, ONNX Runtime, workers, and secrets in `src/lib/server/`.
- Keep pure line splitting, timing validation, mapping, archive validation, and domain types in `src/lib/karaoke/`.
- Keep reusable visual components in `src/lib/ui/`.
- Let routes translate form data and HTTP errors into domain service calls.
- Do not place SQL in Svelte components or route markup.
- Do not import `better-sqlite3` or `onnxruntime-node` into browser code.
- Do not expose absolute filesystem paths to the client.
- Keep long media and alignment operations outside HTTP request execution.

When a component needs data, pass a typed prop or callback. Do not let it reach through the route into the database.

## 4. Contract-first testing

For each acceptance criterion, identify the observable behavior and write the smallest test that proves it.

- Pure validation and mapping: unit tests.
- SQLite transactions and repository behavior: integration tests with `:memory:`.
- Form actions and endpoints: direct request tests plus relevant browser coverage.
- Player, active line and keyboard behavior: component and Playwright tests.
- Worker pipeline: deterministic mocks for FFmpeg/model adapters, including failure and cancellation.
- Seed-dependent scenarios: use `scripts/data/songs_dataset.json` rather than hand-built duplicate fixtures.

Test failure paths explicitly: missing media, invalid input, missing model, worker failure, stale job, cancelled job, invalid archive, and missing entity.

## 5. Editorial cyber-pop direction

Design the product as a music instrument and catalogue, not as a generic dashboard.

### Composition

- Use an asymmetric but intentional grid.
- Let the song title, current lyric and player controls establish hierarchy.
- Use rules, labels, offsets and typographic rhythm to create musical structure.
- Vary density through layout and type scale, not random cards or decorative noise.
- Keep important content calm enough for long reading and listening sessions.

### Color

Use these project accents as controlled signals:

- cyan `#00E5FF` for focus, links and primary active affordances;
- pink `#FF4081` for active lyric and selected performance state;
- yellow `#FFD543` for warnings and attention states.

Use warm paper and graphite surfaces in light mode. Use deep graphite surfaces in dark mode. Keep body text near-black or near-white with sufficient contrast. Never use bright accent colors as large text backgrounds unless contrast is verified.

Avoid:

- permanent neon glow;
- random gradients;
- glassmorphism by default;
- floating blobs with no semantic purpose;
- excessive borders and tiny labels everywhere;
- interchangeable AI-generated landing-page composition.

### Typography and assets

- Prefer a distinctive local display face paired with a highly readable local sans.
- Store licensed fonts under `static/fonts/`; do not use Google Fonts or another CDN.
- Keep Cyrillic, Latin and Japanese fallback coverage explicit.
- Use SVG/CSS for interface motifs when possible.
- Do not invent decorative artwork when typography, spacing or a simple rule communicates the idea better.

### Arcade interaction language

- Treat controls as small playable objects: use a short press displacement, a deliberate hover offset, an accent-line or stamp change, and a strong `focus-visible` state.
- Keep motion rhythmic and purposeful. Prefer one authored transition for a state change over generic hover shimmer, permanent glow, random gradients, or glassmorphism.
- Use the same interaction grammar for buttons, links, cards, selects, dialog actions, and media controls.
- With `prefers-reduced-motion: reduce`, remove displacement and interpolation while preserving state, focus, contrast, and feedback.

### Selection palette

- Outside `ja`/`ru`/`en` lyric containers, selection cycles through cyan `#00E5FF`, pink `#FF4081`, and yellow `#FFD543`; do not use the browser default blue.
- In `ja`, selection may use yellow or cyan; in `ru`, yellow or pink; in `en`, pink or cyan. The chosen color must not equal that container's active-line color.
- Use a contrast-safe selection foreground. Acceptance tests check palette membership and exclusion of the active-line accent rather than relying on an unstable random value.

## 6. Karaoke behavior

- Render user-provided line breaks in their original order.
- Treat `ja` as the only primary language and allow at most one persisted secondary lyric in `ru` or `en`.
- Keep line timing discrete: inactive, active, and optionally past states.
- Store and render one timing set anchored to primary `ja`; a translation follows the same `lineIndex` and never owns duplicate timings.
- Never implement continuous word fill when the contract is line-based.
- Use `aria-current="true"` on the active line.
- After the configured `autoScrollDelayMs` idle period (default `3000`), reveal the active line with a deliberate scroll. Any interaction resets the timer; text selection and manual scrolling temporarily pause auto-scroll until the next idle period.
- For MP4, use ordinary page scrolling so the media player does not cover the lyrics.
- If timings are missing, render normal readable lyrics and expose the available editing or synchronization action.
- Make the active state distinguishable by color, weight, marker, or background—not color alone.

## 7. Forms, errors, and motion

- Every input has a visible label or an equivalent accessible name.
- Keep server validation authoritative; client validation is only an early affordance.
- Preserve valid submitted values after an action error.
- Place errors adjacent to the invalid field and summarize them for assistive technology.
- Use loading and progress states for long operations.
- Add translations through a separate asynchronous `addTranslation` action; never pause or block media playback while it resolves.
- Validate translation language, the `8191`-character limit, and exact `splitText` line-count equality with primary `ja` before persistence.
- Disable only the action that cannot be safely repeated.
- Respect `prefers-reduced-motion`.
- Prefer one meaningful entrance or state transition over many micro-animations.

## 8. Responsive and accessibility rules

- Design from 320 px upward.
- Do not hide the active lyric or primary playback controls on narrow screens.
- Maintain visible focus rings.
- Use semantic headings, landmarks, buttons and links.
- Ensure dialogs trap focus and close with Escape when allowed.
- Keep touch targets large enough for mobile use.
- Never rely on hover to expose essential information.
- Keep the player above the lyric stage; place `ja` centrally by default, and move it left while a valid translation enters on the right. Stack the columns on narrow screens.
- Use one unified styled error boundary for `400`, `404`, and `500`; never expose paths, stack traces, SQL, or internal identifiers.
- Verify long titles, long lyric lines, empty states, errors and loading states.

## 9. Review checklist

Before declaring a UI slice complete, check:

- Runes syntax only;
- no server import in browser code;
- no duplicated custom button/input styles in routes;
- no unexplained visual ornament;
- readable typography in all supported scripts;
- active lyric state is discrete and accessible;
- primary `ja`, optional single translation, shared timings, async translation, and auto-scroll reset behavior match the contract;
- arcade states are coherent across controls and selection colors follow the language palette;
- keyboard and reduced-motion behavior work;
- light and dark themes preserve hierarchy;
- mobile layout remains usable;
- acceptance tests cover the visible behavior;
- `npm run gate` is green.

## 10. Contract gap response

When implementation needs an absent contract, stop and output:

```text
CONTRACT GAP
Что нужно: <поле, тип, функция, маршрут или правило>
Зачем: <какой критерий приёмки невозможно выполнить>
Предлагаемая форма: <точная сигнатура, колонка, маршрут или схема>
Что делаю пока: жду согласования и не добавляю выдуманный контракт
```

Do not continue with a speculative implementation after this block.
