import assert from 'node:assert/strict';
import { test } from 'node:test';
import { encodeSharedSet, sharedSnapshot, sharedProgressKey, sharedStudyPath, validShareId } from '../src/pages/admin/flashbolt/sharing/sharedSet.ts';

const set = { id: 'private-id', title: 'Threads', description: 'Chapter 4', subject: 'OS', color: 'violet', updatedAt: 'today', folders: ['private'], mastered: { secret: true }, email: 'private@example.com', cards: [
  { id: 'q1', term: 'What do threads share?', definition: 'Code', questionType: 'multiple-choice', answerChoices: ['Code', 'Registers'], correctAnswers: ['Code'], explanation: 'Threads share process code.', references: ['Slide 2'], choiceExplanations: { Registers: 'Registers are per thread.' }, learnEnabled: true, secret: 'private', autoTypePreviousChoices: ['old'] },
] };
test('snapshot retains complete learning content and excludes private/editor fields', () => {
  const snapshot = sharedSnapshot(set);
  assert.equal(snapshot.id, 'shared-set');
  assert.equal(snapshot.cards[0].explanation, set.cards[0].explanation);
  assert.deepEqual(snapshot.cards[0].answerChoices, ['Code', 'Registers']);
  assert.deepEqual(snapshot.cards[0].references, ['Slide 2']);
  assert.deepEqual(snapshot.cards[0].choiceExplanations, { Registers: 'Registers are per thread.' });
  for (const hidden of ['private-id', 'private@example.com', 'secret', 'autoTypePreviousChoices', 'folders', 'mastered']) assert(!encodeSharedSet(set).includes(hidden), hidden);
  snapshot.cards[0].answerChoices.push('new');
  assert.equal(set.cards[0].answerChoices.length, 2);
});
test('empty/malformed/duplicate/oversized sets fail before publishing', () => {
  for (const bad of [null, {}, { ...set, title: '' }, { ...set, cards: [] }, { ...set, cards: [{ id: 'bad' }] }, { ...set, cards: [set.cards[0], set.cards[0]] }, { ...set, description: '🦊'.repeat(250000) }]) assert.throws(() => encodeSharedSet(bad));
});
test('unsafe image protocols are excluded while valid study images remain', () => {
  for (const url of ['javascript:alert(1)', 'data:image/svg+xml,<svg/>']) assert.equal(sharedSnapshot({ ...set, cards: [{ ...set.cards[0], imageData: url }] }).cards[0].imageData, undefined);
  const imageData = 'data:image/png;base64,AAAA';
  assert.equal(sharedSnapshot({ ...set, cards: [{ ...set.cards[0], imageData }] }).cards[0].imageData, imageData);
});
test('links and progress are isolated by share and revision', () => {
  const id = 'Abcdefghijklmnopqrst';
  assert(validShareId(id)); assert(!validShareId('../private')); assert(!validShareId(''));
  assert.equal(sharedStudyPath(id), `/flashbolt/shared/${id}/learn`);
  assert.notEqual(sharedProgressKey(id, '1'), sharedProgressKey(id, '2'));
  assert.notEqual(sharedProgressKey(id, '1'), sharedProgressKey('OtherShare', '1'));
  assert(!sharedProgressKey(id, '1').startsWith('flashbolt.local'));
});

test('folder snapshots include every member in folder order and exclude private metadata', async () => {
  const { encodeSharedFolder, sharedFolderSnapshot } = await import('../src/pages/admin/flashbolt/sharing/sharedSet.ts');
  const second = { ...set, id: 'second', title: 'Scheduling' };
  const payload = encodeSharedFolder({ id: 'private-folder', name: 'Operating Systems', setIds: ['second', set.id], semester: 'private-semester' }, [set, second, { ...set, id: 'excluded', title: 'Excluded set' }]);
  const folder = sharedFolderSnapshot(JSON.parse(payload));
  assert.deepEqual(folder.sets.map(item => item.title), ['Scheduling', 'Threads']);
  assert.deepEqual(folder.sets.map(item => item.id), ['shared-set-1', 'shared-set-2']);
  for (const hidden of ['private-folder', 'private-semester', 'private-id', 'private@example.com', 'Excluded set', 'mastered', 'autoTypePreviousChoices']) assert(!payload.includes(hidden), hidden);
  assert.deepEqual(sharedFolderSnapshot(JSON.parse(JSON.stringify(folder))), folder);
});

test('empty, missing, malformed and oversized folder contents cannot be published', async () => {
  const { encodeSharedFolder } = await import('../src/pages/admin/flashbolt/sharing/sharedSet.ts');
  const folder = { id: 'folder', name: 'Course', setIds: [set.id] };
  assert.throws(() => encodeSharedFolder({ ...folder, setIds: [] }, [set]));
  assert.throws(() => encodeSharedFolder(folder, []));
  assert.throws(() => encodeSharedFolder(folder, [{ ...set, cards: [] }]));
  assert.throws(() => encodeSharedFolder(folder, [{ ...set, description: '🦊'.repeat(250000) }]));
});

test('a large folder can share its usable sets even with empty and untitled drafts', async () => {
  const { encodeSharedFolder, sharedFolderSnapshot } = await import('../src/pages/admin/flashbolt/sharing/sharedSet.ts');
  const sets = Array.from({ length: 46 }, (_, index) => ({ ...set, id: `set-${index}`, title: index === 1 ? '  ' : `Chapter ${index}`, cards: index === 0 ? [] : set.cards }));
  const folder = { id: 'course', name: 'Cloud Computing', setIds: sets.map(item => item.id) };
  const snapshot = sharedFolderSnapshot(JSON.parse(encodeSharedFolder(folder, sets)));
  assert.equal(snapshot.sets.length, 45);
  assert.equal(snapshot.sets[0].title, 'Untitled set 1');
  assert(snapshot.sets.every(item => item.cards.length === 1));
  assert.equal(sets[1].title, '  ', 'Publishing must not rename the original');
  assert.equal(sets[0].cards.length, 0);
});

test('folder validation identifies the set with malformed cards', async () => {
  const { encodeSharedFolder } = await import('../src/pages/admin/flashbolt/sharing/sharedSet.ts');
  assert.throws(() => encodeSharedFolder({ id: 'folder', name: 'Course', setIds: [set.id] }, [{ ...set, title: 'Broken chapter', cards: [{ id: 'bad' }] }]), /Could not share “Broken chapter”: This set contains an invalid card/);
});

test('subject links include only matching members of their folder and have independent stable keys', async () => {
  const { subjectShareFolder, collectionShareKey, folderShareKey, encodeSharedFolder } = await import('../src/pages/admin/flashbolt/sharing/sharedSet.ts');
  const sets = [set, { ...set, id: 'second', subject: ' os ', title: 'Scheduling' }, { ...set, id: 'other', subject: 'Cloud' }, { ...set, id: 'outside', title: 'Outside folder' }];
  const folder = { id: 'course', name: 'Course', setIds: ['other', 'second', set.id] };
  const subject = subjectShareFolder(folder, 'OS', sets);
  assert.deepEqual(subject.setIds, ['second', set.id]);
  assert.deepEqual(JSON.parse(encodeSharedFolder(subject, sets)).sets.map(item => item.title), ['Scheduling', 'Threads']);
  assert.equal(collectionShareKey(subject), collectionShareKey(subjectShareFolder(folder, ' os ', sets)));
  assert.notEqual(collectionShareKey(subject), folderShareKey(folder.id));
  assert.notEqual(collectionShareKey(subject), collectionShareKey(subjectShareFolder({ ...folder, id: 'another' }, 'OS', sets)));
  assert.notEqual(collectionShareKey(subject), collectionShareKey(subjectShareFolder(folder, 'Cloud', sets)));
  assert(!collectionShareKey(subjectShareFolder(folder, 'AWS / Cloud', sets)).includes('/'));
});

test('blank subjects share the same General group displayed in the folder', async () => {
  const { subjectShareFolder } = await import('../src/pages/admin/flashbolt/sharing/sharedSet.ts');
  const sets = [{ ...set, subject: ' ' }, { ...set, id: 'general', subject: 'General' }];
  assert.deepEqual(subjectShareFolder({ id: 'course', name: 'Course', setIds: sets.map(item => item.id) }, 'General', sets).setIds, sets.map(item => item.id));
});
