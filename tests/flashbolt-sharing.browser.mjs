import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:5174';
let browser;
before(async () => { browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH, args: ['--disable-features=LocalNetworkAccessChecks'] }); });
after(async () => { await browser?.close(); });
const shareId = 'Abcdefghijklmnopqrst';
const set = { id: 'shared-set', title: 'Chapter 4: Threads', subject: 'Operating Systems', description: 'Study for the quiz', color: 'violet', updatedAt: '2026-10-26', cards: [
  { id: 'one', term: 'What do threads share?', definition: 'Code', answerChoices: ['Code', 'Registers'], correctAnswers: ['Code'], questionType: 'multiple-choice', explanation: 'Threads share process code; each has its own registers.' },
  { id: 'two', term: 'What is per-thread?', definition: 'Stack', answerChoices: ['Stack', 'Code'], correctAnswers: ['Stack'], questionType: 'multiple-choice' },
] };
const privateData = JSON.stringify({ sets: [{ ...set, id: 'private', title: 'PRIVATE SECRET' }], folders: [], mastered: {}, sessions: 6 });
async function mount({ owner = false, width = 1280, missing = false, signedIn = false, blockedStorage = false, app = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await context.addInitScript(({ privateData, blockedStorage }) => {
    localStorage.setItem('flashbolt.local.v1', privateData);
    if (blockedStorage) Storage.prototype.setItem = () => { throw new Error('Storage blocked'); };
  }, { privateData, blockedStorage });
  await page.route('**/src/contexts/AuthContext.tsx', route => route.fulfill({ contentType: 'application/javascript', body: `export const useAuth=()=>({user:${owner || signedIn ? '{uid:"owner"}' : 'null'},userProfile:null,loading:false});` }));
  await page.route('**/src/services/flashboltLibrary.ts', route => route.fulfill({ contentType: 'application/javascript', body: owner ? `export const loadFlashboltLibrary=async()=>(${privateData}); export const mergeAndSaveFlashboltLibrary=async(_,d)=>d; export const saveFlashboltLibrary=async()=>{};` : `const fail=()=>{window.privateCalls=(window.privateCalls||0)+1;throw Error('Private cloud access');};export const loadFlashboltLibrary=fail; export const mergeAndSaveFlashboltLibrary=fail; export const saveFlashboltLibrary=fail;` }));
  await page.route('**/src/services/flashboltSharing.ts', route => route.fulfill({ contentType: 'application/javascript', body: `
    let current=null;
    export const readSharedSet=async()=>(${missing ? 'null' : JSON.stringify({ id: shareId, revision: 'rev1', set })});
    export const findSetShare=async()=>current;
    export const publishSetShare=async(_,set)=>current={id:'${shareId}',revision:'rev1',set};
    export const revokeSetShare=async()=>{current=null;};
  ` }));
  const flashboltModule = await (await fetch(`${origin}/src/pages/admin/flashbolt/Flashbolt.tsx`)).text();
  const routerPath = flashboltModule.match(/from "([^\"]*react-router-dom[^\"]*)"/)[1];
  await page.route('**/sharing-test', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div><script type="module">
    import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type; window.__vite_plugin_react_preamble_installed__=true;
    const React=(await import('/node_modules/.vite/deps/react.js')).default;
    const {createRoot}=(await import('/node_modules/.vite/deps/react-dom_client.js')).default;
    const {MemoryRouter,Routes,Route}=await import('${routerPath}');
    const {default:Page}=await import('${app ? '/src/App.tsx' : owner ? '/src/pages/admin/flashbolt/Flashbolt.tsx' : '/src/pages/admin/flashbolt/sharing/SharedFlashbolt.tsx'}');
    createRoot(document.getElementById('root')).render(React.createElement(MemoryRouter,{initialEntries:['${owner ? '/admin-dashboard/private-pages/flashbolt/no-semester/unfiled/private-secret/flashcards' : `/flashbolt/shared/${shareId}/learn`}']},${app ? 'React.createElement(Page)' : `React.createElement(Routes,null,React.createElement(Route,{path:'${owner ? '*' : '/flashbolt/shared/:shareId/*'}',element:React.createElement(Page)}))`}));
  </script>` }));
  await page.goto(`${origin}/sharing-test`);
  return { context, page, errors };
}

test('guest Learn uses the existing adaptive engine, persists and resumes without touching the private library', async () => {
  const { context, page, errors } = await mount();
  try {
    await page.getByRole('button', { name: 'Start Learn' }).click();
    await page.locator('.answer-grid button').first().click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('flashbolt.shared.Abcdefghijklmnopqrst.rev1') ?? '{}').learnProgress?.['shared-set']);
    assert.equal(await page.getByRole('button', { name: /Edit explanation|Add explanation/ }).count(), 0);
    await page.getByRole('button', { name: /Options/ }).click();
    assert.equal(await page.getByRole('region', { name: 'Set actions' }).count(), 0);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => localStorage.getItem('flashbolt.local.v1')), privateData);
    assert.equal(await page.evaluate(() => window.privateCalls || 0), 0);
    assert.equal(await page.getByText('PRIVATE SECRET', { exact: true }).count(), 0);
    await page.reload();
    await page.getByRole('button', { name: 'Resume session' }).waitFor();
    await page.getByRole('button', { name: 'Resume session' }).click();
    await page.locator('.question-card').waitFor();
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test('shared navigation stays public, including signed-in admins, at mobile width', async () => {
  const { context, page, errors } = await mount({ signedIn: true, width: 390 });
  try {
    await page.getByRole('navigation', { name: 'Shared study modes' }).getByRole('link', { name: 'Flashcards' }).click();
    await page.getByRole('heading', { name: set.title, exact: true }).waitFor();
    assert.equal(await page.getByRole('link', { name: 'Edit set', exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Delete set', exact: true }).count(), 0);
    const links = await page.locator('a[href]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
    assert(links.every(href => !href.includes('/admin-dashboard/')));
    await page.getByRole('navigation', { name: 'Shared study modes' }).getByRole('link', { name: 'Test', exact: true }).click();
    await page.locator('.test-page').waitFor();
    assert.equal(await page.evaluate(() => window.privateCalls || 0), 0);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test('owner can create, copy, reopen, update and stop a shared link', async () => {
  const { context, page, errors } = await mount({ owner: true, width: 390 });
  try {
    await page.getByRole('button', { name: 'Share study link' }).click();
    await page.getByRole('button', { name: 'Create study link' }).click();
    assert.match(await page.getByRole('textbox', { name: 'Study link' }).inputValue(), /\/flashbolt\/shared\/Abcdefghijklmnopqrst\/learn$/);
    await page.getByRole('button', { name: 'Copy link', exact: true }).click();
    await page.getByRole('button', { name: 'Close sharing' }).click();
    await page.getByRole('button', { name: 'Share study link' }).click();
    await page.getByRole('button', { name: 'Update shared copy' }).click();
    await page.getByText('Shared copy updated. The link stays the same.').waitFor();
    await page.getByRole('button', { name: 'Stop sharing', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm stop sharing' }).click();
    await page.getByRole('button', { name: 'Create study link' }).waitFor();
    assert.equal(await page.getByRole('textbox', { name: 'Study link' }).count(), 0);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test('revoked or missing link shows an unavailable message without a login prompt', async () => {
  const { context, page } = await mount({ missing: true });
  try { await page.getByRole('heading', { name: 'This study link is unavailable' }).waitFor(); assert.equal(await page.getByText('Sign in', { exact: true }).count(), 0); }
  finally { await context.close(); }
});

test('blocked storage still allows studying and explains that progress cannot be saved', async () => {
  const { context, page, errors } = await mount({ blockedStorage: true });
  try {
    await page.getByRole('button', { name: 'Start Learn' }).click();
    await page.getByText('Progress cannot be saved in this browser; keep this tab open.').waitFor();
    await page.locator('.question-card').waitFor();
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});


test('the real app routes a shared link around the admin guard', async () => {
  const { context, page, errors } = await mount({ app: true });
  try {
    await page.getByRole('button', { name: 'Start Learn' }).waitFor();
    assert.equal(await page.getByRole('navigation', { name: 'Shared study modes' }).count(), 1);
    assert.equal(await page.evaluate(() => window.privateCalls || 0), 0);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: '/tmp/flashbolt-shared-learn.png', fullPage: true });
  } finally { await context.close(); }
});


test('Learn labels actual retries, retains the label on resume, and clears it for normal practice', async () => {
  const { context, page, errors } = await mount({ width: 390 });
  const retry = page.locator('.learn-retry-notice');
  try {
    await page.getByRole('button', { name: 'Start Learn' }).click();
    assert.equal(await retry.count(), 0);
    await page.locator('.answer-grid button').filter({ hasText: 'Registers' }).click();
    assert.equal(await retry.count(), 0, 'Missing a first attempt does not turn that attempt into a retry');
    await page.getByRole('button', { name: /Next question/ }).click();
    assert.equal(await retry.count(), 0);
    await page.locator('.answer-grid button').filter({ hasText: 'Stack' }).click();
    await page.getByRole('button', { name: /Retry missed/ }).click();
    await retry.waitFor();
    assert.match(await retry.innerText(), /RETRY/);
    assert.match(await page.locator('.question-card h1').innerText(), /threads share/);
    await page.reload();
    await page.getByRole('button', { name: 'Resume session' }).click();
    await retry.waitFor();
    await page.locator('.answer-grid button').filter({ hasText: 'Registers' }).click();
    await page.getByRole('button', { name: /Retry missed/ }).click();
    await retry.waitFor();
    await page.screenshot({ path: '/tmp/flashbolt-retry-mobile.png', fullPage: true });
    for (const width of [390, 1800]) {
      await page.setViewportSize({ width, height: 900 });
      const bounds = await retry.boundingBox();
      const question = await page.locator('.learn-current-question').boundingBox();
      assert(bounds.x >= question.x + question.width, 'Retry belongs to the right of the question number');
      assert(bounds.y < question.y + question.height && question.y < bounds.y + bounds.height, 'Retry and question share a header row');
      assert(bounds.x + bounds.width <= width);
      assert.equal(await page.locator('.question-card .learn-retry-notice').count(), 0);
    }
    await page.screenshot({ path: '/tmp/flashbolt-retry-header.png', fullPage: true });
    await page.locator('.answer-grid button').filter({ hasText: 'Code' }).click();
    await page.getByRole('button', { name: /Next round/ }).click();
    assert.equal(await retry.count(), 0, 'Normal adaptive practice is not a missed-question retry');
    await page.getByRole('link', { name: 'Exit Learn' }).click();
    await page.getByRole('navigation', { name: 'Shared study modes' }).getByRole('link', { name: 'Learn', exact: true }).click();
    await page.getByRole('button', { name: /^Start new/ }).click();
    assert.equal(await retry.count(), 0);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});


test('Knowledge panel highlights only the current question level and follows grading', async () => {
  const { context, page, errors } = await mount();
  const current = page.locator('.knowledge-level-button[aria-current="true"]');
  async function expectLevel(level) {
    assert.equal(await current.count(), 1);
    assert.equal(await current.locator('span').textContent(), level);
    assert.equal(await page.locator('.learn-question-stage > span').count(), 1, 'Only the question instruction remains; no knowledge pill');
  }
  try {
    await page.getByRole('button', { name: 'Start Learn' }).click();
    await expectLevel('new');
    for (const [index, answer] of ['Code', 'Stack', 'Code', 'Stack', 'Code'].entries()) {
      await page.locator('.answer-grid button').filter({ hasText: answer }).click();
      await expectLevel(index < 2 ? 'learning' : index < 4 ? 'familiar' : 'mastered');
      if (index < 4) {
        await page.getByRole('button', { name: /Next question|Next round/ }).click();
        await expectLevel(index === 0 ? 'new' : index < 3 ? 'learning' : 'familiar');
      }
    }
    await page.screenshot({ path: '/tmp/flashbolt-knowledge-highlight.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 900 });
    await current.click();
    await page.getByRole('dialog').waitFor();
    assert.match(await page.getByRole('dialog').innerText(), /Current question/);
    await page.getByRole('button', { name: 'Close knowledge overview' }).click();
    await expectLevel('mastered');
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});
