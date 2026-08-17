#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re
import json
import argparse
from pathlib import Path

def parse_time(time_str):
    """
    Преобразует время формата H:MM:SS.cc (или 0:00:12.00) в миллисекунды.
    """
    parts = time_str.split(':')
    if len(parts) == 3:
        h = int(parts[0])
        m = int(parts[1])
        sec_parts = parts[2].split('.')
        s = int(sec_parts[0])
        cs = int(sec_parts[1]) if len(sec_parts) > 1 else 0
        return (h * 3600 + m * 60 + s) * 1000 + cs * 10
    else:
        raise ValueError(f"Неверный формат времени: {time_str}")

def parse_ass(file_path):
    """
    Парсит ASS-файл и возвращает список строк с текстом и таймингами.
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    in_events = False
    dialogues = []

    for line in lines:
        line = line.strip()
        if not line:
            continue

        if line.startswith('[Events]'):
            in_events = True
            continue

        if not in_events:
            continue

        # Пропускаем строки Format и комментарии
        if line.startswith('Format:') or line.startswith('Comment:'):
            continue

        if line.startswith('Dialogue:'):
            # Убираем "Dialogue:" и пробелы
            content = line.split(':', 1)[1].strip()
            # Разбиваем на максимум 10 частей (9 запятых) – так текст не разобьётся
            parts = content.split(',', 9)
            # Дополняем до 10 частей, если их меньше (на случай пустого текста)
            while len(parts) < 10:
                parts.append('')

            # Стандартный порядок полей ASS:
            # 0-Layer, 1-Start, 2-End, 3-Style, 4-Name,
            # 5-MarginL, 6-MarginR, 7-MarginV, 8-Effect, 9-Text
            start_str = parts[1].strip()
            end_str = parts[2].strip()
            text = parts[9].strip()

            # Убираем возможные кавычки вокруг текста (иногда ставятся)
            if text.startswith('"') and text.endswith('"'):
                text = text[1:-1]

            # Заменяем \N на перенос строки, если нужно (по желанию)
            # text = text.replace('\\N', '\n')

            if start_str and end_str:  # пропускаем строки без времени
                dialogues.append({
                    'start': parse_time(start_str),
                    'end': parse_time(end_str),
                    'text': text
                })

    return dialogues

def ass_to_json(ass_path, lang='ja', media_path=None, title=None, media_kind='audio', output=None):
    """
    Конвертирует ASS в JSON-структуру.
    """
    dialogues = parse_ass(ass_path)

    if not dialogues:
        print("Предупреждение: в ASS не найдено ни одного диалога.")

    # Собираем текст и тайминги
    text_lines = [d['text'] for d in dialogues]
    timings = [
        {
            'lineIndex': i,
            'startTime': d['start'],
            'endTime': d['end'],
            'source': 'import'
        }
        for i, d in enumerate(dialogues)
    ]

    if title is None:
        title = Path(ass_path).stem

    if media_path is None:
        media_path = str(Path(ass_path).with_suffix('.mp3'))  # по умолчанию

    duration_ms = max([d['end'] for d in dialogues]) if dialogues else 0

    lyrics_entry = {
        'language': lang,
        'isPrimary': True,
        'text': '\n'.join(text_lines),
        'timings': timings
    }

    song = {
        'title': title,
        'filePath': media_path,
        'mediaKind': media_kind,
        'durationMs': duration_ms,
        'meaning': None,
        'composers': [],
        'artists': [],
        'lyrics': [lyrics_entry]
    }

    result = [song]

    if output:
        with open(output, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
    else:
        print(json.dumps(result, ensure_ascii=False, indent=2))

def main():
    parser = argparse.ArgumentParser(description='Конвертировать ASS-файл в JSON-структуру.')
    parser.add_argument('ass_file', help='Путь к входному .ass файлу')
    parser.add_argument('--lang', default='ja', help='Язык субтитров (по умолчанию ja)')
    parser.add_argument('--media', help='Путь к медиа-файлу (по умолчанию имя .ass с расширением .mp3)')
    parser.add_argument('--title', help='Название трека (по умолчанию имя файла)')
    parser.add_argument('--kind', default='audio', choices=['audio', 'video'], help='Тип медиа (audio/video)')
    parser.add_argument('--output', '-o', help='Путь для сохранения JSON (если не указан, выводится в stdout)')
    args = parser.parse_args()

    ass_to_json(
        ass_path=args.ass_file,
        lang=args.lang,
        media_path=args.media,
        title=args.title,
        media_kind=args.kind,
        output=args.output
    )

if __name__ == '__main__':
    main()