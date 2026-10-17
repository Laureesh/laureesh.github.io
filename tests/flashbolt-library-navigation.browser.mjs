import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:5173';

const sets = Array.from({ length: 36 }, (_, index) => ({
  id: `nav-set-${index}`, title: `Set ${String(index + 1).padStart(2, '0')}`, subject: index % 2 ? 'Practice Questions' : 'Module Quizzes', description: 'Navigation fixture', color: 'violet', updatedAt: '2026-10-17T00:00:00Z', cards: [{ id: `card-${index}`, term: 'Question', definition: 'Answer' }],
}));
const fixture = { sets, folders: ['[ITEC 4320] Internet Security', '[ITEC 4000] Cloud Computing', '[ITEC 3600] Operating Systems'].map((name, index) => ({ id: `folder-${index}`, name, semester: 'Fall 2026', setIds: sets.slice(index * 12, index * 12 + 12).map(set => set.id) })), mastered: {}, sessions: 0 };

let browser;
before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await browser?.close(); });

async function mount(view, width = 300) {
  const module = await (await fetch(`${origin}/src/pages/admin/flashbolt/Flashbolt.tsx`)).text();
  const hash = module.match(/react-router-dom\.js\?v=([^"']+)/)[1];
  const page = await browser.newPage({ viewport: { width, height: 700 } });
  await page.route('**/src/contexts/AuthContext.tsx', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useAuth=()=>({user:{uid:"usability-test"}});' }));
  await page.route('**/src/services/flashboltLibrary.ts', route => route.fulfill({ contentType: 'application/javascript', body: `export const loadFlashboltLibrary=async()=>(${JSON.stringify(fixture)}); export const mergeAndSaveFlashboltLibrary=async(_,data)=>data; export const saveFlashboltLibrary=async()=>{};` }));
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
  test(`sticky folder and set navigation follows displayed content at ${width}px`, async () => {
    const page = await mount('library', width);
    try {
      const folders = page.getByRole('navigation', { name: 'Open folder' });
      assert.equal(await folders.getByRole('link').count(), 3);
      for (const name of ['Internet Security', 'Cloud Computing', 'Operating Systems']) {
        await folders.getByRole('link', { name: new RegExp(name) }).click();
        await page.getByRole('heading', { name: new RegExp(name) }).first().waitFor();
        const nav = page.getByRole('navigation', { name: 'Jump to set' });
        assert.equal(await nav.getByRole('button').count(), 12);
        const compareOrder = async () => assert.deepEqual(await nav.getByRole('button').allTextContents(), await page.locator('.library-page-content .set-tile-title').allTextContents());
        await compareOrder();
        await page.getByRole('combobox', { name: /^Sort sets in/ }).selectOption('title-desc');
        await compareOrder();
        const target = page.locator('.library-page-content .set-tile').nth(4);
        const targetId = await target.getAttribute('id');
        await nav.getByRole('button').nth(4).click();
        await page.waitForFunction(id => document.activeElement?.id === id, targetId);
        const top = (await target.boundingBox()).y;
        assert(Math.abs(top - (width > 780 ? 88 : 80)) < 2, `jump position: ${top}`);
        if (width > 900) {
          assert(Math.abs((await page.locator('.library-navigation-panel').boundingBox()).y - 88) < 2, 'navigation remains sticky');
        }
        const summary = page.locator('.library-navigation-panel summary');
        await summary.click();
        assert(!(await nav.isVisible()), 'navigation collapses');
        await summary.click();
        assert(await nav.isVisible(), 'navigation reopens');
        const title = await nav.getByRole('button').first().textContent();
        await page.getByRole('textbox', { name: 'Search your library' }).fill(title);
        assert.equal(await nav.getByRole('button').count(), 1, 'navigation respects search');
        await page.getByRole('textbox', { name: 'Search your library' }).fill('');
        await page.getByRole('link', { name: 'Your library', exact: true }).click();
        await folders.waitFor();
      }
      assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'layout fits viewport');
    } finally { await page.close(); }
  });
}
