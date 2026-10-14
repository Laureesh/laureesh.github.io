import assert from 'node:assert/strict';
import test from 'node:test';
import { parseQuizResults } from '../src/pages/admin/flashbolt/note-parser.ts';

test('copied answer-shown questions omit headers and controls and retain explanations', () => {
  const text = `Question 21&#x20;
AWS Cloud concepts
Which cloud concept supports growth?
✅ Answer Shown
💬 Discuss
🚩 Report
✅ Correct answer: Implement elasticity
Answer is Implement elasticity
Resources adjust to demand.
Reference:
https://example.com/reference
Question 22
AWS Cloud concepts
An application spans Availability Zones:
✅ Answer Shown
💬 Discuss
🚩 Report
✅ Correct answer: being highly available
Answer is being highly available
Question 24
AWS Cloud concepts
Which responsibilities? (Select two.)
✅ Answer Shown
💬 Discuss
🚩 Report
✅ Correct answer: Patching database software, Storage capacity planning
Answers are;
Patching database software
B. Storage capacity planning
Managed services handle these tasks.`;
  for (const newline of ['\n', '\r\n', '\r']) {
    const cards = parseQuizResults(text.replaceAll('\n', newline));
    assert.equal(cards.length, 3);
    assert.equal(cards[0].term, 'Which cloud concept supports growth?');
    assert.equal(cards[0].definition, 'Implement elasticity');
    assert.equal(cards[0].explanation, 'Resources adjust to demand.\nReference:\nhttps://example.com/reference');
    assert.equal(cards[1].term, 'An application spans Availability Zones:');
    assert.equal(cards[1].explanation, undefined);
    assert.deepEqual(cards[2].correctAnswers, ['Patching database software', 'Storage capacity planning']);
    assert.equal(cards[2].questionType, 'select-all');
    assert.equal(cards[2].explanation, 'Managed services handle these tasks.');
  }
});
