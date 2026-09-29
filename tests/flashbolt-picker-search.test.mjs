import assert from 'node:assert/strict';
import test from 'node:test';
import { matchesPickerSearch } from '../src/pages/admin/flashbolt/pickerSearch.ts';

test('chapter searches exclude unrelated chapters, course codes, parts, and counts', () => {
  assert.equal(matchesPickerSearch('chapter 3', 'Chapter 3 - Part 1 [ITEC 3600]'), true);
  for (const title of ['Chapter 11 - Part 1 [ITEC 3600]', 'Chapter 8 - Part 3 [ITEC 3600]', 'Chapter 30 [ITEC 3600]']) {
    assert.equal(matchesPickerSearch('chapter 3', title, '3 terms · Kahoot import'), false);
  }
});

test('search supports partial words, punctuation, metadata, and empty queries', () => {
  assert.equal(matchesPickerSearch('  CHAPTER  3 ', 'Chapter 3 - Part 4'), true);
  assert.equal(matchesPickerSearch('part 4', 'Chapter 3 - Part 4'), true);
  assert.equal(matchesPickerSearch('cloud comp', '[ITEC 4000] Cloud Computing'), true);
  assert.equal(matchesPickerSearch('fall 2026', 'Cloud Computing', 'Fall 2026 · 31 sets'), true);
  assert.equal(matchesPickerSearch('itec3600', '[ITEC 3600]'), true);
  assert.equal(matchesPickerSearch('', 'Any set'), true);
  assert.equal(matchesPickerSearch('missing', 'Any set'), false);
});
