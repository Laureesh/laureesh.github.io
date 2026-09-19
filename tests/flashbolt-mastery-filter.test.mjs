import assert from 'node:assert/strict';
import test from 'node:test';
import {masteryPercentage, matchesMasteryFilter, normalizeMasteryFilter} from '../src/pages/admin/flashbolt/masteryFilter.ts';
test('above and below keep the threshold itself visible, including endpoints',()=>{
 for(const threshold of [0,50,100]) for(const progress of [0,25,50,75,100]) {
  assert.equal(matchesMasteryFilter(progress,{mode:'above',percentage:threshold}),progress<=threshold);
  assert.equal(matchesMasteryFilter(progress,{mode:'below',percentage:threshold}),progress>=threshold);
  assert.equal(matchesMasteryFilter(progress,{mode:'all',percentage:threshold}),true);
 }
});
test('mastery uses existing cards and the same rounded percentage displayed on tiles',()=>{
 const cards=[{id:'a'},{id:'b'},{id:'c'}];
 assert.equal(masteryPercentage(cards,['a','a','deleted']),33);
 assert.equal(masteryPercentage(cards,['a','b']),67);
 assert.equal(masteryPercentage([],['a']),0);
 assert.equal(masteryPercentage(cards),0);
});
test('saved filters validate mode and clamp percentage',()=>{
 assert.deepEqual(normalizeMasteryFilter(null),{mode:'all',percentage:50});
 assert.deepEqual(normalizeMasteryFilter({mode:'invalid',percentage:NaN}),{mode:'all',percentage:50});
 assert.deepEqual(normalizeMasteryFilter({mode:'above',percentage:200}),{mode:'above',percentage:100});
 assert.deepEqual(normalizeMasteryFilter({mode:'below',percentage:-5}),{mode:'below',percentage:0});
});
