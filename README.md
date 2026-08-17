<div align="center">

# 🎤 Lets Uta!

<p>
  Локальный караоке-медиаплеер для вокалоидов: библиотека, upload, playback, общий timing для `ja` и асинхронный перевод без облака.
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

- Локальная библиотека песен с фильтрами по title, language и artist.
- Upload для MP3, OGG и MP4 с безопасным сохранением файлов в data root.
- Playback page с discrete karaoke highlighting и hotkeys.
- Primary `ja` lyric и один secondary `ru` или `en`.
- Асинхронное добавление перевода через отдельный action.
- Shared timings: перевод использует тот же `lineIndex`, что и основной текст.

## Скриншоты

| Библиотека                                                                             | Playback                                                                                |
| :------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------- |
| <img src="docs/screenshots/library-view.png" alt="Библиотека Lets Uta" width="100%" /> | <img src="docs/screenshots/player-playback.png" alt="Playback Lets Uta" width="100%" /> |

| Upload                                                                            |     |
| :-------------------------------------------------------------------------------- | :-- |
| <img src="docs/screenshots/upload-view.png" alt="Upload Lets Uta" width="100%" /> |     |

## Технологии

- Node.js 22+
- SvelteKit 2
- Svelte 5 Runes
- TypeScript strict
- `@sveltejs/adapter-node`
- `better-sqlite3`
- SQLite WAL
- FFmpeg
- `onnxruntime-node`
- Vitest, Playwright, ESLint, Prettier, `svelte-check`, Knip, `fast-check`

## Скрипты

```bash
npm install
npm run setup
npm run seed
npm run dev
npm run build
npm run preview
npm run test:unit
npm run test:integration
npm run test:e2e
npm run gate
```

## Текущий фокус

- Stage 3.1: playback и translation
- Stage 4: async Forced Alignment
- Stage 5: manual timing editor
- Stage 6: editing, settings, export/import

## Автор

MindlessMuse666

## Лицензия

GNU General Public License v3.0, см. [LICENSE](LICENSE).
