import assert from 'node:assert/strict';
import test from 'node:test';
import { parseQuestionPaste } from '../src/pages/admin/flashbolt/questionPaste.ts';

test('splits the supplied ZAP question and standalone answer labels', () => {
  const question = 'After performing an automated scan on the OWASP Zed Attack Proxy (ZAP) tool, where can a security analyst find detailed information about a vulnerability finding such as cross-site scripting and its associated risk level?';
  assert.deepEqual(parseQuestionPaste(`${question}\r\n\r\nanswer\r\n\r\nA\r\nSpider tab\r\n\r\nB\r\nEvent log panel\r\n\r\nC\r\nAlerts tab\r\n\r\nD\r\nAdvisory tab`), {
    term: question, choices: ['Spider tab', 'Event log panel', 'Alerts tab', 'Advisory tab'],
  });
});

test('supports labeled, numbered, bulleted, and unlabeled options', () => {
  for (const options of ['A. Alpha\nB. Beta', '1) Alpha\n2) Beta', '• Alpha\n• Beta', 'Alpha\nBeta']) {
    assert.deepEqual(parseQuestionPaste(`Which option?\n${options}`), { term: 'Which option?', choices: ['Alpha', 'Beta'] });
  }
});

test('preserves multiline prompts and answers beginning with an article', () => {
  assert.deepEqual(parseQuestionPaste('Read this scenario.\nChoose the best answer.\nA\nA hacker\nB\nA contractor'), {
    term: 'Read this scenario.\nChoose the best answer.', choices: ['A hacker', 'A contractor'],
  });
});

test('ordinary text and a lone option remain normal pastes', () => {
  for (const text of ['What is DNS?', 'Some notes\nMore notes\nFinal notes', 'Question\nA. Only one']) assert.equal(parseQuestionPaste(text), null);
});
