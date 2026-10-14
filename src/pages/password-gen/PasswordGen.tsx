import { useState, useCallback, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Info,
  Copy,
  Check,
  RefreshCw,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  Hash,
  Search,
  Loader2,
  ChevronDown,
  ChevronUp,
  Plus,
} from "lucide-react";
import { addDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import "./PasswordGen.css";

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()_+-=[]{}|;:,.<>?";

async function sha1(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function md5(text: string): Promise<string> {
  // Simple MD5 implementation for display purposes
  function md5cycle(x: number[], k: number[]) {
    let a = x[0], b = x[1], c = x[2], d = x[3];
    // prettier-ignore
    const S = [7,12,17,22, 5,9,14,20, 4,11,16,23, 6,10,15,21];
    // prettier-ignore
    const T = [
      0xd76aa478,0xe8c7b756,0x242070db,0xc1bdceee,0xf57c0faf,0x4787c62a,0xa8304613,0xfd469501,
      0x698098d8,0x8b44f7af,0xffff5bb1,0x895cd7be,0x6b901122,0xfd987193,0xa679438e,0x49b40821,
      0xf61e2562,0xc040b340,0x265e5a51,0xe9b6c7aa,0xd62f105d,0x02441453,0xd8a1e681,0xe7d3fbc8,
      0x21e1cde6,0xc33707d6,0xf4d50d87,0x455a14ed,0xa9e3e905,0xfcefa3f8,0x676f02d9,0x8d2a4c8a,
      0xfffa3942,0x8771f681,0x6d9d6122,0xfde5380c,0xa4beea44,0x4bdecfa9,0xf6bb4b60,0xbebfbc70,
      0x289b7ec6,0xeaa127fa,0xd4ef3085,0x04881d05,0xd9d4d039,0xe6db99e5,0x1fa27cf8,0xc4ac5665,
      0xf4292244,0x432aff97,0xab9423a7,0xfc93a039,0x655b59c3,0x8f0ccc92,0xffeff47d,0x85845dd1,
      0x6fa87e4f,0xfe2ce6e0,0xa3014314,0x4e0811a1,0xf7537e82,0xbd3af235,0x2ad7d2bb,0xeb86d391,
    ];
    // prettier-ignore
    const G = [
      0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,
      1,6,11,0,5,10,15,4,9,14,3,8,13,2,7,12,
      5,8,11,14,1,4,7,10,13,0,3,6,9,12,15,2,
      0,7,14,5,12,3,10,1,8,15,6,13,4,11,2,9,
    ];
    for (let i = 0; i < 64; i++) {
      let f: number;
      if (i < 16) f = (b & c) | (~b & d);
      else if (i < 32) f = (d & b) | (~d & c);
      else if (i < 48) f = b ^ c ^ d;
      else f = c ^ (~d | b);
      const temp = d;
      d = c;
      c = b;
      const r = S[Math.floor(i / 16) * 4 + (i % 4)];
      b = (b + (((a + f + T[i] + k[G[i]]) | 0) << r | ((a + f + T[i] + k[G[i]]) >>> 0) >>> (32 - r))) | 0;
      a = temp;
    }
    x[0] = (x[0] + a) | 0;
    x[1] = (x[1] + b) | 0;
    x[2] = (x[2] + c) | 0;
    x[3] = (x[3] + d) | 0;
  }

  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) bytes.push(text.charCodeAt(i));
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const bitLen = text.length * 8;
  bytes.push(bitLen & 0xff, (bitLen >> 8) & 0xff, (bitLen >> 16) & 0xff, (bitLen >> 24) & 0xff, 0, 0, 0, 0);

  const state = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
  for (let i = 0; i < bytes.length; i += 64) {
    const w: number[] = [];
    for (let j = 0; j < 16; j++) {
      w.push(bytes[i + j * 4] | (bytes[i + j * 4 + 1] << 8) | (bytes[i + j * 4 + 2] << 16) | (bytes[i + j * 4 + 3] << 24));
    }
    md5cycle(state, w);
  }

  return state
    .map((v) =>
      [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
    )
    .join("");
}

// Common passwords for the local rainbow table demo
const COMMON_PASSWORDS = [
  "password", "123456", "12345678", "qwerty", "abc123", "monkey", "1234567",
  "letmein", "trustno1", "dragon", "baseball", "iloveyou", "master", "sunshine",
  "ashley", "bailey", "shadow", "123456789", "1234567890", "654321", "superman",
  "qazwsx", "michael", "football", "password1", "password123", "batman", "login",
  "hello", "charlie", "donald", "admin", "welcome", "666666", "654321", "jesus",
  "password1!", "flower", "hottie", "loveme", "pepper", "daniel", "robert",
  "matthew", "jordan", "access", "master", "mustang", "shadow", "michael1",
  "111111", "2000", "jordan23", "test", "test123", "princess", "computer",
  "starwars", "summer", "thomas", "internet", "service", "canada", "soccer",
  "whatever", "buster", "killer", "george", "harley", "cheese", "hammer",
  "amanda", "maggie", "yankees", "thunder", "andrew", "ginger", "joshua",
  "matrix", "apple", "orange", "banana", "hunter", "hunter2", "ranger",
  "cookie", "silver", "chocolate", "biteme", "secret", "samantha", "guitar",
  "austin", "merlin", "chicken", "corvette", "1q2w3e4r", "qwerty123",
  "1qaz2wsx", "passw0rd", "p@ssword", "p@ssw0rd", "Pass1234", "Winter2024",
];

interface CrackResult {
  hash: string;
  type: string;
  result: string | null;
}

async function buildRainbowTable(words: string[]): Promise<Map<string, string>> {
  const table = new Map<string, string>();
  for (const pw of words) {
    const [h1, h256, hMd5] = await Promise.all([
      sha1(pw),
      sha256(pw),
      Promise.resolve(md5(pw)),
    ]);
    table.set(hMd5, pw);
    table.set(h1, pw);
    table.set(h256, pw);
  }
  return table;
}

function detectHashType(hash: string): string {
  const len = hash.length;
  if (len === 32) return "md5";
  if (len === 40) return "sha1";
  if (len === 64) return "sha256";
  return "Unknown";
}

function getStrength(
  length: number,
  upper: boolean,
  lower: boolean,
  numbers: boolean,
  symbols: boolean,
): { level: number; label: string; color: string } {
  let poolSize = 0;
  if (upper) poolSize += 26;
  if (lower) poolSize += 26;
  if (numbers) poolSize += 10;
  if (symbols) poolSize += SYMBOLS.length;
  const entropy = Math.log2(poolSize) * length;

  if (entropy < 28) return { level: 1, label: "Very Weak", color: "#ef4444" };
  if (entropy < 36) return { level: 2, label: "Weak", color: "#f97316" };
  if (entropy < 60) return { level: 3, label: "Fair", color: "#eab308" };
  if (entropy < 80) return { level: 4, label: "Strong", color: "#22c55e" };
  return { level: 5, label: "Very Strong", color: "#10b981" };
}

function StrengthIcon({ level }: { level: number }) {
  if (level <= 2) return <ShieldAlert size={18} />;
  if (level <= 3) return <Shield size={18} />;
  return <ShieldCheck size={18} />;
}

export default function PasswordGen() {
  const [length, setLength] = useState(16);
  const [upper, setUpper] = useState(true);
  const [lower, setLower] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [password, setPassword] = useState("");
  const [hashes, setHashes] = useState<{
    sha1: string;
    sha256: string;
    md5: string;
  } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(true);
  const [hashVisible, setHashVisible] = useState(true);

  // Hash cracker state
  const [crackInput, setCrackInput] = useState("");
  const [crackResults, setCrackResults] = useState<CrackResult[]>([]);
  const [cracking, setCracking] = useState(false);
  const [rainbowTable, setRainbowTable] = useState<Map<string, string> | null>(null);
  const rainbowBuilt = useRef(false);

  // Collapsible sections
  const [hasherOpen, setHasherOpen] = useState(true);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  // Word-to-hash state
  const [wordInput, setWordInput] = useState("");
  const [wordHashes, setWordHashes] = useState<{
    md5: string;
    sha1: string;
    sha256: string;
  } | null>(null);

  // Add word to rainbow table
  const [newWord, setNewWord] = useState("");
  const [addingWord, setAddingWord] = useState(false);
  const [wordCount, setWordCount] = useState(COMMON_PASSWORDS.length);
  const [addWordStatus, setAddWordStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!rainbowBuilt.current) {
      rainbowBuilt.current = true;
      (async () => {
        // Fetch extra words from Firebase
        let firebaseWords: string[] = [];
        try {
          const snapshot = await getDocs(collection(db, "rainbow-words"));
          firebaseWords = snapshot.docs.map((doc) => doc.data().word as string);
        } catch {
          // Firebase not configured or offline — use hardcoded only
        }
        const allWords = [...new Set([...COMMON_PASSWORDS, ...firebaseWords])];
        setWordCount(allWords.length);
        const table = await buildRainbowTable(allWords);
        setRainbowTable(table);
      })();
    }
  }, []);

  const crackHashes = useCallback(async () => {
    if (!rainbowTable || !crackInput.trim()) return;
    setCracking(true);
    // Small delay for visual feedback
    await new Promise((r) => setTimeout(r, 400));
    const lines = crackInput
      .trim()
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const results: CrackResult[] = lines.map((hashStr) => {
      const normalized = hashStr.toLowerCase();
      const type = detectHashType(normalized);
      const found = rainbowTable.get(normalized) ?? null;
      return { hash: hashStr, type, result: found };
    });
    setCrackResults(results);
    setCracking(false);
  }, [rainbowTable, crackInput]);

  const hashWord = useCallback(async (text: string) => {
    if (!text) {
      setWordHashes(null);
      return;
    }
    const [h1, h256, hMd5] = await Promise.all([
      sha1(text),
      sha256(text),
      Promise.resolve(md5(text)),
    ]);
    setWordHashes({ md5: hMd5, sha1: h1, sha256: h256 });
  }, []);

  const addWordToTable = useCallback(async () => {
    const word = newWord.trim().slice(0, 50);
    if (!word || !rainbowTable) return;

    // Block empty or too-short input
    if (word.length < 1) return;

    // Check if already in the table
    const testHash = await md5(word);
    if (rainbowTable.has(testHash)) {
      setAddWordStatus("Already in table");
      setTimeout(() => setAddWordStatus(null), 2000);
      setNewWord("");
      return;
    }

    setAddingWord(true);
    try {
      // Add to Firebase (only word + addedAt, validated by Firestore rules)
      await addDoc(collection(db, "rainbow-words"), { word, addedAt: Date.now() });

      // Add to local rainbow table
      const [h1, h256, hMd5] = await Promise.all([
        sha1(word),
        sha256(word),
        Promise.resolve(md5(word)),
      ]);
      rainbowTable.set(hMd5, word);
      rainbowTable.set(h1, word);
      rainbowTable.set(h256, word);
      setWordCount((c) => c + 1);
      setAddWordStatus("Added!");
      setNewWord("");
    } catch {
      setAddWordStatus("Failed — Firebase not configured");
    }
    setAddingWord(false);
    setTimeout(() => setAddWordStatus(null), 2000);
  }, [newWord, rainbowTable]);

  const charsetCount = [upper, lower, numbers, symbols].filter(Boolean).length;

  const generate = useCallback(async () => {
    let pool = "";
    if (upper) pool += UPPER;
    if (lower) pool += LOWER;
    if (numbers) pool += DIGITS;
    if (symbols) pool += SYMBOLS;

    if (!pool) return;

    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    const pw = Array.from(array)
      .map((n) => pool[n % pool.length])
      .join("");

    setPassword(pw);
    const [h1, h256, hMd5] = await Promise.all([
      sha1(pw),
      sha256(pw),
      Promise.resolve(md5(pw)),
    ]);
    setHashes({ sha1: h1, sha256: h256, md5: hMd5 });
    setCopied(null);
  }, [length, upper, lower, numbers, symbols]);

  const copyText = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const strength = getStrength(length, upper, lower, numbers, symbols);

  return (
    <div className="pg-container">
      <div className="pg-info-banner">
        <Info size={18} className="pg-info-icon" />
        <span>
          <strong>Interactive Demo</strong> — Generate cryptographically random
          passwords that resist rainbow-table attacks (e.g. CrackStation). Uses
          the Web Crypto API for secure randomness.
          <Link to="/projects" className="pg-back-link">
            <ArrowLeft size={14} style={{ verticalAlign: "middle" }} /> Back to
            Projects
          </Link>
        </span>
      </div>

      <div className="pg-grid">
      <div className="pg-left-column">
      <div className="pg-card">
        <div className="pg-header">
          <div className="pg-title-row">
            <Hash size={24} className="pg-title-icon" />
            <h1 className="pg-title">Password Generator</h1>
          </div>
          <p className="pg-subtitle">
            Generate strong, unique passwords with hash verification
          </p>
        </div>

        <div className="pg-output-section">
          {password ? (
            <div className="pg-password-display">
              <code className="pg-password-text">
                {showPassword ? password : "•".repeat(password.length)}
              </code>
              <div className="pg-password-actions">
                <button
                  type="button"
                  className="pg-icon-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  type="button"
                  className="pg-icon-btn"
                  onClick={() => copyText(password, "password")}
                  title="Copy password"
                >
                  {copied === "password" ? (
                    <Check size={16} className="pg-copied" />
                  ) : (
                    <Copy size={16} />
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="pg-password-placeholder">
              Configure settings and click Generate
            </div>
          )}

          {password && (
            <div className="pg-strength-bar">
              <div className="pg-strength-track">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`pg-strength-segment ${i <= strength.level ? "active" : ""}`}
                    style={
                      i <= strength.level
                        ? { background: strength.color }
                        : undefined
                    }
                  />
                ))}
              </div>
              <span
                className="pg-strength-label"
                style={{ color: strength.color }}
              >
                <StrengthIcon level={strength.level} />
                {strength.label}
              </span>
            </div>
          )}
        </div>

        <div className="pg-controls">
          <div className="pg-slider-group">
            <div className="pg-slider-header">
              <label htmlFor="pg-length">Length</label>
              <span className="pg-length-value">{length}</span>
            </div>
            <input
              id="pg-length"
              type="range"
              min={4}
              max={64}
              value={length}
              onChange={(e) => setLength(Number(e.target.value))}
              className="pg-slider"
            />
            <div className="pg-slider-labels">
              <span>4</span>
              <span>64</span>
            </div>
          </div>

          <div className="pg-checkboxes">
            <label className="pg-checkbox">
              <input
                type="checkbox"
                checked={upper}
                onChange={(e) => setUpper(e.target.checked)}
                disabled={charsetCount === 1 && upper}
              />
              <span className="pg-checkbox-mark" />
              <span>
                Uppercase <code>A-Z</code>
              </span>
            </label>
            <label className="pg-checkbox">
              <input
                type="checkbox"
                checked={lower}
                onChange={(e) => setLower(e.target.checked)}
                disabled={charsetCount === 1 && lower}
              />
              <span className="pg-checkbox-mark" />
              <span>
                Lowercase <code>a-z</code>
              </span>
            </label>
            <label className="pg-checkbox">
              <input
                type="checkbox"
                checked={numbers}
                onChange={(e) => setNumbers(e.target.checked)}
                disabled={charsetCount === 1 && numbers}
              />
              <span className="pg-checkbox-mark" />
              <span>
                Numbers <code>0-9</code>
              </span>
            </label>
            <label className="pg-checkbox">
              <input
                type="checkbox"
                checked={symbols}
                onChange={(e) => setSymbols(e.target.checked)}
                disabled={charsetCount === 1 && symbols}
              />
              <span className="pg-checkbox-mark" />
              <span>
                Symbols <code>!@#$%</code>
              </span>
            </label>
          </div>

          <button type="button" className="pg-generate-btn" onClick={generate}>
            <RefreshCw size={18} />
            Generate Password
          </button>
        </div>

        {hashes && (
          <div className={`pg-hashes ${hashVisible ? "" : "collapsed"}`}>
            <button
              type="button"
              className="pg-hashes-toggle"
              onClick={() => setHashVisible(!hashVisible)}
            >
              <Hash size={16} />
              Hash Digests
              <span className="pg-toggle-arrow">
                {hashVisible ? "▲" : "▼"}
              </span>
            </button>
            {hashVisible && (
              <div className="pg-hashes-list">
                {(
                  [
                    ["MD5", hashes.md5],
                    ["SHA-1", hashes.sha1],
                    ["SHA-256", hashes.sha256],
                  ] as const
                ).map(([algo, hash]) => (
                  <div key={algo} className="pg-hash-row">
                    <span className="pg-hash-algo">{algo}</span>
                    <code className="pg-hash-value">{hash}</code>
                    <button
                      type="button"
                      className="pg-icon-btn"
                      onClick={() => copyText(hash, algo)}
                      title={`Copy ${algo} hash`}
                    >
                      {copied === algo ? (
                        <Check size={14} className="pg-copied" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                ))}
                <p className="pg-hash-note">
                  Passwords of 12+ characters with mixed charsets are resistant
                  to rainbow-table lookups (e.g. CrackStation).
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hash a Word */}
      <div className="pg-card pg-hasher-card">
        <button
          type="button"
          className="pg-collapsible-header"
          onClick={() => setHasherOpen(!hasherOpen)}
        >
          <div className="pg-title-row">
            <Hash size={24} className="pg-title-icon" />
            <h2 className="pg-title">Hash a Word</h2>
          </div>
          {hasherOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {hasherOpen && <div className="pg-hasher-body">
          <input
            type="text"
            className="pg-hasher-input"
            value={wordInput}
            onChange={(e) => {
              setWordInput(e.target.value);
              hashWord(e.target.value);
            }}
            placeholder="Type a word or password..."
            spellCheck={false}
          />
          {wordHashes && (
            <div className="pg-hasher-results">
              {(
                [
                  ["MD5", wordHashes.md5],
                  ["SHA-1", wordHashes.sha1],
                  ["SHA-256", wordHashes.sha256],
                ] as const
              ).map(([algo, hash]) => (
                <div key={algo} className="pg-hash-row">
                  <span className="pg-hash-algo">{algo}</span>
                  <code className="pg-hash-value">{hash}</code>
                  <button
                    type="button"
                    className="pg-icon-btn"
                    onClick={() => copyText(hash, `word-${algo}`)}
                    title={`Copy ${algo} hash`}
                  >
                    {copied === `word-${algo}` ? (
                      <Check size={14} className="pg-copied" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="pg-crack-autofill"
                onClick={() => {
                  const lines = [wordHashes.md5, wordHashes.sha1, wordHashes.sha256].join("\n");
                  setCrackInput(lines);
                  setCrackResults([]);
                  document.querySelector(".pg-cracker-card")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <Search size={14} />
                Test in Hash Cracker
              </button>
            </div>
          )}
        </div>}
      </div>
      </div>

      {/* Hash Cracker (right column) */}
      <div className="pg-card pg-cracker-card">
        <div className="pg-header">
          <div className="pg-title-row">
            <Search size={24} className="pg-title-icon" />
            <h2 className="pg-title">Hash Cracker</h2>
          </div>
          <p className="pg-subtitle">
            Test hashes against a local rainbow table of common passwords
          </p>
        </div>

        <div className="pg-cracker-body">
          <label htmlFor="pg-crack-input" className="pg-crack-label">
            Enter up to 20 non-salted hashes, one per line:
          </label>
          <textarea
            id="pg-crack-input"
            className="pg-crack-textarea"
            rows={4}
            value={crackInput}
            onChange={(e) => setCrackInput(e.target.value)}
            placeholder={"e.g.\nd0be2dc421be4fcd0172e5afceea3970e2f3d940\n5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8"}
            spellCheck={false}
          />
          <div className="pg-crack-actions">
            <button
              type="button"
              className="pg-crack-btn"
              onClick={crackHashes}
              disabled={cracking || !rainbowTable || !crackInput.trim()}
            >
              {cracking ? (
                <>
                  <Loader2 size={16} className="pg-spin" />
                  Cracking...
                </>
              ) : (
                <>
                  <Search size={16} />
                  Crack Hashes
                </>
              )}
            </button>
            {hashes && (
              <button
                type="button"
                className="pg-crack-autofill"
                onClick={() => {
                  const lines = [hashes.md5, hashes.sha1, hashes.sha256].join("\n");
                  setCrackInput(lines);
                  setCrackResults([]);
                }}
                title="Paste hashes from your generated password"
              >
                Use generated hashes
              </button>
            )}
          </div>

          <p className="pg-crack-supports">
            <strong>Supports:</strong> md5, sha1, sha256 &middot; <strong>{wordCount}</strong> words in table
          </p>

          <div className="pg-add-word">
            <input
              type="text"
              className="pg-add-word-input"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addWordToTable()}
              placeholder="Add a word to the rainbow table..."
              spellCheck={false}
              maxLength={50}
            />
            <button
              type="button"
              className="pg-add-word-btn"
              onClick={addWordToTable}
              disabled={addingWord || !newWord.trim()}
            >
              {addWordStatus ? (
                addWordStatus
              ) : (
                <>
                  <Plus size={14} />
                  Add
                </>
              )}
            </button>
          </div>

          {crackResults.length > 0 && (
            <div className="pg-crack-results">
              <div className="pg-crack-header-row">
                <span className="pg-crack-col-hash">Hash</span>
                <span className="pg-crack-col-type">Type</span>
                <span className="pg-crack-col-result">Result</span>
              </div>
              {crackResults.map((r, i) => (
                <div key={i} className="pg-crack-row">
                  <code className="pg-crack-col-hash">{r.hash}</code>
                  <span className="pg-crack-col-type">{r.type}</span>
                  <span
                    className={`pg-crack-col-result ${r.result ? "pg-found" : "pg-not-found"}`}
                  >
                    {r.result ?? "Not found."}
                  </span>
                </div>
              ))}
              <div className="pg-crack-legend">
                <span className="pg-legend-item pg-found">Green: Cracked</span>
                <span className="pg-legend-item pg-not-found">Red: Not found</span>
              </div>
            </div>
          )}

          <div className="pg-crack-info">
            <button
              type="button"
              className="pg-collapsible-header pg-info-toggle"
              onClick={() => setHowItWorksOpen(!howItWorksOpen)}
            >
              <h3>How It Works</h3>
              {howItWorksOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {howItWorksOpen && (
              <div className="pg-crack-info-body">
                <p>
                  This demo uses a local rainbow table built from ~100 common
                  passwords. For each password, MD5, SHA-1, and SHA-256 hashes are
                  pre-computed and stored. When you submit a hash, it's compared
                  against this table instantly.
                </p>
                <p>
                  Real-world tools like{" "}
                  <a
                    href="https://crackstation.net"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    CrackStation
                  </a>{" "}
                  use massive 190GB+ lookup tables containing billions of entries
                  from dictionary words, password leaks, and brute-force hybrids.
                  They can crack any common or short password in seconds.
                </p>
                <p>
                  <strong>Passwords generated above (12+ chars, mixed charset) will
                  show "Not found"</strong> because they are random and don't exist
                  in any pre-computed table.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
