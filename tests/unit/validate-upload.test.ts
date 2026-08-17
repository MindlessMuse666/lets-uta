import { describe, expect, it } from 'vitest';
import { validateUploadInput } from '../../src/lib/karaoke/validate';

function mediaFile(name = 'song.mp3', type = 'audio/mpeg', size = 4): File {
  return new File([new Uint8Array(size)], name, { type });
}

const validInput = () => ({
  title: '  Paper Satellites  ',
  file: mediaFile(),
  primaryLyric: 'Первая строка\nВторая строка',
  primaryLanguage: 'ru',
  secondaryLyrics: JSON.stringify([{ language: 'en', text: 'First line' }]),
  meaning: 'Заметка',
  composers: 'A, B',
  artists: ['Artist']
});

describe('upload validation', () => {
  it('normalizes title and comma-separated people while preserving lyrics', () => {
    const result = validateUploadInput(validInput());

    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        title: 'Paper Satellites',
        primaryLyric: 'Первая строка\nВторая строка',
        composers: ['A', 'B'],
        artists: ['Artist'],
        secondaryLyrics: [{ language: 'en', text: 'First line' }]
      })
    });
  });

  it('reports required fields and unsupported media', () => {
    const result = validateUploadInput({
      title: ' ',
      file: mediaFile('song.txt', 'text/plain'),
      primaryLyric: '',
      primaryLanguage: 'fr'
    });

    expect(result).toEqual({
      ok: false,
      fieldErrors: expect.objectContaining({
        title: 'Название обязательно',
        file: 'Неверный формат файла',
        primaryLyric: 'Основной текст обязателен',
        primaryLanguage: 'Неверно указан язык'
      })
    });
  });

  it('rejects oversized media and duplicate lyric languages', () => {
    const result = validateUploadInput({
      ...validInput(),
      file: mediaFile('song.mp3', 'audio/mpeg', 100 * 1024 * 1024 + 1),
      secondaryLyrics: JSON.stringify([
        { language: 'ru', text: 'Повтор' },
        { language: 'en', text: 'English' },
        { language: 'en', text: 'Ещё English' }
      ])
    });

    expect(result).toEqual({
      ok: false,
      fieldErrors: expect.objectContaining({
        file: 'Файл слишком большой (макс. 100 МБ)',
        secondaryLyrics: 'Язык уже используется'
      })
    });
  });

  it('rejects malformed JSON arrays and overlong lyrics', () => {
    const result = validateUploadInput({
      ...validInput(),
      primaryLyric: 'x'.repeat(8192),
      secondaryLyrics: '{broken'
    });

    expect(result).toEqual({
      ok: false,
      fieldErrors: expect.objectContaining({
        primaryLyric: 'Текст слишком длинный',
        secondaryLyrics: 'Некорректный список текстов'
      })
    });
  });
});
