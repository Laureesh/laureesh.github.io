export type ParsedCard = {
  id: string;
  term: string;
  definition: string;
  answerChoices?: string[];
};

function makeCard(term: string, definition: string, answerChoices?: string[]): ParsedCard {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `card-${crypto.randomUUID()}`
    : `card-${Math.random().toString(36).slice(2)}`;
  return {
    id,
    term: term.trim(),
    definition: definition.trim(),
    ...(answerChoices?.length ? { answerChoices } : {}),
  };
}

function cleanStudyText(value: string) {
  return value.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
}

function normalizedChoice(value: string) {
  return cleanStudyText(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function splitLabeledChoices(value: string) {
  const matches = [...value.matchAll(/(?:^|\s)([A-F])[).:-]\s*/gi)];
  if (matches.length < 2) return [];
  return matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? value.length;
    return cleanStudyText(value.slice(start, end));
  }).filter(Boolean);
}

function splitChoiceLeadChoices(value: string) {
  const matches = [...value.matchAll(/(?:^|\s)(less|more|most|least|easier|harder|faster|slower|higher|lower|increased|decreased|added|reduced|public|private|domain|dns|true|false|yes|no)\b/gi)];
  if (matches.length < 3) return [];
  return matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length - match[1].length;
    const next = matches[index + 1];
    const end = next ? (next.index ?? value.length) + next[0].length - next[1].length : value.length;
    return cleanStudyText(value.slice(start, end));
  }).filter(Boolean);
}

function splitAtChoiceStarts(words: string[], starts: number[], expectedAnswer: string) {
  const uniqueStarts = [...new Set([0, ...starts])].sort((left, right) => left - right);
  if (uniqueStarts.length < 2 || uniqueStarts.length > 6) return [];
  const choices = uniqueStarts.map((start, index) => cleanStudyText(
    words.slice(start, uniqueStarts[index + 1] ?? words.length).join(" "),
  ));
  const expected = normalizedChoice(expectedAnswer);
  return choices.some((choice) => normalizedChoice(choice) === expected) ? choices : [];
}

function splitMarkedChoices(value: string, expectedAnswer: string) {
  const words = cleanStudyText(value).split(" ").filter(Boolean);
  if (words.length < 2) return [];
  const normalizedWords = words.map(normalizedChoice);

  const numericStarts = normalizedWords
    .map((_word, index) => (/^[€£$]?\d/.test(words[index]) ? index : -1))
    .filter((index) => index >= 0);
  if (numericStarts.length >= 3) {
    const numericChoices = splitAtChoiceStarts(words, numericStarts, expectedAnswer);
    if (numericChoices.length) return numericChoices;
  }

  const expectedWords = normalizedChoice(expectedAnswer).split(" ").filter(Boolean);
  if (!expectedWords.length) return [];
  const answerRanges: Array<[number, number]> = [];
  for (let index = 0; index <= normalizedWords.length - expectedWords.length; index += 1) {
    if (expectedWords.every((word, offset) => normalizedWords[index + offset] === word)) {
      answerRanges.push([index, index + expectedWords.length]);
    }
  }

  const patterns: string[][] = [[expectedWords[0]]];
  for (let start = 1; start < expectedWords.length - 1; start += 1) {
    const suffix = expectedWords.slice(start);
    if (/^(?:and|or|the|is|are|by|of|to)$/i.test(suffix[0])) continue;
    let occurrences = 0;
    for (let index = 0; index <= normalizedWords.length - suffix.length; index += 1) {
      if (suffix.every((word, offset) => normalizedWords[index + offset] === word)) occurrences += 1;
    }
    if (occurrences >= 2) patterns.push(suffix);
  }

  const expectedLead = words.find((_, index) => normalizedWords[index] === expectedWords[0]) ?? "";
  const normalizedLead = normalizedChoice(expectedLead);
  const hasDistinctiveSuffix = normalizedLead.length >= 4
    && /[A-Z]/.test(expectedLead)
    && /[a-z]/.test(expectedLead);
  if (hasDistinctiveSuffix) {
    const suffix = normalizedLead.slice(-3);
    const familyStarts = normalizedWords
      .map((word, index) => (word.length >= 4 && word.endsWith(suffix) ? index : -1))
      .filter((index) => index >= 0);
    if (familyStarts.length >= 3) {
      const familyChoices = splitAtChoiceStarts(words, familyStarts, expectedAnswer);
      if (familyChoices.length) return familyChoices;
    }
  }

  const repeatedStarts: number[] = [];
  for (let index = 0; index < normalizedWords.length; index += 1) {
    const insideCorrectAnswer = answerRanges.some(([start, end]) => index > start && index < end);
    if (insideCorrectAnswer) continue;
    if (patterns.some((pattern) => pattern.every((word, offset) => normalizedWords[index + offset] === word))) {
      repeatedStarts.push(index);
    }
  }
  if (repeatedStarts.length >= 2) {
    const repeatedChoices = splitAtChoiceStarts(words, repeatedStarts, expectedAnswer);
    if (repeatedChoices.length) return repeatedChoices;
  }

  return [];
}

function splitConcatenatedChoices(value: string, expectedAnswer: string) {
  const words = cleanStudyText(value).split(" ").filter(Boolean);
  if (words.length < 4 || words.length > 28) return [];
  const expected = normalizedChoice(expectedAnswer);
  let best: { score: number; choices: string[] } | null = null;

  for (let first = 1; first < words.length - 2; first += 1) {
    for (let second = first + 1; second < words.length - 1; second += 1) {
      for (let third = second + 1; third < words.length; third += 1) {
        const groups = [words.slice(0, first), words.slice(first, second), words.slice(second, third), words.slice(third)];
        const choices = groups.map((group) => group.join(" "));
        if (!choices.some((choice) => normalizedChoice(choice) === expected)) continue;
        let score = 30;
        const lengths = groups.map((group) => group.length);
        for (const group of groups) {
          if (/^(?:[A-Z][a-z]|[A-Z]{2,}|\d)/.test(group[0])) score += 3;
          score += group.length <= 5 ? 2 : -(group.length - 5) * 2;
        }
        for (const boundary of [first, second, third]) {
          const left = words[boundary - 1];
          const right = words[boundary];
          const joinedBoundary = `${normalizedChoice(left)} ${normalizedChoice(right)}`;
          if ([
            "solid state",
            "m 2 nvme",
            "nvme ssd",
            "virtual private",
            "private network",
            "virtual machines",
          ].includes(joinedBoundary)) score -= 14;
          if (/^[A-Z][a-z]/.test(right)) score += 4;
          else if (/^[A-Za-z]*\d[\w.]*$/.test(right)) score += 4;
          else if (/^[A-Z]{2,}$/.test(right)) score += /^[A-Z]{2,}$/.test(left) ? -2 : 2;
          if (/^[a-z]/.test(left)) score += 3;
          if (/^[A-Z]{2,}$/.test(left) && /^[A-Z][a-z]/.test(right)) score -= 3;
        }
        score -= Math.max(...lengths) - Math.min(...lengths);
        if (!best || score > best.score) best = { score, choices };
      }
    }
  }

  return best?.choices ?? [];
}

function choicesFromRemainder(remainder: string, expectedAnswer: string) {
  const trueFalse = remainder.match(/^\s*(true)\s+(false)\s*$/i)
    ?? remainder.match(/^\s*(false)\s+(true)\s*$/i);
  if (trueFalse) return [trueFalse[1], trueFalse[2]].map(sentenceCase);

  const labeled = splitLabeledChoices(remainder);
  if (labeled.length >= 2) return labeled;

  const separated = remainder
    .split(/\r?\n|\s*[|•]\s*|\s*;\s*/)
    .map(cleanStudyText)
    .filter(Boolean);
  if (separated.length >= 2) return separated;

  const choiceLeads = splitChoiceLeadChoices(remainder);
  if (choiceLeads.length >= 3 && choiceLeads.some((choice) => normalizedChoice(choice) === normalizedChoice(expectedAnswer))) {
    return choiceLeads;
  }

  const markedChoices = splitMarkedChoices(remainder, expectedAnswer);
  if (markedChoices.length >= 2) return markedChoices;

  return splitConcatenatedChoices(remainder, expectedAnswer);
}

export function parseEmbeddedQuestion(term: string, expectedAnswer: string) {
  const cleanTerm = term.replace(/\*\*/g, "").trim();
  const answerChoicesMarker = cleanTerm.match(/\s+answer choices?\s*:\s*/i);
  if (answerChoicesMarker?.index !== undefined) {
    const prompt = cleanStudyText(cleanTerm.slice(0, answerChoicesMarker.index));
    const remainder = cleanTerm.slice(answerChoicesMarker.index + answerChoicesMarker[0].length);
    const choices = choicesFromRemainder(remainder, expectedAnswer);
    if (choices.length >= 2) return { prompt, choices };
  }

  const questionEnd = cleanTerm.indexOf("?");
  if (questionEnd >= 0) {
    const prompt = cleanStudyText(cleanTerm.slice(0, questionEnd + 1));
    const remainder = cleanTerm.slice(questionEnd + 1).trim();
    return { prompt, choices: remainder ? choicesFromRemainder(remainder, expectedAnswer) : [] as string[] };
  }

  const colonEnd = cleanTerm.lastIndexOf(":");
  if (colonEnd >= 0 && colonEnd < cleanTerm.length - 1) {
    const prompt = cleanStudyText(cleanTerm.slice(0, colonEnd + 1));
    const remainder = cleanTerm.slice(colonEnd + 1).trim();
    const choices = choicesFromRemainder(remainder, expectedAnswer);
    if (choices.length >= 2) return { prompt, choices };
  }

  const trueFalseStatement = cleanTerm.match(/^(.*?)\s+(true)\s+(false)\s*$/i)
    ?? cleanTerm.match(/^(.*?)\s+(false)\s+(true)\s*$/i);
  if (/^(?:true|false)$/i.test(expectedAnswer.trim()) && trueFalseStatement && trueFalseStatement[1].trim().split(/\s+/).length >= 4) {
    return {
      prompt: cleanStudyText(trueFalseStatement[1]),
      choices: [sentenceCase(trueFalseStatement[2]), sentenceCase(trueFalseStatement[3])],
    };
  }

  return { prompt: cleanStudyText(cleanTerm), choices: [] as string[] };
}

function sentenceCase(value: string) {
  const clean = value.trim().replace(/^[,;:\s]+/, "");
  return clean ? clean[0].toUpperCase() + clean.slice(1) : clean;
}

function stripListMarker(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .trim()
    .replace(/^(?:[-*•]\s+|\d+\s*[).:-]\s*)/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function addExample(definition: string, example?: string) {
  if (!example) return definition;
  const cleanExample = example.replace(/^(?:examples?|ex)\s*:\s*/i, "").trim();
  return `${definition.replace(/[.\s]+$/, "")}. Examples: ${cleanExample}`;
}

function cardFromStatement(statement: string, example?: string): ParsedCard | null {
  const line = statement.trim().replace(/[.\s]+$/, "");
  if (!line || /\?+$/.test(line)) return null;

  const typeMatch = line.match(/^two types of\s+(.+?)\s+(system\b.+)$/i);
  if (typeMatch) {
    return makeCard(
      `What are the two types of ${typeMatch[1].trim()}?`,
      sentenceCase(typeMatch[2]),
    );
  }

  const interfaceMatch = line.match(/(?:^|,\s*)(.+?)\s+acts as\s+(?:an?\s+)?(.+)$/i);
  if (interfaceMatch) {
    return makeCard(
      `What does ${interfaceMatch[1].trim()} act as?`,
      addExample(sentenceCase(interfaceMatch[2]), example),
    );
  }

  const isMatch = line.match(/^(.+?)\s+is\s+(.+)$/i);
  if (isMatch) {
    const subject = isMatch[1].trim();
    const definition = isMatch[2].trim();
    if (/^non[- ]?tangible$/i.test(definition)) {
      return makeCard(`Is ${subject.toLowerCase()} tangible?`, `No. ${sentenceCase(line)}.`);
    }
    if (/^(?:a\s+)?system software$/i.test(definition)) {
      return makeCard(`What type of software is ${subject}?`, "System software");
    }
    return makeCard(`What is ${subject}?`, addExample(sentenceCase(definition), example));
  }

  const verbMatch = line.match(/^(.+?)\s+(manages|provides|allows|has)\s+(.+)$/i);
  if (verbMatch) {
    const [, subject, verb, rest] = verbMatch;
    const questions: Record<string, string> = {
      manages: `What does ${subject.trim()} manage?`,
      provides: `What does ${subject.trim()} provide?`,
      allows: `What does ${subject.trim()} allow?`,
      has: `What does ${subject.trim()} have?`,
    };
    return makeCard(questions[verb.toLowerCase()], addExample(sentenceCase(rest), example));
  }

  const cannotMatch = line.match(/^(.+?)\s+cannot\s+(.+)$/i);
  if (cannotMatch) {
    return makeCard(
      `Can ${cannotMatch[1].trim().toLowerCase()} ${cannotMatch[2].trim()}?`,
      `No. ${sentenceCase(line)}.`,
    );
  }

  if (line.split(/\s+/).length < 4) return null;
  const words = line.split(/\s+/);
  const topic = words.slice(0, 7).join(" ");
  return makeCard(
    `What should you remember about ${topic}${words.length > 7 ? "…" : ""}?`,
    addExample(sentenceCase(line), example),
  );
}

function isListFragment(value: string) {
  if (!value || /\?$/.test(value)) return false;
  return !/\b(?:is|are|acts|manages|provides|allows|cannot|has|designed)\b/i.test(value);
}

export function parseNotes(text: string): ParsedCard[] {
  const seen = new Set<string>();
  const lines = text
    .split(/\r?\n/)
    .map(stripListMarker)
    .filter((line) => {
      if (!line || /^teacher$/i.test(line)) return false;
      const key = line.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const cards: ParsedCard[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (/\?$/.test(line)) {
      const choices: string[] = [];
      let answer = "";
      let cursor = index + 1;
      for (; cursor < lines.length && cursor <= index + 7; cursor += 1) {
        const candidate = lines[cursor];
        const markedAnswer = candidate.match(/^(?:ans(?:wer)?|correct answer)\s*[:-]\s*(.+)$/i);
        if (markedAnswer) {
          answer = markedAnswer[1].trim();
          break;
        }
        if (/\?$/.test(candidate)) break;
        choices.push(candidate.replace(/^[A-F][).:-]\s*/i, "").trim());
      }
      if (answer && choices.length >= 2) {
        const letter = answer.match(/^([A-F])(?:[).:-]|$)/i)?.[1]?.toUpperCase();
        const resolvedAnswer = letter ? choices[letter.charCodeAt(0) - 65] : answer.replace(/^[A-F][).:-]\s*/i, "").trim();
        if (resolvedAnswer) cards.push(makeCard(line, resolvedAnswer, choices));
        index = cursor;
        continue;
      }
    }

    if (/^(?:hardware has many resources|steps? involved in .+)$/i.test(line)) {
      const items: string[] = [];
      while (
        index + 1 < lines.length &&
        !/^platform$/i.test(lines[index + 1]) &&
        isListFragment(lines[index + 1])
      ) {
        items.push(lines[index + 1].replace(/[.\s]+$/, ""));
        index += 1;
      }
      if (items.length) {
        const term = /^hardware/i.test(line)
          ? "Which hardware resources were listed?"
          : `${line.replace(/^steps?/i, "What steps").replace(/[?\s]+$/, "")}?`;
        cards.push(makeCard(term, items.join("; ")));
        continue;
      }
    }

    const answerMarker = line.match(/\bans(?:wer)?\s*:\s*/i);
    if (answerMarker?.index !== undefined) {
      const question = line.slice(0, answerMarker.index).replace(/[?\s]+$/, "");
      const answer = line.slice(answerMarker.index + answerMarker[0].length).trim();
      if (question && answer) cards.push(makeCard(`${question}?`, sentenceCase(answer)));
      continue;
    }

    const explicitSeparator = line.includes("::") ? "::" : line.includes("\t") ? "\t" : null;
    if (explicitSeparator) {
      const [term, ...rest] = line.split(explicitSeparator);
      const definition = rest.join(explicitSeparator).trim();
      if (term.trim() && definition) {
        const embedded = parseEmbeddedQuestion(term, definition);
        cards.push(makeCard(embedded.prompt, definition, embedded.choices));
      }
      continue;
    }

    const dashMatch = line.match(/\s[-–—]\s/);
    const statement = dashMatch?.index !== undefined ? line.slice(0, dashMatch.index) : line;
    const example = dashMatch?.index !== undefined ? line.slice(dashMatch.index + dashMatch[0].length) : undefined;
    const card = cardFromStatement(statement, example);
    if (card) cards.push(card);
  }

  return cards.slice(0, 100);
}

const STOP_WORDS = new Set([
  "about", "after", "again", "allows", "also", "and", "applications", "are", "because",
  "between", "can", "computer", "designed", "does", "each", "etc", "example", "from",
  "have", "into", "main", "many", "other", "provides", "specific", "that", "their", "there",
  "these", "they", "this", "through", "uses", "using", "very", "what", "when", "which", "with",
]);

function keywordTopics(text: string) {
  const normalized = text.toLowerCase();
  const topics: string[] = [];
  const add = (label: string) => {
    if (!topics.includes(label)) topics.push(label);
  };

  if (/\boperating systems?\b|\bos\b/i.test(text)) add("Operating Systems");
  if (/\bsoftware\b/i.test(text)) add("Software");
  if (/\bhardware\b|\bcpu\b|\bgpu\b|\bram\b/i.test(text)) add("Hardware");
  if (/\bresources?\b|\bresource management\b/i.test(text)) add("Resource Management");
  if (/\bandroid\b|\bactivity lifecycle\b/i.test(text)) add("Android Development");
  if (/\bdatabase\b|\bsql\b|\bdbms\b/i.test(text)) add("Databases");
  if (/\bnetwork(?:ing|s)?\b|\btcp\b|\bip address\b/i.test(text)) add("Networking");
  if (/\bcybersecurity\b|\bsecurity\b|\bencryption\b/i.test(text)) add("Cybersecurity");
  if (/\bbiology\b|\bcell(?:s|ular)?\b|\bgenetics?\b/i.test(text)) add("Biology");
  if (/\bchemistry\b|\batoms?\b|\bmolecules?\b/i.test(text)) add("Chemistry");

  const frequency = new Map<string, number>();
  normalized.match(/[a-z][a-z0-9-]{3,}/g)?.forEach((word) => {
    if (STOP_WORDS.has(word) || topics.some((topic) => topic.toLowerCase().includes(word))) return;
    frequency.set(word, (frequency.get(word) ?? 0) + 1);
  });

  [...frequency.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 4)
    .forEach(([word]) => add(word[0].toUpperCase() + word.slice(1)));

  return topics;
}

export function suggestNoteTitles(text: string): string[] {
  if (text.trim().length < 12) return [];

  const topics = keywordTopics(text);
  const primary = topics[0] ?? "Study Notes";
  const secondary = topics[1];
  const tertiary = topics[2];
  const normalized = text.toLowerCase();
  const themedTitle = /\bresources?\b|\bmanag(?:e|es|er|ement|ing)\b/.test(normalized)
    ? `${primary}: Roles & Resource Management`
    : /\bsteps?\b|\bprocess(?:es)?\b|\blifecycle\b/.test(normalized)
      ? `${primary}: Processes & Key Steps`
      : `${primary}: Concepts & Examples`;

  const candidates = [
    `${primary}: Core Concepts`,
    secondary ? `${primary} & ${secondary}` : `${primary}: Key Terms`,
    themedTitle,
    secondary && tertiary
      ? `${primary}: ${secondary}, ${tertiary} & Key Terms`
      : `${primary}: Review Questions & Key Terms`,
    `${primary} Study Guide`,
  ];

  return [...new Set(candidates)].slice(0, 5);
}
