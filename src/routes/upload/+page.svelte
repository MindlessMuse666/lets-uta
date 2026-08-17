<script lang="ts">
  import { enhance } from '$app/forms';
  import { resolve } from '$app/paths';
  import Button from '$lib/ui/Button.svelte';
  import Input from '$lib/ui/Input.svelte';
  import Select from '$lib/ui/Select.svelte';
  import TextArea from '$lib/ui/TextArea.svelte';

  type UploadValues = {
    title?: string;
    primaryLyric?: string;
    secondaryLanguage?: string;
    secondaryLyricText?: string;
    meaning?: string;
    composers?: string;
    artists?: string;
  };
  type Props = { form?: { values?: UploadValues; errors?: Record<string, string> } };
  let { form }: Props = $props();
  let values = $derived({
    title: '',
    primaryLyric: '',
    secondaryLanguage: '',
    secondaryLyricText: '',
    meaning: '',
    composers: '',
    artists: '',
    ...form?.values
  });
  let errors = $derived({ ...form?.errors });
</script>

<svelte:head>
  <title>Добавить песню — lets-uta</title>
</svelte:head>

<main class="upload-page">
  <a class="back-link" href={resolve('/')}>← библиотека</a>
  <header>
    <p class="eyebrow">новая запись · library 01</p>
    <h1>Добавить песню</h1>
    <p>Сохрани медиафайл и текст локально, чтобы вернуть их в библиотеку без облака.</p>
  </header>

  {#if errors.form}
    <p class="form-error" role="alert">{errors.form}</p>
  {/if}

  <form method="POST" action="?/create" enctype="multipart/form-data" use:enhance>
    <section class="form-section" aria-labelledby="media-heading">
      <h2 id="media-heading">Медиа</h2>
      <Input label="Название" name="title" value={values.title} error={errors.title} required />
      <label class="field">
        <span>Файл</span>
        <input
          name="file"
          type="file"
          accept="audio/mpeg,audio/ogg,video/mp4,.mp3,.ogg,.mp4"
          required
          aria-invalid={errors.file ? 'true' : undefined}
        />
        <small>MP3, OGG или MP4. Максимальный размер — 100 МБ.</small>
        {#if errors.file}<small class="error">{errors.file}</small>{/if}
      </label>
    </section>

    <section class="form-section" aria-labelledby="metadata-heading">
      <h2 id="metadata-heading">Контекст</h2>
      <Input
        label="Исполнители"
        name="artists"
        value={values.artists}
        hint="Имена через запятую"
        error={errors.artists}
      />
      <Input
        label="Композиторы"
        name="composers"
        value={values.composers}
        hint="Имена через запятую"
        error={errors.composers}
      />
      <TextArea
        label="Смысл или заметка"
        name="meaning"
        value={values.meaning}
        rows={4}
        error={errors.meaning}
      />
    </section>

    <section class="form-section" aria-labelledby="lyrics-heading">
      <h2 id="lyrics-heading">Тексты</h2>
      <TextArea
        label="Основной текст · ja"
        name="primaryLyric"
        value={values.primaryLyric}
        rows={9}
        error={errors.primaryLyric}
        hint="Переносы строк сохраняются."
        required
      />
      <Select
        label="Язык перевода"
        name="secondaryLanguage"
        value={values.secondaryLanguage ?? ''}
        error={errors.secondaryLyric}
        options={[
          { value: '', label: 'Без перевода' },
          { value: 'ru', label: 'Русский' },
          { value: 'en', label: 'English' }
        ]}
      />
      <TextArea
        label="Перевод"
        name="secondaryLyricText"
        value={values.secondaryLyricText}
        rows={5}
        error={errors.secondaryLyric}
        hint="Необязательно. Количество строк должно совпадать с японским текстом."
        maxlength={8191}
      />
    </section>

    <div class="form-actions">
      <Button type="submit">Сохранить песню</Button>
      <a href={resolve('/')}>Отмена</a>
    </div>
  </form>
</main>

<style>
  .upload-page {
    max-width: 70rem;
    margin: 0 auto;
    padding: 2rem clamp(1rem, 4vw, 4rem) 5rem;
  }
  .back-link {
    color: #a9003d;
    font-weight: 700;
  }
  header {
    max-width: 38rem;
    padding: 4rem 0 2.5rem;
  }
  .eyebrow {
    margin: 0 0 1rem;
    color: #a9003d;
    font:
      700 0.75rem/1 'Courier New',
      monospace;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  h1 {
    margin: 0;
    font:
      800 clamp(3rem, 8vw, 6rem)/0.9 Georgia,
      serif;
    letter-spacing: -0.06em;
  }
  header p:last-child {
    max-width: 32rem;
    margin: 1.5rem 0 0;
    line-height: 1.6;
  }
  form {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1px;
    background: rgba(31, 32, 36, 0.35);
  }
  .form-section {
    display: grid;
    align-content: start;
    gap: 1.25rem;
    padding: 1.5rem;
    background: #eee9df;
  }
  .form-section:last-of-type {
    grid-column: 1 / -1;
  }
  h2 {
    margin: 0;
    font:
      700 1.45rem/1 Georgia,
      serif;
  }
  .field {
    display: grid;
    gap: 0.45rem;
  }
  .field > span {
    font-weight: 700;
  }
  input[type='file'] {
    width: 100%;
    box-sizing: border-box;
    padding: 0.7rem 0;
  }
  small {
    color: #64636a;
    line-height: 1.4;
  }
  .error,
  .form-error {
    color: #a9003d;
    font-weight: 700;
  }
  .form-error {
    padding: 0.9rem 1rem;
    border-left: 4px solid #ff4081;
    background: #fff0f5;
  }
  .form-actions {
    grid-column: 1 / -1;
    display: flex;
    gap: 1rem;
    align-items: center;
    padding: 1.5rem;
    background: #1f2024;
    color: #fffdf7;
  }
  .form-actions a {
    color: #fffdf7;
  }
  @media (max-width: 700px) {
    form {
      display: block;
      background: transparent;
    }
    .form-section,
    .form-actions {
      margin-top: 1px;
    }
  }
</style>
