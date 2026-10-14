import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:5173';
const hash = JSON.parse(readFileSync(new URL('../node_modules/.vite/deps/_metadata.json', import.meta.url))).browserHash;
let browser;
before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await browser?.close(); });

async function mount(view, width = 300) {
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
  await page.goto(`${origin}/usability-test`);
  await page.locator('.flashbolt-shell:not([inert])').waitFor();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  return page;
}

test('mastery panel stays within the viewport and Escape restores focus', async () => {
  for (const width of [300, 768, 1440]) {
    const page = await mount('', width);
    try {
      const trigger = page.getByRole('button', { name: /Mastery filter/ });
      await trigger.click();
      const panel = page.locator('.flashbolt-filter-panel');
      const r = await panel.boundingBox();
      assert(r && r.x >= 0 && r.y >= 0 && r.x + r.width <= width && r.y + r.height <= 700);
      await page.keyboard.press('Escape');
      assert.equal(await panel.count(), 0);
      assert(await trigger.evaluate(e => e === document.activeElement));
    } finally { await page.close(); }
  }
});

test('folder dialog traps focus and restores it after Escape', async () => {
  const page = await mount('folders');
  try {
    const trigger = page.getByRole('button', { name: '＋ New folder', exact: true });
    await trigger.click();
    const dialog = page.locator('dialog.modal');
    await dialog.locator('button').last().focus();
    await page.keyboard.press('Tab');
    assert(await page.evaluate(() => !!document.activeElement.closest('dialog.modal')));
    await page.keyboard.press('Escape');
    assert.equal(await dialog.count(), 0);
    assert(await trigger.evaluate(e => e === document.activeElement));
  } finally { await page.close(); }
});

test('new sets expose Save immediately and keep it visible while scrolling', async () => {
  const page = await mount('create');
  try {
    const save = page.locator('.editor-topbar-actions').getByRole('button', { name: 'Save', exact: true });
    await save.waitFor();
    assert((await save.boundingBox()).y < 80);
    await page.locator('.card-editor').first().scrollIntoViewIfNeeded();
    assert((await save.boundingBox()).y < 80);
  } finally { await page.close(); }
});

test('touch menu supports keyboard navigation and destructive cancellation', async () => {
  const page = await mount('library');
  try {
    const before = await page.locator('.set-tile').count();
    await page.getByRole('button', { name: /^Actions for/ }).first().click();
    assert(await page.evaluate(() => document.activeElement?.getAttribute('role') === 'menuitem'));
    await page.keyboard.press('End');
    assert.match(await page.evaluate(() => document.activeElement.textContent), /Delete set/);
    await page.keyboard.press('Enter');
    await page.getByRole('dialog', { name: 'Delete set?' }).waitFor();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.equal(await page.locator('.set-tile').count(), before);
    await page.getByRole('button', { name: /^Actions for/ }).first().click();
    await page.getByRole('menuitem', { name: 'Delete set', exact: true }).click();
    await page.getByRole('button', { name: 'Delete set', exact: true }).click();
    assert.equal(await page.locator('.set-tile').count(), before - 1);
  } finally { await page.close(); }
});

test('study-page deletion uses the same cancellable confirmation', async () => {
  const page = await mount('flashcards');
  try {
    await page.getByRole('button', { name: 'Delete set', exact: true }).click();
    await page.getByRole('dialog', { name: 'Delete set?' }).waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.study-page').count(), 1);
  } finally { await page.close(); }
});

test('white-theme picker uses readable theme text and one results list', async () => {
  const page = await mount('helper');
  try {
    await page.evaluate(() => { document.documentElement.dataset.theme = 'white'; });
    await page.getByRole('button', { name: /^Study set:/ }).click();
    const colors = await page.locator('.search-picker-result').first().evaluate(e => ({ actual: getComputedStyle(e).color, expected: getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() }));
    // White theme uses dark ink, not the hard-coded near-white text from the old picker.
    const rgb = colors.actual.match(/\d+/g).map(Number);
    assert(rgb.slice(0, 3).every(channel => channel < 100), JSON.stringify(colors));
    assert.equal(await page.getByRole('navigation', { name: 'Search results pages' }).count(), 0);
    await page.getByRole('textbox', { name: 'Search study set' }).fill('web');
    assert.equal(await page.locator('.search-picker-result').count(), 1);
  } finally { await page.close(); }
});

test('Learn options footer follows all settings without covering them', async () => {
  const page = await mount('learn');
  try {
    await page.getByRole('button', { name: /Start Learn/ }).click();
    await page.locator('.learn-options-button').click();
    const dialog = page.locator('dialog.learn-options-modal');
    const geometry = await dialog.evaluate(e => ({ footerTop: e.querySelector('footer').getBoundingClientRect().top, sectionBottom: [...e.querySelectorAll('.options-section')].at(-1).getBoundingClientRect().bottom, footerPosition: getComputedStyle(e.querySelector('footer')).position }));
    assert.equal(geometry.footerPosition, 'static');
    assert(geometry.footerTop >= geometry.sectionBottom);
    await dialog.locator('footer button').last().focus();
    await page.keyboard.press('Tab');
    assert(await page.evaluate(() => !!document.activeElement.closest('dialog.learn-options-modal')));
  } finally { await page.close(); }
});

test('mobile review cards are compact and Helper has a direct navigation link', async () => {
  const page = await mount('review');
  try {
    assert((await page.locator('.review-set-list article').first().boundingBox()).height < 240);
    await page.locator('.mobile-nav').getByRole('link', { name: 'Helper', exact: true }).click();
    await page.locator('.kahoot-helper-page').waitFor();
  } finally { await page.close(); }
});
