import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin=process.env.TEST_ORIGIN || 'http://127.0.0.1:5173';
const routine=await readFile(new URL('../notes/daily-hygiene-scheduled.txt',import.meta.url),'utf8');

test('scheduled routine updates dates, renews completions at Eastern midnight and Sunday, and survives reload', async()=>{
  const browser=await chromium.launch({headless:true,args:['--disable-features=LocalNetworkAccessChecks']});
  try{
    const page=await browser.newPage({viewport:{width:1100,height:900}});
    page.setDefaultTimeout(10000);
    await page.clock.install({time:new Date('2026-10-25T16:00:00Z')});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/schedule-test',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#11131a}.wrap{padding:24px}</style></head><body><div id="root"></div><script type="module">
      import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
      const React=(await import('/node_modules/.vite/deps/react.js')).default;
      const {createRoot}=(await import('/node_modules/.vite/deps/react-dom_client.js')).default;
      const {default:View}=await import('/src/pages/admin/notebook/ChecklistView.tsx');
      const {pastedMarkdownToHtml}=await import('/src/pages/admin/notebook/pastedMarkdown.ts');
      function Harness(){const [html,setHtml]=React.useState(()=>localStorage.getItem('scheduled-html')||pastedMarkdownToHtml(${JSON.stringify(routine)}));window.saved=html;return React.createElement('div',{className:'wrap'},React.createElement(View,{html,fontSize:18,onChange:next=>{localStorage.setItem('scheduled-html',next);setHtml(next)}}));}
      createRoot(document.getElementById('root')).render(React.createElement(Harness));
      </script></body></html>`}));
    await page.goto(`${origin}/schedule-test`);
    await page.getByText('Sunday, 10/25/2026',{exact:true}).waitFor();
    const weekly=page.getByRole('region',{name:'Weekly checklist',exact:true});
    const daily=page.getByRole('checkbox',{name:'Teeth & tongue',exact:true});
    const sheets=page.getByRole('checkbox',{name:'Sunday — Wash bedsheets and pillowcases.',exact:true});
    assert.equal(await weekly.locator('.status-due-today').count(),2);
    assert.equal(await weekly.locator('time').first().getAttribute('datetime'),'2026-10-25');
    assert.equal(await weekly.locator('time').last().getAttribute('datetime'),'2026-10-31');
    await daily.check();await sheets.check();
    await page.waitForFunction(()=>window.saved.includes('data-checklist-period="2026-10-25"'));
    await page.reload();
    await page.getByText('Sunday, 10/25/2026',{exact:true}).waitFor();
    assert.equal(await daily.isChecked(),true);assert.equal(await sheets.isChecked(),true);
    await page.clock.setSystemTime(new Date('2026-10-26T04:00:00Z'));await page.clock.runFor(30001);
    await page.getByText('Monday, 10/26/2026',{exact:true}).waitFor();
    assert.equal(await daily.isChecked(),false);assert.equal(await sheets.isChecked(),true);
    assert.equal(await weekly.locator('.status-overdue').count(),1); // Sunday's hair task
    assert.equal(await weekly.locator('.status-due-today').count(),1); // Monday's nails
    await page.clock.setSystemTime(new Date('2026-11-01T04:00:00Z'));await page.clock.runFor(30001);
    await page.getByText('Sunday, 11/01/2026',{exact:true}).waitFor();
    assert.equal(await sheets.isChecked(),false);
    assert.equal(await weekly.locator('time').first().getAttribute('datetime'),'2026-11-01');
    await daily.check();
    // DST has ended: 04:30 UTC is still Sunday in Eastern Time.
    await page.clock.setSystemTime(new Date('2026-11-02T04:30:00Z'));await page.clock.runFor(30001);
    assert.equal(await daily.isChecked(),true);
    await page.clock.setSystemTime(new Date('2026-11-02T05:00:00Z'));await page.clock.runFor(30001);
    await page.getByText('Monday, 11/02/2026',{exact:true}).waitFor();
    assert.equal(await daily.isChecked(),false);
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await weekly.scrollIntoViewIfNeeded();
    await page.screenshot({path:'/tmp/notebook-scheduled-weekly.png'});
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
});
