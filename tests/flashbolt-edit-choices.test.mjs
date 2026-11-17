import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDetectedQuestionType, editedChoiceType } from '../src/pages/admin/flashbolt/questionTypeDetection.ts';

test('custom true/false choices survive subsequent auto-detection and retain the answer', () => {
  const card = { id: 'q', term: 'True or false: RAM is fast.', definition: 'True', correctAnswers: ['True'], questionType: 'true-false', autoTypePreviousChoices: ['old', 'choices'] };
  const answerChoices = ['True', 'Not always'];
  const edited = { ...card, ...editedChoiceType(card, answerChoices), answerChoices };
  assert.equal(edited.questionType, 'multiple-choice');
  assert.equal(edited.questionTypeMode, 'manual');
  assert.equal(edited.autoTypePreviousChoices, undefined);
  assert.deepEqual(applyDetectedQuestionType(edited), edited);
  assert.deepEqual(edited.correctAnswers, ['True']);
});

test('canonical true/false and select-all types remain intact when editing choices', () => {
  const card = { id: 'q', term: '', definition: '' };
  assert.equal(editedChoiceType({ ...card, questionType: 'true-false' }, ['true', 'False']).questionType, 'true-false');
  assert.equal(editedChoiceType({ ...card, questionType: 'select-all' }, ['A', 'B']).questionType, 'select-all');
});
