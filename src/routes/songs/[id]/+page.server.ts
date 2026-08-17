import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getSongWithDetails } from '$lib/server/songs';

export const load: PageServerLoad = ({ params }) => {
  const id = Number(params.id);
  const song = Number.isInteger(id) && id > 0 ? getSongWithDetails(id) : undefined;
  if (!song) error(404, 'Песня не найдена');
  return { song };
};
