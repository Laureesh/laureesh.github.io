import { useState, useCallback } from "react";
import {
  ROOMS, ITEMS, MONSTERS, PUZZLES, START_ROOM, FINAL_ROOM,
  type Room, type Item,
} from "./soloGameData";

export interface LogEntry {
  text: string;
  type: "narrative" | "system" | "combat" | "error" | "success" | "puzzle" | "monster";
}

interface InventoryStack {
  item: Item;
  quantity: number;
}

interface PlayerState {
  hp: number;
  maxHp: number;
  baseAttack: number;
  attack: number;
  defense: number;
  equippedWeapon: Item | null;
  equippedArmor: Item | null;
  inventory: InventoryStack[];
  currentRoom: number;
  defeatedMonsters: Set<string>;   // monster IDs
  solvedPuzzles: Set<string>;      // puzzle IDs
  failedPuzzles: Set<string>;      // puzzle IDs
  puzzleAttempts: Record<string, number>;
  unlockedRooms: Set<number>;
  pickedUpItems: Set<string>;      // "roomId-itemId" to track pickups
  gameOver: boolean;
  won: boolean;
  inCombat: string | null;         // monster ID if in combat
  monsterHp: Record<string, number>;
}

function makeInitialState(): PlayerState {
  const baseDefense = 5;
  return {
    hp: 100 + baseDefense,
    maxHp: 100 + baseDefense,
    baseAttack: 10,
    attack: 10,
    defense: baseDefense,
    equippedWeapon: null,
    equippedArmor: null,
    inventory: [],
    currentRoom: START_ROOM,
    defeatedMonsters: new Set(),
    solvedPuzzles: new Set(),
    failedPuzzles: new Set(),
    puzzleAttempts: {},
    unlockedRooms: new Set(),
    pickedUpItems: new Set(),
    gameOver: false,
    won: false,
    inCombat: null,
    monsterHp: {},
  };
}

export function useSoloGameEngine() {
  const [player, setPlayer] = useState<PlayerState>(makeInitialState);
  const startRoom = ROOMS[START_ROOM];

  const [log, setLog] = useState<LogEntry[]>([
    { text: "═══════════════════════════════════════════", type: "system" },
    { text: "    HIDDEN LEAF ADVENTURE", type: "system" },
    { text: "    A Naruto Text-Based RPG", type: "system" },
    { text: "═══════════════════════════════════════════", type: "system" },
    { text: "", type: "system" },
    { text: "Welcome to the Hidden Leaf Adventure, shinobi!", type: "narrative" },
    { text: "Step into the world of Naruto, where the Will of Fire guides your path.", type: "narrative" },
    { text: "Use N, E, S, W to move. Type 'help' to view commands.", type: "system" },
    { text: "", type: "system" },
    { text: `── ${startRoom.name} ──`, type: "system" },
    { text: startRoom.desc, type: "narrative" },
    ...formatExits(startRoom),
    ...formatRoomItems(startRoom, new Set()),
  ]);

  const [awaitingPuzzle, setAwaitingPuzzle] = useState<string | null>(null);

  const addLog = useCallback((entries: LogEntry[]) => {
    setLog(prev => [...prev, ...entries]);
  }, []);

  const processCommand = useCallback((input: string) => {
    if (player.gameOver) {
      if (input.trim().toLowerCase() === "restart") {
        const fresh = makeInitialState();
        setPlayer(fresh);
        const room = ROOMS[START_ROOM];
        setLog([
          { text: "Game restarted!", type: "success" },
          { text: "", type: "system" },
          { text: `── ${room.name} ──`, type: "system" },
          { text: room.desc, type: "narrative" },
          ...formatExits(room),
          ...formatRoomItems(room, new Set()),
        ]);
        setAwaitingPuzzle(null);
        return;
      }
      addLog([{ text: "Game over. Type 'restart' to play again.", type: "error" }]);
      return;
    }

    const trimmed = input.trim().toLowerCase();
    const room = ROOMS[player.currentRoom];

    // ── Puzzle answer mode ──
    if (awaitingPuzzle) {
      handlePuzzleAnswer(trimmed);
      return;
    }

    // ── Combat mode ──
    if (player.inCombat) {
      handleCombatCommand(trimmed);
      return;
    }

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0];
    const arg = parts.slice(1).join(" ");

    switch (cmd) {
      case "help": case "h":
        showHelp();
        break;
      case "n": case "north":
        move("north");
        break;
      case "e": case "east":
        move("east");
        break;
      case "s": case "south":
        move("south");
        break;
      case "w": case "west":
        move("west");
        break;
      case "look": case "l":
        look();
        break;
      case "explore": case "exp":
        explore();
        break;
      case "map": case "m":
        showMap();
        break;
      case "stats": case "playerstats":
        showStats();
        break;
      case "inventory": case "inv": case "i":
        showInventory();
        break;
      case "pickup": case "p":
        pickup(arg);
        break;
      case "drop": case "d":
        drop(arg);
        break;
      case "inspect": case "ins":
        inspect(arg);
        break;
      case "use": case "u":
        useItem(arg);
        break;
      case "equip": case "eq":
        equipItem(arg);
        break;
      case "unequip": case "uneq":
        unequipAll();
        break;
      case "fight":
        initiateCombat();
        break;
      case "examine": case "exam":
        examineMonster();
        break;
      case "attack": case "a": case "atk":
        if (player.inCombat) handleCombatCommand("attack");
        else addLog([{ text: "There's nothing to attack. Use 'fight' to start combat.", type: "error" }]);
        break;
      case "puzzle":
        startPuzzle();
        break;
      case "heals":
        showHeals();
        break;
      case "restart": case "re":
        const fresh = makeInitialState();
        setPlayer(fresh);
        const r = ROOMS[START_ROOM];
        setLog([
          { text: "Game restarted!", type: "success" },
          { text: "", type: "system" },
          { text: `── ${r.name} ──`, type: "system" },
          { text: r.desc, type: "narrative" },
          ...formatExits(r),
          ...formatRoomItems(r, new Set()),
        ]);
        setAwaitingPuzzle(null);
        break;
      default:
        addLog([{ text: `Unknown command: '${cmd}'. Type 'help' for commands.`, type: "error" }]);
    }

    // ── Command handlers ──

    function showHelp() {
      addLog([
        { text: "", type: "system" },
        { text: "═══ COMMANDS ═══", type: "system" },
        { text: "  n/s/e/w         — Move direction", type: "system" },
        { text: "  look            — Examine current room", type: "system" },
        { text: "  explore         — Search room for items", type: "system" },
        { text: "  map             — Show all rooms", type: "system" },
        { text: "  pickup <item>   — Pick up an item", type: "system" },
        { text: "  drop <item>     — Drop an item", type: "system" },
        { text: "  inspect <item>  — Inspect an item", type: "system" },
        { text: "  use <item>      — Use a healing item", type: "system" },
        { text: "  equip <item>    — Equip weapon/armor", type: "system" },
        { text: "  unequip         — Unequip all gear", type: "system" },
        { text: "  inventory       — View inventory", type: "system" },
        { text: "  heals           — List healing items", type: "system" },
        { text: "  fight           — Start combat with monster", type: "system" },
        { text: "  examine         — Examine a monster", type: "system" },
        { text: "  puzzle          — Attempt a puzzle", type: "system" },
        { text: "  stats           — View player stats", type: "system" },
        { text: "  restart         — Start over", type: "system" },
        { text: "", type: "system" },
      ]);
    }

    function move(dir: "north" | "east" | "south" | "west") {
      const nextId = room.exits[dir];
      if (!nextId) {
        addLog([{ text: "You can't go that way.", type: "error" }]);
        return;
      }

      const nextRoom = ROOMS[nextId];
      if (!nextRoom) {
        addLog([{ text: "Dead end.", type: "error" }]);
        return;
      }

      // Lock check
      if (nextRoom.locked && !player.unlockedRooms.has(nextId)) {
        const keyId = nextRoom.requiredItemId;
        const hasKey = player.inventory.some(s => s.item.id === keyId);
        if (!hasKey) {
          const keyItem = ITEMS[keyId];
          addLog([{ text: `The door is locked. You need: ${keyItem ? keyItem.name : keyId}`, type: "error" }]);
          return;
        }
        // Unlock and consume key
        const newUnlocked = new Set(player.unlockedRooms);
        newUnlocked.add(nextId);
        const newInv = player.inventory
          .map(s => s.item.id === keyId ? { ...s, quantity: s.quantity - 1 } : s)
          .filter(s => s.quantity > 0);

        setPlayer(p => ({ ...p, currentRoom: nextId, inventory: newInv, unlockedRooms: newUnlocked }));
        addLog([
          { text: `You used the ${ITEMS[keyId].name} to unlock the door.`, type: "success" },
          ...describeRoom(nextRoom),
        ]);
        return;
      }

      // Check if this is the final room
      if (nextId === FINAL_ROOM) {
        setPlayer(p => ({ ...p, currentRoom: nextId, gameOver: true, won: true }));
        addLog([
          { text: "", type: "system" },
          { text: "═══════════════════════════════════════════", type: "success" },
          { text: "  🍥 YOU COMPLETED THE HIDDEN LEAF ADVENTURE! 🍥", type: "success" },
          { text: "═══════════════════════════════════════════", type: "success" },
          { text: "", type: "success" },
          { text: "You stand before the Memorial Stone, honoring all who came before.", type: "narrative" },
          { text: "The Will of Fire burns brightly within you, shinobi.", type: "narrative" },
          { text: "Your journey through Konoha is complete.", type: "narrative" },
          { text: "", type: "system" },
          { text: "Congratulations! Type 'restart' to play again.", type: "system" },
        ]);
        return;
      }

      setPlayer(p => ({ ...p, currentRoom: nextId }));
      addLog(describeRoom(nextRoom));
    }

    function look() {
      const entries: LogEntry[] = [
        { text: "", type: "system" },
        { text: `You are in Room ${room.id}: ${room.name}`, type: "system" },
        { text: room.desc, type: "narrative" },
        ...formatExits(room),
      ];
      addLog(entries);
    }

    function explore() {
      const roomItems = getRoomItems(room, player.pickedUpItems);
      if (roomItems.length === 0) {
        addLog([{ text: "You searched the area but found nothing of interest.", type: "system" }]);
      } else {
        addLog([
          { text: `You explore ${room.name} and found:`, type: "system" },
          ...roomItems.map(id => {
            const item = ITEMS[id];
            const typeLabel = item.type.charAt(0).toUpperCase() + item.type.slice(1);
            return { text: `  "${item.name}" (${typeLabel})`, type: "system" as const };
          }),
        ]);
      }

      if (room.monsterId && !player.defeatedMonsters.has(room.monsterId)) {
        const m = MONSTERS[room.monsterId];
        addLog([{ text: `A hostile presence: ${m.name}`, type: "monster" }]);
      }
      if (room.puzzleId && !player.solvedPuzzles.has(room.puzzleId)) {
        addLog([{ text: "A puzzle is present here.", type: "puzzle" }]);
      }
    }

    function showMap() {
      const entries: LogEntry[] = [{ text: "═══ MAP ═══", type: "system" }];
      for (const [id, r] of Object.entries(ROOMS)) {
        const marker = Number(id) === player.currentRoom ? " (YOU)" : "";
        entries.push({ text: `  ${id}: ${r.name}${marker}`, type: "system" });
      }
      addLog(entries);
    }

    function showStats() {
      const entries: LogEntry[] = [
        { text: "", type: "system" },
        { text: "═══ PLAYER STATS ═══", type: "system" },
        { text: `  Health: ${player.hp}/${player.maxHp}`, type: "system" },
        { text: `  Attack: ${player.attack}${player.equippedWeapon ? ` (Weapon: +${player.equippedWeapon.damage}, Crit: ${player.equippedWeapon.critChance})` : ""}`, type: "system" },
        { text: `  Defense: ${player.defense}${player.equippedArmor ? ` (Armor: +${player.equippedArmor.defense} DEF, +${player.equippedArmor.bonusHP} HP)` : ""}`, type: "system" },
        { text: `  Room: ${room.name}`, type: "system" },
        { text: "════════════════════", type: "system" },
      ];
      addLog(entries);
    }

    function showInventory() {
      if (player.inventory.length === 0) {
        addLog([{ text: "Your inventory is empty. []", type: "system" }]);
        return;
      }
      const entries: LogEntry[] = [{ text: "Your Inventory:", type: "system" }];
      for (const stack of player.inventory) {
        const typeLabel = stack.item.type.charAt(0).toUpperCase() + stack.item.type.slice(1);
        const qty = stack.quantity > 1 ? ` x${stack.quantity}` : "";
        entries.push({ text: `  "${stack.item.name}" (${typeLabel}${qty})`, type: "system" });
      }
      addLog(entries);
    }

    function pickup(itemName: string) {
      if (!itemName) { addLog([{ text: "Pick up what?", type: "error" }]); return; }
      const roomItems = getRoomItems(room, player.pickedUpItems);
      const match = roomItems.find(id => ITEMS[id].name.toLowerCase().includes(itemName));
      if (!match) { addLog([{ text: "No such item here.", type: "error" }]); return; }

      const item = ITEMS[match];
      const newPickedUp = new Set(player.pickedUpItems);
      newPickedUp.add(`${room.id}-${match}`);

      const newInv = addToInventory(player.inventory, item);
      setPlayer(p => ({ ...p, inventory: newInv, pickedUpItems: newPickedUp }));
      addLog([{ text: `Picked up: ${item.name}`, type: "success" }]);
    }

    function drop(itemName: string) {
      if (!itemName) { addLog([{ text: "Drop what?", type: "error" }]); return; }
      const stackIdx = player.inventory.findIndex(s => s.item.name.toLowerCase().includes(itemName));
      if (stackIdx === -1) { addLog([{ text: "You don't have that item.", type: "error" }]); return; }

      const stack = player.inventory[stackIdx];
      const newInv = [...player.inventory];
      if (stack.quantity > 1) {
        newInv[stackIdx] = { ...stack, quantity: stack.quantity - 1 };
      } else {
        newInv.splice(stackIdx, 1);
      }
      setPlayer(p => ({ ...p, inventory: newInv }));
      addLog([{ text: `Dropped: ${stack.item.name}`, type: "success" }]);
    }

    function inspect(itemName: string) {
      if (!itemName) { addLog([{ text: "Inspect what?", type: "error" }]); return; }
      const stack = player.inventory.find(s => s.item.name.toLowerCase().includes(itemName));
      if (!stack) { addLog([{ text: "You don't have that item.", type: "error" }]); return; }

      const item = stack.item;
      const entries: LogEntry[] = [
        { text: `Item: ${item.name}`, type: "system" },
        { text: item.desc, type: "system" },
        { text: `Quantity: ${stack.quantity}`, type: "system" },
      ];

      switch (item.type) {
        case "weapon":
          entries.push({ text: `Type: Weapon | Damage: ${item.damage} | Crit: ${item.critChance}`, type: "system" });
          break;
        case "armor":
          entries.push({ text: `Type: Armor | Defense: ${item.defense} | Bonus HP: ${item.bonusHP}`, type: "system" });
          break;
        case "heal":
          entries.push({ text: `Type: Healing | Heal: ${item.healAmount} | Regen: ${item.regenAmount}/turn`, type: "system" });
          break;
        default:
          entries.push({ text: `Type: Misc`, type: "system" });
      }
      addLog(entries);
    }

    function useItem(itemName: string) {
      if (!itemName) { addLog([{ text: "Use what?", type: "error" }]); return; }
      const stackIdx = player.inventory.findIndex(s => s.item.name.toLowerCase().includes(itemName));
      if (stackIdx === -1) { addLog([{ text: "You don't have that item.", type: "error" }]); return; }

      const item = player.inventory[stackIdx].item;

      if (item.type === "weapon") {
        equipWeapon(item);
        return;
      }
      if (item.type === "armor") {
        equipArmor(item);
        return;
      }
      if (item.type === "heal") {
        const heal = Math.min(item.healAmount || 0, player.maxHp - player.hp);
        const newInv = [...player.inventory];
        if (newInv[stackIdx].quantity > 1) {
          newInv[stackIdx] = { ...newInv[stackIdx], quantity: newInv[stackIdx].quantity - 1 };
        } else {
          newInv.splice(stackIdx, 1);
        }
        setPlayer(p => ({ ...p, hp: Math.min(p.maxHp, p.hp + (item.healAmount || 0)), inventory: newInv }));
        addLog([{ text: `You used ${item.name}. +${heal} HP!`, type: "success" }]);
        return;
      }

      addLog([{ text: "This item cannot be used.", type: "error" }]);
    }

    function equipItem(itemName: string) {
      if (!itemName) { addLog([{ text: "Equip what?", type: "error" }]); return; }
      const stack = player.inventory.find(s => s.item.name.toLowerCase().includes(itemName));
      if (!stack) { addLog([{ text: "You don't have that item.", type: "error" }]); return; }

      if (stack.item.type === "weapon") { equipWeapon(stack.item); return; }
      if (stack.item.type === "armor") { equipArmor(stack.item); return; }
      addLog([{ text: "You can't equip that.", type: "error" }]);
    }

    function equipWeapon(item: Item) {
      setPlayer(p => {
        let newAttack = p.baseAttack;
        newAttack += (item.damage || 0);
        return { ...p, equippedWeapon: item, attack: newAttack };
      });
      addLog([{ text: `Equipped weapon: ${item.name}`, type: "success" }]);
    }

    function equipArmor(item: Item) {
      setPlayer(p => {
        // Remove old armor bonuses
        let newDef = 5; // base defense
        let newMaxHp = 100 + 5; // base
        if (p.equippedWeapon) {
          // keep weapon-based attack
        }

        newDef += (item.defense || 0);
        newMaxHp = 100 + newDef + (item.bonusHP || 0);
        const newHp = Math.min(p.hp, newMaxHp);

        return { ...p, equippedArmor: item, defense: newDef, maxHp: newMaxHp, hp: newHp };
      });
      addLog([{ text: `Equipped armor: ${item.name}`, type: "success" }]);
    }

    function unequipAll() {
      let didSomething = false;
      const entries: LogEntry[] = [];

      if (player.equippedWeapon) {
        entries.push({ text: `Unequipped weapon: ${player.equippedWeapon.name}`, type: "success" });
        didSomething = true;
      }
      if (player.equippedArmor) {
        entries.push({ text: `Unequipped armor: ${player.equippedArmor.name}`, type: "success" });
        didSomething = true;
      }

      if (!didSomething) {
        addLog([{ text: "You have nothing equipped.", type: "system" }]);
        return;
      }

      setPlayer(p => ({
        ...p,
        equippedWeapon: null,
        equippedArmor: null,
        attack: p.baseAttack,
        defense: 5,
        maxHp: 105,
        hp: Math.min(p.hp, 105),
      }));
      addLog(entries);
    }

    function showHeals() {
      const heals = player.inventory.filter(s => s.item.type === "heal");
      if (heals.length === 0) {
        addLog([{ text: "You have no healing items.", type: "system" }]);
        return;
      }
      addLog([
        { text: "Healing Items Available:", type: "system" },
        ...heals.map(s => ({
          text: ` - ${s.item.name} (Heal: ${s.item.healAmount}, Regen: +${s.item.regenAmount}/turn, Qty: ${s.quantity})`,
          type: "system" as const,
        })),
        { text: "Use with: use <item>", type: "system" },
      ]);
    }

    function initiateCombat() {
      if (!room.monsterId || player.defeatedMonsters.has(room.monsterId)) {
        addLog([{ text: "There is no enemy here.", type: "error" }]);
        return;
      }
      const m = MONSTERS[room.monsterId];
      const currentMhp = player.monsterHp[m.id] ?? m.hp;

      setPlayer(p => ({
        ...p,
        inCombat: m.id,
        monsterHp: { ...p.monsterHp, [m.id]: currentMhp },
      }));

      // Perform first attack automatically
      performAttack(m.id, currentMhp);
    }

    function examineMonster() {
      if (!room.monsterId || player.defeatedMonsters.has(room.monsterId)) {
        addLog([{ text: "There is no monster here.", type: "system" }]);
        return;
      }
      const m = MONSTERS[room.monsterId];
      const mhp = player.monsterHp[m.id] ?? m.hp;

      addLog([
        { text: "═══ Examining Monster ═══", type: "monster" },
        { text: `Name: ${m.name}`, type: "system" },
        { text: `Description: ${m.desc}`, type: "system" },
        { text: `Attack Damage: ${m.attack}`, type: "system" },
        { text: `Health: ${mhp}/${m.hp}`, type: "system" },
        { text: "═════════════════════════", type: "monster" },
        { text: "", type: "system" },
        { text: "═══ Player Stats ═══", type: "success" },
        { text: `Health: ${player.hp}/${player.maxHp}`, type: "system" },
        { text: `Attack Damage: ${player.attack}`, type: "system" },
        { text: "═════════════════════", type: "success" },
        { text: "", type: "system" },
        { text: "Do you want to attack or ignore?", type: "system" },
      ]);
    }

    function performAttack(monsterId: string, monsterCurrentHp: number) {
      const m = MONSTERS[monsterId];
      const dmg = Math.max(1, player.attack);
      let mhp = monsterCurrentHp - dmg;
      const entries: LogEntry[] = [
        { text: `You attacked ${m.name} dealing ${dmg} damage!`, type: "combat" },
      ];

      // Monster defeated
      if (mhp <= 0) {
        mhp = 0;
        entries.push({ text: `You defeated ${m.name}!`, type: "success" });

        const newDefeated = new Set(player.defeatedMonsters);
        newDefeated.add(monsterId);
        const newInv = [...player.inventory];

        // Process drops
        for (const drop of m.drops) {
          const roll = Math.random() * 100;
          if (roll <= drop.chance) {
            const dropItem = ITEMS[drop.itemId];
            if (dropItem) {
              const existing = newInv.findIndex(s => s.item.id === dropItem.id);
              if (existing >= 0) {
                newInv[existing] = { ...newInv[existing], quantity: newInv[existing].quantity + 1 };
              } else {
                newInv.push({ item: dropItem, quantity: 1 });
              }
              entries.push({ text: `Monster dropped: "${dropItem.name}" (${dropItem.type})`, type: "success" });
            }
          }
        }

        setPlayer(p => ({
          ...p,
          defeatedMonsters: newDefeated,
          inventory: newInv,
          inCombat: null,
          monsterHp: { ...p.monsterHp, [monsterId]: 0 },
        }));
        addLog(entries);
        return;
      }

      // Monster counter-attack
      const mDmg = Math.max(0, m.attack - player.defense);
      const newPlayerHp = player.hp - mDmg;

      entries.push({ text: `${m.name} strikes back for ${mDmg} damage!`, type: "monster" });
      entries.push({ text: "═══ Battle Status ═══", type: "system" });
      entries.push({ text: `Your HP: ${newPlayerHp}/${player.maxHp}`, type: "system" });
      entries.push({ text: `${m.name}'s HP: ${mhp}/${m.hp}`, type: "system" });
      entries.push({ text: "═════════════════════", type: "system" });
      entries.push({ text: "", type: "system" });
      entries.push({ text: "Your turn: [attack]  [use <item-name>]", type: "system" });

      if (newPlayerHp <= 0) {
        entries.push(
          { text: "", type: "system" },
          { text: "═══════════════════════════════════════════", type: "error" },
          { text: "  ☠ YOU WERE DEFEATED ☠", type: "error" },
          { text: "═══════════════════════════════════════════", type: "error" },
          { text: "Type 'restart' to try again.", type: "system" },
        );
        setPlayer(p => ({ ...p, hp: 0, gameOver: true, inCombat: null, monsterHp: { ...p.monsterHp, [monsterId]: mhp } }));
      } else {
        setPlayer(p => ({ ...p, hp: newPlayerHp, monsterHp: { ...p.monsterHp, [monsterId]: mhp } }));
      }

      addLog(entries);
    }

    function startPuzzle() {
      if (!room.puzzleId) {
        addLog([{ text: "There is no puzzle here.", type: "error" }]);
        return;
      }
      if (player.solvedPuzzles.has(room.puzzleId)) {
        addLog([{ text: "You have already solved this puzzle.", type: "system" }]);
        return;
      }
      if (player.failedPuzzles.has(room.puzzleId)) {
        addLog([{ text: "This puzzle has been locked. No attempts remain.", type: "error" }]);
        return;
      }

      const puzzle = PUZZLES[room.puzzleId];
      if (!puzzle) { addLog([{ text: "Puzzle data not found.", type: "error" }]); return; }

      const attemptsLeft = puzzle.maxAttempts - (player.puzzleAttempts[puzzle.id] || 0);

      setAwaitingPuzzle(room.puzzleId);
      addLog([
        { text: "", type: "system" },
        { text: "═══ PUZZLE INFO ═══", type: "puzzle" },
        { text: `Type: ${puzzle.type}`, type: "system" },
        { text: `Question: ${puzzle.question}`, type: "system" },
        { text: `Attempts Left: ${attemptsLeft}`, type: "system" },
        { text: `Reward: ${puzzle.rewardItemId !== "I0" ? ITEMS[puzzle.rewardItemId]?.name ?? "None" : "None"}`, type: "system" },
        ...(puzzle.hints.length > 0 ? [{ text: `Hint: ${puzzle.hints[0]}`, type: "system" as const }] : []),
        { text: "════════════════════", type: "puzzle" },
        { text: "", type: "system" },
        { text: "Type your answer below:", type: "system" },
      ]);
    }

    // eslint-disable-next-line @typescript-eslint/no-shadow
    function handlePuzzleAnswer(input: string) {
      if (!awaitingPuzzle) return;
      const puzzle = PUZZLES[awaitingPuzzle];
      if (!puzzle) return;

      if (input === "cancel") {
        setAwaitingPuzzle(null);
        addLog([{ text: "You step away from the puzzle.", type: "system" }]);
        return;
      }

      if (input === "hint") {
        const attempts = player.puzzleAttempts[puzzle.id] || 0;
        const hintIdx = Math.min(attempts, puzzle.hints.length - 1);
        addLog([{ text: `Hint: ${puzzle.hints[hintIdx]}`, type: "puzzle" }]);
        return;
      }

      if (input === puzzle.answer) {
        // Correct!
        const newSolved = new Set(player.solvedPuzzles);
        newSolved.add(puzzle.id);
        setAwaitingPuzzle(null);

        const entries: LogEntry[] = [{ text: puzzle.passMessage, type: "success" }];

        const newInv = [...player.inventory];
        if (puzzle.rewardItemId && puzzle.rewardItemId !== "I0") {
          const reward = ITEMS[puzzle.rewardItemId];
          if (reward) {
            const existing = newInv.findIndex(s => s.item.id === reward.id);
            if (existing >= 0) {
              newInv[existing] = { ...newInv[existing], quantity: newInv[existing].quantity + 1 };
            } else {
              newInv.push({ item: reward, quantity: 1 });
            }
            entries.push({ text: `You received: ${reward.name}`, type: "success" });
          }
        }

        setPlayer(p => ({ ...p, solvedPuzzles: newSolved, inventory: newInv }));
        addLog(entries);
      } else {
        // Wrong
        const newAttempts = { ...player.puzzleAttempts, [puzzle.id]: (player.puzzleAttempts[puzzle.id] || 0) + 1 };
        const attemptsLeft = puzzle.maxAttempts - newAttempts[puzzle.id];

        addLog([
          { text: puzzle.failMessage, type: "error" },
          { text: `Attempts left: ${attemptsLeft}`, type: "error" },
        ]);

        if (attemptsLeft <= 0) {
          const newFailed = new Set(player.failedPuzzles);
          newFailed.add(puzzle.id);
          setPlayer(p => ({ ...p, puzzleAttempts: newAttempts, failedPuzzles: newFailed }));
          setAwaitingPuzzle(null);
          addLog([{ text: "The puzzle locks permanently...", type: "error" }]);
        } else {
          setPlayer(p => ({ ...p, puzzleAttempts: newAttempts }));
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-shadow
    function handleCombatCommand(input: string) {
      if (!player.inCombat) return;
      const parts2 = input.split(/\s+/);
      const cmd2 = parts2[0];

      if (cmd2 === "attack" || cmd2 === "a" || cmd2 === "atk") {
        const mhp = player.monsterHp[player.inCombat] ?? MONSTERS[player.inCombat].hp;
        performAttack(player.inCombat, mhp);
      } else if (cmd2 === "use" || cmd2 === "u") {
        const itemArg = parts2.slice(1).join(" ");
        useItem(itemArg);
      } else {
        addLog([{ text: "In combat! Use [attack] or [use <item>]", type: "error" }]);
      }
    }

  }, [player, awaitingPuzzle, addLog]);

  return {
    log,
    player,
    processCommand,
    room: ROOMS[player.currentRoom],
  };
}

/* ─── Helpers ─── */

function formatExits(room: Room): LogEntry[] {
  const entries: LogEntry[] = [{ text: "Exits:", type: "system" }];
  const dirs = ["north", "east", "south", "west"] as const;
  let hasExit = false;
  for (const dir of dirs) {
    const id = room.exits[dir];
    if (id > 0 && ROOMS[id]) {
      entries.push({ text: `  [${dir.toUpperCase()}] Room ${id} (${ROOMS[id].name})`, type: "system" });
      hasExit = true;
    }
  }
  if (!hasExit) entries.push({ text: "  No visible exits.", type: "system" });
  return entries;
}

function getRoomItems(room: Room, pickedUp: Set<string>): string[] {
  return room.items.filter(id => !pickedUp.has(`${room.id}-${id}`) && id !== "I0");
}

function formatRoomItems(room: Room, pickedUp: Set<string>): LogEntry[] {
  const items = getRoomItems(room, pickedUp);
  if (items.length === 0) return [];
  return [{ text: `You see: ${items.map(id => ITEMS[id]?.name ?? id).join(", ")}`, type: "system" }];
}

function describeRoom(room: Room): LogEntry[] {
  const entries: LogEntry[] = [
    { text: "", type: "system" },
    { text: `── ${room.name} ──`, type: "system" },
    { text: room.desc, type: "narrative" },
  ];

  if (room.monsterId && MONSTERS[room.monsterId]) {
    entries.push({ text: `There is a monster in here. Type 'examine' to investigate.`, type: "monster" });
  }
  if (room.puzzleId && PUZZLES[room.puzzleId]) {
    entries.push({ text: `There is a puzzle in here. Type 'puzzle' to start playing.`, type: "puzzle" });
  }

  entries.push(...formatExits(room));
  return entries;
}

function addToInventory(inventory: InventoryStack[], item: Item): InventoryStack[] {
  const newInv = [...inventory];
  const existing = newInv.findIndex(s => s.item.id === item.id);
  if (existing >= 0) {
    newInv[existing] = { ...newInv[existing], quantity: newInv[existing].quantity + 1 };
  } else {
    newInv.push({ item, quantity: 1 });
  }
  return newInv;
}
