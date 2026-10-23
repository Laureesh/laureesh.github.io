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
  await page.route('**/src/services/flashboltLibrary.ts', route => route.fulfill({ contentType: 'application/javascript', body: 'export const loadFlashboltLibrary=async()=>null; export const mergeAndSaveFlashboltLibrary=async(_,data)=>data; export const saveFlashboltLibrary=async()=>{};' }));
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
  return page;
}



for (const width of [1491, 390]) {
  test(`grouped Learn text sizes, persistence and reset at ${width}px`, async () => {
    const page = await mount('learn', width);
    const font = selector => page.locator(selector).first().evaluate(element => parseFloat(getComputedStyle(element).fontSize));
    const setSize = async (name, value) => {
      await page.getByRole('slider', { name, exact: true }).fill(String(value));
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
    };
    const samples = {
      'Question title': '.question-card h1',
      'Answer choices & inputs': '.answer-choice-title',
      'Header & progress': '.learn-current-question > strong',
      'Knowledge panel': '.knowledge-level-button',
      'Rounds panel': '.learn-round-remaining > strong',
      'Labels, setup & summary': '.learn-question-stage > span',
    };
    try {
      await page.getByRole('button', { name: /Start Learn/ }).click();
      const original = {};
      for (const [name, selector] of Object.entries(samples)) original[name] = await font(selector);
      await page.getByRole('button', { name: /Options/ }).click();
      assert.equal(await page.getByRole('slider').count(), 7);
      for (const [name, selector] of Object.entries(samples)) {
        await setSize(name, 150);
        assert(Math.abs(await font(selector) - original[name] * 1.5) < .1, name);
        await setSize(name, 100);
        assert.equal(await font(selector), original[name], `default restored: ${name}`);
      }
      await setSize('Answer choices & inputs', 200);
      assert.equal(await font(samples['Question title']), original['Question title']);
      await page.getByRole('button', { name: 'Close options', exact: true }).click();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.reload();
      await page.locator('.flashbolt-shell:not([inert])').waitFor();
      const start = page.getByRole('button', { name: /Start Learn|Resume session/ }).first();
      if (await start.isVisible()) await start.click();
      await page.getByRole('button', { name: /Options/ }).click();
      assert.equal(await page.getByRole('slider', { name: 'Answer choices & inputs', exact: true }).inputValue(), '200');
      await page.getByRole('button', { name: 'Reset text sizes', exact: true }).click();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
      for (const [name, selector] of Object.entries(samples)) {
        await page.waitForFunction(([selector, size]) => parseFloat(getComputedStyle(document.querySelector(selector)).fontSize) === size, [selector, original[name]]);
        assert.equal(await font(selector), original[name]);
      }
      await page.getByRole('button', { name: 'Close options', exact: true }).click();
      await page.locator('.answer-grid button').first().click();
      const feedbackSize = await font('.feedback-copy > strong');
      await page.getByRole('button', { name: /Options/ }).click();
      await setSize('Feedback & explanations', 150);
      assert.equal(await font('.feedback-copy > strong'), feedbackSize * 1.5);
      for (const name of [...Object.keys(samples), 'Feedback & explanations']) await setSize(name, 200);
      await page.getByRole('button', { name: 'Close options', exact: true }).click();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'maximum sizes fit viewport');
      await page.screenshot({ path: `/tmp/learn-text-sizes-${width}.png`, fullPage: true });
    } finally { await page.close(); }
  });
}
