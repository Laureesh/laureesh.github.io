import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

test('public source excludes private applications and personal exports', () => {
  for (const path of ['src/pages/admin', 'src/assets/admin', 'src/data/adminPrivatePages.ts', 'notebook-backup.json']) {
    assert.equal(existsSync(path), false, `${path} must stay outside the public source`);
  }
  for (const path of ['src/App.tsx', 'src/components/Navbar.tsx', 'src/components/CommandPalette.tsx', 'README.md']) {
    assert.doesNotMatch(readFileSync(path, 'utf8'), /\/admin-dashboard|pages\/admin|admin_bootstrap/);
  }
  assert.match(readFileSync('.gitignore', 'utf8'), /^\.private-workspace\/$/m);
});
