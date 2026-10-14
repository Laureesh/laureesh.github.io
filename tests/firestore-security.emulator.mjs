import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
const require = createRequire(process.env.SECURITY_TOOLS_PACKAGE || import.meta.url);
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc, Timestamp, serverTimestamp } = require('firebase/firestore');
let env;
const profile = (uid, role = 'member') => ({
  uid, email: `${uid}@example.test`, displayName: uid, phoneNumber: null, photoURL: null,
  avatarStoragePath: null, role, status: 'active', bio: '', headline: '', username: null,
  location: null, skills: [], isPublic: false,
  socialLinks: {github:null, linkedin:null, website:null, twitter:null, youtube:null, email:null},
  preferences: {language:'en', notifications:{accountActivity:true,securityAlerts:true,productUpdates:false,marketingEmails:false},security:{loginAlerts:true,trustedDevicesOnly:false}},
  membership:{planId:'free',planName:'Free',status:'inactive',billingInterval:'monthly',autoRenew:false},
  createdAt:Timestamp.now(),updatedAt:Timestamp.now(),
});
const client = (uid, verified=true) => env.authenticatedContext(uid, {email:`${uid}@example.test`,email_verified:verified}).firestore();
before(async () => {
  env = await initializeTestEnvironment({projectId:'demo-portfolio-security',firestore:{rules:readFileSync('src/firebase/firestore.rules','utf8')}});
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    const db=context.firestore();
    for (const uid of ['member','enabled','disabled','unverified','revoked']) {
      await setDoc(doc(db,'users',uid),profile(uid,uid==='member'?'member':'admin'));
      if(uid!=='member' && uid!=='revoked') await setDoc(doc(db,'admin_bootstrap',uid),{enabled:uid!=='disabled',role:'admin'});
    }
    await setDoc(doc(db,'tasks','private'),{title:'private'});
    await setDoc(doc(db,'pages','private'),{visibility:'private',status:'published'});
    await setDoc(doc(db,'users','member','notebook','library'),{data:{}});
  });
});
after(async()=>{await env?.cleanup();});
test('anonymous and ordinary users cannot read private records',async()=>{
  for(const db of [env.unauthenticatedContext().firestore(),client('member')]){
    await assertFails(getDoc(doc(db,'tasks','private')));
    await assertFails(getDoc(doc(db,'pages','private')));
    await assertFails(setDoc(doc(db,'admin_bootstrap','member'),{enabled:true,role:'admin'}));
  }
});
test('admin requires an enabled bootstrap, active profile, and verified token',async()=>{
  await assertSucceeds(getDoc(doc(client('enabled'),'tasks','private')));
  for(const db of [client('disabled'),client('revoked'),client('unverified',false)]) await assertFails(getDoc(doc(db,'tasks','private')));
});
test('members cannot promote themselves or alter membership',async()=>{
  await assertFails(updateDoc(doc(client('member'),'users','member'),{role:'admin'}));
  await assertFails(updateDoc(doc(client('member'),'users','member'),{'membership.planId':'pro'}));
});
test('disabled bootstrap cannot promote a member',async()=>{
  await env.withSecurityRulesDisabled(async context=>{await updateDoc(doc(context.firestore(),'users','disabled'),{role:'member'});});
  await assertFails(updateDoc(doc(client('disabled'),'users','disabled'),{role:'admin'}));
});
test('private user records cannot be read across accounts',async()=>{
  await assertSucceeds(getDoc(doc(client('member'),'users','member','notebook','library')));
  await assertFails(getDoc(doc(client('disabled'),'users','member','notebook','library')));
  await assertFails(getDoc(doc(client('disabled'),'users','member')));
});
test('word contributions require verified authentication and server timestamps',async()=>{
  const value={word:'sample',addedAt:serverTimestamp()};
  await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(),'rainbow-words','anonymous'),value));
  await assertFails(setDoc(doc(client('member',false),'rainbow-words','unverified'),value));
  await assertFails(setDoc(doc(client('member'),'rainbow-words','forged'),{word:'sample',addedAt:123}));
  await assertSucceeds(setDoc(doc(client('member'),'rainbow-words','valid'),value));
});
test('new profiles must use the authenticated email',async()=>{
  await assertFails(setDoc(doc(client('new-user'),'users','new-user'),{...profile('new-user'),email:'someone-else@example.test'}));
  await assertSucceeds(setDoc(doc(client('new-user'),'users','new-user'),profile('new-user')));
});
