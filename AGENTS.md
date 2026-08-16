# AGENTS.md — инструкция для агента проекта

**Версия: v1** (2026-08-17)

Проект — локальный single-user медиаплеер с караоке-режимом для песен с вокалоидами. Единственный источник технической истины — `TECH-TASK.md` в корне репозитория. Перед началом любой задачи прочитай его полностью и используй только описанные в нём публичные контракты.

## Обязанности агента

- Реализовывать слайсы строго по порядку, один слайс за сессию.
- Сначала проверять контракты текущего слайса, затем планировать файлы и acceptance-driven тесты.
- Не выдумывать таблицы, колонки, типы, функции, маршруты, статусы, поля форм или UI-контракты.
- Писать пользовательские тексты, ошибки валидации и сообщения интерфейса на русском языке.
- Писать имена кода, TypeScript-типы, SQL-колонки, логи и сообщения исключений на английском языке.
- Писать тесты по наблюдаемым критериям приёмки и негативным сценариям, а не по внутренней реализации.
- Сохранять строгие границы `src/lib/karaoke/`, `src/lib/server/`, `src/lib/ui/` и `src/routes/`.
- Не смешивать server-only зависимости с browser bundle и не выполнять долгие операции внутри HTTP-запроса.
- После UI-изменений проверять клавиатурную навигацию, фокус, responsive-состояния, reduced-motion и оба режима темы.

## Источники правил и skills

### Документы

1. `TECH-TASK.md` — продуктовые, архитектурные, data, HTTP, UI, тестовые и acceptance-контракты.
2. `.codex/skills/vocaloid-editorial-craft/SKILL.md` — рабочий процесс, Svelte 5 Runes, границы модулей и визуальные правила.
3. `scripts/data/songs_dataset.json` — детерминированная dataset-фикстура для seed и сквозных моков.

Если правило не описано в этих документах, не добавляй его молча. Используй процедуру `CONTRACT GAP`.

### Обязательные технологии

- SvelteKit 2, Svelte 5 Runes, TypeScript `strict`, `@sveltejs/adapter-node`, Vite.
- Node.js 22+, `better-sqlite3`, SQLite WAL и версионируемые SQL-миграции.
- Системный FFmpeg, `onnxruntime-node`, `worker_threads` и `child_process.spawn` для локального media/alignment pipeline.
- Vitest, Playwright, ESLint, Prettier, `svelte-check`, Knip и `fast-check`.
- Собственные Svelte UI-примитивы без UI-фреймворка, CDN и внешнего runtime backend.

## Архитектурные границы

- `src/lib/karaoke/` содержит чистые доменные типы и функции: разбиение текста, валидацию таймингов, сопоставление токенов и проверку архивов. Здесь нет SQLite, SvelteKit request objects и Node-only API.
- `src/lib/server/` содержит SQLite, миграции, файловую систему, FFmpeg, ONNX Runtime, worker management и server orchestration.
- `src/lib/ui/` содержит переиспользуемые визуальные компоненты и не знает о базе данных, filesystem paths и server services.
- `src/routes/` переводит HTTP/form contracts в вызовы domain и server services.
- SQL находится в `db.ts`, `migrations.ts` и специализированных server-модулях. Все значения передаются bind-параметрами.
- `better-sqlite3` и `onnxruntime-node` импортируются только в server/worker-коде.
- Абсолютные пути и технические stack traces не выдаются клиенту.
- Пользовательские медиафайлы не обслуживаются через `static/`; путь из базы проходит проверку внутри data root.

## Порядок работы над слайсом

1. Прочитай `TECH-TASK.md` полностью и найди текущий слайс в разделе 16.
2. Убедись, что для каждого acceptance criterion есть необходимый контракт.
3. Составь локальный план изменяемых/создаваемых файлов и тестов.
4. Реализуй только текущий слайс, используя Svelte 5 Runes и контракты документа.
5. Напиши тесты, связывающие каждый критерий приёмки с наблюдаемым результатом.
6. Для UI-слайса проверь сценарии в браузере на desktop, tablet и mobile, если это применимо.
7. Запусти `npm run gate`.
8. Проверь Definition of Done из раздела 14 `TECH-TASK.md`.
9. Создай небольшой Conventional Commit только после успешной проверки.

Не перескакивай на следующий слайс, не расширяй область задачи и не оставляй закомментированный код.

## Тесты и гейт

Тесты должны закрывать критерии, а не подтверждать детали конкретной реализации.

- Unit: чистая валидация upload, `splitText`, `validateTimings`, `mapTokensToLines`, path safety, archive manifest и parsing settings.
- Integration: миграции на `:memory:`, foreign keys, cascade delete, JSON-массивы, транзакционный upload, media cleanup, idempotent timings, сохранение старых timings при ошибке sync, job transitions, cancellation и archive rollback.
- E2E: используй `scripts/data/songs_dataset.json`, deterministic media fixtures и mock alignment adapter; проверяй upload, библиотеку, player, active line, sync polling, ручные timings, редактирование, удаление, тему, импорт/экспорт, ошибки и keyboard-only сценарии.
- Property-based: проверяй инварианты нормализации строк, timing validation и round-trip сериализации допустимых доменных объектов.
- Реальную ONNX-модель не запускай в обычном CI acceptance suite; отдельная проверка модели выполняется только через setup/integration check.

Обязательная последовательность гейта:

```bash
npm run format:check
npm run lint
npm run check
npm run knip
npm run test
```

Или одной командой:

```bash
npm run gate
```

Если гейт не проходит, слайс не считается завершённым.

## Контракт Forced Alignment

Долгий pipeline выполняется асинхронно через `sync-manager` и worker. Не запускай FFmpeg, ONNX или длительное чтение PCM прямо в form action или endpoint.

Соблюдай полный порядок: `queued` → `running` → подготовка mono PCM 16 kHz → `alignLyrics` → `mapTokensToLines` → проверка всех непустых строк → атомарная запись `source = 'auto'` → `succeeded`.

При отмене, падении worker, недоступном FFmpeg/модели, `null`-результате или неполном mapping старые timings сохраняются, частичный результат не записывается, временные файлы удаляются, а job получает безопасное состояние и сообщение.

## UI и визуальные правила

- Используй только Svelte 5 Runes: `$state`, `$derived`, `$effect`, `$props`, snippets и `{@render ...}`.
- Не используй `export let`, `$:`, `<slot />`, `on:*`, `createEventDispatcher` и browser imports server-модулей.
- Собирай editorial cyber-pop интерфейс как музыкальный инструмент и каталог: асимметричная, но ясная композиция, тёплые paper/graphite поверхности, локальная выразительная типографика.
- Cyan `#00E5FF`, pink `#FF4081` и yellow `#FFD543` применяй как дозированные семантические сигналы, а не как постоянное свечение.
- Не добавляй generic glassmorphism, случайные gradients, декоративные blobs, постоянный neon glow или шаблонную AI-композицию.
- Храни лицензированные шрифты в `static/fonts/`; не используй внешние CDN.
- Сохраняй пользовательские переносы строк. Karaoke-подсветка должна быть построчной и дискретной; active line получает `aria-current="true"`.
- При отсутствии timings показывай читаемый текст и доступное действие синхронизации/редактирования.
- Каждый control имеет доступное имя, видимый `focus-visible`, keyboard behavior и состояние ошибки/loading для screen reader.
- Не скрывай active lyric и основные controls на ширине 320 px; учитывай длинные заголовки, длинные строки, empty/error/loading states.

## Если контракта недостаточно

Остановись и выведи точный блок:

```text
CONTRACT GAP
Что нужно: <поле, тип, функция, маршрут или правило>
Зачем: <какой критерий приёмки невозможно выполнить>
Предлагаемая форма: <точная сигнатура, колонка, маршрут или схема>
Что делаю пока: жду согласования и не добавляю выдуманный контракт
```

Не заменяй `CONTRACT GAP` временным типом, скрытым полем, неописанным route или несовместимой локальной заглушкой.

## Коммиты

- Формат: `type(scope): <краткое описание>`.
- Допустимые type: `feat`, `fix`, `test`, `refactor`, `chore`, `docs`.
- Описание на русском языке, со строчной буквы, без точки.
- Максимальная длина заголовка — 72 символа.
- Комментарий объясняет причину сложного решения, а не очевидное действие.
- Никнейм в GitHub: [MindlessMuse666](https://github.com/MindlessMuse666).

Примеры:

```text
feat(upload): добавлена безопасная загрузка медиа
test(sync): покрыта отмена задачи элаймента
fix(player): исправлена подсветка строки после перемотки
docs(spec): уточнён контракт архива
```

Не создавай коммит, пока acceptance criteria, негативные сценарии, проверка UI и `npm run gate` не выполнены.
