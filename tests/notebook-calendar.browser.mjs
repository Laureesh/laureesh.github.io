import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:5173';

for (const width of [330, 390]) {
  test(`calendar shows readable titles for a 75-note day at ${width}px`, async () => {
    const browser = await chromium.launch({ headless: true, args: ['--disable-features=LocalNetworkAccessChecks'] });
    try {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.clock.install({ time: new Date('2026-09-17T16:00:00Z') });
      await page.route('**/calendar-test', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}.notebook-shell.test-shell{display:block;min-height:0}.note-list-panel{width:100%;height:100vh}</style></head><body><div id="root"></div><script type="module">
        import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
        const React=(await import('/node_modules/.vite/deps/react.js')).default;
        const {createRoot}=(await import('/node_modules/.vite/deps/react-dom_client.js')).default;
        await import('/src/pages/admin/notebook/Notebook.css');
        const {default:Calendar}=await import('/src/pages/admin/notebook/NotebookCalendar.tsx');
        const notes=Array.from({length:75},(_,i)=>({id:'note-'+i,title:(i+1)+'. Implement Physical Security Controls and Configure Access Permissions',noteDate:'2026-09-13',createdAt:'2026-09-13T12:00:00Z',color:i%2?'amber':'mint',pinned:i===0}));
        function Harness(){const [items,setItems]=React.useState(notes);window.filterNotes=()=>setItems(notes.slice(0,1));return React.createElement('div',{className:'notebook-shell test-shell'},React.createElement('section',{className:'note-list-panel'},React.createElement(Calendar,{notes:items,selectedId:'note-0',noteHref:id=>'/note/'+id,onOpen:(event,id)=>{event.preventDefault();window.openedNote=id},onActions:(event,id)=>{event.preventDefault();window.actionsNote=id}})));}
        createRoot(document.getElementById('root')).render(React.createElement(Harness));
        </script></body></html>` }));
      await page.goto(`${origin}/calendar-test`);
      const day = page.locator('[data-date="2026-09-13"]');
      await day.waitFor();
      assert.match(await day.getAttribute('aria-label'), /75 notes/);
      assert.equal(await page.locator('.calendar-grid a').count(), 0);
      await day.click();
      const agenda = page.locator('.calendar-agenda');
      assert.equal(await agenda.locator('li').count(), 75);
      const first = agenda.locator('a').first();
      assert.match(await first.innerText(), /Physical Security Controls and Configure Access Permissions/);
      assert.equal(await first.evaluate(el => getComputedStyle(el).whiteSpace), 'normal');
      assert.equal(await first.evaluate(el => el.scrollWidth <= el.clientWidth), true);
      const titleBounds = await first.boundingBox();
      assert(titleBounds.width > 230);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: `/tmp/notebook-calendar-${width}.png` });
      await agenda.locator('a').last().click();
      assert.equal(await page.evaluate(() => window.openedNote), 'note-74');
      await agenda.locator('button').last().click();
      assert.equal(await page.evaluate(() => window.actionsNote), 'note-74');
      await page.evaluate(() => window.filterNotes());
      await page.waitForFunction(() => document.querySelectorAll('.calendar-day-notes li').length === 1);
      assert.match(await day.getAttribute('aria-label'), /1 note$/);
      await page.locator('[data-date="2026-09-14"]').click();
      assert.equal(await page.getByText('No notes for this day in the current view.').isVisible(), true);
      await page.getByRole('button', { name: 'Next month', exact: true }).click();
      assert.equal(await page.locator('[data-date="2026-10-01"]').getAttribute('aria-pressed'), 'true');
      await page.getByRole('button', { name: 'Today', exact: true }).click();
      assert.equal(await page.locator('[data-date="2026-09-17"]').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('[data-date="2026-09-17"]').getAttribute('aria-current'), 'date');
      assert.deepEqual(errors, []);
    } finally { await browser.close(); }
  });
}
