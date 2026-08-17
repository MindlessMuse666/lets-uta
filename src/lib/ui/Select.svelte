<script lang="ts">
  type Option = { value: string; label: string };
  type Props = {
    label: string;
    name: string;
    options: Option[];
    value?: string;
    error?: string;
    required?: boolean;
  };
  let { label, name, options, value = '', error, required = false }: Props = $props();
</script>

<label class="field">
  <span>{label}</span>
  <select {name} {value} {required} aria-invalid={error ? 'true' : undefined}>
    {#each options as option (option.value)}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
  {#if error}<small class="error" id={`${name}-error`}>{error}</small>{/if}
</label>

<style>
  .field {
    display: grid;
    gap: 0.45rem;
  }
  .field > span {
    font-weight: 700;
  }
  select {
    min-height: 2.75rem;
    padding: 0.65rem 0.7rem;
    border: 1px solid #64636a;
    background: #fffdf7;
    color: #1f2024;
  }
  .error {
    color: #a9003d;
    font-weight: 700;
  }
</style>
