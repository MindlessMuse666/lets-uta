import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSong } from '$lib/server/songs';
import { resolveStoredPath } from '$lib/server/paths';

function contentType(filePath: string, mediaKind: 'audio' | 'video'): string {
  if (filePath.toLowerCase().endsWith('.ogg')) return 'audio/ogg';
  if (filePath.toLowerCase().endsWith('.mp4')) return 'video/mp4';
  return mediaKind === 'video' ? 'video/mp4' : 'audio/mpeg';
}

function parseRange(range: string | null, size: number): { start: number; end: number } | null {
  if (!range) return { start: 0, end: size - 1 };
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || (!match[1] && !match[2])) return null;

  const requestedStart = match[1] ? Number(match[1]) : undefined;
  const requestedEnd = match[2] ? Number(match[2]) : undefined;
  if (
    (requestedStart !== undefined && !Number.isSafeInteger(requestedStart)) ||
    (requestedEnd !== undefined && !Number.isSafeInteger(requestedEnd))
  ) {
    return null;
  }

  if (requestedStart === undefined) {
    const suffixLength = requestedEnd ?? 0;
    if (suffixLength <= 0) return null;
    return { start: Math.max(0, size - suffixLength), end: size - 1 };
  }

  if (requestedStart >= size || (requestedEnd !== undefined && requestedEnd < requestedStart)) {
    return null;
  }
  return {
    start: requestedStart,
    end: Math.min(requestedEnd ?? size - 1, size - 1)
  };
}

function streamBody(filePath: string, start: number, end: number): ReadableStream<Uint8Array> {
  return Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream<Uint8Array>;
}

export const GET: RequestHandler = async ({ params, request }) => {
  const id = Number(params.id);
  const song = Number.isInteger(id) && id > 0 ? getSong(id) : undefined;
  if (!song) error(404, 'Песня не найдена');

  let filePath: string;
  let fileSize: number;
  try {
    filePath = resolveStoredPath(song.filePath);
    fileSize = (await stat(filePath)).size;
    if (fileSize <= 0) error(404, 'Медиафайл не найден');
  } catch {
    error(404, 'Медиафайл не найден');
  }

  const range = parseRange(request.headers.get('range'), fileSize);
  if (!range) {
    return new Response('Некорректный диапазон медиафайла', {
      status: 416,
      headers: { 'Content-Range': `bytes */${fileSize}` }
    });
  }

  const partial = request.headers.has('range');
  const contentLength = range.end - range.start + 1;
  const headers = new Headers({
    'Accept-Ranges': 'bytes',
    'Content-Length': String(contentLength),
    'Content-Type': contentType(song.filePath, song.mediaKind)
  });
  if (partial) headers.set('Content-Range', `bytes ${range.start}-${range.end}/${fileSize}`);

  return new Response(streamBody(filePath, range.start, range.end), {
    status: partial ? 206 : 200,
    headers
  });
};
