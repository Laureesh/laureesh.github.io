
import "./Flashbolt.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { CSSProperties, ChangeEvent, DragEvent, KeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
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
  correctAnswers?: string[];
  questionType?: "flashcard" | "multiple-choice" | "true-false" | "select-all" | "written" | "matching";
  matchingPairs?: Array<{ id: string; left: string; right: string }>;
  termLanguage?: string;
  definitionLanguage?: string;
  highlight?: HighlightColor;
  imageData?: string;
  imageName?: string;
};

type CardQuestionType = NonNullable<Card["questionType"]>;

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
  kahootUrl?: string;
  updatedAt: string;
  cards: Card[];
};

type Folder = {
  id: string;
  name: string;
  setIds: string[];
  color?: string;
  semester?: string;
};

type AppData = {
  sets: StudySet[];
  folders: Folder[];
  mastered: Record<string, string[]>;
  sessions: number;
  lastCreatedFolderIds?: string[];
  recentSetValues?: Pick<StudySet, "title" | "subject" | "color" | "description"> & { folderIds: string[] };
  learnProgress?: Record<string, LearnSetProgress>;
  activeLearn?: LearnSessionSnapshot;
};

type View = "home" | "library" | "folders" | "create" | "set" | "learn" | "test" | "guide" | "helper";
type StorageStatus = "loading" | "saved" | "error";
type ThemeName = "dark" | "extreme" | "light" | "white" | "ocean" | "forest" | "sunset";
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
const FLASHBOLT_BASE = "/admin-dashboard/private-pages/flashbolt";
const LEGACY_STORAGE_KEY = "studydeck.local.v1";
const LIBRARY_SORT_KEY = `${STORAGE_KEY}.librarySort`;
const SIDEBAR_COLLAPSED_KEY = `${STORAGE_KEY}.sidebarCollapsed`;
const EDITOR_PANEL_COLLAPSED_KEY = `${STORAGE_KEY}.editorPanelCollapsed`;
const cloudMigrationKey = (uid: string) => `${STORAGE_KEY}.cloudMigrated.${uid}`;
const THEME_OPTIONS: Array<{ id: ThemeName; label: string; colors: [string, string] }> = [
  { id: "dark", label: "Dark", colors: ["#0c0c28", "#7b78ff"] },
  { id: "extreme", label: "Extreme dark", colors: ["#000000", "#8b82ff"] },
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
const FOLDER_COLORS = ["#7773ff", "#55c9f3", "#54d29a", "#f4c84a", "#ff8b9d", "#c98cff", "#ff9f5a", "#9ca8c7"];
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
    { id: "draft-1", term: "", definition: "", questionType: "multiple-choice", answerChoices: ["", "", "", ""] },
    { id: "draft-2", term: "", definition: "", questionType: "multiple-choice", answerChoices: ["", "", "", ""] },
  ],
};

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Math.random().toString(36).slice(2)}`;
}

function routeSlug(value: string) {
  return value.toLocaleLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "untitled";
}

function isSafeKahootUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "kahoot.it" || url.hostname.endsWith(".kahoot.it") || url.hostname === "kahoot.com" || url.hostname.endsWith(".kahoot.com"));
  } catch {
    return false;
  }
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
  const card = set.cards[cardIndex];
  const correct = card ? (correctAnswersForCard(card)[0] ?? cleanChoiceAnswer(card.definition)) : "";
  const suppliedChoices = [...new Set((card?.answerChoices ?? []).map((choice) => choice.trim()).filter(Boolean))];
  if (suppliedChoices.length >= 2) {
    return suppliedChoices.some((choice) => normalizeAnswer(choice) === normalizeAnswer(correct))
      ? suppliedChoices
      : [...suppliedChoices, correct];
  }
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

function testCorrectAnswer(card: Card) {
  return correctAnswersForCard(card)[0] ?? cleanChoiceAnswer(card.definition);
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
      return suppliedChoices.some((choice) => normalizeAnswer(choice) === normalizeAnswer(cleanChoiceAnswer(correct)))
        ? suppliedChoices
        : [...suppliedChoices, cleanChoiceAnswer(correct)];
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
  const validCards = Array.isArray(data.sets) && data.sets.every((set) => Boolean(set)
    && typeof set === "object"
    && typeof set.id === "string"
    && typeof set.title === "string"
    && typeof set.description === "string"
    && typeof set.subject === "string"
    && typeof set.color === "string"
    && typeof set.updatedAt === "string"
    && Array.isArray(set.cards)
    && set.cards.every((card) => Boolean(card)
      && typeof card === "object"
      && typeof card.id === "string"
      && typeof card.term === "string"
      && typeof card.definition === "string"));
  const validFolders = Array.isArray(data.folders) && data.folders.every((folder) => Boolean(folder)
    && typeof folder === "object"
    && typeof folder.id === "string"
    && typeof folder.name === "string"
    && Array.isArray(folder.setIds)
    && folder.setIds.every((setId) => typeof setId === "string"));
  const validMastery = Boolean(data.mastered) && typeof data.mastered === "object" && !Array.isArray(data.mastered)
    && Object.values(data.mastered ?? {}).every((cardIds) => Array.isArray(cardIds) && cardIds.every((cardId) => typeof cardId === "string"));
  return validCards && validFolders && validMastery;
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

function cardQuestionType(card: Card): CardQuestionType {
  return card.questionType ?? (card.answerChoices && card.answerChoices.length > 1 ? "multiple-choice" : "flashcard");
}

function cleanChoiceAnswer(value: string) {
  return value.replace(/^[A-Z][).:-]\s*/i, "").trim();
}

function correctAnswersForCard(card: Card) {
  return (card.correctAnswers?.length ? card.correctAnswers : [cleanChoiceAnswer(card.definition)]).filter((answer) => answer.trim());
}

function prepareDraftCard(card: Card): Card | null {
  const term = card.term.trim();
  const type = cardQuestionType(card);
  if (!term) return null;
  if (type === "matching") {
    const matchingPairs = (card.matchingPairs ?? [])
      .map((pair) => ({ ...pair, left: pair.left.trim(), right: pair.right.trim() }))
      .filter((pair) => pair.left || pair.right);
    if (matchingPairs.length < 2 || matchingPairs.some((pair) => !pair.left || !pair.right)) return null;
    return { ...card, term, matchingPairs, definition: matchingPairs.map((pair) => `${pair.left} → ${pair.right}`).join("; ") };
  }
  if (type === "multiple-choice" || type === "select-all" || type === "true-false") {
    const answerChoices = [...new Set((card.answerChoices ?? []).map((choice) => choice.trim()).filter(Boolean))];
    const selectedAnswers = correctAnswersForCard(card)
      .map((answer) => answerChoices.find((choice) => normalizeAnswer(cleanChoiceAnswer(choice)) === normalizeAnswer(cleanChoiceAnswer(answer))))
      .filter((answer): answer is string => Boolean(answer));
    if (answerChoices.length <= 1) {
      const definition = card.definition.trim() || answerChoices[0] || "";
      return definition ? { ...card, term, definition, questionType: "flashcard", answerChoices } : null;
    }
    if (!selectedAnswers.length) return null;
    const correctAnswers = type === "select-all" ? selectedAnswers : [selectedAnswers[0]];
    return { ...card, term, answerChoices, correctAnswers, definition: correctAnswers.join("; ") };
  }
  const definition = card.definition.trim();
  return definition ? { ...card, term, definition } : null;
}

function withDataDefaults(value: AppData): AppData {
  const normalizedSets = value.sets.map((set) => ({
    ...set,
    cards: set.cards.map(withDetectedAnswerChoices),
  }));
  const setIds = new Set(normalizedSets.map((set) => set.id));
  const cardIdsBySet = new Map(normalizedSets.map((set) => [set.id, new Set(set.cards.map((card) => card.id))]));
  return {
    ...value,
    sets: normalizedSets,
    folders: value.folders.map((folder) => ({
      ...folder,
      setIds: [...new Set(folder.setIds)].filter((setId) => setIds.has(setId)),
    })),
    mastered: Object.fromEntries(Object.entries(value.mastered ?? {})
      .filter(([setId]) => setIds.has(setId))
      .map(([setId, cardIds]) => [setId, [...new Set(cardIds)].filter((cardId) => cardIdsBySet.get(setId)?.has(cardId))])),
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

function removeSetFromLibraryData(data: AppData, setId: string): AppData {
  const mastered = { ...data.mastered };
  const learnProgress = { ...(data.learnProgress ?? {}) };
  delete mastered[setId];
  delete learnProgress[setId];
  return {
    ...data,
    sets: data.sets.filter((item) => item.id !== setId),
    folders: data.folders.map((folder) => ({ ...folder, setIds: folder.setIds.filter((id) => id !== setId) })),
    mastered,
    learnProgress,
    activeLearn: data.activeLearn?.setId === setId ? undefined : data.activeLearn,
  };
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

  useEffect(() => {
    const textarea = textareaRef.current;
    const container = textarea?.parentElement;
    if (!textarea || !container) return;
    const resize = () => {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
    observer?.observe(container);
    window.addEventListener("resize", resize);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

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

function PreviousValueSelect({ label, values, onSelect }: { label: string; values: string[]; onSelect: (value: string) => void }) {
  if (!values.length) return null;
  return (
    <details className="previous-value-menu">
      <summary aria-label={`Choose a previous ${label}`}>Previous {label}…</summary>
      <div>{values.map((value) => <button type="button" key={value} onClick={(event) => { onSelect(value); event.currentTarget.closest("details")?.removeAttribute("open"); }}>{value}</button>)}</div>
    </details>
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
  const location = useLocation();
  const routerNavigate = useNavigate();
  const userId = user?.uid;
  const [data, setData] = useState<AppData>(initialData);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("home");
  const [selectedSetId, setSelectedSetId] = useState(initialData.sets[0].id);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [librarySort, setLibrarySort] = useState<LibrarySort>("updated-desc");
  const [search, setSearch] = useState("");
  const [termSearch, setTermSearch] = useState("");
  const [helperFolderId, setHelperFolderId] = useState("all");
  const [helperSetId, setHelperSetId] = useState(initialData.sets[0].id);
  const [helperSearch, setHelperSearch] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true"; } catch { return false; }
  });
  const [collapsedEditorSections, setCollapsedEditorSections] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(EDITOR_PANEL_COLLAPSED_KEY) ?? "[]");
      return Array.isArray(saved) ? saved.filter((item): item is string => typeof item === "string") : [];
    } catch { return []; }
  });
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderColor, setFolderColor] = useState(FOLDER_COLORS[0]);
  const [folderSemester, setFolderSemester] = useState("");
  const [folderSetIds, setFolderSetIds] = useState<string[]>([]);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [tileFolderPickerId, setTileFolderPickerId] = useState<string | null>(null);
  const [tileFolderSearch, setTileFolderSearch] = useState("");
  const [setContextMenu, setSetContextMenu] = useState<{ setId: string; x: number; y: number } | null>(null);
  const [draft, setDraft] = useState<StudySet>(blankDraft);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [draftFolderIds, setDraftFolderIds] = useState<string[]>([]);
  const [createOriginFolderId, setCreateOriginFolderId] = useState<string | null>(null);
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
  const [resolvedRoutePath, setResolvedRoutePath] = useState("");
  const [syncError, setSyncError] = useState("");
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [dictationTarget, setDictationTarget] = useState<{ cardId: string; field: "term" | "definition" } | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const handledRouteRef = useRef("");

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
        setToast(`${message}. Flashbolt is temporarily using this device's local backup.`);
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
    if (!ready || handledRouteRef.current === location.pathname) return;
    if (location.pathname === "/flashbolt" || location.pathname.startsWith("/flashbolt/")) {
      routerNavigate(`${FLASHBOLT_BASE}${location.pathname.slice("/flashbolt".length)}`, { replace: true });
      return;
    }
    const parts = location.pathname.split("/").filter(Boolean);
    const flashboltIndex = parts.indexOf("flashbolt");
    const routeParts = flashboltIndex >= 0 ? parts.slice(flashboltIndex + 1) : [];
    if (routeParts.length === 0) {
      handledRouteRef.current = location.pathname;
      setView("home");
      setResolvedRoutePath(location.pathname);
      return;
    }
    if (routeParts.length === 1 && ["home", "library", "folders", "create", "guide", "helper"].includes(routeParts[0])) {
      handledRouteRef.current = location.pathname;
      setView(routeParts[0] as View);
      setResolvedRoutePath(location.pathname);
      return;
    }
    if (routeParts.length === 2) {
      const [semesterSlug, folderSlug] = routeParts;
      const routeFolder = data.folders.find((item) => routeSlug(item.semester || "no-semester") === semesterSlug && folderRouteSegment(item) === folderSlug);
      if (!routeFolder) {
        handledRouteRef.current = location.pathname;
        setSelectedFolderId(null);
        setView("folders");
        setResolvedRoutePath(location.pathname);
        return;
      }
      handledRouteRef.current = location.pathname;
      setSelectedFolderId(routeFolder.id);
      setView("library");
      setResolvedRoutePath(location.pathname);
      return;
    }
    if (routeParts.length === 3 && routeParts[2] === "create") {
      const [semesterSlug, folderSlug] = routeParts;
      const routeFolder = data.folders.find((item) => routeSlug(item.semester || "no-semester") === semesterSlug && folderRouteSegment(item) === folderSlug);
      if (!routeFolder) {
        handledRouteRef.current = location.pathname;
        setView("folders");
        setResolvedRoutePath(location.pathname);
        return;
      }
      handledRouteRef.current = location.pathname;
      startCreate(routeFolder.id);
      setResolvedRoutePath(location.pathname);
      return;
    }
    if (routeParts.length < 4) {
      handledRouteRef.current = location.pathname;
      setView("library");
      setResolvedRoutePath(location.pathname);
      return;
    }
    const [semesterSlug, folderSlug, setSlug, mode] = routeParts;
    const isUnfiledRoute = semesterSlug === "no-semester" && folderSlug === "unfiled";
    const routeFolder = data.folders.find((item) => routeSlug(item.semester || "no-semester") === semesterSlug && folderRouteSegment(item) === folderSlug);
    if (!routeFolder && !isUnfiledRoute) {
      handledRouteRef.current = location.pathname;
      setView("library");
      setResolvedRoutePath(location.pathname);
      return;
    }
    const routeSet = data.sets.find((item) => setRouteSegment(item, routeFolder) === setSlug && (routeFolder
      ? routeFolder.setIds.includes(item.id)
      : !data.folders.some((folderItem) => folderItem.setIds.includes(item.id))));
    if (!routeSet || !["flashcards", "learn", "test", "edit"].includes(mode)) {
      handledRouteRef.current = location.pathname;
      setView(routeFolder ? "library" : "folders");
      setResolvedRoutePath(location.pathname);
      return;
    }
    handledRouteRef.current = location.pathname;
    setSelectedSetId(routeSet.id);
    setSelectedFolderId(routeFolder?.id ?? null);
    if (mode === "edit") startEdit(routeSet);
    else if (mode === "learn") startLearn(routeSet.id);
    else if (mode === "test") startTest(routeSet.id);
    else openSet(routeSet.id);
    setResolvedRoutePath(location.pathname);
  // Route handlers are intentionally re-run only when the route or persisted library changes.
  // Adding the inline navigation helpers would retrigger this effect on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.folders, data.sets, location.pathname, ready]);

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

  useEffect(() => {
    if (!setContextMenu) return;
    const close = () => setSetContextMenu(null);
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [setContextMenu]);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const selectedSet = data.sets.find((set) => set.id === selectedSetId) ?? data.sets[0];
  const helperAvailableSets = helperFolderId === "all"
    ? data.sets
    : data.sets.filter((set) => data.folders.find((folderItem) => folderItem.id === helperFolderId)?.setIds.includes(set.id));
  const helperSet = helperAvailableSets.find((set) => set.id === helperSetId) ?? helperAvailableSets[0];
  const helperCards = (helperSet?.cards ?? []).filter((card) => {
    const query = helperSearch.trim().toLocaleLowerCase();
    if (!query) return true;
    const embedded = parseEmbeddedQuestion(card.term, card.definition);
    return [embedded.prompt, card.term, card.definition, ...(card.answerChoices ?? embedded.choices), ...(card.correctAnswers ?? [])]
      .some((value) => value.toLocaleLowerCase().includes(query));
  });
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
  const editorFolder = editingSetId
    ? data.folders.find((folderItem) => folderItem.id === selectedFolderId && folderItem.setIds.includes(editingSetId))
      ?? data.folders.find((folderItem) => folderItem.setIds.includes(editingSetId))
    : undefined;
  const editingFolder = data.folders.find((item) => item.id === editingFolderId);
  const recentSourceSet = data.sets[0];
  const recentSetValues = data.recentSetValues ?? (recentSourceSet ? {
    title: recentSourceSet.title,
    subject: recentSourceSet.subject,
    color: recentSourceSet.color,
    description: recentSourceSet.description,
    folderIds: data.folders.filter((folderItem) => folderItem.setIds.includes(recentSourceSet.id)).map((folderItem) => folderItem.id),
  } : undefined);
  const recentFolderNames = recentSetValues?.folderIds
    .map((folderId) => data.folders.find((folderItem) => folderItem.id === folderId)?.name)
    .filter((name): name is string => Boolean(name)) ?? [];
  const previousTitles = [...new Set(data.sets.map((set) => set.title.trim()).filter(Boolean))];
  const previousSubjects = [...new Set(data.sets.map((set) => set.subject.trim()).filter(Boolean))];
  const previousDescriptions = [...new Set(data.sets.map((set) => set.description.trim()).filter(Boolean))];
  const previousFolderSelections = [...new Map(data.sets.map((set) => {
    const folderIds = data.folders.filter((folderItem) => folderItem.setIds.includes(set.id)).map((folderItem) => folderItem.id).sort();
    const label = folderIds.map((folderId) => data.folders.find((folderItem) => folderItem.id === folderId)?.name).filter(Boolean).join(" + ");
    return [folderIds.join("|"), { folderIds, label }] as const;
  }).filter(([key]) => key)).values()];
  const completeDraftCards = draft.cards.filter((card) => card.term.trim() && (cardQuestionType(card) === "matching"
    ? Boolean(card.matchingPairs?.length && card.matchingPairs.every((pair) => pair.left.trim() && pair.right.trim()))
    : Boolean(card.definition.trim())));
  const answerChoicesReady = draft.cards.every((card) => {
    const type = cardQuestionType(card);
    if (type === "matching") return Boolean(card.matchingPairs?.length && card.matchingPairs.every((pair) => pair.left.trim() && pair.right.trim()));
    if (type !== "multiple-choice" && type !== "select-all" && type !== "true-false") return true;
    if (!card.answerChoices?.length) return false;
    const correctAnswers = correctAnswersForCard(card).map((answer) => normalizeAnswer(cleanChoiceAnswer(answer)));
    return card.answerChoices.length >= 2
      && card.answerChoices.every((choice) => choice.trim())
      && correctAnswers.length > 0
      && correctAnswers.every((answer) => card.answerChoices?.some((choice) => normalizeAnswer(cleanChoiceAnswer(choice)) === answer));
  });
  const draftChecklist = [
    { label: "Add a set title", detail: "Required", complete: Boolean(draft.title.trim()) },
    { label: "Choose a subject", detail: "Recommended", complete: Boolean(draft.subject.trim()) },
    { label: "Describe what this set covers", detail: "Recommended", complete: Boolean(draft.description.trim()) },
    { label: "Assign at least one folder", detail: "Optional", complete: draftFolderIds.length > 0 },
    { label: "Complete at least two cards", detail: `${completeDraftCards.length} ready`, complete: completeDraftCards.length >= 2 },
    { label: "Finish every card row", detail: `${draft.cards.length - completeDraftCards.length} incomplete`, complete: draft.cards.length >= 2 && completeDraftCards.length === draft.cards.length },
    { label: "Verify multiple-choice answers", detail: "When included", complete: answerChoicesReady },
  ];
  const draftCompletion = Math.round((draftChecklist.filter((item) => item.complete).length / draftChecklist.length) * 100);
  const masteredCount = Object.values(data.mastered).reduce((total, cards) => total + cards.length, 0);
  const cardCount = data.sets.reduce((total, set) => total + set.cards.length, 0);
  const foldersBySetCount = useMemo(() => [...data.folders].sort((a, b) => {
    const aHasCustomColor = Boolean(a.color && a.color !== FOLDER_COLORS[0]);
    const bHasCustomColor = Boolean(b.color && b.color !== FOLDER_COLORS[0]);
    return Number(bHasCustomColor) - Number(aHasCustomColor)
      || b.setIds.length - a.setIds.length
      || LIBRARY_COLLATOR.compare(a.name, b.name);
  }), [data.folders]);
  const folderSemesterGroups = useMemo(() => {
    const groups = new Map<string, Folder[]>();
    foldersBySetCount.forEach((item) => {
      const label = item.semester || "No semester";
      groups.set(label, [...(groups.get(label) ?? []), item]);
    });
    const semesterRank = (label: string) => {
      const match = /^(Spring|Summer|Fall) (\d{4})$/.exec(label);
      if (!match) return -1;
      const termRank = { Spring: 1, Summer: 2, Fall: 3 }[match[1] as "Spring" | "Summer" | "Fall"];
      return Number(match[2]) * 10 + termRank;
    };
    return [...groups.entries()]
      .sort(([a], [b]) => semesterRank(b) - semesterRank(a))
      .map(([semester, folders]) => ({ semester, folders }));
  }, [foldersBySetCount]);
  const draftFolderOptions = useMemo(() => [...data.folders].sort((a, b) =>
    b.setIds.length - a.setIds.length || LIBRARY_COLLATOR.compare(a.name, b.name),
  ), [data.folders]);
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
  const editorFolderSets = editorFolder
    ? filteredSets.filter((set) => editorFolder.setIds.includes(set.id))
    : [];
  const editorSetIndex = editorFolderSets.findIndex((set) => set.id === editingSetId);
  const previousEditorSet = editorSetIndex > 0 ? editorFolderSets[editorSetIndex - 1] : undefined;
  const nextEditorSet = editorSetIndex >= 0 && editorSetIndex < editorFolderSets.length - 1 ? editorFolderSets[editorSetIndex + 1] : undefined;
  const folderSubjectGroups = useMemo(() => {
    const groups = new Map<string, { subject: string; sets: StudySet[] }>();
    filteredSets.forEach((set) => {
      const subject = set.subject.trim() || "General";
      const key = subject.toLocaleLowerCase();
      const existing = groups.get(key);
      if (existing) existing.sets.push(set);
      else groups.set(key, { subject, sets: [set] });
    });
    return [...groups.values()].sort((a, b) => LIBRARY_COLLATOR.compare(a.subject, b.subject));
  }, [filteredSets]);

  const testCards = selectedSet?.cards.slice(0, 8) ?? [];
  const testScore = testCards.filter((card) => normalizeAnswer(testAnswers[card.id] ?? "") === normalizeAnswer(testCorrectAnswer(card))).length;
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
    if (view !== "learn" || learnPhase !== "session" || !learnAnswer || learnOptionsOpen) return;
    const retypeRequired = !learnLastCorrect && learnOptions.retypeCorrectAnswers;
    const canContinue = !retypeRequired || normalizeAnswer(learnRetypeAnswer) === normalizeAnswer(currentLearnCorrectAnswer);
    if (!canContinue) return;
    const continueOnKey = (event: globalThis.KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable)) return;
      event.preventDefault();
      nextLearnQuestion();
    };
    window.addEventListener("keydown", continueOnKey);
    return () => window.removeEventListener("keydown", continueOnKey);
    // nextLearnQuestion is intentionally omitted because it is recreated with the current session state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLearnCorrectAnswer, learnAnswer, learnLastCorrect, learnOptions.retypeCorrectAnswers, learnOptionsOpen, learnPhase, learnRetypeAnswer, view]);

  useEffect(() => {
    if (view !== "learn" || learnPhase !== "session" || !learnOptions.textToSpeech || !currentLearnPrompt) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(currentLearnPrompt));
    return () => window.speechSynthesis.cancel();
  }, [currentLearnPrompt, learnOptions.textToSpeech, learnPhase, view]);

  function notify(message: string) {
    setToast(message);
  }

  function acceptPreviousValueOnTab(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, values: string[], apply: (value: string) => void) {
    if (event.key !== "Tab" || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
    const current = event.currentTarget.value.trim().toLocaleLowerCase();
    const match = values.find((value) => value.toLocaleLowerCase().startsWith(current) && value.toLocaleLowerCase() !== current);
    if (!match) return;
    event.preventDefault();
    apply(match);
  }

  function setRoutePath(nextView: View, setId = selectedSetId) {
    if (!["set", "learn", "test", "create"].includes(nextView) || (nextView === "create" && !setId)) {
      const path = nextView === "home" ? FLASHBOLT_BASE : `${FLASHBOLT_BASE}/${nextView}`;
      handledRouteRef.current = path;
      setResolvedRoutePath(path);
      routerNavigate(path);
      return;
    }
    const routeSet = data.sets.find((item) => item.id === setId);
    if (!routeSet) return;
    const routeFolder = data.folders.find((item) => item.id === selectedFolderId && item.setIds.includes(routeSet.id))
      ?? data.folders.find((item) => item.setIds.includes(routeSet.id));
    const mode = nextView === "set" ? "flashcards" : nextView === "create" ? "edit" : nextView;
    const path = `${FLASHBOLT_BASE}/${routeSlug(routeFolder?.semester || "no-semester")}/${routeFolder ? folderRouteSegment(routeFolder) : "unfiled"}/${setRouteSegment(routeSet, routeFolder)}/${mode}`;
    handledRouteRef.current = path;
    setResolvedRoutePath(path);
    routerNavigate(path);
  }

  function navigate(nextView: View, setId = selectedSetId) {
    setView(nextView);
    setNewMenuOpen(false);
    setRoutePath(nextView, setId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openFolder(folderItem: Folder) {
    const path = `${FLASHBOLT_BASE}/${routeSlug(folderItem.semester || "no-semester")}/${folderRouteSegment(folderItem)}`;
    setSelectedFolderId(folderItem.id);
    setView("library");
    setNewMenuOpen(false);
    handledRouteRef.current = path;
    setResolvedRoutePath(path);
    routerNavigate(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function folderRouteSegment(folderItem: Folder) {
    const base = routeSlug(folderItem.name);
    const collision = data.folders.some((item) => item.id !== folderItem.id
      && (item.semester ?? "") === (folderItem.semester ?? "")
      && routeSlug(item.name) === base);
    return collision ? `${base}--${routeSlug(folderItem.id).slice(-8)}` : base;
  }

  function setRouteSegment(setItem: StudySet, folderItem?: Folder) {
    const base = routeSlug(setItem.title);
    const scopedSets = folderItem
      ? data.sets.filter((item) => folderItem.setIds.includes(item.id))
      : data.sets.filter((item) => !data.folders.some((folder) => folder.setIds.includes(item.id)));
    const collision = scopedSets.some((item) => item.id !== setItem.id && routeSlug(item.title) === base);
    return collision ? `${base}--${routeSlug(setItem.id).slice(-8)}` : base;
  }

  function toggleSidebar() {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      try { window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next)); } catch { /* Keep the in-memory preference. */ }
      return next;
    });
  }

  function toggleEditorSection(section: string) {
    setCollapsedEditorSections((collapsed) => {
      const next = collapsed.includes(section) ? collapsed.filter((item) => item !== section) : [...collapsed, section];
      try { window.localStorage.setItem(EDITOR_PANEL_COLLAPSED_KEY, JSON.stringify(next)); } catch { /* Keep the in-memory preference. */ }
      return next;
    });
  }

  function openSet(setId: string) {
    setSelectedSetId(setId);
    setTermSearch("");
    setFlashIndex(0);
    setFlipped(false);
    navigate("set", setId);
  }

  function startCreate(folderIdOrEvent?: string | ReactMouseEvent) {
    const originFolderId = typeof folderIdOrEvent === "string" ? folderIdOrEvent : selectedFolderId;
    setEditingSetId(null);
    setCreateOriginFolderId(originFolderId);
    setDraftFolderSearch("");
    setDraftFolderIds(originFolderId
      ? [originFolderId]
      : []);
    setDraft({
      ...blankDraft,
      cards: [
        { id: makeId("card"), term: "", definition: "", questionType: "multiple-choice", answerChoices: ["", "", "", ""] },
        { id: makeId("card"), term: "", definition: "", questionType: "multiple-choice", answerChoices: ["", "", "", ""] },
      ],
    });
    setPasteImport("");
    setQuizletUrl("");
    setQuizletImportMessage("");
    setQuizletImportFailed(false);
    setKahootReference("");
    setKahootImportMessage("");
    setKahootImportFailed(false);
    if (originFolderId) {
      const originFolder = data.folders.find((folderItem) => folderItem.id === originFolderId);
      if (originFolder) {
        const path = `${FLASHBOLT_BASE}/${routeSlug(originFolder.semester || "no-semester")}/${folderRouteSegment(originFolder)}/create`;
        setView("create");
        setNewMenuOpen(false);
        handledRouteRef.current = path;
        setResolvedRoutePath(path);
        routerNavigate(path);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }
    navigate("create", "");
  }

  function startQuizletLinkImport() {
    startCreate();
    setQuizletImportMessage("Paste a public Quizlet set link to begin.");
  }

  function startKahootLinkImport() {
    startCreate();
    setKahootImportMessage("Paste a public Kahoot details link or quiz ID to begin.");
  }

  function openKahootHelper() {
    const selectedSetFolder = data.folders.find((folderItem) => folderItem.id === selectedFolderId && folderItem.setIds.includes(selectedSet?.id ?? ""))
      ?? data.folders.find((folderItem) => folderItem.setIds.includes(selectedSet?.id ?? ""));
    setHelperFolderId(selectedSetFolder?.id ?? "all");
    if (selectedSet) setHelperSetId(selectedSet.id);
    setHelperSearch("");
    navigate("helper");
  }

  function startEdit(set: StudySet) {
    setSelectedSetId(set.id);
    setEditingSetId(set.id);
    setCreateOriginFolderId(null);
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
    navigate("create", set.id);
  }

  function openAdjacentEditor(set: StudySet) {
    const storedSet = data.sets.find((item) => item.id === editingSetId);
    const storedFolderIds = data.folders.filter((folderItem) => folderItem.setIds.includes(editingSetId ?? "")).map((folderItem) => folderItem.id).sort();
    const hasUnsavedChanges = Boolean(storedSet) && (JSON.stringify(draft) !== JSON.stringify(storedSet)
      || JSON.stringify([...draftFolderIds].sort()) !== JSON.stringify(storedFolderIds));
    if (hasUnsavedChanges && !window.confirm("Discard your unsaved changes and open the next set?")) return;
    startEdit(set);
  }

  function saveDraft(studyAfter = false) {
    const startedCards = draft.cards.filter((card) => card.term.trim()
      || card.definition.trim()
      || card.answerChoices?.some((choice) => choice.trim())
      || card.matchingPairs?.some((pair) => pair.left.trim() || pair.right.trim()));
    const cleanCards = startedCards.map(prepareDraftCard).filter((card): card is Card => Boolean(card));
    if (!draft.title.trim() || cleanCards.length === 0) {
      notify("Add a title and at least one complete card.");
      return;
    }
    if (cleanCards.length !== startedCards.length) {
      notify("Finish every started card and mark the correct answer before saving.");
      return;
    }
    const kahootUrl = draft.kahootUrl?.trim() ?? "";
    if (kahootUrl && !isSafeKahootUrl(kahootUrl)) {
      notify("Enter a valid secure Kahoot link, such as https://create.kahoot.it/details/…");
      return;
    }

    const savedSet: StudySet = {
      ...draft,
      id: editingSetId ?? makeId("set"),
      title: draft.title.trim(),
      description: draft.description.trim(),
      subject: draft.subject.trim() || "General",
      kahootUrl: kahootUrl || undefined,
      updatedAt: new Date().toISOString(),
      cards: cleanCards.map(withDetectedAnswerChoices),
    };

    const nextData: AppData = {
      ...data,
      lastCreatedFolderIds: editingSetId ? data.lastCreatedFolderIds : [...draftFolderIds],
      recentSetValues: editingSetId ? data.recentSetValues : {
        title: savedSet.title,
        subject: savedSet.subject,
        color: savedSet.color,
        description: savedSet.description,
        folderIds: [...draftFolderIds],
      },
      sets: editingSetId
        ? data.sets.map((set) => (set.id === editingSetId ? savedSet : set))
        : [savedSet, ...data.sets],
      folders: data.folders.map((folderItem) => {
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
    };
    setData(nextData);
    let immediateBackupFailed = false;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
    } catch {
      immediateBackupFailed = true;
    }
    setSelectedSetId(savedSet.id);
    notify(immediateBackupFailed
      ? "Set saved in this session, but the local backup was blocked. Keep this page open until account sync finishes."
      : editingSetId
      ? "Set and folder assignments updated."
      : draftFolderIds.length
        ? `Set created, added to ${draftFolderIds.length === 1 ? "a folder" : `${draftFolderIds.length} folders`}, and queued for account sync.`
        : "Set created and queued for account sync.");
    const originFolder = createOriginFolderId && draftFolderIds.includes(createOriginFolderId)
      ? data.folders.find((folderItem) => folderItem.id === createOriginFolderId)
      : undefined;
    if (studyAfter) openSet(savedSet.id);
    else {
      setEditingSetId(savedSet.id);
      setDraft(savedSet);
      setCreateOriginFolderId(null);
      if (!editingSetId) {
        const routeFolder = originFolder
          ?? nextData.folders.find((folderItem) => draftFolderIds.includes(folderItem.id));
        const path = `${FLASHBOLT_BASE}/${routeSlug(routeFolder?.semester || "no-semester")}/${routeFolder ? folderRouteSegment(routeFolder) : "unfiled"}/${setRouteSegment(savedSet, routeFolder)}/edit`;
        handledRouteRef.current = path;
        setResolvedRoutePath(path);
        routerNavigate(path, { replace: true });
      }
    }
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

  function setDraftCardQuestionType(card: Card, questionType: CardQuestionType) {
    const updates: Partial<Card> = { questionType };
    if ((questionType === "multiple-choice" || questionType === "select-all") && (!card.answerChoices || card.answerChoices.length < 2)) {
      updates.answerChoices = ["", "", "", ""];
    }
    if (questionType === "true-false") {
      updates.answerChoices = ["True", "False"];
      updates.correctAnswers = /false/i.test(card.definition) ? ["False"] : ["True"];
      updates.definition = updates.correctAnswers[0];
    }
    if (questionType === "matching" && (!card.matchingPairs || card.matchingPairs.length < 2)) {
      updates.matchingPairs = Array.from({ length: 4 }, () => ({ id: makeId("pair"), left: "", right: "" }));
    }
    updateDraftCardExtras(card.id, updates);
  }

  function updateDraftChoice(card: Card, choiceIndex: number, value: string) {
    const oldChoice = card.answerChoices?.[choiceIndex] ?? "";
    const choices = (card.answerChoices ?? []).map((choice, index) => index === choiceIndex ? value : choice);
    const correctAnswers = correctAnswersForCard(card).map((answer) => normalizeAnswer(answer) === normalizeAnswer(oldChoice) ? value : answer);
    const updates: Partial<Card> = { answerChoices: choices, correctAnswers };
    if (cardQuestionType(card) !== "select-all" && correctAnswers.some((answer) => normalizeAnswer(answer) === normalizeAnswer(value))) updates.definition = value;
    updateDraftCardExtras(card.id, updates);
  }

  function toggleDraftCorrectAnswer(card: Card, choice: string) {
    if (!choice.trim()) return;
    if (cardQuestionType(card) === "select-all") {
      const current = correctAnswersForCard(card);
      const selected = current.some((answer) => normalizeAnswer(answer) === normalizeAnswer(choice));
      const next = selected ? current.filter((answer) => normalizeAnswer(answer) !== normalizeAnswer(choice)) : [...current, choice];
      updateDraftCardExtras(card.id, { correctAnswers: next, definition: next.join("; ") });
    } else {
      updateDraftCardExtras(card.id, { correctAnswers: [choice], definition: choice });
    }
  }

  function addDraftCard(afterCardId?: string) {
    const card: Card = { id: makeId("card"), term: "", definition: "", questionType: "multiple-choice", answerChoices: ["", "", "", ""] };
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
      notify("Image attached and queued for account sync.");
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
    setFolderColor(FOLDER_COLORS[0]);
    setFolderSemester("");
    setFolderSetIds([]);
    setFolderModalOpen(true);
  }

  function openNewFolderModalForSet(setId: string) {
    setTileFolderPickerId(null);
    setEditingFolderId(null);
    setFolderName("");
    setFolderColor(FOLDER_COLORS[0]);
    setFolderSemester("");
    setFolderSetIds([setId]);
    setFolderModalOpen(true);
  }

  function editFolder(folderToEdit: Folder) {
    setEditingFolderId(folderToEdit.id);
    setFolderName(folderToEdit.name);
    setFolderColor(folderToEdit.color ?? FOLDER_COLORS[0]);
    setFolderSemester(folderToEdit.semester ?? "");
    setFolderSetIds([...folderToEdit.setIds]);
    setFolderModalOpen(true);
  }

  function closeFolderModal() {
    setFolderModalOpen(false);
    setEditingFolderId(null);
    setFolderName("");
    setFolderSemester("");
    setFolderSetIds([]);
  }

  function saveFolder() {
    if (!folderName.trim()) {
      notify("Give your folder a name first.");
      return;
    }
    const semester = folderSemester.trim();
    const semesterMatch = /^(Spring|Summer|Fall) (\d{4})$/.exec(semester);
    if (semester && (!semesterMatch || Number(semesterMatch[2]) < 2020 || Number(semesterMatch[2]) > 2027)) {
      notify("Choose Spring, Summer, or Fall for a year from 2020 through 2027.");
      return;
    }
    const duplicateFolder = data.folders.some((item) => item.id !== editingFolderId
      && item.name.trim().toLocaleLowerCase() === folderName.trim().toLocaleLowerCase()
      && (item.semester ?? "") === semester);
    if (duplicateFolder) {
      notify(`A folder named “${folderName.trim()}” already exists${semester ? ` in ${semester}` : " without a semester"}.`);
      return;
    }

    if (editingFolderId) {
      setData((current) => ({
        ...current,
        folders: current.folders.map((item) => item.id === editingFolderId
          ? { ...item, name: folderName.trim(), color: folderColor, semester: semester || undefined, setIds: folderSetIds }
          : item),
      }));
      closeFolderModal();
      notify("Folder updated.");
      return;
    }

    const newFolder: Folder = { id: makeId("folder"), name: folderName.trim(), color: folderColor, semester: semester || undefined, setIds: folderSetIds };
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

  function startLearn(setIdOrEvent?: string | ReactMouseEvent) {
    const setId = typeof setIdOrEvent === "string" ? setIdOrEvent : selectedSetId;
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
    navigate("learn", setId);
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

  function startTest(setIdOrEvent?: string | ReactMouseEvent) {
    const setId = typeof setIdOrEvent === "string" ? setIdOrEvent : selectedSetId;
    setTestAnswers({});
    setTestSubmitted(false);
    navigate("test", setId);
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
    setData((current) => removeSetFromLibraryData(current, selectedSet.id));
    setSelectedSetId(data.sets.find((set) => set.id !== selectedSet.id)?.id ?? "");
    notify("Set deleted.");
    navigate("library");
  }

  function openSetContextMenu(event: ReactMouseEvent, setId: string) {
    event.preventDefault();
    setTileFolderPickerId(null);
    setSetContextMenu({
      setId,
      x: Math.max(10, Math.min(event.clientX, window.innerWidth - 270)),
      y: Math.max(10, Math.min(event.clientY, window.innerHeight - 390)),
    });
  }

  function setModeUrl(set: StudySet, mode: "flashcards" | "learn" | "test" | "edit") {
    const setFolder = data.folders.find((item) => item.id === selectedFolderId && item.setIds.includes(set.id))
      ?? data.folders.find((item) => item.setIds.includes(set.id));
    const path = `${FLASHBOLT_BASE}/${routeSlug(setFolder?.semester || "no-semester")}/${setFolder ? folderRouteSegment(setFolder) : "unfiled"}/${setRouteSegment(set, setFolder)}/${mode}`;
    return `${window.location.origin}${path}`;
  }

  async function copySetModeLink(set: StudySet, mode: "flashcards" | "learn" | "test" | "edit") {
    try {
      await navigator.clipboard.writeText(setModeUrl(set, mode));
      notify(`${mode === "flashcards" ? "Flashcards" : mode[0].toUpperCase() + mode.slice(1)} link copied.`);
    } catch {
      notify("The link could not be copied. Open the mode and copy it from the address bar.");
    }
    setSetContextMenu(null);
  }

  function duplicateSet(setToDuplicate: StudySet) {
    const duplicateId = makeId("set");
    const duplicate: StudySet = {
      ...setToDuplicate,
      id: duplicateId,
      title: `${setToDuplicate.title} copy`,
      updatedAt: new Date().toISOString(),
      cards: setToDuplicate.cards.map((card) => ({ ...card, id: makeId("card") })),
    };
    setData((current) => ({
      ...current,
      sets: [duplicate, ...current.sets],
      folders: current.folders.map((folderItem) => folderItem.setIds.includes(setToDuplicate.id)
        ? { ...folderItem, setIds: [...folderItem.setIds, duplicateId] }
        : folderItem),
    }));
    setSelectedSetId(duplicateId);
    notify("Set duplicated.");
  }

  function deleteSetFromLibrary(setToDelete: StudySet) {
    if (!window.confirm(`Delete “${setToDelete.title}”? This cannot be undone.`)) return;
    setData((current) => removeSetFromLibraryData(current, setToDelete.id));
    if (selectedSetId === setToDelete.id) setSelectedSetId(data.sets.find((item) => item.id !== setToDelete.id)?.id ?? "");
    notify("Set deleted.");
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
            <article className={`set-tile ${progress === 100 ? "completed" : ""}`} key={set.id} onContextMenu={(event) => openSetContextMenu(event, set.id)}>
              <button className="set-tile-open" onClick={() => openSet(set.id)} aria-label={`Open ${set.title}`}><span className="visually-hidden">Open {set.title}</span></button>
              <span className={`set-accent ${set.color}`} />
              <span className="tile-kicker"><span>{set.subject || "General"}</span><span>{formatDate(set.updatedAt)}</span></span>
              <strong className="set-tile-title">{set.title}</strong>
              <span className="tile-description">{set.description || "Your private flashcard set."}</span>
              {set.kahootUrl && isSafeKahootUrl(set.kahootUrl) && <a className="tile-kahoot-link" href={set.kahootUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} aria-label={`Open Kahoot for ${set.title}`}>◆ Open Kahoot <span>↗</span></a>}
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
  const visibleSetCards = selectedSet?.cards.filter((card) => {
    const query = termSearch.trim().toLocaleLowerCase();
    if (!query) return true;
    return [card.term, card.definition, ...(card.answerChoices ?? []), ...(card.correctAnswers ?? [])].some((value) => value.toLocaleLowerCase().includes(query));
  }) ?? [];

  if (!ready || resolvedRoutePath !== location.pathname) {
    return <div className={`flashbolt-route-loading theme-${theme}`} role="status" aria-live="polite"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><strong>Opening Flashbolt…</strong></div>;
  }

  return (
    <div className={`app-shell theme-${theme} ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      {setContextMenu && (() => {
        const contextSet = data.sets.find((item) => item.id === setContextMenu.setId);
        if (!contextSet) return null;
        return (
          <div className="set-context-menu" role="menu" aria-label={`Actions for ${contextSet.title}`} style={{ left: setContextMenu.x, top: setContextMenu.y }} onPointerDown={(event) => event.stopPropagation()}>
            <strong>{contextSet.title}</strong>
            <button role="menuitem" onClick={() => { setSetContextMenu(null); openSet(contextSet.id); }}><span>▣</span>View set</button>
            <button role="menuitem" onClick={() => { setSetContextMenu(null); startEdit(contextSet); }}><span>✎</span>Edit set</button>
            <button role="menuitem" onClick={() => { setSetContextMenu(null); duplicateSet(contextSet); }}><span>⧉</span>Duplicate</button>
            <i />
            <button role="menuitem" onClick={() => void copySetModeLink(contextSet, "flashcards")}><span>↗</span>Copy flashcards link</button>
            <button role="menuitem" onClick={() => void copySetModeLink(contextSet, "learn")}><span>↗</span>Copy learn link</button>
            <button role="menuitem" onClick={() => void copySetModeLink(contextSet, "test")}><span>↗</span>Copy test link</button>
            <button role="menuitem" onClick={() => void copySetModeLink(contextSet, "edit")}><span>↗</span>Copy edit link</button>
            <i />
            <button role="menuitem" className="danger" onClick={() => { setSetContextMenu(null); deleteSetFromLibrary(contextSet); }}><span>×</span>Delete set</button>
          </div>
        );
      })()}
      <aside className="sidebar">
        <div className="sidebar-brand-row">
          <button className="brand" onClick={() => navigate("home")} aria-label="Flashbolt home" title="Flashbolt home">
            <span className="brand-mark"><i /><i /><i /></span>
            <span>Flashbolt</span>
          </button>
          <button className="sidebar-collapse-button" onClick={toggleSidebar} aria-label={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"} title={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}>{sidebarCollapsed ? "›" : "‹"}</button>
        </div>

        <nav className="main-nav" aria-label="Main navigation">
          <button title="Home" aria-label="Home" className={view === "home" ? "active" : ""} onClick={() => { setSelectedFolderId(null); navigate("home"); }}><span className="nav-icon">⌂</span><span className="nav-label">Home</span></button>
          <button title="Your library" aria-label="Your library" className={view === "library" && !folder ? "active" : ""} onClick={() => { setSelectedFolderId(null); navigate("library"); }}><span className="nav-icon">▤</span><span className="nav-label">Your library</span></button>
          <button title="Folders" aria-label="Folders" className={view === "folders" || (view === "library" && Boolean(folder)) ? "active" : ""} onClick={() => navigate("folders")}><span className="nav-icon">□</span><span className="nav-label">Folders</span></button>
        </nav>

        <div className="side-section">
          <p>Study tools</p>
          <button title="Flashcard set" aria-label="Create flashcard set" onClick={startCreate}><span className="nav-icon">＋</span><span className="nav-label">Flashcard set</span></button>
          <button title="Study guide" aria-label="Study guide" onClick={() => navigate("guide")}><span className="nav-icon">≡</span><span className="nav-label">Study guide</span></button>
          <button title="Practice test" aria-label="Practice test" onClick={() => selectedSet ? startTest() : navigate("library")}><span className="nav-icon">✓</span><span className="nav-label">Practice test</span></button>
          <button title="Kahoot Helper" aria-label="Open Kahoot Helper" className={view === "helper" ? "active" : ""} onClick={openKahootHelper}><span className="nav-icon">◆</span><span className="nav-label">Kahoot Helper</span></button>
          <button title="Notebook" aria-label="Open notebook" onClick={() => routerNavigate("/admin-dashboard/private-pages/notebook")}><span className="nav-icon">▱</span><span className="nav-label">Notebook</span></button>
        </div>

        <div className="private-card">
          <span className="private-icon">⌁</span>
          <div><strong>Private by design</strong><p>Your library syncs with your account.</p></div>
        </div>

        <div className="sidebar-bottom">
          <ThemePicker theme={theme} onThemeChange={setTheme} />
          <button title="Back up library" aria-label="Back up library" onClick={exportLibrary}><span className="nav-icon">⇩</span><span className="nav-label">Back up library</span></button>
          <button title="Back to private pages" aria-label="Back to private pages" onClick={() => routerNavigate("/admin-dashboard/private-pages")}><span className="nav-icon">←</span><span className="nav-label">Back to private pages</span></button>
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
                      {selectedSet.kahootUrl && isSafeKahootUrl(selectedSet.kahootUrl) && <a className="button quiet" href={selectedSet.kahootUrl} target="_blank" rel="noreferrer">Open Kahoot ↗</a>}
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
                <div>{folder && <button className="back-link" onClick={() => navigate("folders")}>← All folders</button>}<span className="eyebrow">{folder?.semester ?? (folder ? "Folder" : "Your library")}</span><h1>{folder ? folder.name : "Every set, in one place."}</h1><p>{folder ? `${folder.setIds.length} set${folder.setIds.length === 1 ? "" : "s"} dedicated to this folder.` : `${data.sets.length} sets and ${cardCount} cards, synced with your account.`}</p></div>
                <div className="heading-actions">
                  {folder && <button className="button quiet" onClick={() => editFolder(folder)}>Edit folder</button>}
                  {!folder && <button className="button quiet" onClick={() => importInputRef.current?.click()}>Restore backup</button>}
                  <button className="button primary" onClick={folder ? () => startCreate(folder.id) : startCreate}>＋ Create set</button>
                </div>
              </div>
              <input ref={importInputRef} className="visually-hidden" type="file" accept="application/json" onChange={importLibrary} />
              {!folder && <div className="library-toolbar">
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
                    {folderSemesterGroups.map((group) => <section className="folder-semester-group" key={group.semester}>
                      <h3>{group.semester}<small>{group.folders.length} folder{group.folders.length === 1 ? "" : "s"}</small></h3>
                      <div className="folder-semester-chips">{group.folders.map((item) => (
                        <button className={selectedFolderId === item.id ? "active" : ""} aria-pressed={selectedFolderId === item.id} aria-label={`Open ${item.name}, ${item.setIds.length} set${item.setIds.length === 1 ? "" : "s"}`} title={item.name} key={item.id} onClick={() => openFolder(item)}>
                          <span className="folder-filter-icon folder" aria-hidden="true" style={{ "--folder-color": item.color ?? FOLDER_COLORS[0] } as CSSProperties} />
                          <span className="folder-filter-name">{item.name}</span>
                          <span className="folder-filter-count">{item.setIds.length}</span>
                        </button>
                      ))}</div>
                    </section>)}
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
              </div>}
              {folder && <div className="folder-dedicated-toolbar">
                <span><i style={{ "--folder-color": folder.color ?? FOLDER_COLORS[0] } as CSSProperties} />Showing only <strong>{folder.name}</strong></span>
                <label className="library-sort-control">
                  <span className="library-sort-icon" aria-hidden="true">⇅</span>
                  <span className="library-sort-field"><small>Sort by</small><select value={librarySort} onChange={(event) => setLibrarySort(event.target.value as LibrarySort)} aria-label={`Sort sets in ${folder.name}`}>
                    <option value="updated-desc">Recently updated</option>
                    <option value="updated-asc">Oldest updated</option>
                    <option value="title-asc">Title: A–Z</option>
                    <option value="title-desc">Title: Z–A</option>
                    <option value="subject-asc">Subject: A–Z</option>
                    <option value="subject-desc">Subject: Z–A</option>
                    <option value="folder-asc">Folder: A–Z</option>
                    <option value="folder-desc">Folder: Z–A</option>
                    <option value="terms-desc">Most terms</option>
                    <option value="terms-asc">Fewest terms</option>
                    <option value="progress-desc">Highest mastery %</option>
                    <option value="progress-asc">Lowest mastery %</option>
                    <option value="mastered-desc">Most mastered cards</option>
                    <option value="mastered-asc">Fewest mastered cards</option>
                    <option value="remaining-desc">Most cards left</option>
                    <option value="remaining-asc">Fewest cards left</option>
                    <option value="unfiled-first">Unfiled first</option>
                    <option value="filed-first">Filed first</option>
                  </select></span>
                </label>
              </div>}
              {folder && filteredSets.length ? (
                <div className="folder-subject-sections">
                  {folderSubjectGroups.map((group) => (
                    <section className="folder-subject-section" key={group.subject.toLocaleLowerCase()}>
                      <div className="folder-subject-heading">
                        <div><span className="eyebrow">Subject</span><h2>{group.subject}</h2></div>
                        <small>{group.sets.length} set{group.sets.length === 1 ? "" : "s"}</small>
                      </div>
                      {renderSetGrid(group.sets)}
                    </section>
                  ))}
                </div>
              ) : renderSetGrid(filteredSets)}
            </section>
          )}

          {!search && view === "folders" && (
            <section>
              <div className="page-heading split">
                <div><span className="eyebrow">Folders</span><h1>Organize your way.</h1><p>Group related sets without sharing anything publicly.</p></div>
                <button className="button primary" onClick={openNewFolderModal}>＋ New folder</button>
              </div>
              {data.folders.length ? (
                <div className="folder-semester-sections">
                  {folderSemesterGroups.map((group) => <section className="folder-page-semester" key={group.semester}>
                    <div className="folder-semester-title"><div><span className="eyebrow">Semester</span><h2>{group.semester}</h2></div><small>{group.folders.length} folder{group.folders.length === 1 ? "" : "s"}</small></div>
                    <div className="folder-grid">{group.folders.map((item) => (
                    <article key={item.id} className="folder-tile" onClick={() => openFolder(item)}>
                      <span className="folder-tab" />
                      <div className="folder-tile-actions">
                        <button onClick={(event) => { event.stopPropagation(); editFolder(item); }} aria-label={`Edit ${item.name}`} title="Edit folder">✎</button>
                        <button className="delete" onClick={(event) => { event.stopPropagation(); deleteFolder(item); }} aria-label={`Delete ${item.name}`} title="Delete folder">×</button>
                      </div>
                      <button className="folder-open-button" onClick={(event) => { event.stopPropagation(); openFolder(item); }}>
                        <span className="folder-icon">□</span>
                        <strong>{item.name}</strong><small>{item.semester ? `${item.semester} · ` : ""}{item.setIds.length} set{item.setIds.length === 1 ? "" : "s"}</small><span>Open <b>→</b></span>
                      </button>
                    </article>
                    ))}</div>
                  </section>)}
                  <div className="folder-grid"><button className="folder-tile new-folder" onClick={openNewFolderModal}><span className="folder-icon">＋</span><strong>Create a folder</strong><small>Keep a course or topic together</small></button></div>
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
                {editingSetId && editorFolder && editorFolderSets.length > 1 && <nav className="editor-set-navigation" aria-label={`Move between sets in ${editorFolder.name}`}><span>{editorSetIndex + 1} of {editorFolderSets.length} in {editorFolder.name}</span><div><button className="button quiet" disabled={!previousEditorSet} onClick={() => previousEditorSet && openAdjacentEditor(previousEditorSet)} title={previousEditorSet?.title ?? "First set in folder"}>← Previous</button><button className="button quiet" disabled={!nextEditorSet} onClick={() => nextEditorSet && openAdjacentEditor(nextEditorSet)} title={nextEditorSet?.title ?? "Last set in folder"}>Next →</button></div></nav>}
              </div>
              <div className="creator-layout">
                <div className="creator-main">
                  <article className="form-card set-details">
                    <label><span className="set-field-label"><b>Title</b><span className="set-field-history">{!editingSetId && recentSetValues && <button type="button" onClick={() => setDraft((current) => ({ ...current, title: recentSetValues.title }))} title={recentSetValues.title}>Use recent: {recentSetValues.title || "Empty"}</button>}<PreviousValueSelect label="title" values={previousTitles} onSelect={(title) => setDraft((current) => ({ ...current, title }))} /></span></span><input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} onKeyDown={(event) => acceptPreviousValueOnTab(event, previousTitles, (title) => setDraft((current) => ({ ...current, title })))} placeholder="e.g. [ITEC 3600] Chapter 1 - Part 1" maxLength={100} /></label>
                    <div className="field-row">
                      <label><span className="set-field-label"><b>Subject</b><span className="set-field-history">{!editingSetId && recentSetValues && <button type="button" onClick={() => setDraft((current) => ({ ...current, subject: recentSetValues.subject }))} title={recentSetValues.subject}>Use recent: {recentSetValues.subject || "Empty"}</button>}<PreviousValueSelect label="subject" values={previousSubjects} onSelect={(subject) => setDraft((current) => ({ ...current, subject }))} /></span></span><input value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} onKeyDown={(event) => acceptPreviousValueOnTab(event, previousSubjects, (subject) => setDraft((current) => ({ ...current, subject })))} placeholder="Course or topic" /></label>
                      <label><span className="set-field-label"><b>Color</b>{!editingSetId && recentSetValues && <button type="button" onClick={() => setDraft((current) => ({ ...current, color: recentSetValues.color }))}>Use recent: {recentSetValues.color}</button>}</span><select value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })}><option value="violet">Violet</option><option value="mint">Mint</option><option value="amber">Amber</option><option value="coral">Coral</option></select></label>
                    </div>
                    <label><span className="set-field-label"><b>Description <small>optional</small></b><span className="set-field-history">{!editingSetId && recentSetValues && <button type="button" onClick={() => setDraft((current) => ({ ...current, description: recentSetValues.description }))} title={recentSetValues.description}>Use recent: {recentSetValues.description || "Empty"}</button>}<PreviousValueSelect label="description" values={previousDescriptions} onSelect={(description) => setDraft((current) => ({ ...current, description }))} /></span></span><textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} onKeyDown={(event) => acceptPreviousValueOnTab(event, previousDescriptions, (description) => setDraft((current) => ({ ...current, description })))} placeholder="What will this set help you learn?" rows={3} /></label>
                    <label className="kahoot-link-field"><span className="set-field-label"><b>Kahoot link <small>optional</small></b>{draft.kahootUrl && isSafeKahootUrl(draft.kahootUrl) && <a href={draft.kahootUrl} target="_blank" rel="noreferrer">Open link ↗</a>}</span><input type="url" inputMode="url" value={draft.kahootUrl ?? ""} onChange={(event) => setDraft((current) => ({ ...current, kahootUrl: event.target.value }))} placeholder="https://create.kahoot.it/details/…" spellCheck={false} /></label>
                    <div className="folder-assignment">
                      <div className="folder-assignment-heading">
                        <div><span>Folders <small>optional</small></span><p>Add this set to one or more folders.</p></div>
                        <div className="folder-assignment-actions">{!editingSetId && recentSetValues && <button className="recent-folder-button" type="button" onClick={() => setDraftFolderIds(recentSetValues.folderIds.filter((folderId) => data.folders.some((folderItem) => folderItem.id === folderId)))} title={recentFolderNames.join(", ") || "No folders"}>Use recent: {recentFolderNames.join(", ") || "None"}</button>}{previousFolderSelections.length > 0 && <details className="previous-value-menu previous-folder-menu"><summary>Previous folders…</summary><div>{previousFolderSelections.map((selection) => <button type="button" key={selection.folderIds.join("|")} onClick={(event) => { setDraftFolderIds(selection.folderIds); event.currentTarget.closest("details")?.removeAttribute("open"); }}>{selection.label}</button>)}</div></details>}<button className="text-button" onClick={openNewFolderModal}>＋ New folder</button></div>
                      </div>
                      {data.folders.length ? (
                        <>
                        <div className="selected-folder-summary" aria-live="polite">
                          <span>{draftFolderIds.length === 1 ? "Selected folder" : "Selected folders"}</span>
                          <div>{draftFolderIds.length ? data.folders.filter((folderItem) => draftFolderIds.includes(folderItem.id)).map((folderItem) => <span className="selected-folder-chip" key={folderItem.id} style={{ "--folder-color": folderItem.color ?? FOLDER_COLORS[0] } as CSSProperties}><i aria-hidden="true" /><b>{folderItem.name}</b>{folderItem.semester && <small>{folderItem.semester}</small>}<button type="button" onClick={() => setDraftFolderIds((ids) => ids.filter((id) => id !== folderItem.id))} aria-label={`Remove ${folderItem.name}`}>×</button></span>) : <small className="no-folder-selected">No folder selected</small>}</div>
                        </div>
                        <label className="folder-assignment-search">
                          <span aria-hidden="true">⌕</span>
                          <input type="search" value={draftFolderSearch} onChange={(event) => setDraftFolderSearch(event.target.value)} placeholder="Search folders by name or course code" aria-label="Search folders" />
                          {draftFolderSearch && <button type="button" onClick={() => setDraftFolderSearch("")} aria-label="Clear folder search">×</button>}
                        </label>
                        <div className="folder-option-grid">
                          {draftFolderOptions.filter((folderItem) => folderItem.name.toLocaleLowerCase().includes(draftFolderSearch.trim().toLocaleLowerCase())).map((folderItem) => {
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
                              <button
                                type="button"
                                className="drag-handle"
                                draggable
                                onDragStart={(event) => {
                                  event.stopPropagation();
                                  event.dataTransfer.effectAllowed = "move";
                                  event.dataTransfer.setData("text/plain", card.id);
                                  setDraggingCardId(card.id);
                                }}
                                onDragEnd={() => setDraggingCardId(null)}
                                aria-label={`Drag card ${index + 1} to reorder`}
                                title="Drag to reorder"
                              >☰</button>
                              <button onClick={() => duplicateDraftCard(card.id)} aria-label={`Duplicate card ${index + 1}`} title="Duplicate card">⧉</button>
                              <button onClick={() => setDraft((current) => ({ ...current, cards: current.cards.filter((item) => item.id !== card.id) }))} disabled={draft.cards.length === 1} aria-label={`Remove card ${index + 1}`} title="Delete card">×</button>
                            </div>
                          </header>
                          <div className="card-question-type">
                            <label><span>Question type</span><select value={cardQuestionType(card)} onChange={(event) => setDraftCardQuestionType(card, event.target.value as CardQuestionType)}><option value="flashcard">Flashcard</option><option value="multiple-choice">Multiple choice</option><option value="true-false">True or false</option><option value="select-all">Select all that apply</option><option value="written">Written answer</option><option value="matching">Matching</option></select></label>
                            <small>{cardQuestionType(card) === "matching" ? "Create pairs learners will match." : cardQuestionType(card) === "written" ? "Learners type the definition." : cardQuestionType(card) === "flashcard" ? "Reveal the definition after recalling it." : "Enter choices and mark the correct answer."}</small>{cardQuestionType(card) === "flashcard" && <button type="button" className="quick-add-choices" onClick={() => setDraftCardQuestionType(card, "multiple-choice")}>＋ Add answer choices</button>}
                          </div>
                          <div className="card-editor-fields">
                            <label className="card-text-field">
                              <AutoResizeTextarea className={`highlight-${card.highlight ?? "none"}`} value={card.term} onChange={(event) => updateDraftCard(card.id, "term", event.target.value)} placeholder="Enter term" />
                              <span className="field-meta"><b>TERM</b><select aria-label={`Term language for card ${index + 1}`} value={card.termLanguage ?? "auto"} onChange={(event) => updateDraftCardExtras(card.id, { termLanguage: event.target.value })}>{LANGUAGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></span>
                            </label>
                            <i />
                            {(cardQuestionType(card) === "multiple-choice" || cardQuestionType(card) === "select-all" || cardQuestionType(card) === "true-false") && card.answerChoices ? (
                              <div className="card-editor-choices">
                                <span>{cardQuestionType(card) === "select-all" ? "Answer choices · select every correct answer" : "Answer choices · select the correct answer"}</span>
                                <div>
                                  {card.answerChoices.map((choice, choiceIndex) => {
                                    const isCorrect = correctAnswersForCard(card).some((answer) => normalizeAnswer(answer) === normalizeAnswer(choice));
                                    return (
                                      <label className={isCorrect ? "correct" : ""} key={`${card.id}-choice-${choiceIndex}`}>
                                        <button type="button" className="choice-correct-toggle" onClick={() => toggleDraftCorrectAnswer(card, choice)} aria-label={`${isCorrect ? "Unmark" : "Mark"} choice ${String.fromCharCode(65 + choiceIndex)} as correct`} aria-pressed={isCorrect}>{String.fromCharCode(65 + choiceIndex)}</button>
                                        <input value={choice} onChange={(event) => updateDraftChoice(card, choiceIndex, event.target.value)} aria-label={`Choice ${String.fromCharCode(65 + choiceIndex)} for card ${index + 1}`} placeholder={`Choice ${String.fromCharCode(65 + choiceIndex)}`} readOnly={cardQuestionType(card) === "true-false"} />
                                        {isCorrect && <small>Correct</small>}
                                        {cardQuestionType(card) !== "true-false" && card.answerChoices && card.answerChoices.length > 2 && <button type="button" className="choice-remove" onClick={() => updateDraftCardExtras(card.id, { answerChoices: card.answerChoices?.filter((_, itemIndex) => itemIndex !== choiceIndex), correctAnswers: correctAnswersForCard(card).filter((answer) => normalizeAnswer(answer) !== normalizeAnswer(choice)) })} aria-label={`Remove choice ${String.fromCharCode(65 + choiceIndex)}`}>×</button>}
                                      </label>
                                    );
                                  })}
                                </div>
                                {cardQuestionType(card) !== "true-false" && card.answerChoices.length < 26 && <button type="button" className="add-answer-choice" onClick={() => updateDraftCardExtras(card.id, { answerChoices: [...(card.answerChoices ?? []), ""] })}>＋ Add answer {String.fromCharCode(65 + card.answerChoices.length)}</button>}
                              </div>
                            ) : <div className="definition-field-wrap">
                              <label className="card-text-field">
                                <AutoResizeTextarea className={`highlight-${card.highlight ?? "none"}`} value={card.definition} onChange={(event) => updateDraftCard(card.id, "definition", event.target.value)} placeholder="Enter definition" />
                                <span className="field-meta"><b>DEFINITION</b><select aria-label={`Definition language for card ${index + 1}`} value={card.definitionLanguage ?? "auto"} onChange={(event) => updateDraftCardExtras(card.id, { definitionLanguage: event.target.value })}>{LANGUAGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></span>
                              </label>
                              <div className="definition-actions">
                                <button onClick={() => startDictation(card, "definition")} className={dictationTarget?.cardId === card.id && dictationTarget.field === "definition" ? "recording" : ""} aria-label={`Dictate definition for card ${index + 1}`} title="Dictate definition">◉</button>
                                <label className="image-upload-button" title="Add image"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { void attachCardImage(card.id, event.target.files?.[0]); event.target.value = ""; }} /><span>▧</span>Image</label>
                              </div>
                            </div>}
                          </div>
                          {cardQuestionType(card) === "matching" && (
                            <div className="matching-pair-editor"><span>Matching pairs</span><div>{(card.matchingPairs ?? []).map((pair, pairIndex) => <div className="matching-pair-row" key={pair.id}><b>{String.fromCharCode(65 + pairIndex)}</b><input value={pair.left} onChange={(event) => updateDraftCardExtras(card.id, { matchingPairs: card.matchingPairs?.map((item) => item.id === pair.id ? { ...item, left: event.target.value } : item) })} placeholder="Prompt" /><span>↔</span><input value={pair.right} onChange={(event) => updateDraftCardExtras(card.id, { matchingPairs: card.matchingPairs?.map((item) => item.id === pair.id ? { ...item, right: event.target.value } : item) })} placeholder="Match" /><button type="button" onClick={() => updateDraftCardExtras(card.id, { matchingPairs: card.matchingPairs?.filter((item) => item.id !== pair.id) })} disabled={(card.matchingPairs?.length ?? 0) <= 2} aria-label={`Remove matching pair ${pairIndex + 1}`}>×</button></div>)}</div>{(card.matchingPairs?.length ?? 0) < 26 && <button type="button" className="add-answer-choice" onClick={() => updateDraftCardExtras(card.id, { matchingPairs: [...(card.matchingPairs ?? []), { id: makeId("pair"), left: "", right: "" }] })}>＋ Add matching pair</button>}</div>
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
                  <section className={`creation-checklist collapsible-panel-section ${collapsedEditorSections.includes("checklist") ? "collapsed" : ""} ${draftCompletion === 100 ? "complete" : ""}`} aria-label={`Set creation ${draftCompletion}% complete`}>
                    <button className="side-panel-collapse-button creation-checklist-heading" type="button" onClick={() => toggleEditorSection("checklist")} aria-expanded={!collapsedEditorSections.includes("checklist")}><div><span className="eyebrow">Set checklist</span><h3>{draftCompletion === 100 ? "Ready to study" : "Finish your set"}</h3></div><i aria-hidden="true">⌃</i></button>
                    <div className="creation-checklist-summary" aria-live="polite"><strong>{draftCompletion}%</strong><span>{draft.cards.length} card{draft.cards.length === 1 ? "" : "s"}</span></div>
                    <div className="creation-progress" role="progressbar" aria-label="Set completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={draftCompletion}><i style={{ width: `${draftCompletion}%` }} /></div>
                    <div className="editor-save-actions"><button className="button quiet" onClick={() => saveDraft(false)}>Save</button><button className="button primary" onClick={() => saveDraft(true)}>Save &amp; study</button></div>
                    <div className="collapsible-panel-body">
                      <ul>{draftChecklist.map((item) => <li className={item.complete ? "complete" : ""} key={item.label}><span>{item.complete ? "✓" : "○"}</span><div><strong>{item.label}</strong>{!item.complete && <small>{item.detail}</small>}</div></li>)}</ul>
                    </div>
                  </section>
                  <div className="import-divider"><span>Import tools</span></div>
                  <div className={`quizlet-import-block collapsible-panel-section ${collapsedEditorSections.includes("quizlet") ? "collapsed" : ""}`}>
                    <button className="side-panel-collapse-button" type="button" onClick={() => toggleEditorSection("quizlet")} aria-expanded={!collapsedEditorSections.includes("quizlet")}><span><small>From Quizlet</small><strong>Import by link</strong></span><i aria-hidden="true">⌃</i></button>
                    <div className="collapsible-panel-body"><p>Paste a public flashcard-set link. Its title, description, and cards will fill this editor.</p>
                      <label className="quizlet-link-field"><span className="visually-hidden">Quizlet set link</span><input type="url" value={quizletUrl} onChange={(event) => { setQuizletUrl(event.target.value); setQuizletImportMessage(""); setQuizletImportFailed(false); }} onKeyDown={(event) => { if (event.key === "Enter" && !quizletImporting) void applyQuizletImport(); }} placeholder="https://quizlet.com/123…/flash-cards/" autoComplete="url" /></label>
                      <button className="button primary full" onClick={() => void applyQuizletImport()} disabled={quizletImporting}>{quizletImporting ? "Importing…" : "Import Quizlet set"}</button>
                      {quizletImportMessage && <p className={`import-status ${quizletImportFailed ? "error" : ""}`} role={quizletImportFailed ? "alert" : "status"}>{quizletImportMessage}</p>}
                    </div>
                  </div>
                  <div className={`kahoot-import-block collapsible-panel-section ${collapsedEditorSections.includes("kahoot") ? "collapsed" : ""}`}>
                    <button className="side-panel-collapse-button" type="button" onClick={() => toggleEditorSection("kahoot")} aria-expanded={!collapsedEditorSections.includes("kahoot")}><span><small>From Kahoot</small><strong>Import by link or ID</strong></span><i aria-hidden="true">⌃</i></button>
                    <div className="collapsible-panel-body"><p>Paste a public details link or its quiz ID. Questions, choices, and correct answers will fill this editor.</p>
                      <label className="quizlet-link-field"><span className="visually-hidden">Kahoot quiz link or ID</span><input type="text" inputMode="url" value={kahootReference} onChange={(event) => { setKahootReference(event.target.value); setKahootImportMessage(""); setKahootImportFailed(false); }} onKeyDown={(event) => { if (event.key === "Enter" && !kahootImporting) void applyKahootImport(); }} placeholder="Kahoot details link or quiz ID" autoComplete="url" /></label>
                      <button className="button primary full kahoot-import-button" onClick={() => void applyKahootImport()} disabled={kahootImporting}>{kahootImporting ? "Importing…" : "Import Kahoot quiz"}</button>
                      {kahootImportMessage && <p className={`import-status ${kahootImportFailed ? "error" : ""}`} role={kahootImportFailed ? "alert" : "status"}>{kahootImportMessage}</p>}
                    </div>
                  </div>
                  <div className={`paste-import-block collapsible-panel-section ${collapsedEditorSections.includes("paste") ? "collapsed" : ""}`}>
                    <button className="side-panel-collapse-button" type="button" onClick={() => toggleEditorSection("paste")} aria-expanded={!collapsedEditorSections.includes("paste")}><span><small>Manual import</small><strong>Paste a list</strong></span><i aria-hidden="true">⌃</i></button>
                    <div className="collapsible-panel-body"><p>Put one card on each line and separate the sides with <code>::</code>.</p>
                      <textarea value={pasteImport} onChange={(event) => setPasteImport(event.target.value)} placeholder={'Paste copied Quizlet term-list HTML, or use:\n\nLifecycle :: The stages an activity moves through\nIntent :: A request to perform an action'} rows={7} />
                      <button className="button quiet full" onClick={applyPasteImport}>Import pasted cards</button>
                    </div>
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
                <div className="heading-actions">{selectedSet.kahootUrl && isSafeKahootUrl(selectedSet.kahootUrl) && <a className="button quiet" href={selectedSet.kahootUrl} target="_blank" rel="noreferrer">◆ Open Kahoot ↗</a>}<button className="button quiet" onClick={() => startEdit(selectedSet)}>Edit set</button><button className="icon-button danger" onClick={deleteSelectedSet} aria-label="Delete set">×</button></div>
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
                <div className="section-heading term-list-heading"><div><span className="eyebrow">Review</span><h2>Terms in this set ({selectedSet.cards.length})</h2></div><label className="term-search"><span aria-hidden="true">⌕</span><input type="search" value={termSearch} onChange={(event) => setTermSearch(event.target.value)} placeholder="Search terms and answers" aria-label="Search terms, definitions, and answer choices in this set" />{termSearch && <button type="button" onClick={() => setTermSearch("")} aria-label="Clear term search">×</button>}</label></div>
                {termSearch && <p className="term-search-count" role="status">Showing {visibleSetCards.length} of {selectedSet.cards.length} terms</p>}
                {visibleSetCards.map((card) => {
                  const index = selectedSet.cards.findIndex((item) => item.id === card.id);
                  return (
                  <article className={`highlight-${card.highlight ?? "none"}${card.answerChoices && card.answerChoices.length > 1 ? " multiple-choice-review" : " flashcard-review"}`} key={card.id}>
                    <span>{index + 1}</span>
                    <strong>{card.term}</strong>
                    {(!card.answerChoices || card.answerChoices.length <= 1) && <p>{card.definition}</p>}
                    {card.answerChoices && card.answerChoices.length > 1 && (
                      <ol className="term-review-choices" aria-label={`Answer choices for ${card.term}`}>
                        {card.answerChoices.map((choice, choiceIndex) => {
                          const isCorrect = correctAnswersForCard(card).some((answer) => normalizeAnswer(answer) === normalizeAnswer(choice));
                          return <li className={isCorrect ? "correct" : ""} key={`${card.id}-${choiceIndex}`}><span>{String.fromCharCode(65 + choiceIndex)}</span><b>{choice}</b>{isCorrect && <em>Correct</em>}</li>;
                        })}
                      </ol>
                    )}
                    {card.imageData && <img width={50} height={42} src={card.imageData} alt="" />}
                    <button className={data.mastered[selectedSet.id]?.includes(card.id) ? "done" : ""} onClick={() => toggleMastered(selectedSet.id, card.id)} aria-label="Toggle mastered">✓</button>
                  </article>
                  );
                })}
                {termSearch && !visibleSetCards.length && <div className="term-search-empty"><strong>No matching terms</strong><p>Try another keyword or clear the search.</p><button className="button quiet" onClick={() => setTermSearch("")}>Clear search</button></div>}
              </section>
            </section>
          )}

          {!search && view === "learn" && selectedSet && (
            <section className={`learn-page ${learnPhase === "session" ? "session-active" : ""}`}>
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
                    <div className={`question-card ${learnAnswer ? "ready-to-continue" : ""}`} onClick={(event) => { if (!learnAnswer || event.target instanceof Element && event.target.closest("button, input, textarea, select, a, label")) return; const retypeRequired = !learnLastCorrect && learnOptions.retypeCorrectAnswers; if (retypeRequired && normalizeAnswer(learnRetypeAnswer) !== normalizeAnswer(currentLearnCorrectAnswer)) return; nextLearnQuestion(); }}>
                      <div className="learn-question-stage"><span className="eyebrow">{currentLearnQuestionKind === "written" ? `Write the ${currentLearnAnswerSide}` : currentLearnQuestionKind === "true-false" ? "True or false" : currentLearnQuestionKind === "select-all" ? "Select all that apply" : currentLearnQuestionKind === "flashcard" ? "Recall, then reveal" : `Choose the ${currentLearnAnswerSide}`}</span><span>{learnConfidenceLabel(learnQuestionConfidence)} · stage {Math.min(3, learnQuestionConfidence + 1)}</span></div>
                      <h1>{currentLearnPrompt}</h1>
                      {learnOptions.showImagesOnQuestions && currentLearnCard.imageData && <img width={320} height={185} className="learn-question-image" src={currentLearnCard.imageData} alt={currentLearnCard.imageName ?? "Question study aid"} />}

                      {currentLearnQuestionKind === "multiple-choice" && <div className="answer-grid">{currentLearnChoices.map((option, index) => {
                        const isCorrect = normalizeAnswer(option) === normalizeAnswer(currentLearnCorrectAnswer);
                        const isChosen = option === learnAnswer;
                        const resultClass = learnAnswer ? (isCorrect ? "correct" : isChosen ? "incorrect" : "muted") : "";
                        return <button key={option} className={resultClass} onClick={() => chooseLearnAnswer(option)} disabled={Boolean(learnAnswer)}><span>{String.fromCharCode(65 + index)}</span>{option}</button>;
                      })}</div>}

                      {currentLearnQuestionKind === "true-false" && <div className="true-false-question"><p>The matching {currentLearnAnswerSide} is <strong>{currentTrueFalse.statement}</strong>.</p><div><button className={learnAnswer ? (currentTrueFalse.answer ? "correct" : learnAnswer === "True" ? "incorrect" : "muted") : ""} onClick={() => submitTrueFalseLearnAnswer(true)} disabled={Boolean(learnAnswer)}><span>✓</span>True</button><button className={learnAnswer ? (!currentTrueFalse.answer ? "correct" : learnAnswer === "False" ? "incorrect" : "muted") : ""} onClick={() => submitTrueFalseLearnAnswer(false)} disabled={Boolean(learnAnswer)}><span>×</span>False</button></div></div>}

                      {currentLearnQuestionKind === "written" && <form className="written-answer" onSubmit={(event) => { event.preventDefault(); submitWrittenLearnAnswer(); }}><label><span>Your answer</span><input value={learnWrittenAnswer} onChange={(event) => setLearnWrittenAnswer(event.target.value)} disabled={Boolean(learnAnswer)} placeholder={`Type the ${currentLearnAnswerSide}`} /></label><button className="button primary" disabled={!learnWrittenAnswer.trim() || Boolean(learnAnswer)}>Check answer</button></form>}

                      {currentLearnQuestionKind === "select-all" && <div className="select-all-question"><div className="select-all-grid">{currentSelectAll.choices.map((option) => { const selected = learnSelectedAnswers.includes(option); const correct = currentSelectAll.correctParts.includes(option); const resultClass = learnAnswer ? (correct ? "correct" : selected ? "incorrect" : "muted") : selected ? "selected" : ""; return <label key={option} className={resultClass}><input type="checkbox" checked={selected} onChange={() => setLearnSelectedAnswers((answers) => answers.includes(option) ? answers.filter((answer) => answer !== option) : [...answers, option])} disabled={Boolean(learnAnswer)} /><span>✓</span><p>{option}</p></label>; })}</div><button className="button primary" onClick={submitSelectAllLearnAnswer} disabled={!learnSelectedAnswers.length || Boolean(learnAnswer)}>Check selections</button></div>}

                      {currentLearnQuestionKind === "flashcard" && <div className="learn-flashcard-mode"><button className={`learn-reveal-card ${learnFlashRevealed ? "revealed" : ""}`} onClick={() => setLearnFlashRevealed(true)}><span>{learnFlashRevealed ? currentLearnCorrectAnswer : "Think of the answer before revealing it"}</span><small>{learnFlashRevealed ? "How did you do?" : "Reveal answer"}</small></button>{learnFlashRevealed && !learnAnswer && <div className="recall-buttons"><button className="button quiet" onClick={() => recordLearnResult(false, "Still learning")}>Still learning</button><button className="button primary" onClick={() => recordLearnResult(true, "Got it")}>Got it</button></div>}</div>}

                      {learnAnswer && <div className={`answer-feedback ${learnLastCorrect ? "correct" : "incorrect"}`}>
                        <div className="feedback-copy"><strong>{learnLastCorrect ? "Nice work." : "Not quite yet."}</strong><p>{learnLastCorrect ? (learnLastConfidence >= learnMasteryTarget ? "This card reached your session goal." : `Confidence moved to ${learnConfidenceLabel(learnLastConfidence)}. It will return later in a harder format.`) : <>The correct answer is <b>{currentLearnCorrectAnswer}</b>. This weak card will return before the next batch.</>}</p>{!learnLastCorrect && learnOptions.retypeCorrectAnswers && <label className="retype-answer"><span>Retype the correct answer to continue</span><input value={learnRetypeAnswer} onChange={(event) => setLearnRetypeAnswer(event.target.value)} placeholder={currentLearnCorrectAnswer} /></label>}</div>
                        {learnOptions.showImagesOnAnswers && currentLearnCard.imageData && <img width={74} height={58} className="learn-feedback-image" src={currentLearnCard.imageData} alt="Answer study aid" />}
                        <div className="learn-continue-action"><small>Press any key or click to continue</small><button className="button primary" onClick={nextLearnQuestion} disabled={!learnLastCorrect && learnOptions.retypeCorrectAnswers && normalizeAnswer(learnRetypeAnswer) !== normalizeAnswer(currentLearnCorrectAnswer)}>{learnIndex === learnRoundIds.length - 1 && learnRetryIds.length ? "Retry missed" : learnIndex === learnRoundIds.length - 1 && learnPendingIds.length ? "Next round" : learnIndex === learnRoundIds.length - 1 ? "Finish" : "Next question"} →</button></div>
                      </div>}
                    </div>
                  </div>
                </>
              )}

              {learnPhase === "complete" && (
                <div className="results-card learn-complete"><span className="result-burst">✓</span><span className="eyebrow">100% goal reached</span><h1>You completed the adaptive path.</h1><p className="learn-complete-count"><strong>{learnQuestionsAnswered}</strong> questions answered across <strong>{learnRound}</strong> adaptive round{learnRound === 1 ? "" : "s"}.</p><p>Every card reached the {learnGoal === "cram" ? "familiar" : "mastered"} level. Weak cards repeated, stronger cards advanced to harder recall, and your progress was queued for account sync.</p><div className="button-row center"><button className="button primary" onClick={() => beginLearnSession(learnGoal)}>Practice again</button><button className="button quiet" onClick={() => navigate("set")}>Back to set</button></div></div>
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
                  <article key={card.id} className={testSubmitted ? (normalizeAnswer(testAnswers[card.id] ?? "") === normalizeAnswer(testCorrectAnswer(card)) ? "correct-card" : "incorrect-card") : ""}>
                    <header><span>Question {cardIndex + 1}</span>{testSubmitted && <b>{normalizeAnswer(testAnswers[card.id] ?? "") === normalizeAnswer(testCorrectAnswer(card)) ? "Correct" : "Review"}</b>}</header>
                    <h2>{card.term}</h2>
                    <div className="test-options">
                      {answerOptions(selectedSet, cardIndex).map((option, optionIndex) => <label key={option} className={testSubmitted && normalizeAnswer(option) === normalizeAnswer(testCorrectAnswer(card)) ? "answer-key" : ""}><input type="radio" name={card.id} value={option} checked={testAnswers[card.id] === option} onChange={() => setTestAnswers((answers) => ({ ...answers, [card.id]: option }))} disabled={testSubmitted} /><span>{String.fromCharCode(65 + optionIndex)}</span><p>{option}</p></label>)}
                    </div>
                    {testSubmitted && normalizeAnswer(testAnswers[card.id] ?? "") !== normalizeAnswer(testCorrectAnswer(card)) && <p className="test-explanation">Correct answer: <strong>{testCorrectAnswer(card)}</strong></p>}
                  </article>
                ))}
              </div>
              <div className="test-submit"><span>{Object.keys(testAnswers).length} of {testCards.length} answered</span>{testSubmitted ? <button className="button primary" onClick={startTest}>Retake test</button> : <button className="button primary" onClick={submitTest} disabled={Object.keys(testAnswers).length !== testCards.length}>Grade my test</button>}</div>
            </section>
          )}

          {!search && view === "helper" && (
            <section className="kahoot-helper-page">
              {helperSet ? <>
                <div className="kahoot-helper-controls">
                  <label><span>Folder</span><select value={helperFolderId} onChange={(event) => { const folderId = event.target.value; const firstSet = folderId === "all" ? data.sets[0] : data.sets.find((set) => data.folders.find((folderItem) => folderItem.id === folderId)?.setIds.includes(set.id)); setHelperFolderId(folderId); setHelperSetId(firstSet?.id ?? ""); }}><option value="all">All folders ({data.sets.length} sets)</option>{data.folders.map((folderItem) => <option value={folderItem.id} key={folderItem.id} disabled={!folderItem.setIds.length}>{folderItem.name}{folderItem.semester ? ` — ${folderItem.semester}` : ""} ({folderItem.setIds.length})</option>)}</select></label>
                  <label><span>Study set</span><select value={helperSet?.id ?? ""} onChange={(event) => setHelperSetId(event.target.value)} disabled={!helperAvailableSets.length}>{helperAvailableSets.length ? helperAvailableSets.map((set) => <option value={set.id} key={set.id}>{set.title} ({set.cards.length})</option>) : <option value="">No sets in this folder</option>}</select></label>
                  <label className="kahoot-helper-search"><span>Search questions and answers</span><div><span>⌕</span><input value={helperSearch} onChange={(event) => setHelperSearch(event.target.value)} placeholder="Search this set instantly" />{helperSearch && <button onClick={() => setHelperSearch("")} aria-label="Clear helper search">×</button>}</div></label>
                </div>
                {helperCards.length ? <div className="kahoot-helper-list">
                  {helperCards.map((card, index) => {
                    const embedded = parseEmbeddedQuestion(card.term, card.definition);
                    const choices = card.answerChoices?.length ? card.answerChoices : embedded.choices;
                    const answers = correctAnswersForCard(card).map(normalizeAnswer);
                    const question = embedded.prompt || card.term;
                    return <article className="kahoot-helper-card" key={card.id}>
                      <header><span>Question {index + 1}</span><b>{cardQuestionType(card).replaceAll("-", " ")}</b></header>
                      {card.imageData && <img className="kahoot-helper-image" src={card.imageData} alt={card.imageName || "Question study aid"} />}
                      <h2>{question}</h2>
                      {cardQuestionType(card) === "matching" && card.matchingPairs?.length ? <div className="kahoot-helper-matches">{card.matchingPairs.map((pair) => <div key={pair.id}><span>{pair.left}</span><strong>{pair.right}</strong></div>)}</div> : choices.length > 1 ? <ol className="kahoot-helper-choices">{choices.map((choice, choiceIndex) => { const correct = answers.includes(normalizeAnswer(choice)); return <li className={correct ? "correct" : ""} key={`${choice}-${choiceIndex}`}><span className={`choice-symbol choice-${choiceIndex % 4}`} aria-label={`Choice ${String.fromCharCode(65 + choiceIndex)}`}>{String.fromCharCode(65 + choiceIndex)}</span><span>{choice}</span>{correct && <b>Correct</b>}</li>; })}</ol> : <div className="kahoot-helper-answer"><span>Answer</span><strong>{card.definition}</strong></div>}
                    </article>;
                  })}
                </div> : <div className="empty-state compact"><span>⌕</span><h2>No matching questions</h2><p>Try a different search.</p><button className="button quiet" onClick={() => setHelperSearch("")}>Clear search</button></div>}
                <p className="kahoot-helper-notice">Kahoot Helper only displays the Flashbolt set you select. It does not connect to, inspect, or control a live Kahoot game.</p>
              </> : <div className="empty-state"><span>◆</span><h2>Add a set to get started</h2><p>Create or import a study set you own, then return here to view every question and answer.</p><div className="button-row center"><button className="button primary" onClick={startCreate}>Create set</button><button className="button quiet" onClick={startKahootLinkImport}>Import set</button></div></div>}
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

        <nav className="mobile-nav" aria-label="Mobile navigation"><button className={view === "home" ? "active" : ""} onClick={() => navigate("home")}><span>⌂</span>Home</button><button className={view === "library" && !folder ? "active" : ""} onClick={() => { setSelectedFolderId(null); navigate("library"); }}><span>▤</span>Library</button><button className="mobile-create" onClick={startCreate}><span>＋</span></button><button className={view === "folders" || (view === "library" && Boolean(folder)) ? "active" : ""} onClick={() => navigate("folders")}><span>□</span>Folders</button><button onClick={() => navigate("guide")}><span>≡</span>Guide</button></nav>
      </div>

      {folderModalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeFolderModal(); }}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="folder-title">
            <header><div><span className="modal-icon">□</span><span className="eyebrow">{editingFolderId ? "Edit collection" : "New collection"}</span><h2 id="folder-title">{editingFolderId ? "Edit your folder" : "Name your folder"}</h2></div><button className="icon-button" onClick={closeFolderModal} aria-label="Close modal">×</button></header>
            <label className="modal-field"><span>Folder name</span><input value={folderName} onChange={(event) => setFolderName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveFolder(); }} placeholder="e.g. Fall semester" maxLength={50} /></label>
            <label className="modal-field"><span>Semester <small>optional</small></span><input value={folderSemester} onChange={(event) => setFolderSemester(event.target.value)} placeholder="e.g. Fall 2026" list="flashbolt-semesters" maxLength={11} /><datalist id="flashbolt-semesters">{[2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027].flatMap((year) => ["Spring", "Summer", "Fall"].map((term) => <option value={`${term} ${year}`} key={`${term}-${year}`} />))}</datalist></label>
            <fieldset className="folder-color-field"><legend>Folder icon color</legend><div>{FOLDER_COLORS.map((color) => <button type="button" className={folderColor === color ? "selected" : ""} style={{ "--folder-swatch": color } as CSSProperties} onClick={() => setFolderColor(color)} aria-label={`Use folder color ${color}`} aria-pressed={folderColor === color} key={color}><span /></button>)}</div></fieldset>
            <fieldset><legend>Add sets <small>optional</small></legend>{data.sets.map((set) => <label className="set-check" key={set.id}><span className="visually-hidden">Add set to folder</span><input aria-label={`Add ${set.title} to folder`} type="checkbox" checked={folderSetIds.includes(set.id)} onChange={() => setFolderSetIds((ids) => ids.includes(set.id) ? ids.filter((id) => id !== set.id) : [...ids, set.id])} /><span><strong>{set.title}</strong><small>{set.cards.length} terms</small></span></label>)}</fieldset>
            <p className="modal-privacy">⌁ This private folder syncs with your account and keeps a local backup on this device.</p>
            <footer>{editingFolder && <button className="button danger" onClick={() => deleteFolder(editingFolder)}>Delete folder</button>}<button className="button quiet" onClick={closeFolderModal}>Cancel</button><button className="button primary" onClick={saveFolder}>{editingFolderId ? "Save changes" : "Create folder"}</button></footer>
          </div>
        </div>
      )}

      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </div>
  );
}
