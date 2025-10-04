import {
  AVAILABLE_THEMES,
  getFallbackAvatarForTheme,
  getThemeClassList,
  normalizeThemeName,
} from '../theme';

import test from 'node:test';
import assert from 'node:assert/strict';

test('theme helpers normalizan nombres legados', () => {
  assert.equal(normalizeThemeName('tamara'), 'blossom');
  assert.equal(normalizeThemeName('CARLOS'), 'dark');
  assert.equal(normalizeThemeName('blossom'), 'blossom');
});

test('theme helpers devuelven null para valores desconocidos', () => {
  assert.equal(normalizeThemeName('unknown-theme'), null);
  assert.equal(normalizeThemeName(''), null);
});

test('theme helpers generan clases correctas', () => {
  assert.deepEqual(getThemeClassList('dark'), ['dark', 'theme-dark']);
  assert.deepEqual(getThemeClassList('blossom'), ['theme-blossom']);
});

test('theme helpers entregan avatares de respaldo', () => {
  assert.equal(getFallbackAvatarForTheme('blossom'), '/img/blossom.png');
  assert.equal(getFallbackAvatarForTheme('dark'), '/img/dark.png');
});

test('lista de temas disponibles está sincronizada', () => {
  assert.deepEqual(AVAILABLE_THEMES, ['blossom', 'dark']);
});
