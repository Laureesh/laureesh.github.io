import type { Card } from './Flashbolt';

export function formatQuestionsForCopy(title: string, cards: Card[]): string {
  const questions = cards.map((card, index) => {
    const lines = [`Question ${index + 1}: ${card.term}`];
    if (card.answerChoices?.length) {
      lines.push('Answer choices:', ...card.answerChoices.map((choice, i) => `${String.fromCharCode(65 + i)}. ${choice}`));
    }
    if (card.matchingPairs?.length) {
      lines.push('Matching pairs:', ...card.matchingPairs.map(pair => `${pair.left} → ${pair.right}`));
    }
    lines.push(`Correct answer${(card.correctAnswers?.length ?? 0) > 1 ? 's' : ''}: ${(card.correctAnswers?.length ? card.correctAnswers.join('; ') : card.definition) || 'Not marked'}`);
    if (card.explanation?.trim()) lines.push(`Explanation: ${card.explanation}`);
    const explanations = Object.entries(card.choiceExplanations ?? {}).filter(([, explanation]) => explanation.trim());
    if (explanations.length) lines.push('Choice explanations:', ...explanations.map(([choice, explanation]) => `${choice}: ${explanation}`));
    if (card.references?.length) lines.push('References:', ...card.references);
    return lines.join('\n');
  });
  return [title.trim() || 'Study set', ...questions].join('\n\n');
}
