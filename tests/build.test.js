import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Script, runInNewContext } from 'node:vm';
import { build, bundle } from '../scripts/build.mjs';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const normalize = text => text.trim().replace(/\s+/g, ' ');

test('build reproductible, autonome, un seul en-tête Onche', async () => {
  const first = await build();
  assert.equal(await build(), first);
  assert.equal((first.match(/==UserScript==/g) || []).length, 1);
  assert.ok(first.includes('// @match        https://onche.org/*'));
  assert.ok(!first.includes('chatgpt.com'));
  assert.ok(first.includes('raw.githubusercontent.com/Af2z2O8qywn4Yq9S2Ae/Windonche/main/assets/icons/'));
  assert.ok(!first.includes('98.js.org/images/icons/'));
  assert.doesNotThrow(() => new Script(first));
});

test('bibliothèque locale complète et icônes utilisées présentes', async () => {
  const files = new Set((await readdir(new URL('../assets/icons/', import.meta.url)))
    .filter(name => name.endsWith('.png')));
  assert.equal(files.size, 243);
  const sources = await Promise.all([
    'src/icons/site-icons.js',
    'src/styles/install.js',
    'src/desktop/template.js'
  ].map(read));
  const referenced = sources.flatMap(source =>
    [...source.matchAll(/icon(?:URL)?\\('([^']+)'/g)].map(match => `${match[1]}.png`)
  );
  assert.ok(referenced.length > 0);
  for (const filename of referenced) assert.ok(files.has(filename), `${filename} absent de assets/icons`);
});


test('les commandes visibles du site ont un équivalent Windows', async () => {
  const siteIcons = await read('src/icons/site-icons.js');
  for (const iconClass of [
    'mdi-bell',
    'mdi-incognito',
    'mdi-dots-vertical',
    'mdi-refresh',
    'mdi-plus',
    'mdi-paperclip',
    'mdi-microphone',
    'mdi-emoticon-plus-outline',
    'mdi-send'
  ]) assert.ok(siteIcons.includes(`.${iconClass}`), `${iconClass} sans correspondance`);
});

test('extraction CSS sans changement de cascade ou de règles', async () => {
  const original = await read('tests/fixtures/original.user.js');
  const expected = original.match(/engine.use\('components', `\n([\s\S]*?)\n`\);/)[1]
    .replace("${iconURL('internet-explorer-16x16')}", '__BROWSER_ICON_URL__');
  const parts = await Promise.all(['layout', 'topics', 'messages', 'controls', 'widgets']
    .map(name => read(`src/styles/${name}.css`)));
  assert.equal(normalize(parts.join('\n')), normalize(expected));
  const adapter = original.match(/engine.use\('onche-adapter', `\n([\s\S]*?)\n`\);/)[1];
  assert.equal(normalize(await read('src/styles/onche-adapter.css')), normalize(adapter));
  const desktop = original.match(/<style>\n([\s\S]*?)\n<\/style>/)[1];
  assert.equal(normalize(await read('src/styles/desktop.css')), normalize(desktop));
});

test('assembleur : portées isolées, CSS littéral, cycles et imports externes refusés', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'windonche-'));
  try {
    await writeFile(join(temporary, 'style.css'), 'a::after { content: "${literal}`"; }');
    await writeFile(join(temporary, 'a.js'), 'export const value = 7;\n');
    await writeFile(join(temporary, 'main.js'), "import { value } from './a.js';\nimport css from './style.css';\nglobalThis.result = [value, css];\n");
    const context = {};
    runInNewContext(await bundle('main.js', temporary), context);
    assert.equal(context.result[0], 7);
    assert.ok(context.result[1].includes('${literal}`'));
    await writeFile(join(temporary, 'a.js'), "import { value } from './main.js';\nexport const other = 2;\n");
    await assert.rejects(bundle('main.js', temporary), /circulaire/);
    await writeFile(join(temporary, 'main.js'), "import { value } from 'external';\n");
    await assert.rejects(bundle('main.js', temporary), /non local/);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
