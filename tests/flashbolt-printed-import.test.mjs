import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { parseQuizResults, parseNotes } from '../src/pages/admin/flashbolt/note-parser.ts';
import { applyDetectedQuestionType } from '../src/pages/admin/flashbolt/questionTypeDetection.ts';
const text = readFileSync(new URL('./fixtures/cyberdefense-printed-quiz.txt', import.meta.url), 'utf8');

test('printed review imports all ten questions and their explicit answers in order', () => {
  const cards = parseQuizResults(text).map(applyDetectedQuestionType);
  assert.equal(cards.length, 10);
  assert.deepEqual(cards.map(card => card.definition), [
    'Data exfiltration', 'DLP', 'Scout Suite',
    'Scout Suite is used to show potential security risks on cloud deployments.',
    'Prowler', 'Pacu', 'Pacu', 'Application', 'Encrypt the virtual server', 'Deterrent',
  ]);
  assert.match(cards[0].term, /^A security analyst/);
  assert.equal(cards[9].term, 'Which security control makes a system more difficult to attack?');
  for (const card of cards) {
    assert.equal(card.answerChoices.length, 4);
    assert.deepEqual(card.correctAnswers, [card.definition]);
    assert.ok(card.answerChoices.includes(card.definition));
    assert.equal(card.questionType, 'multiple-choice');
    assert.ok(card.explanation.length > 50);
    assert.doesNotMatch(JSON.stringify(card), /Individual Response|labsimapp|Passing Score|Question \d+ Incorrect|Copyright ©/);
  }
});

test('wrapped choices and a full-page explanation remain attached to question four', () => {
  const cards = parseQuizResults(text);
  assert.equal(cards[3].answerChoices[2], 'Scout Suite is used to determine software version risks on cloud deployments.');
  assert.match(cards[3].explanation, /^Scout Suite is used to show potential security risks/);
  assert.match(cards[3].explanation, /Scout Suite does not scan for viruses\.$/);
  assert.doesNotMatch(cards[3].explanation, /An organization moves/);
  assert.match(cards[4].term, /^An organization moves/);
  assert.doesNotMatch(cards[4].term, /does not scan for viruses/);
});

test('print import accepts CRLF and multiple explicit correct answers', () => {
  const cards = parseQuizResults(text.replace('B Data backup', 'B Data backup Correct').replaceAll('\n', '\r\n'));
  assert.equal(cards.length, 10);
  assert.equal(cards[0].questionType, 'select-all');
  assert.deepEqual(cards[0].correctAnswers, ['Data exfiltration', 'Data backup']);
});

test('does not guess answers when explicit correctness is missing', () => {
  assert.deepEqual(parseQuizResults(text.replaceAll(' Correct', '').replace(/\nCorrect\n/g, '\n')), []);
});

const ddos = readFileSync(new URL('./fixtures/cyberdefense-ddos-printed.txt', import.meta.url), 'utf8');
test('DDoS review imports ten questions despite wrapped sentences beginning with A', () => {
  const cards = parseQuizResults(ddos);
  assert.equal(cards.length, 10);
  assert.deepEqual(cards.map(card => card.definition), [
    'Set services to throttle or shut down.',
    "Configure the router to limit the amount of traffic coming from the attacker's IP address",
    'Smurf DDoS attack', 'Ping of death attack',
    'An attack in which fake UDP or ICMP packets larger than the MTU are sent to exhaust the processing resources.',
    'A DDoS attack', 'Application Layer DDoS', 'Application layer DDoS', 'Step 1',
    'Spoofing a target IP address by opening connections with multiple servers, then directing all SYN/ACK responses to the target server.',
  ]);
  assert.match(cards[4].answerChoices[2], /^A transport-level/);
  assert.match(cards[4].answerChoices[3], /^A network-level/);
  for (const card of cards) {
    assert.equal(card.answerChoices.length, 4);
    assert.ok(card.answerChoices.includes(card.definition));
    assert.doesNotMatch(card.term + card.explanation, /Individual Response|labsimapp|Passing Score/);
  }
});

test('printed quizzes never fall back to generating 100 ordinary note cards', () => {
  assert.equal(parseNotes(ddos).length, 10);
  const invalid = ddos.replace('B Set services to throttle or shut down. Correct', 'B Set services to throttle or shut down.');
  assert.deepEqual(parseNotes(invalid), []);
});
