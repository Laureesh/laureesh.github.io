import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:5173';
const routine = await readFile(new URL('../notes/daily-hygiene-paste.txt', import.meta.url), 'utf8');

test('interactive checklists track, reset, undo, collapse, persist and fit mobile', async () => {
  const browser = await chromium.launch({ headless: true, args: ['--disable-features=LocalNetworkAccessChecks'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    page.setDefaultTimeout(10000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if(message.type() === 'error') errors.push(message.text()); });
    await page.route('**/checklist-test', route => route.fulfill({ contentType: 'text/html', body: `
      <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;background:#11131a}.test-wrap{padding:24px;max-width:900px;margin:auto}</style></head><body><div id="root"></div><script type="module">
      import RefreshRuntime from '/@react-refresh';
      RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
      const React=(await import('/node_modules/.vite/deps/react.js')).default;
      const {createRoot}=(await import('/node_modules/.vite/deps/react-dom_client.js')).default;
      const {default:View}=await import('/src/pages/admin/notebook/ChecklistView.tsx');
      const {pastedMarkdownToHtml}=await import('/src/pages/admin/notebook/pastedMarkdown.ts');
      function Harness(){
        const [html,setHtml]=React.useState(()=>localStorage.getItem('checklist-test-html')||pastedMarkdownToHtml(${JSON.stringify(routine)}));
        window.saved=html;
        return React.createElement('div',{className:'test-wrap'},React.createElement(View,{html,fontSize:18,onChange:next=>{localStorage.setItem('checklist-test-html',next);setHtml(next)}}));
      }
      createRoot(document.getElementById('root')).render(React.createElement(Harness));
      </script></body></html>` }));
    await page.goto(`${origin}/checklist-test`);
    await page.getByRole('checkbox', { name: 'Teeth & tongue', exact: true }).waitFor().catch(async error => { throw new Error(`${error.message}\n${errors.join('\n')}\n${await page.locator('body').innerText()}`); });
    assert.equal(await page.getByRole('checkbox').count(), 18);
    assert.equal(await page.locator('.checklist-document table tr').count(), 7);
    const morning = page.getByRole('region', { name: 'Morning checklist', exact: true });
    const night = page.getByRole('region', { name: 'Night checklist', exact: true });
    await page.getByRole('checkbox', { name: 'Teeth & tongue', exact: true }).check();
    await page.getByRole('checkbox', { name: 'Clean your face', exact: true }).check();
    assert.equal(await morning.getByRole('progressbar').getAttribute('value'), '1');
    assert.equal(await page.getByRole('progressbar', { name: 'Overall checklist progress' }).getAttribute('value'), '2');
    await morning.getByRole('button', { name: 'Reset morning checklist' }).click();
    assert.equal(await morning.getByRole('progressbar').getAttribute('value'), '0');
    assert.equal(await night.getByRole('progressbar').getAttribute('value'), '1');
    await page.getByRole('button', { name: 'Undo reset' }).click();
    assert.equal(await morning.getByRole('progressbar').getAttribute('value'), '1');
    await page.getByRole('button', { name: 'Hide details' }).click();
    assert.equal(await page.locator('.checklist-task-detail').count(), 0);
    await page.getByRole('button', { name: 'Show details' }).click();
    assert.ok(await page.locator('.checklist-task-detail').count() > 0);
    const collapse = morning.getByRole('button', { name: 'Morning checklist', exact: true });
    await collapse.click();
    assert.equal(await collapse.getAttribute('aria-expanded'), 'false');
    assert.equal(await morning.getByRole('checkbox').count(), 0);
    await collapse.click();
    const teeth = page.getByRole('checkbox', { name: 'Teeth & tongue', exact: true });
    await teeth.focus(); await page.keyboard.press('Space');
    assert.equal(await teeth.isChecked(), false);
    await page.reload();
    await page.getByRole('checkbox', { name: 'Clean your face', exact: true }).waitFor();
    assert.equal(await page.getByRole('checkbox', { name: 'Clean your face', exact: true }).isChecked(), true);
    assert.doesNotMatch(await page.evaluate(() => window.saved), /<button|<progress|checklist-card|<table/);
    await page.screenshot({ path: '/tmp/notebook-checklist-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.getByRole('navigation', { name: 'Jump to checklist' }).getByRole('button', { name: 'Weekly checklist' }).click();
    const weekly = page.getByRole('region', { name: 'Weekly checklist', exact: true });
    await weekly.getByRole('checkbox').first().check();
    assert.equal(await weekly.getByRole('progressbar').getAttribute('value'), '1');
    await page.screenshot({ path: '/tmp/notebook-checklist-mobile.png' });
    for (const box of await page.getByRole('checkbox').all()) await box.check();
    assert.equal(await page.getByRole('progressbar', { name: 'Overall checklist progress' }).getAttribute('value'), '18');
    assert.equal(await page.getByText('All done. Nicely done.', { exact: true }).count(), 1);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('Notebook opens existing checklists in interactive view and keeps edits and saved checks', async () => {
  const browser = await chromium.launch({ headless: true, args: ['--disable-features=LocalNetworkAccessChecks'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.setDefaultTimeout(15000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.route(/\/src\/contexts\/AuthContext\.tsx(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: 'export function useAuth(){return {user:null}}' }));
    await page.route('**/notebook-integration-test', route => route.fulfill({ contentType: 'text/html', body: `
      <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0}</style></head><body><div id="root"></div><script type="module">
      import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
      const React=(await import('/node_modules/.vite/deps/react.js')).default;
      const {createRoot}=(await import('/node_modules/.vite/deps/react-dom_client.js')).default;
      const notebookSource=await (await fetch('/src/pages/admin/notebook/Notebook.tsx')).text();
      const routerPath=notebookSource.match(/from "([^"]*react-router-dom[^"]*)"/)[1];
      const {MemoryRouter}=await import(routerPath);
      const {pastedMarkdownToHtml}=await import('/src/pages/admin/notebook/pastedMarkdown.ts');
      if(!sessionStorage.getItem('seeded')){
        const timestamp=new Date().toISOString();
        localStorage.setItem('flashbolt.notebook.v1',JSON.stringify({folders:[],notes:[{id:'ui-test',title:'My daily hygiene routine',html:pastedMarkdownToHtml(${JSON.stringify(routine)}),folderId:null,tags:[],pinned:true,archived:false,createdAt:timestamp,updatedAt:timestamp,attachments:[],versions:[]}]}));
        sessionStorage.setItem('seeded','yes');
      }
      const {default:Notebook}=await import('/src/pages/admin/notebook/Notebook.tsx');
      createRoot(document.getElementById('root')).render(React.createElement(MemoryRouter,{initialEntries:['/admin-dashboard/private-pages/notebook/note/ui-test']},React.createElement(Notebook)));
      </script></body></html>` }));
    await page.goto(`${origin}/notebook-integration-test`);
    await page.getByRole('button', { name: '☑ Checklist view', exact: true }).waitFor().catch(error => { throw new Error(`${error.message}\n${errors.join('\n')}`); });
    assert.equal(await page.locator('.rich-editor').isVisible(), false);
    const checkbox = page.getByRole('checkbox', { name: 'Teeth & tongue', exact: true });
    await checkbox.check();
    await page.getByRole('button', { name: 'Edit note', exact: true }).click();
    assert.equal(await page.locator('.rich-editor').isVisible(), true);
    assert.equal(await page.locator('.rich-editor input[type=checkbox]').first().isChecked(), true);
    await page.locator('.rich-editor').focus();
    await page.keyboard.press('Control+End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('My extra reminder.');
    await page.getByRole('button', { name: '☑ Checklist view', exact: true }).click();
    assert.match(await page.locator('.checklist-document').innerText(), /My extra reminder\./);
    assert.equal(await checkbox.isChecked(), true);
    // Wait for the existing IndexedDB backup, then exercise a real reload.
    await page.waitForFunction(async () => {
      const {loadLocalNotebookBackup}=await import('/src/services/notebookLocalBackup.ts');
      const backup=await loadLocalNotebookBackup();
      return backup?.notes?.some(note=>note.html.includes('My extra reminder.'));
    });
    await page.reload();
    await page.getByRole('checkbox', { name: 'Teeth & tongue', exact: true }).waitFor();
    assert.equal(await page.getByRole('checkbox', { name: 'Teeth & tongue', exact: true }).isChecked(), true);
    assert.match(await page.locator('.checklist-document').innerText(), /My extra reminder\./);
    assert.deepEqual(errors, []);
    await page.screenshot({path:'/tmp/notebook-checklist-integrated.png'});
  } finally { await browser.close(); }
});
