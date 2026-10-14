import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:5173';

test('step circle buttons toggle with focus, repeated clicks, keyboard, touch, and resized content', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ hasTouch: true });
    page.on('pageerror', error => console.error(error.message));
    page.on('console', message => { if (message.type() === 'error') console.error(message.text()); });
    await page.route('**/circle-test', route => route.fulfill({ contentType: 'text/html', body: `
      <div id="root"></div><script type="module">
      import RefreshRuntime from '/@react-refresh';
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {};
      window.$RefreshSig$ = () => type => type;
      window.__vite_plugin_react_preamble_installed__ = true;
      const React = (await import('/node_modules/.vite/deps/react.js')).default;
      const { createRoot } = (await import('/node_modules/.vite/deps/react-dom_client.js')).default;
      const { default: Buttons } = await import('/src/pages/admin/notebook/StepCircleButtons.tsx');
      const { changeStepLayout } = await import('/src/pages/admin/notebook/stepLayout.ts');
      await import('/src/pages/admin/notebook/Notebook.css');
      function Harness() {
        const editorRef = React.useRef(null);
        React.useLayoutEffect(() => {
          editorRef.current.innerHTML = '<ol class="notebook-steps">' + '<li><h3>Task</h3><p>Instructions</p></li>'.repeat(18) + '<li><h3>Final Check</h3></li></ol>';
        }, []);
        return React.createElement('div', { className: 'notebook-shell', style: {display:'block'} },
          React.createElement('div', {className:'notebook-editor-content'},
            React.createElement('div', {ref:editorRef, className:'rich-editor', contentEditable:true, suppressContentEditableWarning:true}),
            React.createElement(Buttons, {editorRef, onToggle:index => {
              editorRef.current.innerHTML = changeStepLayout(editorRef.current.innerHTML, {type:'complete',index});
            }})
          ));
      }
      createRoot(document.getElementById('root')).render(React.createElement(Harness));
      </script>` }));
    await page.goto(`${origin}/circle-test`);
    const circle = page.getByRole('button', { name: 'Step 19 complete', exact: true });
    const step = page.locator('.notebook-steps > li').nth(18);
    await circle.waitFor();
    await page.locator('.rich-editor').focus();
    // Hit near the edge of the enlarged target, beyond the painted circle.
    await circle.click({ position: { x: 2, y: 22 } });
    assert.equal(await step.getAttribute('data-completed'), 'false');
    for (const expected of ['true', 'false', 'true', 'false']) {
      await circle.click();
      assert.equal(await step.getAttribute('data-completed'), expected);
      assert.equal(await circle.getAttribute('aria-pressed'), expected);
    }
    await circle.focus();
    await page.keyboard.press('Space');
    assert.equal(await step.getAttribute('data-completed'), 'true');
    await page.keyboard.press('Enter');
    assert.equal(await step.getAttribute('data-completed'), 'false');
    await page.setViewportSize({ width:390, height:844 });
    await page.locator('.notebook-steps > li').first().locator('p').fill('More instructions '.repeat(50));
    await circle.tap();
    assert.equal(await step.getAttribute('data-completed'), 'true');
    await circle.tap();
    assert.equal(await step.getAttribute('data-completed'), 'false');
    assert.equal(await page.locator('.rich-editor button').count(), 0);
    const normalCircle = page.getByRole('button', {name:'Step 1 complete',exact:true});
    await normalCircle.click();
    assert.equal(await normalCircle.getAttribute('aria-pressed'), 'true');
    await normalCircle.click();
    assert.equal(await normalCircle.getAttribute('aria-pressed'), 'false');
  } finally { await browser.close(); }
});
