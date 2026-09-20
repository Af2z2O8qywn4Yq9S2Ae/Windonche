import { iconURL } from './assets.js';

export function installSiteIcons(engine) {
  const iconMap = {
    'folder-16x16': '.topic-left .mdi-folder',
    'folder-open-16x16': '.topic-left .mdi-folder-open',
    'document-16x16': '.topic-left .mdi-pin',
    'news-16x16': '.topic-left .mdi-fire, .title .mdi-fire',
    'favorites-16x16': '.mdi-star, .mdi-star-outline, .title .mdi-trophy-variant-outline',
    'find-file-16x16': '.mdi-magnify',
    'mail-16x16': '.mdi-email, .mdi-email-outline',
    'notepad-16x16': '.mdi-pencil-plus',
    'help-16x16': '.mdi-help-circle, .mdi-help-circle-outline',
    'settings-16x16': '.mdi-cog, .mdi-cog-outline, #theme-button .mdi',
    'recycle-bin-16x16': '.mdi-delete, .mdi-delete-outline',
    'my-computer-16x16': '.mdi-account, .mdi-account-circle'
  };
  const iconStyle = engine.use('icons','');
  Object.entries(iconMap).forEach(([name, selectors]) => {
    const image = new Image();
    image.referrerPolicy = 'no-referrer';
    image.onload = () => {
      const target = selectors.split(',').map(s => `html[data-onche-retro] ${s.trim()}::before`).join(',');
      iconStyle.append(document.createTextNode(`${target}{content:""!important;display:inline-block!important;width:16px!important;height:16px!important;background:transparent url("${iconURL(name)}") center/16px 16px no-repeat!important;image-rendering:pixelated;vertical-align:middle;transform:none!important;}`));
    };
    image.src = iconURL(name);
  });

}
