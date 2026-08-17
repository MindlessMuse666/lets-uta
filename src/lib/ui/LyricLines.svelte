<script lang="ts">
  import { getActiveLineIndex, splitText } from '$lib/karaoke/lines';
  import type { Timing } from '$lib/karaoke/types';

  type Props = {
    text: string;
    timings?: Timing[];
    currentTimeMs?: number;
    label?: string;
  };

  let { text, timings = [], currentTimeMs = 0, label = 'Текст песни' }: Props = $props();
  let lines = $derived(splitText(text));
  let activeLineIndex = $derived(getActiveLineIndex(timings, currentTimeMs));
  let timingByLine = $derived(new Map(timings.map((timing) => [timing.lineIndex, timing])));

  function lineClass(index: number, line: string): string {
    return [
      'lyric-line',
      line === '' ? 'lyric-line-empty' : '',
      timingByLine.has(index) ? 'lyric-line-timed' : '',
      activeLineIndex === index ? 'lyric-line-active' : ''
    ]
      .filter(Boolean)
      .join(' ');
  }
</script>

<section class="lyrics" aria-label={label}>
  {#if lines.length === 0}
    <p class="lyrics-empty">Текст отсутствует.</p>
  {:else}
    <div class="line-list">
      {#each lines as line, index (index)}
        <p
          class={lineClass(index, line)}
          data-line-index={index}
          aria-current={activeLineIndex === index ? 'true' : undefined}
        >
          {#if line}{line}{:else}<span aria-hidden="true">&nbsp;</span>{/if}
        </p>
      {/each}
    </div>
  {/if}
</section>

<style>
  .lyrics {
    min-width: 0;
  }

  .line-list {
    display: grid;
    gap: 0.35rem;
  }

  .lyric-line {
    position: relative;
    margin: 0;
    padding: 0.42rem 0.75rem;
    color: var(--ink, #1f2024);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font:
      1.15rem/1.55 'Trebuchet MS',
      sans-serif;
    transition:
      background-color 160ms ease,
      color 160ms ease,
      transform 160ms ease;
  }

  .lyric-line-active {
    border-left: 4px solid #ff4081;
    background: color-mix(in srgb, #ff4081 14%, transparent);
    color: var(--ink, #1f2024);
    font-weight: 700;
    transform: translateX(0.35rem);
  }

  .lyric-line-active::before {
    position: absolute;
    top: 50%;
    left: -0.85rem;
    color: #ff4081;
    content: '›';
    font:
      700 1.5rem/1 Georgia,
      serif;
    transform: translateY(-50%);
  }

  .lyric-line-empty {
    min-height: 1.8rem;
  }

  .lyrics-empty {
    margin: 0;
    color: var(--muted, #64636a);
  }

  @media (prefers-reduced-motion: reduce) {
    .lyric-line {
      transition: none;
    }
  }
</style>
