import { Worker } from 'node:worker_threads';
import type { SyncJob } from '../karaoke/types';
import { finishSyncJob, createSyncJob, getSyncJobById } from './sync-jobs';
import { runSyncJob } from './sync-worker';

const activeWorkers = new Map<string, Worker>();

export function enqueueSync(songId: number): SyncJob {
  const job = createSyncJob(songId);
  if (import.meta.url.endsWith('.ts')) {
    queueMicrotask(() => void runSyncJob(job.id));
    return job;
  }

  let worker: Worker;
  try {
    worker = new Worker(new URL('./sync-worker.ts', import.meta.url), {
      workerData: { jobId: job.id }
    });
  } catch {
    queueMicrotask(() => void runSyncJob(job.id));
    return job;
  }
  activeWorkers.set(job.id, worker);
  worker.once('error', () => {
    const current = getSyncJobById(job.id);
    if (current?.status === 'queued') {
      void runSyncJob(job.id);
      return;
    }
    finishSyncJob(job.id, 'failed', 'Синхронизация не выполнена. Старые тайминги сохранены.');
  });
  worker.once('exit', (code) => {
    activeWorkers.delete(job.id);
    if (code !== 0) {
      finishSyncJob(job.id, 'failed', 'Синхронизация не выполнена. Старые тайминги сохранены.');
    }
  });
  return job;
}
