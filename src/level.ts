// The one level of the first version: a house with a lit window, 20 × 20. The yellow window is closed
// in by the red wall, while the yellow sun is open from the start, so a yellow pot can look safe and
// still wait until the wall around the window is gone.

import { parsePicture } from './picture.ts';

export const HOUSE = parsePicture(
  [
    'BBBBBBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBBYYBB',
    'BBBBBBBBBDDBBBBBYYBB',
    'BBBBBBBBDDDDBBBBBBBB',
    'BBBBBBBDDDDDDBBBBBBB',
    'BBBBBBDDDDDDDDBBBBBB',
    'BBBBBDDDDDDDDDDBBBBB',
    'BBBBDDDDDDDDDDDDBBBB',
    'BBBBBRRRRRRRRRRBBBBB',
    'BBBBBRRRRRRRRRRBBBBB',
    'BBBBBRRYYYRRRRRBBBBB',
    'BBBBBRRYYYRDDRRBBBBB',
    'BBBBBRRYYYRDDRRBBBBB',
    'BBBBBRRRRRRDDRRBBBBB',
    'BBBBBRRRRRRDDRRBBBBB',
    'BBBBBRRRRRRDDRRBBBBB',
    'GGGGGGGGGGGGGGGGGGGG',
    'GGGGGGGGGGGGGGGGGGGG',
    'GGGGGGGGGGGGGGGGGGGG',
    'GGGGGGGGGGGGGGGGGGGG',
  ],
  { B: '#7ec8e3', D: '#8b4a2b', R: '#c8423a', Y: '#f5c842', G: '#4caf50' },
);

/** The first level's parameters: buckets, columns, pots shown per column, the deal's seed and pot sizes. */
export const HOUSE_RULES = { buckets: 4, columns: 4, visible: 3, seed: 1, potMin: 10, potMax: 30 };
