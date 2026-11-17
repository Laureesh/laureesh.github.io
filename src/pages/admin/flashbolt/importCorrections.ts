import type { Card } from './Flashbolt';

export function importQuestionCorrections(text: string, existing: Card[]): Card[] {
  const blocks = [...text.replace(/\r\n?/g, '\n').matchAll(/^Question (\d+):[ \t]*([\s\S]*?)(?=^Question \d+:|(?![\s\S]))/gm)];
  if (!blocks.length || blocks.length !== existing.length) throw new Error(`Paste all ${existing.length} numbered questions from Copy all questions. No questions were changed.`);
  return blocks.map((block, index) => {
    if (Number(block[1]) !== index + 1) throw new Error('Question numbers must appear once each, in order starting at 1.');
    const sections = block[2].split(/^(Answer choices:|Correct answers?:|Explanation:|Choice explanations:|Matching pairs:|References:)[ \t]*/m);
    const fields = new Map<string, string>();
    for (let i = 1; i < sections.length; i += 2) fields.set(sections[i], sections[i + 1].trim());
    const term = sections[0].trim();
    const answer = fields.get('Correct answer:') ?? fields.get('Correct answers:');
    if (!term || !answer || answer === 'Not marked') throw new Error(`Question ${index + 1} needs a question and correct answer.`);
    const answerChoices = fields.has('Answer choices:')
      ? fields.get('Answer choices:')!.split(/^[A-Z]\.\s*/m).map(value => value.trim()).filter(Boolean)
      : undefined;
    const correctAnswers = answerChoices?.includes(answer) ? [answer] : fields.has('Correct answers:') ? answer.split(/;\s*/) : [answer];
    if (answerChoices && (answerChoices.length < 2 || correctAnswers.some(correct => !answerChoices.some(choice => choice.toLocaleLowerCase() === correct.toLocaleLowerCase())))) {
      throw new Error(`Question ${index + 1}: each correct answer must match an answer choice.`);
    }
    const matchingPairs = fields.get('Matching pairs:')?.split('\n').map((line, pairIndex) => {
      const separator = line.indexOf(' → ');
      if (separator < 0) throw new Error(`Question ${index + 1}: use “prompt → match” for matching pairs.`);
      return { id: existing[index].matchingPairs?.[pairIndex]?.id ?? `${existing[index].id}-pair-${pairIndex}`, left: line.slice(0, separator), right: line.slice(separator + 3) };
    });
    const choiceExplanations: Record<string, string> = {};
    const explanationLines = fields.get('Choice explanations:')?.split('\n') ?? [];
    let explanationChoice = '';
    for (const line of explanationLines) {
      const choice = answerChoices?.find(value => line.startsWith(`${value}:`));
      if (choice) { explanationChoice = choice; choiceExplanations[choice] = line.slice(choice.length + 1).trim(); }
      else if (explanationChoice) choiceExplanations[explanationChoice] += `\n${line}`;
      else if (line.trim()) throw new Error(`Question ${index + 1}: a choice explanation must start with its answer choice followed by a colon.`);
    }
    return {
      ...existing[index], term, definition: answer, answerChoices, correctAnswers,
      explanation: fields.get('Explanation:') ?? '', choiceExplanations,
      references: fields.get('References:')?.split('\n').filter(Boolean) ?? [],
      matchingPairs, questionTypeMode: 'manual', autoTypePreviousChoices: undefined,
      questionType: matchingPairs ? 'matching' : answerChoices ? correctAnswers.length > 1 ? 'select-all' : 'multiple-choice' : 'flashcard',
    };
  });
}
