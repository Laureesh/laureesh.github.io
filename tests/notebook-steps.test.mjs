import assert from 'node:assert/strict';
import test from 'node:test';
import { labMarkdownToHtml } from '../src/pages/admin/notebook/stepLayout.ts';

test('lab Markdown preserves commands, headings, bold labels, and resumed numbering', () => {
  const html = labMarkdownToHtml('## Lab Steps\n\n### &#x20;1. Enable the Anaconda Service\n\n1. Open **Terminal**.\n2. Type:\n```bash\nsystemctl enable anaconda.service\n```\n\n3. Press **Enter**.\n4. Check:\n```bash\nsystemctl is-enabled anaconda.service\n```');
  assert.ok(html.includes('<h3>1. Enable the Anaconda Service</h3>'));
  assert.ok(html.includes('<strong>Terminal</strong>'));
  assert.ok(html.includes('<ol start="3">'));
  assert.ok(html.includes('<pre><code>systemctl enable anaconda.service</code></pre>'));
  assert.ok(html.includes('<pre><code>systemctl is-enabled anaconda.service</code></pre>'));
});
test('commands retain whitespace and literal shell or HTML characters', () => {
  const html = labMarkdownToHtml('```bash\n  echo "<script>" && true\n\n  printf **literal**\n```');
  assert.equal(html, '<pre><code>  echo &quot;&lt;script&gt;&quot; &amp;&amp; true\n\n  printf **literal**</code></pre>');
});
test('plain Markdown never promotes pasted raw HTML into executable markup', () => {
  const html = labMarkdownToHtml('### Step\n<img src=x onerror=alert(1)>\n`<script>`');
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('<code>&lt;script&gt;</code>'));
});
