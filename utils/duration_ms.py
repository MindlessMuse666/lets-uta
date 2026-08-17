#!/usr/bin/env python3
import sys
import os
import subprocess
import shutil


def get_duration_ms(filepath: str) -> int:
    """
    Возвращает длительность медиафайла в миллисекундах с помощью ffprobe.
    """
    if not os.path.isfile(filepath):
        raise FileNotFoundError(f"Файл не найден: {filepath}")

    cmd = [
        'ffprobe',
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        filepath
    ]

    try:
        output = subprocess.check_output(cmd, stderr=subprocess.STDOUT).decode().strip()
        if not output:
            raise ValueError("ffprobe не вернул данных о длительности")
        duration_sec = float(output)
        return int(round(duration_sec * 1000))
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"Ошибка ffprobe: {e.output.decode()}") from e
    except ValueError as e:
        raise RuntimeError(f"Некорректный вывод длительности: {output}") from e


def main():
    if len(sys.argv) < 2:
        print("Использование: python script.py <путь_к_медиафайлу>")
        sys.exit(1)

    filepath = sys.argv[1]

    # Проверяем наличие ffprobe
    if not shutil.which('ffprobe'):
        print("Ошибка: ffprobe не найден. Установите FFmpeg.", file=sys.stderr)
        sys.exit(1)

    try:
        ms = get_duration_ms(filepath)
        print(ms)
    except Exception as e:
        print(f"Ошибка: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
