<script lang="ts">
  import Badge from '$lib/ui/Badge.svelte';
  import Button from '$lib/ui/Button.svelte';
  import Card from '$lib/ui/Card.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import { resolve } from '$app/paths';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  function formatDuration(durationMs: number): string {
    const totalSeconds = Math.round(durationMs / 1000);
    return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
  }

  let hasFilters = $derived(
    Boolean(data.filters.query || data.filters.language || data.filters.artist)
  );
</script>

<svelte:head>
  <title>Библиотека — lets-uta</title>
  <meta name="description" content="Локальная библиотека песен с караоке-режимом." />
</svelte:head>

<main class="library-page">
  <header class="library-header">
    <div>
      <p class="eyebrow">LET'S UTA / LIBRARY</p>
      <h1>Песни, которые<br /><em>остаются рядом.</em></h1>
      <p class="intro">
        Локальная полка для вокалоидов, переводов и строк, которые хочется спеть снова.
      </p>
    </div>
    <div class="header-action">
      <span>{data.songs.length} в выборке</span>
      <a class="add-link" href={resolve('/upload')}>Добавить песню</a>
    </div>
  </header>

  <section class="filter-strip" aria-labelledby="filter-heading">
    <h2 id="filter-heading">Найти в каталоге</h2>
    <form method="GET" class="filters">
      <label>
        <span>Поиск по названию</span>
        <input name="query" value={data.filters.query} placeholder="Например, Paper" />
      </label>
      <label>
        <span>Язык текста</span>
        <select name="language">
          <option value="">Все языки</option>
          <option value="ru" selected={data.filters.language === 'ru'}>Русский</option>
          <option value="ja" selected={data.filters.language === 'ja'}>日本語</option>
          <option value="en" selected={data.filters.language === 'en'}>English</option>
        </select>
      </label>
      <label>
        <span>Исполнитель</span>
        <select name="artist">
          <option value="">Все исполнители</option>
          {#each data.artists as artist (artist)}
            <option value={artist} selected={data.filters.artist === artist}>{artist}</option>
          {/each}
        </select>
      </label>
      <Button type="submit" variant="secondary">Применить</Button>
    </form>
  </section>

  {#if data.songs.length === 0}
    <EmptyState
      title={hasFilters ? 'Ничего не найдено' : 'Библиотека пока пуста'}
      description={hasFilters
        ? 'Попробуйте снять один из фильтров или изменить запрос.'
        : 'Добавьте первую песню, чтобы собрать свою локальную сцену.'}
    >
      {#snippet action()}
        <a class="empty-action" href={resolve(hasFilters ? '/' : '/upload')}
          >{hasFilters ? 'Сбросить фильтры' : 'Перейти к загрузке'}</a
        >
      {/snippet}
    </EmptyState>
  {:else}
    <section class="song-grid" aria-label="Песни библиотеки">
      {#each data.songs as song (song.id)}
        <Card href={`/songs/${song.id}`}>
          <div class="song-card-top">
            <span>{song.mediaKind === 'video' ? 'VIDEO' : 'AUDIO'}</span><span
              >{formatDuration(song.durationMs)}</span
            >
          </div>
          <h2>{song.title}</h2>
          {#if song.meaning}<p class="meaning">{song.meaning}</p>{/if}
          <div class="badges">
            {#each song.artists as artist (artist)}<Badge variant="artist">{artist}</Badge>{/each}
            {#each song.composers as composer (composer)}<Badge variant="composer">{composer}</Badge
              >{/each}
          </div>
        </Card>
      {/each}
    </section>
  {/if}
</main>

<style>
  .library-page {
    max-width: 88rem;
    margin: 0 auto;
    padding: 1.5rem clamp(1rem, 4vw, 4rem) 5rem;
  }
  .library-header {
    display: flex;
    justify-content: space-between;
    gap: 2rem;
    align-items: end;
    padding: 2rem 0 4rem;
  }
  .eyebrow {
    margin: 0 0 1.5rem;
    color: #a9003d;
    font:
      700 0.72rem/1 'Courier New',
      monospace;
    letter-spacing: 0.14em;
  }
  h1 {
    max-width: 12ch;
    margin: 0;
    font:
      800 clamp(3.2rem, 8vw, 7rem)/0.88 Georgia,
      serif;
    letter-spacing: -0.075em;
  }
  h1 em {
    color: #a9003d;
    font-weight: 400;
  }
  .intro {
    max-width: 34rem;
    margin: 2rem 0 0;
    line-height: 1.6;
  }
  .header-action {
    display: grid;
    justify-items: end;
    gap: 0.75rem;
    font:
      700 0.75rem/1 'Courier New',
      monospace;
  }
  .header-action a {
    color: inherit;
    text-decoration: none;
  }
  .add-link {
    display: inline-block;
    padding: 0.7rem 1rem;
    background: #00e5ff;
    color: #1f2024 !important;
    font-weight: 700;
  }
  .filter-strip {
    display: grid;
    grid-template-columns: 14rem 1fr;
    gap: 2rem;
    padding: 1.25rem 0;
    border-top: 1px solid #1f2024;
    border-bottom: 1px solid #1f2024;
  }
  .filter-strip h2 {
    margin: 0;
    font:
      700 1.15rem/1 Georgia,
      serif;
  }
  .filters {
    display: grid;
    grid-template-columns: 1.4fr 1fr 1fr auto;
    gap: 0.75rem;
    align-items: end;
  }
  label {
    display: grid;
    gap: 0.35rem;
  }
  label span {
    color: #64636a;
    font:
      700 0.7rem/1 'Courier New',
      monospace;
    text-transform: uppercase;
  }
  input,
  select {
    box-sizing: border-box;
    width: 100%;
    min-height: 2.75rem;
    padding: 0.6rem 0.7rem;
    border: 1px solid #64636a;
    background: #fffdf7;
    color: #1f2024;
  }
  .song-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
    padding-top: 2rem;
  }
  .song-card-top {
    display: flex;
    justify-content: space-between;
    color: #64636a;
    font:
      700 0.7rem/1 'Courier New',
      monospace;
    letter-spacing: 0.1em;
  }
  .song-grid h2 {
    margin: 2.5rem 0 0.75rem;
    font:
      700 clamp(1.5rem, 3vw, 2.35rem)/0.98 Georgia,
      serif;
  }
  .meaning {
    margin: 0 0 1.2rem;
    color: #64636a;
    line-height: 1.5;
  }
  .badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .empty-action {
    display: inline-block;
    padding: 0.7rem 1rem;
    background: #00e5ff;
    color: #1f2024;
    font-weight: 700;
    text-decoration: none;
  }
  @media (max-width: 850px) {
    .song-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .filter-strip {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
    .filters {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 600px) {
    .library-header {
      display: block;
      padding-bottom: 2.5rem;
    }
    .header-action {
      justify-items: start;
      margin-top: 2rem;
    }
    .filters,
    .song-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
