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


test('round panel tracks answers and fits beside the question', async () => {
  const page = await mount('learn', 1491);
  try {
    await page.getByRole('button', { name: /Start Learn/ }).click();
    await page.locator('.learn-rounds-panel').waitFor();
    assert.equal(await page.locator('.learn-round-remaining strong').innerText(), '7');
    assert.equal(await page.locator('.learn-round-list [aria-current="step"] strong').innerText(), 'Round 1');
    assert.equal(await page.locator('.learn-session-header .learn-exit').count(), 1);
    assert.equal(await page.locator('.learn-session-header .learn-options-button').count(), 1);
    const main = await page.locator('.learn-question-main').boundingBox();
    const left = await page.locator('.learn-knowledge-panel').boundingBox();
    const right = await page.locator('.learn-rounds-panel').boundingBox();
    assert(left.x + left.width <= main.x);
    assert(main.x + main.width <= right.x);
    await page.screenshot({ path: '/tmp/flashbolt-round-panel-desktop.png', fullPage: true });
    await page.locator('.answer-grid button').filter({ hasText: 'Hybrid app' }).click();
    assert.equal(await page.locator('.learn-round-remaining strong').innerText(), '6');
    await page.getByRole('button', { name: /Next question/ }).click();
    assert.equal(await page.locator('.learn-current-question strong').innerText(), '2');
    assert.equal(await page.locator('.learn-round-remaining strong').innerText(), '6');
    for (const width of [1024, 768, 375]) {
      await page.setViewportSize({ width, height: 850 });
      for (const selector of ['.learn-knowledge-panel', '.learn-question-main', '.learn-rounds-panel']) {
        const box = await page.locator(selector).boundingBox();
        assert(box.x >= 0 && box.x + box.width <= width + 1, selector + ' overflows at ' + width);
      }
    }
    await page.screenshot({ path: '/tmp/flashbolt-round-panel-mobile.png', fullPage: true });
  } finally { await page.close(); }
});
