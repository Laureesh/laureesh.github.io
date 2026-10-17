import assert from 'node:assert/strict';
import test from 'node:test';
import { SET_COLORS, getSetColor, colorText } from '../src/pages/admin/flashbolt/setColors.ts';

test('named colors preserve legacy IDs and supplied hex values', () => {
  assert.equal(new Set(SET_COLORS.map(color => color.value)).size, SET_COLORS.length);
  for (const id of ['violet', 'mint', 'amber', 'coral', 'blue', 'cyan', 'green', 'orange', 'pink', 'red']) {
    assert.equal(getSetColor(id).value, id);
  }
  assert.equal(getSetColor('cherry-rose').hex, '#ab274f');
  assert.equal(getSetColor('sage-green').hex, '#7ba05b');
  assert.equal(getSetColor('unknown').value, 'violet');
});

test('swatch text meets 4.5:1 contrast for every color', () => {
  const luminance = hex => {
    const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  for (const color of SET_COLORS) {
    assert.match(color.hex, /^#[0-9a-f]{6}$/);
    const a = luminance(color.hex), b = luminance(colorText(color.hex));
    assert((Math.max(a, b) + .05) / (Math.min(a, b) + .05) >= 4.5, color.label);
  }
});

test('extended palette includes new families and preserves same-name color variants', () => {
  assert.equal(getSetColor('moss-green').hex, '#74c365');
  assert.equal(getSetColor('electric-indigo').hex, '#6f00ff');
  assert.equal(getSetColor('porcelain').hex, '#fefefa');
  assert.equal(getSetColor('pitch-black').hex, '#100c08');
  assert(SET_COLORS.some(color => color.label === 'Sky Blue' && color.hex === '#87cefa'));
  assert.equal(getSetColor('sky-blue').hex, '#87ceeb', 'existing saved colors keep their original shade');
  assert.equal(new Set(SET_COLORS.map(color => `${color.label.toLowerCase()}:${color.hex}`)).size, SET_COLORS.length);
});
