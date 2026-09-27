import assert from 'node:assert/strict';
import test from 'node:test';
import { parseQuizResults } from '../src/pages/admin/flashbolt/note-parser.ts';
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
