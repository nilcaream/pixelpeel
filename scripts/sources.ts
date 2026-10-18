// The source pictures the levels are made from. Every picture here is CC0; its licence was read on
// the page it came from, and the pack's own licence file is kept beside the images.
//
// Kenney, "Animal Pack Redux", https://opengameart.org/content/animal-pack-redux
//   The page's License(s) field: "CC0" (http://creativecommons.org/publicdomain/zero/1.0/).
//   The pack's License.txt: "License (Creative Commons Zero, CC0)" … "You may use these assets in
//   personal and commercial projects. Credit (Kenney or www.kenney.nl) would be nice but is not mandatory."

import type { Source } from '../src/levels.ts';

const KENNEY_ANIMALS = 'levels/sources/kenney-animal-pack-redux';

const ANIMALS = [
  'bear', 'buffalo', 'chick', 'chicken', 'cow', 'crocodile', 'dog', 'duck', 'elephant', 'frog',
  'giraffe', 'goat', 'gorilla', 'hippo', 'horse', 'monkey', 'moose', 'narwhal', 'owl', 'panda',
  'parrot', 'penguin', 'pig', 'rabbit', 'rhino', 'sloth', 'snake', 'walrus', 'whale', 'zebra',
];

function kenneyAnimal(style: 'square' | 'round', name: string): Source {
  return {
    title: name[0]?.toUpperCase() + name.slice(1),
    file: `${KENNEY_ANIMALS}/${style}/${name}.png`,
    author: 'Kenney (kenney.nl)',
    licence: 'CC0 1.0',
    licenceUrl: 'http://creativecommons.org/publicdomain/zero/1.0/',
    page: 'https://opengameart.org/content/animal-pack-redux',
  };
}

/**
 * The pictures each block of ten levels chooses from, or the earlier block whose pictures it brings
 * back, larger and with more colours. An animal shown in one block is not chosen again in another,
 * except where a block repeats one. The first levels show the square animals, whole bodies; the second
 * block the round heads; the third brings the first block's pictures back.
 */
export const BLOCKS: readonly (Source[] | { repeat: number })[] = [
  ANIMALS.map((a) => kenneyAnimal('square', a)),
  ANIMALS.map((a) => kenneyAnimal('round', a)),
  { repeat: 0 },
];

/**
 * Levels whose picture keeps a solid background, filled with a pool colour and peeled like the rest.
 * Every other level leaves the background empty: no pixels there, and dots walk over it from the start.
 */
export const SOLID_BACKGROUND: readonly number[] = [];
