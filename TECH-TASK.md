# TECH-TASK — локальный караоке-медиаплеер для вокалоидов

**Версия: v2.1** (18 августа, 2026)

## 0. Как читать этот документ

Этот файл является единственным источником технической истины проекта.

- Имена таблиц, колонок, TypeScript-типов, функций, маршрутов и статусов берутся только из этого документа.
- Реализация выполняется строго по одному слайсу за сессию, сверху вниз.
- Сначала закрываются критерии приёмки текущего слайса, затем выполняется полный гейт.
- Контракты нельзя расширять догадками. Если для критерия не хватает поля, типа, функции или маршрута, работа останавливается с блоком `CONTRACT GAP` из раздела 15.
- Любая миграция базы данных, изменение публичного типа или изменение HTTP-контракта требует обновления версии документа и отдельного согласования.
- Тексты интерфейса, ошибки валидации и сообщения для Юзера пишутся на русском языке.
- Имена кода, типы, SQL-колонки, логи и сообщения исключений пишутся на английском языке.

Порядок работы над слайсом:

1. Прочитать этот документ и описание слайса.
2. Проверить, что все необходимые контракты присутствуют.
3. Составить локальный план файлов и тестов.
4. Реализовать код и тесты из критериев приёмки.
5. Проверить сценарий вручную в браузере, если слайс содержит UI.
6. Запустить `npm run gate`.
7. Проверить Definition of Done.
8. Создать небольшой Conventional Commit на русском языке.

---

## 1. Продукт

Приложение — локальный медиаплеер с караоке-режимом для песен с вокалоидами. Юзер хранит библиотеку на своём компьютере, загружает аудио или видео, добавляет метаданные и тексты, запускает локальную синхронизацию и при необходимости вручную корректирует тайминги строк.

Во время воспроизведения приложение показывает строки выбранного текста и дискретно выделяет строку, соответствующую текущему времени. Непрерывная заливка текста по мере исполнения не используется.

Синхронизация выполняется локально. Внешние API распознавания, облачные хранилища, аналитика и обязательное сетевое соединение во время работы отсутствуют.

### 1.1. Цели

- Быстрое локальное добавление песни в библиотеку.
- Надёжное воспроизведение MP3, OGG и MP4.
- Хранение метаданных Юзера, основного текста и переводов.
- Построчная автоматическая синхронизация через локальный Forced Alignment.
- Полная ручная правка таймингов после автоматической обработки.
- Перенос библиотеки через экспорт и импорт архива.
- Доступный, выразительный и спокойный интерфейс без шаблонного неонового шума.
- Повторяемая разработка через слайсы, acceptance criteria и автоматический гейт.

### 1.2. Ограничения

- Один локальный Юзер без аккаунтов и ролей.
- Данные и медиафайлы находятся на локальном диске.
- Приложение запускается Node.js-сервером и открывается в браузере.
- После выполнения setup приложение должно работать без сети.
- Поддерживаются языки `ru`, `ja`, `en`.
- MVP работает с таймингами на уровне строк; пословная подсветка не входит в контракт.
- Системный FFmpeg является обязательной внешней зависимостью для декодирования медиа.
- Синхронизация является best-effort-процессом и всегда имеет ручной fallback.

### 1.3. Не входит в MVP

- Авторизация Юзера.
- Облачная синхронизация.
- Совместное редактирование.
- Мобильное нативное приложение.
- Публикация библиотеки в интернете.
- Автоматический перевод текста.
- Генерация обложек и других изображений.
- Оценка качества исполнения пользователя.
- Пословная или посимвольная подсветка.

### 1.4. Основные сценарии

1. Юзер запускает setup, проверяет Node.js, FFmpeg и модели.
2. Юзер открывает библиотеку и видит песни, отсортированные от новых к старым.
3. Юзер загружает аудио или видео, название, метаданные и тексты `ja` и, при необходимости, один перевод.
4. Юзер открывает песню, запускает воспроизведение и видит текущую строку.
5. Юзер запускает синхронизацию, наблюдает состояние и прогресс задачи.
6. Юзер получает новые тайминги только после полного успешного результата.
7. Юзер вручную исправляет отдельные строки и сохраняет результат.
8. Юзер редактирует метаданные или тексты.
9. Юзер добавляет перевод асинхронно, не прерывая воспроизведение.
10. Юзер удаляет песню вместе с медиафайлом и связанными данными.
11. Юзер экспортирует библиотеку в архив и импортирует архив на другой локальный экземпляр.

---

## 2. Стек

### 2.1. Основной runtime

- Node.js `22+`.
- SvelteKit 2.
- Svelte 5 с обязательным использованием Runes.
- TypeScript в режиме `strict`.
- `@sveltejs/adapter-node`.
- Vite как сборщик и dev-server.

### 2.2. Хранение и файлы

- SQLite через `better-sqlite3`.
- WAL-режим SQLite.
- Версионируемые SQL-миграции, запускаемые при инициализации.
- Медиафайлы в каталоге данных приложения, а не в `static/`.
- Относительные безопасные пути в базе данных.
- FFmpeg, установленный в системе пользователя.

### 2.3. Синхронизация

- `onnxruntime-node` для запуска ONNX-модели.
- Локальная CTC-модель Forced Alignment и её языковые ресурсы.
- `worker_threads` для CPU-intensive alignment pipeline.
- `child_process.spawn` для запуска FFmpeg без shell-интерполяции.
- PCM `Float32Array`, mono, 16 kHz как внутренний формат элайнера.

### 2.4. Тестирование и качество

- Vitest для unit и integration тестов.
- `@playwright/test` для browser acceptance тестов.
- Prettier.
- ESLint с Svelte-плагином.
- `svelte-check`.
- Knip.
- `fast-check` для property-based тестов чистой логики.

### 2.5. Принципы выбора

- Не использовать ORM: SQL и транзакции должны быть видимыми и контролируемыми.
- Не использовать глобальный state manager: состояние страницы и плеера локально компонентам.
- Не использовать UI-фреймворк: дизайн-система реализуется в собственных Svelte-примитивах.
- Не использовать внешние CDN во время работы приложения.
- Не выполнять долгий alignment внутри HTTP request handler.
- Не смешивать серверные зависимости с browser bundle.

---

## 3. Структура проекта

```text
TECH-TASK.md
AGENTS.md
package.json
package-lock.json
svelte.config.js
vite.config.ts
tsconfig.json
eslint.config.js
prettier.config.js
playwright.config.ts
scripts/
  setup.ts
  seed.ts
  data/
    songs_dataset.json
migrations/
  001_initial.sql
  002_sync_jobs.sql
  003_indexes.sql
data/
  karaoke.db
  media/
  archives/
  models/
  tmp/
static/
  favicon.ico
  logo_lets_uta_v1.png
  fonts/
  icons/
  src/
  app.html
  app.css
  hooks.server.ts
  lib/
    karaoke/
      types.ts
      constants.ts
      errors.ts
      validate.ts
      lines.ts
      timing.ts
      synchronizer.ts
      archive.ts
    server/
      db.ts
      migrations.ts
      paths.ts
      media.ts
      songs.ts
      lyrics.ts
      timings.ts
      settings.ts
      sync-jobs.ts
      sync-manager.ts
      sync-worker.ts
      archive.ts
    ui/
      Button.svelte
      IconButton.svelte
      Input.svelte
      TextArea.svelte
      Select.svelte
      Checkbox.svelte
      Card.svelte
      Badge.svelte
      EmptyState.svelte
      MediaPlayer.svelte
      LyricLines.svelte
      TimelineEditor.svelte
      ProgressBar.svelte
      Dialog.svelte
  routes/
    +error.svelte
    +layout.svelte
    +layout.server.ts
    +page.svelte
    +page.server.ts
    upload/
      +page.svelte
      +page.server.ts
    songs/
      [id]/
        +page.svelte
        +page.server.ts
        media/
          +server.ts
        sync/
          +server.ts
          [jobId]/
            +server.ts
            cancel/
              +server.ts
    settings/
      +page.svelte
      +page.server.ts
    library/
      export/
        +server.ts
      import/
        +server.ts
tests/
  fixtures/
    media/
    models/
    archives/
  unit/
  integration/
  e2e/
```

### 3.1. Границы модулей

- `src/lib/karaoke/` не импортирует SQLite, SvelteKit request objects и Node-only API.
- `src/lib/server/` содержит SQL, filesystem, FFmpeg, worker management и server-only orchestration.
- `src/lib/ui/` содержит переиспользуемые компоненты и не знает о базе данных.
- `src/routes/` связывает form actions/API с domain и server services.
- `better-sqlite3` импортируется только из `src/lib/server/`.
- `onnxruntime-node` импортируется только в worker/server code.
- Файлы пользователя не импортируются через browser bundle.
- SQL-запросы находятся в `db.ts`, `migrations.ts` и специализированных server-модулях.

---

## 4. Контракт данных

### 4.1. Общие правила

- Временные значения в доменном контракте хранятся в миллисекундах.
- Даты хранятся как ISO 8601 UTC-строки.
- Пустые массивы сериализуются как JSON `[]`.
- Пустое необязательное описание хранится как `NULL`.
- Все внешние ключи включаются через `PRAGMA foreign_keys = ON`.
- Удаление песни каскадно удаляет тексты, тайминги и задачи синхронизации.
- Доступ к медиафайлам осуществляется только через проверенный относительный путь.

### 4.2. Таблица `songs`

| поле | SQLite | ограничения | назначение |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Идентификатор песни |
| `title` | TEXT | NOT NULL | Название |
| `filePath` | TEXT | NOT NULL UNIQUE | Относительный путь к медиафайлу |
| `mediaKind` | TEXT | NOT NULL CHECK (`audio` или `video`) | Вид медиаконтента |
| `durationMs` | INTEGER | NOT NULL CHECK (`durationMs > 0`) | Длительность в миллисекундах |
| `meaning` | TEXT | NULL | Описание смысла или истории |
| `composers` | TEXT | NOT NULL DEFAULT `'[]'` | JSON-массив строк |
| `artists` | TEXT | NOT NULL DEFAULT `'[]'` | JSON-массив строк |
| `createdAt` | TEXT | NOT NULL | Время создания |
| `updatedAt` | TEXT | NOT NULL | Время изменения |

### 4.3. Таблица `lyrics`

| поле | SQLite | ограничения | назначение |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Идентификатор текста |
| `songId` | INTEGER | NOT NULL, FK `songs(id)` ON DELETE CASCADE | Песня |
| `language` | TEXT | NOT NULL CHECK (`ru`, `ja` или `en`) | Язык текста |
| `isPrimary` | INTEGER | NOT NULL CHECK (`0` или `1`) | Основной текст |
| `text` | TEXT | NOT NULL | Текст с переносами строк |
| `createdAt` | TEXT | NOT NULL | Время создания |
| `updatedAt` | TEXT | NOT NULL | Время изменения |

Ограничения:

- Для одной песни существует ровно один primary lyric.
- Primary lyric всегда имеет `language = 'ja'`.
- Для одной песни допускается не более одного secondary lyric.
- Secondary lyric может иметь только `language = 'ru'` или `language = 'en'`.
- Перед сохранением текст нормализуется только по окончаниям строк; внутренние переносы сохраняются.
- Количество строк secondary lyric обязано совпадать с количеством строк primary lyric.

### 4.4. Таблица `timings`

| поле | SQLite | ограничения | назначение |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Идентификатор тайминга |
| `lyricId` | INTEGER | NOT NULL, FK `lyrics(id)` ON DELETE CASCADE | Текст |
| `lineIndex` | INTEGER | NOT NULL CHECK (`lineIndex >= 0`) | Индекс строки с нуля |
| `startTime` | INTEGER | NOT NULL CHECK (`startTime >= 0`) | Начало в мс |
| `endTime` | INTEGER | NOT NULL CHECK (`endTime > startTime`) | Конец в мс |
| `source` | TEXT | NOT NULL CHECK (`auto`, `manual` или `import`) | Источник тайминга |
| `updatedAt` | TEXT | NOT NULL | Время изменения |

Уникальный индекс: `(lyricId, lineIndex)`.

`endTime` не может превышать `songs.durationMs`; это проверяется в service layer, потому что SQLite CHECK не может безопасно ссылаться на другую таблицу.

Timing-записи существуют только для primary lyric (`ja`). Этот единственный набор является общим для primary lyric и secondary lyric: строки перевода сопоставляются с timing по одинаковому `lineIndex`, отдельные timing-записи для перевода не создаются.

### 4.5. Таблица `sync_jobs`

| поле | SQLite | ограничения | назначение |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | UUID задачи |
| `songId` | INTEGER | NOT NULL, FK `songs(id)` ON DELETE CASCADE | Песня |
| `status` | TEXT | NOT NULL CHECK (`queued`, `running`, `succeeded`, `failed`, `cancelled`) | Состояние |
| `progress` | INTEGER | NOT NULL DEFAULT 0 CHECK (`0..100`) | Процент |
| `processedLines` | INTEGER | NOT NULL DEFAULT 0 | Обработанные строки |
| `totalLines` | INTEGER | NOT NULL DEFAULT 0 | Всего строк |
| `message` | TEXT | NULL | Безопасное сообщение для пользователя |
| `createdAt` | TEXT | NOT NULL | Создание |
| `startedAt` | TEXT | NULL | Запуск |
| `finishedAt` | TEXT | NULL | Завершение |
| `cancelRequested` | INTEGER | NOT NULL DEFAULT 0 CHECK (`0` или `1`) | Запрос отмены |

Одновременно выполняется не более одной задачи Forced Alignment.

### 4.6. Таблица `settings`

| поле | SQLite | ограничения | назначение |
| :--- | :--- | :--- | :--- |
| `key` | TEXT | PRIMARY KEY | Ключ настройки |
| `value` | TEXT | NOT NULL | Строковое значение |
| `updatedAt` | TEXT | NOT NULL | Время изменения |

Поддерживаемые ключи:

- `theme`: `light` или `dark`, default `light`.
- `volume`: число от `0` до `1`, default `0.8`.
- `playbackStep`: положительное число секунд, default `5`.
- `autoScrollDelayMs`: положительное целое число миллисекунд, default `3000`.

### 4.7. Таблица `schema_migrations`

| поле | SQLite | ограничения | назначение |
| :--- | :--- | :--- | :--- |
| `version` | INTEGER | PRIMARY KEY | Номер миграции |
| `appliedAt` | TEXT | NOT NULL | Время применения |

### 4.8. TypeScript-типы

```ts
export type Language = 'ru' | 'ja' | 'en';
export type SecondaryLanguage = 'ru' | 'en';
export type MediaKind = 'audio' | 'video';
export type TimingSource = 'auto' | 'manual' | 'import';
export type Theme = 'light' | 'dark';

export type Song = {
  id: number;
  title: string;
  filePath: string;
  mediaKind: MediaKind;
  durationMs: number;
  meaning: string | null;
  composers: string[];
  artists: string[];
  createdAt: string;
  updatedAt: string;
};

export type Lyric = {
  id: number;
  songId: number;
  language: Language;
  isPrimary: boolean;
  text: string;
  createdAt: string;
  updatedAt: string;
};

export type Timing = {
  id: number;
  lyricId: number;
  lineIndex: number;
  startTime: number;
  endTime: number;
  source: TimingSource;
  updatedAt: string;
};

export type SyncJobStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export type SyncJob = {
  id: string;
  songId: number;
  status: SyncJobStatus;
  progress: number;
  processedLines: number;
  totalLines: number;
  message: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  cancelRequested: boolean;
};

export type SongWithDetails = Song & {
  lyrics: Lyric[];
  /** The single primary-anchored timing set is shared with the translation. */
  timings: Timing[];
};

export type UploadInput = {
  file: File;
  title: string;
  primaryLyric: string;
  secondaryLyric?: {
    text: string;
    language: SecondaryLanguage;
  };
  meaning?: string;
  composers: string[];
  artists: string[];
};

export type TimingInput = {
  lineIndex: number;
  startTime: number;
  endTime: number;
};
```

`SongDbRow`, JSON-encoded columns и любые DTO, используемые только внутри server layer, не экспортируются в UI.

---

## 5. API доступа к данным и доменные сервисы

### 5.1. `src/lib/server/db.ts`

```ts
export function getDb(databasePath?: string): Database.Database;
export function closeDb(database?: Database.Database): void;
```

`getDb(':memory:')` создаёт изолированную схему для теста. Для рабочего режима используется путь из `KARAOKE_DATA_DIR`, а default — `data/` относительно process working directory.

### 5.2. `src/lib/server/songs.ts`

```ts
export function listSongs(filter?: {
  query?: string;
  language?: Language;
  artist?: string;
}): Song[];

export function getSong(id: number): Song | undefined;
export function getSongWithDetails(id: number): SongWithDetails | undefined;
export function createSong(data: Omit<Song, 'id' | 'createdAt' | 'updatedAt'>): Song;
export function updateSong(
  id: number,
  data: Partial<Omit<Song, 'id' | 'createdAt' | 'updatedAt'>>,
): Song | undefined;
export function deleteSong(id: number): void;
```

Поиск по title выполняется параметризованным SQL-запросом. Фильтр `artist` проверяет элементы JSON-массива через SQLite JSON-функции, а не через небезопасный поиск подстроки.

### 5.3. `src/lib/server/lyrics.ts`

```ts
export function getLyricsForSong(songId: number): Lyric[];
export function getLyric(id: number): Lyric | undefined;
export function createLyric(data: Omit<Lyric, 'id' | 'createdAt' | 'updatedAt'>): Lyric;
export function addTranslation(
  songId: number,
  input: { language: SecondaryLanguage; text: string },
): Lyric;
export function updateLyric(
  id: number,
  data: Pick<Lyric, 'language' | 'isPrimary' | 'text'>,
): Lyric | undefined;
export function deleteLyric(id: number): void;
```

`addTranslation` разрешает только один secondary lyric и сохраняет его в таблице `lyrics`. Проверка совпадения количества строк с primary lyric выполняется до записи.

Изменение количества строк primary lyric удаляет общий timing-набор, относящийся к старой структуре. Это действие выполняется в одной транзакции и явно сообщается Юзеру. Изменение количества строк перевода отклоняется и не меняет существующие данные.

### 5.4. `src/lib/server/timings.ts`

```ts
export function getTimingsForLyric(lyricId: number): Timing[];
export function replaceTimings(
  lyricId: number,
  timings: TimingInput[],
  source: TimingSource,
): Timing[];
export function updateTiming(id: number, input: TimingInput): Timing | undefined;
export function deleteTiming(id: number): void;
export function deleteTimingsForLyric(lyricId: number): void;
```

`replaceTimings` валидирует сортировку, отсутствие дублей, границы песни и `endTime > startTime` до записи.

### 5.5. `src/lib/server/settings.ts`

```ts
export function getSettings(): {
  theme: Theme;
  volume: number;
  playbackStep: number;
  autoScrollDelayMs: number;
};

export function updateSettings(input: {
  theme?: Theme;
  volume?: number;
  playbackStep?: number;
  autoScrollDelayMs?: number;
}): void;
```

Настройки хранятся в SQLite. `localStorage` используется только как быстрый client cache и не является источником истины.

### 5.6. `src/lib/server/paths.ts` и `media.ts`

```ts
export function getDataRoot(): string;
export function resolveStoredPath(relativePath: string): string;
export function assertPathInsideDataRoot(relativePath: string): void;

export function saveUploadedMedia(file: File): Promise<{
  filePath: string;
  mediaKind: MediaKind;
  durationMs: number;
}>;

export function deleteStoredMedia(filePath: string): Promise<void>;
export function inspectFfmpeg(): Promise<{ available: boolean; version?: string }>;
```

Путь из базы никогда не передаётся в `path.resolve` без проверки. Имя физического файла генерируется сервером из UUID, а исходное имя не используется как путь.

---

## 6. UI-примитивы и дизайн-система

### 6.1. Общие правила Svelte

Все компоненты используют Svelte 5 Runes:

- props: `let { ... }: Props = $props()`;
- state: `$state`;
- derived values: `$derived`;
- side effects: `$effect`;
- children: snippets и `{@render}`;
- events: callback props, например `onclick={handleClick}`.

Legacy `export let`, `$:`, `<slot />`, `on:click` и `createEventDispatcher` запрещены.

### 6.2. Примитивы

| компонент | обязательные возможности |
| :--- | :--- |
| `Button.svelte` | `primary`, `secondary`, `danger`, `ghost`, native `type`, disabled, loading |
| `IconButton.svelte` | accessible label, tooltip, focus-visible, disabled |
| `Input.svelte` | label, hint, error, type, value, invalid state |
| `TextArea.svelte` | label, hint, error, rows, character counter |
| `Select.svelte` | label, options, value, error |
| `Checkbox.svelte` | label, checked, description |
| `Card.svelte` | content snippet, optional link, interactive state |
| `Badge.svelte` | artist, composer, language, neutral variants |
| `EmptyState.svelte` | title, description, action snippet |
| `MediaPlayer.svelte` | audio/video, play/pause, seek, volume, keyboard shortcuts |
| `LyricLines.svelte` | line rendering, active index, scroll-to-active |
| `TimelineEditor.svelte` | start/end inputs, validation, save callback |
| `ProgressBar.svelte` | determinate/indeterminate, accessible value |
| `Dialog.svelte` | focus trap, escape close, labelled title |

### 6.3. Editorial cyber-pop

Визуальная система строится вокруг музыкального каталога и сценического плеера, но не имитирует dashboard-шаблон.

Обязательные решения:

- Светлая тема: тёплая бумажная поверхность, графитовый текст, тонкие линии и яркие акцентные цвета.
- Тёмная тема: глубокий графитовый фон, мягкие поверхности и контролируемые цветовые акценты.
- Cyan `#00E5FF`, pink `#FF4081` и yellow `#FFD543` используются для фокуса, статусов, активной строки и меток.
- Не использовать полноэкранные кислотные заливки, постоянное свечение и случайные градиенты.
- Использовать асимметричную сетку, крупные заголовки, ритмичные разделители и музыкальные метки.
- Карточки должны передавать различие между песнями через типографику, плотность и акцентную линию, а не через случайные декоративные изображения.
- Шрифты должны поставляться локально в `static/fonts/`; CDN запрещён.
- Рекомендуемая пара: выразительный display-шрифт для заголовков и читаемый humanist sans для текста; точные лицензированные файлы фиксируются в репозитории до реализации UI-слайса.
- Интерактивные элементы используют arcade-направление: короткий физический отклик на нажатие, выразительный hover-сдвиг, контрастный `focus-visible`, ясные loading и disabled states.
- Анимации строятся на ритме, смещении, штампе и смене акцентной линии; постоянное свечение, случайные градиенты и generic glassmorphism запрещены.
- При `prefers-reduced-motion: reduce` arcade-эффект заменяется мгновенной сменой состояния без потери фокуса и контраста.

### 6.4. Selection colors

Выделение мышью вне контейнеров с текстами должно использовать не системный синий цвет. Цвета циклически меняются между cyan `#00E5FF`, pink `#FF4081` и yellow `#FFD543`. Для стабильности acceptance-тестов цикл начинается с cyan после загрузки страницы и меняется при новом выделении.

Внутри lyric-контейнеров цвет выбирается из разрешённой пары и никогда не совпадает с цветом active line:

| контейнер | active line | selection palette |
| :--- | :--- | :--- |
| `ja` | pink `#FF4081` | yellow `#FFD543`, cyan `#00E5FF` |
| `ru` | cyan `#00E5FF` | yellow `#FFD543`, pink `#FF4081` |
| `en` | yellow `#FFD543` | pink `#FF4081`, cyan `#00E5FF` |

Selection использует акцентный фон и контрастный цвет текста. Тест проверяет принадлежность цвета разрешённой паре, а не конкретный случай псевдослучайного выбора.

### 6.5. Karaoke rendering

- Обычная строка имеет высокий контраст и комфортный межстрочный интервал.
- Активная строка получает discrete class change, акцентный цвет, небольшой фон и визуальный маркер.
- Запрещены continuous gradient fill, посимвольная заливка и обязательные fade-анимации.
- При отсутствии таймингов текст остаётся полноценным читаемым текстом без неработающих placeholder-эффектов.
- Активная строка должна быть доступна через `aria-current="true"`.
- На странице песни сверху находится media player, ниже по центру — primary `ja` lyrics и небольшая доступная кнопка добавления перевода.
- После добавления перевода `ja`-контейнер плавно сдвигается влево, а secondary-контейнер появляется справа; на узких экранах контейнеры переходят в вертикальный порядок.
- Перевод отображается только после успешной проверки языка, лимита `8191` символа и совпадения количества строк.
- Строка перевода использует тот же `lineIndex` и timing, что и текущая строка `ja`.

### 6.6. Playback auto-scroll

- Автоскролл работает только во время воспроизведения и только при наличии timing-набора.
- После `autoScrollDelayMs` бездействия Юзера активная строка плавно раскрывается в области чтения; default — `3000` мс.
- Любое взаимодействие Юзера запускает таймер заново.
- Выделение текста и ручная прокрутка временно блокируют автоскролл; после периода бездействия таймер запускается снова.
- Для MP3/OGG прокручивается lyric-область. Для MP4 используется обычная прокрутка страницы, поэтому media player не перекрывает lyrics.
- При reduced motion автоскролл выполняется без плавной анимации, а позиция чтения Юзера сохраняется настолько, насколько это возможно.

### 6.7. Responsive и accessibility

- Mobile-first layout.
- Плеер и активная строка остаются доступными при ширине от 320 px.
- Все интерактивные элементы доступны с клавиатуры.
- Focus-visible state не удаляется стилями.
- Цвет не является единственным способом передачи статуса.
- Обязательны labels, описания ошибок, правильные headings и live-region для прогресса синхронизации.
- При `prefers-reduced-motion: reduce` отключаются декоративные движения и автоскролл с анимацией.
- Диалог добавления перевода имеет обязательный select языка `ru`/`en`, textarea, счётчик символов, summary ошибок и не блокирует media playback во время async action.
- Ошибка несовпадения строк показывается рядом с textarea и не закрывает диалог до исправления.

### 6.8. Брендовые assets

- `static/favicon.ico` обслуживается по публичному пути `/favicon.ico` и подключается как favicon в document head.
- `static/logo_lets_uta_v1.png` обслуживается по публичному пути `/logo_lets_uta_v1.png` и отображается в верхней части общего layout.
- Logo имеет доступный альтернативный текст и ведёт в библиотеку; отсутствие assets считается ошибкой сборки/проверки интерфейса.

---

## 7. Маршруты и actions

| путь | назначение | метод |
| :--- | :--- | :--- |
| `/` | библиотека, поиск и фильтры | GET |
| `/upload` | загрузка медиа, метаданных и текстов | GET, POST action `create` |
| `/songs/[id]` | плеер, тексты, тайминги и метаданные | GET, POST actions `updateSong`, `updateLyric`, `addTranslation`, `updateTimings`, `delete` |
| `/songs/[id]/media` | защищённая отдача медиа с Range support | GET |
| `/songs/[id]/sync` | создание задачи синхронизации | POST JSON |
| `/songs/[id]/sync/[jobId]` | состояние и прогресс задачи | GET |
| `/songs/[id]/sync/[jobId]/cancel` | запрос отмены | POST |
| `/settings` | тема, громкость, hotkeys и auto-scroll delay | GET, POST action `update` |
| `/library/export` | скачивание архива | GET |
| `/library/import` | импорт архива | POST multipart |

Правила:

- Для обычных форм использовать `method="POST"` и `use:enhance`.
- Upload использовать с `enctype="multipart/form-data"`.
- Успешная загрузка перенаправляет на `/songs/[id]`.
- Ошибки формы возвращаются через `fail(400, ...)` с безопасными сообщениями и сохранёнными текстовыми значениями.
- Несуществующая песня возвращает `error(404, ...)`.
- `addTranslation` возвращает асинхронный результат через enhanced form; media playback и текущая строка не блокируются на время запроса.
- `addTranslation` принимает только один secondary language (`ru` или `en`) и сохраняет перевод только после полной валидации.
- Запуск sync возвращает HTTP `202` и `{ jobId }`.
- Ошибки бизнес-валидации возвращают JSON с HTTP `400`.
- Необработанные внутренние ошибки не раскрывают пути файлов, stack trace или SQL.

### 7.1. Media endpoint

`GET /songs/[id]/media`:

- проверяет существование песни;
- разрешает только путь, связанный с этой песней;
- отдаёт корректный `Content-Type`;
- поддерживает `Range` для перемотки браузером;
- возвращает `404`, если файл отсутствует;
- не позволяет запросить произвольный путь.

### 7.2. Sync endpoints

`POST /songs/[id]/sync`:

```ts
type StartSyncResponse = { jobId: string };
```

`GET /songs/[id]/sync/[jobId]` возвращает `SyncJob`.

`POST /songs/[id]/sync/[jobId]/cancel` устанавливает `cancelRequested = 1`; worker завершает задачу на ближайшей безопасной точке.

### 7.3. Translation action

`POST` action `addTranslation` на `/songs/[id]` принимает поля формы:

```ts
type AddTranslationInput = {
  language: unknown;
  text: unknown;
};

type AddTranslationSuccess = {
  ok: true;
  lyric: Lyric;
};
```

При успехе action возвращает `AddTranslationSuccess` через `use:enhance`; страница не выполняет полную навигацию и media playback не прерывается. При ошибке action возвращает `fail(400, ...)` с `fieldErrors` и сохранёнными `language`/`text`. Если secondary lyric уже существует, action не изменяет БД и возвращает `Перевод уже добавлен`.

### 7.4. Error boundary

`src/routes/+error.svelte` является единым error boundary для `400`, `404` и `500`. Все состояния используют доработанную arcade/editorial композицию с одинаковой иерархией заголовка, описания и безопасного действия возврата.

- `400`: заголовок `Запрос не принят`, объяснение предлагает проверить введённые данные.
- `404`: заголовок `Страница не найдена`, объяснение предлагает вернуться в библиотеку.
- `500`: заголовок `Внутренняя ошибка`, объяснение не раскрывает технические детали и предлагает вернуться в библиотеку или повторить действие.
- Ошибка не показывает absolute paths, stack trace, SQL или внутренние идентификаторы.
- Страница доступна с клавиатуры, имеет видимый focus-visible, responsive layout от 320 px и reduced-motion состояние.

---

## 8. Валидация и безопасность

### 8.1. Upload validation

```ts
export function validateUploadInput(data: {
  title: unknown;
  file: File | undefined;
  primaryLyric: unknown;
  secondaryLyric?: unknown;
  meaning?: unknown;
  composers?: unknown;
  artists?: unknown;
}):
  | { ok: true; value: UploadInput }
  | { ok: false; fieldErrors: Record<string, string> };
```

Правила:

- `title`: trim, от 1 до 200 символов.
- `file`: обязателен, не больше 100 MiB.
- Разрешены расширения и MIME: MP3, OGG audio и MP4 video.
- Расширение не является единственной проверкой: MIME и результат FFmpeg должны соответствовать.
- `primaryLyric`: непустой текст до 8191 символа.
- Primary language не передаётся формой и всегда равен `ja`.
- `secondaryLyric`, если передан, содержит непустой текст и ровно один язык `ru` или `en`.
- Количество строк `secondaryLyric` должно совпадать с количеством строк `primaryLyric`, рассчитанным через `splitText`.
- `meaning`: необязательный текст до 4000 символов.
- `composers` и `artists`: массив или comma-separated input; trim, удаление пустых элементов, максимум 20 элементов, максимум 100 символов на элемент.

Сообщения: `Название обязательно`, `Файл обязателен`, `Файл слишком большой (макс. 100 МБ)`, `Неверный формат файла`, `Основной текст обязателен`, `Текст слишком длинный`, `Неверно указан язык`, `Перевод уже добавлен`, `Количество строк перевода должно совпадать с японским текстом`, `Описание слишком длинное`, `Некорректное значение тайминга`.

```ts
export function validateTranslationInput(data: {
  text: unknown;
  language: unknown;
  primaryText: string;
}):
  | { ok: true; value: { text: string; language: SecondaryLanguage } }
  | { ok: false; fieldErrors: Record<string, string> };
```

`validateTranslationInput` нормализует только окончания строк, сохраняет внутренние переносы, ограничивает текст `8191` символом и требует полного совпадения результата `splitText` с primary `ja`.

### 8.2. Timing validation

```ts
export function validateTimings(
  timings: TimingInput[],
  lineCount: number,
  durationMs: number,
): { ok: true; value: TimingInput[] } | { ok: false; errors: string[] };
```

Проверки:

- каждый `lineIndex` целое число от `0` до `lineCount - 1`;
- индексы не повторяются;
- `startTime >= 0`;
- `endTime > startTime`;
- `endTime <= durationMs`;
- тайминги отсортированы по `lineIndex`;
- пустые строки не обязаны иметь timing;
- интервалы соседних строк не должны пересекаться более чем на 1 мс.

### 8.3. Filesystem safety

- Не использовать shell string interpolation для FFmpeg.
- Передавать аргументы FFmpeg массивом.
- Не принимать клиентский путь как путь назначения.
- Не обслуживать `data/` через static directory.
- Удалять временные файлы в `finally`.
- При ошибке транзакции удалять только созданный для этой операции медиафайл.
- При удалении песни сначала удалять запись и связанные данные в транзакции, затем физический файл.
- Если удаление файла не удалось, сообщить об orphan cleanup и не удалять чужие файлы.

---

## 9. Синхронизация Forced Alignment

### 9.1. Чистый контракт элайнера

```ts
export type AlignmentToken = {
  text: string;
  start: number;
  end: number;
};

export function alignLyrics(
  audio: Float32Array,
  sampleRate: 16000,
  text: string,
): Promise<AlignmentToken[] | null>;

export function mapTokensToLines(
  tokens: AlignmentToken[],
  lines: string[],
): TimingInput[];
```

`alignLyrics` не знает о SQLite, job status и HTTP.

### 9.2. Нормализация строк

```ts
export function splitText(text: string): string[];
```

Функция:

- заменяет `CRLF` и `CR` на `LF`;
- убирает только пустые строки в начале и конце текста;
- сохраняет внутренние пустые строки как строки без автоматического timing;
- не объединяет строки по пунктуации;
- возвращает строки в том же порядке, в каком их ввёл Юзер.

### 9.3. Worker pipeline

1. Создать `sync_jobs` в статусе `queued`.
2. Передать job в singleton `sync-manager`.
3. Worker открыть собственное SQLite-соединение только при необходимости чтения job/song.
4. Проверить существование песни, primary lyric и media file.
5. Проверить доступность модели и FFmpeg.
6. Запустить FFmpeg с фиксированными аргументами для получения mono PCM 16 kHz.
7. Передать PCM и исходный primary `ja` text в `alignLyrics`.
8. Сопоставить токены со строками через `mapTokensToLines`.
9. Проверить, что все непустые строки получили корректный диапазон.
10. При отмене завершить job как `cancelled`, не меняя существующие timings.
11. При ошибке завершить job как `failed`, сохранить старые timings и безопасное сообщение.
12. При успехе в одной транзакции удалить старые общие timings primary lyric и вставить новый комплект с `source = 'auto'`.
13. Завершить job как `succeeded`.

### 9.4. Поведение при сбоях

- Недоступен FFmpeg: задача failed с инструкцией установить FFmpeg.
- Недоступна модель: задача failed с инструкцией запустить setup.
- Нет primary lyric: задача failed без запуска worker pipeline.
- Элайнер вернул `null`: задача failed, существующие timings не меняются.
- Неполное сопоставление: задача failed, частичный результат не сохраняется.
- Worker завершился неожиданно: задача failed, временные файлы удаляются.
- Повторный запуск после failure разрешён.
- Одновременный второй запуск для той же песни отклоняется или возвращает активный job id.

### 9.5. Setup

```bash
npm run setup
```

Setup:

- проверяет Node.js версии 22+;
- проверяет доступность FFmpeg;
- создаёт каталоги данных;
- получает или проверяет ONNX-модели и checksum;
- проверяет права записи;
- не запускает сервер;
- сообщает, что после завершения приложение может работать offline.

Модели не загружаются автоматически из HTTP request приложения.

---

## 10. Экспорт и импорт

Архив имеет формат ZIP с manifest-файлом:

```ts
type ArchiveManifest = {
  format: 'lets-uta-archive';
  version: 1;
  exportedAt: string;
  songs: Array<{
    id: number;
    mediaFile: string;
    lyrics: string[];
  }>;
};
```

Архив содержит:

- `manifest.json`;
- `songs.json`;
- `lyrics.json`;
- `timings.json`;
- `media/<uuid>.<ext>`.

Импорт выполняется в staging-каталог. Сначала проверяются manifest, JSON-структура, версии, ограничения размера, дубликаты и контрольные суммы, затем данные записываются транзакционно. Некорректный архив не меняет существующую библиотеку.

---

## 11. Тестовая стратегия

Тесты пишутся из критериев приёмки, а не из внутренних деталей реализации.

### 11.1. Unit

- upload validation: обязательные поля, лимиты, языки, списки авторов, форматы;
- translation validation: только `ja` primary, один secondary `ru`/`en`, лимит `8191` и совпадение строк;
- `splitText`: переносы строк, CRLF, пустые строки, Unicode;
- `validateTimings`: границы, дубли, пересечения, длительность;
- `mapTokensToLines`: корректные токены, пропуски, punctuation, пустые строки;
- path safety: traversal, absolute paths, symlink-like input;
- archive manifest validation;
- settings value parsing.

### 11.2. Integration

- миграции на `:memory:`;
- foreign keys и cascade delete;
- один primary `ja`, один secondary `ru`/`en` и общий primary-anchored timing-набор;
- JSON serialization arrays;
- транзакционный upload rollback;
- media cleanup;
- replace timings idempotency;
- sync failure preserves old timings;
- successful sync atomically replaces timings;
- job state transitions and cancellation;
- archive export/import and invalid archive rollback.

### 11.3. E2E

Использовать данные из `scripts/data/songs_dataset.json` и детерминированные media fixtures:

- загрузка песни через UI;
- отображение title, meaning, artists, composers и текстов;
- воспроизведение test media;
- смена active lyric;
- изменение active line при seek;
- открытие диалога добавления перевода без остановки media playback;
- успешное асинхронное добавление перевода с построчным matching;
- отклонение перевода с несовпадающим количеством строк и сохранение введённых значений;
- автоскролл после configurable idle delay, reset после взаимодействия и pause после ручной прокрутки;
- selection colors для внешнего текста и контейнеров `ja`/`ru`/`en`;
- запуск sync и polling progress через mock alignment adapter;
- ручное редактирование timing;
- редактирование metadata;
- удаление песни;
- смена темы и громкости;
- экспорт и импорт архива;
- ошибки формы и пустое состояние;
- unified error boundary для `400`, `404` и `500`;
- keyboard-only сценарии для плеера и редактора.

Реальная ONNX-модель не запускается в обычном CI acceptance suite. Для неё предусмотрен отдельный setup/integration check с явным наличием модели.

### 11.4. Property-based

`fast-check` проверяет инварианты нормализации строк и timing validation: индексы сохраняют порядок, невалидные интервалы не принимаются, сериализация и десериализация не меняют допустимый доменный объект.

---

## 12. Проверки и гейт

В `package.json` определить:

```json
{
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "setup": "tsx scripts/setup.ts",
    "seed": "tsx scripts/seed.ts",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "lint": "eslint .",
    "check": "svelte-check --tsconfig ./tsconfig.json",
    "knip": "knip",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "playwright test",
    "test": "npm run test:unit && npm run test:integration && npm run test:e2e",
    "gate": "npm run format:check && npm run lint && npm run check && npm run knip && npm run test"
  }
}
```

`npm run gate` обязан быть зелёным перед закрытием каждого слайса.

---

## 13. Конвенции

- Коммиты используют Conventional Commits.
- Формат: `type(scope): <краткое описание>`.
- Допустимые type: `feat`, `fix`, `test`, `refactor`, `chore`, `docs`.
- Описание на русском языке, со строчной буквы, без точки.
- Заголовок до 72 символов.
- Комментарии объясняют причину сложного решения, а не очевидное действие.
- Закомментированный код не оставлять.
- SQL-параметры всегда передавать bind-параметрами.
- Ошибки для пользователя отделять от технических логов.
- Не логировать содержимое текстов, абсолютные пути и персональные данные.

---

## 14. Definition of Done

Слайс считается завершённым, если:

1. Все критерии приёмки слайса выполнены.
2. Негативные сценарии покрыты тестами.
3. `npm run gate` зелёный.
4. UI-поведение проверено вручную, если слайс содержит интерфейс.
5. Нет неиспользуемых экспортов, компонентов, стилей и зависимостей.
6. SQL и Node-only импорты находятся только в server boundary.
7. Нет запросов к базе внутри неограниченных циклов.
8. Временные файлы очищаются при успехе и ошибке.
9. Изменения соответствуют публичным контрактам этого документа.
10. Коммит соответствует конвенции.

---

## 15. CONTRACT GAP

Если для выполнения acceptance criterion не хватает контракта, остановиться и вывести:

```text
CONTRACT GAP
Что нужно: <поле, тип, функция, маршрут или правило>
Зачем: <какой критерий приёмки невозможно выполнить>
Предлагаемая форма: <точная сигнатура, колонка, маршрут или схема>
Что делаю пока: жду согласования и не добавляю выдуманный контракт
```

Нельзя заменять `CONTRACT GAP` временным типом, скрытым полем, неописанным route или локальной несовместимой заглушкой.

---

## 16. Стадии и слайсы

Порядок фиксирован. Один слайс выполняется за одну сессию.

- Стадия 1 — foundation: слайс 0.
- Стадия 2 — library: слайсы 1–2.
- Стадия 3 — playback: слайсы 3 и 3.1.
- Стадия 4 — synchronization: слайс 4.
- Стадия 5 — editing: слайсы 5–6.
- Стадия 6 — portability and polish: слайсы 7–9.

### Слайс 0 — foundation

**Цель:** создать запускаемый каркас, миграции, базовые типы и гейт.

**Файлы:** package manifests, SvelteKit config, `src/lib/karaoke/types.ts`, `src/lib/server/db.ts`, migrations, `scripts/setup.ts`, `scripts/seed.ts`, test config, global CSS.

**Поведение:** проект запускается, SQLite создаётся автоматически, миграции применяются идемпотентно, setup проверяет Node/FFmpeg/model directories, seed читает dataset.

**Критерии приёмки:**

1. `npm run dev` открывает `/` без runtime errors.
2. `npm run gate` проходит на чистой checkout.
3. `getDb(':memory:')` создаёт все таблицы и индексы.
4. Повторное применение миграций не меняет схему.
5. `npm run setup` даёт понятный результат при отсутствии FFmpeg.
6. `npm run seed` идемпотентен.

**Тесты:** schema integration, migration idempotency, setup parser, seed idempotency, базовый Playwright smoke test.

**Негативные сценарии:** повреждённая база, недоступный каталог данных, отсутствующий FFmpeg, malformed dataset.

**Завершение:** проект собирается, гейт зелёный, схема и types совпадают с разделами 4–5.

### Слайс 1 — upload и media storage

**Цель:** загрузить и безопасно сохранить media file.

**Файлы:** upload route, `media.ts`, `paths.ts`, validation, upload tests, media fixture helpers.

**Поведение:** форма принимает MP3/OGG/MP4, проверяет файл, через FFmpeg получает media kind и duration, сохраняет UUID-based file и создаёт song transactionally.

**Критерии приёмки:**

1. Валидный файл и title создают песню.
2. Файл физически находится внутри data root.
3. Невалидный формат отклоняется.
4. Файл больше 100 MiB отклоняется.
5. Ошибка БД удаляет созданный media file.
6. Клиентский filename не может управлять путём.
7. Успех перенаправляет на `/songs/[id]`.

**Тесты:** form action, MIME/extension validation, FFmpeg adapter mock, rollback and path traversal integration tests.

**Негативные сценарии:** отсутствующий file, spoofed extension, broken media, FFmpeg failure, write permission failure.

**Завершение:** upload UI и server action работают с реальным fixture-файлом.

### Слайс 2 — metadata, lyrics и library

**Цель:** сохранить полные данные песни и показать библиотеку.

**Файлы:** songs/lyrics services, `/`, `/upload`, `/songs/[id]`, UI inputs/cards/badges, routes tests.

**Поведение:** сохраняются meaning, composers, artists, primary `ja` lyric и не более одного secondary lyric `ru`/`en`; библиотека поддерживает query, language и artist filters.

**Критерии приёмки:**

1. Primary lyric обязателен.
2. Primary lyric сохраняется как `ja`, а secondary lyric — не более одного с языком `ru` или `en`.
3. Метаданные отображаются на странице песни.
4. Библиотека сортируется по `createdAt DESC`.
5. Поиск по title работает без учёта регистра.
6. Фильтры пересекаются между собой.
7. Пустая библиотека и пустой результат показывают `EmptyState`.

**Тесты:** validation unit, repository integration, action tests, seeded e2e library tests.

**Негативные сценарии:** duplicate language, empty title, too-long text, invalid JSON arrays, unknown song id.

**Завершение:** Юзер может загрузить песню с `ja` и найти её по библиотечным фильтрам.

### Слайс 3 — media player и karaoke view

**Цель:** воспроизводить media и отображать строки текста.

**Файлы:** `MediaPlayer.svelte`, `LyricLines.svelte`, song page, media endpoint, player tests, global design tokens.

**Поведение:** браузер получает media через secure route, поддерживаются play/pause/seek/volume, active line вычисляется по currentTime и timing map.

**Критерии приёмки:**

1. MP3/OGG/MP4 воспроизводятся через browser media element.
2. Перемотка обновляет активную строку.
3. При отсутствии timings текст остаётся читаемым.
4. Выбранный secondary lyric отображается без подмены primary.
5. Active line имеет discrete visual state и `aria-current`.
6. Space, arrows и `k` работают согласно описанным hotkeys (и на `ru`, и на `en` раскладке клавиотуры).
7. Range media request поддерживается.

**Тесты:** component tests for active index, media endpoint integration, Playwright seek and keyboard tests.

**Негативные сценарии:** missing media, invalid range, no lyrics, no timings.

**Завершение:** seeded song проигрывается в браузере и корректно подсвечивает строки.

### Слайс 3.1 — BF-01: immersive playback и translation

**Цель:** добавить основной playback-сценарий вокалоидного плеера с обязательным `ja`, одним сохранённым переводом и ненавязчивым следованием за активной строкой.

**Файлы:** upload validation и lyrics service, `/songs/[id]`, `Dialog.svelte`, `Select.svelte`, `TextArea.svelte`, `LyricLines.svelte`, `MediaPlayer.svelte`, settings service, `app.css`, route и interaction tests.

**Поведение:** upload принимает primary `ja` и не более одного secondary `ru`/`en`; страница песни показывает player сверху, `ja` lyrics по центру и optional add-translation control; отдельный async action сохраняет перевод без остановки воспроизведения; перевод использует общий timing-набор; active line и selection colors различаются по языку; автоскролл запускается после `autoScrollDelayMs` бездействия и сбрасывается взаимодействием Юзера.

**Критерии приёмки:**

1. Upload больше не принимает `primaryLanguage` и сохраняет primary lyric только как `ja`.
2. Для песни сохраняется не более одного secondary lyric с языком `ru` или `en`.
3. Диалог добавления перевода требует язык и текст, ограничивает текст `8191` символом и отклоняет несовпадение количества строк.
4. Успешный `addTranslation` сохраняет перевод асинхронно; media playback, active line и controls остаются доступными.
5. После успеха `ja` сдвигается влево, translation появляется справа, а обе колонки используют один `lineIndex` и timing.
6. `ja` active line имеет pink, `ru` — cyan, `en` — yellow; selection palette каждой колонки не пересекается с active line.
7. Внешнее выделение текста циклически использует cyan, pink и yellow вместо системного синего.
8. Во время playback после configurable idle delay активная строка раскрывается автоскроллом; click, keyboard, selection и ручная прокрутка корректно сбрасывают или приостанавливают таймер.
9. MP4 использует обычную прокрутку страницы и не перекрывает lyrics.
10. На 320 px, tablet и desktop player, active line, add-translation control и ошибки остаются доступными.

**Тесты:** validation unit, translation action integration, shared timing mapping, component tests for palette and idle state, Playwright tests for async add, keyboard dialog, MP3/MP4 scrolling and reduced motion.

**Негативные сценарии:** второй перевод, язык `ja`, неверный язык, пустой или слишком длинный перевод, несовпадение строк, action failure, playback error, missing timings, manual scroll, text selection и narrow viewport.

**Завершение:** Юзер может слушать или смотреть вокалоидный media, читать `ja`, асинхронно добавить валидный перевод и не потерять контроль над воспроизведением.

### Слайс 4 — async Forced Alignment

**Цель:** запускать, отслеживать и безопасно завершать автоматическую синхронизацию.

**Файлы:** synchronizer, sync worker/manager/jobs, sync endpoints, progress UI, mock model adapter, integration/e2e tests.

**Поведение:** POST возвращает job id, UI опрашивает состояние, worker обрабатывает PCM и заменяет timings только после полного успеха.

**Критерии приёмки:**

1. Создаётся job со статусом `queued`.
2. UI отображает `running` и progress.
3. Успешная задача создаёт timing для каждой непустой строки.
4. Повторная задача не создаёт дубликаты.
5. Ошибка alignment не повреждает старые timings.
6. Отмена приводит к `cancelled` без частичной записи.
7. Вторая активная задача не запускается параллельно.
8. Missing primary lyric возвращает понятную ошибку.
9. Favicon доступен по `/favicon.ico`, а logo `logo_lets_uta_v1.png` отображается в верхней части приложения и ведёт в библиотеку.

**Тесты:** mocked worker integration, state transition tests, idempotency, failure preservation, cancellation and polling e2e; asset smoke test для favicon и logo.

**Негативные сценарии:** null alignment, missing model, FFmpeg failure, worker crash, malformed tokens, incomplete mapping.

**Завершение:** задача полностью управляется через documented contracts и не блокирует HTTP request.

### Слайс 5 — ручная правка timings

**Цель:** вручную исправлять любую строку.

**Файлы:** `TimelineEditor.svelte`, timing validation, song action, timing tests.

**Поведение:** Юзер видит строку, start/end в миллисекундах и source; invalid values блокируют сохранение.

**Критерии приёмки:**

1. Можно изменить start/end одной строки.
2. Значения сохраняются в БД.
3. Невалидный диапазон показывает ошибку рядом со строкой.
4. Тайминг не выходит за duration.
5. После сохранения active line использует новое значение.
6. Ручная запись получает `source = 'manual'`.

**Тесты:** timing unit, update action integration, editor component and e2e tests.

**Негативные сценарии:** negative value, reversed interval, duplicate index, overlapping intervals, changed line count.

**Завершение:** автоматический результат можно полностью исправить без SQL и ручного редактирования файлов.

### Слайс 6 — editing и settings

**Цель:** редактировать данные песни и сохранять настройки Юзера.

**Файлы:** song/lyric actions, settings route, settings service, dialogs, tests.

**Поведение:** Юзер меняет title, meaning, tags, lyrics, theme, volume, playback step и auto-scroll delay; изменение структуры primary текста предупреждает о сбросе общего timing-набора, а перевод нельзя сохранить при несовпадении строк.

**Критерии приёмки:**

1. Metadata changes persist after reload.
2. Lyric changes persist after reload.
3. Изменение строк явно подтверждает удаление устаревших timings.
4. Theme persists in SQLite.
5. Volume applies to every player after reload.
6. Auto-scroll delay persists in SQLite and applies after reload.
7. Delete requires confirmation and removes database records plus owned media.

**Тесты:** action integration, cascade delete, settings persistence and Playwright reload tests.

**Негативные сценарии:** cancel dialog, invalid edit, missing media during delete, failed cleanup.

**Завершение:** библиотека имеет полный безопасный жизненный цикл.

### Слайс 7 — export/import

**Цель:** переносить библиотеку между локальными экземплярами.

**Файлы:** archive domain/service, export/import endpoints, archive fixtures, tests.

**Поведение:** export создаёт ZIP, import проверяет staging и только затем изменяет БД.

**Критерии приёмки:**

1. Экспорт содержит manifest, metadata, lyrics, timings и media.
2. Импорт восстанавливает песню и тайминги.
3. Повторный импорт не создаёт неконтролируемые дубликаты.
4. Некорректный архив не меняет библиотеку.
5. Архив с traversal path отклоняется.
6. Ошибка импорта очищает staging.

**Тесты:** archive unit, round-trip integration, invalid archive rollback and e2e download/upload.

**Негативные сценарии:** unsupported version, oversized archive, missing media, invalid JSON, duplicate identifiers.

**Завершение:** dataset можно экспортировать, импортировать и проверить на эквивалентность доменных данных.

### Слайс 8 — design polish и accessibility

**Цель:** довести интерфейс до согласованной editorial cyber-pop системы.

**Файлы:** `app.css`, UI components, local fonts, layout, accessibility tests.

**Поведение:** light/dark themes, responsive grid, arcade interaction states, non-default selection colors, focus states, reduced-motion, readable active lyrics, intentional page composition.

**Критерии приёмки:**

1. Интерфейс корректен на 320 px, tablet и desktop.
2. Все controls доступны с клавиатуры.
3. Ошибки и progress доступны screen reader.
4. Контраст текста и active state соответствует WCAG AA для обычного текста.
5. Reduced-motion отключает декоративные движения.
6. Selection outside lyrics cycles through cyan, pink and yellow; lyric containers use only their approved non-active colors.
7. Визуальная система не использует CDN и случайные декоративные элементы.

**Тесты:** Playwright accessibility smoke, keyboard navigation, reduced-motion screenshot checks and manual visual checklist.

**Негативные сценарии:** narrow viewport, long title, long lyric line, disabled action, missing font fallback.

**Завершение:** UI проходит manual design review и не ломает функциональные acceptance tests.

### Слайс 9 — release hardening

**Цель:** проверить эксплуатационные сценарии локального приложения.

**Файлы:** setup, build config, logging/error pages, documentation comments, final tests.

**Поведение:** production build запускается, data directory configurable, stale jobs recover safely, unified `400`/`404`/`500` error boundary uses the project style, logs do not expose sensitive paths.

**Критерии приёмки:**

1. `npm run build` и `npm run preview` работают.
2. Настройка `KARAOKE_DATA_DIR` меняет location данных.
3. Незавершённые jobs после restart становятся `failed` с безопасным сообщением.
4. Ошибки 400, 404 и 500 имеют единый понятный UI с безопасными сообщениями.
5. Полный `npm run gate` остаётся зелёным.

**Тесты:** production smoke, env path integration, stale job recovery and final e2e suite.

**Негативные сценарии:** read-only data root, interrupted worker, missing model directory, corrupt database backup.

**Завершение:** приложение готово к локальному использованию по всем описанным сценариям.
