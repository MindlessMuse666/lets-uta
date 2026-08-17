<script lang="ts">
  import Badge from '$lib/ui/Badge.svelte';
  import { resolve } from '$app/paths';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let primaryLyric = $derived(data.song.lyrics.find((lyric) => lyric.isPrimary));
</script>

<svelte:head><title>{data.song.title} — lets-uta</title></svelte:head>

<main class="song-page">
  <a class="back-link" href={resolve('/')}>← библиотека</a>
  <header class="song-header">
    <p class="eyebrow">{data.song.mediaKind} · {Math.round(data.song.durationMs / 1000)} сек</p>
    <h1>{data.song.title}</h1>
    {#if data.song.meaning}<p class="meaning">{data.song.meaning}</p>{/if}
    <div class="badges">
      {#each data.song.artists as artist (artist)}<Badge variant="artist">{artist}</Badge>{/each}
      {#each data.song.composers as composer (composer)}<Badge variant="composer">{composer}</Badge
        >{/each}
    </div>
  </header>

  <section class="song-content" aria-labelledby="lyrics-heading">
    <div>
      <p class="eyebrow">primary lyric / {primaryLyric?.language ?? '—'}</p>
      <h2 id="lyrics-heading">Текст песни</h2>
    </div>
    {#if primaryLyric}
      <pre>{primaryLyric.text}</pre>
    {:else}
      <p>Основной текст ещё не добавлен.</p>
    {/if}
  </section>

  {#if data.song.lyrics.length > 1}
    <section class="secondary" aria-labelledby="secondary-heading">
      <h2 id="secondary-heading">Дополнительные тексты</h2>
      {#each data.song.lyrics.filter((lyric) => !lyric.isPrimary) as lyric (lyric.id)}
        <details>
          <summary>{lyric.language}</summary>
          <pre>{lyric.text}</pre>
        </details>
      {/each}
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
  .song-content {
    display: grid;
    grid-template-columns: minmax(12rem, 0.4fr) minmax(0, 1fr);
    gap: 3rem;
    padding: 1.5rem 0;
    border-top: 1px solid #1f2024;
  }
  h2 {
    margin: 0;
    font:
      700 2rem/1 Georgia,
      serif;
  }
  pre {
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font:
      1.2rem/1.8 'Trebuchet MS',
      sans-serif;
  }
  .secondary {
    margin-top: 3rem;
    padding-top: 1.5rem;
    border-top: 1px solid rgba(31, 32, 36, 0.35);
  }
  details {
    margin-top: 1rem;
    padding: 1rem;
    background: #f8f4eb;
  }
  summary {
    cursor: pointer;
    font-weight: 700;
  }
  details pre {
    margin-top: 1rem;
  }
  @media (max-width: 650px) {
    .song-content {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
  }
</style>
