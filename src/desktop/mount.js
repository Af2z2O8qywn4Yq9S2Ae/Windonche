import { THEMES } from '../themes/registry.js';
import { renderDesktop } from './template.js';
import { bindStartMenu } from './menu.js';
import { bindClock } from './status.js';
import { bindWindowManager } from './window-manager.js';
import desktopCSS from '../styles/desktop.css';

/** Crée le bureau isolé du CSS d'Onche et relie ses commandes au moteur. */
export function mountDesktop(engine) {
  const host = document.createElement('div');
  host.id = 'onche-retro-desktop';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>${desktopCSS}</style>${renderDesktop()}`;
  shadow.addEventListener('error', event => {
    if (event.target instanceof HTMLImageElement) event.target.style.visibility = 'hidden';
  }, true);
  document.body.append(host);
  const select = selector => shadow.querySelector(selector);
  const menu = bindStartMenu(shadow, host);
  const windows = bindWindowManager(shadow, { onActivate: () => menu.close() });

  function apply(patch = {}) {
    engine.update(patch);
    const { enabled, theme, compact } = engine.state;
    document.documentElement.toggleAttribute('data-onche-windowed', enabled);
    select('.workspace').hidden = !enabled;
    select('.taskbar').hidden = !enabled;
    select('.restore').hidden = enabled;
    select('.brand').textContent = THEMES[theme].name;
    for (const [id, definition] of Object.entries(THEMES)) {
      select(`#w${id} span`).textContent = `${theme === id ? '✓' : '○'}  ${definition.name}`;
      select(`#w${id}`).setAttribute('aria-pressed', String(theme === id));
    }
    select('#density span').textContent = `${compact ? '✓' : '○'}  Liste compacte`;
    select('#density').setAttribute('aria-pressed', String(compact));
    windows.setTheme(engine.state);
    menu.close();
  }

  function setEnabled(enabled) {
    apply({ enabled });
    // Ne pas laisser le focus sur un bouton devenu invisible.
    select(enabled ? '.start' : '.restore').focus();
  }
  for (const theme of Object.keys(THEMES)) {
    select(`#w${theme}`).addEventListener('click', () => {
      apply({ theme });
      menu.start.focus();
    });
  }
  select('#density').addEventListener('click', () => {
    apply({ compact: !engine.state.compact });
    menu.start.focus();
  });
  select('#disable').addEventListener('click', () => setEnabled(false));
  select('.restore').addEventListener('click', () => setEnabled(true));
  for (const link of shadow.querySelectorAll('[data-window-url]')) {
    link.addEventListener('click', event => {
      event.preventDefault();
      windows.openURL(link.dataset.windowUrl, link.textContent);
      menu.close();
    });
  }
  bindClock(shadow);
  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('Activer / désactiver Windows 95/98', () => setEnabled(!engine.state.enabled));
  }
  apply();
}
