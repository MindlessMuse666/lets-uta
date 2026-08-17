<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = {
    children: Snippet;
    type?: 'button' | 'submit' | 'reset';
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    disabled?: boolean;
    loading?: boolean;
  };

  let {
    children,
    type = 'button',
    variant = 'primary',
    disabled = false,
    loading = false
  }: Props = $props();
</script>

<button class={`button button-${variant}`} {type} {disabled} aria-busy={loading || undefined}>
  {#if loading}Подождите…{:else}{@render children()}{/if}
</button>

<style>
  .button {
    min-height: 2.75rem;
    padding: 0.7rem 1rem;
    border: 1px solid #1f2024;
    border-radius: 0;
    cursor: pointer;
    font-weight: 700;
  }

  .button-primary {
    background: #00e5ff;
    color: #1f2024;
  }
  .button-secondary {
    background: #f8f4eb;
    color: #1f2024;
  }
  .button-danger {
    background: #ff4081;
    color: #1f2024;
  }
  .button-ghost {
    border-color: transparent;
    background: transparent;
    color: inherit;
  }
  .button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
</style>
