import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
const require = createRequire(process.env.SECURITY_TOOLS_PACKAGE || import.meta.url);
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { ref, uploadBytes, deleteObject } = require('firebase/storage');
let env;
before(async()=>{
  env=await initializeTestEnvironment({projectId:'demo-portfolio-security',storage:{rules:readFileSync('src/firebase/storage.rules','utf8')}});
});
after(async()=>{await env?.cleanup();});
test('only the owner can upload or delete an avatar',async()=>{
  const path='users/owner/avatars/photo.png';
  const data=new Uint8Array([137,80,78,71]);
  const metadata={contentType:'image/png'};
  await assertFails(uploadBytes(ref(env.unauthenticatedContext().storage(),path),data,metadata));
  await assertFails(uploadBytes(ref(env.authenticatedContext('other').storage(),path),data,metadata));
  await assertSucceeds(uploadBytes(ref(env.authenticatedContext('owner').storage(),path),data,metadata));
  await assertFails(deleteObject(ref(env.authenticatedContext('other').storage(),path)));
  await assertSucceeds(deleteObject(ref(env.authenticatedContext('owner').storage(),path)));
});
test('uploads reject active document types, oversized files, and arbitrary paths',async()=>{
  const storage=env.authenticatedContext('owner').storage();
  await assertFails(uploadBytes(ref(storage,'users/owner/avatars/active.svg'),new Uint8Array([1]),{contentType:'image/svg+xml'}));
  await assertFails(uploadBytes(ref(storage,'users/owner/avatars/large.png'),new Uint8Array(5*1024*1024+1),{contentType:'image/png'}));
  await assertFails(uploadBytes(ref(storage,'arbitrary/file.png'),new Uint8Array([1]),{contentType:'image/png'}));
});
