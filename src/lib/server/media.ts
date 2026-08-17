import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import path from 'node:path';
import type { MediaKind } from '../karaoke/types';
import { getDataRoot, resolveStoredPath } from './paths';

type ProbeResult = {
  streams?: Array<{ codec_type?: string }>;
  format?: { duration?: string };
};

function runProcess(
  command: string,
  args: string[],
  input?: Buffer
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.once('error', reject);
    child.once('close', (code) => {
      const result = {
        stdout: Buffer.concat(stdout).toString(),
        stderr: Buffer.concat(stderr).toString()
      };
      if (code === 0) resolve(result);
      else reject(new Error(`Process exited with code ${code}`));
    });
    if (input) child.stdin.end(input);
  });
}

function mediaExtension(file: File): string {
  const extension = path.extname(file.name).toLowerCase();
  if (extension === '.mp3' || extension === '.ogg' || extension === '.mp4') return extension;
  throw new Error('Unsupported media extension');
}

function expectedMediaKind(file: File): MediaKind {
  return file.type === 'video/mp4' ? 'video' : 'audio';
}

async function inspectMedia(
  filePath: string,
  expectedKind: MediaKind
): Promise<{ mediaKind: MediaKind; durationMs: number }> {
  const { stdout } = await runProcess('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration:stream=codec_type',
    '-of',
    'json',
    filePath
  ]);
  const probe = JSON.parse(stdout) as ProbeResult;
  const mediaKind: MediaKind = probe.streams?.some((stream) => stream.codec_type === 'video')
    ? 'video'
    : 'audio';
  const durationSeconds = Number(probe.format?.duration);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || mediaKind !== expectedKind) {
    throw new Error('Media inspection failed');
  }
  return { mediaKind, durationMs: Math.round(durationSeconds * 1000) };
}

export async function saveUploadedMedia(file: File): Promise<{
  filePath: string;
  mediaKind: MediaKind;
  durationMs: number;
}> {
  const mediaDirectory = path.join(getDataRoot(), 'media');
  const temporaryDirectory = path.join(getDataRoot(), 'tmp');
  await mkdir(mediaDirectory, { recursive: true });
  await mkdir(temporaryDirectory, { recursive: true });

  const id = randomUUID();
  const extension = mediaExtension(file);
  const temporaryPath = path.join(temporaryDirectory, `${id}${extension}`);
  const filePath = `media/${id}${extension}`;
  const storedPath = resolveStoredPath(filePath);

  try {
    await writeFile(temporaryPath, Buffer.from(await file.arrayBuffer()), { flag: 'wx' });
    const inspected = await inspectMedia(temporaryPath, expectedMediaKind(file));
    await rename(temporaryPath, storedPath);
    return { filePath, ...inspected };
  } catch (error) {
    await rm(temporaryPath, { force: true });
    await rm(storedPath, { force: true });
    throw error;
  }
}

export async function deleteStoredMedia(filePath: string): Promise<void> {
  await rm(resolveStoredPath(filePath), { force: true });
}

export async function inspectFfmpeg(): Promise<{ available: boolean; version?: string }> {
  try {
    const { stdout, stderr } = await runProcess('ffmpeg', ['-version']);
    const version = `${stdout}\n${stderr}`.match(/ffmpeg version\s+([^\s]+)/i)?.[1];
    return { available: true, ...(version ? { version } : {}) };
  } catch {
    return { available: false };
  }
}
