<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { resolve } from '$app/paths';
  import Badge from '$lib/ui/Badge.svelte';
  import Dialog from '$lib/ui/Dialog.svelte';
  import LyricLines from '$lib/ui/LyricLines.svelte';
  import MediaPlayer from '$lib/ui/MediaPlayer.svelte';
  import ProgressBar from '$lib/ui/ProgressBar.svelte';
  import Select from '$lib/ui/Select.svelte';
  import TextArea from '$lib/ui/TextArea.svelte';
  import type { ActionData, PageData } from './$types';
  import type { SyncJob } from '$lib/karaoke/types';

  type TranslationErrors = {
    form?: string;
    language?: string;
    text?: string;
  };

  function readFormString(record: unknown, key: string): string | undefined {
    if (!record || typeof record !== 'object' || !(key in record)) return undefined;
    const value = (record as Record<string, unknown>)[key];
    return typeof value === 'string' ? value : undefined;
  }

  let { data, form }: { data: PageData; form?: ActionData } = $props();
  let syncJob = $state<SyncJob | undefined>();
  let syncError = $state('');
  let syncStarting = $state(false);
  let syncTimer: ReturnType<typeof globalThis.setInterval> | undefined;
  let primaryLyric = $derived(data.song.lyrics.find((lyric) => lyric.isPrimary));
  let primaryTimings = $derived(
    primaryLyric ? data.song.timings.filter((timing) => timing.lyricId === primaryLyric.id) : []
  );
  let translationLyric = $derived(data.song.lyrics.find((lyric) => !lyric.isPrimary));
  let currentTimeMs = $state(0);
  let isPlaying = $state(false);
  let translationDialogOpen = $state(false);
  let controlsReady = $state(false);
  let lyricScrollMode = $derived(
    data.song.mediaKind === 'video' ? ('page' as const) : ('local' as const)
  );
  let translationForm = $derived(form);
  let translationErrors: TranslationErrors = $derived({
    form: readFormString(translationForm?.fieldErrors, 'form'),
    language: readFormString(translationForm?.fieldErrors, 'language'),
    text: readFormString(translationForm?.fieldErrors, 'text')
  });
  let translationValues = $derived({
    language: readFormString(translationForm?.values, 'language') ?? '',
    text: readFormString(translationForm?.values, 'text') ?? ''
  });

  let syncBusy = $derived(syncJob?.status === 'queued' || syncJob?.status === 'running');
  let syncStatusLabel = $derived(
    syncJob?.status === 'queued'
      ? 'В очереди'
      : syncJob?.status === 'running'
        ? 'Выполняется'
        : syncJob?.status === 'succeeded'
          ? 'Готово'
          : syncJob?.status === 'cancelled'
            ? 'Отменено'
            : syncJob?.status === 'failed'
              ? 'Ошибка'
              : ''
  );

  $effect(() => {
    if (!syncJob && data.syncJob) syncJob = data.syncJob;
    controlsReady = true;
    if (translationForm?.fieldErrors) translationDialogOpen = true;
    if (translationForm?.ok) translationDialogOpen = false;
  });

  $effect(() => {
    if (!syncJob || !syncBusy) return;
    const pollJob = async () => {
      const response = await globalThis.fetch(
        resolve(`/songs/${data.song.id}/sync/${syncJob?.id}`)
      );
      if (!response.ok) return;
      syncJob = (await response.json()) as SyncJob;
      if (syncJob.status === 'succeeded') await invalidateAll();
    };
    syncTimer = globalThis.setInterval(() => void pollJob(), 500);
    return () => {
      if (syncTimer) globalThis.clearInterval(syncTimer);
      syncTimer = undefined;
    };
  });

  function handleCurrentTimeChange(value: number): void {
    currentTimeMs = value;
  }

  function handlePlayStateChange(value: boolean): void {
    isPlaying = value;
  }

  async function startSync(): Promise<void> {
    syncStarting = true;
    syncError = '';
    try {
      const response = await globalThis.fetch(resolve(`/songs/${data.song.id}/sync`), {
        method: 'POST'
      });
      const payload = (await response.json()) as { jobId?: string; message?: string };
      if (!response.ok || !payload.jobId) {
        syncError = payload.message ?? 'Синхронизацию не удалось запустить.';
        return;
      }
      const now = new Date().toISOString();
      syncJob = {
        id: payload.jobId,
        songId: data.song.id,
        status: 'queued',
        progress: 0,
        processedLines: 0,
        totalLines: primaryLyric ? primaryLyric.text.split(/\r\n?|\n/).filter(Boolean).length : 0,
        message: null,
        createdAt: now,
        startedAt: null,
        finishedAt: null,
        cancelRequested: false
      };
    } catch {
      syncError = 'Синхронизацию не удалось запустить. Проверьте соединение с локальным сервером.';
    } finally {
      syncStarting = false;
    }
  }

  async function cancelSync(): Promise<void> {
    if (!syncJob) return;
    const response = await globalThis.fetch(
      resolve(`/songs/${data.song.id}/sync/${syncJob.id}/cancel`),
      {
        method: 'POST'
      }
    );
    if (response.ok) syncJob = (await response.json()) as SyncJob;
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

  <section class="performance-section" aria-label="Воспроизведение и синхронизация">
    <div class="section-heading">
      <p class="eyebrow">СЦЕНА / ПОСЛЕДОВАТЕЛЬНОСТЬ</p>
      <h2>Плеер</h2>
    </div>
    <div class="performance-flow">
      <div class="player-panel" aria-labelledby="player-heading">
        <h3 id="player-heading">Слушать и смотреть</h3>
        <MediaPlayer
          src={resolve(`/songs/${data.song.id}/media`)}
          mediaKind={data.song.mediaKind}
          durationMs={data.song.durationMs}
          oncurrenttimechange={handleCurrentTimeChange}
          onplaystatechange={handlePlayStateChange}
        />
      </div>
      <div class="sync-panel" aria-labelledby="sync-heading">
        <div class="sync-copy">
          <p class="eyebrow">LOCAL PIPELINE</p>
          <h3 id="sync-heading">Автоматическая синхронизация</h3>
          <p>
            Следующий шаг после прослушивания: локальный элайнер подготовит построчные тайминги, не
            меняя старый результат до успеха.
          </p>
        </div>
        <div class="sync-actions">
          <button
            class="sync-button"
            type="button"
            onclick={startSync}
            disabled={syncBusy || syncStarting || !primaryLyric}
          >
            {syncStarting ? 'Запуск…' : syncBusy ? syncStatusLabel : 'Синхронизировать'}
          </button>
          {#if syncBusy}
            <button class="sync-cancel" type="button" onclick={cancelSync}>Отменить</button>
          {/if}
        </div>
        {#if syncJob}
          <div class="sync-status" aria-live="polite">
            <strong>{syncStatusLabel}</strong>
            <ProgressBar value={syncJob.progress} label="Прогресс синхронизации" />
            {#if syncJob.status === 'running' || syncJob.status === 'queued'}
              <span>{syncJob.processedLines} из {syncJob.totalLines} строк</span>
            {:else if syncJob.message}
              <span>{syncJob.message}</span>
            {/if}
          </div>
        {/if}
        {#if syncError}<p class="sync-error" role="alert">{syncError}</p>{/if}
      </div>
    </div>
  </section>

  <section class="song-content" aria-labelledby="lyrics-heading">
    <div class="section-heading">
      <p class="eyebrow">основной текст / ja</p>
      <h2 id="lyrics-heading">Караоке</h2>
      {#if primaryTimings.length === 0}
        <p class="timings-note">Тайминги пока не добавлены — текст доступен для чтения.</p>
      {/if}
    </div>
    {#if primaryLyric}
      <div class={`lyrics-head ${translationLyric ? 'has-translation' : ''}`}>
        <div class="lyrics-heading-column">
          <p class="column-mark">ja / primary</p>
          <h3 id="primary-lyrics-heading">日本語</h3>
        </div>
        {#if translationLyric}
          <div class={`lyrics-heading-column translation-${translationLyric.language}`}>
            <p class="column-mark">{translationLyric.language} / translation</p>
            <h3 id="translation-lyrics-heading">
              {translationLyric.language === 'ru' ? 'Русский' : 'English'}
            </h3>
          </div>
        {:else}
          <aside class="translation-panel" aria-labelledby="translation-panel-heading">
            <div>
              <p class="column-mark">translation / optional</p>
              <h3 id="translation-panel-heading">Перевод</h3>
            </div>
            <p>Добавь русский или английский текст с тем же количеством строк.</p>
            <button
              class="translation-open"
              type="button"
              disabled={!controlsReady}
              onclick={() => (translationDialogOpen = true)}
            >
              Добавить перевод
            </button>
          </aside>
        {/if}
      </div>
      <LyricLines
        text={primaryLyric.text}
        timings={primaryTimings}
        {currentTimeMs}
        language="ja"
        label="Японский текст и перевод"
        {isPlaying}
        autoScrollDelayMs={data.settings.autoScrollDelayMs}
        scrollMode={lyricScrollMode}
        translation={translationLyric
          ? { language: translationLyric.language as 'ru' | 'en', text: translationLyric.text }
          : undefined}
      />
    {:else}
      <p class="lyrics-missing">Основной текст ещё не добавлен.</p>
    {/if}
  </section>

  <Dialog
    open={translationDialogOpen}
    title="Добавить перевод"
    description="Перевод использует те же строки и тайминги, что японский текст."
    onclose={() => (translationDialogOpen = false)}
  >
    <form method="POST" action="?/addTranslation" use:enhance class="translation-form">
      {#if translationErrors.form}
        <p class="form-error" role="alert">{translationErrors.form}</p>
      {/if}
      <Select
        label="Язык"
        name="language"
        value={translationValues.language}
        error={translationErrors.language}
        required
        options={[
          { value: '', label: 'Выбрать язык' },
          { value: 'ru', label: 'Русский' },
          { value: 'en', label: 'English' }
        ]}
      />
      <TextArea
        label="Текст перевода"
        name="text"
        value={translationValues.text}
        rows={10}
        maxlength={8191}
        error={translationErrors.text}
        hint="Количество строк должно совпадать с японским текстом."
        required
      />
      <div class="dialog-actions">
        <button
          class="button-secondary"
          type="button"
          onclick={() => (translationDialogOpen = false)}
        >
          Отмена
        </button>
        <button class="button-primary" type="submit">Сохранить перевод</button>
      </div>
    </form>
  </Dialog>
</main>

<style>
  .song-page {
    max-width: 86rem;
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
      800 5.5rem/0.9 Georgia,
      serif;
    letter-spacing: 0;
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

  .performance-section,
  .song-content {
    display: block;
    padding: 1.5rem 0;
    border-top: 1px solid #1f2024;
  }

  .performance-flow {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(18rem, 0.65fr);
    gap: 1rem;
    margin-top: 1.25rem;
  }

  .player-panel,
  .sync-panel {
    min-width: 0;
    padding: 1rem;
    border: 1px solid rgba(31, 32, 36, 0.3);
    background: var(--surface-strong, #f8f4eb);
  }

  .player-panel > h3 {
    margin: 0 0 0.8rem;
    font-size: 1rem;
  }

  .player-panel :global(.player) {
    padding: 0;
    border: 0;
    background: transparent;
  }

  .sync-panel {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 1rem 2rem;
    align-items: end;
  }
  .sync-copy h3 {
    margin: 0;
    font:
      700 1.25rem/1 Georgia,
      serif;
  }
  .sync-copy p:last-child {
    max-width: 40rem;
    margin: 0.5rem 0 0;
    color: #64636a;
    line-height: 1.45;
  }
  .sync-copy .eyebrow {
    margin-bottom: 0.5rem;
  }
  .sync-actions {
    display: flex;
    gap: 0.65rem;
    flex-wrap: wrap;
    justify-content: end;
  }
  .sync-button,
  .sync-cancel {
    min-height: 2.75rem;
    padding: 0.7rem 1rem;
    border: 1px solid #1f2024;
    border-radius: 0;
    cursor: pointer;
    font-weight: 700;
  }
  .sync-button {
    background: #ffd543;
    color: #1f2024;
  }
  .sync-cancel {
    background: #f8f4eb;
    color: #1f2024;
  }
  .sync-button:disabled {
    cursor: wait;
    opacity: 0.6;
  }
  .sync-status {
    grid-column: 1 / -1;
    display: grid;
    gap: 0.5rem;
  }
  .sync-status > span {
    color: #64636a;
    font:
      0.78rem/1.3 'Courier New',
      monospace;
  }
  .sync-error {
    grid-column: 1 / -1;
    margin: 0;
    padding: 0.75rem;
    border-left: 4px solid #ff4081;
    background: #fff0f5;
    color: #a9003d;
    font-weight: 700;
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

  .lyrics-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 1rem;
    margin: 1.5rem 0 0.8rem;
  }

  .lyrics-heading-column,
  .translation-panel {
    display: grid;
    min-width: 0;
    gap: 1rem;
    align-content: start;
    padding-top: 0.85rem;
    border-top: 4px solid #ff4081;
  }

  .lyrics-heading-column.translation-ru {
    border-top-color: #00e5ff;
  }

  .lyrics-heading-column.translation-en {
    border-top-color: #ffd543;
  }

  .translation-panel {
    border-top-color: #00e5ff;
  }

  .column-mark {
    margin: 0;
    color: #64636a;
    font:
      700 0.72rem/1 'Courier New',
      monospace;
    text-transform: uppercase;
  }

  h3 {
    margin: 0;
    color: #1f2024;
    font:
      700 1.25rem/1 Georgia,
      serif;
  }

  .translation-panel p:not(.column-mark) {
    margin: 0;
    color: #64636a;
    line-height: 1.5;
  }

  .translation-open,
  .button-primary,
  .button-secondary {
    min-height: 2.75rem;
    padding: 0.7rem 1rem;
    border: 1px solid #1f2024;
    border-radius: 0;
    cursor: pointer;
    font-weight: 700;
  }

  .translation-open:disabled {
    cursor: wait;
    opacity: 0.62;
  }

  .translation-open,
  .button-primary {
    background: #00e5ff;
    color: #1f2024;
  }

  .button-secondary {
    background: #f8f4eb;
    color: #1f2024;
  }

  .translation-open:hover,
  .translation-open:focus-visible,
  .button-primary:hover,
  .button-primary:focus-visible,
  .button-secondary:hover,
  .button-secondary:focus-visible {
    transform: translateY(-1px);
  }

  .translation-form {
    display: grid;
    gap: 1rem;
  }

  .dialog-actions {
    display: flex;
    justify-content: end;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .form-error {
    margin: 0;
    padding: 0.8rem 0.9rem;
    border-left: 4px solid #ff4081;
    background: #fff0f5;
    color: #a9003d;
    font-weight: 700;
  }

  @media (prefers-reduced-motion: reduce) {
    .translation-open:hover,
    .translation-open:focus-visible,
    .button-primary:hover,
    .button-primary:focus-visible,
    .button-secondary:hover,
    .button-secondary:focus-visible {
      transform: none;
    }
  }

  @media (max-width: 820px) {
    h1 {
      font-size: 3.7rem;
    }

    .performance-flow,
    .sync-panel {
      grid-template-columns: 1fr;
    }
    .sync-actions {
      justify-content: start;
    }
  }

  @media (max-width: 650px) {
    .song-header {
      padding: 3.5rem 0 3rem;
    }

    h1 {
      font-size: 3rem;
    }

    .lyrics-head {
      grid-template-columns: 1fr;
    }

    .translation-panel {
      grid-template-columns: 1fr;
    }
  }
</style>
