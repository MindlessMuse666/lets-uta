import path from 'node:path';

export function getDataRoot(): string {
  return path.resolve(process.env.KARAOKE_DATA_DIR ?? path.join(process.cwd(), 'data'));
}

export function assertPathInsideDataRoot(relativePath: string): void {
  if (!relativePath || path.isAbsolute(relativePath)) {
    throw new Error('Stored path must be relative');
  }

  const root = getDataRoot();
  const resolved = path.resolve(root, relativePath);
  const relative = path.relative(root, resolved);
  if (
    !relative ||
    relative.startsWith(`..${path.sep}`) ||
    relative === '..' ||
    path.isAbsolute(relative)
  ) {
    throw new Error('Stored path is outside data root');
  }
}

export function resolveStoredPath(relativePath: string): string {
  assertPathInsideDataRoot(relativePath);
  return path.resolve(getDataRoot(), relativePath);
}
