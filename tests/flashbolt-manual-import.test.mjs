import assert from 'node:assert/strict';
import test from 'node:test';
import { parseNotes } from '../src/pages/admin/flashbolt/note-parser.ts';

const awsPairs = [
  ['Which AWS service lets you query data in Amazon S3 using SQL?', 'Amazon Athena'],
  ['Which AWS service provides managed search capabilities?', 'Amazon CloudSearch'],
  ['Which AWS service runs and scales Elasticsearch clusters?', 'Amazon Elasticsearch Service (ES)'],
  ['Which AWS service provides a hosted Hadoop framework?', 'Amazon Elastic MapReduce (EMR)'],
];
const contents = cards => cards.map(({ term, definition }) => [term, definition]);

test('AWS question :: answer lines each become a separate card', () => {
  for (const newline of ['\n', '\r\n', '\r', '\n\n']) {
    const cards = parseNotes(awsPairs.map(pair => pair.join(' :: ')).join(newline));
    assert.deepEqual(contents(cards), awsPairs);
    assert.equal(new Set(cards.map(card => card.id)).size, awsPairs.length);
  }
});

test('large explicit imports retain every card instead of stopping at 100', () => {
  const pairs = Array.from({ length: 240 }, (_, i) => [`Which service handles task ${i + 1}?`, `Service ${i + 1}`]);
  assert.deepEqual(contents(parseNotes(pairs.map(pair => pair.join(' :: ')).join('\n'))), pairs);
});

test('tab-separated imports, blank lines, and literal answer separators survive', () => {
  assert.deepEqual(contents(parseNotes('  First? :: Namespace::Member\n\nSecond?\tAnother answer  ')), [
    ['First?', 'Namespace::Member'], ['Second?', 'Another answer'],
  ]);
});

test('multiline blocks preserve question text and answer line breaks', () => {
  assert.deepEqual(contents(parseNotes('Explain this scenario:\nAn application fails. :: Check the logs.\nThen retry.\n\nWhat next? :: Monitor recovery.')), [
    ['Explain this scenario: An application fails.', 'Check the logs.\nThen retry.'],
    ['What next?', 'Monitor recovery.'],
  ]);
});
