import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/pages/admin/flashbolt/Flashbolt.tsx', import.meta.url), 'utf8');
const selection = source.match(/const enabledLearnCards = .*;/)[0];
const handler = source.match(/  function beginLearnSession\([^]*?\n  }/)[0];

test('Learn includes default and enabled questions, excludes disabled questions even on retry', () => {
  const cards = [{ id: 'default' }, { id: 'enabled', learnEnabled: true }, { id: 'disabled', learnEnabled: false }];
  for (const retryIds of [undefined, ['disabled', 'default']]) {
    let sessionIds;
    const context = {
      selectedSet: { id: 'set', cards }, data: {}, learnGoal: 'memorize', learnOptions: {},
      ...Object.fromEntries([...handler.matchAll(/\b(set\w+)\(/g)].map(([, name]) => [name, () => {}])),
      rankAdaptiveCardIds: ids => ids,
      setLearnSessionIds: ids => { sessionIds = ids; },
      retryIds,
    };
    vm.runInNewContext(ts.transpile(`${selection}\n${handler}\nbeginLearnSession(undefined, undefined, retryIds);`), context);
    assert.deepEqual(sessionIds, retryIds ? ['default'] : ['default', 'enabled']);
  }
});
