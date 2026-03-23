import { useState, useCallback } from "react";
import {
  ROOMS, ITEMS, MONSTERS, PUZZLES,
  START_ROOM, EXIT_ROOM, EXIT_KEY, SECRET_BOSS_ID, TOTAL_PUZZLES,
  getFloor, FLOOR_GATES,
  type Room, type Item,
} from "./gameData";

export interface LogEntry {
  text: string;
  type: "narrative" | "system" | "combat" | "error" | "success" | "riddle" | "monster";
}

interface InventoryItem {
  item: Item;
  usesLeft: number;
}

interface PlayerState {
  hp: number;
  maxHp: number;
  baseAttack: number;
  attack: number;
  defense: number;
  equippedWeapon: Item | null;
  equippedArmor: Record<string, Item>; // slot -> item
  inventory: InventoryItem[];
  currentRoom: number;
  defeatedMonsters: Set<string>;    // "roomId" keys
  solvedPuzzles: Set<number>;
  unlockedGates: Set<number>;       // floor numbers
  pickedUpItems: Set<string>;       // "roomId-itemId"
  gameOver: boolean;
  won: boolean;
  inCombat: boolean;
  combatMonsterHp: number;
  combatMonsterId: number;
  combatPreviousRoom: number;
  tempAttackBoost: number;
  tempAttackTurns: number;
}

function makeInitial(): PlayerState {
  return {
    hp: 100, maxHp: 100,
    baseAttack: 10, attack: 10, defense: 0,
    equippedWeapon: null, equippedArmor: {},
    inventory: [],
    currentRoom: START_ROOM,
    defeatedMonsters: new Set(),
    solvedPuzzles: new Set(),
    unlockedGates: new Set(),
    pickedUpItems: new Set(),
    gameOver: false, won: false,
    inCombat: false, combatMonsterHp: 0, combatMonsterId: -1, combatPreviousRoom: 1,
    tempAttackBoost: 0, tempAttackTurns: 0,
  };
}

export function useGameEngine() {
  const [player, setPlayer] = useState<PlayerState>(makeInitial);
  const startRoom = ROOMS[START_ROOM];

  const [log, setLog] = useState<LogEntry[]>([
    { text: "═══════════════════════════════════════════", type: "system" },
    { text: "    ESCAPING THE RED CROSS", type: "system" },
    { text: "    A Text-Based Horror Adventure", type: "system" },
    { text: "═══════════════════════════════════════════", type: "system" },
    { text: "", type: "system" },
    { text: "Welcome to Escaping The Red Cross!", type: "narrative" },
    { text: "You are a janitor trapped in an abandoned hospital.", type: "narrative" },
    { text: "Fight monsters, solve puzzles, find keys, and escape!", type: "narrative" },
    { text: "Type 'help' for commands or 'tutorial' for a walkthrough.", type: "system" },
    { text: "", type: "system" },
    ...describeRoom(startRoom, new Set(), new Set()),
  ]);

  const [awaitingPuzzle, setAwaitingPuzzle] = useState<number | null>(null);

  const addLog = useCallback((entries: LogEntry[]) => {
    setLog(prev => [...prev, ...entries]);
  }, []);

  const processCommand = useCallback((input: string) => {
    if (player.gameOver) {
      if (input.trim().toLowerCase() === "restart") {
        const fresh = makeInitial();
        setPlayer(fresh);
        setLog([
          { text: "Game restarted!", type: "success" },
          ...describeRoom(ROOMS[START_ROOM], new Set(), new Set()),
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
    if (awaitingPuzzle !== null) {
      handlePuzzleAnswer(trimmed);
      return;
    }

    // ── Combat mode ──
    if (player.inCombat) {
      handleCombatCommand(trimmed);
      return;
    }

    // Normalize shortcuts
    let cmd = trimmed;
    if (cmd === "f" || cmd === "forward") cmd = "go east";
    if (cmd === "b" || cmd === "back" || cmd === "leave") cmd = "go back";
    if (cmd === "n") cmd = "go north";
    if (cmd === "s") cmd = "go south";
    if (cmd === "e" && !cmd.startsWith("equip")) cmd = "go east";
    if (cmd === "w") cmd = "go west";
    if (cmd === "lo") cmd = "look";
    if (cmd === "i") cmd = "inventory";
    if (cmd === "g") cmd = "grab";
    if (cmd.startsWith("g ") && !cmd.startsWith("go ") && !cmd.startsWith("grab ")) cmd = "grab " + cmd.substring(2);

    const parts = cmd.split(/\s+/);
    const verb = parts[0];
    const arg = parts.slice(1).join(" ");

    switch (verb) {
      case "help": showHelp(); break;
      case "tutorial": showTutorial(); break;
      case "look": doLook(arg); break;
      case "go": doMove(arg); break;
      case "north": doMove("north"); break;
      case "south": doMove("south"); break;
      case "east": doMove("east"); break;
      case "west": doMove("west"); break;
      case "inventory": showInventory(); break;
      case "grab": case "pickup": doGrab(arg); break;
      case "drop": doDrop(arg); break;
      case "equip": doEquip(arg); break;
      case "unequip": case "ue": doUnequip(); break;
      case "use": doUse(arg); break;
      case "fight": case "attack": case "atk": case "hit": doFight(); break;
      case "stats": showStats(); break;
      case "health": addLog([{ text: `Your current HP: ${player.hp}`, type: "system" }]); break;
      case "heal": addLog([{ text: "You must use a healing item. Example: use Buzzball", type: "system" }]); break;
      case "map": showMap(); break;
      case "unlock":
        if (arg === "secret") doSecretBoss();
        else addLog([{ text: "Unknown command.", type: "error" }]);
        break;
      case "restart": {
        const fresh = makeInitial();
        setPlayer(fresh);
        setLog([
          { text: "Game restarted!", type: "success" },
          ...describeRoom(ROOMS[START_ROOM], new Set(), new Set()),
        ]);
        setAwaitingPuzzle(null);
        break;
      }
      case "exit": case "quit":
        addLog([{ text: "Thanks for playing! (Refresh to start over)", type: "system" }]);
        break;
      default:
        addLog([{ text: "The janitor, in his confusion, punches himself in the face.", type: "error" }]);
    }

    /* ── Inner command handlers ── */

    function showHelp() {
      addLog([
        { text: "", type: "system" },
        { text: "═══════════ HELP MENU ═══════════", type: "system" },
        { text: "", type: "system" },
        { text: "Movement:", type: "system" },
        { text: "  go north/south/east/west  or  n/s/e/w", type: "system" },
        { text: "  forward/f (east)  |  back/b (previous room)", type: "system" },
        { text: "", type: "system" },
        { text: "Interaction:", type: "system" },
        { text: "  look — examine current room", type: "system" },
        { text: "  look <item> — examine an item", type: "system" },
        { text: "  grab <item> — pick up item", type: "system" },
        { text: "  drop <item> — drop item", type: "system" },
        { text: "  equip <item> — equip weapon/armor", type: "system" },
        { text: "  unequip — unequip current item", type: "system" },
        { text: "  use <item> — use consumable", type: "system" },
        { text: "  use puzzle — attempt room puzzle", type: "system" },
        { text: "  use key — try to unlock a gate", type: "system" },
        { text: "", type: "system" },
        { text: "Combat:", type: "system" },
        { text: "  fight — start battle with monster", type: "system" },
        { text: "", type: "system" },
        { text: "Info:", type: "system" },
        { text: "  inventory | stats | map | health", type: "system" },
        { text: "  tutorial | help | restart", type: "system" },
        { text: "═════════════════════════════════", type: "system" },
      ]);
    }

    function showTutorial() {
      addLog([
        { text: "", type: "system" },
        { text: "═══ TUTORIAL: ESCAPING THE RED CROSS ═══", type: "system" },
        { text: "", type: "system" },
        { text: "MOVEMENT: Use 'go north/south/east/west' or shortcuts n/s/e/w.", type: "system" },
        { text: "Use 'forward' (east) or 'back' to return to the previous room.", type: "system" },
        { text: "", type: "system" },
        { text: "PUZZLES: Type 'use puzzle' when a vending machine puzzle is present.", type: "system" },
        { text: "Solve puzzles to earn item rewards including floor keys!", type: "system" },
        { text: "", type: "system" },
        { text: "COMBAT: Type 'fight' when a monster is present.", type: "system" },
        { text: "In battle: ATTACK, USE <item>, FLEE, HEAL <item>, or INVENTORY.", type: "system" },
        { text: "", type: "system" },
        { text: "ITEMS: 'grab <name>' to pick up, 'equip <name>' to equip.", type: "system" },
        { text: "Use consumables with 'use <name>' to heal.", type: "system" },
        { text: "", type: "system" },
        { text: "FLOORS: The hospital has 5 floors (F5 down to F1).", type: "system" },
        { text: "Find keys from puzzles to unlock gates between floors.", type: "system" },
        { text: "Defeat the Homeless Man at the Entrance to escape!", type: "system" },
        { text: "═════════════════════════════════════════", type: "system" },
      ]);
    }

    function doLook(target: string) {
      if (!target) {
        addLog(describeRoom(room, player.defeatedMonsters, player.pickedUpItems));
        return;
      }
      // Look at item in room or inventory
      const roomItems = getRoomItems(room, player.pickedUpItems);
      const roomMatch = roomItems.find(id => ITEMS[id]?.name.toLowerCase() === target);
      if (roomMatch) {
        addLog([{ text: `=== ${ITEMS[roomMatch].name} ===`, type: "system" }, { text: ITEMS[roomMatch].desc, type: "narrative" }]);
        return;
      }
      const invMatch = player.inventory.find(s => s.item.name.toLowerCase() === target);
      if (invMatch) {
        addLog([{ text: `=== ${invMatch.item.name} ===`, type: "system" }, { text: invMatch.item.desc, type: "narrative" }]);
        return;
      }
      addLog([{ text: "You must be going crazy, because there is no item to look at.", type: "error" }]);
    }

    function doMove(dir: string) {
      if (dir === "back") {
        // Go west (reverse of primary east path)
        doMove("west");
        return;
      }

      let targetRoom = -1;
      switch (dir) {
        case "north": targetRoom = room.north; break;
        case "south": targetRoom = room.south; break;
        case "east": targetRoom = room.east; break;
        case "west": targetRoom = room.west; break;
        default:
          addLog([{ text: "The janitor, in his confusion, punches himself in the face.", type: "error" }]);
          return;
      }

      if (targetRoom === -1) {
        addLog([{ text: `You can't go ${dir} from here.`, type: "error" }]);
        return;
      }

      // Check floor gate transitions
      for (const [floorStr, gate] of Object.entries(FLOOR_GATES)) {
        const floor = Number(floorStr);
        if (room.id === gate.from && targetRoom === gate.to) {
          if (!player.unlockedGates.has(floor)) {
            // Need key
            const hasKey = player.inventory.some(s => s.item.id === gate.keyId);
            if (!hasKey) {
              addLog([
                { text: "", type: "system" },
                { text: "══════ GATE LOCKED ══════", type: "error" },
                { text: `This gate requires ${ITEMS[gate.keyId].name} to proceed to Floor ${floor - 1}.`, type: "error" },
                { text: "Solve puzzles to find floor keys!", type: "system" },
                { text: "═════════════════════════", type: "error" },
              ]);
              return;
            }
            // Unlock gate, consume key
            const newUnlocked = new Set(player.unlockedGates);
            newUnlocked.add(floor);
            const newInv = player.inventory.filter(s => s.item.id !== gate.keyId);
            setPlayer(p => ({ ...p, unlockedGates: newUnlocked, inventory: newInv, currentRoom: targetRoom }));
            addLog([
              { text: "", type: "system" },
              { text: "══════ GATE UNLOCKED ══════", type: "success" },
              { text: `You used ${ITEMS[gate.keyId].name} to unlock the gate.`, type: "success" },
              { text: `Descending to Floor ${floor - 1}...`, type: "success" },
              { text: "═══════════════════════════", type: "success" },
              ...describeRoom(ROOMS[targetRoom], player.defeatedMonsters, player.pickedUpItems),
            ]);
            return;
          }
        }
      }

      // Check exit room
      if (targetRoom === EXIT_ROOM) {
        const hasExitKey = player.inventory.some(s => s.item.id === EXIT_KEY);
        if (!hasExitKey) {
          // Can still enter room 26 but need to defeat the Homeless Man
        }
      }

      setPlayer(p => ({ ...p, currentRoom: targetRoom }));
      addLog(describeRoom(ROOMS[targetRoom], player.defeatedMonsters, player.pickedUpItems));
    }

    function showInventory() {
      if (player.inventory.length === 0) {
        addLog([{ text: "Your inventory is empty.", type: "system" }]);
        return;
      }
      addLog([
        { text: "═══ INVENTORY ═══", type: "system" },
        ...player.inventory.map(s => ({
          text: `  - [${s.item.name}]: ${s.item.desc}${s.item.type === "consumable" && s.item.uses ? ` (Uses: ${s.usesLeft})` : ""}`,
          type: "system" as const,
        })),
      ]);
    }

    function doGrab(itemName: string) {
      if (!itemName) { addLog([{ text: "Usage: grab <item name>", type: "error" }]); return; }
      const roomItems = getRoomItems(room, player.pickedUpItems);
      const match = roomItems.find(id => ITEMS[id]?.name.toLowerCase().includes(itemName));
      if (!match) { addLog([{ text: "There is no item with that name here.", type: "error" }]); return; }

      const item = ITEMS[match];
      const newPickedUp = new Set(player.pickedUpItems);
      newPickedUp.add(`${room.id}-${match}`);
      const newInv = [...player.inventory, { item, usesLeft: item.uses || 1 }];
      setPlayer(p => ({ ...p, inventory: newInv, pickedUpItems: newPickedUp }));
      addLog([{ text: `You picked up: ${item.name}`, type: "success" }]);
    }

    function doDrop(itemName: string) {
      if (!itemName) { addLog([{ text: "Usage: drop <item name>", type: "error" }]); return; }
      const idx = player.inventory.findIndex(s => s.item.name.toLowerCase().includes(itemName));
      if (idx === -1) { addLog([{ text: "You don't have that item.", type: "error" }]); return; }
      const dropped = player.inventory[idx];
      const newInv = [...player.inventory];
      newInv.splice(idx, 1);
      setPlayer(p => ({ ...p, inventory: newInv }));
      addLog([{ text: `You dropped: ${dropped.item.name}`, type: "success" }]);
    }

    function doEquip(itemName: string) {
      if (!itemName) { addLog([{ text: "Usage: equip <item name>", type: "error" }]); return; }
      const stack = player.inventory.find(s => s.item.name.toLowerCase().includes(itemName) || s.item.id.toLowerCase() === itemName);
      if (!stack) { addLog([{ text: "Item not found in inventory.", type: "error" }]); return; }
      const item = stack.item;

      if (item.type === "weapon") {
        setPlayer(p => ({
          ...p,
          equippedWeapon: item,
          attack: p.baseAttack + item.value + p.tempAttackBoost,
        }));
        addLog([{ text: `Equipped weapon: ${item.name} (+${item.value} ATK)`, type: "success" }]);
      } else if (item.type === "armor") {
        const slot = item.slot || "torso";
        setPlayer(p => {
          const newArmor = { ...p.equippedArmor, [slot]: item };
          const totalDef = Object.values(newArmor).reduce((sum, a) => sum + a.value, 0);
          return { ...p, equippedArmor: newArmor, defense: totalDef };
        });
        addLog([{ text: `Equipped armor: ${item.name} (+${item.value} DEF, ${item.slot || "torso"} slot)`, type: "success" }]);
      } else {
        addLog([{ text: "You cannot equip this item.", type: "error" }]);
      }
    }

    function doUnequip() {
      if (!player.equippedWeapon && Object.keys(player.equippedArmor).length === 0) {
        addLog([{ text: "Nothing is currently equipped.", type: "system" }]);
        return;
      }
      const entries: LogEntry[] = [];
      if (player.equippedWeapon) {
        entries.push({ text: `Unequipped weapon: ${player.equippedWeapon.name}`, type: "success" });
      }
      for (const [slot, armor] of Object.entries(player.equippedArmor)) {
        entries.push({ text: `Unequipped armor: ${armor.name} (${slot})`, type: "success" });
      }
      setPlayer(p => ({
        ...p,
        equippedWeapon: null,
        equippedArmor: {},
        attack: p.baseAttack + p.tempAttackBoost,
        defense: 0,
      }));
      addLog(entries);
    }

    function doUse(target: string) {
      if (!target) { addLog([{ text: "Usage: use <item> or use puzzle or use key", type: "error" }]); return; }

      if (target === "puzzle" || target === "vending") {
        startPuzzle();
        return;
      }

      if (target === "key" || target.startsWith("key")) {
        handleKeyUsage();
        return;
      }

      const idx = player.inventory.findIndex(s =>
        s.item.name.toLowerCase().includes(target) || s.item.id.toLowerCase() === target
      );
      if (idx === -1) { addLog([{ text: "Item not found.", type: "error" }]); return; }
      const stack = player.inventory[idx];
      const item = stack.item;

      if (item.type === "consumable") {
        if (stack.usesLeft <= 0) { addLog([{ text: "No uses remaining.", type: "error" }]); return; }
        const entries: LogEntry[] = [];

        if (item.id === "Item_13") {
          // Strange Syringe: +5 attack for 3 turns
          entries.push({ text: `You used ${item.name}. +5 ATK for 3 turns!`, type: "success" });
          setPlayer(p => {
            const newInv = [...p.inventory];
            newInv[idx] = { ...stack, usesLeft: stack.usesLeft - 1 };
            if (newInv[idx].usesLeft <= 0) newInv.splice(idx, 1);
            return {
              ...p, inventory: newInv,
              tempAttackBoost: 5, tempAttackTurns: 3,
              attack: p.baseAttack + (p.equippedWeapon?.value || 0) + 5,
            };
          });
        } else if (item.id === "Item_12") {
          // Adrenaline Shot - extra attack (just boost attack this turn)
          entries.push({ text: `You used ${item.name}. Extra attack power this turn!`, type: "success" });
          const newInv = [...player.inventory];
          newInv[idx] = { ...stack, usesLeft: stack.usesLeft - 1 };
          if (newInv[idx].usesLeft <= 0) newInv.splice(idx, 1);
          setPlayer(p => ({ ...p, inventory: newInv }));
        } else if (item.id === "Item_11") {
          // Coin - used for puzzles
          entries.push({ text: `You used ${item.name}. It's a vending machine coin.`, type: "system" });
          const newInv = [...player.inventory];
          newInv[idx] = { ...stack, usesLeft: stack.usesLeft - 1 };
          if (newInv[idx].usesLeft <= 0) newInv.splice(idx, 1);
          setPlayer(p => ({ ...p, inventory: newInv }));
        } else {
          // Healing item
          const heal = Math.min(item.value, player.maxHp - player.hp);
          entries.push({ text: `You used ${item.name}. +${heal} HP!`, type: "success" });
          const newInv = [...player.inventory];
          newInv[idx] = { ...stack, usesLeft: stack.usesLeft - 1 };
          if (newInv[idx].usesLeft <= 0) newInv.splice(idx, 1);
          setPlayer(p => ({ ...p, hp: Math.min(p.maxHp, p.hp + item.value), inventory: newInv }));
        }
        addLog(entries);
      } else if (item.type === "weapon" || item.type === "armor") {
        doEquip(target);
      } else {
        addLog([{ text: "You can't use that item here.", type: "error" }]);
      }
    }

    function handleKeyUsage() {
      // Check if we're at a gate transition point
      for (const [floorStr, gate] of Object.entries(FLOOR_GATES)) {
        const floor = Number(floorStr);
        if (room.id === gate.from && !player.unlockedGates.has(floor)) {
          const hasKey = player.inventory.some(s => s.item.id === gate.keyId);
          if (hasKey) {
            const newUnlocked = new Set(player.unlockedGates);
            newUnlocked.add(floor);
            const newInv = player.inventory.filter(s => s.item.id !== gate.keyId);
            const targetRoom = gate.to;
            setPlayer(p => ({ ...p, unlockedGates: newUnlocked, inventory: newInv, currentRoom: targetRoom }));
            addLog([
              { text: `You used ${ITEMS[gate.keyId].name} to unlock the gate!`, type: "success" },
              { text: `Descending to Floor ${floor - 1}...`, type: "success" },
              ...describeRoom(ROOMS[targetRoom], player.defeatedMonsters, player.pickedUpItems),
            ]);
            return;
          }
          addLog([{ text: `You need ${ITEMS[gate.keyId].name} to unlock this gate.`, type: "error" }]);
          return;
        }
      }
      addLog([{ text: "There is no gate here to unlock.", type: "error" }]);
    }

    function doFight() {
      if (room.monsterId === -1 || player.defeatedMonsters.has(String(room.id))) {
        addLog([{ text: "There is nothing to fight here.", type: "error" }]);
        return;
      }
      const m = MONSTERS[room.monsterId];
      if (!m) { addLog([{ text: "There is nothing to fight here.", type: "error" }]); return; }

      setPlayer(p => ({
        ...p,
        inCombat: true,
        combatMonsterHp: m.hp,
        combatMonsterId: room.monsterId,
        combatPreviousRoom: room.id,
      }));

      addLog([
        { text: "", type: "system" },
        { text: "═══ BATTLE START ═══", type: "combat" },
        { text: `Enemy: ${m.name}`, type: "combat" },
        { text: `Your HP: ${player.hp}/100   Enemy HP: ${m.hp}/${m.hp}`, type: "system" },
        { text: "", type: "system" },
        { text: "═══ COMBAT START ═══", type: "combat" },
        { text: `A ${m.name} appears!`, type: "combat" },
        { text: "You attack first.", type: "system" },
        { text: "", type: "system" },
        { text: `Your HP: ${player.hp} | ${m.name} HP: ${m.hp}`, type: "system" },
        { text: "Choose: ATTACK, USE <item>, FLEE, HEAL <item>, INVENTORY", type: "system" },
      ]);
    }

    function handleCombatCommand(input: string) {
      const m = MONSTERS[player.combatMonsterId];
      if (!m) return;

      const parts2 = input.split(/\s+/);
      const cmd2 = parts2[0].toUpperCase();
      let playerActed = false;

      switch (cmd2) {
        case "ATTACK": case "ATK": case "A": case "HIT": {
          const dmg = player.attack;
          const effectiveDmg = Math.max(0, dmg - m.defense);
          const newMhp = player.combatMonsterHp - effectiveDmg;
          addLog([{ text: `Player attacked ${m.name} for ${effectiveDmg} damage.`, type: "combat" }]);

          if (newMhp <= 0) {
            // Victory
            const newDefeated = new Set(player.defeatedMonsters);
            newDefeated.add(String(player.currentRoom));
            const newInv = [...player.inventory];

            const entries: LogEntry[] = [
              { text: `You defeated the ${m.name}!`, type: "success" },
              { text: "", type: "system" },
              { text: "═══ VICTORY ═══", type: "success" },
            ];

            for (const dropId of m.drops) {
              const dropItem = ITEMS[dropId];
              if (dropItem) {
                newInv.push({ item: dropItem, usesLeft: dropItem.uses || 1 });
                entries.push({ text: `You received: ${dropItem.name}`, type: "success" });
              }
            }

            // Check if this was the exit room boss
            if (player.currentRoom === EXIT_ROOM) {
              const hasExitKey = newInv.some(s => s.item.id === EXIT_KEY);
              if (hasExitKey) {
                entries.push(
                  { text: "", type: "system" },
                  { text: "═══════════════════════════════════════════", type: "success" },
                  { text: "  YOU ESCAPED THE RED CROSS!", type: "success" },
                  { text: "═══════════════════════════════════════════", type: "success" },
                  { text: "", type: "success" },
                  { text: "The homeless man collapses and you grab the Entrance Key.", type: "narrative" },
                  { text: "You burst through the hospital doors into the cold night air.", type: "narrative" },
                  { text: "You're free. But the nightmares may never end...", type: "narrative" },
                  { text: "", type: "system" },
                  { text: "Congratulations! Type 'restart' to play again.", type: "system" },
                );
                setPlayer(p => ({
                  ...p, inCombat: false, combatMonsterHp: 0,
                  defeatedMonsters: newDefeated, inventory: newInv,
                  gameOver: true, won: true,
                }));
                addLog(entries);
                return;
              }
            }

            setPlayer(p => ({
              ...p, inCombat: false, combatMonsterHp: 0,
              defeatedMonsters: newDefeated, inventory: newInv,
            }));
            addLog(entries);
            return;
          }

          setPlayer(p => ({ ...p, combatMonsterHp: newMhp }));
          playerActed = true;
          break;
        }

        case "USE": {
          const itemArg = parts2.slice(1).join(" ");
          if (!itemArg) { addLog([{ text: "Which item?", type: "system" }]); return; }
          const idx = player.inventory.findIndex(s => s.item.name.toLowerCase().includes(itemArg.toLowerCase()));
          if (idx === -1) { addLog([{ text: "Item not found.", type: "error" }]); return; }
          const stack = player.inventory[idx];
          if (stack.item.type === "consumable") {
            if (stack.usesLeft <= 0) { addLog([{ text: "No uses remaining.", type: "error" }]); return; }
            const heal = Math.min(stack.item.value, player.maxHp - player.hp);
            const newInv = [...player.inventory];
            newInv[idx] = { ...stack, usesLeft: stack.usesLeft - 1 };
            if (newInv[idx].usesLeft <= 0) newInv.splice(idx, 1);
            setPlayer(p => ({ ...p, hp: Math.min(p.maxHp, p.hp + stack.item.value), inventory: newInv }));
            addLog([{ text: `You used ${stack.item.name}. +${heal} HP!`, type: "success" }]);
            playerActed = true;
          } else {
            addLog([{ text: "You cannot use that item.", type: "error" }]);
          }
          break;
        }

        case "HEAL": {
          const itemArg = parts2.slice(1).join(" ");
          if (!itemArg) { addLog([{ text: "Which item?", type: "system" }]); return; }
          const idx = player.inventory.findIndex(s => s.item.name.toLowerCase().includes(itemArg.toLowerCase()));
          if (idx === -1) { addLog([{ text: "Item not found. Your turn is wasted.", type: "error" }]); playerActed = true; break; }
          const stack = player.inventory[idx];
          if (stack.item.type === "consumable" && stack.usesLeft > 0) {
            const heal = Math.min(stack.item.value, player.maxHp - player.hp);
            const newInv = [...player.inventory];
            newInv[idx] = { ...stack, usesLeft: stack.usesLeft - 1 };
            if (newInv[idx].usesLeft <= 0) newInv.splice(idx, 1);
            setPlayer(p => ({ ...p, hp: Math.min(p.maxHp, p.hp + stack.item.value), inventory: newInv }));
            addLog([{ text: `You used ${stack.item.name}. +${heal} HP!`, type: "success" }]);
          } else {
            addLog([{ text: "You cannot use that item.", type: "error" }]);
          }
          playerActed = true;
          break;
        }

        case "FLEE": case "FL": {
          addLog([{ text: `You flee before the ${m.name} stops your escapade.`, type: "system" }]);
          setPlayer(p => ({
            ...p, inCombat: false, combatMonsterHp: 0,
            hp: 50, currentRoom: p.combatPreviousRoom,
          }));
          return;
        }

        case "INVENTORY": case "I": {
          showInventory();
          addLog([{ text: "Do you want to EQUIP, UNEQUIP, or CANCEL?", type: "system" }]);
          // For simplicity in browser, just show inventory without sub-menu
          return;
        }

        default:
          addLog([{ text: "Invalid action. Choose ATTACK, USE <item>, FLEE, HEAL <item>, or INVENTORY.", type: "error" }]);
          return;
      }

      // Monster counter-attack
      if (playerActed && player.combatMonsterHp > 0) {
        const mDmg = m.attackMin + Math.floor(Math.random() * (m.attackMax - m.attackMin + 1));
        const newHp = player.hp - mDmg;
        addLog([{ text: `${m.name} attacked you for ${mDmg} damage!`, type: "monster" }]);

        if (newHp <= 0) {
          // Player defeated - flee with 50 HP
          addLog([
            { text: `You flee before the ${m.name} stops your escapade.`, type: "system" },
          ]);
          setPlayer(p => ({
            ...p, hp: 50, inCombat: false, combatMonsterHp: 0,
            currentRoom: p.combatPreviousRoom,
          }));
          return;
        }

        setPlayer(p => ({ ...p, hp: newHp }));
        addLog([
          { text: "", type: "system" },
          { text: `Your HP: ${newHp} | ${m.name} HP: ${player.combatMonsterHp - Math.max(0, player.attack - m.defense) > 0 ? player.combatMonsterHp : "???"}`, type: "system" },
          { text: "Choose: ATTACK, USE <item>, FLEE, HEAL <item>, INVENTORY", type: "system" },
        ]);

        // Decrement temp attack boost
        if (player.tempAttackTurns > 0) {
          setPlayer(p => {
            const newTurns = p.tempAttackTurns - 1;
            if (newTurns <= 0) {
              return {
                ...p, tempAttackTurns: 0, tempAttackBoost: 0,
                attack: p.baseAttack + (p.equippedWeapon?.value || 0),
              };
            }
            return { ...p, tempAttackTurns: newTurns };
          });
        }
      }
    }

    function startPuzzle() {
      if (room.puzzleId === -1) {
        addLog([{ text: "There is no puzzle in this room.", type: "error" }]);
        return;
      }
      if (player.solvedPuzzles.has(room.puzzleId)) {
        addLog([{ text: "You have already solved this puzzle.", type: "system" }]);
        return;
      }
      const puzzle = PUZZLES[room.puzzleId];
      if (!puzzle) { addLog([{ text: "There is no puzzle in this room.", type: "error" }]); return; }

      setAwaitingPuzzle(room.puzzleId);
      addLog([
        { text: "", type: "system" },
        { text: "═══ PUZZLE ENCOUNTER ═══", type: "riddle" },
        { text: "A vending machine blocks your path. Its screen displays:", type: "narrative" },
        { text: "", type: "system" },
        { text: `Puzzle ${puzzle.id}`, type: "riddle" },
        { text: puzzle.question, type: "riddle" },
        { text: "", type: "system" },
        { text: `Attempts allowed: ${puzzle.attemptsAllowed}`, type: "system" },
        { text: "Type your answer, 'hint' for a hint, or 'back' to exit.", type: "system" },
      ]);
    }

    function handlePuzzleAnswer(input: string) {
      if (awaitingPuzzle === null) return;
      const puzzle = PUZZLES[awaitingPuzzle];
      if (!puzzle) return;

      if (input === "back" || input === "cancel") {
        setAwaitingPuzzle(null);
        addLog([{ text: "You step away from the vending machine.", type: "system" }]);
        return;
      }

      if (input === "hint") {
        addLog([{ text: `Hint: ${puzzle.hint}`, type: "riddle" }]);
        return;
      }

      if (input === puzzle.answer.toLowerCase()) {
        const newSolved = new Set(player.solvedPuzzles);
        newSolved.add(puzzle.id);
        setAwaitingPuzzle(null);

        const entries: LogEntry[] = [{ text: "Correct! The vending machine whirs to life...", type: "success" }];
        const newInv = [...player.inventory];
        for (const rewardId of puzzle.rewardItemIds) {
          const reward = ITEMS[rewardId];
          if (reward) {
            newInv.push({ item: reward, usesLeft: reward.uses || 1 });
            entries.push({ text: `  + Received: ${reward.name}`, type: "success" });
          }
        }
        entries.push({ text: "Rewards have been added to your inventory.", type: "success" });
        entries.push({ text: "═══ PUZZLE SOLVED ═══", type: "success" });

        setPlayer(p => ({ ...p, solvedPuzzles: newSolved, inventory: newInv }));
        addLog(entries);
      } else {
        addLog([{ text: "Incorrect.", type: "error" }]);
      }
    }

    function showStats() {
      addLog([
        { text: "═══ PLAYER STATS ═══", type: "system" },
        { text: `  HP: ${player.hp}/${player.maxHp}`, type: "system" },
        { text: `  Attack: ${player.attack}${player.equippedWeapon ? ` (${player.equippedWeapon.name}: +${player.equippedWeapon.value})` : ""}`, type: "system" },
        { text: `  Defense: ${player.defense}`, type: "system" },
        { text: `  Equipped: ${player.equippedWeapon?.name || "None"}`, type: "system" },
        { text: `  Armor: ${Object.values(player.equippedArmor).map(a => a.name).join(", ") || "None"}`, type: "system" },
        { text: `  Floor: ${getFloor(player.currentRoom)}`, type: "system" },
        { text: `  Room: ${room.name}`, type: "system" },
        { text: `  Puzzles Solved: ${player.solvedPuzzles.size}/${TOTAL_PUZZLES}`, type: "system" },
        { text: "════════════════════", type: "system" },
      ]);
    }

    function showMap() {
      const floor = getFloor(player.currentRoom);
      const entries: LogEntry[] = [{ text: `═══ MAP (Floor ${floor}) ═══`, type: "system" }];
      for (const [id, r] of Object.entries(ROOMS)) {
        if (getFloor(Number(id)) === floor) {
          const marker = Number(id) === player.currentRoom ? " ← YOU" : "";
          entries.push({ text: `  Room ${id}: ${r.name}${marker}`, type: "system" });
        }
      }
      addLog(entries);
    }

    function doSecretBoss() {
      if (player.currentRoom !== 1) {
        addLog([{ text: "You feel nothing special here.", type: "system" }]);
        return;
      }
      if (player.solvedPuzzles.size < TOTAL_PUZZLES) {
        addLog([{ text: "The air is still. Nothing happens... maybe you're missing something.", type: "system" }]);
        return;
      }

      const m = MONSTERS[SECRET_BOSS_ID];
      addLog([
        { text: "", type: "system" },
        { text: "A loud rumble shakes the closet...", type: "narrative" },
        { text: "A shadow rises...", type: "narrative" },
        { text: "BIGGIE CHEESE CHALLENGES YOU!", type: "combat" },
        { text: "", type: "system" },
      ]);

      setPlayer(p => ({
        ...p,
        inCombat: true,
        combatMonsterHp: m.hp,
        combatMonsterId: SECRET_BOSS_ID,
        combatPreviousRoom: 1,
      }));

      addLog([
        { text: "═══ SECRET BOSS BATTLE ═══", type: "combat" },
        { text: `Enemy: ${m.name} (HP: ${m.hp})`, type: "combat" },
        { text: "Choose: ATTACK, USE <item>, FLEE, HEAL <item>", type: "system" },
      ]);
    }

  }, [player, awaitingPuzzle, addLog]);

  return {
    log,
    player: {
      ...player,
      inventoryItems: player.inventory,
    },
    processCommand,
    room: ROOMS[player.currentRoom],
    getFloor,
  };
}

/* ─── Helpers ─── */

function getRoomItems(room: Room, pickedUp: Set<string>): string[] {
  return room.items.filter(id => !pickedUp.has(`${room.id}-${id}`));
}

function describeRoom(room: Room, defeated: Set<string>, pickedUp: Set<string>): LogEntry[] {
  const floor = getFloor(room.id);
  const entries: LogEntry[] = [
    { text: "", type: "system" },
    { text: `[Room ${room.id}] ${room.name} (Floor ${floor})`, type: "system" },
    { text: "════════════════════════════════════════════════════════════", type: "system" },
    { text: "", type: "system" },
    { text: room.desc, type: "narrative" },
  ];

  // Exits
  const dirs: string[] = [];
  if (room.north !== -1) dirs.push(`north (room ${room.north})`);
  if (room.south !== -1) dirs.push(`south (room ${room.south})`);
  if (room.east !== -1) dirs.push(`east (room ${room.east})`);
  if (room.west !== -1) dirs.push(`west (room ${room.west})`);
  entries.push({ text: "", type: "system" });
  entries.push({ text: "Available directions:", type: "system" });
  dirs.forEach(d => entries.push({ text: `  - ${d}`, type: "system" }));

  // Items
  const roomItems = getRoomItems(room, pickedUp);
  if (roomItems.length === 0) {
    entries.push({ text: "", type: "system" });
    entries.push({ text: "This room has no items.", type: "system" });
  } else {
    entries.push({ text: "", type: "system" });
    entries.push({ text: "Items in this room:", type: "system" });
    roomItems.forEach(id => {
      const item = ITEMS[id];
      if (item) entries.push({ text: `  - ${item.name}`, type: "system" });
    });
  }

  // Puzzle
  if (room.puzzleId !== -1) {
    entries.push({ text: "", type: "system" });
    entries.push({ text: "There is a puzzle here. Type 'use puzzle' to attempt it.", type: "riddle" });
  }

  // Monster
  if (room.monsterId !== -1 && !defeated.has(String(room.id))) {
    const m = MONSTERS[room.monsterId];
    if (m) {
      entries.push({ text: "", type: "system" });
      entries.push({ text: `A monster is here: ${m.name}. Type 'fight' to battle.`, type: "monster" });
      entries.push({ text: m.desc, type: "narrative" });
    }
  }

  return entries;
}
