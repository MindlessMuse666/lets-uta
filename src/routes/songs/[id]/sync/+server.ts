import { error, json } from '@sveltejs/kit';
import { enqueueSync } from '$lib/server/sync-manager';
import { SyncJobError } from '$lib/server/sync-jobs';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ params }) => {
  const songId = Number(params.id);
  if (!Number.isInteger(songId) || songId < 1) throw error(404, 'Песня не найдена');
  try {
    const job = enqueueSync(songId);
    return json({ jobId: job.id }, { status: 202 });
  } catch (cause) {
    if (!(cause instanceof SyncJobError)) throw cause;
    if (cause.kind === 'missing-song') throw error(404, 'Песня не найдена');
    if (cause.kind === 'missing-primary') {
      return json({ message: 'Основной текст ещё не добавлен.' }, { status: 400 });
    }
    return json({ message: 'Другая синхронизация уже выполняется.' }, { status: 409 });
  }
};
