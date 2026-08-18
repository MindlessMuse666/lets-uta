<script lang="ts">
  import type { MediaKind } from '$lib/karaoke/types';

  type Props = {
    src: string;
    mediaKind: MediaKind;
    durationMs: number;
    oncurrenttimechange?: (currentTimeMs: number) => void;
    onplaystatechange?: (isPlaying: boolean) => void;
  };

  let { src, mediaKind, durationMs, oncurrenttimechange, onplaystatechange }: Props = $props();
  let mediaElement = $state<HTMLMediaElement>();
  let currentTimeMs = $state(0);
  let volume = $state(0.8);
  let isPlaying = $state(false);
  let errorMessage = $state<string | null>(null);
  let currentTimeSeconds = $derived(currentTimeMs / 1000);
  let durationSeconds = $derived(Math.max(0, durationMs / 1000));

  $effect(() => {
    if (mediaElement) mediaElement.volume = volume;
  });

  function formatTime(seconds: number): string {
    const wholeSeconds = Math.max(0, Math.floor(seconds));
    return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, '0')}`;
  }

  function updateCurrentTime(element: HTMLMediaElement): void {
    currentTimeMs = Math.round(element.currentTime * 1000);
    oncurrenttimechange?.(currentTimeMs);
  }

  function handleTimeUpdate(event: Event): void {
    updateCurrentTime(event.currentTarget as HTMLMediaElement);
  }

  function handleSeeked(event: Event): void {
    updateCurrentTime(event.currentTarget as HTMLMediaElement);
  }

  async function togglePlayback(): Promise<void> {
    if (!mediaElement) return;
    errorMessage = null;
    try {
      if (mediaElement.paused) await mediaElement.play();
      else mediaElement.pause();
    } catch {
      isPlaying = false;
      onplaystatechange?.(false);
      errorMessage = 'Медиафайл не удалось воспроизвести.';
    }
  }

  function seekTo(seconds: number): void {
    if (!mediaElement) return;
    mediaElement.currentTime = Math.min(Math.max(0, seconds), durationSeconds);
    updateCurrentTime(mediaElement);
  }

  function nudge(seconds: number): void {
    seekTo(currentTimeSeconds + seconds);
  }

  function handleSeekInput(event: Event): void {
    const value = Number((event.currentTarget as HTMLInputElement).value);
    if (Number.isFinite(value)) seekTo(value);
  }

  function handleVolumeInput(event: Event): void {
    const value = Number((event.currentTarget as HTMLInputElement).value);
    if (Number.isFinite(value)) volume = value;
  }

  function handleKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const isRange = target instanceof HTMLInputElement && target.type === 'range';
    const isTextControl =
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLInputElement && !isRange);
    if (isTextControl || target instanceof HTMLButtonElement) return;

    if (event.code === 'Space' || event.key.toLowerCase() === 'k') {
      event.preventDefault();
      void togglePlayback();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      nudge(-5);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      nudge(5);
    }
  }

  function handlePlay(): void {
    isPlaying = true;
    onplaystatechange?.(true);
    errorMessage = null;
  }

  function handlePause(): void {
    isPlaying = false;
    onplaystatechange?.(false);
  }

  function handleEnded(): void {
    isPlaying = false;
    onplaystatechange?.(false);
  }

  function handleMediaError(): void {
    isPlaying = false;
    onplaystatechange?.(false);
    errorMessage = 'Медиафайл не удалось загрузить.';
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="player" role="group" aria-label="Плеер">
  <div class="media-frame">
    {#if mediaKind === 'video'}
      <video
        bind:this={mediaElement}
        {src}
        preload="metadata"
        aria-label="Видео песни"
        ontimeupdate={handleTimeUpdate}
        onseeked={handleSeeked}
        onplay={handlePlay}
        onpause={handlePause}
        onended={handleEnded}
        onerror={handleMediaError}
        onkeydown={handleKeydown}
      >
        <track kind="captions" srclang="ru" label="Текст песни" src="data:text/vtt,WEBVTT%0A" />
      </video>
    {:else}
      <audio
        bind:this={mediaElement}
        {src}
        preload="metadata"
        aria-label="Аудио песни"
        ontimeupdate={handleTimeUpdate}
        onseeked={handleSeeked}
        onplay={handlePlay}
        onpause={handlePause}
        onended={handleEnded}
        onerror={handleMediaError}
        onkeydown={handleKeydown}
      ></audio>
      <div class="audio-mark" aria-hidden="true"><span>♪</span><span>♫</span><span>♪</span></div>
    {/if}
  </div>

  <div class="player-controls">
    <div class="transport">
      <button class="play-button" type="button" onclick={() => void togglePlayback()}>
        {isPlaying ? 'Пауза' : 'Играть'}
      </button>
      <button type="button" onclick={() => nudge(-5)} aria-label="Назад на 5 секунд">−5</button>
      <button type="button" onclick={() => nudge(5)} aria-label="Вперёд на 5 секунд">+5</button>
      <span class="time" aria-live="off">
        {formatTime(currentTimeSeconds)} / {formatTime(durationSeconds)}
      </span>
    </div>
    <label class="seek-label">
      <span class="sr-only">Позиция воспроизведения</span>
      <input
        type="range"
        min="0"
        max={durationSeconds}
        step="0.1"
        value={currentTimeSeconds}
        oninput={handleSeekInput}
        aria-valuetext={`${formatTime(currentTimeSeconds)} из ${formatTime(durationSeconds)}`}
      />
    </label>
    <label class="volume-label">
      <span>Громкость</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={volume}
        oninput={handleVolumeInput}
        aria-label="Громкость"
      />
    </label>
  </div>

  <p class="shortcut-note">Space / K — play/pause · ← / → — ±5 сек</p>
  {#if errorMessage}<p class="player-error" role="alert">{errorMessage}</p>{/if}
</div>

<style>
  .player {
    display: grid;
    gap: 1rem;
    padding: 1rem;
    border: 1px solid var(--ink, #1f2024);
    background: var(--surface-strong, #f8f4eb);
  }

  .media-frame {
    display: grid;
    min-height: 7rem;
    place-items: center;
    overflow: hidden;
    background: var(--ink, #1f2024);
  }

  video {
    display: block;
    width: 100%;
    max-height: 22rem;
    background: #111216;
  }

  audio {
    display: none;
  }

  .audio-mark {
    display: flex;
    gap: 0.2rem;
    align-items: end;
    color: #00e5ff;
    font:
      700 3rem/1 Georgia,
      serif;
  }

  .audio-mark span:nth-child(2) {
    color: #ff4081;
    transform: translateY(-0.45rem);
  }

  .player-controls {
    display: grid;
    grid-template-columns: auto minmax(8rem, 1fr) minmax(7rem, 10rem);
    gap: 0.75rem 1rem;
    align-items: center;
  }

  .transport {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    flex-wrap: wrap;
  }

  button {
    min-height: 2.5rem;
    padding: 0.55rem 0.75rem;
    border: 1px solid var(--ink, #1f2024);
    border-radius: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font-weight: 700;
  }

  button:hover,
  button:focus-visible {
    background: #00e5ff;
    color: #1f2024;
  }

  .play-button {
    background: #00e5ff;
    color: #1f2024;
  }

  .time,
  .shortcut-note,
  .volume-label span {
    color: var(--muted, #64636a);
    font:
      700 0.7rem/1.3 'Courier New',
      monospace;
  }

  .seek-label,
  .volume-label {
    display: grid;
    gap: 0.35rem;
  }

  .volume-label span {
    text-transform: uppercase;
  }

  input[type='range'] {
    box-sizing: border-box;
    min-width: 0;
    width: 100%;
    accent-color: #ff4081;
    cursor: pointer;
  }

  .shortcut-note,
  .player-error {
    margin: 0;
  }

  .player-error {
    color: #a9003d;
    font-weight: 700;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @media (max-width: 650px) {
    .player-controls {
      grid-template-columns: 1fr;
    }
  }
</style>
