import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const source = readFileSync(new URL('../src/pages/admin/flashbolt/ExplanationLinks.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const helperSource = readFileSync(new URL('../src/pages/admin/flashbolt/referenceUrl.ts', import.meta.url), 'utf8');
const helperContext = { exports: {}, URL };
vm.runInNewContext(ts.transpileModule(helperSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, helperContext);
const require = createRequire(import.meta.url);
const context = { exports: {}, require: name => name === './referenceUrl' ? helperContext.exports : require(name) };
vm.runInNewContext(compiled, context);
const { referenceUrl } = helperContext.exports;
const { default: ExplanationLinks } = context.exports;

test('references accept web URLs and reject executable or invalid URLs', () => {
  assert.equal(referenceUrl(' https://example.com/article?q=hello#section '), 'https://example.com/article?q=hello#section');
  assert.equal(referenceUrl('www.example.com/article'), 'https://www.example.com/article');
  for (const value of ['javascript:alert(1)', 'data:text/html,test', 'file:///tmp/test', 'not a link', 'https://']) assert.equal(referenceUrl(value), null);
});

test('existing explanation URLs become links without losing surrounding text', () => {
  const html = renderToStaticMarkup(React.createElement(ExplanationLinks, { text: 'Reference:\nhttps://example.com/article?q=one&n=2.\nMore notes.' }));
  assert.match(html, /href="https:\/\/example.com\/article\?q=one&amp;n=2"/);
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
  assert.ok(html.startsWith('Reference:\n'));
  assert.ok(html.endsWith('</a>.\nMore notes.'));
});

test('bold text and links render together while HTML stays escaped', () => {
  const html = renderToStaticMarkup(React.createElement(ExplanationLinks, { text: '**Amazon VPC**\n**https://example.com/page** <script>alert(1)</script>' }));
  assert.ok(html.startsWith('<strong>Amazon VPC</strong>\n'));
  assert.match(html, /<strong><a href="https:\/\/example.com\/page"/);
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
});

test('Bold wraps a selection, toggles it off, and supplies text at an empty cursor', () => {
  const editor = readFileSync(new URL('../src/pages/admin/flashbolt/ExplanationEditor.tsx', import.meta.url), 'utf8');
  const handler = editor.match(/  function bold\(\) \{[\s\S]*?\n  }/)[0];
  function apply(value, start, end) {
    let next;
    let selection;
    const input = { selectionStart: start, selectionEnd: end, focus() {}, setSelectionRange(a, b) { selection = [a, b]; } };
    vm.runInNewContext(`${handler}\nbold();`, { value, textarea: { current: input }, onChange: text => { next = text; }, requestAnimationFrame: callback => callback() });
    return { next, selection };
  }
  assert.deepEqual(apply('Amazon VPC', 7, 10), { next: 'Amazon **VPC**', selection: [9, 12] });
  assert.deepEqual(apply('Amazon **VPC**', 9, 12), { next: 'Amazon VPC', selection: [7, 10] });
  assert.deepEqual(apply('Amazon **VPC**', 7, 14), { next: 'Amazon VPC', selection: [7, 10] });
  assert.deepEqual(apply('', 0, 0), { next: '**bold text**', selection: [2, 11] });
});
