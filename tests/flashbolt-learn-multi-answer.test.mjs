import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { withCorrectChoiceAnswers } from '../src/pages/admin/flashbolt/questionTypeDetection.ts';
import { chooseAdaptiveQuestionKind } from '../src/pages/admin/flashbolt/learn-engine.ts';

const source = readFileSync(new URL('../src/pages/admin/flashbolt/Flashbolt.tsx', import.meta.url), 'utf8');
const names = ['learnAnswerSide', 'enabledLearnKinds', 'learnQuestionKind', 'learnChoices', 'selectAllChoices', 'correctAnswersForCard', 'cleanChoiceAnswer'];
const functions = names.map(name => source.match(new RegExp('function ' + name + '\\([^]*?\\n}'))[0]).join('\n');
const context = vm.createContext({
  withCorrectChoiceAnswers, chooseAdaptiveQuestionKind,
  normalizeAnswer: value => value.trim().toLowerCase(),
  shuffleValues: values => values,
  parseEmbeddedQuestion: term => ({ prompt: term, choices: [] }),
});
vm.runInContext(ts.transpile(functions, { target: ts.ScriptTarget.ES2022 }), context);
const card = {
  id: 'advisor',
  term: 'Which of the following is a suggestion made by an AWS Trusted Advisor? (Select two.)',
  definition: 'Cost optimization; Performance',
  answerChoices: ['Cost optimization', 'Auditing', 'Serverless architecture', 'Performance', 'Scalability'],
};
const plain = value => JSON.parse(JSON.stringify(value));

test('Learn uses separate selections for saved multi-answer cards at every stage', () => {
  for (const saved of [card, { ...card, correctAnswers: ['Cost optimization', 'Performance'] }]) {
    for (let stage = 0; stage <= 3; stage++) {
      assert.equal(context.learnQuestionKind({ multipleChoice: true }, stage, saved.definition, stage, saved), 'select-all');
      assert.equal(context.learnAnswerSide({ answerTerms: true }, stage, saved), 'definition');
    }
    const set = { cards: [saved, { id: 'other', definition: 'Unrelated answer' }] };
    assert.deepEqual(plain(context.learnChoices(set, saved, 'definition', 0)), card.answerChoices);
    assert.deepEqual(plain(context.selectAllChoices(set, saved, 'definition')), {
      correctParts: ['Cost optimization', 'Performance'],
      choices: card.answerChoices,
    });
  }
});

test('Single-answer questions still use multiple choice and include a missing answer', () => {
  const single = { ...card, term: 'Choose one.', definition: 'Support', correctAnswers: ['Support'] };
  assert.equal(context.learnQuestionKind({ multipleChoice: true }, 0, single.definition, 0, single), 'multiple-choice');
  assert.deepEqual(plain(context.learnChoices({ cards: [single] }, single, 'definition', 0)), [...card.answerChoices, 'Support']);
});
