import assert from 'node:assert/strict';
import test from 'node:test';
import { formatQuestionsForCopy } from '../src/pages/admin/flashbolt/copyQuestions.ts';
import { importQuestionCorrections } from '../src/pages/admin/flashbolt/importCorrections.ts';

const original = [{ id: 'keep-id', term: 'Pick two', definition: 'One; Three', answerChoices: ['One', 'Two', 'Three'], correctAnswers: ['One', 'Three'], explanation: 'First paragraph.\n\nSecond paragraph.', choiceExplanations: { Two: 'Wrong.\nMore detail.' }, references: ['https://example.com'], imageData: 'keep-image', learnEnabled: false }];

test('copy/edit/import preserves answers, multiline explanations, and card identity', () => {
  const text = formatQuestionsForCopy('Title', original).replace('Pick two', 'Select two').replace('First paragraph.', 'Corrected paragraph.');
  const [updated] = importQuestionCorrections(text, original);
  assert.equal(updated.term, 'Select two');
  assert.equal(updated.id, original[0].id);
  assert.equal(updated.imageData, 'keep-image');
  assert.equal(updated.learnEnabled, false);
  assert.equal(updated.explanation, 'Corrected paragraph.\n\nSecond paragraph.');
  assert.deepEqual(updated.correctAnswers, ['One', 'Three']);
  assert.deepEqual(updated.choiceExplanations, original[0].choiceExplanations);
  assert.equal(updated.questionType, 'select-all');
  assert.equal(original[0].term, 'Pick two');
});

test('rejects incomplete, misnumbered, and invalid-answer imports without changing originals', () => {
  const text = formatQuestionsForCopy('Title', original);
  assert.throws(() => importQuestionCorrections(text, [...original, ...original]));
  assert.throws(() => importQuestionCorrections(text.replace('Question 1:', 'Question 2:'), original));
  assert.throws(() => importQuestionCorrections(text.replace('Correct answers: One; Three', 'Correct answers: Missing'), original));
  assert.equal(original[0].term, 'Pick two');
});
