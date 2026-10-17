// The source pictures the levels are made from. Every picture here is CC0; its licence was read on
// the page it came from, and the pack's own licence file is kept beside the images.
//
// Kenney, "Animal Pack Redux", https://opengameart.org/content/animal-pack-redux
//   The page's License(s) field: "CC0" (http://creativecommons.org/publicdomain/zero/1.0/).
//   The pack's License.txt: "License (Creative Commons Zero, CC0)" … "You may use these assets in
//   personal and commercial projects. Credit (Kenney or www.kenney.nl) would be nice but is not mandatory."

import type { Source } from '../src/levels.ts';

const KENNEY_ANIMALS = 'levels/sources/kenney-animal-pack-redux';

function kenneyAnimal(name: string): Source {
  return {
    title: name[0]?.toUpperCase() + name.slice(1),
    file: `${KENNEY_ANIMALS}/${name}.png`,
    author: 'Kenney (kenney.nl)',
    licence: 'CC0 1.0',
    licenceUrl: 'http://creativecommons.org/publicdomain/zero/1.0/',
    page: 'https://opengameart.org/content/animal-pack-redux',
  };
}

/** Every picture a level may be made from. */
export const CANDIDATES: readonly Source[] = [
  'bear', 'buffalo', 'chick', 'chicken', 'cow', 'crocodile', 'dog', 'duck', 'elephant', 'frog',
  'giraffe', 'goat', 'gorilla', 'hippo', 'horse', 'monkey', 'moose', 'narwhal', 'owl', 'panda',
  'parrot', 'penguin', 'pig', 'rabbit', 'rhino', 'sloth', 'snake', 'walrus', 'whale', 'zebra',
].map(kenneyAnimal);

/**
 * Blocks whose pictures come back from an earlier block, larger and with more colours: the third
 * block of ten levels shows the first block's pictures again.
 */
export const REPEATS: Readonly<Record<number, number>> = { 2: 0 };

/** How many blocks of ten levels the bake makes. */
export const BLOCK_COUNT = 3;
