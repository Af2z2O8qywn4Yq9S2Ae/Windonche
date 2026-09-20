import { THEMES } from '../themes/registry.js';
import { icon } from '../icons/assets.js';

export function renderDesktop() {
  return `<div class="title" data-version="98">${icon('internet-explorer-16x16')}<span class="caption">Onche — Internet Explorer</span><button class="raised close" title="Rétablir l’apparence d’origine" aria-label="Désactiver le thème Windows">×</button></div>
<nav class="menu" aria-label="Menu Démarrer" id="start-menu" hidden>
 <div class="brand" aria-hidden="true">Windows 98</div>
 <div class="items">
  <a href="/">${icon('my-computer-32x32',32)}<span>Accueil Onche</span></a>
  <a href="/forum/1/blabla-general">${icon('news-32x32',32)}<span>Blabla Général</span></a>
  <hr>
  ${Object.entries(THEMES).map(([id,t])=>`<button id="w${id}" aria-pressed="false">${icon('themes-32x32',32)}<span>${t.name}</span></button>`).join('')}
  <button id="density" aria-pressed="false">${icon('settings-32x32',32)}<span>Liste compacte</span></button>
  <hr>
  <button id="disable">${icon('shutdown-32x32',32)}<span>Apparence d’origine</span></button>
 </div>
</nav>
<div class="taskbar" role="navigation" aria-label="Bureau Windows">
 <button class="raised start" aria-expanded="false" aria-controls="start-menu">${icon('windows-22x22-8bpp',22)}<span>Démarrer</span></button>
 <span class="separator" aria-hidden="true"></span>
 <button class="raised task pressed" title="Retour en haut de page">${icon('internet-explorer-16x16')}<span class="task-label">Onche — Internet Explorer</span></button>
 <div class="tray"><span class="network" aria-hidden="true">${icon('network-16x16')}</span><time></time></div>
</div>
<button class="raised restore" hidden>${icon('windows-22x22-8bpp',22)} Activer Windows 95/98</button>`;
}
