<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = {
    open: boolean;
    title: string;
    description?: string;
    children: Snippet;
    actions?: Snippet;
    onclose?: () => void;
  };

  let { open, title, description, children, actions, onclose }: Props = $props();
  let dialogElement = $state<HTMLDialogElement>();
  let titleId = $derived(`${title.toLowerCase().replace(/\s+/g, '-')}-title`);
  let descriptionId = $derived(description ? `${titleId}-description` : undefined);

  function focusFirstControl(): void {
    const focusable = dialogElement?.querySelector<HTMLElement>(
      'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.focus();
  }

  $effect(() => {
    if (!dialogElement) return;
    if (open && !dialogElement.open) {
      dialogElement.showModal();
      queueMicrotask(focusFirstControl);
    } else if (!open && dialogElement.open) {
      dialogElement.close();
    }
  });

  function handleCancel(event: Event): void {
    event.preventDefault();
    onclose?.();
  }

  function handleClose(): void {
    if (open) onclose?.();
  }

  function handleClick(event: MouseEvent): void {
    if (event.target === dialogElement) {
      onclose?.();
    }
  }
</script>

<dialog
  bind:this={dialogElement}
  class="dialog"
  aria-labelledby={titleId}
  aria-describedby={descriptionId}
  oncancel={handleCancel}
  onclose={handleClose}
  onclick={handleClick}
>
  <div class="dialog-panel">
    <div class="dialog-head">
      <p class="dialog-eyebrow">LET'S UTA / DIALOG</p>
      <h2 id={titleId}>{title}</h2>
      {#if description}
        <p id={descriptionId}>{description}</p>
      {/if}
    </div>
    <div class="dialog-body">
      {@render children()}
    </div>
    {#if actions}
      <div class="dialog-actions">{@render actions()}</div>
    {/if}
  </div>
</dialog>

<style>
  .dialog {
    width: min(42rem, calc(100vw - 2rem));
    padding: 0;
    border: 1px solid var(--ink, #1f2024);
    background: transparent;
    color: inherit;
  }

  .dialog::backdrop {
    background: rgba(31, 32, 36, 0.58);
  }

  .dialog-panel {
    display: grid;
    gap: 1rem;
    padding: 1.25rem;
    background: var(--surface-strong, #f8f4eb);
  }

  .dialog-head {
    display: grid;
    gap: 0.5rem;
  }

  .dialog-eyebrow {
    margin: 0;
    color: #ff4081;
    font:
      700 0.7rem/1 'Courier New',
      monospace;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  h2 {
    margin: 0;
    font:
      700 1.6rem/1.05 Georgia,
      serif;
  }

  .dialog-head p:last-child {
    margin: 0;
    line-height: 1.5;
    color: var(--muted, #64636a);
  }

  .dialog-body {
    display: grid;
    gap: 1rem;
  }

  .dialog-actions {
    display: flex;
    justify-content: end;
    gap: 0.75rem;
  }

  @media (max-width: 560px) {
    .dialog {
      width: min(100vw - 1rem, 42rem);
    }
  }
</style>
