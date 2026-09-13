import assert from 'node:assert/strict';
import test from 'node:test';
import { clipboardTextToHtml, readClipboardNote } from '../src/pages/admin/notebook/clipboardNote.ts';

test('clipboard text preserves line breaks and treats markup as literal text', () => {
  assert.equal(clipboardTextToHtml('One\r\nTwo\n\n<script>alert(1)</script> & text'), '<p>One<br>Two<br><br>&lt;script&gt;alert(1)&lt;/script&gt; &amp; text</p>');
});
test('empty and whitespace-only clipboard text creates a blank note', () => {
  assert.equal(clipboardTextToHtml(''), '<p><br></p>');
  assert.equal(clipboardTextToHtml(' \n\t'), '<p><br></p>');
});
test('clipboard denial falls back to a blank note', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { readText: async () => { throw new Error('Denied'); } } });
  assert.equal(await readClipboardNote(), '<p><br></p>');
  delete navigator.clipboard;
});
test('unavailable clipboard falls back to a blank note', async () => {
  assert.equal(await readClipboardNote(), '<p><br></p>');
});
