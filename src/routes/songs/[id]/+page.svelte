<script lang="ts">
  import Badge from '$lib/ui/Badge.svelte';
  import LyricLines from '$lib/ui/LyricLines.svelte';
  import MediaPlayer from '$lib/ui/MediaPlayer.svelte';
  import { resolve } from '$app/paths';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let primaryLyric = $derived(data.song.lyrics.find((lyric) => lyric.isPrimary));
  let primaryTimings = $derived(
    primaryLyric ? data.song.timings.filter((timing) => timing.lyricId === primaryLyric.id) : []
  );
  let secondaryLyrics = $derived(data.song.lyrics.filter((lyric) => !lyric.isPrimary));
  let selectedSecondaryId = $state<number | null>(null);
  let selectedSecondary = $derived(
    secondaryLyrics.find((lyric) => lyric.id === selectedSecondaryId)
  );
  let currentTimeMs = $state(0);

  function selectSecondary(event: Event): void {
    const value = Number((event.currentTarget as HTMLSelectElement).value);
    selectedSecondaryId = Number.isInteger(value) ? value : null;
  }

  function handleCurrentTimeChange(value: number): void {
    currentTimeMs = value;
  }
</script>

<svelte:head><title>{data.song.title} — lets-uta</title></svelte:head>

<main class="song-page">
  <a class="back-link" href={resolve('/')}>← библиотека</a>
  <header class="song-header">
    <p class="eyebrow">
      {data.song.mediaKind === 'video' ? 'видео' : 'аудио'} · {Math.round(
        data.song.durationMs / 1000
      )} сек
    </p>
    <h1>{data.song.title}</h1>
    {#if data.song.meaning}<p class="meaning">{data.song.meaning}</p>{/if}
    <div class="badges">
      {#each data.song.artists as artist (artist)}<Badge variant="artist">{artist}</Badge>{/each}
      {#each data.song.composers as composer (composer)}<Badge variant="composer">{composer}</Badge
        >{/each}
    </div>
  </header>

  <section class="player-section" aria-labelledby="player-heading">
    <div class="section-heading">
      <p class="eyebrow">СЦЕНА / ВОСПРОИЗВЕДЕНИЕ</p>
      <h2 id="player-heading">Плеер</h2>
    </div>
    <MediaPlayer
      src={resolve(`/songs/${data.song.id}/media`)}
      mediaKind={data.song.mediaKind}
      durationMs={data.song.durationMs}
      oncurrenttimechange={handleCurrentTimeChange}
    />
  </section>

  <section class="song-content" aria-labelledby="lyrics-heading">
    <div>
      <p class="eyebrow">основной текст / {primaryLyric?.language ?? '—'}</p>
      <h2 id="lyrics-heading">Текст песни</h2>
    </div>
    {#if primaryLyric}
      <div>
        <LyricLines text={primaryLyric.text} timings={primaryTimings} {currentTimeMs} />
        {#if primaryTimings.length === 0}
          <p class="timings-note">Тайминги пока не добавлены — текст доступен для чтения.</p>
        {/if}
      </div>
    {:else}
      <p class="lyrics-missing">Основной текст ещё не добавлен.</p>
    {/if}
  </section>

  {#if secondaryLyrics.length > 0}
    <section class="secondary" aria-labelledby="secondary-heading">
      <h2 id="secondary-heading">Дополнительный текст</h2>
      <label class="secondary-picker">
        <span>Выбрать язык</span>
        <select value={selectedSecondaryId ?? ''} onchange={selectSecondary}>
          <option value="">Не показывать</option>
          {#each secondaryLyrics as lyric (lyric.id)}
            <option value={lyric.id}>{lyric.language}</option>
          {/each}
        </select>
      </label>
      {#if selectedSecondary}
        <LyricLines text={selectedSecondary.text} label="Дополнительный текст" />
      {/if}
    </section>
  {/if}
</main>

<style>
  .song-page {
    max-width: 76rem;
    margin: 0 auto;
    padding: 2rem clamp(1rem, 5vw, 5rem) 5rem;
  }
  .back-link {
    color: #a9003d;
    font-weight: 700;
  }
  .song-header {
    max-width: 58rem;
    padding: 5rem 0 4rem;
  }
  .eyebrow {
    margin: 0 0 1rem;
    color: #a9003d;
    font:
      700 0.72rem/1 'Courier New',
      monospace;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  h1 {
    margin: 0;
    font:
      800 clamp(3rem, 9vw, 8rem)/0.85 Georgia,
      serif;
    letter-spacing: -0.08em;
    overflow-wrap: anywhere;
  }
  .meaning {
    max-width: 40rem;
    margin: 2rem 0 1.25rem;
    line-height: 1.6;
  }
  .badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .player-section,
  .song-content {
    display: grid;
    grid-template-columns: minmax(12rem, 0.4fr) minmax(0, 1fr);
    gap: 3rem;
    padding: 1.5rem 0;
    border-top: 1px solid #1f2024;
  }
  .section-heading {
    align-self: start;
  }
  h2 {
    margin: 0;
    overflow-wrap: anywhere;
    font:
      700 2rem/1 Georgia,
      serif;
  }
  .timings-note,
  .lyrics-missing {
    margin: 1rem 0 0;
    color: #64636a;
    line-height: 1.5;
  }
  .secondary {
    margin-top: 3rem;
    padding-top: 1.5rem;
    border-top: 1px solid rgba(31, 32, 36, 0.35);
  }
  .secondary-picker {
    display: grid;
    max-width: 18rem;
    gap: 0.35rem;
    margin: 1rem 0 1.5rem;
    color: #64636a;
    font:
      700 0.72rem/1 'Courier New',
      monospace;
    text-transform: uppercase;
  }
  .secondary-picker select {
    min-height: 2.75rem;
    padding: 0.6rem 0.7rem;
    border: 1px solid #64636a;
    background: #fffdf7;
    color: #1f2024;
    font:
      1rem/1.2 'Trebuchet MS',
      sans-serif;
  }
  @media (max-width: 650px) {
    .player-section,
    .song-content {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
  }
</style>
