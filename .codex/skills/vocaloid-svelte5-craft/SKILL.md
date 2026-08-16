---
name: vocaloid-svelte5-craft
description: Guidelines for Svelte 5 Runes architecture and Vocaloid-themed cyberpunk UI design according to TECH.md specifications.
---

# Vocaloid Player UI & Svelte 5 Engineering Guidelines

## 1. Svelte 5 Runes Rules (CRITICAL)

Do NOT use legacy Svelte 3/4 syntax. Strictly use Svelte 5 Runes.

- **Props**: Use `let { prop1, prop2 = default }: Props = $props();`. NEVER use `export let`.
- **State**: Use `let count = $state(0);` or `let items = $state<string[]>([]);`.
- **Derived State**: Use `let double = $derived(count * 2);`. NEVER use `$: double = ...`.
- **Side Effects**: Use `$effect(() => { ... })` for DOM manipulation or sync with media elements.
- **Children / Slots**: Use `{#snippet children()}{/snippet}` and `render` snippets or `{@render children?.()}` instead of `<slot />`.
- **Events**: Use standard callback props (`onclick={handleClick}`, `onTimingChange`) instead of `createEventDispatcher` or `on:click`.

## 2. Design System & Vocaloid Cyberpunk Aesthetic

Apply consistent, futuristic, clean, and accessible UI based on the project palette:

- **Color Tokens**:
  - Primary / Accent Cyan (Miku): `#00E5FF`
  - Secondary / Accent Pink (Luka / Teto): `#FF4081`
  - Warning / Accent Yellow (Neru / Rin): `#FFD543`
  - Backgrounds: Deep Dark `#0f1117`, Card Surface `#1a1d26`, Border `#2d3240`
  - Text: Primary `#f0f3f6`, Muted `#8b949e`
- **Karaoke Lyrics Styling**:
  - Regular line: High legibility font, clean line-height (1.6), color `#8b949e`.
  - Active line: Highlighted with `#FF4081` (or `#00E5FF`), slightly enlarged font-weight (semi-bold), subtle background tint (`rgba(255, 64, 129, 0.08)`), rounded borders (4px-6px).
  - No continuous fill/fade animations: stick strictly to line-by-line discrete state highlighting.
- **UI Structure**:
  - Clean scoped CSS inside components using CSS variables.
  - Zero heavy CSS libraries or component frameworks. Responsive layouts using Flexbox and Grid.

## 3. Strict Contract Compliance

- Always import database logic ONLY from `src/lib/server/`.
- UI primitives must strictly come from `src/lib/ui/`.
- Never invent database columns or TypeScript types outside `src/lib/karaoke/types.ts`.
- If a type or API contract is missing, trigger a `CONTRACT GAP` block and halt.
