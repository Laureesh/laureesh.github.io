import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, imports = {}) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports, require: (id) => {
    if (!(id in imports)) throw new Error(`Unexpected import: ${id}`);
    return imports[id];
  } });
  return exports;
}
const parser = load('../src/utils/projectInterviewPrep.ts');
const sample = () => ({ version: 1, projects: { demo: Array.from({ length: 10 }, (_, i) => ({ question: `Question ${i}`, answer: `Answer ${i}` })) } });

test('imports require exactly ten nonempty question/answer pairs per project', () => {
  assert.equal(parser.parseInterviewPrep(sample()).projects.demo.length, 10);
  for (const value of [null, {}, { ...sample(), version: 2 }, { version: 1, projects: [] }]) {
    assert.throws(() => parser.parseInterviewPrep(value));
  }
  const short = sample(); short.projects.demo.pop();
  assert.throws(() => parser.parseInterviewPrep(short));
  const blank = sample(); blank.projects.demo[0].answer = '   ';
  assert.throws(() => parser.parseInterviewPrep(blank));
  const path = sample(); path.projects['bad/path'] = path.projects.demo;
  assert.throws(() => parser.parseInterviewPrep(path));
});

function service(allowed) {
  const calls = [];
  const api = load('../src/services/projectInterviewPrep.ts', {
    'firebase/firestore': {
      getDoc: async () => { calls.push('read'); return { exists: () => true, data: () => ({ interviewPrep: sample() }) }; },
      setDoc: async (ref, value) => { calls.push({ ref, value }); },
      serverTimestamp: () => 'server-time',
    },
    '../firebase/firestore': { documentRef: (collection, id) => `${collection}/${id}` },
    './adminSecurity': { assertCurrentUserCanAccessAdmin: async () => {
      if (!allowed) throw new Error('Access denied');
    } },
    '../utils/projectInterviewPrep': parser,
  });
  return { api, calls };
}

test('denied admin checks prevent both reads and writes', async () => {
  const { api, calls } = service(false);
  await assert.rejects(api.loadInterviewPrep(), /Access denied/);
  await assert.rejects(api.importInterviewPrep(sample()), /Access denied/);
  assert.equal(calls.length, 0);
});

test('imports force private draft storage regardless of input metadata', async () => {
  const { api, calls } = service(true);
  await api.importInterviewPrep({ ...sample(), visibility: 'public', status: 'published' });
  assert.equal(calls[0].ref, 'pages/project-interview-prep');
  assert.equal(calls[0].value.visibility, 'private');
  assert.equal(calls[0].value.status, 'draft');
  assert.equal((await api.loadInterviewPrep()).projects.demo.length, 10);
});

const seed = new URL('../notes/interview-prep.local/project-interview-prep.json', import.meta.url);
test('private local seed covers every showcased project with ten answers', { skip: !existsSync(seed) }, () => {
  const prep = parser.parseInterviewPrep(JSON.parse(readFileSync(seed, 'utf8')));
  const catalog = readFileSync(new URL('../src/data/projectShowcase.ts', import.meta.url), 'utf8');
  const ids = [...catalog.matchAll(/^    id: "([^"]+)",/gm)].map((m) => m[1]);
  assert.deepEqual(Object.keys(prep.projects).sort(), ids.sort());
  assert.equal(Object.values(prep.projects).flat().length, 90);
  const assets = new URL('../dist/assets/', import.meta.url);
  if (existsSync(assets)) {
    const publicCode = readdirSync(assets).filter((name) => name.endsWith('.js'))
      .map((name) => readFileSync(new URL(name, assets), 'utf8')).join('\n');
    for (const questions of Object.values(prep.projects)) {
      for (const { answer } of questions) assert.ok(!publicCode.includes(answer), 'Private answer leaked into build');
    }
  }
});
