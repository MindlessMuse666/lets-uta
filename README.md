<div align="center">

<img src="logo_lets_uta_v1.png" alt="Логотип Lets Uta" width="128" height="128" />

# 🎤 Lets Uta!

<p>
  Локальный караоке-медиаплеер для вокалоидов: библиотека, playback, построчная синхронизация и перевод без облака.
</p>

[![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Svelte](https://img.shields.io/badge/Svelte-5_Runes-FF3E00?style=flat-square&logo=svelte&logoColor=white)](https://svelte.dev)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-2.x-FF3E00?style=flat-square&logo=svelte&logoColor=white)](https://kit.svelte.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![SQLite](https://img.shields.io/badge/SQLite-WAL-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://sqlite.org)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-local_decode-007808?style=flat-square&logo=ffmpeg&logoColor=white)](https://ffmpeg.org)
[![License: GPL v3](https://img.shields.io/badge/License-GPL_3.0-blue.svg?style=flat-square)](LICENSE)

</div>

## Что уже есть

- Локальная библиотека песен с фильтрами по `title`, `language` и `artist`.
- Upload для MP3, OGG и MP4 с безопасным сохранением файлов в data root.
- Playback с дискретной karaoke-подсветкой, переводом и keyboard shortcuts.
- Primary lyric на `ja` и не более одного secondary lyric на `ru` или `en`.
- Общий набор timings для оригинала и перевода по одному `lineIndex`.
- Асинхронная синхронизация: очередь, прогресс, отмена и сохранение старых timings при ошибке.

## Скриншоты

|                                       Библиотека                                       |                                        Playback                                         |
| :------------------------------------------------------------------------------------: | :-------------------------------------------------------------------------------------: |
| <img src="docs/screenshots/library-view.png" alt="Библиотека Lets Uta" width="100%" /> | <img src="docs/screenshots/player-playback.png" alt="Playback Lets Uta" width="100%" /> |

|                                      Upload                                       |     |
| :-------------------------------------------------------------------------------: | :-: |
| <img src="docs/screenshots/upload-view.png" alt="Upload Lets Uta" width="100%" /> |     |

## Технологии

- Node.js 22+, SvelteKit 2, Svelte 5 Runes, TypeScript strict и Vite.
- `@sveltejs/adapter-node`, `better-sqlite3`, SQLite WAL и версионируемые миграции.
- Системный FFmpeg, `worker_threads` и локальный Forced Alignment pipeline.
- Vitest, Playwright, ESLint, Prettier, `svelte-check`, Knip и `fast-check`.

## Быстрый старт

### Требования

- Node.js `22.0.0` или новее.
- Системный FFmpeg, доступный в `$PATH`.

### Установка и первый запуск

Выполняйте команды из корня репозитория по порядку:

```bash
git clone https://github.com/MindlessMuse666/lets-uta.git
cd lets-uta
npm install
npm run setup
npm run seed
npm run dev
```

Что делает каждый шаг:

1. `npm install` устанавливает зависимости проекта.
2. `npm run setup` проверяет Node.js и FFmpeg и создаёт каталоги `data/media`, `data/archives`, `data/models` и `data/tmp`. Без FFmpeg команда завершится понятной ошибкой — установите FFmpeg и повторите её.
3. `npm run seed` — необязательный шаг: добавляет детерминированный набор демонстрационных песен. Seed идемпотентен, его можно запускать повторно.
4. `npm run dev` запускает локальный сервер разработки. Откройте `http://localhost:5173/`.

Если нужен фиксированный адрес для ручной проверки, используйте `npm run dev -- --host 127.0.0.1 --port 4173`.

### Production preview

```bash
npm run build
npm run preview
```

`npm run build` собирает production bundle, а `npm run preview` запускает локальный просмотр сборки. Для отдельного каталога данных задайте `KARAOKE_DATA_DIR` до запуска команд приложения.

## Скрипты

| Команда                    | Назначение                                                                                             |
| :------------------------- | :----------------------------------------------------------------------------------------------------- |
| `npm run prepare`          | Генерирует SvelteKit-конфигурацию типов; обычно вызывается автоматически после установки зависимостей. |
| `npm run setup`            | Проверяет Node.js и FFmpeg и подготавливает каталоги данных.                                           |
| `npm run seed`             | Заполняет SQLite детерминированным dataset.                                                            |
| `npm run dev`              | Запускает Vite dev server для разработки.                                                              |
| `npm run build`            | Собирает production bundle через SvelteKit и adapter-node.                                             |
| `npm run preview`          | Запускает локальный preview production-сборки.                                                         |
| `npm run format`           | Форматирует проект с помощью Prettier.                                                                 |
| `npm run format:check`     | Проверяет форматирование без изменения файлов.                                                         |
| `npm run lint`             | Запускает ESLint.                                                                                      |
| `npm run check`            | Проверяет Svelte и TypeScript через `svelte-check`.                                                    |
| `npm run knip`             | Ищет неиспользуемые файлы, экспорты и зависимости.                                                     |
| `npm run test:unit`        | Запускает unit-тесты доменной логики через Vitest.                                                     |
| `npm run test:integration` | Проверяет SQLite, миграции, media и sync jobs.                                                         |
| `npm run test:e2e`         | Запускает браузерные acceptance-тесты через Playwright.                                                |
| `npm run test`             | Последовательно запускает unit, integration и E2E-тесты.                                               |
| `npm run gate`             | Запускает полный обязательный гейт: format, lint, check, knip и все тесты.                             |

Перед коммитом используйте `npm run gate`; CI дополнительно выполняет `npm run build`.

## Хранение данных

По умолчанию SQLite-база, медиа и временные файлы находятся в `data/` и не обслуживаются через `static/`. Чтобы использовать другой каталог данных, задайте `KARAOKE_DATA_DIR` в окружении процесса.

## Текущий фокус

- Stage 4: async Forced Alignment — реализован.
- Stage 5: ручной редактор timings.
- Stage 6: редактирование, настройки, экспорт и импорт.

## Автор и лицензия

Автор: [MindlessMuse666](https://github.com/MindlessMuse666).

Проект распространяется по лицензии [GNU General Public License v3.0](LICENSE).

<div align="center">
  <img src="logo_lets_uta_v1.png" alt="Логотип Lets Uta" width="88" height="88" />
  <br>
  <sub><b>Lets Uta // Локальное караоке для вокалоидов</b></sub>
  <br>
  <sup><i>made with ❤️ by <a href="https://github.com/MindlessMuse666">MindlessMuse666</a></i></sup>
</div>
