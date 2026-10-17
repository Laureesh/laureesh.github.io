import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:5173';

let browser;
before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await browser?.close(); });

async function mount(view, width = 300) {
  const module = await (await fetch(`${origin}/src/pages/admin/flashbolt/Flashbolt.tsx`)).text();
  const hash = module.match(/react-router-dom\.js\?v=([^"']+)/)[1];
  const page = await browser.newPage({ viewport: { width, height: 700 } });
  await page.route('**/src/contexts/AuthContext.tsx', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useAuth=()=>({user:{uid:"usability-test"}});' }));
  await page.route('**/src/services/flashboltLibrary.ts', route => route.fulfill({ contentType: 'application/javascript', body: 'window.cloudReads=0; export const loadFlashboltLibrary=async()=>{window.cloudReads++;return null;}; export const mergeAndSaveFlashboltLibrary=async(_,data)=>{window.savedLibrary=data;return data;}; export const saveFlashboltLibrary=async()=>{};' }));
  const path = ['flashcards', 'learn', 'test'].includes(view) ? `no-semester/itec-4450/midterm-mobile-application-development/${view}` : view;
  await page.route('**/usability-test', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div><script type="module">
    import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type; window.__vite_plugin_react_preamble_installed__=true;
    const React=(await import('/node_modules/.vite/deps/react.js')).default;
    const {createRoot}=(await import('/node_modules/.vite/deps/react-dom_client.js')).default;
    const {MemoryRouter}=await import('/node_modules/.vite/deps/react-router-dom.js?v=${hash}');
    const {default:Flashbolt}=await import('/src/pages/admin/flashbolt/Flashbolt.tsx');
    createRoot(document.getElementById('root')).render(React.createElement(MemoryRouter,{initialEntries:['/admin-dashboard/private-pages/flashbolt/${path}']},React.createElement(Flashbolt)));
  </script>` }));
  page.on('pageerror', error => console.error(error.message));
  page.on('console', message => { if (message.type() === 'error') console.error(message.text()); });
  await page.goto(`${origin}/usability-test`);
  await page.locator('.flashbolt-shell:not([inert])').waitFor();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addStyleTag({ content: '*, html { scroll-behavior: auto !important; }' });
  await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
  return page;
}


test('right-click Edit set keeps editor controls responsive', async () => {
  const page = await mount('library', 1400);
  try {
    const tile = page.locator('.set-tile').first();
    await tile.scrollIntoViewIfNeeded();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await tile.click({ button: 'right' });
    const reads = await page.evaluate(() => window.cloudReads);
    const started = Date.now();
    await page.getByRole('menuitem', { name: 'Edit set', exact: true }).click();
    await page.locator('.card-editor').first().waitFor();
    console.log('Edit transition ms:', Date.now() - started, 'mounted cards:', await page.locator('.card-editor').count(), 'textareas:', await page.locator('.card-editor textarea').count());
    assert.equal(await page.evaluate(() => window.cloudReads), reads);
    const totalCards = await page.locator('.card-editor-wrap').count();
    assert((await page.locator('.card-editor').count()) < totalCards, 'offscreen editors should stay deferred');
    await page.getByRole('checkbox', { name: /Include in Learn mode/ }).first().uncheck();
    await page.getByRole('checkbox', { name: /Include in Learn mode/ }).first().check();
    assert.equal(await page.getByRole('menu').count(), 0);
    const last = page.locator('.card-editor-wrap').last();
    await last.scrollIntoViewIfNeeded();
    await last.locator('.card-text-field textarea').first().fill('Edited last card');
    await page.getByRole('button', { name: '＋ Add another card', exact: true }).click();
    await page.getByRole('button', { name: 'Go to next available card ↓', exact: true }).evaluate(button => button.click());
    const addedTerm = page.locator('.card-editor-wrap').last().locator('.card-text-field textarea').first();
    await addedTerm.waitFor();
    assert(await addedTerm.evaluate(element => element === document.activeElement));
    await page.locator('.editor-save-actions').getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForFunction(() => window.savedLibrary?.sets.some(set => set.cards.some(card => card.term === 'Edited last card')));
    const savedCards = await page.evaluate(() => window.savedLibrary.sets.find(set => set.cards.some(card => card.term === 'Edited last card')).cards);
    assert.equal(savedCards.length, totalCards + 1, 'saving retains unmounted cards and the newly added draft card');
  } finally { await page.close(); }
});

for (const reducedMotion of ['no-preference', 'reduce']) {
  test(`first jump to card 10 stays aligned after deferred cards resize (${reducedMotion})`, async () => {
    const page = await mount('create', 1800);
    try {
      await page.emulateMedia({ reducedMotion });
      const cards = Array.from({ length: 30 }, (_, index) =>
        `Question ${index + 1}: ${'Explain this security scenario. '.repeat(12 + index % 5)} :: ${'A detailed answer that makes the editor taller. '.repeat(20 + index % 4)}`,
      ).join('\n');
      await page.getByRole('textbox', { name: 'Cards to import' }).fill(cards);
      await page.getByRole('button', { name: 'Import pasted cards', exact: true }).click();
      await page.waitForFunction(() => document.querySelectorAll('.card-editor-wrap').length === 30);
      const target = page.locator('.card-editor-wrap').nth(9);
      await target.waitFor({ state: 'attached' });
      assert.equal(await target.locator('.card-editor-placeholder').count(), 1, 'target starts deferred');
      await page.getByRole('button', { name: /^Go to card 10,/ }).click();
      await page.waitForFunction(() => {
        const card = document.querySelectorAll('.card-editor-wrap')[9];
        const header = document.querySelector('.topbar');
        return Math.abs(card.getBoundingClientRect().top - header.getBoundingClientRect().bottom - 12) < 2;
      });
      // Let all nearby IntersectionObserver reveals and textarea resize frames run.
      await page.waitForTimeout(800);
      const position = await target.evaluate(element => ({
        top: element.getBoundingClientRect().top,
        expected: document.querySelector('.topbar').getBoundingClientRect().bottom + 12,
        focused: element.contains(document.activeElement),
      }));
      assert(Math.abs(position.top - position.expected) < 2, JSON.stringify(position));
      assert(position.focused, 'the selected card receives keyboard focus');
      assert(await page.locator('.card-editor-placeholder').count() > 0, 'other distant cards remain deferred');
      const bounds = await target.boundingBox();
      await page.mouse.move(bounds.x + bounds.width / 2, position.top + 120);
      await page.mouse.wheel(0, -500);
      await page.waitForTimeout(350);
      assert((await target.boundingBox()).y > position.top + 100, 'manual scrolling is not pulled back');
    } finally { await page.close(); }
  });
}
