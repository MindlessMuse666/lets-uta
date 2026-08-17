import type { Timing } from './types';

export function splitText(text: string): string[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  while (lines[0] === '') lines.shift();
  while (lines.at(-1) === '') lines.pop();
  return lines;
}

export function getActiveLineIndex(timings: Timing[], currentTimeMs: number): number {
  if (!Number.isFinite(currentTimeMs)) return -1;
  const activeTiming = timings.find(
    (timing) => currentTimeMs >= timing.startTime && currentTimeMs < timing.endTime
  );
  return activeTiming?.lineIndex ?? -1;
}
