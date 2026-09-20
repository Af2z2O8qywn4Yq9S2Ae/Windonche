import { read, write } from '../platform/storage.js';
import { validateContrast } from './contrast.js';
import { MODES, applyMode } from './modes.js';

/** Gère la palette, les couches CSS et les préférences, sans connaître le bureau. */
export class ThemeEngine {
  constructor(registry, documentRef = document) {
    this.registry = registry;
    this.document = documentRef;
    this.root = documentRef.documentElement;
    const storedTheme = read('retro-version', '98');
    const storedMode = read('retro-mode', 'light');
    this.state = {
      enabled: read('retro-enabled', true) !== false,
      theme: Object.hasOwn(registry, storedTheme) ? storedTheme : '98',
      mode: Object.hasOwn(MODES, storedMode) ? storedMode : 'light',
      compact: read('retro-compact', false) === true,
    };
    this.layers = new Map();
    this.tokens = documentRef.createElement('style');
    this.tokens.id = 'onche-retro-tokens';
    documentRef.head.append(this.tokens);
  }

  use(name, css) {
    let sheet = this.layers.get(name);
    if (!sheet) {
      sheet = this.document.createElement('style');
      sheet.id = `onche-retro-${name}`;
      this.document.head.append(sheet);
      this.layers.set(name, sheet);
    }
    sheet.textContent = css;
    return sheet;
  }

  update(patch = {}) {
    const next = { ...this.state, ...patch };
    if (!Object.hasOwn(this.registry, next.theme)) {
      throw new Error(`Thème inconnu : ${next.theme}`);
    }
    if (!Object.hasOwn(MODES, next.mode)) {
      throw new Error(`Mode inconnu : ${next.mode}`);
    }
    const theme = applyMode(this.registry[next.theme], next.mode);
    validateContrast(theme);
    const variables = Object.entries(theme)
      .filter(([key]) => key !== 'name')
      .map(([key, value]) => `--w9-${key}:${value}`)
      .join(';');
    this.tokens.textContent = `html[data-onche-retro],#onche-retro-desktop{${variables};
      --w9-title:linear-gradient(90deg,var(--w9-titleStart),var(--w9-titleEnd));
      --w9-raised:inset 1px 1px var(--w9-light),inset -1px -1px var(--w9-dark),inset 2px 2px var(--w9-edge),inset -2px -2px var(--w9-shadow);
      --w9-sunken:inset 1px 1px var(--w9-shadow),inset -1px -1px var(--w9-light),inset 2px 2px var(--w9-dark),inset -2px -2px var(--w9-edge);
      --w9-chrome-height:70px;}`;
    this.state = next;
    if (next.enabled) this.root.setAttribute('data-onche-retro', next.theme);
    else this.root.removeAttribute('data-onche-retro');
    if (next.enabled) this.root.setAttribute('data-onche-mode', next.mode);
    else this.root.removeAttribute('data-onche-mode');
    this.root.toggleAttribute('data-onche-compact', next.enabled && next.compact);
    write('retro-enabled', next.enabled);
    write('retro-version', next.theme);
    write('retro-mode', next.mode);
    write('retro-compact', next.compact);
  }

  destroy() {
    this.root.removeAttribute('data-onche-retro');
    this.root.removeAttribute('data-onche-mode');
    this.root.removeAttribute('data-onche-compact');
    for (const sheet of this.layers.values()) sheet.remove();
    this.layers.clear();
    this.tokens.remove();
  }
}
