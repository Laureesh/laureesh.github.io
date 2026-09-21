import assert from 'node:assert/strict';
import test from 'node:test';
import { updateLearnCardProgress } from '../src/pages/admin/flashbolt/learn-engine.ts';
import { buildReviewQueue, reviewReason, mergeReviewProgress } from '../src/pages/admin/flashbolt/review-engine.ts';
const now = new Date('2026-09-21T12:00:00Z');
test('correct recall spaces reviews and a miss resets the interval', () => {
 let progress;
 for (const days of [1, 2, 4, 8, 16, 30, 30]) {
  progress = updateLearnCardProgress(progress, true, 0, now);
  assert.equal(Date.parse(progress.nextReviewAt) - now.getTime(), days * 86400000);
 }
 progress = updateLearnCardProgress(progress, false, 0, now);
 assert.equal(Date.parse(progress.nextReviewAt) - now.getTime(), 600000);
 assert.equal(progress.correctStreak, 0);
 progress = updateLearnCardProgress(progress, true, 0, now);
 assert.equal(Date.parse(progress.nextReviewAt) - now.getTime(), 86400000);
});
test('old progress remains reviewable, future cards wait, weak cards recover', () => {
 assert.equal(reviewReason(undefined, now), 'New card');
 const progress = updateLearnCardProgress(undefined, true, 0, now);
 assert.equal(reviewReason(progress, now), null);
 assert.equal(reviewReason({...progress, nextReviewAt: undefined}, now), 'Due today');
 assert.equal(reviewReason({...progress, nextReviewAt: 'invalid'}, now), 'Due today');
 assert.equal(reviewReason({...progress, nextReviewAt: now.toISOString()}, now), 'Due today');
 assert.equal(reviewReason({...progress, misses: 2, correctStreak: 1}, now), 'Frequently missed');
 assert.equal(reviewReason({...progress, misses: 2, correctStreak: 2}, now), null);
});
test('queue prioritizes mistakes, handles duplicate card IDs across sets, and excludes incomplete cards', () => {
 const card = {id:'same',term:'Question',definition:'Answer'};
 const progress = updateLearnCardProgress(undefined, false, 0, now);
 const queue = buildReviewQueue([
  {id:'new',title:'New',cards:[card, {id:'empty',term:'',definition:''}]},
  {id:'weak',title:'Weak',cards:[card]},
  {id:'later',title:'Later',cards:[card]},
 ], {weak:{cards:{same:{...progress, misses:2}},updatedAt:now.toISOString()},later:{cards:{same:updateLearnCardProgress(undefined,true,0,now)},updatedAt:now.toISOString()}}, now);
 assert.deepEqual(queue.map(entry => entry.setId), ['weak','new']);
});
test('sync preserves the newest result per card without losing other device progress', () => {
 const older = updateLearnCardProgress(undefined, false, 0, new Date('2026-09-20T12:00:00Z'));
 const newer = updateLearnCardProgress(older, true, 0, now);
 const cloud = {s:{cards:{a:newer,b:older},updatedAt:now.toISOString()}};
 const local = {s:{cards:{a:older,c:newer},updatedAt:now.toISOString()}};
 const merged = mergeReviewProgress(cloud,local);
 assert.deepEqual(merged.s.cards, {a:newer,b:older,c:newer});
 assert.deepEqual(mergeReviewProgress(merged, local), merged);
});
