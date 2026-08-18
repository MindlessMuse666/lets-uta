import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { parentPort, workerData } from 'node:worker_threads';
import { alignLyrics, mapTokensToLines } from '../karaoke/synchronizer';
import { splitText } from '../karaoke/lines';
import { validateTimings } from '../karaoke/validate';
import { getDb, closeDb } from './db';
import { resolveStoredPath } from './paths';
import { finishSyncJob, getSyncJobById, markSyncRunning, updateSyncProgress } from './sync-jobs';
import { replaceTimings } from './timings';

type WorkerDependencies = {
  decodeAudio?: (filePath: string) => Promise<Float32Array>;
  align?: typeof alignLyrics;
};

function decodeAudio(filePath: string): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'ffmpeg',
      ['-v', 'error', '-i', filePath, '-ac', '1', '-ar', '16000', '-f', 'f32le', 'pipe:1'],
      { shell: false }
    );
    const chunks: Buffer[] = [];
    const errors: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => errors.push(chunk));
    child.once('error', () => reject(new Error('FFmpeg is unavailable')));
    child.once('close', (code) => {
      if (code !== 0) {
        reject(new Error(`FFmpeg failed: ${Buffer.concat(errors).toString().trim()}`));
        return;
      }
      const buffer = Buffer.concat(chunks);
      const alignedBytes = buffer.byteLength - (buffer.byteLength % Float32Array.BYTES_PER_ELEMENT);
      const values = new Float32Array(alignedBytes / Float32Array.BYTES_PER_ELEMENT);
      for (let index = 0; index < values.length; index += 1) {
        values[index] = buffer.readFloatLE(index * Float32Array.BYTES_PER_ELEMENT);
      }
      resolve(values);
    });
  });
}

function readPrimaryLyric(jobId: string): {
  songId: number;
  filePath: string;
  text: string;
  durationMs: number;
} {
  const db = getDb();
  try {
    const job = db.prepare('SELECT songId FROM sync_jobs WHERE id = ?').get(jobId) as
      { songId: number } | undefined;
    if (!job) throw new Error('Sync job not found');
    const row = db
      .prepare(
        `SELECT songs.id AS songId, songs.filePath, songs.durationMs, lyrics.id AS lyricId, lyrics.text
         FROM songs JOIN lyrics ON lyrics.songId = songs.id
         WHERE songs.id = ? AND lyrics.isPrimary = 1 AND lyrics.language = 'ja'`
      )
      .get(job.songId) as
      | { songId: number; filePath: string; text: string; durationMs: number; lyricId: number }
      | undefined;
    if (!row) throw new Error('Primary lyric not found');
    return row;
  } finally {
    closeDb(db);
  }
}

function cancellationRequested(jobId: string): boolean {
  return getSyncJobById(jobId)?.cancelRequested ?? true;
}

export async function runSyncJob(
  jobId: string,
  dependencies: WorkerDependencies = {}
): Promise<void> {
  if (!markSyncRunning(jobId)) {
    if (cancellationRequested(jobId)) finishSyncJob(jobId, 'cancelled', 'Синхронизация отменена.');
    return;
  }

  try {
    const source = readPrimaryLyric(jobId);
    const mediaPath = resolveStoredPath(source.filePath);
    if (!existsSync(mediaPath)) throw new Error('Media file is missing');
    updateSyncProgress(jobId, 10, 0);

    const audio = await (dependencies.decodeAudio ?? decodeAudio)(mediaPath);
    if (cancellationRequested(jobId)) {
      finishSyncJob(jobId, 'cancelled', 'Синхронизация отменена.');
      return;
    }
    updateSyncProgress(jobId, 35, 0);

    const maxSamples = Math.ceil((source.durationMs / 1000) * 16000);
    const alignmentAudio = audio.length > maxSamples ? audio.slice(0, maxSamples) : audio;
    const tokens = await (dependencies.align ?? alignLyrics)(alignmentAudio, 16000, source.text);
    if (!tokens) throw new Error('Alignment returned no result');
    const lines = splitText(source.text);
    const timings = mapTokensToLines(tokens, lines);
    const nonEmptyLineIndexes = lines
      .map((line, index) => (line === '' ? -1 : index))
      .filter((index) => index >= 0);
    const mappedIndexes = new Set(timings.map((timing) => timing.lineIndex));
    if (nonEmptyLineIndexes.some((index) => !mappedIndexes.has(index))) {
      throw new Error('Alignment mapping is incomplete');
    }
    const validation = validateTimings(timings, lines.length, source.durationMs);
    if (!validation.ok) throw new Error('Alignment timings are invalid');
    updateSyncProgress(jobId, 90, timings.length);

    if (cancellationRequested(jobId)) {
      finishSyncJob(jobId, 'cancelled', 'Синхронизация отменена.');
      return;
    }
    const primaryLyric = getPrimaryLyricId(jobId);
    replaceTimings(primaryLyric, timings, 'auto');
    finishSyncJob(jobId, 'succeeded', 'Синхронизация завершена.');
  } catch (error) {
    if (cancellationRequested(jobId)) {
      finishSyncJob(jobId, 'cancelled', 'Синхронизация отменена.');
      return;
    }
    const message = error instanceof Error ? error.message : '';
    const userMessage = message.includes('FFmpeg')
      ? 'Не удалось подготовить аудио. Проверьте установку FFmpeg.'
      : message === 'Primary lyric not found'
        ? 'Основной текст ещё не добавлен.'
        : message === 'Media file is missing'
          ? 'Медиафайл песни недоступен.'
          : 'Синхронизация не выполнена. Старые тайминги сохранены.';
    finishSyncJob(jobId, 'failed', userMessage);
  }
}

function getPrimaryLyricId(jobId: string): number {
  const db = getDb();
  try {
    const job = db.prepare('SELECT songId FROM sync_jobs WHERE id = ?').get(jobId) as {
      songId: number;
    };
    const lyric = db
      .prepare("SELECT id FROM lyrics WHERE songId = ? AND isPrimary = 1 AND language = 'ja'")
      .get(job.songId) as { id: number } | undefined;
    if (!lyric) throw new Error('Primary lyric not found');
    return lyric.id;
  } finally {
    closeDb(db);
  }
}

if (workerData?.jobId && parentPort) {
  void runSyncJob(workerData.jobId).then(() => {
    parentPort?.postMessage({ status: 'finished' });
  });
}
