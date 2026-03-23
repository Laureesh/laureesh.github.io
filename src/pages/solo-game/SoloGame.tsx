import { useState, useRef, useEffect } from "react";
import { useSoloGameEngine, type LogEntry } from "./useSoloGameEngine";
import "../game/Game.css";

const typeColors: Record<LogEntry["type"], string> = {
  narrative: "var(--text-secondary)",
  system: "var(--text-tertiary, #888)",
  combat: "#f59e0b",
  error: "#ef4444",
  success: "#10b981",
  puzzle: "#a78bfa",
  monster: "#ef4444",
};

export default function SoloGame() {
  const { log, player, processCommand, room } = useSoloGameEngine();
  const [input, setInput] = useState("");
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
  };

  const hpPct = (player.hp / player.maxHp) * 100;
  const hpColor = hpPct > 50 ? "#10b981" : hpPct > 25 ? "#f59e0b" : "#ef4444";

  return (
    <section className="game section">
      <div className="container">
        <p className="section-label">Play Now</p>
        <h2 className="section-title">Hidden Leaf Adventure</h2>

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
              <p className="location-floor">Room {room.id}</p>
            </div>

            <div className="game-inventory">
              <h3>Inventory ({player.inventory.length})</h3>
              {player.inventory.length === 0 ? (
                <p className="inv-empty">Empty</p>
              ) : (
                <ul>
                  {player.inventory.map((stack) => (
                    <li key={stack.item.id} title={stack.item.desc}>
                      {stack.item.name}{stack.quantity > 1 ? ` x${stack.quantity}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="game-equipment">
              <h3>Equipment</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                {player.equippedWeapon ? `Weapon: ${player.equippedWeapon.name}` : "Weapon: None"}
              </p>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                {player.equippedArmor ? `Armor: ${player.equippedArmor.name}` : "Armor: None"}
              </p>
            </div>

            <div className="game-quick-commands">
              <h3>Quick Commands</h3>
              <div className="qc-grid">
                {["north", "south", "east", "west", "look", "explore", "fight", "puzzle", "inventory", "stats", "heals", "help"].map((c) => (
                  <button key={c} className="qc-btn" onClick={() => { processCommand(c); inputRef.current?.focus(); }}>{c}</button>
                ))}
              </div>
            </div>
          </aside>

          {/* Terminal */}
          <div className="game-terminal card" onClick={() => inputRef.current?.focus()}>
            <div className="terminal-header">
              <span className="terminal-dot red" />
              <span className="terminal-dot yellow" />
              <span className="terminal-dot green" />
              <span className="terminal-title">terminal — hidden-leaf-adventure</span>
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
