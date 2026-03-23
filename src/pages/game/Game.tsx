import { useState, useRef, useEffect } from "react";
import { useGameEngine, type LogEntry } from "./useGameEngine";
import { getFloor } from "./gameData";
import "./Game.css";

const typeColors: Record<LogEntry["type"], string> = {
  narrative: "var(--text-secondary)",
  system: "var(--text-tertiary, #888)",
  combat: "#f59e0b",
  error: "#ef4444",
  success: "#10b981",
  riddle: "#a78bfa",
  monster: "#ef4444",
};

export default function Game() {
  const { log, player, processCommand, room } = useGameEngine();
  const [input, setInput] = useState("");
  const [dropdown, setDropdown] = useState<{ cmd: string; options: string[] } | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    processCommand(input);
    setInput("");
    setDropdown(null);
  };

  const runCmd = (cmd: string) => {
    processCommand(cmd);
    setDropdown(null);
    inputRef.current?.focus();
  };

  const showDropdown = (cmd: string) => {
    const invNames = player.inventoryItems.map(s => s.item.name);
    if (invNames.length === 0) {
      runCmd(cmd);
      return;
    }
    setDropdown({ cmd, options: invNames });
  };

  const hpPct = (player.hp / player.maxHp) * 100;
  const hpColor = hpPct > 50 ? "#10b981" : hpPct > 25 ? "#f59e0b" : "#ef4444";
  const floor = getFloor(player.currentRoom);

  const simpleCommands = [
    { label: "north", cmd: "go north" },
    { label: "south", cmd: "go south" },
    { label: "east", cmd: "go east" },
    { label: "west", cmd: "go west" },
    { label: "look", cmd: "look" },
    { label: "fight", cmd: "fight" },
    { label: "stats", cmd: "stats" },
    { label: "map", cmd: "map" },
    { label: "inventory", cmd: "inventory" },
    { label: "help", cmd: "help" },
  ];

  const itemCommands = [
    { label: "grab", cmd: "grab", needsRoomItems: true },
    { label: "equip", cmd: "equip" },
    { label: "use", cmd: "use" },
    { label: "drop", cmd: "drop" },
    { label: "heal", cmd: "use" },
    { label: "unequip", cmd: "unequip" },
    { label: "puzzle", cmd: "use puzzle" },
    { label: "use key", cmd: "use key" },
  ];

  return (
    <section className="game section">
      <div className="container">
        <p className="section-label">Play Now</p>
        <h2 className="section-title">Escaping The Red Cross</h2>

        <div className="game-layout">
          {/* Sidebar */}
          <aside className="game-sidebar card">
            <div className="game-stats">
              <h3>Player Stats</h3>
              <div className="stat-row">
                <span>HP</span>
                <div className="hp-bar">
                  <div className="hp-fill" style={{ width: `${Math.max(0, hpPct)}%`, background: hpColor }} />
                </div>
                <span className="stat-value">{player.hp}/{player.maxHp}</span>
              </div>
              <div className="stat-row">
                <span>ATK</span>
                <span className="stat-value">{player.attack}</span>
              </div>
              <div className="stat-row">
                <span>DEF</span>
                <span className="stat-value">{player.defense}</span>
              </div>
            </div>

            <div className="game-location">
              <h3>Location</h3>
              <p className="location-name">{room.name}</p>
              <p className="location-floor">Floor {floor} — Room {room.id}</p>
            </div>

            <div className="game-inventory">
              <h3>Inventory ({player.inventoryItems.length})</h3>
              {player.inventoryItems.length === 0 ? (
                <p className="inv-empty">Empty</p>
              ) : (
                <ul>
                  {player.inventoryItems.map((s, i) => (
                    <li key={`${s.item.id}-${i}`} title={s.item.desc}>
                      {s.item.name}
                      <span className="item-type-badge">{s.item.type}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="game-quick-commands">
              <h3>Movement & Info</h3>
              <div className="qc-grid">
                {simpleCommands.map(c => (
                  <button key={c.label} className="qc-btn" onClick={() => runCmd(c.cmd)}>{c.label}</button>
                ))}
              </div>

              <h3 style={{ marginTop: 16 }}>Item Actions</h3>
              <div className="qc-grid">
                {itemCommands.map(c => {
                  if (c.cmd === "unequip" || c.cmd === "use puzzle" || c.cmd === "use key") {
                    return <button key={c.label} className="qc-btn" onClick={() => runCmd(c.cmd)}>{c.label}</button>;
                  }
                  return (
                    <button key={c.label} className="qc-btn" onClick={() => showDropdown(c.cmd)}>{c.label}</button>
                  );
                })}
              </div>

              {/* Dropdown for item selection */}
              {dropdown && (
                <div className="qc-dropdown">
                  <p className="qc-dropdown-title">Select item for '{dropdown.cmd}':</p>
                  {dropdown.options.map((name, i) => (
                    <button key={i} className="qc-dropdown-item" onClick={() => runCmd(`${dropdown.cmd} ${name}`)}>
                      {name}
                    </button>
                  ))}
                  <button className="qc-dropdown-cancel" onClick={() => setDropdown(null)}>Cancel</button>
                </div>
              )}

              {player.inCombat && (
                <>
                  <h3 style={{ marginTop: 16, color: "#f59e0b" }}>Combat</h3>
                  <div className="qc-grid">
                    <button className="qc-btn qc-combat" onClick={() => runCmd("attack")}>attack</button>
                    <button className="qc-btn qc-combat" onClick={() => runCmd("flee")}>flee</button>
                    <button className="qc-btn qc-combat" onClick={() => showDropdown("use")}>use item</button>
                    <button className="qc-btn qc-combat" onClick={() => showDropdown("heal")}>heal</button>
                  </div>
                </>
              )}
            </div>
          </aside>

          {/* Terminal */}
          <div className="game-terminal card" onClick={() => inputRef.current?.focus()}>
            <div className="terminal-header">
              <span className="terminal-dot red" />
              <span className="terminal-dot yellow" />
              <span className="terminal-dot green" />
              <span className="terminal-title">terminal — escaping-the-red-cross</span>
            </div>
            <div className="terminal-body">
              {log.map((entry, i) => (
                <div key={i} className="terminal-line" style={{ color: typeColors[entry.type] }}>
                  {entry.text || "\u00A0"}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
            <form className="terminal-input" onSubmit={handleSubmit}>
              <span className="prompt-symbol">&gt;</span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={player.gameOver ? "Type 'restart'..." : "Enter command..."}
                autoComplete="off"
                spellCheck={false}
              />
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
