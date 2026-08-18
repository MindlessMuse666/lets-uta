import { error, json } from '@sveltejs/kit';
import { getSyncJob } from '$lib/server/sync-jobs';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params }) => {
  const songId = Number(params.id);
  const job = getSyncJob(songId, params.jobId);
  if (!Number.isInteger(songId) || !job) throw error(404, 'Задача синхронизации не найдена');
  return json(job);
};
