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
    secondaryLanguage: String(formData.get('secondaryLanguage') ?? ''),
    secondaryLyricText: String(formData.get('secondaryLyricText') ?? ''),
    meaning: String(formData.get('meaning') ?? ''),
    composers: String(formData.get('composers') ?? ''),
    artists: String(formData.get('artists') ?? '')
  };
}

function secondaryLyricFromForm(
  formData: FormData
): { language: string; text: string } | undefined {
  const language = String(formData.get('secondaryLanguage') ?? '');
  const text = String(formData.get('secondaryLyricText') ?? '');
  return language || text ? { language, text } : undefined;
}

export const actions: Actions = {
  create: async ({ request }) => {
    const formData = await request.formData();
    const rawFile = formData.get('file');
    const validation = validateUploadInput({
      title: formData.get('title'),
      file: rawFile instanceof File ? rawFile : undefined,
      primaryLyric: formData.get('primaryLyric'),
      secondaryLyric: secondaryLyricFromForm(formData),
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
        language: 'ja',
        isPrimary: true,
        text: validation.value.primaryLyric
      });
      if (validation.value.secondaryLyric) {
        createLyric({
          songId,
          language: validation.value.secondaryLyric.language,
          isPrimary: false,
          text: validation.value.secondaryLyric.text
        });
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
