import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { parseQuizResults } from '../src/pages/admin/flashbolt/note-parser.ts';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:5173';
const quiz = readFileSync(new URL('./fixtures/cyberdefense-monitoring-quiz.txt', import.meta.url), 'utf8');
const expected = parseQuizResults(quiz);
let browser;
before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await browser?.close(); });

async function mount(view, width = 300, libraryFixture = { sets: [], folders: [], mastered: {}, sessions: 0 }) {
  const module = await (await fetch(`${origin}/src/pages/admin/flashbolt/Flashbolt.tsx`)).text();
  const hash = module.match(/react-router-dom\.js\?v=([^"']+)/)[1];
  const page = await browser.newPage({ viewport: { width, height: 700 } });
  await page.route('**/src/contexts/AuthContext.tsx', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useAuth=()=>({user:{uid:"usability-test"}});' }));
  await page.route('**/src/services/flashboltLibrary.ts', route => route.fulfill({ contentType: 'application/javascript', body: `export const loadFlashboltLibrary=async()=>(${JSON.stringify(libraryFixture)}); export const mergeAndSaveFlashboltLibrary=async(_,data)=>data; export const saveFlashboltLibrary=async()=>{};` }));
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




test('manual quiz import preserves question context through autosave, reload, study save and helper', async () => {
  let page = await mount('create', 1800);
  const title = '4.4.7 - Practice Questions';
  const verifySaved = async () => {
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('flashbolt.local.v1')));
    assert.equal(saved.sets.length, 1);
    assert.equal(saved.sets[0].cards.length, 10);
    for (const [index, card] of saved.sets[0].cards.entries()) {
      for (const field of ['term', 'definition', 'answerChoices', 'correctAnswers', 'explanation']) assert.deepEqual(card[field], expected[index][field], `question ${index + 1} ${field}`);
    }
    return saved;
  };
  try {
    await page.locator('#set-title').fill(title);
    await page.getByRole('textbox', { name: 'Cards to import' }).fill(quiz);
    await page.getByRole('button', { name: 'Import pasted cards', exact: true }).click();
    await page.getByRole('button', { name: 'Go to card 10, complete', exact: true }).waitFor();
    const saved = await verifySaved();
    await page.close();
    // A fresh load exercises library normalization, which used to replace the choices.
    page = await mount('library', 1800, saved);
    await page.getByRole('link', { name: `Edit set ${title}`, exact: true }).click();
    await page.getByRole('button', { name: 'Go to card 10, complete', exact: true }).click();
    const tenth = page.locator('.card-editor-wrap').nth(9).locator('.card-editor');
    await tenth.waitFor();
    assert.equal(await tenth.locator('.card-text-field textarea').first().inputValue(), expected[9].term);
    assert.deepEqual(await tenth.locator('.card-editor-choices textarea').evaluateAll(nodes => nodes.map(node => node.value)), expected[9].answerChoices);
    assert.equal(await tenth.getByRole('button', { name: 'Unmark choice C as correct' }).getAttribute('aria-pressed'), 'true');
    assert.equal(await tenth.locator('.card-explanation-field textarea').first().inputValue(), expected[9].explanation);
    await tenth.screenshot({ path: '/tmp/flashbolt-monitoring-question-fixed.png' });
    await page.getByRole('button', { name: 'Save & study', exact: true }).click();
    await page.locator('.flashbolt-shell[data-view="set"]').waitFor();
    await verifySaved();
    await page.getByRole('link', { name: 'Your library', exact: true }).click();
    await page.getByRole('button', { name: `Open Kahoot Helper for ${title}`, exact: true }).click();
    const question = page.locator('.kahoot-helper-card').nth(9);
    await question.waitFor();
    assert.equal(await question.locator('h2').textContent(), expected[9].term);
  } finally { await page.close(); }
});
