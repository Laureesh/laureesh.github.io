/* ─── Hidden Leaf Adventure — full game data ─── */

export interface Item {
  id: string;
  name: string;
  desc: string;
  type: "weapon" | "armor" | "heal" | "misc";
  damage?: number;
  critChance?: number;
  defense?: number;
  bonusHP?: number;
  healAmount?: number;
  regenAmount?: number;
}

export interface Monster {
  id: string;
  name: string;
  desc: string;
  type: "NORMAL" | "MINIBOSS";
  hp: number;
  attack: number;
  enrageThreshold: number;
  fleeThreshold: number;
  drops: { itemId: string; chance: number }[];
}

export interface Puzzle {
  id: string;
  question: string;
  answer: string;
  passMessage: string;
  failMessage: string;
  maxAttempts: number;
  rewardItemId: string;
  type: "TEXT";
  hints: string[];
}

export interface Room {
  id: number;
  name: string;
  desc: string;
  exits: { north: number; east: number; south: number; west: number };
  items: string[];      // item IDs placed in this room
  puzzleId: string | null;
  monsterId: string | null;
  locked: boolean;
  requiredItemId: string;
}

/* ─── Items ─── */
export const ITEMS: Record<string, Item> = {
  I1: { id: "I1", name: "Kunai", desc: "A sharp ninja throwing knife.", type: "weapon", damage: 20, critChance: 0.10 },
  I2: { id: "I2", name: "Shuriken", desc: "An upgraded ninja star.", type: "weapon", damage: 35, critChance: 0.15 },
  I3: { id: "I3", name: "Herb", desc: "A healing herb.", type: "heal", healAmount: 50, regenAmount: 5 },
  I4: { id: "I4", name: "Bandage", desc: "Basic bandage.", type: "heal", healAmount: 30, regenAmount: 3 },
  I5: { id: "I5", name: "Vest", desc: "A protective vest.", type: "armor", defense: 20, bonusHP: 20 },
  I6: { id: "I6", name: "Executioner", desc: "Zabuza's massive decapitating greatsword.", type: "weapon", damage: 75, critChance: 0.20 },
  I7: { id: "I7", name: "Key", desc: "A metal key used to unlock a secured door.", type: "misc" },
  I8: { id: "I8", name: "Rasengan", desc: "Naruto's technique.", type: "weapon", damage: 200, critChance: 0.50 },
};

/* ─── Monsters ─── */
export const MONSTERS: Record<string, Monster> = {
  M1: {
    id: "M1", name: "Zabuza Momochi",
    desc: "A rogue ninja from the Hidden Mist.",
    type: "NORMAL", hp: 60, attack: 15,
    enrageThreshold: 30, fleeThreshold: 10,
    drops: [
      { itemId: "I6", chance: 100 },
      { itemId: "I3", chance: 100 },
    ],
  },
  M2: {
    id: "M2", name: "Kabuto Yakushi",
    desc: "A cunning medic-nin who manipulates chakra.",
    type: "MINIBOSS", hp: 80, attack: 20,
    enrageThreshold: 25, fleeThreshold: 10,
    drops: [
      { itemId: "I5", chance: 10 },
      { itemId: "I4", chance: 50 },
    ],
  },
};

/* ─── Puzzles ─── */
export const PUZZLES: Record<string, Puzzle> = {
  P1: {
    id: "P1",
    question: "What is Naruto's signature jutsu?",
    answer: "rasengan",
    passMessage: "Correct! You feel the power of the jutsu flow through you.",
    failMessage: "Wrong answer, shinobi.",
    maxAttempts: 5,
    rewardItemId: "I8",
    type: "TEXT",
    hints: [
      "Think about training with Jiraiya",
      "Used during the Chunin Exams",
      "Made of spinning chakra",
    ],
  },
  P2: {
    id: "P2",
    question: "Who was Naruto's first sensei?",
    answer: "iruka",
    passMessage: "Correct! The spirit of the Academy guides you.",
    failMessage: "Wrong answer, shinobi.",
    maxAttempts: 4,
    rewardItemId: "I5",
    type: "TEXT",
    hints: [
      "He taught Naruto at the Academy",
      "Cares deeply for Naruto",
      "Appears in episode 1",
    ],
  },
};

/* ─── Rooms ─── */
export const ROOMS: Record<number, Room> = {
  1: {
    id: 1, name: "Konoha Village Gate",
    desc: "The great wooden gates of the Leaf Village tower above you.",
    exits: { north: 0, east: 2, south: 0, west: 0 },
    items: ["I1", "I3", "I7"],
    puzzleId: null, monsterId: null,
    locked: false, requiredItemId: "",
  },
  2: {
    id: 2, name: "Third Training Ground",
    desc: "A field scarred by years of shinobi training.",
    exits: { north: 0, east: 3, south: 0, west: 1 },
    items: [],
    puzzleId: null, monsterId: "M1",
    locked: false, requiredItemId: "",
  },
  3: {
    id: 3, name: "Konoha Academy",
    desc: "The academy classrooms echo with soft murmurs.",
    exits: { north: 4, east: 0, south: 2, west: 0 },
    items: [],
    puzzleId: "P1", monsterId: null,
    locked: false, requiredItemId: "",
  },
  4: {
    id: 4, name: "Uchiha District",
    desc: "Traditional Uchiha clan homes line the quiet street.",
    exits: { north: 5, east: 0, south: 3, west: 0 },
    items: ["I2"],
    puzzleId: null, monsterId: null,
    locked: false, requiredItemId: "",
  },
  5: {
    id: 5, name: "Naka Shrine",
    desc: "Ancient secrets rest beneath the floorboards of the shrine.",
    exits: { north: 0, east: 6, south: 4, west: 0 },
    items: ["I4"],
    puzzleId: null, monsterId: "M2",
    locked: false, requiredItemId: "",
  },
  6: {
    id: 6, name: "Konoha Cemetery",
    desc: "Rows of gravestones honor fallen shinobi.",
    exits: { north: 7, east: 0, south: 0, west: 5 },
    items: [],
    puzzleId: "P2", monsterId: null,
    locked: false, requiredItemId: "",
  },
  7: {
    id: 7, name: "Hokage Residence",
    desc: "Stacks of missions and maps fill the Hokage office.",
    exits: { north: 8, east: 0, south: 6, west: 0 },
    items: ["I5"],
    puzzleId: null, monsterId: null,
    locked: true, requiredItemId: "I7",
  },
  8: {
    id: 8, name: "Konoha Hospital",
    desc: "Medical-nin rush through the busy halls.",
    exits: { north: 0, east: 9, south: 7, west: 0 },
    items: ["I6"],
    puzzleId: null, monsterId: null,
    locked: false, requiredItemId: "",
  },
  9: {
    id: 9, name: "Konoha Library",
    desc: "Scrolls containing centuries of history line the shelves.",
    exits: { north: 0, east: 0, south: 10, west: 8 },
    items: [],
    puzzleId: null, monsterId: null,
    locked: false, requiredItemId: "",
  },
  10: {
    id: 10, name: "Memorial Stone",
    desc: "A quiet field honoring the Will of Fire. The journey ends here.",
    exits: { north: 9, east: 0, south: 0, west: 0 },
    items: [],
    puzzleId: null, monsterId: null,
    locked: false, requiredItemId: "",
  },
};

export const START_ROOM = 1;
export const FINAL_ROOM = 10;
