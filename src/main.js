import { THEMES } from './themes/registry.js';
import { ThemeEngine } from './themes/engine.js';
import { installStyles } from './styles/install.js';
import { installSiteIcons } from './icons/site-icons.js';
import { mountDesktop } from './desktop/mount.js';
import { prepareTopicFrame } from './desktop/topic-frame.js';

// Les iframes reçoivent le thème, mais seul le document principal crée le bureau.
if (!document.getElementById('onche-retro-tokens')) {
  const engine = new ThemeEngine(THEMES);
  installStyles(engine);
  installSiteIcons(engine);
  if (window.top === window.self) {
    if (!document.getElementById('onche-retro-desktop')) mountDesktop(engine);
  } else {
    document.documentElement.setAttribute('data-onche-frame', '');
    prepareTopicFrame();
    engine.update();
    window.addEventListener('message', event => {
      if (event.origin !== window.location.origin || event.source !== window.top) return;
      if (event.data?.type === 'onche-retro-theme') engine.update(event.data.state);
    });
  }
}
