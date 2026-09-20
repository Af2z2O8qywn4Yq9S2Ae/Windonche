import layout from './layout.css';
import topics from './topics.css';
import messages from './messages.css';
import controls from './controls.css';
import widgets from './widgets.css';
import adapter from './onche-adapter.css';
import { iconURL } from '../icons/assets.js';

/** L'ordre de cascade reproduit celui du userscript d'origine. */
export function installStyles(engine) {
  engine.use('components', [layout, topics, messages, controls, widgets]
    .join('\n').replaceAll('__BROWSER_ICON_URL__', iconURL('internet-explorer-16x16')));
  engine.use('onche-adapter', adapter);
}
