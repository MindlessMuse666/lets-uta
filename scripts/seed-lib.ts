import type { Language, MediaKind, TimingSource } from '../src/lib/karaoke/types';
import { splitText } from '../src/lib/karaoke/lines';

type DatasetTiming = {
  lineIndex: number;
  startTime: number;
  endTime: number;
  source: TimingSource;
};

type DatasetLyric = {
  language: Language;
  isPrimary: boolean;
  text: string;
  timings: DatasetTiming[];
};

type DatasetSong = {
  title: string;
  filePath: string;
  mediaKind: MediaKind;
  durationMs: number;
  meaning: string | null;
  composers: string[];
  artists: string[];
  lyrics: DatasetLyric[];
};

const languages = new Set<Language>(['ru', 'ja', 'en']);
const mediaKinds = new Set<MediaKind>(['audio', 'video']);
const timingSources = new Set<TimingSource>(['auto', 'manual', 'import']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function parseTiming(value: unknown, durationMs: number): DatasetTiming {
  if (!isRecord(value)) throw new Error('Dataset timing must be an object');
  if (
    typeof value.lineIndex !== 'number' ||
    !Number.isInteger(value.lineIndex) ||
    value.lineIndex < 0 ||
    typeof value.startTime !== 'number' ||
    !Number.isInteger(value.startTime) ||
    value.startTime < 0 ||
    typeof value.endTime !== 'number' ||
    !Number.isInteger(value.endTime) ||
    value.endTime <= value.startTime ||
    value.endTime > durationMs ||
    typeof value.source !== 'string' ||
    !timingSources.has(value.source as TimingSource)
  ) {
    throw new Error('Dataset timing has invalid fields');
  }
  return {
    lineIndex: value.lineIndex,
    startTime: value.startTime,
    endTime: value.endTime,
    source: value.source as TimingSource
  };
}

function parseLyric(value: unknown, durationMs: number): DatasetLyric {
  if (
    !isRecord(value) ||
    typeof value.language !== 'string' ||
    !languages.has(value.language as Language)
  ) {
    throw new Error('Dataset lyric has an invalid language');
  }
  if (
    typeof value.isPrimary !== 'boolean' ||
    typeof value.text !== 'string' ||
    !Array.isArray(value.timings)
  ) {
    throw new Error('Dataset lyric has invalid fields');
  }
  return {
    language: value.language as Language,
    isPrimary: value.isPrimary,
    text: value.text,
    timings: value.timings.map((timing) => parseTiming(timing, durationMs))
  };
}

function parseSong(value: unknown): DatasetSong {
  if (!isRecord(value)) throw new Error('Dataset song must be an object');
  if (
    typeof value.title !== 'string' ||
    typeof value.filePath !== 'string' ||
    typeof value.mediaKind !== 'string' ||
    !mediaKinds.has(value.mediaKind as MediaKind) ||
    typeof value.durationMs !== 'number' ||
    value.durationMs <= 0 ||
    (value.meaning !== null && typeof value.meaning !== 'string') ||
    !isStringArray(value.composers) ||
    !isStringArray(value.artists) ||
    !Array.isArray(value.lyrics)
  ) {
    throw new Error('Dataset song has invalid fields');
  }
  const lyrics = value.lyrics.map((lyric) => parseLyric(lyric, value.durationMs as number));
  const primaryLyrics = lyrics.filter((lyric) => lyric.isPrimary);
  const secondaryLyrics = lyrics.filter((lyric) => !lyric.isPrimary);
  if (primaryLyrics.length !== 1 || primaryLyrics[0].language !== 'ja') {
    throw new Error('Dataset must contain exactly one primary ja lyric');
  }
  if (secondaryLyrics.length > 1 || secondaryLyrics.some((lyric) => lyric.language === 'ja')) {
    throw new Error('Dataset must contain at most one ru or en secondary lyric');
  }
  const primaryLineCount = splitText(primaryLyrics[0].text).length;
  if (
    primaryLyrics[0].timings.some(
      (timing) => timing.lineIndex < 0 || timing.lineIndex >= primaryLineCount
    )
  ) {
    throw new Error('Dataset primary timings reference an invalid line');
  }
  if (secondaryLyrics.some((lyric) => lyric.timings.length > 0)) {
    throw new Error('Dataset secondary lyrics cannot contain timings');
  }
  if (
    secondaryLyrics.length === 1 &&
    splitText(secondaryLyrics[0].text).length !== primaryLineCount
  ) {
    throw new Error('Dataset secondary lyric line count does not match primary lyric');
  }
  return {
    title: value.title,
    filePath: value.filePath,
    mediaKind: value.mediaKind as MediaKind,
    durationMs: value.durationMs,
    meaning: value.meaning,
    composers: value.composers,
    artists: value.artists,
    lyrics
  };
}

export function parseSongsDataset(raw: string): DatasetSong[] {
  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    throw new Error('Dataset is not valid JSON');
  }
  if (!Array.isArray(value)) throw new Error('Dataset root must be an array');
  return value.map(parseSong);
}
