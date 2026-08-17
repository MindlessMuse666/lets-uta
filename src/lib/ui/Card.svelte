<script lang="ts">
  import { resolve as rawResolve } from '$app/paths';
  import type { Snippet } from 'svelte';

  type Props = { children: Snippet; href?: string };
  let { children, href }: Props = $props();
  const resolve = rawResolve as unknown as (path: string) => string;
</script>

{#if href}
  <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
  <a class="card" href={resolve(href as Parameters<typeof resolve>[0])}>{@render children()}</a>
{:else}
  <article class="card">{@render children()}</article>
{/if}

<style>
  .card {
    display: block;
    padding: 1.25rem;
    border: 1px solid rgba(31, 32, 36, 0.35);
    border-top: 4px solid #00e5ff;
    background: #f8f4eb;
    color: inherit;
    text-decoration: none;
  }
  a.card:hover {
    border-top-color: #ff4081;
  }
</style>
