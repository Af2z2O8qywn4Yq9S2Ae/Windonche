import { THEMES } from '../themes/registry.js';
import { renderDesktop } from './template.js';
import { bindStartMenu } from './menu.js';
import { bindStatus } from './status.js';
import { bindTopicTabs } from './topic-tabs.js';
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
  const topics = bindTopicTabs(shadow);

  function apply(patch = {}) {
    engine.update(patch);
    const { enabled, theme, compact } = engine.state;
    select('.title').hidden = !enabled;
    select('.taskbar').hidden = !enabled;
    select('.restore').hidden = enabled;
    select('.title').dataset.version = theme;
    select('.brand').textContent = THEMES[theme].name;
    const close = select('.close');
    close.title = topics.currentId ? 'Fermer ce topic' : 'Rétablir l’apparence d’origine';
    close.setAttribute('aria-label', topics.currentId ? 'Fermer ce topic' : 'Désactiver le thème Windows');
    for (const [id, definition] of Object.entries(THEMES)) {
      select(`#w${id} span`).textContent = `${theme === id ? '✓' : '○'}  ${definition.name}`;
      select(`#w${id}`).setAttribute('aria-pressed', String(theme === id));
    }
    select('#density span').textContent = `${compact ? '✓' : '○'}  Liste compacte`;
    select('#density').setAttribute('aria-pressed', String(compact));
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
  select('.close').addEventListener('click', () => {
    if (!topics.closeCurrent()) setEnabled(false);
  });
  select('.restore').addEventListener('click', () => setEnabled(true));
  bindStatus(shadow, title => topics.updateTitle(title));
  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('Activer / désactiver Windows 95/98', () => setEnabled(!engine.state.enabled));
  }
  apply();
}
