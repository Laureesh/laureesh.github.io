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
  test(`Library manages folders and replaces the Folders page at ${width}px`, async () => {
    const page = await mount('folders', width);
    try {
      await page.getByRole('heading', { name: 'Every set, in one place.' }).waitFor();
      assert.equal(await page.getByRole('link', { name: 'Folders', exact: true }).count(), 0);
      await page.getByRole('button', { name: '＋ New folder', exact: true }).click();
      let modal = page.getByRole('dialog', { name: 'Name your folder' });
      await modal.getByRole('textbox', { name: 'Folder name', exact: true }).fill('Library folder test');
      await modal.getByRole('checkbox').first().check();
      await modal.getByRole('button', { name: 'Create folder', exact: true }).click();
      await page.waitForFunction(() => window.savedLibrary?.folders.some(folder => folder.name === 'Library folder test'));
      const original = await page.evaluate(() => ({
        sets: window.savedLibrary.sets.map(set => set.id),
        folder: window.savedLibrary.folders.find(folder => folder.name === 'Library folder test'),
      }));
      const filters = page.getByRole('button', { name: /^Filter and sort/ });
      if (await filters.isVisible()) await filters.click();
      await page.getByRole('button', { name: 'Edit Library folder test', exact: true }).click();
      modal = page.getByRole('dialog', { name: 'Edit your folder' });
      await modal.getByRole('textbox', { name: 'Folder name', exact: true }).fill('Renamed library folder');
      await modal.getByRole('button', { name: 'Save changes', exact: true }).click();
      const chip = page.locator('.library-folder-chip').filter({ hasText: 'Renamed library folder' });
      await chip.getByRole('link').click();
      await page.getByRole('heading', { name: 'Renamed library folder', exact: true }).waitFor();
      await page.getByRole('link', { name: '← Library', exact: true }).click();
      await page.getByRole('heading', { name: 'Every set, in one place.' }).waitFor();
      if (await filters.isVisible() && await filters.getAttribute('aria-expanded') === 'false') await filters.click();
      await page.getByRole('button', { name: 'Edit Renamed library folder', exact: true }).click();
      modal = page.getByRole('dialog', { name: 'Edit your folder' });
      await modal.getByRole('button', { name: 'Delete folder', exact: true }).click();
      let confirmation = page.getByRole('dialog', { name: 'Delete folder?', exact: true });
      await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click();
      assert(await modal.isVisible(), 'cancel preserves the folder editor');
      await modal.getByRole('button', { name: 'Delete folder', exact: true }).click();
      confirmation = page.getByRole('dialog', { name: 'Delete folder?', exact: true });
      await confirmation.getByRole('button', { name: 'Delete folder', exact: true }).click();
      await page.waitForFunction(id => window.savedLibrary && !window.savedLibrary.folders.some(folder => folder.id === id), original.folder.id);
      assert.deepEqual(await page.evaluate(() => window.savedLibrary.sets.map(set => set.id)), original.sets, 'deleting a folder preserves all sets');
      assert.equal(await page.locator('.library-folder-chip').filter({ hasText: 'Renamed library folder' }).count(), 0);
      assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'folder controls fit the viewport');
    } finally { await page.close(); }
  });
}
