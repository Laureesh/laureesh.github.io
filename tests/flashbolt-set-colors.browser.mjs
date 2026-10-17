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



for (const width of [1800, 390]) {
  test(`color picker search, filters, keyboard and saved accent at ${width}px`, async () => {
    const page = await mount('create', width);
    try {
      await page.locator('#set-color').click();
      const dialog = page.getByRole('dialog', { name: 'Choose set color' });
      await dialog.waitFor();
      const bounds = await dialog.boundingBox();
      assert(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
      assert(bounds.y >= 0 && bounds.y + bounds.height <= 701);
      await dialog.getByRole('button', { name: 'Greens', exact: true }).click();
      assert(await dialog.getByRole('button', { name: 'Sage Green, #7BA05B', exact: true }).count());
      const search = dialog.getByRole('searchbox');
      await search.fill('#AB274F');
      await dialog.getByRole('button', { name: 'Cherry Rose, #AB274F', exact: true }).click();
      await page.getByRole('button', { name: 'Color: Cherry Rose', exact: true }).waitFor();
      assert.equal(await dialog.count(), 0);
      await page.locator('#set-color').click();
      await dialog.getByRole('searchbox').fill('no such shade');
      assert(await dialog.getByText(/No matching colors/).isVisible());
      await page.keyboard.press('Escape');
      assert(await page.locator('#set-color').evaluate(element => element === document.activeElement));
      await page.locator('#set-title').fill('Color persistence test');
      await page.locator('.editor-save-actions').getByRole('button', { name: 'Save', exact: true }).click();
      await page.waitForFunction(() => window.savedLibrary?.sets.some(set => set.title === 'Color persistence test' && set.color === 'cherry-rose'));
      await page.getByRole('link', { name: 'Your library', exact: true }).click();
      const tile = page.locator('.set-tile').filter({ hasText: 'Color persistence test' });
      await tile.waitFor();
      assert.equal(await tile.evaluate(element => getComputedStyle(element).getPropertyValue('--set-color')), '#ab274f');
      assert.equal(await tile.locator('.set-accent').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(171, 39, 79)');
    } finally { await page.close(); }
  });
}
