import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { THEMES } from '../src/themes/registry.js';
import { MODES, applyMode } from '../src/themes/modes.js';
import { contrast, validateContrast } from '../src/themes/contrast.js';
import { ThemeEngine } from '../src/themes/engine.js';
import { read, write } from '../src/platform/storage.js';

function fakeDocument() {
  const attributes = new Map();
  const styles = [];
  return {
    styles, attributes,
    documentElement: {
      setAttribute: (key, value) => attributes.set(key, value),
      removeAttribute: key => attributes.delete(key),
      toggleAttribute: (key, enabled) => enabled ? attributes.set(key, '') : attributes.delete(key),
    },
    head: { append: element => styles.push(element) },
    createElement: () => ({ remove() { styles.splice(styles.indexOf(this), 1); } }),
  };
}
afterEach(() => { delete globalThis.GM_getValue; delete globalThis.GM_setValue; });

test('contrastes connus et validation des thèmes dans les trois modes', () => {
  assert.equal(contrast('#000000', '#ffffff'), 21);
  assert.equal(contrast('#808080', '#808080'), 1);
  for (const theme of Object.values(THEMES)) {
    for (const mode of Object.keys(MODES)) assert.doesNotThrow(() => validateContrast(applyMode(theme, mode)));
  }
  assert.throws(() => validateContrast({ ...THEMES['98'], ink: '#c0c0c0' }), /Contraste/);
  assert.throws(() => contrast('invalid', '#ffffff'), /#RRGGBB/);
});

test('stockage absent ou inaccessible : préférences de session', () => {
  assert.equal(read('key', 42), 42);
  assert.doesNotThrow(() => write('key', 42));
  globalThis.GM_getValue = () => { throw new Error('unavailable'); };
  globalThis.GM_setValue = () => { throw new Error('unavailable'); };
  const engine = new ThemeEngine(THEMES, fakeDocument());
  assert.doesNotThrow(() => engine.update({ theme: '95', compact: true }));
  assert.equal(engine.state.theme, '95');
});

test('migration des anciennes clés et rejet des noms de thème hérités du prototype', () => {
  for (const theme of ['missing', 'toString', '__proto__', null]) {
    globalThis.GM_getValue = (key, fallback) => key === 'retro-version' ? theme : fallback;
    assert.equal(new ThemeEngine(THEMES, fakeDocument()).state.theme, '98');
  }
  const saved = { 'retro-version': '95', 'retro-enabled': false, 'retro-compact': true };
  globalThis.GM_getValue = (key, fallback) => saved[key] ?? fallback;
  globalThis.GM_setValue = (key, value) => { saved[key] = value; };
  const document = fakeDocument();
  const engine = new ThemeEngine(THEMES, document);
  assert.deepEqual(engine.state, { theme: '95', mode: 'light', enabled: false, compact: true });
  engine.update({ enabled: true });
  assert.equal(saved['retro-enabled'], true);
  assert.equal(document.attributes.get('data-onche-retro'), '95');
  assert.equal(document.attributes.get('data-onche-mode'), 'light');
  assert.ok(document.attributes.has('data-onche-compact'));
  engine.update({ enabled: false });
  assert.equal(document.attributes.size, 0);
});

test('un thème invalide ne modifie ni état ni styles ni stockage', () => {
  let writes = 0;
  globalThis.GM_setValue = () => writes++;
  const engine = new ThemeEngine({ ...THEMES, bad: { ...THEMES['98'], ink: '#c0c0c0' } }, fakeDocument());
  engine.update();
  const before = { state: engine.state, css: engine.tokens.textContent, writes };
  for (const theme of ['bad', 'unknown', 'toString']) assert.throws(() => engine.update({ theme }));
  for (const mode of ['unknown', 'toString']) assert.throws(() => engine.update({ mode }));
  assert.equal(engine.state, before.state);
  assert.equal(engine.tokens.textContent, before.css);
  assert.equal(writes, before.writes);
});

test('le mode mémorisé est validé et modifie la palette', () => {
  const saved = { 'retro-mode': 'dark' };
  globalThis.GM_getValue = (key, fallback) => saved[key] ?? fallback;
  globalThis.GM_setValue = (key, value) => { saved[key] = value; };
  const document = fakeDocument();
  const engine = new ThemeEngine(THEMES, document);
  engine.update();
  assert.equal(engine.state.mode, 'dark');
  assert.match(engine.tokens.textContent, /--w9-surface:#1e1e1e/);
  engine.update({ mode: 'black' });
  assert.equal(saved['retro-mode'], 'black');
  assert.equal(document.attributes.get('data-onche-mode'), 'black');
});

test('couches idempotentes et nettoyage du moteur', () => {
  const document = fakeDocument();
  const engine = new ThemeEngine(THEMES, document);
  const layer = engine.use('test', 'a{}');
  assert.equal(engine.use('test', 'b{}'), layer);
  assert.equal(layer.textContent, 'b{}');
  assert.equal(document.styles.length, 2);
  engine.update();
  engine.destroy();
  assert.equal(document.styles.length, 0);
  assert.equal(document.attributes.size, 0);
});
