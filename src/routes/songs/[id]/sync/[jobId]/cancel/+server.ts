import { error, json } from '@sveltejs/kit';
import { requestSyncCancellation } from '$lib/server/sync-jobs';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ params }) => {
  const songId = Number(params.id);
  const job = requestSyncCancellation(songId, params.jobId);
  if (!Number.isInteger(songId) || !job) throw error(404, 'Задача синхронизации не найдена');
  return json(job);
};
