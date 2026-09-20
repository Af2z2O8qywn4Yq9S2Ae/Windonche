import { THEMES } from './themes/registry.js';
import { ThemeEngine } from './themes/engine.js';
import { installStyles } from './styles/install.js';
import { installSiteIcons } from './icons/site-icons.js';
import { mountDesktop } from './desktop/mount.js';

// Un seul bureau, uniquement dans la fenêtre principale.
if (window.top === window.self && !document.getElementById('onche-retro-desktop')) {
  const engine = new ThemeEngine(THEMES);
  installStyles(engine);
  installSiteIcons(engine);
  mountDesktop(engine);
}
