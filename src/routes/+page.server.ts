import type { Language } from '$lib/karaoke/types';
import { listSongs } from '$lib/server/songs';
import type { PageServerLoad } from './$types';

const languages = new Set<Language>(['ru', 'ja', 'en']);

export const load: PageServerLoad = ({ url }) => {
  const query = url.searchParams.get('query') ?? '';
  const languageValue = url.searchParams.get('language') ?? '';
  const artist = url.searchParams.get('artist') ?? '';
  const language = languages.has(languageValue as Language)
    ? (languageValue as Language)
    : undefined;
  const allSongs = listSongs();
  const artists = [...new Set(allSongs.flatMap((song) => song.artists))].sort((left, right) =>
    left.localeCompare(right)
  );
  return {
    songs: listSongs({ query, language, artist }),
    artists,
    filters: { query, language: language ?? '', artist }
  };
};
