<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = { children: Snippet; variant?: 'artist' | 'composer' | 'language' | 'neutral' };
  let { children, variant = 'neutral' }: Props = $props();
</script>

<span class={`badge badge-${variant}`}>{@render children()}</span>

<style>
  .badge {
    display: inline-block;
    padding: 0.25rem 0.45rem;
    border: 1px solid currentColor;
    font:
      700 0.72rem/1 'Courier New',
      monospace;
  }
  .badge-artist {
    color: #a9003d;
  }
  .badge-composer {
    color: #14636d;
  }
  .badge-language,
  .badge-neutral {
    color: #64636a;
  }
</style>
