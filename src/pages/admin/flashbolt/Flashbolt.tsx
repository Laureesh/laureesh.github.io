
import "./Flashbolt.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, KeyboardEvent } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { loadFlashboltLibrary, saveFlashboltLibrary } from "../../../services/flashboltLibrary";
import {
  advanceLearnRound,
  chooseAdaptiveQuestionKind,
  EMPTY_LEARN_CARD_PROGRESS,
  gradeWrittenAnswer,
  learnConfidenceLabel,
  normalizeAnswer,
  projectLearnQuestionTotal,
  rankAdaptiveCardIds,
  shuffleValues,
  updateLearnCardProgress,
  type GradingMode,
  type LearnCardProgress,
  type LearnQuestionKind,
} from "./learn-engine";
import type { KahootImportSet } from "./kahoot-import";
import { parseEmbeddedQuestion, parseNotes, parseQuizletHtml, suggestNoteTitles } from "./note-parser";
import type { QuizletImportSet } from "./quizlet-import";

type HighlightColor = "none" | "yellow" | "mint" | "violet";
type LearnGoal = "cram" | "memorize";
type LearnPhase = "goal" | "session" | "complete";

type LearnOptions = {
  shuffle: boolean;
  soundEffects: boolean;
  multipleChoice: boolean;
  trueFalse: boolean;
  selectAll: boolean;
  written: boolean;
  flashcards: boolean;
  answerTerms: boolean;
  answerDefinitions: boolean;
  showImagesOnQuestions: boolean;
  showImagesOnAnswers: boolean;
  grading: GradingMode;
  retypeCorrectAnswers: boolean;
  textToSpeech: boolean;
};

type LearnSetProgress = {
  cards: Record<string, LearnCardProgress>;
  updatedAt: string;
};

type LearnSessionSnapshot = {
  setId: string;
  goal: LearnGoal;
  options: LearnOptions;
  sessionIds: string[];
  roundIds: string[];
  pendingIds: string[];
  retryIds: string[];
  masteredIds: string[];
  round: number;
  index: number;
  sequence: number;
  updatedAt: string;
};

type Card = {
  id: string;
  term: string;
  definition: string;
  answerChoices?: string[];
  termLanguage?: string;
  definitionLanguage?: string;
  highlight?: HighlightColor;
  imageData?: string;
  imageName?: string;
};

type SpeechResultEvent = {
  results: {
    length: number;
    [index: number]: { [index: number]: { transcript: string } };
  };
};

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionFactory = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionFactory;
    webkitSpeechRecognition?: SpeechRecognitionFactory;
  }
}

type StudySet = {
  id: string;
  title: string;
  description: string;
  subject: string;
  color: string;
  updatedAt: string;
  cards: Card[];
};

type Folder = {
  id: string;
  name: string;
  setIds: string[];
};

type AppData = {
  sets: StudySet[];
  folders: Folder[];
  mastered: Record<string, string[]>;
  sessions: number;
  learnProgress?: Record<string, LearnSetProgress>;
  activeLearn?: LearnSessionSnapshot;
};

type View = "home" | "library" | "folders" | "create" | "set" | "learn" | "test" | "guide";
type StorageStatus = "loading" | "saved" | "error";
type ThemeName = "dark" | "light" | "white" | "ocean" | "forest" | "sunset";
type LibrarySort =
  | "updated-desc" | "updated-asc"
  | "title-asc" | "title-desc"
  | "subject-asc" | "subject-desc"
  | "folder-asc" | "folder-desc"
  | "terms-desc" | "terms-asc"
  | "progress-desc" | "progress-asc"
  | "mastered-desc" | "mastered-asc"
  | "remaining-desc" | "remaining-asc"
  | "unfiled-first" | "filed-first";

async function readImportResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();

  if (!contentType.includes("application/json")) {
    if (/^\s*<!doctype html|^\s*<html/i.test(body)) {
      throw new Error(
        "This deployment does not provide the server-side import service. Paste cards manually or use a JSON backup instead.",
      );
    }
    throw new Error("The import service returned an unsupported response.");
  }

  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error("The import service returned invalid JSON. Please try again later.");
  }
}

const STORAGE_KEY = "flashbolt.local.v1";
const LEGACY_STORAGE_KEY = "studydeck.local.v1";
const LIBRARY_SORT_KEY = `${STORAGE_KEY}.librarySort`;
const cloudMigrationKey = (uid: string) => `${STORAGE_KEY}.cloudMigrated.${uid}`;
const THEME_OPTIONS: Array<{ id: ThemeName; label: string; colors: [string, string] }> = [
  { id: "dark", label: "Dark", colors: ["#0c0c28", "#7b78ff"] },
  { id: "light", label: "Light", colors: ["#f7f7fc", "#5552e9"] },
  { id: "white", label: "White", colors: ["#ffffff", "#111827"] },
  { id: "ocean", label: "Ocean", colors: ["#071b29", "#59cef6"] },
  { id: "forest", label: "Forest", colors: ["#0a1b16", "#5ed89a"] },
  { id: "sunset", label: "Sunset", colors: ["#21101d", "#ff83ae"] },
];
const THEME_IDS = THEME_OPTIONS.map((option) => option.id);
const LIBRARY_SORT_VALUES: LibrarySort[] = [
  "updated-desc", "updated-asc", "title-asc", "title-desc", "subject-asc", "subject-desc",
  "folder-asc", "folder-desc", "terms-desc", "terms-asc", "progress-desc", "progress-asc",
  "mastered-desc", "mastered-asc", "remaining-desc", "remaining-asc", "unfiled-first", "filed-first",
];
const LIBRARY_COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
const HIGHLIGHT_COLORS: HighlightColor[] = ["none", "yellow", "mint", "violet"];
const LANGUAGE_OPTIONS = [
  { value: "auto", label: "Auto-detect", speechCode: "" },
  { value: "en", label: "English", speechCode: "en-US" },
  { value: "es", label: "Spanish", speechCode: "es-ES" },
  { value: "fr", label: "French", speechCode: "fr-FR" },
  { value: "de", label: "German", speechCode: "de-DE" },
  { value: "it", label: "Italian", speechCode: "it-IT" },
  { value: "pt", label: "Portuguese", speechCode: "pt-BR" },
  { value: "ja", label: "Japanese", speechCode: "ja-JP" },
  { value: "ko", label: "Korean", speechCode: "ko-KR" },
  { value: "zh", label: "Chinese", speechCode: "zh-CN" },
];
const DEFAULT_LEARN_OPTIONS: LearnOptions = {
  shuffle: false,
  soundEffects: true,
  multipleChoice: true,
  trueFalse: true,
  selectAll: true,
  written: true,
  flashcards: false,
  answerTerms: false,
  answerDefinitions: true,
  showImagesOnQuestions: true,
  showImagesOnAnswers: true,
  grading: "relaxed",
  retypeCorrectAnswers: false,
  textToSpeech: false,
};

const mobileCards: Card[] = [
  {
    id: "mobile-1",
    term: "A developer wants to use web technologies and the device camera. Which app type fits best?",
    definition: "Hybrid app",
  },
  {
    id: "mobile-2",
    term: "Which type of app generally produces the most responsive user interface?",
    definition: "Native app",
  },
  {
    id: "mobile-3",
    term: "Which file would a developer edit to change an Android app's name?",
    definition: "AndroidManifest.xml",
  },
  {
    id: "mobile-4",
    term: "Which file determines what an Android app's interface looks like?",
    definition: "activity_main.xml",
  },
  {
    id: "mobile-5",
    term: "Which project file contains strings displayed in the interface?",
    definition: "strings.xml",
  },
  {
    id: "mobile-6",
    term: "A method Android calls when an event is triggered is called what?",
    definition: "A callback",
  },
  {
    id: "mobile-7",
    term: "Where are layout resources stored?",
    definition: "res/layout",
  },
  {
    id: "mobile-8",
    term: "How is a string resource named greeting accessed in XML?",
    definition: "@string/greeting",
  },
  {
    id: "mobile-9",
    term: "In MVC, user input from the view goes directly to which layer?",
    definition: "The controller",
  },
  {
    id: "mobile-10",
    term: "What does the Android unit sp stand for?",
    definition: "Scale-independent pixels",
  },
  {
    id: "mobile-11",
    term: "Which generated class references all resources available to an Android app?",
    definition: "The R class",
  },
  {
    id: "mobile-12",
    term: "What is a part of a program coded to respond to a specific event?",
    definition: "An event handler",
  },
  {
    id: "mobile-13",
    term: "Which method starts another Android Activity?",
    definition: "startActivity",
  },
  {
    id: "mobile-14",
    term: "What is the entry-point method of an Android Activity?",
    definition: "onCreate",
  },
  {
    id: "mobile-15",
    term: "Where are drawable resources stored?",
    definition: "res/drawable",
  },
];

const initialData: AppData = {
  sets: [
    {
      id: "mobile-midterm",
      title: "Midterm — Mobile Application Development",
      description: "Android fundamentals, resources, app types, and activity lifecycle.",
      subject: "ITEC 4450",
      color: "violet",
      updatedAt: "2026-08-13T12:00:00.000Z",
      cards: mobileCards,
    },
    {
      id: "web-basics",
      title: "Web development essentials",
      description: "A small starter set you can edit or replace.",
      subject: "Web Development",
      color: "mint",
      updatedAt: "2026-08-12T12:00:00.000Z",
      cards: [
        { id: "web-1", term: "Semantic HTML", definition: "Markup that describes the meaning and structure of content." },
        { id: "web-2", term: "CSS cascade", definition: "The algorithm browsers use to resolve competing style declarations." },
        { id: "web-3", term: "Responsive design", definition: "A layout approach that adapts to different screen sizes and input methods." },
        { id: "web-4", term: "Client-side state", definition: "Data retained by the interface while a user interacts with it." },
        { id: "web-5", term: "Accessibility", definition: "Designing products so people with diverse abilities can use them." },
      ],
    },
  ],
  folders: [{ id: "itec-folder", name: "ITEC 4450", setIds: ["mobile-midterm"] }],
  mastered: {},
  sessions: 0,
  learnProgress: {},
};

const blankDraft: StudySet = {
  id: "",
  title: "",
  description: "",
  subject: "",
  color: "violet",
  updatedAt: "",
  cards: [
    { id: "draft-1", term: "", definition: "" },
    { id: "draft-2", term: "", definition: "" },
  ],
};

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Math.random().toString(36).slice(2)}`;
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    const source = URL.createObjectURL(file);
    image.onload = () => {
      const maxWidth = 960;
      const maxHeight = 720;
      const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(source);
        reject(new Error("Canvas unavailable"));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/webp", 0.8);
      URL.revokeObjectURL(source);
      resolve(dataUrl);
    };
    image.onerror = () => {
      URL.revokeObjectURL(source);
      reject(new Error("Image unavailable"));
    };
    image.src = source;
  });
}

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

function answerOptions(set: StudySet, cardIndex: number) {
  const correct = set.cards[cardIndex]?.definition ?? "";
  const distractors = set.cards
    .filter((_, index) => index !== cardIndex)
    .map((card) => card.definition)
    .filter((definition) => definition !== correct);
  const offset = cardIndex % Math.max(1, distractors.length);
  const rotated = [...distractors.slice(offset), ...distractors.slice(0, offset)];
  const choices = [correct, ...rotated.slice(0, 3)];
  if (choices.length < 4) choices.push("None of these");
  return [...new Set(choices)].sort((a, b) => (a.length + cardIndex) % 7 - (b.length + cardIndex) % 7);
}

function learnAnswerSide(options: LearnOptions, sequence: number, card?: Card): "term" | "definition" {
  if (card) {
    const embedded = parseEmbeddedQuestion(card.term, card.definition);
    if (embedded.prompt.endsWith("?") || embedded.choices.length >= 2) return "definition";
  }
  if (options.answerTerms && !options.answerDefinitions) return "term";
  if (!options.answerTerms && options.answerDefinitions) return "definition";
  return sequence % 2 === 0 ? "definition" : "term";
}

function enabledLearnKinds(options: LearnOptions): LearnQuestionKind[] {
  const kinds: LearnQuestionKind[] = [];
  if (options.multipleChoice) kinds.push("multiple-choice");
  if (options.trueFalse) kinds.push("true-false");
  if (options.selectAll) kinds.push("select-all");
  if (options.written) kinds.push("written");
  if (options.flashcards) kinds.push("flashcard");
  return kinds.length ? kinds : ["multiple-choice"];
}

function learnQuestionKind(options: LearnOptions, sequence: number, correctAnswer: string, confidence: number): LearnQuestionKind {
  const canSelectAll = correctAnswer.split(/\s*(?:;|,|\band\b)\s*/i).filter((part) => part.trim().length > 2).length > 1;
  return chooseAdaptiveQuestionKind(confidence, enabledLearnKinds(options), sequence, canSelectAll);
}

function learnChoices(set: StudySet, card: Card, answerSide: "term" | "definition", sequence: number) {
  const correct = card[answerSide];
  if (answerSide === "definition") {
    const embeddedChoices = card.answerChoices?.length
      ? card.answerChoices
      : parseEmbeddedQuestion(card.term, card.definition).choices;
    const suppliedChoices = [...new Set(embeddedChoices.map((choice) => choice.trim()).filter(Boolean))];
    if (suppliedChoices.length >= 2) {
      return suppliedChoices.some((choice) => normalizeAnswer(choice) === normalizeAnswer(correct))
        ? suppliedChoices
        : [...suppliedChoices, correct];
    }
  }
  const distractors = set.cards
    .filter((item) => item.id !== card.id)
    .map((item) => item[answerSide])
    .filter((answer) => answer && answer !== correct);
  const offset = sequence % Math.max(1, distractors.length);
  return shuffleValues([correct, ...distractors.slice(offset).concat(distractors.slice(0, offset)).slice(0, 3)]);
}

function selectAllChoices(set: StudySet, card: Card, answerSide: "term" | "definition") {
  const correctParts = card[answerSide]
    .split(/\s*(?:;|,|\band\b)\s*/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 2)
    .slice(0, 4);
  const distractors = set.cards
    .filter((item) => item.id !== card.id)
    .flatMap((item) => item[answerSide].split(/\s*(?:;|,)\s*/))
    .map((part) => part.trim())
    .filter((part) => part.length > 2 && !correctParts.includes(part))
    .slice(0, Math.max(2, 6 - correctParts.length));
  return { correctParts, choices: shuffleValues([...correctParts, ...distractors]) };
}

function isValidBackup(value: unknown): value is AppData {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<AppData>;
  return Array.isArray(data.sets) && Array.isArray(data.folders) && typeof data.mastered === "object";
}

function describeSyncError(error: unknown) {
  const candidate = error as { code?: string; message?: string };
  const code = candidate?.code?.replace(/^firestore\//, "") ?? "unknown";
  if (code === "permission-denied") return "Permission denied by Firestore rules";
  if (code === "unauthenticated") return "Firebase sign-in expired";
  if (code === "resource-exhausted" || candidate?.message?.includes("maximum size")) {
    return "Library is too large for one cloud document";
  }
  if (code === "unavailable") return "Firestore is temporarily unavailable";
  return `Cloud error: ${code}`;
}

function withDetectedAnswerChoices(card: Card): Card {
  const embedded = parseEmbeddedQuestion(card.term, card.definition);
  return embedded.choices.length >= 2
    ? { ...card, term: embedded.prompt, answerChoices: embedded.choices }
    : card;
}

function withDataDefaults(value: AppData): AppData {
  return {
    ...value,
    sets: value.sets.map((set) => ({
      ...set,
      cards: set.cards.map(withDetectedAnswerChoices),
    })),
    learnProgress: value.learnProgress ?? {},
  };
}

function mergeLibraries(cloud: AppData, local: AppData): AppData {
  const sets = new Map(cloud.sets.map((set) => [set.id, set]));
  local.sets.forEach((localSet) => {
    const cloudSet = sets.get(localSet.id);
    if (!cloudSet || Date.parse(localSet.updatedAt) >= Date.parse(cloudSet.updatedAt)) {
      sets.set(localSet.id, localSet);
    }
  });

  const folders = new Map(cloud.folders.map((folder) => [folder.id, folder]));
  local.folders.forEach((localFolder) => {
    const cloudFolder = folders.get(localFolder.id);
    folders.set(localFolder.id, cloudFolder
      ? { ...localFolder, setIds: [...new Set([...cloudFolder.setIds, ...localFolder.setIds])] }
      : localFolder);
  });

  return withDataDefaults({
    ...cloud,
    sets: [...sets.values()],
    folders: [...folders.values()],
    mastered: Object.fromEntries(
      [...new Set([...Object.keys(cloud.mastered), ...Object.keys(local.mastered)])]
        .map((setId) => [setId, [...new Set([...(cloud.mastered[setId] ?? []), ...(local.mastered[setId] ?? [])])]]),
    ),
    sessions: Math.max(cloud.sessions, local.sessions),
    learnProgress: { ...(cloud.learnProgress ?? {}), ...(local.learnProgress ?? {}) },
    activeLearn: local.activeLearn ?? cloud.activeLearn,
  });
}

function applyThemeToDocument(theme: ThemeName) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme === "white" ? "only light" : theme === "light" ? "light" : "dark";
  root.style.backgroundColor = theme === "white" ? "#ffffff" : "";
  document.body.style.backgroundColor = theme === "white" ? "#ffffff" : "";
}

function AutoResizeTextarea({
  value,
  onChange,
  className,
  placeholder,
  rows = 2,
}: {
  value: string;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
  placeholder?: string;
  rows?: number;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      className={className}
      value={value}
      onChange={(event) => {
        event.currentTarget.style.height = "auto";
        event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
        onChange(event);
      }}
      placeholder={placeholder}
      rows={rows}
    />
  );
}

function ThemePicker({
  theme,
  onThemeChange,
  compact = false,
}: {
  theme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
  compact?: boolean;
}) {
  const selectedTheme = THEME_OPTIONS.find((option) => option.id === theme) ?? THEME_OPTIONS[0];
  return (
    <details className={`theme-picker ${compact ? "compact" : ""}`}>
      <summary aria-label={`Change theme. Current theme: ${selectedTheme.label}`}>
        <span className="theme-swatch" aria-hidden="true">
          <i style={{ background: selectedTheme.colors[0] }} />
          <i style={{ background: selectedTheme.colors[1] }} />
        </span>
        <span className="theme-picker-copy"><small>Theme</small><b>{selectedTheme.label}</b></span>
        <span className="theme-picker-chevron" aria-hidden="true">⌄</span>
      </summary>
      <div className="theme-picker-menu" role="group" aria-label="Choose a theme">
        <div className="theme-picker-heading"><strong>Choose a theme</strong><small>Saved on this device</small></div>
        <div className="theme-picker-options">
          {THEME_OPTIONS.map((option) => (
            <button
              type="button"
              className={option.id === theme ? "active" : ""}
              aria-pressed={option.id === theme}
              key={option.id}
              onClick={(event) => {
                applyThemeToDocument(option.id);
                onThemeChange(option.id);
                event.currentTarget.closest("details")?.removeAttribute("open");
              }}
            >
              <span className="theme-swatch" aria-hidden="true">
                <i style={{ background: option.colors[0] }} />
                <i style={{ background: option.colors[1] }} />
              </span>
              <span>{option.label}</span>
              {option.id === theme && <b aria-hidden="true">✓</b>}
            </button>
          ))}
        </div>
      </div>
    </details>
  );
}

export default function Flashbolt() {
  const { user } = useAuth();
  const userId = user?.uid;
  const [data, setData] = useState<AppData>(initialData);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("home");
  const [selectedSetId, setSelectedSetId] = useState(initialData.sets[0].id);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [librarySort, setLibrarySort] = useState<LibrarySort>("updated-desc");
  const [search, setSearch] = useState("");
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderSetIds, setFolderSetIds] = useState<string[]>([]);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [tileFolderPickerId, setTileFolderPickerId] = useState<string | null>(null);
  const [tileFolderSearch, setTileFolderSearch] = useState("");
  const [draft, setDraft] = useState<StudySet>(blankDraft);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [draftFolderIds, setDraftFolderIds] = useState<string[]>([]);
  const [draftFolderSearch, setDraftFolderSearch] = useState("");
  const [pasteImport, setPasteImport] = useState("");
  const [quizletUrl, setQuizletUrl] = useState("");
  const [quizletImporting, setQuizletImporting] = useState(false);
  const [quizletImportMessage, setQuizletImportMessage] = useState("");
  const [quizletImportFailed, setQuizletImportFailed] = useState(false);
  const [kahootReference, setKahootReference] = useState("");
  const [kahootImporting, setKahootImporting] = useState(false);
  const [kahootImportMessage, setKahootImportMessage] = useState("");
  const [kahootImportFailed, setKahootImportFailed] = useState(false);
  const [flashIndex, setFlashIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [learnPhase, setLearnPhase] = useState<LearnPhase>("goal");
  const [learnGoal, setLearnGoal] = useState<LearnGoal>("memorize");
  const [learnOptions, setLearnOptions] = useState<LearnOptions>(DEFAULT_LEARN_OPTIONS);
  const [learnOptionsDraft, setLearnOptionsDraft] = useState<LearnOptions>(DEFAULT_LEARN_OPTIONS);
  const [learnOptionsOpen, setLearnOptionsOpen] = useState(false);
  const [learnSessionIds, setLearnSessionIds] = useState<string[]>([]);
  const [learnRoundIds, setLearnRoundIds] = useState<string[]>([]);
  const [learnPendingIds, setLearnPendingIds] = useState<string[]>([]);
  const [learnRetryIds, setLearnRetryIds] = useState<string[]>([]);
  const [learnMasteredIds, setLearnMasteredIds] = useState<string[]>([]);
  const [learnRound, setLearnRound] = useState(1);
  const [learnIndex, setLearnIndex] = useState(0);
  const [learnSequence, setLearnSequence] = useState(0);
  const [learnQuestionConfidence, setLearnQuestionConfidence] = useState(0);
  const [learnLastConfidence, setLearnLastConfidence] = useState(0);
  const [learnAnswer, setLearnAnswer] = useState<string | null>(null);
  const [learnLastCorrect, setLearnLastCorrect] = useState<boolean | null>(null);
  const [learnWrittenAnswer, setLearnWrittenAnswer] = useState("");
  const [learnRetypeAnswer, setLearnRetypeAnswer] = useState("");
  const [learnSelectedAnswers, setLearnSelectedAnswers] = useState<string[]>([]);
  const [learnFlashRevealed, setLearnFlashRevealed] = useState(false);
  const [testAnswers, setTestAnswers] = useState<Record<string, string>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [guideTitle, setGuideTitle] = useState("My study guide");
  const [guideNotes, setGuideNotes] = useState("");
  const [generatedCards, setGeneratedCards] = useState<Card[]>([]);
  const [toast, setToast] = useState("");
  const [theme, setTheme] = useState<ThemeName>("dark");
  const [storageStatus, setStorageStatus] = useState<StorageStatus>("loading");
  const [syncError, setSyncError] = useState("");
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [dictationTarget, setDictationTarget] = useState<{ cardId: string; field: "term" | "definition" } | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  useEffect(() => {
    if (!userId) return;
    const syncUserId = userId;
    let cancelled = false;

    async function loadLibrary() {
      await Promise.resolve();
      if (cancelled) return;

      let loadedData = initialData;
      let cloudSyncFailed = false;
      let localData: AppData | null = null;
      let localAlreadyMigrated = false;

      try {
        const saved = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
        const savedTheme = window.localStorage.getItem(`${STORAGE_KEY}.theme`) ?? window.localStorage.getItem(`${LEGACY_STORAGE_KEY}.theme`);
        const savedLibrarySort = window.localStorage.getItem(LIBRARY_SORT_KEY) ?? window.localStorage.getItem(`${LEGACY_STORAGE_KEY}.librarySort`);
        localAlreadyMigrated = window.localStorage.getItem(cloudMigrationKey(syncUserId)) === "true";
        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          if (isValidBackup(parsed)) {
            localData = withDataDefaults(parsed);
            loadedData = localData;
          }
        }
        if (savedTheme && THEME_IDS.includes(savedTheme as ThemeName)) setTheme(savedTheme as ThemeName);
        if (savedLibrarySort && LIBRARY_SORT_VALUES.includes(savedLibrarySort as LibrarySort)) {
          setLibrarySort(savedLibrarySort as LibrarySort);
        }
      } catch {
        setToast("Your local backup could not be opened on this device.");
      }

      try {
        const cloudData = await loadFlashboltLibrary(syncUserId);
        if (cancelled) return;
        if (isValidBackup(cloudData)) {
          loadedData = localData && !localAlreadyMigrated
            ? mergeLibraries(withDataDefaults(cloudData), localData)
            : withDataDefaults(cloudData);
          if (localData && !localAlreadyMigrated) {
            await saveFlashboltLibrary(syncUserId, loadedData);
          }
        } else {
          await saveFlashboltLibrary(syncUserId, localData ?? loadedData);
        }
        try {
          window.localStorage.setItem(cloudMigrationKey(syncUserId), "true");
        } catch {
          // Sync still works when the browser blocks local storage.
        }
      } catch (error) {
        cloudSyncFailed = true;
        const message = describeSyncError(error);
        setSyncError(message);
        setToast(`${message}. Flashbolt is using this device's local backup.`);
      }

      if (cancelled) return;
      setData(loadedData);
      setSelectedSetId(loadedData.sets[0]?.id ?? "");
      setStorageStatus(cloudSyncFailed ? "error" : "saved");
      setReady(true);
    }

    void loadLibrary();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!ready || !userId) return;
    const syncUserId = userId;
    let cancelled = false;

    async function saveLibrary() {
      await new Promise((resolve) => window.setTimeout(resolve, 650));
      if (cancelled) return;

      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        // Cloud storage remains the source of truth when local storage is unavailable.
      }

      try {
        await saveFlashboltLibrary(syncUserId, data);
        if (cancelled) return;
        setSyncError("");
        setStorageStatus("saved");
      } catch (error) {
        const message = describeSyncError(error);
        setSyncError(message);
        setStorageStatus("error");
        setToast(`${message}. A local backup was kept.`);
      }
    }

    void saveLibrary();
    return () => { cancelled = true; };
  }, [data, ready, userId]);

  useEffect(() => {
    applyThemeToDocument(theme);
    if (ready) window.localStorage.setItem(`${STORAGE_KEY}.theme`, theme);
  }, [theme, ready]);

  useEffect(() => {
    if (ready) window.localStorage.setItem(LIBRARY_SORT_KEY, librarySort);
  }, [librarySort, ready]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!folderModalOpen) return;
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setFolderModalOpen(false);
      setEditingFolderId(null);
      setFolderName("");
      setFolderSetIds([]);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [folderModalOpen]);

  useEffect(() => {
    if (!tileFolderPickerId) return;

    const closeOnPointerDown = (event: globalThis.PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      const picker = event.target.closest("[data-tile-folder-picker]");
      if (picker?.getAttribute("data-tile-folder-picker") !== tileFolderPickerId) {
        setTileFolderPickerId(null);
      }
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setTileFolderPickerId(null);
    };

    document.addEventListener("pointerdown", closeOnPointerDown);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [tileFolderPickerId]);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const selectedSet = data.sets.find((set) => set.id === selectedSetId) ?? data.sets[0];
  const folder = data.folders.find((item) => item.id === selectedFolderId);
  const folderSets = folder
    ? folder.setIds
        .map((setId) => data.sets.find((set) => set.id === setId))
        .filter((set): set is StudySet => Boolean(set))
    : [];
  const folderSetIndex = folderSets.findIndex((set) => set.id === selectedSet?.id);
  const previousFolderSet = folderSetIndex > 0 ? folderSets[folderSetIndex - 1] : undefined;
  const nextFolderSet = folderSetIndex >= 0 && folderSetIndex < folderSets.length - 1
    ? folderSets[folderSetIndex + 1]
    : undefined;
  const editingFolder = data.folders.find((item) => item.id === editingFolderId);
  const masteredCount = Object.values(data.mastered).reduce((total, cards) => total + cards.length, 0);
  const cardCount = data.sets.reduce((total, set) => total + set.cards.length, 0);
  const filteredSets = useMemo(() => {
    const query = search.trim().toLowerCase();
    const base = folder ? data.sets.filter((set) => folder.setIds.includes(set.id)) : data.sets;
    const matches = query
      ? base.filter((set) =>
          [set.title, set.description, set.subject, ...set.cards.map((card) => `${card.term} ${card.definition}`)]
            .join(" ")
            .toLowerCase()
            .includes(query),
        )
      : base;
    const masteredFor = (set: StudySet) => data.mastered[set.id]?.length ?? 0;
    const progressFor = (set: StudySet) => set.cards.length ? masteredFor(set) / set.cards.length : 0;
    const remainingFor = (set: StudySet) => Math.max(0, set.cards.length - masteredFor(set));
    const foldersFor = (set: StudySet) => data.folders
      .filter((folderItem) => folderItem.setIds.includes(set.id))
      .map((folderItem) => folderItem.name)
      .sort((a, b) => LIBRARY_COLLATOR.compare(a, b))
      .join(" · ");
    const titleTieBreaker = (a: StudySet, b: StudySet) => LIBRARY_COLLATOR.compare(a.title, b.title);

    return [...matches].sort((a, b) => {
      let result = 0;
      switch (librarySort) {
        case "updated-desc": result = Date.parse(b.updatedAt) - Date.parse(a.updatedAt); break;
        case "updated-asc": result = Date.parse(a.updatedAt) - Date.parse(b.updatedAt); break;
        case "title-asc": result = LIBRARY_COLLATOR.compare(a.title, b.title); break;
        case "title-desc": result = LIBRARY_COLLATOR.compare(b.title, a.title); break;
        case "subject-asc": result = LIBRARY_COLLATOR.compare(a.subject || "General", b.subject || "General"); break;
        case "subject-desc": result = LIBRARY_COLLATOR.compare(b.subject || "General", a.subject || "General"); break;
        case "terms-desc": result = b.cards.length - a.cards.length; break;
        case "terms-asc": result = a.cards.length - b.cards.length; break;
        case "progress-desc": result = progressFor(b) - progressFor(a); break;
        case "progress-asc": result = progressFor(a) - progressFor(b); break;
        case "mastered-desc": result = masteredFor(b) - masteredFor(a); break;
        case "mastered-asc": result = masteredFor(a) - masteredFor(b); break;
        case "remaining-desc": result = remainingFor(b) - remainingFor(a); break;
        case "remaining-asc": result = remainingFor(a) - remainingFor(b); break;
        case "folder-asc": {
          const aFolder = foldersFor(a);
          const bFolder = foldersFor(b);
          result = !aFolder && bFolder ? 1 : aFolder && !bFolder ? -1 : LIBRARY_COLLATOR.compare(aFolder, bFolder);
          break;
        }
        case "folder-desc": {
          const aFolder = foldersFor(a);
          const bFolder = foldersFor(b);
          result = !aFolder && bFolder ? 1 : aFolder && !bFolder ? -1 : LIBRARY_COLLATOR.compare(bFolder, aFolder);
          break;
        }
        case "unfiled-first": result = Number(Boolean(foldersFor(a))) - Number(Boolean(foldersFor(b))); break;
        case "filed-first": result = Number(Boolean(foldersFor(b))) - Number(Boolean(foldersFor(a))); break;
      }
      return result || titleTieBreaker(a, b);
    });
  }, [data.folders, data.mastered, data.sets, folder, librarySort, search]);

  const testCards = selectedSet?.cards.slice(0, 8) ?? [];
  const testScore = testCards.filter((card) => testAnswers[card.id] === card.definition).length;
  const guideTitleSuggestions = useMemo(() => suggestNoteTitles(guideNotes), [guideNotes]);
  const currentLearnCard = selectedSet?.cards.find((card) => card.id === learnRoundIds[learnIndex]);
  const currentLearnAnswerSide = learnAnswerSide(learnOptions, learnSequence, currentLearnCard);
  const currentLearnPromptSide = currentLearnAnswerSide === "definition" ? "term" : "definition";
  const currentEmbeddedQuestion = useMemo(
    () => currentLearnCard ? parseEmbeddedQuestion(currentLearnCard.term, currentLearnCard.definition) : { prompt: "", choices: [] },
    [currentLearnCard],
  );
  const currentLearnPrompt = currentLearnPromptSide === "term"
    ? currentEmbeddedQuestion.prompt
    : (currentLearnCard?.definition ?? "");
  const currentLearnCorrectAnswer = currentLearnCard?.[currentLearnAnswerSide] ?? "";
  const currentLearnQuestionKind = learnQuestionKind(learnOptions, learnSequence, currentLearnCorrectAnswer, learnQuestionConfidence);
  const currentLearnChoices = useMemo(
    () => currentLearnCard ? learnChoices(selectedSet, currentLearnCard, currentLearnAnswerSide, learnSequence) : [],
    [currentLearnAnswerSide, currentLearnCard, learnSequence, selectedSet],
  );
  const currentSelectAll = useMemo(
    () => currentLearnCard ? selectAllChoices(selectedSet, currentLearnCard, currentLearnAnswerSide) : { correctParts: [], choices: [] },
    [currentLearnAnswerSide, currentLearnCard, selectedSet],
  );
  const currentTrueFalse = useMemo(() => {
    const distractor = currentLearnChoices.find(
      (choice) => normalizeAnswer(choice) !== normalizeAnswer(currentLearnCorrectAnswer),
    );
    const isTrue = learnSequence % 2 === 0 || !distractor;
    return {
      answer: isTrue,
      statement: isTrue ? currentLearnCorrectAnswer : (distractor ?? currentLearnCorrectAnswer),
    };
  }, [currentLearnChoices, currentLearnCorrectAnswer, learnSequence]);
  const learnMasteryTarget = learnGoal === "cram" ? 2 : 3;
  const selectedLearnProgress = data.learnProgress?.[selectedSet?.id ?? ""]?.cards ?? {};
  const learnQuestionsAnswered = learnSequence + (learnAnswer ? 1 : 0);
  const learnQuestionsTotal = projectLearnQuestionTotal(
    learnSessionIds,
    learnMasteredIds,
    selectedLearnProgress,
    learnMasteryTarget,
    learnQuestionsAnswered,
  );
  const learnQuestionSegmentCount = Math.max(1, Math.ceil(Math.max(1, learnQuestionsTotal) / 7));
  const learnStatusCounts = (selectedSet?.cards ?? []).reduce((counts, card) => {
    const confidence = selectedLearnProgress[card.id]?.confidence ?? 0;
    const key = learnConfidenceLabel(confidence).toLowerCase() as "new" | "learning" | "familiar" | "mastered";
    counts[key] += 1;
    return counts;
  }, { new: 0, learning: 0, familiar: 0, mastered: 0 });
  const resumableLearn = data.activeLearn?.setId === selectedSet?.id ? data.activeLearn : undefined;

  useEffect(() => {
    if (view !== "learn" || learnPhase !== "session" || !learnOptions.textToSpeech || !currentLearnPrompt) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(currentLearnPrompt));
    return () => window.speechSynthesis.cancel();
  }, [currentLearnPrompt, learnOptions.textToSpeech, learnPhase, view]);

  function notify(message: string) {
    setToast(message);
  }

  function navigate(nextView: View) {
    setView(nextView);
    setNewMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openSet(setId: string) {
    setSelectedSetId(setId);
    setFlashIndex(0);
    setFlipped(false);
    navigate("set");
  }

  function startCreate() {
    setEditingSetId(null);
    setDraftFolderSearch("");
    setDraftFolderIds(selectedFolderId ? [selectedFolderId] : []);
    setDraft({
      ...blankDraft,
      cards: [
        { id: makeId("card"), term: "", definition: "" },
        { id: makeId("card"), term: "", definition: "" },
      ],
    });
    setPasteImport("");
    setQuizletUrl("");
    setQuizletImportMessage("");
    setQuizletImportFailed(false);
    setKahootReference("");
    setKahootImportMessage("");
    setKahootImportFailed(false);
    navigate("create");
  }

  function startQuizletLinkImport() {
    startCreate();
    setQuizletImportMessage("Paste a public Quizlet set link to begin.");
  }

  function startKahootLinkImport() {
    startCreate();
    setKahootImportMessage("Paste a public Kahoot details link or quiz ID to begin.");
  }

  function startEdit(set: StudySet) {
    setEditingSetId(set.id);
    setDraftFolderSearch("");
    setDraftFolderIds(data.folders.filter((folderItem) => folderItem.setIds.includes(set.id)).map((folderItem) => folderItem.id));
    setDraft({ ...set, cards: set.cards.map((card) => ({ ...card })) });
    setPasteImport("");
    setQuizletUrl("");
    setQuizletImportMessage("");
    setQuizletImportFailed(false);
    setKahootReference("");
    setKahootImportMessage("");
    setKahootImportFailed(false);
    navigate("create");
  }

  function saveDraft(studyAfter = false) {
    const cleanCards = draft.cards.filter((card) => card.term.trim() && card.definition.trim());
    if (!draft.title.trim() || cleanCards.length === 0) {
      notify("Add a title and at least one complete card.");
      return;
    }

    const savedSet: StudySet = {
      ...draft,
      id: editingSetId ?? makeId("set"),
      title: draft.title.trim(),
      description: draft.description.trim(),
      subject: draft.subject.trim() || "General",
      updatedAt: new Date().toISOString(),
      cards: cleanCards.map((card) => withDetectedAnswerChoices({
        ...card,
        term: card.term.trim(),
        definition: card.definition.trim(),
      })),
    };

    setData((current) => ({
      ...current,
      sets: editingSetId
        ? current.sets.map((set) => (set.id === editingSetId ? savedSet : set))
        : [savedSet, ...current.sets],
      folders: current.folders.map((folderItem) => {
        const shouldContainSet = draftFolderIds.includes(folderItem.id);
        const containsSet = folderItem.setIds.includes(savedSet.id);
        if (shouldContainSet === containsSet) return folderItem;
        return {
          ...folderItem,
          setIds: shouldContainSet
            ? [...folderItem.setIds, savedSet.id]
            : folderItem.setIds.filter((setId) => setId !== savedSet.id),
        };
      }),
    }));
    setSelectedSetId(savedSet.id);
    notify(editingSetId
      ? "Set and folder assignments updated."
      : draftFolderIds.length
        ? `Set created, added to ${draftFolderIds.length === 1 ? "a folder" : `${draftFolderIds.length} folders`}, and saved on this device.`
        : "Set created and saved on this device.");
    if (studyAfter) openSet(savedSet.id);
    else navigate("library");
  }

  function updateDraftCard(cardId: string, field: "term" | "definition", value: string) {
    setDraft((current) => ({
      ...current,
      cards: current.cards.map((card) => (card.id === cardId ? { ...card, [field]: value } : card)),
    }));
  }

  function updateDraftCardExtras(cardId: string, updates: Partial<Card>) {
    setDraft((current) => ({
      ...current,
      cards: current.cards.map((card) => (card.id === cardId ? { ...card, ...updates } : card)),
    }));
  }

  function addDraftCard(afterCardId?: string) {
    const card: Card = { id: makeId("card"), term: "", definition: "" };
    setDraft((current) => {
      if (!afterCardId) return { ...current, cards: [...current.cards, card] };
      const next = [...current.cards];
      const index = next.findIndex((item) => item.id === afterCardId);
      next.splice(index + 1, 0, card);
      return { ...current, cards: next };
    });
  }

  function duplicateDraftCard(cardId: string) {
    setDraft((current) => {
      const index = current.cards.findIndex((card) => card.id === cardId);
      if (index < 0) return current;
      const next = [...current.cards];
      next.splice(index + 1, 0, { ...current.cards[index], id: makeId("card") });
      return { ...current, cards: next };
    });
  }

  function moveDraftCard(cardId: string, direction: -1 | 1) {
    setDraft((current) => {
      const index = current.cards.findIndex((card) => card.id === cardId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.cards.length) return current;
      const next = [...current.cards];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...current, cards: next };
    });
  }

  function dropDraftCard(event: DragEvent<HTMLElement>, targetCardId: string) {
    event.preventDefault();
    if (!draggingCardId || draggingCardId === targetCardId) return;
    setDraft((current) => {
      const next = [...current.cards];
      const from = next.findIndex((card) => card.id === draggingCardId);
      const to = next.findIndex((card) => card.id === targetCardId);
      if (from < 0 || to < 0) return current;
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { ...current, cards: next };
    });
    setDraggingCardId(null);
  }

  function cycleHighlight(card: Card) {
    const currentIndex = HIGHLIGHT_COLORS.indexOf(card.highlight ?? "none");
    const next = HIGHLIGHT_COLORS[(currentIndex + 1) % HIGHLIGHT_COLORS.length];
    updateDraftCardExtras(card.id, { highlight: next });
  }

  async function attachCardImage(cardId: string, file?: File) {
    if (!file) return;
    if (![/^image\/(png|jpeg|webp)$/].some((pattern) => pattern.test(file.type))) {
      notify("Choose a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > 8_000_000) {
      notify("Choose an image smaller than 8 MB.");
      return;
    }
    try {
      const imageData = await compressImage(file);
      if (JSON.stringify(data).length + JSON.stringify(draft).length + imageData.length > 4_300_000) {
        notify("This image would exceed the browser-backup limit. Try a smaller image.");
        return;
      }
      updateDraftCardExtras(cardId, { imageData, imageName: file.name });
      notify("Image attached and saved on this device.");
    } catch {
      notify("That image could not be attached.");
    }
  }

  function startDictation(card: Card, field: "term" | "definition") {
    const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      notify("Voice dictation is not supported by this browser.");
      return;
    }

    recognitionRef.current?.stop();
    const recognition = new SpeechRecognition();
    const languageValue = field === "term" ? card.termLanguage : card.definitionLanguage;
    const language = LANGUAGE_OPTIONS.find((option) => option.value === languageValue);
    recognition.lang = language?.speechCode || navigator.language || "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += `${event.results[index][0]?.transcript ?? ""} `;
      }
      const existing = card[field].trim();
      updateDraftCard(card.id, field, `${existing}${existing ? " " : ""}${transcript.trim()}`);
    };
    recognition.onerror = () => notify("Dictation stopped before any text was added.");
    recognition.onend = () => {
      recognitionRef.current = null;
      setDictationTarget(null);
    };
    recognitionRef.current = recognition;
    setDictationTarget({ cardId: card.id, field });
    recognition.start();
  }

  async function applyQuizletImport() {
    if (!quizletUrl.trim()) {
      setQuizletImportFailed(true);
      setQuizletImportMessage("Paste a Quizlet set link first.");
      return;
    }

    setQuizletImporting(true);
    setQuizletImportFailed(false);
    setQuizletImportMessage("Reading the public set from Quizlet…");

    try {
      const response = await fetch("/api/import/quizlet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: quizletUrl.trim() }),
      });
      const result = await readImportResponse<QuizletImportSet | { error?: string }>(response);
      if (!response.ok || !("cards" in result)) {
        throw new Error("error" in result && result.error ? result.error : "The Quizlet set could not be imported.");
      }

      const importedCards: Card[] = result.cards.map((card) => withDetectedAnswerChoices({
        id: makeId("card"),
        term: card.term,
        definition: card.definition,
      }));

      setDraft((current) => {
        const existingCards = current.cards.filter((card) => card.term.trim() || card.definition.trim());
        return {
          ...current,
          title: current.title.trim() ? current.title : result.title,
          description: current.description.trim() ? current.description : result.description,
          subject: current.subject.trim() ? current.subject : result.subject,
          cards: existingCards.length ? [...existingCards, ...importedCards] : importedCards,
        };
      });
      setQuizletImportMessage(`${importedCards.length} cards imported. Review them, then save the set.`);
      notify(`${importedCards.length} Quizlet card${importedCards.length === 1 ? "" : "s"} added.`);
    } catch (error) {
      setQuizletImportFailed(true);
      setQuizletImportMessage(error instanceof Error ? error.message : "The Quizlet set could not be imported.");
    } finally {
      setQuizletImporting(false);
    }
  }

  async function applyKahootImport() {
    if (!kahootReference.trim()) {
      setKahootImportFailed(true);
      setKahootImportMessage("Paste a Kahoot details link or quiz ID first.");
      return;
    }

    setKahootImporting(true);
    setKahootImportFailed(false);
    setKahootImportMessage("Reading the public quiz from Kahoot…");

    try {
      const response = await fetch("/api/import/kahoot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: kahootReference.trim() }),
      });
      const result = await readImportResponse<KahootImportSet | { error?: string }>(response);
      if (!response.ok || !("cards" in result)) {
        throw new Error("error" in result && result.error ? result.error : "The Kahoot quiz could not be imported.");
      }

      const importedCards: Card[] = result.cards.map((card) => ({
        id: makeId("card"),
        term: card.term,
        definition: card.definition,
        ...(card.answerChoices?.length ? { answerChoices: card.answerChoices } : {}),
      }));

      setDraft((current) => {
        const existingCards = current.cards.filter((card) => card.term.trim() || card.definition.trim());
        return {
          ...current,
          title: current.title.trim() ? current.title : result.title,
          description: current.description.trim() ? current.description : result.description,
          subject: current.subject.trim() ? current.subject : result.subject,
          cards: existingCards.length ? [...existingCards, ...importedCards] : importedCards,
        };
      });
      setKahootImportMessage(`${importedCards.length} questions imported with their answer choices. Review them, then save the set.`);
      notify(`${importedCards.length} Kahoot question${importedCards.length === 1 ? "" : "s"} added.`);
    } catch (error) {
      setKahootImportFailed(true);
      setKahootImportMessage(error instanceof Error ? error.message : "The Kahoot quiz could not be imported.");
    } finally {
      setKahootImporting(false);
    }
  }

  function applyPasteImport() {
    const htmlCards = parseQuizletHtml(pasteImport);
    const cards = htmlCards.length ? htmlCards : parseNotes(pasteImport);
    if (!cards.length) {
      notify("Paste Quizlet term-list HTML, or use term :: definition.");
      return;
    }
    setDraft((current) => ({
      ...current,
      cards: [...current.cards.filter((card) => card.term || card.definition), ...cards],
    }));
    setPasteImport("");
    notify(`${cards.length} card${cards.length === 1 ? "" : "s"} imported${htmlCards.length ? " from Quizlet HTML" : ""}.`);
  }

  function openNewFolderModal() {
    setEditingFolderId(null);
    setFolderName("");
    setFolderSetIds([]);
    setFolderModalOpen(true);
  }

  function openNewFolderModalForSet(setId: string) {
    setTileFolderPickerId(null);
    setEditingFolderId(null);
    setFolderName("");
    setFolderSetIds([setId]);
    setFolderModalOpen(true);
  }

  function editFolder(folderToEdit: Folder) {
    setEditingFolderId(folderToEdit.id);
    setFolderName(folderToEdit.name);
    setFolderSetIds([...folderToEdit.setIds]);
    setFolderModalOpen(true);
  }

  function closeFolderModal() {
    setFolderModalOpen(false);
    setEditingFolderId(null);
    setFolderName("");
    setFolderSetIds([]);
  }

  function saveFolder() {
    if (!folderName.trim()) {
      notify("Give your folder a name first.");
      return;
    }

    if (editingFolderId) {
      setData((current) => ({
        ...current,
        folders: current.folders.map((item) => item.id === editingFolderId
          ? { ...item, name: folderName.trim(), setIds: folderSetIds }
          : item),
      }));
      closeFolderModal();
      notify("Folder updated.");
      return;
    }

    const newFolder: Folder = { id: makeId("folder"), name: folderName.trim(), setIds: folderSetIds };
    setData((current) => ({ ...current, folders: [...current.folders, newFolder] }));
    if (view === "create") {
      setDraftFolderIds((ids) => ids.includes(newFolder.id) ? ids : [...ids, newFolder.id]);
    }
    closeFolderModal();
    notify("Folder created.");
  }

  function deleteFolder(folderToDelete: Folder) {
    const confirmed = window.confirm(`Delete “${folderToDelete.name}”? The sets inside it will stay in your library.`);
    if (!confirmed) return;
    setData((current) => ({
      ...current,
      folders: current.folders.filter((item) => item.id !== folderToDelete.id),
    }));
    if (selectedFolderId === folderToDelete.id) setSelectedFolderId(null);
    setDraftFolderIds((ids) => ids.filter((id) => id !== folderToDelete.id));
    if (editingFolderId === folderToDelete.id) closeFolderModal();
    notify("Folder deleted. Its sets are still in your library.");
  }

  function toggleSetFolderAssignment(setId: string, folderId: string) {
    const targetFolder = data.folders.find((folderItem) => folderItem.id === folderId);
    if (!targetFolder) return;
    const isAssigned = targetFolder.setIds.includes(setId);

    setData((current) => ({
      ...current,
      folders: current.folders.map((folderItem) => folderItem.id === folderId
        ? {
            ...folderItem,
            setIds: isAssigned
              ? folderItem.setIds.filter((itemId) => itemId !== setId)
              : [...folderItem.setIds, setId],
          }
        : folderItem),
    }));
    notify(isAssigned ? `Removed from ${targetFolder.name}.` : `Added to ${targetFolder.name}.`);
  }

  function clearSetFolderAssignments(setId: string) {
    setData((current) => ({
      ...current,
      folders: current.folders.map((folderItem) => folderItem.setIds.includes(setId)
        ? { ...folderItem, setIds: folderItem.setIds.filter((itemId) => itemId !== setId) }
        : folderItem),
    }));
    setTileFolderPickerId(null);
    notify("Folder set to None.");
  }

  function toggleMastered(setId: string, cardId: string) {
    setData((current) => {
      const existing = current.mastered[setId] ?? [];
      const next = existing.includes(cardId) ? existing.filter((id) => id !== cardId) : [...existing, cardId];
      return { ...current, mastered: { ...current.mastered, [setId]: next } };
    });
  }

  function startLearn() {
    const questionFirstOptions = { ...learnOptions, answerTerms: false, answerDefinitions: true };
    setLearnPhase("goal");
    setLearnGoal("memorize");
    setLearnOptions(questionFirstOptions);
    setLearnOptionsDraft(questionFirstOptions);
    setLearnOptionsOpen(false);
    setLearnSessionIds([]);
    setLearnRoundIds([]);
    setLearnPendingIds([]);
    setLearnRetryIds([]);
    setLearnMasteredIds([]);
    setLearnIndex(0);
    setLearnRound(1);
    setLearnSequence(0);
    setLearnQuestionConfidence(0);
    setLearnLastConfidence(0);
    setLearnAnswer(null);
    setLearnLastCorrect(null);
    setLearnWrittenAnswer("");
    setLearnRetypeAnswer("");
    setLearnSelectedAnswers([]);
    setLearnFlashRevealed(false);
    navigate("learn");
  }

  function beginLearnSession(goal = learnGoal, options = learnOptions) {
    if (!selectedSet?.cards.length) return;
    const ids = selectedSet.cards.map((card) => card.id);
    const cardProgress = data.learnProgress?.[selectedSet.id]?.cards ?? {};
    const orderedIds = rankAdaptiveCardIds(ids, cardProgress, options.shuffle);
    const firstRoundIds = orderedIds.slice(0, 7);
    const pendingIds = orderedIds.slice(7);
    setLearnGoal(goal);
    setLearnOptions(options);
    setLearnPhase("session");
    setLearnSessionIds(orderedIds);
    setLearnRoundIds(firstRoundIds);
    setLearnPendingIds(pendingIds);
    setLearnRetryIds([]);
    setLearnMasteredIds([]);
    setLearnRound(1);
    setLearnIndex(0);
    setLearnSequence(0);
    setLearnQuestionConfidence(cardProgress[firstRoundIds[0]]?.confidence ?? 0);
    setLearnLastConfidence(0);
    setLearnAnswer(null);
    setLearnLastCorrect(null);
    setLearnWrittenAnswer("");
    setLearnRetypeAnswer("");
    setLearnSelectedAnswers([]);
    setLearnFlashRevealed(false);
    setLearnOptionsOpen(false);
    setData((current) => ({
      ...current,
      activeLearn: {
        setId: selectedSet.id,
        goal,
        options,
        sessionIds: orderedIds,
        roundIds: firstRoundIds,
        pendingIds,
        retryIds: [],
        masteredIds: [],
        round: 1,
        index: 0,
        sequence: 0,
        updatedAt: new Date().toISOString(),
      },
    }));
  }

  function resumeLearnSession() {
    if (!selectedSet || !resumableLearn) return;
    const validIds = new Set(selectedSet.cards.map((card) => card.id));
    const roundIds = resumableLearn.roundIds.filter((id) => validIds.has(id));
    if (!roundIds.length) {
      beginLearnSession(resumableLearn.goal, resumableLearn.options);
      return;
    }
    const index = Math.min(resumableLearn.index, roundIds.length - 1);
    const currentId = roundIds[index];
    const questionFirstOptions = { ...resumableLearn.options, answerTerms: false, answerDefinitions: true };
    setLearnGoal(resumableLearn.goal);
    setLearnOptions(questionFirstOptions);
    setLearnOptionsDraft(questionFirstOptions);
    setLearnPhase("session");
    setLearnSessionIds(resumableLearn.sessionIds.filter((id) => validIds.has(id)));
    setLearnRoundIds(roundIds);
    setLearnPendingIds(resumableLearn.pendingIds.filter((id) => validIds.has(id)));
    setLearnRetryIds(resumableLearn.retryIds.filter((id) => validIds.has(id)));
    setLearnMasteredIds(resumableLearn.masteredIds.filter((id) => validIds.has(id)));
    setLearnRound(resumableLearn.round);
    setLearnIndex(index);
    setLearnSequence(resumableLearn.sequence);
    setLearnQuestionConfidence(selectedLearnProgress[currentId]?.confidence ?? 0);
    setLearnLastConfidence(0);
    setLearnAnswer(null);
    setLearnLastCorrect(null);
    setLearnWrittenAnswer("");
    setLearnRetypeAnswer("");
    setLearnSelectedAnswers([]);
    setLearnFlashRevealed(false);
  }

  function playLearnSound(correct: boolean) {
    if (!learnOptions.soundEffects) return;
    try {
      const AudioContextClass = window.AudioContext;
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = correct ? 660 : 210;
      oscillator.type = correct ? "sine" : "triangle";
      gain.gain.setValueAtTime(0.08, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.18);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.addEventListener("ended", () => void context.close());
      oscillator.start();
      oscillator.stop(context.currentTime + 0.18);
    } catch {
      // Sound effects are optional and can be blocked by the browser.
    }
  }

  function recordLearnResult(correct: boolean, answer: string) {
    if (!selectedSet || !currentLearnCard || learnAnswer) return;
    const previousProgress = selectedLearnProgress[currentLearnCard.id] ?? EMPTY_LEARN_CARD_PROGRESS;
    const nextProgress = updateLearnCardProgress(previousProgress, correct, learnSequence);
    setLearnAnswer(answer);
    setLearnLastCorrect(correct);
    setLearnLastConfidence(nextProgress.confidence);
    playLearnSound(correct);
    if (correct && nextProgress.confidence >= learnMasteryTarget) {
      setLearnMasteredIds((ids) => ids.includes(currentLearnCard.id) ? ids : [...ids, currentLearnCard.id]);
    } else if (correct) {
      setLearnPendingIds((ids) => ids.includes(currentLearnCard.id) ? ids : [...ids, currentLearnCard.id]);
    } else {
      setLearnRetryIds((ids) => ids.includes(currentLearnCard.id) ? ids : [...ids, currentLearnCard.id]);
    }
    setData((current) => {
      const setProgress = current.learnProgress?.[selectedSet.id] ?? { cards: {}, updatedAt: "" };
      const persistedNext = updateLearnCardProgress(setProgress.cards[currentLearnCard.id], correct, learnSequence);
      const existingMastered = current.mastered[selectedSet.id] ?? [];
      const nextMastered = correct && persistedNext.confidence >= learnMasteryTarget
        ? (existingMastered.includes(currentLearnCard.id) ? existingMastered : [...existingMastered, currentLearnCard.id])
        : (correct ? existingMastered : existingMastered.filter((id) => id !== currentLearnCard.id));
      return {
        ...current,
        mastered: { ...current.mastered, [selectedSet.id]: nextMastered },
        learnProgress: {
          ...(current.learnProgress ?? {}),
          [selectedSet.id]: {
            cards: { ...setProgress.cards, [currentLearnCard.id]: persistedNext },
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  }

  function chooseLearnAnswer(answer: string) {
    recordLearnResult(normalizeAnswer(answer) === normalizeAnswer(currentLearnCorrectAnswer), answer);
  }

  function submitWrittenLearnAnswer() {
    if (!learnWrittenAnswer.trim()) return;
    recordLearnResult(
      gradeWrittenAnswer(learnWrittenAnswer, currentLearnCorrectAnswer, learnOptions.grading),
      learnWrittenAnswer.trim(),
    );
  }

  function submitSelectAllLearnAnswer() {
    const expected = new Set(currentSelectAll.correctParts);
    const selected = new Set(learnSelectedAnswers);
    const correct = expected.size === selected.size && [...expected].every((answer) => selected.has(answer));
    recordLearnResult(correct, learnSelectedAnswers.join("; "));
  }

  function submitTrueFalseLearnAnswer(answer: boolean) {
    recordLearnResult(answer === currentTrueFalse.answer, answer ? "True" : "False");
  }

  function saveLearnOptions() {
    if (!learnOptionsDraft.multipleChoice && !learnOptionsDraft.trueFalse && !learnOptionsDraft.selectAll && !learnOptionsDraft.written && !learnOptionsDraft.flashcards) {
      notify("Turn on at least one question type.");
      return;
    }
    if (!learnOptionsDraft.answerTerms && !learnOptionsDraft.answerDefinitions) {
      notify("Choose terms, definitions, or both as answers.");
      return;
    }
    setLearnOptions(learnOptionsDraft);
    setData((current) => current.activeLearn?.setId === selectedSet?.id
      ? { ...current, activeLearn: { ...current.activeLearn, options: learnOptionsDraft, updatedAt: new Date().toISOString() } }
      : current);
    setLearnOptionsOpen(false);
  }

  function nextLearnQuestion() {
    if (!selectedSet) return;
    const advance = advanceLearnRound({
      roundIds: learnRoundIds,
      pendingIds: learnPendingIds,
      retryIds: learnRetryIds,
      index: learnIndex,
      round: learnRound,
    });

    if (advance.complete) {
      setLearnPhase("complete");
      setData((current) => ({ ...current, sessions: current.sessions + 1, activeLearn: undefined }));
      return;
    }

    const nextSequence = learnSequence + 1;
    const nextCardId = advance.roundIds[advance.index];
    setLearnRoundIds(advance.roundIds);
    setLearnPendingIds(advance.pendingIds);
    setLearnRetryIds(advance.retryIds);
    setLearnIndex(advance.index);
    setLearnRound(advance.round);
    setLearnSequence(nextSequence);
    setLearnQuestionConfidence(selectedLearnProgress[nextCardId]?.confidence ?? 0);
    setLearnLastConfidence(0);
    setLearnAnswer(null);
    setLearnLastCorrect(null);
    setLearnWrittenAnswer("");
    setLearnRetypeAnswer("");
    setLearnSelectedAnswers([]);
    setLearnFlashRevealed(false);
    setData((current) => ({
      ...current,
      activeLearn: {
        setId: selectedSet.id,
        goal: learnGoal,
        options: learnOptions,
        sessionIds: learnSessionIds,
        roundIds: advance.roundIds,
        pendingIds: advance.pendingIds,
        retryIds: advance.retryIds,
        masteredIds: learnMasteredIds,
        round: advance.round,
        index: advance.index,
        sequence: nextSequence,
        updatedAt: new Date().toISOString(),
      },
    }));
  }

  function startTest() {
    setTestAnswers({});
    setTestSubmitted(false);
    navigate("test");
  }

  function submitTest() {
    setTestSubmitted(true);
    setData((current) => ({ ...current, sessions: current.sessions + 1 }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function generateGuide() {
    const cards = parseNotes(guideNotes);
    setGeneratedCards(cards);
    if (!cards.length) notify("Add a few notes first. Full sentences or term :: definition both work.");
  }

  function saveGeneratedGuide() {
    if (!generatedCards.length) return;
    const newSet: StudySet = {
      id: makeId("set"),
      title: guideTitle.trim() || "My study guide",
      description: "Created locally from pasted notes.",
      subject: "Study guide",
      color: "amber",
      updatedAt: new Date().toISOString(),
      cards: generatedCards,
    };
    setData((current) => ({ ...current, sets: [newSet, ...current.sets] }));
    setSelectedSetId(newSet.id);
    setGuideNotes("");
    setGeneratedCards([]);
    notify("Study guide saved as a flashcard set.");
    openSet(newSet.id);
  }

  function deleteSelectedSet() {
    if (!selectedSet) return;
    setData((current) => ({
      ...current,
      sets: current.sets.filter((set) => set.id !== selectedSet.id),
      folders: current.folders.map((item) => ({ ...item, setIds: item.setIds.filter((id) => id !== selectedSet.id) })),
    }));
    setSelectedSetId(data.sets.find((set) => set.id !== selectedSet.id)?.id ?? "");
    notify("Set deleted.");
    navigate("library");
  }

  function exportLibrary() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `flashbolt-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify("Backup downloaded.");
  }

  async function importLibrary(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isValidBackup(parsed)) throw new Error("Invalid backup");
      setData(withDataDefaults(parsed));
      setSelectedSetId(parsed.sets[0]?.id ?? "");
      notify("Library restored from backup.");
    } catch {
      notify("That file is not a valid Flashbolt backup.");
    }
    event.target.value = "";
  }

  function flashcardKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!selectedSet) return;
    if (event.key === "ArrowRight") {
      setFlashIndex((index) => Math.min(index + 1, selectedSet.cards.length - 1));
      setFlipped(false);
    }
    if (event.key === "ArrowLeft") {
      setFlashIndex((index) => Math.max(index - 1, 0));
      setFlipped(false);
    }
  }

  function renderSetGrid(sets: StudySet[]) {
    if (!sets.length) {
      return (
        <div className="empty-state">
          <div className="empty-mark">+</div>
          <h3>No sets here yet</h3>
          <p>Create a set or change your search to see more.</p>
          <button className="button primary" onClick={startCreate}>Create a set</button>
        </div>
      );
    }

    return (
      <div className="set-grid">
        {sets.map((set) => {
          const mastered = data.mastered[set.id]?.length ?? 0;
          const progress = set.cards.length ? Math.round((mastered / set.cards.length) * 100) : 0;
          const setFolders = data.folders.filter((folderItem) => folderItem.setIds.includes(set.id));
          const folderLabel = setFolders.length ? setFolders.map((folderItem) => folderItem.name).join(" · ") : "None";
          const normalizedFolderSearch = tileFolderSearch.trim().toLocaleLowerCase();
          const visibleFolders = normalizedFolderSearch
            ? data.folders.filter((folderItem) => folderItem.name.toLocaleLowerCase().includes(normalizedFolderSearch))
            : data.folders;
          return (
            <article className="set-tile" key={set.id}>
              <button className="set-tile-open" onClick={() => openSet(set.id)} aria-label={`Open ${set.title}`}><span className="visually-hidden">Open {set.title}</span></button>
              <span className={`set-accent ${set.color}`} />
              <span className="tile-kicker"><span>{set.subject || "General"}</span><span>{formatDate(set.updatedAt)}</span></span>
              <strong className="set-tile-title">{set.title}</strong>
              <span className="tile-description">{set.description || "Your private flashcard set."}</span>
              <div className="tile-folder-control" data-tile-folder-picker={set.id}>
                <button
                  className={`tile-folder-badge ${setFolders.length ? "assigned" : "unfiled"}`}
                  title={`${setFolders.length > 1 ? "Folders" : "Folder"}: ${folderLabel}`}
                  aria-label={`Change folders for ${set.title}. Current: ${folderLabel}`}
                  aria-expanded={tileFolderPickerId === set.id}
                  aria-controls={`tile-folder-menu-${set.id}`}
                  onClick={() => {
                    setTileFolderPickerId((current) => current === set.id ? null : set.id);
                    setTileFolderSearch("");
                  }}
                >
                  <span className="tile-folder-icon" aria-hidden="true">□</span>
                  <span className="tile-folder-copy">
                    <small>{setFolders.length > 1 ? "Folders" : "Folder"}</small>
                    <b>{folderLabel}</b>
                  </span>
                  <span className="tile-folder-chevron" aria-hidden="true">⌄</span>
                </button>
                {tileFolderPickerId === set.id && (
                  <div className="tile-folder-menu" id={`tile-folder-menu-${set.id}`} role="group" aria-label={`Folders for ${set.title}`}>
                    <div className="tile-folder-menu-heading">
                      <span className="tile-folder-menu-mark" aria-hidden="true">□</span>
                      <span className="tile-folder-menu-copy"><strong>Choose folders</strong><small>Changes save automatically</small></span>
                      <span className={`tile-folder-selection-count ${setFolders.length ? "has-selection" : ""}`}>{setFolders.length || "None"} selected</span>
                    </div>
                    {data.folders.length ? (
                      <>
                        <div className="tile-folder-search">
                          <span aria-hidden="true">⌕</span>
                          <input
                            type="search"
                            value={tileFolderSearch}
                            onChange={(event) => setTileFolderSearch(event.target.value)}
                            placeholder="Search folders"
                            aria-label={`Search folders for ${set.title}`}
                          />
                          {tileFolderSearch && <button type="button" onClick={() => setTileFolderSearch("")} aria-label="Clear folder search">×</button>}
                        </div>
                        {visibleFolders.length ? (
                          <div className="tile-folder-options">
                            {visibleFolders.map((folderItem) => {
                              const checked = folderItem.setIds.includes(set.id);
                              return (
                                <label className={`tile-folder-option ${checked ? "checked" : ""}`} key={folderItem.id}>
                                  <input
                                    type="checkbox"
                                    aria-label={`${checked ? "Remove" : "Add"} ${set.title} ${checked ? "from" : "to"} ${folderItem.name}`}
                                    checked={checked}
                                    onChange={() => toggleSetFolderAssignment(set.id, folderItem.id)}
                                  />
                                  <span className="tile-folder-option-copy">
                                    <strong>{folderItem.name}</strong>
                                    <small>{folderItem.setIds.length} set{folderItem.setIds.length === 1 ? "" : "s"}</small>
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="tile-folder-no-results">
                            <span aria-hidden="true">⌕</span>
                            <strong>No folders found</strong>
                            <small>Try a different folder name.</small>
                          </div>
                        )}
                      </>
                    ) : <p className="tile-folder-empty">No folders yet.</p>}
                    <div className="tile-folder-menu-actions">
                      <button className="clear" onClick={() => clearSetFolderAssignments(set.id)} disabled={!setFolders.length}>Clear selection</button>
                      <button className="create" onClick={() => openNewFolderModalForSet(set.id)}>＋ New folder</button>
                    </div>
                  </div>
                )}
              </div>
              <span className="tile-footer">
                <span>{set.cards.length} terms</span>
                <span className="mini-progress"><i style={{ width: `${progress}%` }} /></span>
                <span>{progress}%</span>
              </span>
            </article>
          );
        })}
      </div>
    );
  }

  const currentFlashcard = selectedSet?.cards[flashIndex];
  const isCurrentMastered = Boolean(selectedSet && currentFlashcard && data.mastered[selectedSet.id]?.includes(currentFlashcard.id));

  return (
    <div className={`app-shell theme-${theme}`}>
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate("home")} aria-label="Flashbolt home">
          <span className="brand-mark"><i /><i /><i /></span>
          <span>Flashbolt</span>
        </button>

        <nav className="main-nav" aria-label="Main navigation">
          <button className={view === "home" ? "active" : ""} onClick={() => { setSelectedFolderId(null); navigate("home"); }}><span className="nav-icon">⌂</span>Home</button>
          <button className={view === "library" ? "active" : ""} onClick={() => { setSelectedFolderId(null); navigate("library"); }}><span className="nav-icon">▤</span>Your library</button>
          <button className={view === "folders" ? "active" : ""} onClick={() => navigate("folders")}><span className="nav-icon">□</span>Folders</button>
        </nav>

        <div className="side-section">
          <p>Study tools</p>
          <button onClick={startCreate}><span className="nav-icon">＋</span>Flashcard set</button>
          <button onClick={() => navigate("guide")}><span className="nav-icon">≡</span>Study guide</button>
          <button onClick={() => selectedSet ? startTest() : navigate("library")}><span className="nav-icon">✓</span>Practice test</button>
        </div>

        <div className="private-card">
          <span className="private-icon">⌁</span>
          <div><strong>Private by design</strong><p>Your library syncs with your account.</p></div>
        </div>

        <div className="sidebar-bottom">
          <ThemePicker theme={theme} onThemeChange={setTheme} />
          <button onClick={exportLibrary}><span className="nav-icon">⇩</span>Back up library</button>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <button className="mobile-brand" onClick={() => navigate("home")} aria-label="Flashbolt home"><span className="brand-mark"><i /><i /><i /></span></button>
          <label className="search-box">
            <span>⌕</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your sets and cards" aria-label="Search your library" />
            {search && <button onClick={() => setSearch("")} aria-label="Clear search">×</button>}
          </label>
          <span className={`local-pill ${storageStatus === "error" ? "error" : ""}`} role="status" aria-live="polite" title={storageStatus === "error" ? syncError : "Your private library is saved to your signed-in account."}>
            <i />{storageStatus === "loading" ? "Loading library" : storageStatus === "saved" ? "Synced to your account" : syncError || "Sync unavailable"}
          </span>
          <ThemePicker compact theme={theme} onThemeChange={setTheme} />
          <div className="new-menu-wrap">
            <button className="new-button" onClick={() => setNewMenuOpen((open) => !open)} aria-expanded={newMenuOpen} aria-label="Create new">＋<span>New</span></button>
            {newMenuOpen && (
              <div className="new-menu" role="menu">
                <p>Create new</p>
                <button role="menuitem" onClick={startCreate}><span>▱</span><div><strong>Flashcard set</strong><small>Build cards from scratch</small></div></button>
                <button role="menuitem" onClick={startQuizletLinkImport}><span>⇩</span><div><strong>Import from Quizlet</strong><small>Paste a public set link</small></div></button>
                <button role="menuitem" onClick={startKahootLinkImport}><span>◇</span><div><strong>Import from Kahoot</strong><small>Paste a public quiz link or ID</small></div></button>
                <button role="menuitem" onClick={() => navigate("guide")}><span>≡</span><div><strong>Study guide</strong><small>Turn pasted notes into cards</small></div></button>
                <button role="menuitem" onClick={startTest}><span>✓</span><div><strong>Practice test</strong><small>Quiz yourself from a set</small></div></button>
                <button role="menuitem" onClick={() => { setNewMenuOpen(false); openNewFolderModal(); }}><span>□</span><div><strong>Folder</strong><small>Keep related sets together</small></div></button>
              </div>
            )}
          </div>
          <button className="avatar" aria-label="Private profile">ME</button>
        </header>

        <main className="workspace">
          {search && view !== "library" && (
            <section className="search-results-panel">
              <div className="section-heading"><div><span className="eyebrow">Search</span><h2>Results for “{search}”</h2></div><button className="text-button" onClick={() => navigate("library")}>Open library</button></div>
              {renderSetGrid(filteredSets)}
            </section>
          )}

          {!search && view === "home" && (
            <>
              <section className="welcome-row">
                <div>
                  <span className="eyebrow">Your private study space</span>
                  <h1>Good evening.<br /><em>What are we learning?</em></h1>
                  <p>Everything you make here is saved privately to your account, so your library follows you across your signed-in devices.</p>
                </div>
                <div className="focus-orbit" aria-hidden="true"><span>15</span><small>day focus</small><i className="orbit-one" /><i className="orbit-two" /></div>
              </section>

              {selectedSet && (
                <section className="continue-card">
                  <div className={`continue-art ${selectedSet.color}`}>
                    <span className="stack-card card-back" />
                    <span className="stack-card card-middle" />
                    <span className="stack-card card-front"><small>QUESTION</small><b>{selectedSet.cards[0]?.term}</b><i>Tap to reveal</i></span>
                  </div>
                  <div className="continue-copy">
                    <span className="eyebrow">Continue learning</span>
                    <h2>{selectedSet.title}</h2>
                    <p>{selectedSet.description}</p>
                    <div className="progress-label"><span>{data.mastered[selectedSet.id]?.length ?? 0} mastered</span><span>{selectedSet.cards.length} terms</span></div>
                    <div className="progress-track"><i style={{ width: `${Math.round(((data.mastered[selectedSet.id]?.length ?? 0) / Math.max(1, selectedSet.cards.length)) * 100)}%` }} /></div>
                    <div className="button-row">
                      <button className="button primary" onClick={() => openSet(selectedSet.id)}>Resume flashcards <span>→</span></button>
                      <button className="button quiet" onClick={startLearn}>Learn mode</button>
                    </div>
                  </div>
                </section>
              )}

              <section className="stats-row" aria-label="Study overview">
                <article><span className="stat-symbol violet">▤</span><div><strong>{data.sets.length}</strong><p>Study sets</p></div><small>All yours</small></article>
                <article><span className="stat-symbol mint">✓</span><div><strong>{masteredCount}</strong><p>Cards mastered</p></div><small>Keep going</small></article>
                <article><span className="stat-symbol amber">◒</span><div><strong>{data.sessions}</strong><p>Study sessions</p></div><small>All time</small></article>
              </section>

              <section>
                <div className="section-heading"><div><span className="eyebrow">Library</span><h2>Recently studied</h2></div><button className="text-button" onClick={() => navigate("library")}>View all <span>→</span></button></div>
                {renderSetGrid(data.sets.slice(0, 3))}
              </section>

              <section className="notes-callout">
                <div><span className="eyebrow">Quick start</span><h2>Turn your notes into flashcards.</h2><p>Paste one idea per line, or use <code>term :: definition</code> for precise cards. Everything happens locally.</p></div>
                <button className="button bright" onClick={() => navigate("guide")}>Create from notes <span>→</span></button>
              </section>
            </>
          )}

          {!search && view === "library" && (
            <section>
              <div className="page-heading split">
                <div><span className="eyebrow">Your library</span><h1>{folder ? folder.name : "Every set, in one place."}</h1><p>{folder ? `${folder.setIds.length} set${folder.setIds.length === 1 ? "" : "s"} in this folder.` : `${data.sets.length} sets and ${cardCount} cards, saved on this device.`}</p></div>
                <div className="heading-actions">
                  {folder && <button className="button quiet" onClick={() => editFolder(folder)}>Edit folder</button>}
                  <button className="button quiet" onClick={() => importInputRef.current?.click()}>Restore backup</button>
                  <button className="button primary" onClick={startCreate}>＋ Create set</button>
                </div>
              </div>
              <input ref={importInputRef} className="visually-hidden" type="file" accept="application/json" onChange={importLibrary} />
              <div className="library-toolbar">
                <div className="folder-filter-panel">
                  <div className="folder-filter-heading">
                    <span>Browse by folder</span>
                    <small>{data.folders.length} folder{data.folders.length === 1 ? "" : "s"}</small>
                  </div>
                  <div className="folder-chips" role="group" aria-label="Filter library by folder">
                    <button
                      className={!selectedFolderId ? "active" : ""}
                      aria-pressed={!selectedFolderId}
                      aria-label={`Show all ${data.sets.length} sets`}
                      onClick={() => setSelectedFolderId(null)}
                    >
                      <span className="folder-filter-icon all" aria-hidden="true"><i /></span>
                      <span className="folder-filter-name">All sets</span>
                      <span className="folder-filter-count">{data.sets.length}</span>
                    </button>
                    {data.folders.map((item) => (
                      <button
                        className={selectedFolderId === item.id ? "active" : ""}
                        aria-pressed={selectedFolderId === item.id}
                        aria-label={`Show ${item.name}, ${item.setIds.length} set${item.setIds.length === 1 ? "" : "s"}`}
                        title={item.name}
                        key={item.id}
                        onClick={() => setSelectedFolderId(item.id)}
                      >
                        <span className="folder-filter-icon folder" aria-hidden="true" />
                        <span className="folder-filter-name">{item.name}</span>
                        <span className="folder-filter-count">{item.setIds.length}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="library-toolbar-actions">
                  <label className="library-sort-control">
                    <span className="library-sort-icon" aria-hidden="true">⇅</span>
                    <span className="library-sort-field"><small>Sort by</small><select value={librarySort} onChange={(event) => setLibrarySort(event.target.value as LibrarySort)} aria-label="Sort library sets">
                      <optgroup label="Date">
                        <option value="updated-desc">Recently updated</option>
                        <option value="updated-asc">Oldest updated</option>
                      </optgroup>
                      <optgroup label="Name">
                        <option value="title-asc">Title: A–Z</option>
                        <option value="title-desc">Title: Z–A</option>
                        <option value="subject-asc">Subject: A–Z</option>
                        <option value="subject-desc">Subject: Z–A</option>
                        <option value="folder-asc">Folder: A–Z</option>
                        <option value="folder-desc">Folder: Z–A</option>
                      </optgroup>
                      <optgroup label="Set size">
                        <option value="terms-desc">Most terms</option>
                        <option value="terms-asc">Fewest terms</option>
                      </optgroup>
                      <optgroup label="Study progress">
                        <option value="progress-desc">Highest mastery %</option>
                        <option value="progress-asc">Lowest mastery %</option>
                        <option value="mastered-desc">Most mastered cards</option>
                        <option value="mastered-asc">Fewest mastered cards</option>
                        <option value="remaining-desc">Most cards left</option>
                        <option value="remaining-asc">Fewest cards left</option>
                      </optgroup>
                      <optgroup label="Organization">
                        <option value="unfiled-first">Unfiled first</option>
                        <option value="filed-first">Filed first</option>
                      </optgroup>
                    </select></span>
                  </label>
                  <button className="text-button" onClick={exportLibrary}>⇩ Download backup</button>
                </div>
              </div>
              {renderSetGrid(filteredSets)}
            </section>
          )}

          {!search && view === "folders" && (
            <section>
              <div className="page-heading split">
                <div><span className="eyebrow">Folders</span><h1>Organize your way.</h1><p>Group related sets without sharing anything publicly.</p></div>
                <button className="button primary" onClick={openNewFolderModal}>＋ New folder</button>
              </div>
              {data.folders.length ? (
                <div className="folder-grid">
                  {data.folders.map((item) => (
                    <article key={item.id} className="folder-tile">
                      <span className="folder-tab" />
                      <div className="folder-tile-actions">
                        <button onClick={() => editFolder(item)} aria-label={`Edit ${item.name}`} title="Edit folder">✎</button>
                        <button className="delete" onClick={() => deleteFolder(item)} aria-label={`Delete ${item.name}`} title="Delete folder">×</button>
                      </div>
                      <button className="folder-open-button" onClick={() => { setSelectedFolderId(item.id); navigate("library"); }}>
                        <span className="folder-icon">□</span>
                        <strong>{item.name}</strong><small>{item.setIds.length} set{item.setIds.length === 1 ? "" : "s"}</small><span>Open <b>→</b></span>
                      </button>
                    </article>
                  ))}
                  <button className="folder-tile new-folder" onClick={openNewFolderModal}><span className="folder-icon">＋</span><strong>Create a folder</strong><small>Keep a course or topic together</small></button>
                </div>
              ) : (
                <div className="empty-state"><div className="empty-mark">□</div><h3>No folders yet</h3><p>Create one to organize related study sets.</p><button className="button primary" onClick={openNewFolderModal}>Create a folder</button></div>
              )}
            </section>
          )}

          {!search && view === "create" && (
            <section className="creator-page">
              <div className="page-heading split">
                <div><button className="back-link" onClick={() => navigate("library")}>← Library</button><span className="eyebrow">{editingSetId ? "Edit set" : "New flashcard set"}</span><h1>{editingSetId ? "Make it better." : "Build a set that sticks."}</h1></div>
                <div className="heading-actions"><button className="button quiet" onClick={() => saveDraft(false)}>Save</button><button className="button primary" onClick={() => saveDraft(true)}>Save & study</button></div>
              </div>
              <div className="creator-layout">
                <div className="creator-main">
                  <article className="form-card set-details">
                    <label><span>Title</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="e.g. Biology chapter 4" maxLength={100} /></label>
                    <div className="field-row">
                      <label><span>Subject</span><input value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} placeholder="Course or topic" /></label>
                      <label><span>Color</span><select value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })}><option value="violet">Violet</option><option value="mint">Mint</option><option value="amber">Amber</option><option value="coral">Coral</option></select></label>
                    </div>
                    <label><span>Description <small>optional</small></span><textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="What will this set help you learn?" rows={3} /></label>
                    <div className="folder-assignment">
                      <div className="folder-assignment-heading">
                        <div><span>Folders <small>optional</small></span><p>Add this set to one or more folders.</p></div>
                        <button className="text-button" onClick={openNewFolderModal}>＋ New folder</button>
                      </div>
                      {data.folders.length ? (
                        <>
                        <label className="folder-assignment-search">
                          <span aria-hidden="true">⌕</span>
                          <input type="search" value={draftFolderSearch} onChange={(event) => setDraftFolderSearch(event.target.value)} placeholder="Search folders by name or course code" aria-label="Search folders" />
                          {draftFolderSearch && <button type="button" onClick={() => setDraftFolderSearch("")} aria-label="Clear folder search">×</button>}
                        </label>
                        <div className="folder-option-grid">
                          {data.folders.filter((folderItem) => folderItem.name.toLocaleLowerCase().includes(draftFolderSearch.trim().toLocaleLowerCase())).map((folderItem) => {
                            const checked = draftFolderIds.includes(folderItem.id);
                            return (
                              <label className={`folder-option ${checked ? "checked" : ""}`} key={folderItem.id}>
                                <input
                                  type="checkbox"
                                  aria-label={`Add this set to ${folderItem.name}`}
                                  checked={checked}
                                  onChange={() => setDraftFolderIds((ids) => ids.includes(folderItem.id)
                                    ? ids.filter((id) => id !== folderItem.id)
                                    : [...ids, folderItem.id])}
                                />
                                <span><strong>□ {folderItem.name}</strong><small>{folderItem.setIds.length} existing set{folderItem.setIds.length === 1 ? "" : "s"}</small></span>
                              </label>
                            );
                          })}
                          {draftFolderSearch && !data.folders.some((folderItem) => folderItem.name.toLocaleLowerCase().includes(draftFolderSearch.trim().toLocaleLowerCase())) && <p className="folder-search-empty">No folders match “{draftFolderSearch.trim()}”.</p>}
                        </div>
                        </>
                      ) : (
                        <p className="folder-assignment-empty">No folders yet. Create one here, then it will be selected automatically.</p>
                      )}
                    </div>
                  </article>

                  <div className="card-editor-list">
                    {draft.cards.map((card, index) => (
                      <div className="card-editor-wrap" key={card.id}>
                        <article
                          className={`card-editor ${draggingCardId === card.id ? "dragging" : ""}`}
                          draggable
                          onDragStart={() => setDraggingCardId(card.id)}
                          onDragEnd={() => setDraggingCardId(null)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => dropDraftCard(event, card.id)}
                        >
                          <header>
                            <span>{String(index + 1).padStart(2, "0")}</span>
                            <div className="card-tools">
                              <button className="highlight-button" data-color={card.highlight ?? "none"} onClick={() => cycleHighlight(card)} aria-label={`Change card highlight. Current color: ${card.highlight ?? "none"}`} title="Change card highlight">A</button>
                              <button onClick={() => startDictation(card, "term")} className={dictationTarget?.cardId === card.id && dictationTarget.field === "term" ? "recording" : ""} aria-label={`Dictate term for card ${index + 1}`} title="Dictate term">◉</button>
                              <button onClick={() => moveDraftCard(card.id, -1)} disabled={index === 0} aria-label={`Move card ${index + 1} up`} title="Move up">↑</button>
                              <button onClick={() => moveDraftCard(card.id, 1)} disabled={index === draft.cards.length - 1} aria-label={`Move card ${index + 1} down`} title="Move down">↓</button>
                              <button className="drag-handle" aria-label={`Drag card ${index + 1} to reorder`} title="Drag to reorder">☰</button>
                              <button onClick={() => duplicateDraftCard(card.id)} aria-label={`Duplicate card ${index + 1}`} title="Duplicate card">⧉</button>
                              <button onClick={() => setDraft((current) => ({ ...current, cards: current.cards.filter((item) => item.id !== card.id) }))} disabled={draft.cards.length === 1} aria-label={`Remove card ${index + 1}`} title="Delete card">×</button>
                            </div>
                          </header>
                          <div className="card-editor-fields">
                            <label className="card-text-field">
                              <AutoResizeTextarea className={`highlight-${card.highlight ?? "none"}`} value={card.term} onChange={(event) => updateDraftCard(card.id, "term", event.target.value)} placeholder="Enter term" />
                              <span className="field-meta"><b>TERM</b><select aria-label={`Term language for card ${index + 1}`} value={card.termLanguage ?? "auto"} onChange={(event) => updateDraftCardExtras(card.id, { termLanguage: event.target.value })}>{LANGUAGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></span>
                            </label>
                            <i />
                            <div className="definition-field-wrap">
                              <label className="card-text-field">
                                <AutoResizeTextarea className={`highlight-${card.highlight ?? "none"}`} value={card.definition} onChange={(event) => updateDraftCard(card.id, "definition", event.target.value)} placeholder="Enter definition" />
                                <span className="field-meta"><b>DEFINITION</b><select aria-label={`Definition language for card ${index + 1}`} value={card.definitionLanguage ?? "auto"} onChange={(event) => updateDraftCardExtras(card.id, { definitionLanguage: event.target.value })}>{LANGUAGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></span>
                              </label>
                              <div className="definition-actions">
                                <button onClick={() => startDictation(card, "definition")} className={dictationTarget?.cardId === card.id && dictationTarget.field === "definition" ? "recording" : ""} aria-label={`Dictate definition for card ${index + 1}`} title="Dictate definition">◉</button>
                                <label className="image-upload-button" title="Add image"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { void attachCardImage(card.id, event.target.files?.[0]); event.target.value = ""; }} /><span>▧</span>Image</label>
                              </div>
                            </div>
                          </div>
                          {card.answerChoices && card.answerChoices.length > 1 && (
                            <div className="card-editor-choices">
                              <span>Answer choices</span>
                              <div>
                                {card.answerChoices.map((choice, choiceIndex) => {
                                  const cleanDefinition = card.definition.replace(/^[A-F][).:-]\s*/i, "");
                                  const isCorrect = normalizeAnswer(choice) === normalizeAnswer(cleanDefinition);
                                  return (
                                    <label className={isCorrect ? "correct" : ""} key={`${card.id}-choice-${choiceIndex}`}>
                                      <b>{String.fromCharCode(65 + choiceIndex)}</b>
                                      <input
                                        value={choice}
                                        onChange={(event) => updateDraftCardExtras(card.id, {
                                          answerChoices: card.answerChoices?.map((item, itemIndex) => itemIndex === choiceIndex ? event.target.value : item),
                                        })}
                                        aria-label={`Choice ${String.fromCharCode(65 + choiceIndex)} for card ${index + 1}`}
                                      />
                                      {isCorrect && <small>Correct</small>}
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          {card.imageData && <div className="card-image-preview"><img width={74} height={58} src={card.imageData} alt={card.imageName ? `Attached ${card.imageName}` : "Attached card image"} /><span>{card.imageName}</span><button onClick={() => updateDraftCardExtras(card.id, { imageData: undefined, imageName: undefined })} aria-label={`Remove image from card ${index + 1}`}>Remove image</button></div>}
                        </article>
                        <button className="insert-card-button" onClick={() => addDraftCard(card.id)} aria-label={`Add a card after card ${index + 1}`}><span>＋</span></button>
                      </div>
                    ))}
                  </div>
                  <button className="add-card-button" onClick={() => addDraftCard()}>＋ Add another card</button>
                </div>

                <aside className="import-panel">
                  <div className="quizlet-import-block">
                    <span className="eyebrow">From Quizlet</span><h3>Import by link</h3><p>Paste a public flashcard-set link. Its title, description, and cards will fill this editor.</p>
                    <label className="quizlet-link-field"><span className="visually-hidden">Quizlet set link</span><input type="url" value={quizletUrl} onChange={(event) => { setQuizletUrl(event.target.value); setQuizletImportMessage(""); setQuizletImportFailed(false); }} onKeyDown={(event) => { if (event.key === "Enter" && !quizletImporting) void applyQuizletImport(); }} placeholder="https://quizlet.com/123…/flash-cards/" autoComplete="url" /></label>
                    <button className="button primary full" onClick={() => void applyQuizletImport()} disabled={quizletImporting}>{quizletImporting ? "Importing…" : "Import Quizlet set"}</button>
                    {quizletImportMessage && <p className={`import-status ${quizletImportFailed ? "error" : ""}`} role={quizletImportFailed ? "alert" : "status"}>{quizletImportMessage}</p>}
                  </div>
                  <div className="import-divider"><span>or from Kahoot</span></div>
                  <div className="kahoot-import-block">
                    <span className="eyebrow">From Kahoot</span><h3>Import quiz by link or ID</h3><p>Paste a public details link or its quiz ID. Questions, choices, and correct answers will fill this editor.</p>
                    <label className="quizlet-link-field"><span className="visually-hidden">Kahoot quiz link or ID</span><input type="text" inputMode="url" value={kahootReference} onChange={(event) => { setKahootReference(event.target.value); setKahootImportMessage(""); setKahootImportFailed(false); }} onKeyDown={(event) => { if (event.key === "Enter" && !kahootImporting) void applyKahootImport(); }} placeholder="Kahoot details link or quiz ID" autoComplete="url" /></label>
                    <button className="button primary full kahoot-import-button" onClick={() => void applyKahootImport()} disabled={kahootImporting}>{kahootImporting ? "Importing…" : "Import Kahoot quiz"}</button>
                    {kahootImportMessage && <p className={`import-status ${kahootImportFailed ? "error" : ""}`} role={kahootImportFailed ? "alert" : "status"}>{kahootImportMessage}</p>}
                  </div>
                  <div className="import-divider"><span>or paste cards</span></div>
                  <div className="paste-import-block">
                    <h3>Paste a list</h3><p>Put one card on each line and separate the sides with <code>::</code>.</p>
                    <textarea value={pasteImport} onChange={(event) => setPasteImport(event.target.value)} placeholder={'Paste copied Quizlet term-list HTML, or use:\n\nLifecycle :: The stages an activity moves through\nIntent :: A request to perform an action'} rows={7} />
                    <button className="button quiet full" onClick={applyPasteImport}>Import pasted cards</button>
                  </div>
                  <div className="privacy-note"><span>⌁</span><p><strong>Saved privately.</strong> Imported cards sync to your account and remain available as a local backup.</p></div>
                </aside>
              </div>
            </section>
          )}

          {!search && view === "set" && selectedSet && currentFlashcard && (
            <section className="study-page">
              <div className="page-heading split compact">
                <div><button className="back-link" onClick={() => navigate("library")}>← Library</button><span className="eyebrow">{selectedSet.subject}</span><h1>{selectedSet.title}</h1><p>{selectedSet.description}</p></div>
                <div className="heading-actions"><button className="button quiet" onClick={() => startEdit(selectedSet)}>Edit set</button><button className="icon-button danger" onClick={deleteSelectedSet} aria-label="Delete set">×</button></div>
              </div>
              {folder && folderSetIndex >= 0 && folderSets.length > 1 && (
                <nav className="folder-set-navigation" aria-label={`Move between sets in ${folder.name}`}>
                  <button className="folder-set-button previous" onClick={() => previousFolderSet && openSet(previousFolderSet.id)} disabled={!previousFolderSet}>
                    <span>← Previous set</span>
                    <strong>{previousFolderSet?.title ?? "First set in folder"}</strong>
                  </button>
                  <div className="folder-set-position">
                    <span className="eyebrow">{folder.name}</span>
                    <strong>{folderSetIndex + 1} of {folderSets.length}</strong>
                  </div>
                  <button className="folder-set-button next" onClick={() => nextFolderSet && openSet(nextFolderSet.id)} disabled={!nextFolderSet}>
                    <span>Next set →</span>
                    <strong>{nextFolderSet?.title ?? "Last set in folder"}</strong>
                  </button>
                </nav>
              )}
              <div className="mode-tabs" role="tablist" aria-label="Study modes"><button className="active" role="tab">▱ Flashcards</button><button role="tab" onClick={startLearn}>◫ Learn</button><button role="tab" onClick={startTest}>✓ Test</button></div>
              <div className="study-layout">
                <div>
                  <div className="flash-status"><span>{flashIndex + 1} / {selectedSet.cards.length}</span><button className={isCurrentMastered ? "mastered" : ""} onClick={() => toggleMastered(selectedSet.id, currentFlashcard.id)}>{isCurrentMastered ? "✓ Mastered" : "Mark as mastered"}</button></div>
                  <button className={`flashcard ${flipped ? "flipped" : ""} highlight-${currentFlashcard.highlight ?? "none"}`} onClick={() => setFlipped((value) => !value)} onKeyDown={flashcardKeyDown} aria-label={`Flashcard ${flashIndex + 1}. ${flipped ? "Showing answer" : "Showing question"}. Press to flip.`}>
                    <span className="card-side-label">{flipped ? "ANSWER" : "QUESTION"}</span>
                    <strong>{flipped ? currentFlashcard.definition : currentFlashcard.term}</strong>
                    {currentFlashcard.imageData && <img width={320} height={185} className="flashcard-image" src={currentFlashcard.imageData} alt={currentFlashcard.imageName ? `Study aid: ${currentFlashcard.imageName}` : "Study aid"} />}
                    <small>{flipped ? "Tap to see the question" : "Tap to reveal the answer"}</small>
                  </button>
                  <div className="flash-controls"><button onClick={() => { setFlashIndex((index) => Math.max(index - 1, 0)); setFlipped(false); }} disabled={flashIndex === 0} aria-label="Previous card">←</button><button className="flip-hint" onClick={() => setFlipped((value) => !value)}>Flip card <kbd>Space</kbd></button><button onClick={() => { setFlashIndex((index) => Math.min(index + 1, selectedSet.cards.length - 1)); setFlipped(false); }} disabled={flashIndex === selectedSet.cards.length - 1} aria-label="Next card">→</button></div>
                </div>
                <aside className="study-side-panel">
                  <span className="eyebrow">Set progress</span><div className="score-ring" style={{ "--score": `${Math.round(((data.mastered[selectedSet.id]?.length ?? 0) / selectedSet.cards.length) * 100)}%` } as React.CSSProperties}><span>{Math.round(((data.mastered[selectedSet.id]?.length ?? 0) / selectedSet.cards.length) * 100)}<small>%</small></span></div>
                  <h3>{data.mastered[selectedSet.id]?.length ?? 0} of {selectedSet.cards.length} mastered</h3><p>Mark cards as mastered when you can answer without peeking.</p>
                  <button className="button primary full" onClick={startLearn}>Practice in Learn</button><button className="button quiet full" onClick={startTest}>Take a test</button>
                </aside>
              </div>
              <section className="term-list">
                <div className="section-heading"><div><span className="eyebrow">Review</span><h2>Terms in this set ({selectedSet.cards.length})</h2></div></div>
                {selectedSet.cards.map((card, index) => (
                  <article className={`highlight-${card.highlight ?? "none"}`} key={card.id}>
                    <span>{index + 1}</span>
                    <strong>{card.term}</strong>
                    <p>{card.definition}</p>
                    {card.answerChoices && card.answerChoices.length > 1 && (
                      <ol className="term-review-choices" aria-label={`Answer choices for ${card.term}`}>
                        {card.answerChoices.map((choice, choiceIndex) => {
                          const isCorrect = normalizeAnswer(choice) === normalizeAnswer(card.definition);
                          return <li className={isCorrect ? "correct" : ""} key={`${card.id}-${choiceIndex}`}><span>{String.fromCharCode(65 + choiceIndex)}</span><b>{choice}</b>{isCorrect && <em>Correct</em>}</li>;
                        })}
                      </ol>
                    )}
                    {card.imageData && <img width={50} height={42} src={card.imageData} alt="" />}
                    <button className={data.mastered[selectedSet.id]?.includes(card.id) ? "done" : ""} onClick={() => toggleMastered(selectedSet.id, card.id)} aria-label="Toggle mastered">✓</button>
                  </article>
                ))}
              </section>
            </section>
          )}

          {!search && view === "learn" && selectedSet && (
            <section className="learn-page">
              {learnPhase === "goal" && (
                <div className="learn-goal-screen">
                  <button className="back-link" onClick={() => navigate("set")}>← Back to set</button>
                  <div className="learn-goal-heading"><div><span className="eyebrow">{selectedSet.subject}</span><h1>Choose a goal for this session</h1><p>Learn adapts to every answer. Recognition comes first, then verification, then written recall. Difficult cards return sooner and strong cards return in harder formats.</p></div><div className="learn-orbit" aria-hidden="true"><i /><i /><i /></div></div>
                  <div className="goal-options" role="radiogroup" aria-label="Learn session goal">
                    <button role="radio" aria-checked={learnGoal === "cram"} className={learnGoal === "cram" ? "selected" : ""} onClick={() => setLearnGoal("cram")}><span className="goal-copy"><strong>Cram for a test</strong><small>Move quickly with mixed question types</small></span><span className="goal-icon cram">◴</span></button>
                    <button role="radio" aria-checked={learnGoal === "memorize"} className={learnGoal === "memorize" ? "selected" : ""} onClick={() => setLearnGoal("memorize")}><span className="goal-copy"><strong>Memorize it all</strong><small>Keep practicing until every card is mastered</small></span><span className="goal-icon memorize">✦</span></button>
                  </div>
                  <div className="learn-mastery-overview" aria-label="Saved knowledge levels"><span><i className="level-new" />New <b>{learnStatusCounts.new}</b></span><span><i className="level-learning" />Learning <b>{learnStatusCounts.learning}</b></span><span><i className="level-familiar" />Familiar <b>{learnStatusCounts.familiar}</b></span><span><i className="level-mastered" />Mastered <b>{learnStatusCounts.mastered}</b></span></div>
                  <div className="learn-goal-footer"><span>{selectedSet.cards.length} terms · progress saves on this device</span><div className="learn-goal-actions">{resumableLearn && <button className="button quiet learn-start" onClick={resumeLearnSession}>Resume session</button>}<button className="button primary learn-start" onClick={() => beginLearnSession(learnGoal)}>{resumableLearn ? "Start new" : "Start Learn"} <b>→</b></button></div></div>
                </div>
              )}

              {learnPhase === "session" && currentLearnCard && (
                <>
                  <header className="learn-session-header">
                    <button className="learn-exit" onClick={() => navigate("set")} aria-label="Exit Learn">×</button>
                    <div className="learn-session-progress" aria-live="polite">
                      <div className="learn-round-track" aria-label={`${learnQuestionsAnswered} of ${learnQuestionsTotal} total questions answered`}>
                        <span>{learnQuestionsAnswered}</span>
                        <div className="learn-segments">{Array.from({ length: learnQuestionSegmentCount }, (_, groupIndex) => {
                          const segmentStart = groupIndex * 7;
                          const segmentSize = Math.min(7, Math.max(1, learnQuestionsTotal - segmentStart));
                          const answeredInSegment = Math.min(segmentSize, Math.max(0, learnQuestionsAnswered - segmentStart));
                          return <i key={groupIndex}><b style={{ width: `${(answeredInSegment / segmentSize) * 100}%` }} /></i>;
                        })}</div>
                        <span>{learnQuestionsTotal}</span>
                      </div>
                      <div className="learn-progress-caption"><span>{learnQuestionsAnswered} answered</span><span>{learnQuestionsTotal} total questions</span></div>
                    </div>
                    <button className="learn-options-button" onClick={() => { setLearnOptionsDraft(learnOptions); setLearnOptionsOpen(true); }}>⚙ Options</button>
                  </header>

                  <div className="learn-question-shell">
                    <div className="learn-mastery-overview compact" aria-label="Adaptive knowledge levels"><span><i className="level-new" />New <b>{learnStatusCounts.new}</b></span><span><i className="level-learning" />Learning <b>{learnStatusCounts.learning}</b></span><span><i className="level-familiar" />Familiar <b>{learnStatusCounts.familiar}</b></span><span><i className="level-mastered" />Mastered <b>{learnStatusCounts.mastered}</b></span></div>
                    <div className="learn-question-meta"><span>Adaptive round {learnRound}</span><span>{learnRetryIds.length ? `${learnRetryIds.length} weak card${learnRetryIds.length === 1 ? "" : "s"} queued` : `${learnRoundIds.length - learnIndex} left in this round`}</span></div>
                    <div className="question-card">
                      <div className="learn-question-stage"><span className="eyebrow">{currentLearnQuestionKind === "written" ? `Write the ${currentLearnAnswerSide}` : currentLearnQuestionKind === "true-false" ? "True or false" : currentLearnQuestionKind === "select-all" ? "Select all that apply" : currentLearnQuestionKind === "flashcard" ? "Recall, then reveal" : `Choose the ${currentLearnAnswerSide}`}</span><span>{learnConfidenceLabel(learnQuestionConfidence)} · stage {Math.min(3, learnQuestionConfidence + 1)}</span></div>
                      <h1>{currentLearnPrompt}</h1>
                      {learnOptions.showImagesOnQuestions && currentLearnCard.imageData && <img width={320} height={185} className="learn-question-image" src={currentLearnCard.imageData} alt={currentLearnCard.imageName ?? "Question study aid"} />}

                      {currentLearnQuestionKind === "multiple-choice" && <div className="answer-grid">{currentLearnChoices.map((option, index) => {
                        const isCorrect = normalizeAnswer(option) === normalizeAnswer(currentLearnCorrectAnswer);
                        const isChosen = option === learnAnswer;
                        const resultClass = learnAnswer ? (isCorrect ? "correct" : isChosen ? "incorrect" : "muted") : "";
                        return <button key={option} className={resultClass} onClick={() => chooseLearnAnswer(option)} disabled={Boolean(learnAnswer)}><span>{String.fromCharCode(65 + index)}</span>{option}</button>;
                      })}</div>}

                      {currentLearnQuestionKind === "true-false" && <div className="true-false-question"><p>The matching {currentLearnAnswerSide} is <strong>{currentTrueFalse.statement}</strong>.</p><div><button className={learnAnswer === "True" ? (learnLastCorrect ? "correct" : "incorrect") : ""} onClick={() => submitTrueFalseLearnAnswer(true)} disabled={Boolean(learnAnswer)}><span>✓</span>True</button><button className={learnAnswer === "False" ? (learnLastCorrect ? "correct" : "incorrect") : ""} onClick={() => submitTrueFalseLearnAnswer(false)} disabled={Boolean(learnAnswer)}><span>×</span>False</button></div></div>}

                      {currentLearnQuestionKind === "written" && <form className="written-answer" onSubmit={(event) => { event.preventDefault(); submitWrittenLearnAnswer(); }}><label><span>Your answer</span><input value={learnWrittenAnswer} onChange={(event) => setLearnWrittenAnswer(event.target.value)} disabled={Boolean(learnAnswer)} placeholder={`Type the ${currentLearnAnswerSide}`} /></label><button className="button primary" disabled={!learnWrittenAnswer.trim() || Boolean(learnAnswer)}>Check answer</button></form>}

                      {currentLearnQuestionKind === "select-all" && <div className="select-all-question"><div className="select-all-grid">{currentSelectAll.choices.map((option) => <label key={option} className={learnSelectedAnswers.includes(option) ? "selected" : ""}><input type="checkbox" checked={learnSelectedAnswers.includes(option)} onChange={() => setLearnSelectedAnswers((answers) => answers.includes(option) ? answers.filter((answer) => answer !== option) : [...answers, option])} disabled={Boolean(learnAnswer)} /><span>✓</span><p>{option}</p></label>)}</div><button className="button primary" onClick={submitSelectAllLearnAnswer} disabled={!learnSelectedAnswers.length || Boolean(learnAnswer)}>Check selections</button></div>}

                      {currentLearnQuestionKind === "flashcard" && <div className="learn-flashcard-mode"><button className={`learn-reveal-card ${learnFlashRevealed ? "revealed" : ""}`} onClick={() => setLearnFlashRevealed(true)}><span>{learnFlashRevealed ? currentLearnCorrectAnswer : "Think of the answer before revealing it"}</span><small>{learnFlashRevealed ? "How did you do?" : "Reveal answer"}</small></button>{learnFlashRevealed && !learnAnswer && <div className="recall-buttons"><button className="button quiet" onClick={() => recordLearnResult(false, "Still learning")}>Still learning</button><button className="button primary" onClick={() => recordLearnResult(true, "Got it")}>Got it</button></div>}</div>}

                      {learnAnswer && <div className={`answer-feedback ${learnLastCorrect ? "correct" : "incorrect"}`}>
                        <div className="feedback-copy"><strong>{learnLastCorrect ? "Nice work." : "Not quite yet."}</strong><p>{learnLastCorrect ? (learnLastConfidence >= learnMasteryTarget ? "This card reached your session goal." : `Confidence moved to ${learnConfidenceLabel(learnLastConfidence)}. It will return later in a harder format.`) : <>The correct answer is <b>{currentLearnCorrectAnswer}</b>. This weak card will return before the next batch.</>}</p>{!learnLastCorrect && learnOptions.retypeCorrectAnswers && <label className="retype-answer"><span>Retype the correct answer to continue</span><input value={learnRetypeAnswer} onChange={(event) => setLearnRetypeAnswer(event.target.value)} placeholder={currentLearnCorrectAnswer} /></label>}</div>
                        {learnOptions.showImagesOnAnswers && currentLearnCard.imageData && <img width={74} height={58} className="learn-feedback-image" src={currentLearnCard.imageData} alt="Answer study aid" />}
                        <button className="button primary" onClick={nextLearnQuestion} disabled={!learnLastCorrect && learnOptions.retypeCorrectAnswers && normalizeAnswer(learnRetypeAnswer) !== normalizeAnswer(currentLearnCorrectAnswer)}>{learnIndex === learnRoundIds.length - 1 && learnRetryIds.length ? "Retry missed" : learnIndex === learnRoundIds.length - 1 && learnPendingIds.length ? "Next round" : learnIndex === learnRoundIds.length - 1 ? "Finish" : "Next question"} →</button>
                      </div>}
                    </div>
                  </div>
                </>
              )}

              {learnPhase === "complete" && (
                <div className="results-card learn-complete"><span className="result-burst">✓</span><span className="eyebrow">100% goal reached</span><h1>You completed the adaptive path.</h1><p className="learn-complete-count"><strong>{learnQuestionsAnswered}</strong> questions answered across <strong>{learnRound}</strong> adaptive round{learnRound === 1 ? "" : "s"}.</p><p>Every card reached the {learnGoal === "cram" ? "familiar" : "mastered"} level. Weak cards repeated, stronger cards advanced to harder recall, and your progress was saved on this device.</p><div className="button-row center"><button className="button primary" onClick={() => beginLearnSession(learnGoal)}>Practice again</button><button className="button quiet" onClick={() => navigate("set")}>Back to set</button></div></div>
              )}

              {learnOptionsOpen && <div className="modal-backdrop learn-options-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setLearnOptionsOpen(false); }}><div className="learn-options-modal" role="dialog" aria-modal="true" aria-labelledby="learn-options-title">
                <header><div><span className="eyebrow">Customize Learn</span><h2 id="learn-options-title">Options</h2></div><button className="icon-button" onClick={() => setLearnOptionsOpen(false)} aria-label="Close options">×</button></header>
                <div className="learn-quick-options"><button className={learnOptionsDraft.shuffle ? "selected" : ""} aria-pressed={learnOptionsDraft.shuffle} onClick={() => setLearnOptionsDraft((options) => ({ ...options, shuffle: !options.shuffle }))}><span>⇄</span>Shuffle</button><button className={learnOptionsDraft.soundEffects ? "selected" : ""} aria-pressed={learnOptionsDraft.soundEffects} onClick={() => setLearnOptionsDraft((options) => ({ ...options, soundEffects: !options.soundEffects }))}><span>♪</span>Sound</button><button className={learnOptionsDraft.textToSpeech ? "selected" : ""} aria-pressed={learnOptionsDraft.textToSpeech} onClick={() => setLearnOptionsDraft((options) => ({ ...options, textToSpeech: !options.textToSpeech }))}><span>◖</span>Read aloud</button></div>
                <section className="options-section"><h3>Question types</h3>{([['multipleChoice','Multiple choice','▤'],['trueFalse','True or false','◐'],['selectAll','Select all that apply','✓'],['written','Written','✎'],['flashcards','Flashcards','▱']] as const).map(([key,label,icon]) => <label className="option-row" key={key}><span className="option-row-icon">{icon}</span><strong>{label}</strong><input type="checkbox" role="switch" checked={learnOptionsDraft[key]} onChange={() => setLearnOptionsDraft((options) => ({ ...options, [key]: !options[key] }))} /></label>)}</section>
                <section className="options-section"><h3>Answer with</h3><label className="option-row"><strong>Terms</strong><input type="checkbox" role="switch" checked={learnOptionsDraft.answerTerms} onChange={() => setLearnOptionsDraft((options) => ({ ...options, answerTerms: !options.answerTerms }))} /></label><label aria-label="Definitions, recommended for question cards" className="option-row"><span><strong>Definitions</strong><small>Recommended for question cards</small></span><input type="checkbox" role="switch" checked={learnOptionsDraft.answerDefinitions} onChange={() => setLearnOptionsDraft((options) => ({ ...options, answerDefinitions: !options.answerDefinitions }))} /></label></section>
                <section className="options-section"><h3>See images with</h3><label className="option-row"><strong>Questions</strong><input type="checkbox" role="switch" checked={learnOptionsDraft.showImagesOnQuestions} onChange={() => setLearnOptionsDraft((options) => ({ ...options, showImagesOnQuestions: !options.showImagesOnQuestions }))} /></label><label className="option-row"><strong>Answer choices</strong><input type="checkbox" role="switch" checked={learnOptionsDraft.showImagesOnAnswers} onChange={() => setLearnOptionsDraft((options) => ({ ...options, showImagesOnAnswers: !options.showImagesOnAnswers }))} /></label></section>
                <section className="options-section"><h3>Grading</h3><div className="grading-options">{([['relaxed','Relaxed','Meaning and small wording differences count.'],['moderate','Moderate','Close matches and small misspellings count.'],['strict','Strict','The normalized answer must match exactly.']] as const).map(([value,label,description]) => <label aria-label={`${label}: ${description}`} key={value} className={learnOptionsDraft.grading === value ? "selected" : ""}><input type="radio" name="learn-grading" value={value} checked={learnOptionsDraft.grading === value} onChange={() => setLearnOptionsDraft((options) => ({ ...options, grading: value }))} /><span><strong>{label}</strong><small>{description}</small></span></label>)}</div><label aria-label="Retype correct answers" className="option-row"><span><strong>Retype correct answers</strong><small>Required after a missed written question.</small></span><input type="checkbox" role="switch" checked={learnOptionsDraft.retypeCorrectAnswers} onChange={() => setLearnOptionsDraft((options) => ({ ...options, retypeCorrectAnswers: !options.retypeCorrectAnswers }))} /></label></section>
                <footer><button className="text-button danger-text" onClick={() => { setLearnOptions(learnOptionsDraft); beginLearnSession(learnGoal, learnOptionsDraft); }}>Restart Learn</button><div><button className="button quiet" onClick={() => setLearnOptionsOpen(false)}>Cancel</button><button className="button primary" onClick={saveLearnOptions}>Save</button></div></footer>
              </div></div>}
            </section>
          )}

          {!search && view === "test" && selectedSet && (
            <section className="test-page">
              <div className="page-heading split compact"><div><button className="back-link" onClick={() => navigate("set")}>← Back to set</button><span className="eyebrow">Practice test</span><h1>{selectedSet.title}</h1><p>{testCards.length} questions generated from your flashcards.</p></div>{testSubmitted && <div className="test-score"><strong>{testScore}/{testCards.length}</strong><span>{Math.round((testScore / Math.max(1, testCards.length)) * 100)}% score</span></div>}</div>
              <div className="test-list">
                {testCards.map((card, cardIndex) => (
                  <article key={card.id} className={testSubmitted ? (testAnswers[card.id] === card.definition ? "correct-card" : "incorrect-card") : ""}>
                    <header><span>Question {cardIndex + 1}</span>{testSubmitted && <b>{testAnswers[card.id] === card.definition ? "Correct" : "Review"}</b>}</header>
                    <h2>{card.term}</h2>
                    <div className="test-options">
                      {answerOptions(selectedSet, cardIndex).map((option, optionIndex) => <label key={option} className={testSubmitted && option === card.definition ? "answer-key" : ""}><input type="radio" name={card.id} value={option} checked={testAnswers[card.id] === option} onChange={() => setTestAnswers((answers) => ({ ...answers, [card.id]: option }))} disabled={testSubmitted} /><span>{String.fromCharCode(65 + optionIndex)}</span><p>{option}</p></label>)}
                    </div>
                    {testSubmitted && testAnswers[card.id] !== card.definition && <p className="test-explanation">Correct answer: <strong>{card.definition}</strong></p>}
                  </article>
                ))}
              </div>
              <div className="test-submit"><span>{Object.keys(testAnswers).length} of {testCards.length} answered</span>{testSubmitted ? <button className="button primary" onClick={startTest}>Retake test</button> : <button className="button primary" onClick={submitTest} disabled={Object.keys(testAnswers).length !== testCards.length}>Grade my test</button>}</div>
            </section>
          )}

          {!search && view === "guide" && (
            <section className="guide-page">
              <div className="page-heading"><button className="back-link" onClick={() => navigate("home")}>← Home</button><span className="eyebrow">Local study guide</span><h1>Turn notes into something <em>studyable.</em></h1><p>Paste notes below. Flashbolt finds line pairs or turns full sentences into key ideas—without sending your text anywhere.</p></div>
              <div className="guide-layout">
                <article className="guide-input-card">
                  <div className="guide-title-field">
                    <label><span>Guide title</span><input value={guideTitle} onChange={(event) => setGuideTitle(event.target.value)} /></label>
                    {guideTitleSuggestions.length > 0 && <div className="title-suggestions"><span>Suggested titles</span><div>{guideTitleSuggestions.map((title) => <button key={title} onClick={() => setGuideTitle(title)} className={guideTitle === title ? "selected" : ""}>{title}</button>)}</div></div>}
                  </div>
                  <label><span>Your notes</span><textarea value={guideNotes} onChange={(event) => setGuideNotes(event.target.value)} placeholder={'Paste a paragraph, or use one pair per line:\n\nActivity lifecycle :: The states an Android activity moves through\nIntent :: A request to perform an action'} rows={14} /></label>
                  <div className="guide-actions"><small>{guideNotes.length.toLocaleString()} characters · processed locally</small><button className="button bright" onClick={generateGuide}>Generate cards →</button></div>
                </article>
                <aside className="guide-preview">
                  <div className="guide-preview-heading"><div><span className="eyebrow">Preview</span><h2>{generatedCards.length ? `${generatedCards.length} cards ready` : "Your cards appear here"}</h2></div>{generatedCards.length > 0 && <button className="button primary" onClick={saveGeneratedGuide}>Save as set</button>}</div>
                  {generatedCards.length ? <div className="preview-cards">{generatedCards.slice(0, 8).map((card, index) => <article key={card.id}><span>{index + 1}</span><div><strong>{card.term}</strong><p>{card.definition}</p></div></article>)}</div> : <div className="guide-placeholder"><span>≡</span><p>Tip: <code>term :: definition</code> gives you the cleanest cards.</p></div>}
                </aside>
              </div>
            </section>
          )}
        </main>

        <nav className="mobile-nav" aria-label="Mobile navigation"><button className={view === "home" ? "active" : ""} onClick={() => navigate("home")}><span>⌂</span>Home</button><button className={view === "library" ? "active" : ""} onClick={() => navigate("library")}><span>▤</span>Library</button><button className="mobile-create" onClick={startCreate}><span>＋</span></button><button className={view === "folders" ? "active" : ""} onClick={() => navigate("folders")}><span>□</span>Folders</button><button onClick={() => navigate("guide")}><span>≡</span>Guide</button></nav>
      </div>

      {folderModalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeFolderModal(); }}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="folder-title">
            <header><div><span className="modal-icon">□</span><span className="eyebrow">{editingFolderId ? "Edit collection" : "New collection"}</span><h2 id="folder-title">{editingFolderId ? "Edit your folder" : "Name your folder"}</h2></div><button className="icon-button" onClick={closeFolderModal} aria-label="Close modal">×</button></header>
            <label className="modal-field"><span>Folder name</span><input value={folderName} onChange={(event) => setFolderName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveFolder(); }} placeholder="e.g. Fall semester" maxLength={50} /></label>
            <fieldset><legend>Add sets <small>optional</small></legend>{data.sets.map((set) => <label className="set-check" key={set.id}><span className="visually-hidden">Add set to folder</span><input aria-label={`Add ${set.title} to folder`} type="checkbox" checked={folderSetIds.includes(set.id)} onChange={() => setFolderSetIds((ids) => ids.includes(set.id) ? ids.filter((id) => id !== set.id) : [...ids, set.id])} /><span><strong>{set.title}</strong><small>{set.cards.length} terms</small></span></label>)}</fieldset>
            <p className="modal-privacy">⌁ This folder is saved only in this browser on this device.</p>
            <footer>{editingFolder && <button className="button danger" onClick={() => deleteFolder(editingFolder)}>Delete folder</button>}<button className="button quiet" onClick={closeFolderModal}>Cancel</button><button className="button primary" onClick={saveFolder}>{editingFolderId ? "Save changes" : "Create folder"}</button></footer>
          </div>
        </div>
      )}

      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </div>
  );
}
