<script lang="ts">
  import { resolve } from '$app/paths';
  import '../app.css';

  let { children }: { children: import('svelte').Snippet } = $props();
  const selectionColors = ['#00E5FF', '#FF4081', '#FFD543'];
  let selectionIndex = 0;
  let selectionActive = false;

  $effect(() => {
    document.documentElement.style.setProperty('--selection-bg', selectionColors[0]);
    const handleSelectionChange = () => {
      const hasSelection = Boolean(document.getSelection()?.toString());
      if (!hasSelection) {
        selectionActive = false;
        return;
      }
      if (selectionActive) return;
      document.documentElement.style.setProperty('--selection-bg', selectionColors[selectionIndex]);
      selectionIndex = (selectionIndex + 1) % selectionColors.length;
      selectionActive = true;
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  });
</script>

<header class="site-header">
  <a href={resolve('/')} aria-label="Lets Uta — библиотека">
    <img src="/logo_lets_uta_v1.png" alt="Lets Uta" />
  </a>
</header>

{@render children()}

<style>
  .site-header {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    min-height: 4.5rem;
    padding: 0.85rem clamp(1rem, 4vw, 4rem);
    border-bottom: 1px solid rgba(31, 32, 36, 0.28);
    background: var(--paper, #eee9df);
  }

  .site-header a {
    display: inline-flex;
    align-items: center;
    min-height: 2.75rem;
    padding: 0.25rem;
  }

  .site-header img {
    display: block;
    width: min(12rem, 48vw);
    height: auto;
    max-height: 3rem;
    object-fit: contain;
    object-position: left center;
  }
</style>
