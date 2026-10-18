// The app's logo and icon: the Cactus level made square, its scene drawn on for a few rows of sky above
// and sand below, so the level's own picture sits unchanged in the middle.

import { SCENE_HEIGHT, SCENE_WIDTH, SCENES, sceneRows } from './scenes.ts';

export const LOGO_TITLE = 'Cactus';

/** The rows of the logo, SCENE_WIDTH square, for the Cactus scene drawn with the level's seed. */
export function logoRows(sceneSeed: number): string[] {
  const scene = SCENES.find((s) => s.title === LOGO_TITLE);
  if (!scene) throw new Error(`no scene called ${LOGO_TITLE}`);
  return sceneRows(scene, sceneSeed, (SCENE_WIDTH - SCENE_HEIGHT) / 2);
}
