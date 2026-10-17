import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { parseQuizResults, parseEmbeddedQuestion } from '../src/pages/admin/flashbolt/note-parser.ts';
import { applyDetectedQuestionType } from '../src/pages/admin/flashbolt/questionTypeDetection.ts';

const quiz = `6.11 Module Quiz
close modal
CyberDefense Pro
Score: 75%
Individual Responses
Question 1
Correct
An application accepts input.

What protects it?

answer

A
Validate input.

Correct Answer:
Correct

B
Ignore input.

Explanation
Validation checks input.

Keep this second paragraph.

Question 2
Partial
Which controls help? (Select two.)

answer

A
First control
with a second line.

Correct Answer:
Correct

B
Second control.

Correct Answer:
Correct

C
Wrong control.

Incorrect answer:
Incorrect
Explanation
Use both controls.

Question 3
Incorrect
Is this true?
answer
A
True
Incorrect answer:
Incorrect
B
False
Correct Answer:
Explanation
It is false.`;

test('module quiz imports prompts, choices, answers and paragraph-preserving explanations', () => {
  for (const newline of ['\n', '\r\n', '\r']) {
    const cards = parseQuizResults(quiz.replaceAll('\n', newline)).map(applyDetectedQuestionType);
    assert.equal(cards.length, 3);
    assert.equal(cards[0].term, 'An application accepts input.\n\nWhat protects it?');
    assert.deepEqual(cards[0].answerChoices, ['Validate input.', 'Ignore input.']);
    assert.equal(cards[0].definition, 'Validate input.');
    assert.equal(cards[0].explanation, 'Validation checks input.\n\nKeep this second paragraph.');
    assert.equal(cards[1].questionType, 'select-all');
    assert.deepEqual(cards[1].correctAnswers, ['First control\nwith a second line.', 'Second control.']);
    assert.equal(cards[1].answerChoices[2], 'Wrong control.');
    assert.equal(cards[1].explanation, 'Use both controls.');
    assert.equal(cards[2].questionType, 'true-false');
    assert.deepEqual(cards[2].correctAnswers, ['False']);
    assert.equal(cards[2].explanation, 'It is false.');
  }
});

test('does not infer correctness from the overall question score', () => {
  assert.deepEqual(parseQuizResults('Question 1\nCorrect\nPick an answer.\nanswer\nA\nOne\nB\nTwo\nExplanation\nSome explanation.'), []);
});

const monitoringQuiz = readFileSync(new URL('./fixtures/cyberdefense-monitoring-quiz.txt', import.meta.url), 'utf8');

test('question 10 keeps its supporting steps and four explicit choices through detection', () => {
  const cards = parseQuizResults(monitoringQuiz).map(applyDetectedQuestionType);
  assert.equal(cards.length, 10);
  const card = cards[9];
  assert.equal(card.term, 'Which data monitoring method do the steps below BEST describe?\n\nKeep a user log to document everyone that handles each piece of sensitive data.\nMonitor the system in real time.');
  assert.deepEqual(card.answerChoices, ['DNS monitoring', 'URL monitoring', 'File monitoring', 'DGA monitoring']);
  assert.deepEqual(card.correctAnswers, ['File monitoring']);
  assert.equal(card.definition, 'File monitoring');
  assert.match(card.explanation, /Use software that compares the current file state to a known baseline/);
  for (const imported of cards) {
    assert.deepEqual(parseEmbeddedQuestion(imported.term, imported.definition, imported.answerChoices), { prompt: imported.term, choices: imported.answerChoices });
    assert(imported.correctAnswers.every(answer => imported.answerChoices.includes(answer)));
  }
  assert.equal(cards[1].questionType, 'select-all');
  assert.equal(cards[7].correctAnswers.length, 3);
});

test('unstructured supporting text is not mistaken for choices without an answer match', () => {
  const card = parseQuizResults(monitoringQuiz)[9];
  assert.deepEqual(parseEmbeddedQuestion(card.term, card.definition), { prompt: card.term, choices: [] });
  assert.deepEqual(parseEmbeddedQuestion('Which action?\nRead the following scenario carefully.', 'Monitor files'), { prompt: 'Which action?\nRead the following scenario carefully.', choices: [] });
  assert.deepEqual(parseEmbeddedQuestion('Which tool?\nWireshark\nText editor', 'Wireshark'), { prompt: 'Which tool?', choices: ['Wireshark', 'Text editor'] });
  assert.deepEqual(parseEmbeddedQuestion('Which tools? A. Alpha B. Beta C. Gamma', 'Alpha; Gamma'), { prompt: 'Which tools?', choices: ['Alpha', 'Beta', 'Gamma'] });
});
