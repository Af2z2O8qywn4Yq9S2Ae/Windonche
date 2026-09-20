import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from '../scripts/build.mjs';

// PLAYWRIGHT_MODULE permet de réutiliser une installation locale, sans l'imposer au build.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fixture = await readFile(new URL('./fixtures/forum.html', import.meta.url), 'utf8');
const original = await readFile(new URL('./fixtures/original.user.js', import.meta.url), 'utf8');
const script = await build();
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
let scenarios = 0;
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // Icônes indisponibles : le bureau doit rester utilisable sans réseau.
    await page.route('https://raw.githubusercontent.com/**', route => route.abort());
    async function load(source, values = {}) {
      await page.goto('about:blank');
      await page.setContent(fixture);
      await page.evaluate(values => {
        window.saved = values;
        window.GM_getValue = (key, fallback) => window.saved[key] ?? fallback;
        window.GM_setValue = (key, value) => { window.saved[key] = value; };
        window.GM_registerMenuCommand = (_, callback) => { window.toggleRetro = callback; };
      }, values);
      await page.addScriptTag({ content: source });
      await page.waitForFunction(() => [...document.querySelector('#onche-retro-desktop').shadowRoot.querySelectorAll('img')].every(image => image.complete));
      await page.evaluate(() => document.fonts.ready);
    }
    // Comparaison visuelle de la sortie générée et de l'original sur la même fixture.
    await load(original);
    // Masquer l'horloge rend la comparaison indépendante d'un changement de minute.
    const baseline = await page.screenshot({ animations: 'disabled', mask: [page.locator('#onche-retro-desktop time')] });
    await load(script);
    const current = await page.screenshot({ animations: 'disabled', mask: [page.locator('#onche-retro-desktop time')] });
    assert.ok(baseline.equals(current), `Régression visuelle à ${width}px`);
    const desktop = page.locator('#onche-retro-desktop');
    const start = desktop.locator('.start');
    const focusClass = () => page.evaluate(() => document.querySelector('#onche-retro-desktop').shadowRoot.activeElement?.className);
    await start.click();
    assert.equal(await start.getAttribute('aria-expanded'), 'true');
    await page.keyboard.press('End');
    assert.equal(await page.evaluate(() => document.querySelector('#onche-retro-desktop').shadowRoot.activeElement.id), 'disable');
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowDown');
    assert.match(await page.evaluate(() => document.querySelector('#onche-retro-desktop').shadowRoot.activeElement.textContent), /Blabla/);
    await page.keyboard.press('Escape');
    assert.equal(await start.getAttribute('aria-expanded'), 'false');
    assert.match(await focusClass(), /start/);
    await start.click();
    await desktop.locator('#w95').click();
    assert.equal(await page.locator('html').getAttribute('data-onche-retro'), '95');
    assert.match(await focusClass(), /start/);
    await start.click();
    await desktop.locator('#density').click();
    assert.equal(await page.locator('html').getAttribute('data-onche-compact'), '');
    await desktop.locator('.close').click();
    assert.equal(await page.locator('html').getAttribute('data-onche-retro'), null);
    assert.match(await focusClass(), /restore/);
    await desktop.locator('.restore').click();
    assert.match(await focusClass(), /start/);
    assert.equal(await page.locator('html').getAttribute('data-onche-retro'), '95');
    await page.locator('#native-action').click();
    assert.equal(await page.evaluate(() => window.nativeClicks), 1);
    assert.equal(await page.locator('.native-hidden').isVisible(), false);
    await page.locator('.spoiler').click();
    assert.ok(await page.locator('.spoiler').evaluate(element => element.classList.contains('revealed')));
    await page.evaluate(() => { document.title = 'Titre modifié'; });
    await page.waitForFunction(() => document.querySelector('#onche-retro-desktop').shadowRoot.querySelector('.caption').textContent.includes('Titre modifié'));
    await page.addScriptTag({ content: script });
    assert.equal(await page.locator('#onche-retro-desktop').count(), 1);
    const saved = await page.evaluate(() => window.saved);
    await load(script, saved);
    assert.equal(await page.locator('html').getAttribute('data-onche-retro'), '95');
    assert.equal(await page.locator('html').getAttribute('data-onche-compact'), '');
    await page.evaluate(() => window.toggleRetro());
    assert.equal(await page.locator('html').getAttribute('data-onche-retro'), null);
    assert.deepEqual(errors, []);
    await page.close();
    scenarios++;
  }
  console.log(`${scenarios} scénarios navigateur réussis (bureau et mobile, comparaison visuelle avec l'original).`);
} finally {
  await browser.close();
}
