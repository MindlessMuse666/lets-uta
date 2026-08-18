<script lang="ts">
  type Props = { value: number; label: string };
  let { value, label }: Props = $props();
  let safeValue = $derived(Math.max(0, Math.min(100, Math.trunc(value))));
</script>

<div
  class="progress-wrap"
  aria-label={label}
  role="progressbar"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-valuenow={safeValue}
>
  <div class="progress-track"><span style={`width: ${safeValue}%`}></span></div>
  <span class="progress-value">{safeValue}%</span>
</div>

<style>
  .progress-wrap {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.75rem;
    align-items: center;
  }
  .progress-track {
    height: 0.55rem;
    border: 1px solid #1f2024;
    background: #fffdf7;
  }
  .progress-track span {
    display: block;
    height: 100%;
    background: #00e5ff;
    transition: width 160ms ease;
  }
  .progress-value {
    font:
      700 0.7rem/1 'Courier New',
      monospace;
  }
  @media (prefers-reduced-motion: reduce) {
    .progress-track span {
      transition: none;
    }
  }
</style>
