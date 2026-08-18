---
name: lets-uta-readme-craft
description: Create human-crafted, non-AI-slop, clean and professional README.md documentation specifically for the lets-uta - Vocaloid local karaoke player project. Includes editorial cyber-pop styling, curated shields.io badges, interface screenshots gallery, accurate tech stack, complete gate/test/run commands, GPL-3.0 license, and MindlessMuse666 author credits.
---

# Lets Uta README Craft

**Version: v2.1 (18 августа, 2026)**

Use this skill to generate, update, or review the `README.md` file for the **Lets Uta!** - Vocaloid local karaoke media player project.

---

## 1. Core Principles ("No AI-Slop")

1. **Concrete & Direct Tone**: No generic promotional filler (_"A state-of-the-art solution..."_, _"Empowering music lovers..."_). Explain directly what the application does: local playback, forced alignment, line-by-line discrete karaoke highlights, offline architecture.
2. **Editorial Cyber-Pop Aesthetic**: Clean typography, disciplined badge colors (`#00E5FF`, `#FF4081`, `#FFD543`), structured tables, clear visual hierarchy.
3. **Exact Script Alignment**: Every command in the README must match `package.json` and `TECH-TASK.md` without omissions.
4. **Visual Gallery**: Showcase light/dark theme, side-by-side Japanese and translation layout, manual timing editor, and library views.
5. **Accurate Metadata**:
   - **Author**: [@MindlessMuse666](https://github.com/MindlessMuse666)
   - **License**: `GNU General Public License v3.0` (`GPL-3.0`)
6. **Required README landmarks**:
   - Put `logo_lets_uta_v1.png` in the top centered brand block, with a useful Russian `alt` text.
   - Explain the first-run startup order, prerequisites, expected local URL, and the purpose of each setup command.
   - End the README with a compact footer containing the logo, project name, and author credit link.

---

## 2. README.md Standard Template for This Project

````markdown
<div align="center">

<img src="logo_lets_uta_v1.png" alt="Логотип Lets Uta" width="112" height="112" />

# 🎤 Lets Uta!

<p align="center">
  <strong>Локальный караоке-медиаплеер для вокалоидов с поддержкой синхронизации Forced Alignment и переводов.</strong>
</p>

[![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Svelte 5](https://img.shields.io/badge/Svelte-5_Runes-FF3E00?style=flat-square&logo=svelte&logoColor=white)](https://svelte.dev)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-2.x-FF3E00?style=flat-square&logo=svelte&logoColor=white)](https://kit.svelte.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x_Strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![SQLite](https://img.shields.io/badge/SQLite-WAL_Mode-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://sqlite.org)
[![ONNX Runtime](https://img.shields.io/badge/ONNX_Runtime-Node.js-005CED?style=flat-square&logo=onnx&logoColor=white)](https://onnxruntime.ai)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-Local_Decoding-007808?style=flat-square&logo=ffmpeg&logoColor=white)](https://ffmpeg.org)
[![License: GPL v3](https://img.shields.io/badge/License-GPL_v3-blue.svg?style=flat-square)](LICENSE)

</div>

---

## 📸 Скриншоты и интерфейс

<div align="center">
  <img src="docs/screenshots/player-playback-dark.png" alt="Воспроизведение и караоке в тёмной теме" width="90%" />
  <p><em>Воспроизведение песни: плеер, основной японский текст и синхронизированный русский перевод</em></p>
</div>

|                             📚 Библиотека и фильтры                             |                              ⏱️ Ручной редактор таймингов                               |
| :-----------------------------------------------------------------------------: | :-------------------------------------------------------------------------------------: |
| <img src="docs/screenshots/library-view.png" width="440" alt="Каталог песен" /> | <img src="docs/screenshots/timeline-editor.png" width="440" alt="Редактор таймингов" /> |

|                           📤 Загрузка медиа и текстов                           |                               ⚙️ Настройки и экспорт                                |
| :-----------------------------------------------------------------------------: | :---------------------------------------------------------------------------------: |
| <img src="docs/screenshots/upload-view.png" width="440" alt="Загрузка песни" /> | <img src="docs/screenshots/settings-view.png" width="440" alt="Настройки плеера" /> |

---

## ⚡ Особенности

- **Local-First & Offline**: Все данные, медиафайлы и SQLite-база хранятся локально на диске. Никаких внешних облаков, аналитики и передачи данных.
- **Forced Alignment**: Автоматическая построчная синхронизация аудио/видео с японским текстом с помощью локальной ONNX-модели и FFmpeg.
- **Двуязычные тексты**: Обязательный оригинальный японский текст (`ja`) с возможностью асинхронного добавления перевода (`ru` или `en`) без прерывания воспроизведения.
- **Дискретная караоке-подсветка**: Высококонтрастное выделение активной строки, ненавязчивый автоскролл и кастомная палитра выделения (cyan `#00E5FF`, pink `#FF4081`, yellow `#FFD543`).
- **Полный ручной контроль**: Встроенный редактор таймингов для точной покадровой правки строк.
- **Переносимость**: Полный экспорт и импорт библиотеки в архив (`.zip`) с проверкой целостности.

---

## 🛠️ Стек технологий

- **Runtime & Frontend**: Node.js `22+`, SvelteKit 2, Svelte 5 (Runes), TypeScript (strict mode), Vite.
- **Хранение данных**: SQLite (`better-sqlite3`) с WAL-режимом и версионируемыми SQL-миграциями.
- **Медиа и ML**: FFmpeg (системный декодер), `onnxruntime-node` (CTC Forced Alignment модель), `worker_threads`.
- **Тестирование и линтинг**: Vitest, Playwright, ESLint, Prettier, `svelte-check`, Knip, `fast-check`.

---

## 🚀 Быстрый старт

The startup section must be a runnable sequence, not an unexplained command list. State that `npm run setup` is the first project command because it checks Node.js and FFmpeg and creates local directories; state that `npm run seed` is optional demo data; then show the development URL and a separate production preview flow.

### Системные требования

- **Node.js** `22.0.0` или выше
- **FFmpeg**, установленный в системе и доступный в `$PATH`

### 1. Клонирование и установка

```bash
# Клонирование репозитория
git clone https://github.com/MindlessMuse666/lets-uta.git
cd lets-uta

# Установка зависимостей
npm install

# Проверка окружения, создание структуры каталогов и подготовка моделей
npm run setup

# (Опционально) Заполнение базы тестовым набором песен
npm run seed
```
````

### 2. Запуск приложения

```bash
# Режим разработки
npm run dev
# или `npm run dev -- --host 127.0.0.1 --port 4173`

# Продакшн-сборка и предпросмотр
npm run build
npm run preview
```

---

## 🧪 Скрипты, тестирование и контроль качества

Describe every listed npm script in Russian. Keep the command table only as a compact reference after the explanatory startup sequence; do not present a bare block of commands without context.

Перед каждым коммитом и релизом запускается полный гейт проверок:

```bash
# Запуск полного гейта (форматирование, линтинг, типы, knip, все тесты)
npm run gate
```

| Команда                    | Назначение                                            |
| :------------------------- | :---------------------------------------------------- |
| `npm run setup`            | Проверка Node.js, системного FFmpeg и ONNX-моделей    |
| `npm run seed`             | Заполнение базы данных тестовым набором песен         |
| `npm run dev`              | Запуск сервера разработки Vite                        |
| `npm run build`            | Сборка приложения с `@sveltejs/adapter-node`          |
| `npm run preview`          | Локальный запуск production-сборки                    |
| `npm run test`             | Запуск всех тестов (Unit + Integration + E2E)         |
| `npm run test:unit`        | Модульные тесты доменной логики и валидации (Vitest)  |
| `npm run test:integration` | Интеграционные тесты БД и воркеров (Vitest)           |
| `npm run test:e2e`         | Сквозные браузерные тесты интерфейса (Playwright)     |
| `npm run lint`             | Проверка кода через ESLint                            |
| `npm run check`            | Проверка типов Svelte и TypeScript (`svelte-check`)   |
| `npm run knip`             | Поиск неиспользуемых файлов, экспортов и зависимостей |
| `npm run format`           | Автоматическое форматирование кода через Prettier     |
| `npm run format:check`     | Проверка форматирования без изменения файлов          |

---

## 👤 Автор

**MindlessMuse666**

- GitHub: [@MindlessMuse666](https://github.com/MindlessMuse666)

---

## 📄 Лицензия

Этот проект распространяется под лицензией **GNU General Public License v3.0 (GPL-3.0)**. Подробности см. в файле [LICENSE](LICENSE).

<div align="center">
  <img src="logo_lets_uta_v1.png" alt="Логотип Lets Uta" width="88" height="88" />
  <br>
  <sub><b>Lets Uta // Локальное караоке для вокалоидов</b></sub>
  <br>
  <sup><i>made with ❤️ by <a href="https://github.com/MindlessMuse666">MindlessMuse666</a></i></sup>
</div>
