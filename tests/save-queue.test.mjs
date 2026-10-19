import assert from 'node:assert/strict';
import test from 'node:test';
import { createSaveQueue } from '../src/services/saveQueue.ts';

test('overlapping saves read cloud state after the previous commit', async () => {
  const enqueue = createSaveQueue();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let cloud = 0;
  const first = enqueue('user', async () => { await gate; cloud = 1; });
  const second = enqueue('user', async () => { assert.equal(cloud, 1); cloud = 2; });
  await enqueue('other-user', async () => { assert.equal(cloud, 0); });
  release();
  await Promise.all([first, second]);
  assert.equal(cloud, 2);
});

test('a failed save rejects its caller without blocking subsequent saves', async () => {
  const enqueue = createSaveQueue();
  const failure = new Error('permission denied');
  const first = enqueue('user', async () => { throw failure; });
  const second = enqueue('user', async () => 'saved');
  await assert.rejects(first, error => error === failure);
  assert.equal(await second, 'saved');
  assert.equal(await enqueue('user', async () => 'saved again'), 'saved again');
});
