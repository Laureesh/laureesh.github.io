import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function check(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    assert.doesNotMatch(entry.name, /^(?:Flashbolt|Notebook|AdminFnLeaderboardPage)|notebook-backup|\.env|\.map$/i);
    if (entry.isDirectory()) check(path);
    else if (/\.(?:html|js|css|json)$/i.test(entry.name)) {
      assert.doesNotMatch(readFileSync(path, 'utf8'), /\/admin-dashboard|\.private-workspace|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, path);
    }
  }
}
check('dist');
console.log('Public build boundary checks passed.');
