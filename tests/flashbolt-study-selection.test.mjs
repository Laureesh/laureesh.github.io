import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/pages/admin/flashbolt/Flashbolt.tsx', import.meta.url), 'utf8');

for (const mode of ['Learn', 'Test']) {
  const handler = source.match(new RegExp(`  function start${mode}\\([^]*?\\n  }`))[0];
  const javascript = ts.transpile(handler);
  for (const explicitSet of [true, false]) {
    test(`${mode} selects the ${explicitSet ? 'clicked' : 'current'} set before navigating`, () => {
      let selected = 'previous-set';
      let destination;
      const context = {
        selectedSetId: selected,
        learnOptions: {},
        ...Object.fromEntries([...handler.matchAll(/\b(set\w+)\(/g)].map(([, name]) => [name, () => {}])),
        setSelectedSetId: id => { selected = id; },
        navigate: (view, id) => {
          assert.equal(selected, id, 'the displayed cards must belong to the routed set');
          destination = { view, id };
        },
      };
      vm.createContext(context);
      vm.runInContext(javascript, context);
      context[`start${mode}`](explicitSet ? 'clicked-set' : { type: 'click' });
      assert.deepEqual(destination, { view: mode.toLowerCase(), id: explicitSet ? 'clicked-set' : 'previous-set' });
    });
  }
}
