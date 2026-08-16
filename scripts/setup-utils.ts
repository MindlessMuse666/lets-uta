import { spawn } from 'node:child_process';
import { access, mkdir } from 'node:fs/promises';
import path from 'node:path';

export function parseNodeMajorVersion(version: string): number | null {
  const match = /^v?(\d+)(?:\.\d+){0,2}(?:[-+].*)?$/.exec(version.trim());
  return match ? Number(match[1]) : null;
}

export function checkExecutable(
  command: string
): Promise<{ available: boolean; version?: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, ['-version'], { stdio: ['ignore', 'pipe', 'pipe'], shell: false });
    let output = '';

    child.stderr.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.on('error', () => resolve({ available: false }));
    child.on('close', (code) => {
      const version = /^ffmpeg version ([^\s]+)/m.exec(output)?.[1];
      resolve(code === 0 ? { available: true, version } : { available: false });
    });
  });
}

export async function ensureDataDirectories(dataRoot: string): Promise<string[]> {
  const directories = ['media', 'archives', 'models', 'tmp'].map((name) =>
    path.join(dataRoot, name)
  );
  await Promise.all(directories.map((directory) => mkdir(directory, { recursive: true })));
  await access(dataRoot);
  return directories;
}
