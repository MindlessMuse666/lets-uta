import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { validateUploadInput } from '$lib/karaoke/validate';
import { createLyric } from '$lib/server/lyrics';
import { deleteStoredMedia, saveUploadedMedia } from '$lib/server/media';
import { createSong, deleteSong } from '$lib/server/songs';

function formValues(formData: FormData): Record<string, string> {
  return {
    title: String(formData.get('title') ?? ''),
    primaryLyric: String(formData.get('primaryLyric') ?? ''),
    primaryLanguage: String(formData.get('primaryLanguage') ?? 'ru'),
    secondaryLyrics: String(formData.get('secondaryLyrics') ?? ''),
    meaning: String(formData.get('meaning') ?? ''),
    composers: String(formData.get('composers') ?? ''),
    artists: String(formData.get('artists') ?? '')
  };
}

export const actions: Actions = {
  create: async ({ request }) => {
    const formData = await request.formData();
    const rawFile = formData.get('file');
    const validation = validateUploadInput({
      title: formData.get('title'),
      file: rawFile instanceof File ? rawFile : undefined,
      primaryLyric: formData.get('primaryLyric'),
      primaryLanguage: formData.get('primaryLanguage'),
      secondaryLyrics: formData.get('secondaryLyrics'),
      meaning: formData.get('meaning'),
      composers: formData.get('composers'),
      artists: formData.get('artists')
    });
    if (!validation.ok) {
      return fail(400, { errors: validation.fieldErrors, values: formValues(formData) });
    }

    let storedMedia: Awaited<ReturnType<typeof saveUploadedMedia>>;
    try {
      storedMedia = await saveUploadedMedia(validation.value.file);
    } catch {
      return fail(400, {
        errors: { file: 'Файл не удалось обработать. Проверьте медиафайл и наличие FFmpeg.' },
        values: formValues(formData)
      });
    }

    let songId: number | undefined;
    try {
      const song = createSong({
        title: validation.value.title,
        filePath: storedMedia.filePath,
        mediaKind: storedMedia.mediaKind,
        durationMs: storedMedia.durationMs,
        meaning: validation.value.meaning ?? null,
        composers: validation.value.composers,
        artists: validation.value.artists
      });
      songId = song.id;
      createLyric({
        songId,
        language: validation.value.primaryLanguage,
        isPrimary: true,
        text: validation.value.primaryLyric
      });
      for (const lyric of validation.value.secondaryLyrics) {
        createLyric({ songId, language: lyric.language, isPrimary: false, text: lyric.text });
      }
    } catch {
      if (songId !== undefined) deleteSong(songId);
      await deleteStoredMedia(storedMedia.filePath);
      return fail(400, {
        errors: { form: 'Песню не удалось сохранить. Проверьте данные и повторите попытку.' },
        values: formValues(formData)
      });
    }

    throw redirect(303, `/songs/${songId}`);
  }
};
