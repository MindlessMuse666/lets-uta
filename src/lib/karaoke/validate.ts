import type { Language, UploadInput } from './types';

const MAX_MEDIA_SIZE = 100 * 1024 * 1024;
const MAX_TITLE_LENGTH = 200;
const MAX_LYRIC_LENGTH = 8191;
const MAX_MEANING_LENGTH = 4000;
const MAX_PEOPLE = 20;
const MAX_PERSON_LENGTH = 100;
const languages = new Set<Language>(['ru', 'ja', 'en']);

type RawSecondaryLyric = {
  text: string;
  language: Language;
};

function parsePeople(value: unknown): string[] | null {
  if (value === undefined || value === null || value === '') return [];

  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : null;
  if (!values || !values.every((item) => typeof item === 'string')) return null;

  const people = values.map((item) => item.trim()).filter(Boolean);
  if (people.length > MAX_PEOPLE || people.some((person) => person.length > MAX_PERSON_LENGTH)) {
    return null;
  }
  return people;
}

function parseSecondaryLyrics(value: unknown): RawSecondaryLyric[] | null {
  if (value === undefined || value === null || value === '') return [];

  let parsed: unknown = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(parsed)) return null;

  const lyrics: RawSecondaryLyric[] = [];
  for (const item of parsed) {
    if (
      typeof item !== 'object' ||
      item === null ||
      Array.isArray(item) ||
      typeof item.text !== 'string' ||
      typeof item.language !== 'string' ||
      !languages.has(item.language as Language) ||
      item.text.trim() === '' ||
      item.text.length > MAX_LYRIC_LENGTH
    ) {
      return null;
    }
    lyrics.push({ text: item.text, language: item.language as Language });
  }
  return lyrics;
}

function hasAllowedMediaType(file: File): boolean {
  const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
  const accepted = new Map([
    ['.mp3', new Set(['audio/mpeg', 'audio/mp3'])],
    ['.ogg', new Set(['audio/ogg', 'application/ogg'])],
    ['.mp4', new Set(['video/mp4'])]
  ]);
  return accepted.get(extension)?.has(file.type) ?? false;
}

export function validateUploadInput(data: {
  title: unknown;
  file: File | undefined;
  primaryLyric: unknown;
  primaryLanguage: unknown;
  secondaryLyrics?: unknown;
  meaning?: unknown;
  composers?: unknown;
  artists?: unknown;
}): { ok: true; value: UploadInput } | { ok: false; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  if (!title) fieldErrors.title = 'Название обязательно';
  else if (title.length > MAX_TITLE_LENGTH) fieldErrors.title = 'Название слишком длинное';

  if (!data.file) fieldErrors.file = 'Файл обязателен';
  else if (data.file.size > MAX_MEDIA_SIZE) {
    fieldErrors.file = 'Файл слишком большой (макс. 100 МБ)';
  } else if (!hasAllowedMediaType(data.file)) {
    fieldErrors.file = 'Неверный формат файла';
  }

  const primaryLyric = typeof data.primaryLyric === 'string' ? data.primaryLyric : '';
  if (!primaryLyric.trim()) fieldErrors.primaryLyric = 'Основной текст обязателен';
  else if (primaryLyric.length > MAX_LYRIC_LENGTH) {
    fieldErrors.primaryLyric = 'Текст слишком длинный';
  }

  const primaryLanguage = data.primaryLanguage;
  if (typeof primaryLanguage !== 'string' || !languages.has(primaryLanguage as Language)) {
    fieldErrors.primaryLanguage = 'Неверно указан язык';
  }

  const secondaryLyrics = parseSecondaryLyrics(data.secondaryLyrics);
  if (!secondaryLyrics) fieldErrors.secondaryLyrics = 'Некорректный список текстов';

  const meaning = data.meaning === undefined ? '' : data.meaning;
  if (typeof meaning !== 'string') fieldErrors.meaning = 'Некорректное описание';
  else if (meaning.length > MAX_MEANING_LENGTH) fieldErrors.meaning = 'Описание слишком длинное';

  const composers = parsePeople(data.composers);
  if (!composers) fieldErrors.composers = 'Некорректный список композиторов';
  const artists = parsePeople(data.artists);
  if (!artists) fieldErrors.artists = 'Некорректный список исполнителей';

  if (secondaryLyrics && typeof primaryLanguage === 'string') {
    const usedLanguages = new Set([primaryLanguage]);
    for (const lyric of secondaryLyrics) {
      if (usedLanguages.has(lyric.language)) {
        fieldErrors.secondaryLyrics = 'Язык уже используется';
        break;
      }
      usedLanguages.add(lyric.language);
    }
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  return {
    ok: true,
    value: {
      file: data.file as File,
      title,
      primaryLyric,
      primaryLanguage: primaryLanguage as Language,
      secondaryLyrics: secondaryLyrics as RawSecondaryLyric[],
      meaning: (meaning as string).trim() || undefined,
      composers: composers as string[],
      artists: artists as string[]
    }
  };
}
