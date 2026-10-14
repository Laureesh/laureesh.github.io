import assert from 'node:assert/strict';
import test from 'node:test';
import { describeNotebookSyncError } from '../src/pages/admin/notebook/notebookSyncStatus.ts';
const error=(code,message)=>Object.assign(new Error(message),{code});
test('sync errors distinguish permission, connectivity, and expired sessions',()=>{
 assert.match(describeNotebookSyncError(error('permission-denied','Missing permissions')),/Firebase rejected access/);
 assert.match(describeNotebookSyncError(error('firestore/unavailable','offline')),/could not be reached/);
 assert.match(describeNotebookSyncError(error('unauthenticated','expired')),/sign-in has expired/);
});
test('size errors retain the original detail for diagnosis',()=>{
 const message='Document exceeds maximum allowed size of 1048576 bytes';
 assert.match(describeNotebookSyncError(error('invalid-argument',message)),/cloud document size limit/);
 assert.ok(describeNotebookSyncError(error('invalid-argument',message)).includes(message));
});
test('unknown errors preserve detail without asserting a cause',()=>{
 assert.equal(describeNotebookSyncError(new Error('Unexpected problem')),'Unexpected problem');
});
