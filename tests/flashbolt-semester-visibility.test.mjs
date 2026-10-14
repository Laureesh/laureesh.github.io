import assert from 'node:assert/strict';
import test from 'node:test';
import {mergeSemesterVisibility,normalizeSemesterVisibility} from '../src/pages/admin/flashbolt/semesterVisibility.ts';
test('a stale device does not overwrite newer hidden or restored sections',()=>{
 const cloud={'Spring 2025':{hidden:true,updatedAt:20},'No semester':{hidden:false,updatedAt:30}};
 const local={'Spring 2025':{hidden:false,updatedAt:10},'No semester':{hidden:true,updatedAt:15}};
 assert.deepEqual(mergeSemesterVisibility(cloud,local),cloud);
 assert.deepEqual(mergeSemesterVisibility(local,cloud),cloud);
});
test('independent changes on different devices merge without losing either',()=>{
 const a={'Fall 2024':{hidden:true,updatedAt:10}};
 const b={'No semester':{hidden:true,updatedAt:20}};
 assert.deepEqual(mergeSemesterVisibility(a,b),{...a,...b});
 assert.deepEqual(mergeSemesterVisibility(a,{}),a);
});
test('bad backups are ignored and explicit visible choices are retained',()=>{
 assert.deepEqual(normalizeSemesterVisibility(null),{});
 assert.deepEqual(normalizeSemesterVisibility({bad:{hidden:'yes',updatedAt:1},badTime:{hidden:true,updatedAt:'tomorrow'},valid:{hidden:false,updatedAt:2}}),{valid:{hidden:false,updatedAt:2}});
});
