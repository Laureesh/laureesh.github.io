import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

const source = readFileSync(new URL('../src/pages/admin/flashbolt/Flashbolt.tsx', import.meta.url), 'utf8');
const record = source.match(/  function recordLearnResult\([^]*?\n  }/)[0];
function answer(kind, answer, correct = false) {
  const context = vm.createContext({
    selectedSet: { id: 'set' }, currentLearnCard: { id: 'card', explanation: 'General reasoning', choiceExplanations: { Wrong: 'Why it is wrong', Right: 'Why it is right' } },
    learnAnswer: null, currentLearnQuestionKind: kind, currentTrueFalse: { answer: false, statement: 'Wrong' },
    currentSelectAll: { choices: ['Wrong', 'Right', 'Also right'], correctParts: ['Right', 'Also right'] }, learnSelectedAnswers: ['Wrong', 'Right'],
    currentLearnCorrectAnswer: 'Right', currentLearnPrompt: 'Pick an answer', currentLearnAnswerSide: 'definition',
    learnHistory: [], learnSequence: 2, currentLearnChoices: ['Wrong', 'Right', 'Other'], learnOptions: {}, learnRound: 1, learnRoundIds: ['card'], learnIndex: 0, learnRetryIds: [], learnPendingIds: [], learnRetryPass: false, learnGoal: 'cram', learnConfidenceLabel: () => 'Learning', selectedLearnProgress: {}, EMPTY_LEARN_CARD_PROGRESS: {}, learnMasteryTarget: 2,
    updateLearnCardProgress: () => ({ confidence: 1 }),
    setLearnHistory: history => { context.saved = history; },
    setLearnAnswer: value => { context.learnAnswer = value; },
    setLearnMissedIds() {}, setLearnLastCorrect() {}, setLearnLastConfidence() {}, playLearnSound() {}, setLearnMasteredIds() {}, setLearnPendingIds() {}, setLearnRetryIds() {},
    setData: update => { context.persisted = update({ mastered: {}, activeLearn: { setId: 'set' } }); },
  });
  vm.runInContext(ts.transpile(record, { target: ts.ScriptTarget.ES2022 }), context);
  context.recordLearnResult(correct, answer);
  return context;
}
test('review saves the chosen wrong answer, correct answer, and both explanations', () => {
  const c = answer('multiple-choice', 'Wrong');
  assert.equal(c.saved[0].answer, 'Wrong');
  assert.equal(c.saved[0].correctAnswer, 'Right');
  assert.equal(c.saved[0].explanation, 'General reasoning');
  assert.equal(c.saved[0].reasons.length, 2);
  assert.equal(c.saved[0].cardId, 'card');
  assert.equal(c.saved[0].choices.join(','), 'Wrong,Right,Other');
  assert.equal(c.persisted.activeLearn.history, c.saved);
  c.recordLearnResult(true, 'Right');
  assert.equal(c.saved.length, 1, 'An answered question cannot be graded again during review');
  assert.equal(c.saved[0].answer, 'Wrong');
});
test('true/false review preserves the statement and the correct boolean answer', () => {
  const c = answer('true-false', 'True');
  assert.equal(c.saved[0].correctAnswer, 'False');
  assert.match(c.saved[0].prompt, /matching definition is: Wrong/);
});
test('select-all review includes every correct answer and chosen answer reasoning', () => {
  const c = answer('select-all', 'Wrong; Right');
  assert.equal(c.saved[0].correctAnswer, 'Right; Also right');
  assert.equal(c.saved[0].reasons.length, 2);
});
test('correct written answers retain their original text', () => {
  const c = answer('written', 'right', true);
  assert.equal(c.saved[0].answer, 'right');
  assert.equal(c.saved[0].correct, true);
});

test('previous question renders inline with the full disabled answer grid and saved feedback', () => {
  const require = createRequire(import.meta.url);
  const component = readFileSync(new URL('../src/pages/admin/flashbolt/LearnHistory.tsx', import.meta.url), 'utf8');
  const context = vm.createContext({ exports: {}, require: name => name === './ExplanationLinks' ? { default: ({ text }) => text } : name === './referenceUrl' ? { referenceUrl: value => value } : require(name) });
  vm.runInContext(ts.transpile(component, { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }), context);
  const attempt = answer('multiple-choice', 'Wrong').saved[0];
  const html = renderToStaticMarkup(createElement(context.exports.default, { attempt, onNext() {}, onReturn() {}, explanation: 'Latest explanation', references: ['https://example.com/reference'] }));
  assert.doesNotMatch(html, /<dialog/);
  assert.match(html, /question-card ready-to-continue/);
  assert.match(html, /class="answer-grid"/);
  assert.match(html, /disabled="" class="incorrect has-explanation"/);
  assert.match(html, /disabled="" class="correct has-explanation"/);
  assert.match(html, /disabled="" class="muted"/);
  assert.match(html, /Latest explanation/);
  assert.match(html, /Why it is wrong/);
  assert.match(html, /https:\/\/example.com\/reference/);
  assert(html.indexOf('>Wrong</strong>') < html.indexOf('>Right</strong>'));
});
