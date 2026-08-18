import { splitText } from './lines';
import type { TimingInput } from './types';

export type AlignmentToken = {
  text: string;
  start: number;
  end: number;
};

/**
 * Provides a deterministic local adapter until a model adapter is configured.
 * It keeps the domain contract independent from workers, SQLite and FFmpeg.
 */
export async function alignLyrics(
  audio: Float32Array,
  sampleRate: 16000,
  text: string
): Promise<AlignmentToken[] | null> {
  if (sampleRate !== 16000 || audio.length === 0) return null;

  const lines = splitText(text).filter((line) => line !== '');
  const durationMs = Math.floor((audio.length / sampleRate) * 1000);
  if (lines.length === 0 || durationMs < lines.length) return null;

  return lines.map((line, index) => ({
    text: line,
    start: Math.floor((index * durationMs) / lines.length),
    end: Math.max(
      Math.floor(((index + 1) * durationMs) / lines.length),
      Math.floor((index * durationMs) / lines.length) + 1
    )
  }));
}

export function mapTokensToLines(tokens: AlignmentToken[], lines: string[]): TimingInput[] {
  const timings: TimingInput[] = [];
  let tokenIndex = 0;

  for (const [lineIndex, line] of lines.entries()) {
    if (line === '') continue;
    const token = tokens[tokenIndex];
    tokenIndex += 1;
    if (!token) continue;
    if (
      !Number.isInteger(token.start) ||
      !Number.isInteger(token.end) ||
      token.start < 0 ||
      token.end <= token.start
    ) {
      continue;
    }
    timings.push({ lineIndex, startTime: token.start, endTime: token.end });
  }

  return timings;
}
