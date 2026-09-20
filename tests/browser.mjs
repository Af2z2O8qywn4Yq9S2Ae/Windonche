import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from '../scripts/build.mjs';

// PLAYWRIGHT_MODULE permet de réutiliser une installation locale, sans l'imposer au build.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fixture = await readFile(new URL('./fixtures/forum.html', import.meta.url), 'utf8');
const script = await build();
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
let scenarios = 0;
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://raw.githubusercontent.com/**', route => route.abort());
    await page.route('https://onche.org/**', route => {
      if (route.request().resourceType() === 'document') {
        return route.fulfill({ status: 200, contentType: 'text/html', body: fixture });
      }
      return route.abort();
    });
    async function load(values = {}) {
      await page.goto('https://onche.org/forum/1/blabla-general');
      await page.evaluate(initial => {
        window.saved = initial;
        window.GM_getValue = (key, fallback) => window.saved[key] ?? fallback;
        window.GM_setValue = (key, value) => { window.saved[key] = value; };
        window.GM_registerMenuCommand = (_, callback) => { window.toggleRetro = callback; };
      }, values);
      await page.addScriptTag({ content: script });
      await page.waitForFunction(() => [...document.querySelector('#onche-retro-desktop').shadowRoot.querySelectorAll('img')].every(image => image.complete));
      await page.waitForFunction(() => document.querySelector('#onche-retro-desktop').shadowRoot.querySelectorAll('.window').length === 1);
    }
    await load();
    const desktop = page.locator('#onche-retro-desktop');
    const start = desktop.locator('.start');
    assert.equal(await desktop.locator('.task').count(), 1);
    assert.equal(await desktop.locator('.task').getAttribute('aria-selected'), 'true');
    assert.equal(await desktop.locator('.window').count(), 1);

    const forumFrame = page.frames().find(frame => frame !== page.mainFrame());
    assert.ok(forumFrame, 'iframe du forum absente');
    await forumFrame.addScriptTag({ content: script });
    assert.equal(await forumFrame.locator('#onche-retro-desktop').count(), 0);
    assert.equal(await forumFrame.locator('html').getAttribute('data-onche-frame'), '');
    assert.equal(await forumFrame.locator('.pagination a.active').getAttribute('aria-current'), 'page');
    assert.equal(await forumFrame.locator('.pagination a.active').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(0, 0, 128)');

    const titlebar = desktop.locator('.window-title').first();
    if (width > 700) {
      const before = await desktop.locator('.window').first().evaluate(element => element.offsetLeft);
      const box = await titlebar.boundingBox();
      await page.mouse.move(box.x + 80, box.y + 10);
      await page.mouse.down();
      await page.mouse.move(box.x + 130, box.y + 35);
      await page.mouse.up();
      const after = await desktop.locator('.window').first().evaluate(element => element.offsetLeft);
      assert.ok(after > before, 'la fenêtre ne se déplace pas');
    }

    await forumFrame.locator('.topic-subject').click();
    await desktop.locator('.window').nth(1).waitFor();
    assert.equal(await desktop.locator('.window').count(), 2);
    assert.deepEqual(await desktop.locator('.task').evaluateAll(items => items.map(item => item.dataset.windowId)), ['forum:1', 'topic:42']);
    await desktop.locator('.task').first().click();
    assert.deepEqual(await desktop.locator('.task').evaluateAll(items => items.map(item => item.dataset.windowId)), ['forum:1', 'topic:42']);
    await desktop.locator('.task').nth(1).click();
    await desktop.locator('.window[data-window-id="topic:42"] .minimize').click();
    assert.equal(await desktop.locator('.window[data-window-id="topic:42"]').isHidden(), true);
    await desktop.locator('.task').nth(1).click();
    assert.equal(await desktop.locator('.window[data-window-id="topic:42"]').isVisible(), true);
    await desktop.locator('.window[data-window-id="topic:42"] .window-close').click();
    assert.equal(await desktop.locator('.window').count(), 1);

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
    await start.click();
    await desktop.locator('#disable').click();
    assert.equal(await page.locator('html').getAttribute('data-onche-retro'), null);
    assert.equal(await page.locator('html').getAttribute('data-onche-windowed'), null);
    assert.match(await focusClass(), /restore/);
    await desktop.locator('.restore').click();
    assert.match(await focusClass(), /start/);
    assert.equal(await page.locator('html').getAttribute('data-onche-retro'), '95');
    await page.addScriptTag({ content: script });
    assert.equal(await page.locator('#onche-retro-desktop').count(), 1);
    await page.evaluate(() => window.toggleRetro());
    assert.equal(await page.locator('html').getAttribute('data-onche-retro'), null);
    assert.deepEqual(errors, []);
    await page.close();
    scenarios++;
  }
  console.log(`${scenarios} scénarios navigateur réussis (fenêtres, bureau et mobile).`);
} finally {
  await browser.close();
}
