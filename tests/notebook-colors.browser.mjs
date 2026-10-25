import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:5173';

for (const width of [1440, 390]) {
  test(`note colors use the shared picker, target the correct note, and persist at ${width}px`, async () => {
    const browser = await chromium.launch({ headless: true, args: ['--disable-features=LocalNetworkAccessChecks'] });
    try {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      page.setDefaultTimeout(15000);
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.route(/\/src\/contexts\/AuthContext\.tsx(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: 'export function useAuth(){return {user:null}}' }));
      await page.route('**/note-color-test', route => route.fulfill({ contentType: 'text/html', body: `
        <!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}</style></head><body><div id="root"></div><script type="module">
        import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
        const React=(await import('/node_modules/.vite/deps/react.js')).default;
        const {createRoot}=(await import('/node_modules/.vite/deps/react-dom_client.js')).default;
        const source=await (await fetch('/src/pages/admin/notebook/Notebook.tsx')).text();
        const {MemoryRouter}=await import(source.match(/from "([^"]*react-router-dom[^"]*)"/)[1]);
        if(!sessionStorage.getItem('seeded')){
          const timestamp=new Date().toISOString();
          localStorage.setItem('flashbolt.notebook.v1',JSON.stringify({folders:[],notes:[
            {id:'alpha',title:'Alpha note',html:'<p>Keep alpha content.</p>',folderId:null,tags:[],pinned:true,archived:false,createdAt:timestamp,updatedAt:timestamp,attachments:[],versions:[]},
            {id:'beta',title:'Beta note',html:'<p>Keep beta content.</p>',color:'cyan',folderId:null,tags:[],pinned:false,archived:false,createdAt:timestamp,updatedAt:timestamp,attachments:[],versions:[]}
          ]}));sessionStorage.setItem('seeded','yes');
        }
        const {default:Notebook}=await import('/src/pages/admin/notebook/Notebook.tsx');
        createRoot(document.getElementById('root')).render(React.createElement(MemoryRouter,{initialEntries:['/admin-dashboard/private-pages/notebook']},React.createElement(Notebook)));
        </script></body></html>` }));
      await page.goto(`${origin}/note-color-test`);
      const betaRow = page.locator('.note-list-row').filter({ hasText: 'Beta note' });
      const alphaRow = page.locator('.note-list-row').filter({ hasText: 'Alpha note' });
      await betaRow.waitFor();
      if (width < 600) await page.locator('.notebook-sidebar').getByRole('button', { name: '‹', exact: true }).click();
      assert.equal(await alphaRow.evaluate(el => el.style.getPropertyValue('--note-color')), '#7055df');
      await betaRow.getByRole('button', { name: 'Actions for Beta note' }).click();
      const menu = page.getByRole('dialog', { name: 'Actions for Beta note', exact: true });
      await menu.getByRole('button', { name: 'Color: Cyan', exact: true }).click();
      const palette = page.getByRole('dialog', { name: 'Choose note color', exact: true });
      await palette.waitFor();
      const bounds = await palette.boundingBox();
      assert(bounds.x >= 0 && bounds.x + bounds.width <= width && bounds.y + bounds.height <= 900);
      await palette.getByRole('button', { name: 'Greens', exact: true }).click();
      assert((await palette.locator('.set-color-families').boundingBox()).height < 150);
      assert.equal(await palette.getByRole('button', { name: 'Sage Green, #7BA05B', exact: true }).count(), 1);
      await palette.getByRole('searchbox').fill('#AB274F');
      await palette.getByRole('button', { name: 'Cherry Rose, #AB274F', exact: true }).click();
      assert.equal(await palette.count(), 0);
      assert.equal(await betaRow.evaluate(el => el.style.getPropertyValue('--note-color')), '#ab274f');
      assert.equal(await alphaRow.evaluate(el => el.style.getPropertyValue('--note-color')), '#7055df');
      assert.equal(await betaRow.locator('.note-list-number').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(171, 39, 79)');
      const trigger = menu.getByRole('button', { name: 'Color: Cherry Rose', exact: true });
      await trigger.focus(); await page.keyboard.press('ArrowDown');
      await palette.getByRole('searchbox').fill('no such shade');
      assert.equal(await palette.getByText(/No matching colors/).isVisible(), true);
      await page.keyboard.press('Escape');
      assert.equal(await menu.isVisible(), true);
      assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
      await trigger.click();
      await palette.getByRole('button', { name: 'All', exact: true }).click();
      assert((await palette.getByRole('group', { name: 'Color choices' }).getByRole('button').count()) > 200);
      await page.screenshot({ path: `/tmp/notebook-colors-${width}.png` });
      await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Calendar', exact: true }).click();
      assert.equal(await page.locator('.calendar-grid a').filter({ hasText: 'Beta note' }).evaluate(el => getComputedStyle(el).borderLeftColor), 'rgb(171, 39, 79)');
      await page.getByRole('button', { name: 'List', exact: true }).click();
      await betaRow.locator('a').click();
      await page.locator('.note-header-color').getByRole('button', { name: 'Color: Cherry Rose', exact: true }).click();
      await palette.getByRole('searchbox').fill('mint');
      await palette.getByRole('button', { name: 'Mint, #71D9BF', exact: true }).click();
      assert.equal(await page.locator('.rich-editor').innerHTML(), '<p>Keep beta content.</p>');
      await page.waitForFunction(async () => {
        const {loadLocalNotebookBackup} = await import('/src/services/notebookLocalBackup.ts');
        return (await loadLocalNotebookBackup())?.notes?.some(note => note.id === 'beta' && note.color === 'mint');
      });
      await page.reload(); await betaRow.waitFor();
      assert.equal(await betaRow.evaluate(el => el.style.getPropertyValue('--note-color')), '#71d9bf');
      assert.equal(await alphaRow.evaluate(el => el.style.getPropertyValue('--note-color')), '#7055df');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.deepEqual(errors, []);
    } finally { await browser.close(); }
  });
}
