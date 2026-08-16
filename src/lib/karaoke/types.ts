export type Language = 'ru' | 'ja' | 'en';
export type MediaKind = 'audio' | 'video';
export type TimingSource = 'auto' | 'manual' | 'import';
export type Theme = 'light' | 'dark';

export type Song = {
  id: number;
  title: string;
  filePath: string;
  mediaKind: MediaKind;
  durationMs: number;
  meaning: string | null;
  composers: string[];
  artists: string[];
  createdAt: string;
  updatedAt: string;
};

export type Lyric = {
  id: number;
  songId: number;
  language: Language;
  isPrimary: boolean;
  text: string;
  createdAt: string;
  updatedAt: string;
};

export type Timing = {
  id: number;
  lyricId: number;
  lineIndex: number;
  startTime: number;
  endTime: number;
  source: TimingSource;
  updatedAt: string;
};

export type SyncJobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export type SyncJob = {
  id: string;
  songId: number;
  status: SyncJobStatus;
  progress: number;
  processedLines: number;
  totalLines: number;
  message: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  cancelRequested: boolean;
};

export type SongWithDetails = Song & {
  lyrics: Lyric[];
  timings: Timing[];
};

export type UploadInput = {
  file: File;
  title: string;
  primaryLyric: string;
  primaryLanguage: Language;
  secondaryLyrics: Array<{
    text: string;
    language: Language;
  }>;
  meaning?: string;
  composers: string[];
  artists: string[];
};

export type TimingInput = {
  lineIndex: number;
  startTime: number;
  endTime: number;
};
