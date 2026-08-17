<script lang="ts">
  type Props = {
    label: string;
    name: string;
    value?: string;
    hint?: string;
    error?: string;
    rows?: number;
    required?: boolean;
    maxlength?: number;
  };

  let {
    label,
    name,
    value = '',
    hint,
    error,
    rows = 5,
    required = false,
    maxlength
  }: Props = $props();
  let currentValue = $derived(value);
  let counterId = $derived(`${name}-count`);
  let describedBy = $derived(
    [hint ? `${name}-hint` : '', maxlength ? counterId : '', error ? `${name}-error` : '']
      .filter(Boolean)
      .join(' ') || undefined
  );
</script>

<label class="field">
  <span>{label}</span>
  <textarea
    {name}
    {rows}
    {required}
    bind:value={currentValue}
    {maxlength}
    aria-invalid={error ? 'true' : undefined}
    aria-describedby={describedBy}
  ></textarea>
  {#if hint}<small id={`${name}-hint`}>{hint}</small>{/if}
  {#if maxlength}<small id={counterId}>{currentValue.length} / {maxlength}</small>{/if}
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
  textarea {
    box-sizing: border-box;
    width: 100%;
    padding: 0.65rem 0.7rem;
    border: 1px solid #64636a;
    background: #fffdf7;
    color: #1f2024;
    resize: vertical;
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
