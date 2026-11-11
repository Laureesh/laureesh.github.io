import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:5173';
let browser;
before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await browser?.close(); });

async function mount(view, width = 300, libraryFixture = { sets: [], folders: [], mastered: {}, sessions: 0 }) {
  const module = await (await fetch(`${origin}/src/pages/admin/flashbolt/Flashbolt.tsx`)).text();
  const hash = module.match(/react-router-dom\.js\?v=([^"']+)/)[1];
  const page = await browser.newPage({ viewport: { width, height: 700 } });
  page.setDefaultTimeout(10000);
  await page.route('**/src/contexts/AuthContext.tsx', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useAuth=()=>({user:{uid:"usability-test"}});' }));
  await page.route('**/src/services/flashboltLibrary.ts', route => route.fulfill({ contentType: 'application/javascript', body: `export const loadFlashboltLibrary=async()=>(${JSON.stringify(libraryFixture)}); export const mergeAndSaveFlashboltLibrary=async(_,data)=>data; export const saveFlashboltLibrary=async()=>{};` }));
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





for (const type of ['select-all', 'multiple-choice']) {
  test(`${type}: eliminate, restore, reveal and reset choices on mobile`, async () => {
    const card = { id: 'one', term: type === 'select-all' ? 'Which controls help? (Select two.)' : 'Which control helps?', definition: type === 'select-all' ? 'Validate input; Apply updates' : 'Validate input', questionType: type, answerChoices: ['Validate input', 'Apply updates', 'Share passwords'], correctAnswers: type === 'select-all' ? ['Validate input', 'Apply updates'] : ['Validate input'] };
    const fixture = { sets: [{ id: 'set', title: 'Elimination', color: '#22d3ee', subject: 'General', description: '', updatedAt: new Date().toISOString(), cards: [card, { ...card, id: 'two', term: card.term + ' Again.' }] }], folders: [], mastered: {}, sessions: 0 };
    const page = await mount('no-semester/unfiled/elimination/learn', 390, fixture);
    try {
      await page.getByRole('button', { name: /Start Learn/ }).click();
      const row = page.locator('.eliminatable-choice').filter({ has: page.getByRole('button', { name: 'Eliminate choice: Validate input', exact: true }) });
      const choice = row.locator(type === 'select-all' ? 'input' : '.answer-choice-button');
      if (type === 'select-all') await row.locator('label').click();
      await row.getByRole('button', { name: 'Eliminate choice: Validate input', exact: true }).click();
      const eliminated = page.locator('.eliminatable-choice.is-eliminated');
      assert.equal(await eliminated.count(), 1);
      assert.equal(await eliminated.locator(type === 'select-all' ? 'input' : '.answer-choice-button').isDisabled(), true);
      if (type === 'select-all') assert.equal(await eliminated.locator('input').isChecked(), false);
      assert.equal(await page.locator('.answer-feedback').count(), 0);
      await page.getByRole('button', { name: 'Restore choice: Validate input', exact: true }).click();
      assert.equal(await choice.isEnabled(), true);
      await page.getByRole('button', { name: 'Eliminate choice: Share passwords', exact: true }).click();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: `/tmp/elimination-${type}.png`, fullPage: true });
      if (type === 'select-all') {
        await page.locator('.select-all-grid label').filter({ hasText: 'Validate input' }).click();
        await page.locator('.select-all-grid label').filter({ hasText: 'Apply updates' }).click();
        await page.getByRole('button', { name: 'Check selections', exact: true }).click();
      } else await choice.click();
      assert.equal(await page.locator('.choice-eliminate-button:enabled').count(), 0);
      assert.equal(await page.locator('.eliminatable-choice.is-eliminated').count(), 0);
      await page.locator('.question-card h1').click();
      await page.waitForFunction(() => document.querySelectorAll('.choice-eliminate-button:enabled').length > 0);
      assert.equal(await page.locator('.choice-eliminate-button[aria-pressed="true"]').count(), 0);
    } catch (error) { console.error((await page.locator('body').innerText()).slice(-6000)); throw error; } finally { await page.close(); }
  });
}
