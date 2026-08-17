import { splitText } from './lines';
import type { SecondaryLanguage, UploadInput } from './types';

const MAX_MEDIA_SIZE = 100 * 1024 * 1024;
const MAX_TITLE_LENGTH = 200;
const MAX_LYRIC_LENGTH = 8191;
const MAX_MEANING_LENGTH = 4000;
const MAX_PEOPLE = 20;
const MAX_PERSON_LENGTH = 100;
const secondaryLanguages = new Set<SecondaryLanguage>(['ru', 'en']);

type RawSecondaryLyric = {
  text: string;
  language: SecondaryLanguage;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeText(value: string): string {
  return value.replace(/\r\n?/g, '\n');
}

function parseSecondaryLyric(value: unknown): RawSecondaryLyric | undefined | null {
  if (value === undefined || value === null || value === '') return undefined;

  let parsed: unknown = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!isRecord(parsed)) return null;
  if (
    typeof parsed.text !== 'string' ||
    typeof parsed.language !== 'string' ||
    !secondaryLanguages.has(parsed.language as SecondaryLanguage) ||
    parsed.text.trim() === '' ||
    parsed.text.length > MAX_LYRIC_LENGTH
  ) {
    return null;
  }
  return { text: normalizeText(parsed.text), language: parsed.language as SecondaryLanguage };
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
  secondaryLyric?: unknown;
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

  const primaryLyric =
    typeof data.primaryLyric === 'string' ? normalizeText(data.primaryLyric) : '';
  if (!primaryLyric.trim()) fieldErrors.primaryLyric = 'Основной текст обязателен';
  else if (primaryLyric.length > MAX_LYRIC_LENGTH) {
    fieldErrors.primaryLyric = 'Текст слишком длинный';
  }

  const secondaryLyric = parseSecondaryLyric(data.secondaryLyric);
  if (secondaryLyric === null) fieldErrors.secondaryLyric = 'Неверно указан язык';

  const meaning = data.meaning === undefined ? '' : data.meaning;
  if (typeof meaning !== 'string') fieldErrors.meaning = 'Некорректное описание';
  else if (meaning.length > MAX_MEANING_LENGTH) fieldErrors.meaning = 'Описание слишком длинное';

  const composers = parsePeople(data.composers);
  if (!composers) fieldErrors.composers = 'Некорректный список композиторов';
  const artists = parsePeople(data.artists);
  if (!artists) fieldErrors.artists = 'Некорректный список исполнителей';

  if (
    secondaryLyric &&
    primaryLyric.trim() &&
    splitText(secondaryLyric.text).length !== splitText(primaryLyric).length
  ) {
    fieldErrors.secondaryLyric = 'Количество строк перевода должно совпадать с японским текстом';
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  return {
    ok: true,
    value: {
      file: data.file as File,
      title,
      primaryLyric,
      ...(secondaryLyric ? { secondaryLyric } : {}),
      meaning: (meaning as string).trim() || undefined,
      composers: composers as string[],
      artists: artists as string[]
    }
  };
}

export function validateTranslationInput(data: {
  text: unknown;
  language: unknown;
  primaryText: string;
}):
  | { ok: true; value: { text: string; language: SecondaryLanguage } }
  | { ok: false; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  const language = data.language;
  if (typeof language !== 'string' || !secondaryLanguages.has(language as SecondaryLanguage)) {
    fieldErrors.language = 'Неверно указан язык';
  }

  const text = typeof data.text === 'string' ? normalizeText(data.text) : '';
  if (!text.trim()) fieldErrors.text = 'Основной текст обязателен';
  else if (text.length > MAX_LYRIC_LENGTH) fieldErrors.text = 'Текст слишком длинный';
  else if (splitText(text).length !== splitText(data.primaryText).length) {
    fieldErrors.text = 'Количество строк перевода должно совпадать с японским текстом';
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return {
    ok: true,
    value: { text, language: language as SecondaryLanguage }
  };
}
