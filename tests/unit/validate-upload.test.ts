import { describe, expect, it } from 'vitest';
import { validateTranslationInput, validateUploadInput } from '../../src/lib/karaoke/validate';

function mediaFile(name = 'song.mp3', type = 'audio/mpeg', size = 4): File {
  return new File([new Uint8Array(size)], name, { type });
}

const validInput = () => ({
  title: '  Paper Satellites  ',
  file: mediaFile(),
  primaryLyric: '一行目\n二行目',
  secondaryLyric: { language: 'en', text: 'First line\nSecond line' },
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
        primaryLyric: '一行目\n二行目',
        composers: ['A', 'B'],
        artists: ['Artist'],
        secondaryLyric: { language: 'en', text: 'First line\nSecond line' }
      })
    });
  });

  it('reports required fields and unsupported media', () => {
    const result = validateUploadInput({
      title: ' ',
      file: mediaFile('song.txt', 'text/plain'),
      primaryLyric: ''
    });

    expect(result).toEqual({
      ok: false,
      fieldErrors: expect.objectContaining({
        title: 'Название обязательно',
        file: 'Неверный формат файла',
        primaryLyric: 'Основной текст обязателен'
      })
    });
  });

  it('rejects oversized media and invalid secondary language', () => {
    const result = validateUploadInput({
      ...validInput(),
      file: mediaFile('song.mp3', 'audio/mpeg', 100 * 1024 * 1024 + 1),
      secondaryLyric: { language: 'ja', text: '翻訳\n翻訳' }
    });

    expect(result).toEqual({
      ok: false,
      fieldErrors: expect.objectContaining({
        file: 'Файл слишком большой (макс. 100 МБ)',
        secondaryLyric: 'Неверно указан язык'
      })
    });
  });

  it('rejects line-count mismatch and overlong lyrics', () => {
    const result = validateUploadInput({
      ...validInput(),
      primaryLyric: `${'x'.repeat(8191)}\ny`,
      secondaryLyric: { language: 'ru', text: 'Одна строка' }
    });

    expect(result).toEqual({
      ok: false,
      fieldErrors: expect.objectContaining({
        primaryLyric: 'Текст слишком длинный',
        secondaryLyric: 'Количество строк перевода должно совпадать с японским текстом'
      })
    });
  });

  it('validates standalone translation input against primary ja lines', () => {
    expect(
      validateTranslationInput({
        language: 'ru',
        text: 'Первая\r\nВторая',
        primaryText: '一行目\n二行目'
      })
    ).toEqual({
      ok: true,
      value: { language: 'ru', text: 'Первая\nВторая' }
    });

    expect(
      validateTranslationInput({
        language: 'ja',
        text: 'Одна строка',
        primaryText: '一行目\n二行目'
      })
    ).toEqual({
      ok: false,
      fieldErrors: expect.objectContaining({
        language: 'Неверно указан язык',
        text: 'Количество строк перевода должно совпадать с японским текстом'
      })
    });
  });
});
