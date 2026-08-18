<script lang="ts">
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

{@render children()}
