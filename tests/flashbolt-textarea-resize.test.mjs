import assert from 'node:assert/strict';
import test from 'node:test';
import { scheduleTextareaResize } from '../src/pages/admin/flashbolt/textareaResize.ts';

test('large editors batch height writes before reads and skip removed fields', () => {
  let callback;
  let frames = 0;
  const events = [];
  globalThis.requestAnimationFrame = fn => { callback = fn; return ++frames; };
  globalThis.cancelAnimationFrame = () => { callback = undefined; };
  const field = (id, isConnected = true) => ({
    isConnected,
    style: { set height(value) { events.push(`${id}:${value}`); } },
    get scrollHeight() { events.push(`${id}:read`); return 60; },
  });
  try {
    const first = field('a');
    scheduleTextareaResize(first);
    scheduleTextareaResize(first);
    scheduleTextareaResize(field('b'));
    scheduleTextareaResize(field('removed', false));
    const cancel = scheduleTextareaResize(field('cancelled'));
    cancel();
    assert.equal(frames, 1);
    callback();
    assert.deepEqual(events, ['a:auto', 'b:auto', 'a:read', 'b:read', 'a:60px', 'b:60px']);
    const cleanup = scheduleTextareaResize(first);
    cleanup();
    assert.equal(callback, undefined);
  } finally {
    delete globalThis.requestAnimationFrame;
    delete globalThis.cancelAnimationFrame;
  }
});
