<script lang="ts">
  type Props = {
    label: string;
    name: string;
    value?: string;
    type?: string;
    hint?: string;
    error?: string;
    required?: boolean;
  };

  let { label, name, value = '', type = 'text', hint, error, required = false }: Props = $props();
</script>

<label class="field">
  <span>{label}</span>
  <input
    {name}
    {type}
    {value}
    {required}
    aria-invalid={error ? 'true' : undefined}
    aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
  />
  {#if hint}<small id={`${name}-hint`}>{hint}</small>{/if}
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
  input {
    box-sizing: border-box;
    width: 100%;
    min-height: 2.75rem;
    padding: 0.65rem 0.7rem;
    border: 1px solid #64636a;
    background: #fffdf7;
    color: #1f2024;
  }
  small {
    color: #64636a;
    line-height: 1.4;
  }
  .error {
    color: #a9003d;
    font-weight: 700;
  }
</style>
