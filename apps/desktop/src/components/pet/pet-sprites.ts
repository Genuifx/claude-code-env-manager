// ASCII sprite frames per species. Each frame is 4 lines.
// Frame layout: [head, body1, body2, feet]

type Frames = string[][];

const goose: Frames = [
  [' (✦>  ', '  ||   ', ' _(__)_', '  ^^^^  '],
  ['(✦>   ', '  ||   ', ' _(__)_', '  ^^^^  '],
  [' (✦>> ', '  ||   ', ' _(__)_', '  ^^^^  '],
];

const duck: Frames = [
  [' (·>  ', '  ||   ', ' _(__)_', '  ~~~~  '],
  ['(·>   ', '  ||   ', ' _(__)_', '  ~~~~  '],
  [' (·>> ', '  ||   ', ' _(__)_', '  ~~~~  '],
];

const cat: Frames = [
  [' /\\(×  ', ' (  )  ', '  \\__/ ', '  u  u  '],
  [' /\\(×  ', ' ( . ) ', '  \\__/ ', '  u  u  '],
  [' /\\(×  ', ' (  )  ', '  \\__/ ', '  U  U  '],
];

const blob: Frames = [
  [' (◉)  ', ' /   \\ ', '|     |', ' \\___/ '],
  [' (◉)  ', ' /   \\ ', '|  .  |', ' \\___/ '],
  [' (◉)  ', ' / ~ \\ ', '|     |', ' \\___/ '],
];

const penguin: Frames = [
  [' (°>  ', ' /|\\  ', ' / \\ ', '  | |  '],
  ['(°>   ', ' /|\\  ', ' / \\ ', '  | |  '],
  [' (°>> ', ' /|\\  ', ' / \\ ', '  | |  '],
];

const fallback: Frames = [
  [' (✦>  ', '  ||   ', ' _(__)_', '  ^^^^  '],
  ['(✦>   ', '  ||   ', ' _(__)_', '  ^^^^  '],
  [' (✦>> ', '  ||   ', ' _(__)_', '  ^^^^  '],
];

const SPRITE_MAP: Record<string, Frames> = {
  goose, duck, cat, blob, penguin,
};

export function getFrames(species: string): Frames {
  return SPRITE_MAP[species] ?? fallback;
}

// Idle animation sequence: indices into frames array. -1 = blink (eye closed)
export const IDLE_SEQ = [0, 0, 0, 0, 1, 0, 0, 0, 0, 2, 0, 0, 0, 1, 0];
