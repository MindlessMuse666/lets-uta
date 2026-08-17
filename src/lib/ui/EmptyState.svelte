<script lang="ts">
  import type { Snippet } from 'svelte';
  type Props = { title: string; description: string; action?: Snippet };
  let { title, description, action }: Props = $props();
</script>

<section class="empty" aria-live="polite">
  <p class="mark">— 00</p>
  <h2>{title}</h2>
  <p>{description}</p>
  {#if action}<div>{@render action()}</div>{/if}
</section>

<style>
  .empty {
    padding: 3rem 1.5rem;
    border: 1px dashed #64636a;
    background: rgba(248, 244, 235, 0.7);
    text-align: center;
  }
  .empty h2 {
    margin: 0.5rem 0;
    font:
      700 2rem/1 Georgia,
      serif;
  }
  .empty p {
    max-width: 32rem;
    margin: 0.5rem auto 1.25rem;
    line-height: 1.55;
  }
  .mark {
    color: #a9003d;
    font:
      700 0.75rem/1 'Courier New',
      monospace;
    letter-spacing: 0.14em;
  }
</style>
