import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { readFileSync } from 'node:fs';
const viteHash = JSON.parse(readFileSync(new URL('../node_modules/.vite/deps/_metadata.json', import.meta.url))).browserHash;
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:5173';
const question = 'Q1. Which of the following are advantages of the AWS Cloud (Select TWO) - Module 1: Cloud Concepts';
const choices = 'A. AWS management of user permissions\nB. Ability to quickly change requirements\nC. High economies of scale\nD. Increased deployment time\nE. Increased fixed expenses';

async function paste(locator, text) {
  await locator.focus();
  await locator.evaluate((element, text) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', text);
    element.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }));
  }, text);
  await locator.page().waitForTimeout(200);
}

test('all switches on: pasting does not advance; Select TWO waits for the second correct answer', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 950, height: 800 } });
    await page.route('**/src/contexts/AuthContext.tsx', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useAuth = () => ({user:null});' }));
    await page.route('**/src/services/flashboltLibrary.ts', route => route.fulfill({ contentType: 'application/javascript', body: 'export const loadFlashboltLibrary = async () => null; export const mergeAndSaveFlashboltLibrary = async (_, data) => data; export const saveFlashboltLibrary = async () => {};' }));
    await page.route('**/advance-test', route => route.fulfill({ contentType: 'text/html', body: `
      <!doctype html><div id="root"></div><script type="module">
      import RefreshRuntime from '/@react-refresh';
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {};
      window.$RefreshSig$ = () => type => type;
      window.__vite_plugin_react_preamble_installed__ = true;
      for (const key of ['autoScrollQuestion', 'autoScrollChoices', 'autoScrollCorrect']) localStorage.setItem('flashbolt.local.v1.' + key, 'true');
      window.advances = [];
      const originalScroll = HTMLElement.prototype.scrollIntoView;
      HTMLElement.prototype.scrollIntoView = function (...args) { window.advances.push(this.className); return originalScroll.apply(this, args); };
      const React = (await import('/node_modules/.vite/deps/react.js')).default;
      const { createRoot } = (await import('/node_modules/.vite/deps/react-dom_client.js')).default;
      const { MemoryRouter } = await import('/node_modules/.vite/deps/react-router-dom.js?v=${viteHash}');
      const { default: Flashbolt } = await import('/src/pages/admin/flashbolt/Flashbolt.tsx');
      createRoot(document.getElementById('root')).render(React.createElement(MemoryRouter, { initialEntries:['/admin-dashboard/private-pages/flashbolt/create'] }, React.createElement(Flashbolt)));
      </script>` }));
    page.on('pageerror', e => console.error(e));
    await page.goto(`${origin}/advance-test`);
    const first = page.locator('.card-editor').first();
    const term = first.locator('.card-text-field textarea').first();
    await term.waitFor();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.getByRole('switch', { checked: true }).count(), 3);
    await term.focus();
    await paste(term, `${question}\n${choices}`);
    assert.equal(await first.locator('.choice-correct-toggle[aria-pressed="true"]').count(), 0);
    assert.deepEqual(await page.evaluate(() => window.advances), []);
    await paste(first.getByRole('textbox', { name: 'Choice A for card 1', exact: true }), choices);
    assert.deepEqual(await page.evaluate(() => window.advances), []);
    await first.getByRole('button', { name: 'Mark choice B as correct', exact: true }).evaluate(button => button.click());
    await page.waitForTimeout(100);
    assert.deepEqual(await page.evaluate(() => window.advances), []);
    await first.getByRole('button', { name: 'Mark choice C as correct', exact: true }).evaluate(button => button.click());
    await page.waitForTimeout(100);
    assert.equal((await page.evaluate(() => window.advances)).length, 1);
    // Exercise the real paste handlers for all eight switch combinations.
    for (let mask = 0; mask < 8; mask++) {
      await page.reload();
      await term.waitFor();
      const switches = page.getByRole('switch');
      for (let index = 0; index < 3; index++) {
        if (!(mask & (1 << index))) await switches.nth(index).evaluate(input => input.click());
      }
      await paste(term, `${question}\n${choices}`);
      assert.equal((await page.evaluate(() => window.advances)).length, mask && !(mask & 4) ? 1 : 0, `question+choices paste, switches ${mask}`);
      await page.evaluate(() => { window.advances = []; });
      await paste(first.getByRole('textbox', { name: 'Choice A for card 1', exact: true }), choices);
      assert.equal((await page.evaluate(() => window.advances)).length, (mask & 2) && !(mask & 4) ? 1 : 0, `choices paste, switches ${mask}`);
    }

  } finally { await browser.close(); }
});
