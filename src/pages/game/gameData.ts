/* ─── Escaping The Red Cross — actual game data from Java source ─── */

export type ItemType = "weapon" | "armor" | "consumable" | "key";

export interface Item {
  id: string;
  name: string;
  desc: string;
  type: ItemType;
  value: number; // attack bonus for weapons, defense bonus for armor, heal amount for consumables, 0 for keys
  slot?: string; // armor slot: "head" | "torso" | "neck"
  uses?: number; // for consumables: number of uses
}

export interface Monster {
  id: number;
  name: string;
  desc: string;
  hp: number;
  attackMin: number;
  attackMax: number;
  defense: number;
  drops: string[]; // item IDs
}

export interface Puzzle {
  id: number;
  question: string;
  answer: string;
  hint: string;
  attemptsAllowed: number;
  rewardItemIds: string[];
}

export interface Room {
  id: number;
  name: string;
  desc: string;
  north: number;
  south: number;
  east: number;
  west: number;
  monsterId: number;
  puzzleId: number;
  items: string[];
}

/* ─── Items ─── */
export const ITEMS: Record<string, Item> = {
  Item_1:  { id: "Item_1",  name: "Sword of Cutting", desc: "A small sword found in the janitor's closet. Light, retractable, and sharp.", type: "weapon", value: 5 },
  Item_2:  { id: "Item_2",  name: "Armor of Hope", desc: "Lightweight steel torso armor that brings you hope in this dreadful place.", type: "armor", value: 7, slot: "torso" },
  Item_3:  { id: "Item_3",  name: "Gloves of Courage", desc: "Diamond-enchanted gloves that are durable yet flexible.", type: "armor", value: 5, slot: "hands" },
  Item_4:  { id: "Item_4",  name: "Mask of Strength", desc: "An iron knight's mask that boosts your strength while staying surprisingly light.", type: "armor", value: 5, slot: "head" },
  Item_5:  { id: "Item_5",  name: "Key F5", desc: "A small key used to unlock access to Floor 4.", type: "key", value: 0 },
  Item_6:  { id: "Item_6",  name: "Buzzball", desc: "A familiar alcoholic drink that restores 20 HP when consumed.", type: "consumable", value: 20, uses: 1 },
  Item_7:  { id: "Item_7",  name: "Key F4", desc: "A small key used to unlock access to Floor 3.", type: "key", value: 0 },
  Item_8:  { id: "Item_8",  name: "Key F3", desc: "A small key used to unlock access to Floor 2.", type: "key", value: 0 },
  Item_9:  { id: "Item_9",  name: "Key F2", desc: "A small key used to unlock access to Floor 1.", type: "key", value: 0 },
  Item_10: { id: "Item_10", name: "Entrance Key", desc: "The final key needed to unlock the hospital entrance.", type: "key", value: 0 },
  Item_11: { id: "Item_11", name: "Coin", desc: "A vending machine coin used to attempt puzzles.", type: "consumable", value: 1, uses: 1 },
  Item_12: { id: "Item_12", name: "Adrenaline Shot", desc: "A concentrated adrenaline dose granting an extra attack on your turn.", type: "consumable", value: 1, uses: 1 },
  Item_13: { id: "Item_13", name: "Strange Syringe", desc: "A syringe filled with unknown liquid. Grants +5 attack for 3 turns.", type: "consumable", value: 5, uses: 1 },
  Item_14: { id: "Item_14", name: "Sword of Light", desc: "A holy blade shaped like a mop that shines with divine radiance.", type: "weapon", value: 12 },
  Item_15: { id: "Item_15", name: "Leather Jacket", desc: 'A worn leather jacket providing minor protection. Initials "D.M." on the back.', type: "armor", value: 3, slot: "torso" },
  Item_16: { id: "Item_16", name: "Bucket Hat", desc: "A metal headwear that protects against danger but limits your vision.", type: "armor", value: 3, slot: "head" },
  Item_17: { id: "Item_17", name: "Pills", desc: "A bottle of pills capable of healing 10 HP.", type: "consumable", value: 10, uses: 1 },
  Item_18: { id: "Item_18", name: "Dual Blades", desc: "Two sharp blades that feel more like crutches but still deal deadly damage.", type: "weapon", value: 9 },
  Item_19: { id: "Item_19", name: "Oxygen Mask", desc: "A tank-connected mask that heals 10 HP twice.", type: "consumable", value: 10, uses: 2 },
  Item_20: { id: "Item_20", name: "Neck Ring", desc: "A glowing neck guard offering strong durability, like a stiff brace.", type: "armor", value: 7, slot: "neck" },
};

/* ─── Monsters ─── */
export const MONSTERS: Record<number, Monster> = {
  1: { id: 1, name: "Small Rat", desc: "A rat that moves unlike a normal rat at unnatural speeds and roars like a dragon.", hp: 10, attackMin: 1, attackMax: 3, defense: 1, drops: ["Item_11"] },
  2: { id: 2, name: "Big Rat", desc: "A giant rat with scruffy fur that moves unnaturally and makes strange squeals.", hp: 20, attackMin: 2, attackMax: 4, defense: 2, drops: ["Item_11"] },
  3: { id: 3, name: "Corpse", desc: "A preserved body of an old man stands in your way; the monster produces a strange humming sound.", hp: 10, attackMin: 1, attackMax: 4, defense: 1, drops: ["Item_11"] },
  4: { id: 4, name: "Homeless Man", desc: "Hey man do you have any changgge?", hp: 50, attackMin: 3, attackMax: 7, defense: 10, drops: ["Item_10"] },
  5: { id: 5, name: "Biggie Cheese", desc: "And now, the greatest test of all. They must be made to see that their monstrous god is mortal.", hp: 100, attackMin: 10, attackMax: 20, defense: 10, drops: [] },
  6: { id: 6, name: "Biggest Rat", desc: "The biggest rat around in the hospital. It roars like a lion and moves in a hypnosis dance.", hp: 30, attackMin: 3, attackMax: 6, defense: 5, drops: ["Item_11"] },
  7: { id: 7, name: "Shadow Person", desc: "Dark figures lurk in this room. They stretch and shrink in response to hide from the light.", hp: 10, attackMin: 1, attackMax: 5, defense: 100, drops: ["Item_11"] },
  8: { id: 8, name: "DragonFly", desc: "You hear a creature wings flying around. The sound gets closer and the creature reveals itself as a Dragon.", hp: 40, attackMin: 7, attackMax: 8, defense: 10, drops: ["Item_11", "Item_11"] },
};

/* ─── Puzzles ─── */
export const PUZZLES: Record<number, Puzzle> = {
  1:  { id: 1,  question: "Round and round...", answer: "ring", hint: "You wear it...", attemptsAllowed: 5, rewardItemIds: ["Item_6"] },
  2:  { id: 2,  question: "What has roots as nobody sees, is taller than trees, up, up it goes, and yet never grows?", answer: "mountain", hint: "You hike on this...", attemptsAllowed: 5, rewardItemIds: ["Item_5"] },
  3:  { id: 3,  question: "It cannot be seen, cannot be felt, cannot be heard, cannot be smelt. It lies behind stars and under hills, and empty holes it fills.", answer: "darkness", hint: "Follows night...", attemptsAllowed: 5, rewardItemIds: ["Item_12"] },
  4:  { id: 4,  question: "I have a lock but no key. I have space but no room. You can enter but not go inside. What am I?", answer: "keyboard", hint: "You type on it...", attemptsAllowed: 5, rewardItemIds: ["Item_7"] },
  5:  { id: 5,  question: "I am always in front of you but can never be seen. What am I?", answer: "future", hint: "Time related...", attemptsAllowed: 5, rewardItemIds: ["Item_13"] },
  6:  { id: 6,  question: "The more you take, the more you leave behind. What am I?", answer: "footsteps", hint: "You make them when walking...", attemptsAllowed: 5, rewardItemIds: ["Item_8"] },
  7:  { id: 7,  question: "I speak without a mouth and hear without ears. I have no body but come alive with wind. What am I?", answer: "echo", hint: "Sound that bounces back...", attemptsAllowed: 5, rewardItemIds: ["Item_9"] },
  8:  { id: 8,  question: "I have cities but no houses, forests but no trees, and water but no fish. What am I?", answer: "map", hint: "Used for navigation...", attemptsAllowed: 5, rewardItemIds: ["Item_17"] },
  9:  { id: 9,  question: "I am taken from a mine and shut in a wooden case, from which I am never released, and yet I am used by almost everyone. What am I?", answer: "pencil", hint: "Used for writing...", attemptsAllowed: 5, rewardItemIds: ["Item_19"] },
  10: { id: 10, question: "I am the beginning of the end, the end of time and space. I am essential to creation, and I surround every place. What am I?", answer: "letter", hint: "Part of words...", attemptsAllowed: 5, rewardItemIds: ["Item_10"] },
};

/* ─── Rooms (26 rooms + 4 gate rooms) ─── */
export const ROOMS: Record<number, Room> = {
  // Floor 5 (Rooms 1-5)
  1:  { id: 1,  name: "Janitors Closet", desc: "A dark, musty room that is small in size. You are surrounded by many different cleaning supplies a janitor like yourself needs for their job.", north: -1, south: -1, east: 2, west: -1, monsterId: -1, puzzleId: -1, items: ["Item_1"] },
  2:  { id: 2,  name: "Bathroom", desc: "A quaint little bathroom with three stalls. The windows are cracked, and the light is very dim as you can barely see your reflection.", north: -1, south: -1, east: 3, west: 1, monsterId: -1, puzzleId: 1, items: [] },
  3:  { id: 3,  name: "Patient Room", desc: "A normal patient room that seemingly has not changed even abandoned with the sheets still clean and the beds made. There are 3 beds separated by curtains.", north: -1, south: -1, east: 4, west: 2, monsterId: -1, puzzleId: 2, items: [] },
  4:  { id: 4,  name: "Employee Lounge", desc: 'The room that was once a place for employees to talk and take a break is now abandoned and dirty. The microwave is open with a dirty exploded casserole on the microwave walls. There is a note on the fridge that says, "if you ever see Freeman, tell him I know what he done."', north: -1, south: -1, east: 5, west: 3, monsterId: 1, puzzleId: -1, items: ["Item_16"] },
  5:  { id: 5,  name: "Patient Room", desc: "A normal patient room that seemingly has not changed even abandoned with the sheets still clean and the beds made. There are 3 beds separated by curtains.", north: -1, south: 6, east: -1, west: 4, monsterId: 2, puzzleId: -1, items: [] },

  // Floor 4 (Rooms 6-10)
  6:  { id: 6,  name: "X-Ray Room", desc: "A dark room with a levitated bed in the middle hooked up to a strange machine.", north: 5, south: -1, east: 7, west: -1, monsterId: 1, puzzleId: -1, items: ["Item_15", "Item_12"] },
  7:  { id: 7,  name: "Public Dining Room", desc: "A big room with tables and chairs lay about. You can smell that awful rotten smell here closely.", north: -1, south: -1, east: 8, west: 6, monsterId: -1, puzzleId: 3, items: [] },
  8:  { id: 8,  name: "Cafeteria Serving Area", desc: "A long maze-like railway that leads to an empty long table where maidens in white would give food to the desperate. Plastic trays lay around scattered on the ground.", north: -1, south: -1, east: 9, west: 7, monsterId: -1, puzzleId: -1, items: ["Item_17"] },
  9:  { id: 9,  name: "Employee Dining Area", desc: "Surprisingly a well-maintained area lies before you as the furniture is all upright with no speck of dust or food on the floor. You wonder if anybody has even eaten here before.", north: -1, south: -1, east: 10, west: 8, monsterId: 3, puzzleId: -1, items: [] },
  10: { id: 10, name: "Examination Room", desc: "The room is a metal cage with a big machine in the middle. Seems like some sort of device as it seems like they strap people into the platform and move them into the machine.", north: -1, south: 11, east: -1, west: 9, monsterId: -1, puzzleId: 4, items: [] },

  // Floor 3 (Rooms 11-15)
  11: { id: 11, name: "Morgue Room", desc: "The smell of death is in the room as it is filled with metal coffins in the walls. The room causes great shivers through the body due to how cold it is.", north: 10, south: -1, east: 12, west: -1, monsterId: -1, puzzleId: -1, items: ["Item_19"] },
  12: { id: 12, name: "Furnace Room", desc: "The room is flaming hot as the sweat immediately evaporates from the forehead. There is a torture death trap in the back of the room where a metal cage burns hot with hell flames.", north: -1, south: -1, east: 13, west: 11, monsterId: -1, puzzleId: 5, items: [] },
  13: { id: 13, name: "Autopsy Room", desc: "There is a metal table in the middle of the room with a bunch of sharp tools around it. Seemingly a place to cut open people and check their insides.", north: -1, south: -1, east: 14, west: 12, monsterId: 3, puzzleId: -1, items: ["Item_3"] },
  14: { id: 14, name: "Server Room", desc: "The room is dark with strange devices standing tall and still with many components inside. The devices that once stored information are now gone.", north: -1, south: -1, east: 15, west: 13, monsterId: 1, puzzleId: -1, items: ["Item_18"] },
  15: { id: 15, name: "Patient Room", desc: "A normal patient room that seemingly has not changed even abandoned with the sheets still clean and the beds made. There are 3 beds separated by curtains.", north: -1, south: 16, east: -1, west: 14, monsterId: -1, puzzleId: 6, items: ["Item_4", "Item_19"] },

  // Floor 2 (Rooms 16-20)
  16: { id: 16, name: "Patient Room", desc: "A normal patient room that seemingly has not changed even abandoned with the sheets still clean and the beds made. There are 3 beds separated by curtains.", north: 15, south: -1, east: 17, west: -1, monsterId: -1, puzzleId: 8, items: [] },
  17: { id: 17, name: "ER", desc: "A treatment room for people in desperate need of care, especially after an accident. There is a large bed in the center with many tools around it.", north: -1, south: -1, east: 18, west: 16, monsterId: -1, puzzleId: 7, items: [] },
  18: { id: 18, name: "ER Waiting Room", desc: "A room with dozens of chairs and a turned off TV on the ceiling.", north: -1, south: -1, east: 19, west: 17, monsterId: 6, puzzleId: -1, items: ["Item_13"] },
  19: { id: 19, name: "Surgery Room", desc: "Red stains lay on the floor as the table seemingly has not been used in months. The horror of the past can still be felt now even when abandoned.", north: -1, south: -1, east: 20, west: 18, monsterId: 7, puzzleId: -1, items: ["Item_6", "Item_20"] },
  20: { id: 20, name: "Bathroom", desc: "A dirty room with three stalls and a large mirror with sinks under it, the air has a putrid smell from years of non-cleanliness.", north: -1, south: 21, east: -1, west: 19, monsterId: -1, puzzleId: -1, items: [] },

  // Floor 1 (Rooms 21-26)
  21: { id: 21, name: "ICU Room #1", desc: "One bed in the middle of the room with a bunch of machines next to it that once tracked the life of a patient.", north: 20, south: -1, east: 22, west: -1, monsterId: 8, puzzleId: -1, items: ["Item_14"] },
  22: { id: 22, name: "ICU Room #2", desc: "One bed in the middle of the room with a bunch of machines next to it that once tracked the life of a patient.", north: -1, south: -1, east: 23, west: 21, monsterId: 7, puzzleId: -1, items: ["Item_2"] },
  23: { id: 23, name: "Front Desk", desc: "Once a place for greetings into the building now empty as paper and pens lay about on the desk and floor with the chair still standing.", north: -1, south: -1, east: 24, west: 22, monsterId: -1, puzzleId: 9, items: [] },
  24: { id: 24, name: "Entrance Waiting Room", desc: "A dozen chairs fill the area where people waited to enter the building. There are little crumbled pieces of paper on the floor with little numbers and letters.", north: -1, south: -1, east: 25, west: 23, monsterId: -1, puzzleId: -1, items: ["Item_13", "Item_6"] },
  25: { id: 25, name: "Screening Room", desc: "A large black window is in this room, used to make sure of one's humanity by seemingly scanning their body for objects.", north: -1, south: 26, east: -1, west: 24, monsterId: -1, puzzleId: 10, items: [] },
  26: { id: 26, name: "Entrance", desc: "A JACKED homeless man is guarding the exit door with his shopping cart.", north: 25, south: -1, east: -1, west: -1, monsterId: 4, puzzleId: -1, items: [] },
};

/* ─── Floor system ─── */
export function getFloor(roomId: number): number {
  if (roomId >= 1 && roomId <= 5) return 5;
  if (roomId >= 6 && roomId <= 10) return 4;
  if (roomId >= 11 && roomId <= 15) return 3;
  if (roomId >= 16 && roomId <= 20) return 2;
  if (roomId >= 21 && roomId <= 26) return 1;
  return 1;
}

/* Floor gate transitions: last room on floor -> first room on next floor */
export const FLOOR_GATES: Record<number, { from: number; to: number; keyId: string }> = {
  5: { from: 5, to: 6, keyId: "Item_5" },   // F5 Room 5 south -> F4 Room 6
  4: { from: 10, to: 11, keyId: "Item_7" },  // F4 Room 10 south -> F3 Room 11
  3: { from: 15, to: 16, keyId: "Item_8" },  // F3 Room 15 south -> F2 Room 16
  2: { from: 20, to: 21, keyId: "Item_9" },  // F2 Room 20 south -> F1 Room 21
};

export const EXIT_ROOM = 26;
export const EXIT_KEY = "Item_10";
export const START_ROOM = 1;
export const SECRET_BOSS_ID = 5;
export const TOTAL_PUZZLES = 10;
