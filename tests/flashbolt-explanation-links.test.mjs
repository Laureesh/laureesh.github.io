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
