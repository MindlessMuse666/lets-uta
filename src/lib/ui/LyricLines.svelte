<script lang="ts">
  import { getActiveLineIndex, splitText } from '$lib/karaoke/lines';
  import type { Language, Timing } from '$lib/karaoke/types';

  type Props = {
    text: string;
    timings?: Timing[];
    currentTimeMs?: number;
    label?: string;
    language?: Language;
    isPlaying?: boolean;
    autoScrollDelayMs?: number;
    scrollMode?: 'local' | 'page';
    translation?: {
      language: 'ru' | 'en';
      text: string;
    };
  };

  let {
    text,
    timings = [],
    currentTimeMs = 0,
    label = 'Текст песни',
    language = 'ja',
    isPlaying = false,
    autoScrollDelayMs = 3000,
    scrollMode = 'local',
    translation
  }: Props = $props();
  let sectionElement = $state<HTMLElement>();
  let autoScrollTimer: ReturnType<typeof setTimeout> | undefined;
  let programmaticScroll = false;
  let lines = $derived(splitText(text));
  let translationLines = $derived(translation ? splitText(translation.text) : []);
  let activeLineIndex = $derived(getActiveLineIndex(timings, currentTimeMs));
  let timingByLine = $derived(new Map(timings.map((timing) => [timing.lineIndex, timing])));
  let rootClass = $derived(
    `lyrics lyrics-${scrollMode}${translation ? '' : ` lyrics-${language}`}`
  );

  function hasTextSelection(): boolean {
    return Boolean(document.getSelection()?.toString());
  }

  function clearAutoScrollTimer(): void {
    if (autoScrollTimer) {
      clearTimeout(autoScrollTimer);
      autoScrollTimer = undefined;
    }
  }

  function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function scrollActiveLine(): void {
    if (!sectionElement || activeLineIndex < 0) return;
    const line = sectionElement.querySelector<HTMLElement>(
      `[data-line-index="${activeLineIndex}"]`
    );
    if (!line) return;

    programmaticScroll = true;
    line.scrollIntoView({
      block: 'center',
      inline: 'nearest',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth'
    });
    window.setTimeout(() => {
      programmaticScroll = false;
    }, 150);
  }

  function scheduleAutoScroll(): void {
    clearAutoScrollTimer();
    if (
      !sectionElement ||
      !isPlaying ||
      timings.length === 0 ||
      activeLineIndex < 0 ||
      hasTextSelection()
    ) {
      return;
    }
    autoScrollTimer = setTimeout(scrollActiveLine, Math.max(0, autoScrollDelayMs));
  }

  function handleManualScroll(): void {
    if (!programmaticScroll) scheduleAutoScroll();
  }

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

  $effect(() => {
    scheduleAutoScroll();
    return clearAutoScrollTimer;
  });

  $effect(() => {
    if (!sectionElement) return;
    const resetTimer = () => scheduleAutoScroll();
    const handleSelectionChange = () => {
      if (hasTextSelection()) clearAutoScrollTimer();
      else scheduleAutoScroll();
    };

    window.addEventListener('pointerdown', resetTimer, { passive: true });
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('wheel', resetTimer, { passive: true });
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      window.removeEventListener('pointerdown', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('wheel', resetTimer);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  });
</script>

<section
  bind:this={sectionElement}
  class={rootClass}
  aria-label={label}
  data-language={language}
  onscroll={handleManualScroll}
>
  {#if lines.length === 0}
    <p class="lyrics-empty">Текст отсутствует.</p>
  {:else}
    <div class="line-list">
      {#each lines as line, index (index)}
        <div class:paired-row={Boolean(translation)} class="lyric-row" data-line-index={index}>
          <span class="line-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          <div class="lyric-cell lyrics-ja">
            <p
              class={lineClass(index, line)}
              data-line-index={index}
              aria-current={activeLineIndex === index ? 'true' : undefined}
            >
              {#if line}{line}{:else}<span aria-hidden="true">&nbsp;</span>{/if}
            </p>
          </div>
          {#if translation}
            <div class={`lyric-cell lyrics-${translation.language}`}>
              <p
                class={lineClass(index, translationLines[index] ?? '')}
                data-line-index={index}
                aria-current={activeLineIndex === index ? 'true' : undefined}
              >
                {#if translationLines[index]}{translationLines[index]}{:else}<span
                    aria-hidden="true">&nbsp;</span
                  >{/if}
              </p>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  .lyrics {
    min-width: 0;
    --lyric-active: #ff4081;
    --lyric-selection: #ffd543;
    scrollbar-color: var(--lyric-active) transparent;
  }

  .lyrics-local {
    max-height: min(64vh, 38rem);
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-right: 0.35rem;
  }

  .lyrics-page {
    overflow: visible;
  }

  .lyrics-ja {
    --lyric-active: #ff4081;
    --lyric-selection: #ffd543;
  }

  .lyrics-ru {
    --lyric-active: #00e5ff;
    --lyric-selection: #ffd543;
  }

  .lyrics-en {
    --lyric-active: #ffd543;
    --lyric-selection: #ff4081;
  }

  .lyrics ::selection {
    background: var(--lyric-selection);
    color: #1f2024;
  }

  .line-list {
    display: grid;
    gap: 0.35rem;
  }

  .lyric-row {
    display: grid;
    grid-template-columns: 2.5rem minmax(0, 1fr);
    gap: 0.75rem;
    align-items: stretch;
  }

  .paired-row {
    grid-template-columns: 2.5rem repeat(2, minmax(0, 1fr));
  }

  .line-number {
    padding-top: 0.8rem;
    color: var(--muted, #64636a);
    font:
      700 0.7rem/1 'Courier New',
      monospace;
    text-align: right;
  }

  .lyric-cell {
    min-width: 0;
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
    border-left: 4px solid var(--lyric-active);
    background: color-mix(in srgb, var(--lyric-active) 14%, transparent);
    color: var(--ink, #1f2024);
    font-weight: 700;
    transform: translateX(0.35rem);
  }

  .lyric-line-active::before {
    position: absolute;
    top: 50%;
    left: -0.85rem;
    color: var(--lyric-active);
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

  @media (max-width: 700px) {
    .paired-row {
      grid-template-columns: 2rem minmax(0, 1fr);
    }

    .paired-row .lyrics-ru,
    .paired-row .lyrics-en {
      grid-column: 2;
    }

    .paired-row .line-number {
      grid-row: 1 / span 2;
    }
  }
</style>
