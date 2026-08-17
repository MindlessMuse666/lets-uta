import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { validateTranslationInput } from '$lib/karaoke/validate';
import { addTranslation } from '$lib/server/lyrics';
import { getSettings } from '$lib/server/settings';
import { getSongWithDetails } from '$lib/server/songs';

function parseSongId(value: string): number | undefined {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

function translationValues(formData: FormData): { language: string; text: string } {
  return {
    language: String(formData.get('language') ?? ''),
    text: String(formData.get('text') ?? '')
  };
}

export const load: PageServerLoad = ({ params }) => {
  const id = parseSongId(params.id);
  const song = id ? getSongWithDetails(id) : undefined;
  if (!song) error(404, 'Песня не найдена');
  return { song, settings: getSettings() };
};

export const actions: Actions = {
  addTranslation: async ({ request, params }) => {
    const id = parseSongId(params.id);
    const song = id ? getSongWithDetails(id) : undefined;
    if (!song) error(404, 'Песня не найдена');

    const formData = await request.formData();
    const values = translationValues(formData);
    const primaryLyric = song.lyrics.find((lyric) => lyric.isPrimary && lyric.language === 'ja');
    if (!primaryLyric) {
      return fail(400, {
        fieldErrors: { form: 'Основной текст обязателен' },
        values
      });
    }
    if (song.lyrics.some((lyric) => !lyric.isPrimary)) {
      return fail(400, {
        fieldErrors: { form: 'Перевод уже добавлен' },
        values
      });
    }

    const validation = validateTranslationInput({
      language: formData.get('language'),
      text: formData.get('text'),
      primaryText: primaryLyric.text
    });
    if (!validation.ok) {
      return fail(400, {
        fieldErrors: validation.fieldErrors,
        values
      });
    }

    try {
      const lyric = addTranslation(song.id, validation.value);
      return { ok: true, lyric };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '';
      return fail(400, {
        fieldErrors: {
          form:
            message === 'Перевод уже добавлен' ||
            message === 'Количество строк перевода должно совпадать с японским текстом'
              ? message
              : 'Перевод не удалось сохранить. Проверьте данные и повторите попытку.'
        },
        values
      });
    }
  }
};
