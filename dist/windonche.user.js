// ==UserScript==
// @name         Onche — Windows 95 / 98
// @namespace    local.onche.windows-retro
// @version      2.4.0
// @description  Bureau Windows 95/98 pour Onche avec fenêtres de topics déplaçables et icônes auto-hébergées.
// @match        https://onche.org/*
// @match        https://www.onche.org/*
// @run-at       document-end
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @license      MIT
// ==/UserScript==

// Généré par npm run build — modifier src/, pas ce fichier.
(() => {
'use strict';
const modules = Object.create(null);

// Source: src/themes/registry.js
modules["src/themes/registry.js"] = (() => {
const CLASSIC = Object.freeze({
  desktop:'#008080', face:'#c0c0c0', surface:'#ffffff', ink:'#000000',
  muted:'#404040', link:'#000080', visited:'#800080', selected:'#000080',
  selectedText:'#ffffff', titleStart:'#000080', titleEnd:'#005a9e',
  light:'#ffffff', edge:'#dfdfdf', shadow:'#808080', dark:'#0a0a0a',
  stripe:'#f3f3f3', quote:'#efefef', tip:'#ffffe1', desktopText:'#ffffff',
  font:'Tahoma,"MS Sans Serif",Arial,sans-serif'
});
const THEMES = Object.freeze({
  '95': Object.freeze({...CLASSIC, name:'Windows 95', titleEnd:'#000080'}),
  '98': Object.freeze({...CLASSIC, name:'Windows 98'})
});

return { THEMES };
})();

// Source: src/platform/storage.js
modules["src/platform/storage.js"] = (() => {
/** Les clés historiques sont conservées pour migrer sans perdre les préférences. */
function read(key, fallback) {
  try {
    return typeof GM_getValue === 'function' ? GM_getValue(key, fallback) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    if (typeof GM_setValue === 'function') GM_setValue(key, value);
  } catch {
    // Le thème reste utilisable pour la session si le stockage est indisponible.
  }
}

return { read, write };
})();

// Source: src/themes/contrast.js
modules["src/themes/contrast.js"] = (() => {
/** Rapport de luminance relative pour deux couleurs sRGB #RRGGBB. */
function contrast(foreground, background) {
  function luminance(hex) {
    if (!/^#[0-9a-f]{6}$/i.test(hex)) {
      throw new TypeError(`Couleur attendue au format #RRGGBB : ${hex}`);
    }
    const [red, green, blue] = hex.slice(1).match(/../g)
      .map(value => parseInt(value, 16) / 255)
      .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return red * 0.2126 + green * 0.7152 + blue * 0.0722;
  }
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function validateContrast(theme) {
  const pairs = [
    ['ink', 'face'], ['muted', 'face'], ['link', 'surface'],
    ['visited', 'surface'], ['selectedText', 'selected'],
    ['selectedText', 'titleStart'], ['selectedText', 'titleEnd'],
  ];
  for (const [foreground, background] of pairs) {
    if (contrast(theme[foreground], theme[background]) < 4.5) {
      throw new Error(`Contraste insuffisant : ${foreground}/${background}`);
    }
  }
}

return { contrast, validateContrast };
})();

// Source: src/themes/engine.js
modules["src/themes/engine.js"] = (() => {
const { read, write } = modules["src/platform/storage.js"];
const { validateContrast } = modules["src/themes/contrast.js"];

/** Gère la palette, les couches CSS et les préférences, sans connaître le bureau. */
class ThemeEngine {
  constructor(registry, documentRef = document) {
    this.registry = registry;
    this.document = documentRef;
    this.root = documentRef.documentElement;
    const storedTheme = read('retro-version', '98');
    this.state = {
      enabled: read('retro-enabled', true) !== false,
      theme: Object.hasOwn(registry, storedTheme) ? storedTheme : '98',
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
    const theme = this.registry[next.theme];
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
    this.root.toggleAttribute('data-onche-compact', next.enabled && next.compact);
    write('retro-enabled', next.enabled);
    write('retro-version', next.theme);
    write('retro-compact', next.compact);
  }

  destroy() {
    this.root.removeAttribute('data-onche-retro');
    this.root.removeAttribute('data-onche-compact');
    for (const sheet of this.layers.values()) sheet.remove();
    this.layers.clear();
    this.tokens.remove();
  }
}

return { ThemeEngine };
})();

// Source: src/styles/layout.css
modules["src/styles/layout.css"] = { default: "html[data-onche-retro] {\n  background:var(--w9-desktop)!important; color-scheme:light!important;\n  scroll-padding-top:110px; scrollbar-color:var(--w9-face) var(--w9-edge);\n}\n/* Square corners also cover dynamically inserted widgets and pseudo-elements. */\nhtml[data-onche-retro] *,\nhtml[data-onche-retro] *::before,\nhtml[data-onche-retro] *::after {\n  border-radius:0!important;\n  border-start-start-radius:0!important; border-start-end-radius:0!important;\n  border-end-start-radius:0!important; border-end-end-radius:0!important;\n}\nhtml[data-onche-retro] body {\n  background:var(--w9-desktop)!important; background-image:none!important; color:var(--w9-ink)!important;\n  font-family:var(--w9-font)!important;\n  font-size:14px; padding-bottom:48px!important;\n}\nhtml[data-onche-retro] body > header {\n  top:28px!important; height:42px!important; background:var(--w9-face)!important;\n  border:0!important; box-shadow:var(--w9-raised)!important; padding:3px 6px!important;\n}\nhtml[data-onche-retro] body > header .logo { height:36px!important; }\nhtml[data-onche-retro] body > header .logo .image {\n  background:none!important; width:130px!important; height:32px!important;\n  display:flex; align-items:center; justify-content:center; text-decoration:none;\n}\nhtml[data-onche-retro] body > header .logo .image::after {\n  content:\"Onche\"; color:var(--w9-ink); font:700 14px var(--w9-font);\n  letter-spacing:0; text-shadow:none;\n}\nhtml[data-onche-retro] body > header .logo .image::before {\n  content:\"\"; width:16px; height:16px; margin-right:6px;\n  background:url(\"__BROWSER_ICON_URL__\") center/16px 16px no-repeat;\n  image-rendering:pixelated;\n}\nhtml[data-onche-retro] body > header .item { color:var(--w9-ink)!important; height:34px!important; }\nhtml[data-onche-retro] body > header .item .mdi { color:var(--w9-ink)!important; }\nhtml[data-onche-retro] #content { padding-top:88px!important; background:transparent!important; }\nhtml[data-onche-retro] #content > .container { width:min(1280px,calc(100% - 32px))!important; }\nhtml[data-onche-retro] #content #left { min-width:0; }\nhtml[data-onche-retro] body.sticky-right #content #right { top:84px!important; }\nhtml[data-onche-retro] :is(.bloc,.messages > .message,.composer,.home-join,.home-greeting) {\n  border:0!important; border-radius:0!important; background:var(--w9-face)!important;\n  color:var(--w9-ink)!important; box-shadow:var(--w9-raised)!important;\n}\nhtml[data-onche-retro] .bloc { padding:3px!important; }\nhtml[data-onche-retro] .bloc > .title {\n  background:var(--w9-title)!important; color:var(--w9-selectedText)!important; border:0!important;\n  border-radius:0!important; padding:5px 7px!important; min-height:28px;\n}\nhtml[data-onche-retro] .bloc > .title :is(h1,h2,h3,a,.mdi,span) {\n  color:var(--w9-selectedText)!important;\n}\nhtml[data-onche-retro] .bloc > .title :is(h1,h2,h3) { font-size:13px!important; font-weight:700!important; font-family:var(--w9-font)!important; }\nhtml[data-onche-retro] .bloc > .title.is_sticky { position:relative!important; top:auto!important; transform:none!important; }\nhtml[data-onche-retro] .bloc > .content {\n  background:var(--w9-face)!important; color:var(--w9-ink)!important; border-radius:0!important;\n}\nhtml[data-onche-retro] .bloc > .content.links { background:var(--w9-surface)!important; box-shadow:var(--w9-sunken)!important; margin:3px 0 0; }\nhtml[data-onche-retro] .content.links a { color:var(--w9-selected)!important; border-radius:0!important; }\nhtml[data-onche-retro] .content.links a:hover { background:var(--w9-selected)!important; color:var(--w9-selectedText)!important; }\n" };

// Source: src/styles/topics.css
modules["src/styles/topics.css"] = { default: "html[data-onche-retro] .bloc > .topics { background:var(--w9-surface)!important; box-shadow:var(--w9-sunken)!important; padding:2px!important; margin-top:3px; }\nhtml[data-onche-retro] .topics .topic {\n  background:var(--w9-surface)!important; border-bottom:1px solid var(--w9-edge)!important;\n  border-radius:0!important; transition:none!important;\n}\nhtml[data-onche-retro] .topics .topic:nth-child(even) { background:var(--w9-stripe)!important; }\nhtml[data-onche-retro] .topics .topic .topic-subject { color:var(--w9-selected)!important; font-size:14px!important; }\nhtml[data-onche-retro] .topics .topic .topic-subject:visited { color:var(--w9-visited)!important; }\nhtml[data-onche-retro] .topics .topic .topic-subject span { font-family:var(--w9-font)!important; }\nhtml[data-onche-retro] .topics .topic :is(.topic-username,.topic-nb,.right span) { color:var(--w9-muted)!important; }\nhtml[data-onche-retro] .topics .topic:hover { background:var(--w9-selected)!important; }\nhtml[data-onche-retro] .topics .topic:hover :is(.topic-subject,.topic-subject span,.topic-username,.topic-username span,.topic-nb,.right span) { color:var(--w9-selectedText)!important; -webkit-text-fill-color:var(--w9-selectedText)!important; background-image:none!important; }\nhtml[data-onche-retro] .topics .topic::after { background:none!important; animation:none!important; }\nhtml[data-onche-retro] .topics .topic::before { animation:none!important; }\nhtml[data-onche-retro] .topics .topic:focus-within { outline:1px dotted var(--w9-selected); outline-offset:-2px; }\nhtml[data-onche-retro] .topic-left img { border-radius:0!important; }\nhtml[data-onche-retro][data-onche-compact] .topics .topic .topic-subject { padding-top:4px!important; padding-bottom:4px!important; }\nhtml[data-onche-retro][data-onche-compact] .topic-username { display:none!important; }\n" };

// Source: src/styles/messages.css
modules["src/styles/messages.css"] = { default: "html[data-onche-retro] .messages > .message { padding:3px!important; row-gap:0!important; margin-bottom:14px!important; }\nhtml[data-onche-retro] .messages > .message > .message-top {\n  background:var(--w9-title)!important; color:var(--w9-selectedText)!important; padding:5px 7px!important;\n  min-height:38px; font-family:var(--w9-font)!important;\n}\nhtml[data-onche-retro] .messages > .message > .message-top :is(.message-username,.message-username span,.right a,.right .mdi) {\n  color:var(--w9-selectedText)!important; text-shadow:none!important; background-image:none!important;\n  -webkit-text-fill-color:var(--w9-selectedText)!important;\n}\nhtml[data-onche-retro] .messages > .message > .message-top img.avatar {\n  width:30px!important; height:30px!important; border-radius:0!important; border:1px solid var(--w9-surface);\n}\nhtml[data-onche-retro] .messages > .message > .message-content {\n  background:var(--w9-surface)!important; color:var(--w9-ink)!important; margin:3px 0!important; padding:12px!important;\n  box-shadow:var(--w9-sunken)!important; font-size:15px!important; line-height:1.5!important;\n}\nhtml[data-onche-retro] .message-content .message.answer {\n  background:var(--w9-quote)!important; color:var(--w9-ink)!important; border:1px solid var(--w9-shadow)!important;\n  border-left:3px solid var(--w9-shadow)!important; border-radius:0!important; box-shadow:none!important;\n}\nhtml[data-onche-retro] .message.answer .message-content { color:var(--w9-ink)!important; }\nhtml[data-onche-retro] .message-content a.link { color:var(--w9-link)!important; }\nhtml[data-onche-retro] .message-content .signature { color:var(--w9-muted)!important; border-top-color:var(--w9-shadow)!important; }\nhtml[data-onche-retro] .messages > .message > .message-bottom {\n  background:var(--w9-face)!important; padding:5px 7px!important; box-shadow:inset 1px 1px var(--w9-shadow),inset -1px -1px var(--w9-light);\n}\nhtml[data-onche-retro] .message-date { background:transparent!important; color:var(--w9-muted)!important; border-radius:0!important; }\n" };

// Source: src/styles/controls.css
modules["src/styles/controls.css"] = { default: "html[data-onche-retro] :is(button:not(.stories-bubble),.button,input[type=\"submit\"],input[type=\"button\"],.pagination a,.navigation a,.format .items .item,.composer__toolbar .item) {\n  border:0!important; border-radius:0!important; background:var(--w9-face)!important;\n  color:var(--w9-ink)!important; box-shadow:var(--w9-raised)!important;\n  font-family:var(--w9-font)!important; text-shadow:none!important;\n}\nhtml[data-onche-retro] :is(button:not(.stories-bubble),.button,input[type=\"submit\"],input[type=\"button\"],.pagination a,.navigation a) { padding:6px 10px; }\nhtml[data-onche-retro] :is(button:not(.stories-bubble),.button,.pagination a,.navigation a):active,\nhtml[data-onche-retro] .pagination a.active { box-shadow:var(--w9-sunken)!important; background:var(--w9-edge)!important; }\nhtml[data-onche-retro] :is(button:not(.stories-bubble),.button,input,textarea,select,a):focus-visible { outline:1px dotted var(--w9-ink)!important; outline-offset:2px!important; }\nhtml[data-onche-retro] :is(button:disabled,input:disabled,.pagination a.disabled) { color:var(--w9-shadow)!important; text-shadow:1px 1px var(--w9-surface)!important; }\nhtml[data-onche-retro] :is(textarea,select,input:not([type]),input[type=\"text\"],input[type=\"search\"],input[type=\"email\"],input[type=\"password\"],input[type=\"url\"],input[type=\"number\"],.textarea) {\n  background:var(--w9-surface)!important; color:var(--w9-ink)!important; border:0!important; border-radius:0!important;\n  box-shadow:var(--w9-sunken)!important; font-family:var(--w9-font)!important; padding:8px!important;\n}\nhtml[data-onche-retro] :is(input,textarea)::placeholder { color:var(--w9-muted)!important; }\nhtml[data-onche-retro] :is(.composer__toolbar,.composer__footer,.format .items) { background:var(--w9-face)!important; border-radius:0!important; }\nhtml[data-onche-retro] .composer { padding:4px!important; }\nhtml[data-onche-retro] .home-greeting { padding:20px!important; }\nhtml[data-onche-retro] .home-greeting-text { color:var(--w9-selected)!important; font-family:var(--w9-font)!important; }\nhtml[data-onche-retro] footer { color:var(--w9-desktopText)!important; background:transparent!important; }\nhtml[data-onche-retro] footer :is(a,.footer__meta) { color:var(--w9-desktopText)!important; }\nhtml[data-onche-retro] .forum-fab { bottom:54px!important; border-radius:0!important; background:var(--w9-face)!important; color:var(--w9-ink)!important; box-shadow:var(--w9-raised)!important; }\nhtml[data-onche-retro] ::selection { background:var(--w9-selected); color:var(--w9-selectedText); }\n" };

// Source: src/styles/widgets.css
modules["src/styles/widgets.css"] = { default: "/* Finishing: editor, account menu, dialogs, picker and profile cards. */\nhtml[data-onche-retro] :is(.composer__card,#menu,#confirmation_content,.media-picker,.profileCard,.clubCard,.mention-ac) {\n  --menu-bg:var(--w9-face)!important; background:var(--w9-face)!important; color:var(--w9-ink)!important;\n  border:0!important; box-shadow:var(--w9-raised)!important;\n}\nhtml[data-onche-retro] :is(.composer__card,.media-picker) { padding:3px!important; }\nhtml[data-onche-retro] :is(.composer__toolbar,.composer__staff,.composer__edit-actions,.menu__footer,.menu__primary,.media-picker__tools) { background:var(--w9-face)!important; color:var(--w9-ink)!important; }\nhtml[data-onche-retro] :is(.composer__toolbar,.media-picker__tools) { border-top:1px solid var(--w9-surface)!important; border-bottom:1px solid var(--w9-shadow)!important; }\nhtml[data-onche-retro] .composer__textarea { margin:3px 0!important; }\nhtml[data-onche-retro] :is(.menu__header,.media-picker__head) { background:var(--w9-title)!important; color:var(--w9-selectedText)!important; }\nhtml[data-onche-retro] :is(.menu__header,.media-picker__head) :is(a,span,div,h2,h3) { color:var(--w9-selectedText)!important; }\nhtml[data-onche-retro] :is(.menu__item,.menu__section-title,.menu__cta,.menu__level,.media-picker__label,.media-picker__name,.profileCard,.clubCard) { color:var(--w9-ink)!important; }\nhtml[data-onche-retro] .menu__cta { background:var(--w9-face)!important; box-shadow:var(--w9-raised)!important; }\nhtml[data-onche-retro] .menu__item:hover { color:var(--w9-selectedText)!important; background:var(--w9-selected)!important; }\nhtml[data-onche-retro] .menu__item:hover * { color:inherit!important; }\nhtml[data-onche-retro] #confirmation_content span { color:var(--w9-ink)!important; }\nhtml[data-onche-retro] #toast { bottom:45px!important; background:var(--w9-tip)!important; color:var(--w9-ink)!important; border:1px solid var(--w9-ink)!important; box-shadow:1px 1px var(--w9-ink)!important; }\nhtml[data-onche-retro] :is(#menu,.profileCard,.clubCard) { transition:none!important; }\nhtml[data-onche-retro] #menu { top:74px!important; bottom:40px!important; }\nhtml[data-onche-retro] :is(#confirmation,#media-picker) { padding-top:80px!important; padding-bottom:45px!important; }\nhtml[data-onche-retro] .sticky-container { top:70px!important; background:var(--w9-face)!important; }\nhtml[data-onche-retro] .sticky-radius { display:none!important; }\nhtml[data-onche-retro] .bloc.border::before { display:none!important; }\nhtml[data-onche-retro] .message-highlighted { outline:2px dotted var(--w9-selected)!important; outline-offset:2px; }\nhtml[data-onche-retro] :is(.message-op,.topic-forum-pill,.likeButton__reaction) { box-shadow:none!important; }\nhtml[data-onche-retro] .message-op { border-color:var(--w9-selectedText)!important; }\nhtml[data-onche-retro] .message-op::before { color:var(--w9-selectedText)!important; }\nhtml[data-onche-retro] .message.answer .message-op { border-color:var(--w9-shadow)!important; }\nhtml[data-onche-retro] .message.answer .message-op::before { color:var(--w9-ink)!important; }\nhtml[data-onche-retro] input:is([type=\"checkbox\"],[type=\"radio\"]) { accent-color:var(--w9-selected); }\nhtml[data-onche-retro] input[type=\"radio\"] { appearance:none!important; width:13px; height:13px; background:var(--w9-surface); box-shadow:var(--w9-sunken); vertical-align:middle; }\nhtml[data-onche-retro] input[type=\"radio\"]:checked { background:var(--w9-selected); border:3px solid var(--w9-surface); outline:1px solid var(--w9-shadow); }\nhtml[data-onche-retro] ::-webkit-scrollbar { width:16px; height:16px; }\nhtml[data-onche-retro] ::-webkit-scrollbar-track { background:var(--w9-edge); }\nhtml[data-onche-retro] ::-webkit-scrollbar-thumb { background:var(--w9-face); box-shadow:var(--w9-raised); border-radius:0; }\nhtml[data-onche-retro] ::-webkit-scrollbar-corner { background:var(--w9-face); }\n@media(max-width:880px) {\n html[data-onche-retro] #content > .container { width:calc(100% - 12px)!important; }\n html[data-onche-retro] #content { padding-top:80px!important; }\n html[data-onche-retro] .messages > .message > .message-content { padding:9px!important; }\n html[data-onche-retro] body > header .logo .image { width:95px!important; }\n html[data-onche-retro] body > header .logo .image::after { font-size:14px; }\n}\n@media print {\n html[data-onche-retro],html[data-onche-retro] body { background:var(--w9-surface)!important; }\n html[data-onche-retro] body { padding-bottom:0!important; }\n html[data-onche-retro] #content { padding-top:0!important; }\n #onche-retro-desktop { display:none!important; }\n}\n" };

// Source: src/styles/onche-adapter.css
modules["src/styles/onche-adapter.css"] = { default: "/* Original heading stays in flow. Only Onche's clone is fixed. */\nhtml[data-onche-retro] :is(#forum,#topic) > .title {\n  position:relative!important; top:auto!important; left:auto!important;\n  transform:none!important; margin:0!important; z-index:1!important;\n}\nhtml[data-onche-retro] .sticky-container { top:var(--w9-chrome-height)!important; }\nhtml[data-onche-retro] .sticky-container > .title {\n  position:relative!important; top:auto!important; margin:0!important;\n  background:var(--w9-title)!important; color:var(--w9-selectedText)!important;\n  padding:5px 7px!important; border:0!important;\n}\nhtml[data-onche-retro] .sticky-container > .title :is(h1,h2,a,span,.mdi) { color:var(--w9-selectedText)!important; }\n/* Stories are thumbnails, not raised command buttons. Preserve native visibility. */\nhtml[data-onche-retro] #stories-root { position:relative!important; clear:both; margin:0!important; }\nhtml[data-onche-retro] .stories-bar { background:var(--w9-face)!important; padding:10px!important; }\nhtml[data-onche-retro] .stories-bubble {\n  padding:2px!important; background:transparent!important; border:0!important;\n  box-shadow:none!important; color:var(--w9-ink)!important;\n}\nhtml[data-onche-retro] .stories-bubble__ring {\n  background:var(--w9-face)!important; box-shadow:var(--w9-sunken)!important;\n  padding:3px!important; transform:none!important;\n}\nhtml[data-onche-retro] .stories-bubble--unseen .stories-bubble__ring { outline:2px solid var(--w9-selected); outline-offset:1px; }\nhtml[data-onche-retro] .stories-bubble__name,\nhtml[data-onche-retro] .stories-bubble > :is(span,div):last-child {\n  color:var(--w9-ink)!important; -webkit-text-fill-color:var(--w9-ink)!important;\n  text-shadow:none!important; opacity:1!important;\n}\n/* Neutralize gradient usernames on light surfaces; keep title usernames white. */\nhtml[data-onche-retro] body .pseudo {\n  background-image:none!important; background-clip:border-box!important;\n  -webkit-text-fill-color:currentColor!important; color:var(--w9-ink)!important;\n  text-shadow:none!important;\n}\nhtml[data-onche-retro] body > header :is(a,span,.username,.pseudo) {\n  color:var(--w9-ink)!important; -webkit-text-fill-color:currentColor!important;\n  opacity:1!important; text-shadow:none!important;\n}\nhtml[data-onche-retro] body .messages > .message > .message-top .pseudo,\nhtml[data-onche-retro] body .topics .topic:hover .pseudo {\n  color:var(--w9-selectedText)!important; -webkit-text-fill-color:currentColor!important;\n}\nhtml[data-onche-retro] #right .content:not(.centered) { background:var(--w9-surface)!important; }\nhtml[data-onche-retro] #right .content:not(.centered) :is(a,span,.color,.pseudo) {\n  color:var(--w9-ink)!important; -webkit-text-fill-color:currentColor!important;\n}\nhtml[data-onche-retro] #right .content.links a:hover,\nhtml[data-onche-retro] #right .content.links a:hover * { color:var(--w9-selectedText)!important; }\nhtml[data-onche-retro] :is(.bloc-title-more,.bloc > .title .right) { opacity:1!important; }\nhtml[data-onche-retro] .bloc > .title .button {\n  background:var(--w9-face)!important; color:var(--w9-ink)!important;\n}\nhtml[data-onche-retro] .bloc > .title .button * { color:var(--w9-ink)!important; }\nhtml[data-onche-retro] :is(.button,button):not(:disabled):not([aria-disabled=\"true\"]) {\n  opacity:1!important; -webkit-text-fill-color:currentColor!important;\n}\nhtml[data-onche-retro] :is(.message-date,.answer-date,.topic-username,.composer__welcome) { color:var(--w9-muted)!important; }\n/* Do not recolor spoiler descendants or alter their visibility. */\nhtml[data-onche-retro] #context { background:var(--w9-face)!important; color:var(--w9-ink)!important; box-shadow:var(--w9-raised)!important; }\nhtml[data-onche-retro] #context .item { color:var(--w9-ink)!important; }\nhtml[data-onche-retro] #context .item:hover { background:var(--w9-selected)!important; color:var(--w9-selectedText)!important; }\n" };

// Source: src/styles/windowed.css
modules["src/styles/windowed.css"] = { default: "html[data-onche-windowed] body { overflow:hidden!important; }\nhtml[data-onche-windowed] body > :not(#onche-retro-desktop) { display:none!important; }\n\n/* Dans une fenêtre, le site conserve son fonctionnement sans le chrome global. */\nhtml[data-onche-frame][data-onche-retro] body { padding-bottom:0!important; }\nhtml[data-onche-frame][data-onche-retro] body > header { top:0!important; }\nhtml[data-onche-frame][data-onche-retro] #content { padding-top:60px!important; }\nhtml[data-onche-frame][data-onche-retro] body.sticky-right #content #right { top:56px!important; }\n\n/* La page courante doit rester évidente parmi plusieurs dizaines de pages. */\nhtml[data-onche-retro] body #content .pagination > a.active,\nhtml[data-onche-retro] body #content .pagination > a[aria-current=\"page\"] {\n  background:var(--w9-selected)!important; color:var(--w9-selectedText)!important;\n  box-shadow:var(--w9-sunken)!important; outline:1px dotted var(--w9-selectedText)!important;\n  outline-offset:-4px; font-weight:700!important;\n}\n" };

// Source: src/icons/assets.js
modules["src/icons/assets.js"] = (() => {
// Copies PNG versionnées dans ce dépôt et servies directement par GitHub.
// Un chemin absolu est nécessaire : le userscript s'exécute depuis onche.org.
const ICON_BASE = 'https://raw.githubusercontent.com/Af2z2O8qywn4Yq9S2Ae/Windonche/main/assets/icons/';

function iconURL(name) {
  return `${ICON_BASE}${name}.png`;
}

/** Réservé aux noms d'icônes constants du projet, jamais à du contenu utilisateur. */
function icon(name, size = 16) {
  return `<img class="sys-icon" src="${iconURL(name)}" width="${size}" height="${size}" alt="" aria-hidden="true" referrerpolicy="no-referrer" draggable="false">`;
}

return { iconURL, icon };
})();

// Source: src/styles/install.js
modules["src/styles/install.js"] = (() => {
const { default: layout } = modules["src/styles/layout.css"];
const { default: topics } = modules["src/styles/topics.css"];
const { default: messages } = modules["src/styles/messages.css"];
const { default: controls } = modules["src/styles/controls.css"];
const { default: widgets } = modules["src/styles/widgets.css"];
const { default: adapter } = modules["src/styles/onche-adapter.css"];
const { default: windowed } = modules["src/styles/windowed.css"];
const { iconURL } = modules["src/icons/assets.js"];

/** L'ordre de cascade reproduit celui du userscript d'origine. */
function installStyles(engine) {
  engine.use('components', [layout, topics, messages, controls, widgets]
    .join('\n').replaceAll('__BROWSER_ICON_URL__', iconURL('internet-explorer-16x16')));
  engine.use('onche-adapter', adapter);
  engine.use('windowed', windowed);
}

return { installStyles };
})();

// Source: src/icons/site-icons.js
modules["src/icons/site-icons.js"] = (() => {
const { iconURL } = modules["src/icons/assets.js"];

function installSiteIcons(engine) {
  const iconMap = {
    'folder-16x16': '.topic-left .mdi-folder',
    'folder-open-16x16': '.topic-left .mdi-folder-open',
    'document-16x16': '.topic-left .mdi-pin, .mdi-paperclip',
    'news-16x16': '.topic-left .mdi-fire, .title .mdi-fire',
    'favorites-16x16': '.mdi-star, .mdi-star-outline, .title .mdi-trophy-variant-outline, .mdi-emoticon-plus, .mdi-emoticon-plus-outline',
    'find-file-16x16': '.mdi-magnify, .mdi-incognito',
    'mail-16x16': '.mdi-email, .mdi-email-outline, .mdi-email-search, .mdi-email-search-outline, .mdi-send, .mdi-send-outline',
    'notepad-16x16': '.mdi-pencil-plus, .mdi-plus',
    'programs-16x16': '.mdi-dots-vertical, .mdi-dots-horizontal',
    'run-16x16': '.mdi-refresh, .mdi-reload',
    'speaker-16x16': '.mdi-bell, .mdi-bell-outline',
    'microphone-16x16': '.mdi-microphone, .mdi-microphone-outline',
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

return { installSiteIcons };
})();

// Source: src/desktop/template.js
modules["src/desktop/template.js"] = (() => {
const { THEMES } = modules["src/themes/registry.js"];
const { icon } = modules["src/icons/assets.js"];

function renderDesktop() {
  return `<main class="workspace" aria-label="Bureau Windonche"></main>
<nav class="menu" aria-label="Menu Démarrer" id="start-menu" hidden>
 <div class="brand" aria-hidden="true">Windows 98</div>
 <div class="items">
  <a href="/" data-window-url="/">${icon('my-computer-32x32',32)}<span>Accueil Onche</span></a>
  <a href="/forum/1/blabla-general" data-window-url="/forum/1/blabla-general">${icon('news-32x32',32)}<span>Blabla Général</span></a>
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
 <div class="tasks" role="tablist" aria-label="Topics ouverts"></div>
 <div class="tray"><span class="network" aria-hidden="true">${icon('network-16x16')}</span><time></time></div>
</div>
<button class="raised restore" hidden>${icon('windows-22x22-8bpp',22)} Activer Windows 95/98</button>`;
}

return { renderDesktop };
})();

// Source: src/desktop/menu.js
modules["src/desktop/menu.js"] = (() => {
/** Navigation clavier d'un panneau de liens et boutons natifs (pas un menu ARIA). */
function bindStartMenu(shadow, host) {
  const menu = shadow.querySelector('.menu');
  const start = shadow.querySelector('.start');

  function close(returnFocus = false) {
    menu.hidden = true;
    start.setAttribute('aria-expanded', 'false');
    if (returnFocus) start.focus();
  }

  start.addEventListener('click', () => {
    menu.hidden = !menu.hidden;
    start.setAttribute('aria-expanded', String(!menu.hidden));
    if (!menu.hidden) menu.querySelector('a,button').focus();
  });
  document.addEventListener('pointerdown', event => {
    if (!event.composedPath().includes(host)) close();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) close(true);
  });
  menu.addEventListener('keydown', event => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const items = [...menu.querySelectorAll('a,button')];
    const current = items.indexOf(shadow.activeElement);
    let index;
    if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = items.length - 1;
    else index = (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    event.preventDefault();
    items[index].focus();
  });
  return { close, start };
}

return { bindStartMenu };
})();

// Source: src/desktop/status.js
modules["src/desktop/status.js"] = (() => {
/** Synchronise l’horloge de la barre des tâches. */
function bindClock(shadow) {
  function tick() {
    const now = new Date();
    const clock = shadow.querySelector('time');
    clock.textContent = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    clock.dateTime = now.toISOString();
    clock.title = now.toLocaleDateString('fr-FR', { dateStyle: 'full' });
  }
  tick();
  setInterval(tick, 30000);
}

return { bindClock };
})();

// Source: src/desktop/topic-tabs.js
modules["src/desktop/topic-tabs.js"] = (() => {
/** Retourne l'identifiant d'un topic Onche, ou null pour une autre page. */
function topicId(url, base = 'https://onche.org') {
  try {
    const target = new URL(url, base);
    if (!/^(?:www\.)?onche\.org$/i.test(target.hostname)) return null;
    return target.pathname.match(/^\/topic\/(\d+)(?:\/|$)/)?.[1] || null;
  } catch {
    return null;
  }
}

return { topicId };
})();

// Source: src/desktop/window-manager.js
modules["src/desktop/window-manager.js"] = (() => {
const { icon } = modules["src/icons/assets.js"];
const { topicId } = modules["src/desktop/topic-tabs.js"];

const STORAGE_KEY = 'onche-retro-windows';
const MAX_WINDOWS = 8;
const DEFAULT_FORUM = '/forum/1/blabla-general';

function oncheURL(url, base = 'https://onche.org') {
  try {
    const target = new URL(url, base);
    if (!/^https?:$/.test(target.protocol) || !/^(?:www\.)?onche\.org$/i.test(target.hostname)) return null;
    return target;
  } catch {
    return null;
  }
}

/** Identifiant stable : changer de page dans un topic ne crée pas une autre fenêtre. */
function windowId(url, base = 'https://onche.org') {
  const target = oncheURL(url, base);
  if (!target) return null;
  const topic = topicId(target.href);
  if (topic) return `topic:${topic}`;
  const forum = target.pathname.match(/^\/forum\/(\d+)(?:\/|$)/)?.[1];
  if (forum) return `forum:${forum}`;
  return `page:${target.pathname.replace(/\/$/, '') || '/'}`;
}

/** Ajoute une fenêtre à la fin ou la met à jour sans changer son ordre. */
function upsertWindow(windows, next, limit = MAX_WINDOWS) {
  const index = windows.findIndex(item => item.id === next.id);
  if (index < 0) return windows.length >= limit ? windows : [...windows, next];
  return windows.map((item, itemIndex) => itemIndex === index ? { ...item, ...next } : item);
}

function removeWindow(windows, id) {
  return windows.filter(item => item.id !== id);
}

function clampPosition(value, size, boundary) {
  return Math.max(0, Math.min(Number(value) || 0, Math.max(0, boundary - size)));
}

function cleanTitle(title, fallback = 'Onche') {
  return String(title || fallback).replace(/\s+[—|-]\s+Onche.*$/i, '').trim() || fallback;
}

function readWindows(storage, origin) {
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(saved)) return [];
    return saved.slice(0, MAX_WINDOWS).flatMap(item => {
      const target = item && oncheURL(item.url, origin);
      const id = target && windowId(target.href, origin);
      if (!id || id !== item.id) return [];
      target.protocol = new URL(origin).protocol;
      target.host = new URL(origin).host;
      return [{
        id,
        url: target.href,
        title: cleanTitle(item.title, id.startsWith('forum:') ? 'Liste des topics' : 'Onche'),
        x: Number(item.x) || 0,
        y: Number(item.y) || 0,
        width: Number(item.width) || 0,
        height: Number(item.height) || 0,
        minimized: Boolean(item.minimized),
        z: Number(item.z) || 1,
      }];
    });
  } catch {
    return [];
  }
}

/** Bureau de fenêtres iframe de même origine, reliées à la barre des tâches. */
class WindowManager {
  constructor(shadow, options = {}) {
    this.shadow = shadow;
    this.workspace = shadow.querySelector('.workspace');
    this.tasks = shadow.querySelector('.tasks');
    this.document = options.document || document;
    this.window = options.window || window;
    this.storage = options.storage || this.window.sessionStorage;
    this.origin = options.origin || this.window.location.origin;
    this.onActivate = options.onActivate || (() => {});
    this.elements = new Map();
    this.resizeObservers = new Map();
    this.records = readWindows(this.storage, this.origin);
    this.activeId = null;
    this.z = Math.max(1, ...this.records.map(item => item.z));
    this.themeState = null;
    this.ensureInitialWindows(options.href || this.window.location.href);
    this.render();
  }

  normalize(url) {
    const target = oncheURL(url, this.origin);
    if (!target) return null;
    const current = new URL(this.origin);
    target.protocol = current.protocol;
    target.host = current.host;
    return target;
  }

  defaultRecord(url, title) {
    const id = windowId(url, this.origin);
    const count = this.records.length;
    const width = Math.min(920, Math.max(320, this.window.innerWidth - 120));
    const height = Math.min(720, Math.max(280, this.window.innerHeight - 140));
    return {
      id,
      url,
      title: cleanTitle(title, id.startsWith('forum:') ? 'Liste des topics' : 'Onche'),
      x: 20 + (count % 6) * 32,
      y: 18 + (count % 6) * 28,
      width,
      height,
      minimized: false,
      z: ++this.z,
    };
  }

  ensureInitialWindows(href) {
    const current = this.normalize(href);
    if (!current) return;
    const forumURL = current.pathname.startsWith('/forum/')
      ? current.href
      : new URL(DEFAULT_FORUM, this.origin).href;
    const forumId = windowId(forumURL, this.origin);
    if (!this.records.some(item => item.id === forumId)) {
      this.records = upsertWindow(this.records, this.defaultRecord(forumURL, 'Liste des topics'));
    }
    const currentId = windowId(current.href, this.origin);
    if (currentId !== forumId) {
      const existing = this.records.find(item => item.id === currentId);
      if (existing) existing.url = current.href;
      else this.records = upsertWindow(this.records, this.defaultRecord(current.href, this.document.title));
    }
    const currentRecord = this.records.find(item => item.id === currentId);
    this.activeId = (currentRecord || this.records[0])?.id || null;
    if (currentRecord) currentRecord.minimized = false;
    this.persist();
  }

  persist() {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.records));
    } catch {
      // Le bureau reste utilisable si le stockage de session est indisponible.
    }
  }

  openURL(url, title = 'Onche') {
    const target = this.normalize(url);
    const id = target && windowId(target.href, this.origin);
    if (!id) return false;
    const existing = this.records.find(item => item.id === id);
    if (existing) {
      this.activate(id);
      return true;
    }
    if (this.records.length >= MAX_WINDOWS) {
      this.window.alert?.(`Windonche limite le bureau à ${MAX_WINDOWS} fenêtres ouvertes.`);
      return false;
    }
    this.records = upsertWindow(this.records, this.defaultRecord(target.href, title));
    this.activeId = id;
    this.onActivate(id);
    this.persist();
    this.render();
    return true;
  }

  activate(id) {
    const record = this.records.find(item => item.id === id);
    if (!record) return;
    record.minimized = false;
    record.z = ++this.z;
    this.activeId = id;
    this.onActivate(id);
    this.persist();
    this.render();
  }

  minimize(id) {
    const record = this.records.find(item => item.id === id);
    if (!record) return;
    record.minimized = true;
    if (this.activeId === id) {
      this.activeId = [...this.records].reverse().find(item => !item.minimized && item.id !== id)?.id || null;
    }
    this.persist();
    this.render();
  }

  close(id) {
    const index = this.records.findIndex(item => item.id === id);
    if (index < 0) return;
    this.resizeObservers.get(id)?.disconnect();
    this.resizeObservers.delete(id);
    this.elements.get(id)?.remove();
    this.elements.delete(id);
    this.records = removeWindow(this.records, id);
    if (this.activeId === id) {
      const next = this.records[Math.min(index, this.records.length - 1)];
      this.activeId = next?.id || null;
      if (next) next.minimized = false;
    }
    this.persist();
    this.render();
  }

  createWindow(record) {
    const panel = this.document.createElement('section');
    panel.className = 'window';
    panel.dataset.windowId = record.id;
    panel.tabIndex = -1;
    panel.innerHTML = `<div class="window-title">${icon('internet-explorer-16x16')}<span class="window-caption"></span><div class="window-controls"><button class="raised minimize" type="button" title="Réduire" aria-label="Réduire">_</button><button class="raised window-close" type="button" title="Fermer" aria-label="Fermer">×</button></div></div><iframe class="window-frame" title=""></iframe>`;
    const titlebar = panel.querySelector('.window-title');
    const frame = panel.querySelector('.window-frame');
    panel.querySelector('.minimize').addEventListener('click', event => {
      event.stopPropagation();
      this.minimize(record.id);
    });
    panel.querySelector('.window-close').addEventListener('click', event => {
      event.stopPropagation();
      this.close(record.id);
    });
    this.bindDrag(titlebar, panel, record);
    frame.addEventListener('load', () => this.bindFrame(record, frame));
    frame.src = record.url;
    if (this.window.ResizeObserver) {
      let ready = false;
      const observer = new this.window.ResizeObserver(() => {
        if (!ready) { ready = true; return; }
        if (this.window.matchMedia('(max-width: 700px)').matches) return;
        record.width = panel.offsetWidth;
        record.height = panel.offsetHeight;
        this.persist();
      });
      observer.observe(panel);
      this.resizeObservers.set(record.id, observer);
    }
    this.workspace.append(panel);
    this.elements.set(record.id, panel);
    return panel;
  }

  bindDrag(handle, panel, record) {
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button') || this.window.matchMedia('(max-width: 700px)').matches) return;
      event.preventDefault();
      this.activate(record.id);
      const startX = event.clientX;
      const startY = event.clientY;
      const originX = panel.offsetLeft;
      const originY = panel.offsetTop;
      handle.setPointerCapture(event.pointerId);
      const move = moveEvent => {
        record.x = clampPosition(originX + moveEvent.clientX - startX, panel.offsetWidth, this.workspace.clientWidth);
        record.y = clampPosition(originY + moveEvent.clientY - startY, panel.offsetHeight, this.workspace.clientHeight);
        panel.style.left = `${record.x}px`;
        panel.style.top = `${record.y}px`;
      };
      const stop = () => {
        handle.removeEventListener('pointermove', move);
        this.persist();
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', stop, { once: true });
      handle.addEventListener('pointercancel', stop, { once: true });
    });
  }

  bindFrame(record, frame) {
    try {
      const frameWindow = frame.contentWindow;
      const frameDocument = frame.contentDocument;
      if (!frameWindow || !frameDocument) return;
      const loadedURL = frameWindow.location.href;
      const loadedId = windowId(loadedURL, this.origin);
      if (loadedId && loadedId !== record.id) {
        const existing = this.records.find(item => item.id === loadedId);
        if (existing) {
          this.close(record.id);
          this.activate(existing.id);
          return;
        }
        const previousId = record.id;
        const panel = this.elements.get(previousId);
        const observer = this.resizeObservers.get(previousId);
        record.id = loadedId;
        if (this.activeId === previousId) this.activeId = loadedId;
        this.elements.delete(previousId);
        this.resizeObservers.delete(previousId);
        this.elements.set(loadedId, panel);
        if (observer) this.resizeObservers.set(loadedId, observer);
        panel.dataset.windowId = loadedId;
      }
      record.url = loadedURL;
      const refreshTitle = () => {
        record.title = cleanTitle(frameDocument.title, record.title);
        this.persist();
        this.renderTasks();
        this.updateWindow(record);
      };
      refreshTitle();
      const title = frameDocument.querySelector('title');
      if (title) new MutationObserver(refreshTitle).observe(title, { childList: true, subtree: true });
      for (const activePage of frameDocument.querySelectorAll('.pagination a.active')) {
        activePage.setAttribute('aria-current', 'page');
      }
      frameDocument.addEventListener('pointerdown', () => this.activate(record.id), true);
      frameDocument.addEventListener('click', event => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const anchor = event.target.closest?.('a[href]');
        if (!anchor || anchor.hasAttribute('download') || anchor.target === '_blank') return;
        const target = this.normalize(anchor.href);
        const targetId = target && windowId(target.href, this.origin);
        if (!targetId) {
          if (/^https?:/i.test(anchor.href)) {
            event.preventDefault();
            this.window.open(anchor.href, '_blank', 'noopener');
          }
          return;
        }
        if (targetId === record.id) {
          if (anchor.target === '_top') {
            event.preventDefault();
            frameWindow.location.assign(target.href);
          }
          return;
        }
        event.preventDefault();
        const label = anchor.matches('.topic-subject') ? anchor.querySelector('span')?.textContent : anchor.textContent;
        this.openURL(target.href, label);
      }, true);
      this.postTheme(frameWindow);
    } catch {
      // Une éventuelle navigation externe reste isolée dans sa fenêtre.
    }
  }

  updateWindow(record) {
    const panel = this.elements.get(record.id);
    if (!panel) return;
    panel.classList.toggle('active', record.id === this.activeId && !record.minimized);
    panel.hidden = record.minimized;
    panel.style.left = `${record.x}px`;
    panel.style.top = `${record.y}px`;
    panel.style.width = `${record.width}px`;
    panel.style.height = `${record.height}px`;
    panel.style.zIndex = String(record.z);
    panel.querySelector('.window-caption').textContent = record.title;
    panel.querySelector('.window-frame').title = record.title;
  }

  renderTasks() {
    this.tasks.textContent = '';
    for (const record of this.records) {
      const active = record.id === this.activeId && !record.minimized;
      const button = this.document.createElement('button');
      button.type = 'button';
      button.className = `raised task${active ? ' pressed' : ''}`;
      button.dataset.windowId = record.id;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', String(active));
      button.title = record.title;
      button.innerHTML = `${icon('internet-explorer-16x16')}<span class="task-label"></span>`;
      button.querySelector('.task-label').textContent = record.title;
      button.addEventListener('click', () => active ? this.minimize(record.id) : this.activate(record.id));
      this.tasks.append(button);
    }
  }

  render() {
    for (const record of this.records) {
      if (!this.elements.has(record.id)) this.createWindow(record);
      this.updateWindow(record);
    }
    this.renderTasks();
  }

  postTheme(target) {
    if (!this.themeState || !/^https?:/.test(this.origin)) return;
    target.postMessage({ type: 'onche-retro-theme', state: this.themeState }, this.origin);
  }

  setTheme(state) {
    this.themeState = { enabled: state.enabled, theme: state.theme, compact: state.compact };
    for (const panel of this.elements.values()) this.postTheme(panel.querySelector('iframe').contentWindow);
  }
}

function bindWindowManager(shadow, options) {
  return new WindowManager(shadow, options);
}

return { windowId, upsertWindow, removeWindow, clampPosition, WindowManager, bindWindowManager };
})();

// Source: src/styles/desktop.css
modules["src/styles/desktop.css"] = { default: ":host { all:initial; font:12px var(--w9-font); color:var(--w9-ink); }\n*,*::before,*::after { box-sizing:border-box; border-radius:0!important; }\n.sys-icon { flex:none; object-fit:contain; image-rendering:pixelated; vertical-align:middle; }\nbutton,a { font:inherit; color:inherit; }\nbutton { cursor:pointer; }\n[hidden] { display:none!important; }\n.raised { border:0; border-radius:0; background:var(--w9-face); box-shadow:inset 1px 1px var(--w9-light),inset -1px -1px var(--w9-ink),inset 2px 2px var(--w9-edge),inset -2px -2px var(--w9-shadow); }\nbutton:active,.pressed { box-shadow:inset 1px 1px var(--w9-shadow),inset -1px -1px var(--w9-light),inset 2px 2px var(--w9-ink),inset -2px -2px var(--w9-edge); }\nbutton:focus-visible,a:focus-visible { outline:1px dotted var(--w9-ink); outline-offset:-4px; }\n.workspace { position:fixed; inset:0 0 36px; overflow:hidden; background:var(--w9-desktop,#008080); z-index:8998; }\n.window { position:absolute; min-width:300px; min-height:220px; padding:3px; display:flex; flex-direction:column; overflow:hidden; resize:both; background:var(--w9-face); box-shadow:inset 1px 1px var(--w9-light),inset -1px -1px var(--w9-ink),inset 2px 2px var(--w9-edge),inset -2px -2px var(--w9-shadow),3px 3px rgba(0,0,0,.35); }\n.window-title { height:25px; flex:none; padding:3px 3px 3px 5px; display:flex; align-items:center; gap:5px; overflow:hidden; cursor:move; touch-action:none; background:var(--w9-face); color:var(--w9-ink); font-weight:bold; user-select:none; }\n.window.active .window-title { background:var(--w9-title); color:var(--w9-selectedText); }\n.window-caption { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }\n.window-controls { flex:none; display:flex; gap:2px; }\n.window-controls button { width:21px; height:19px; color:var(--w9-ink); font:bold 16px Arial; line-height:15px; padding:0; }\n.window-controls .minimize { line-height:10px; }\n.window-frame { flex:1; width:100%; min-height:0; border:0; background:var(--w9-surface,#fff); box-shadow:inset 1px 1px var(--w9-shadow),inset -1px -1px var(--w9-light); }\n.taskbar { position:fixed; bottom:0; left:0; right:0; height:36px; padding:4px; display:flex; gap:6px; align-items:stretch; background:var(--w9-face); box-shadow:inset 0 1px var(--w9-surface),inset 0 2px var(--w9-edge); z-index:9000; }\n.start { display:flex; align-items:center; gap:4px; padding:3px 8px 3px 3px; font-weight:bold; }\n.separator { width:2px; border-left:1px solid var(--w9-shadow); border-right:1px solid var(--w9-surface); margin:1px; }\n.tasks { flex:1; min-width:0; display:flex; align-items:stretch; gap:4px; overflow-x:auto; scrollbar-width:thin; }\n.task { text-align:left; flex:1 1 180px; max-width:260px; min-width:110px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding:4px 8px; font-weight:bold; background:var(--w9-edge); display:flex; align-items:center; gap:6px; }\n.task-label { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }\n.tray { margin-left:auto; display:flex; align-items:center; padding:0 9px; gap:10px; box-shadow:inset 1px 1px var(--w9-shadow),inset -1px -1px var(--w9-light); white-space:nowrap; }\n.menu { position:fixed; bottom:35px; left:3px; width:270px; max-width:calc(100vw - 6px); max-height:calc(100dvh - 44px); overflow-y:auto; padding:3px; z-index:9002; display:flex; box-shadow:inset 1px 1px var(--w9-light),inset -1px -1px var(--w9-ink),inset 2px 2px var(--w9-edge),inset -2px -2px var(--w9-shadow),2px 2px var(--w9-shadow); background:var(--w9-face); }\n.brand { writing-mode:vertical-rl; transform:rotate(180deg); background:var(--w9-selected); color:var(--w9-selectedText); padding:10px 5px; font-size:21px; font-weight:bold; letter-spacing:-1px; }\n.items { flex:1; padding:3px; }\n.items a,.items button { display:flex; align-items:center; gap:9px; width:100%; text-align:left; border:0; border-radius:0; background:transparent; box-shadow:none; padding:7px 8px; min-height:40px; text-decoration:none; }\n.items a:hover,.items button:hover,.items a:focus-visible,.items button:focus-visible { background:var(--w9-selected); color:var(--w9-selectedText); outline:none; }\n.items hr { border:0; border-top:1px solid var(--w9-shadow); border-bottom:1px solid var(--w9-surface); margin:4px 2px; }\n.restore { position:fixed; bottom:8px; left:8px; z-index:9003; padding:8px 12px; }\n@media(max-width:700px) {\n  .window { inset:4px!important; width:auto!important; height:auto!important; min-width:0; min-height:0; resize:none; }\n  .window:not(.active) { display:none; }\n  .window-title { cursor:default; }\n  .task { flex-basis:100px; min-width:80px; }\n  .tray .network { display:none; }\n}\n" };

// Source: src/desktop/mount.js
modules["src/desktop/mount.js"] = (() => {
const { THEMES } = modules["src/themes/registry.js"];
const { renderDesktop } = modules["src/desktop/template.js"];
const { bindStartMenu } = modules["src/desktop/menu.js"];
const { bindClock } = modules["src/desktop/status.js"];
const { bindWindowManager } = modules["src/desktop/window-manager.js"];
const { default: desktopCSS } = modules["src/styles/desktop.css"];

/** Crée le bureau isolé du CSS d'Onche et relie ses commandes au moteur. */
function mountDesktop(engine) {
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

return { mountDesktop };
})();

// Source: src/main.js
modules["src/main.js"] = (() => {
const { THEMES } = modules["src/themes/registry.js"];
const { ThemeEngine } = modules["src/themes/engine.js"];
const { installStyles } = modules["src/styles/install.js"];
const { installSiteIcons } = modules["src/icons/site-icons.js"];
const { mountDesktop } = modules["src/desktop/mount.js"];

// Les iframes reçoivent le thème, mais seul le document principal crée le bureau.
if (!document.getElementById('onche-retro-tokens')) {
  const engine = new ThemeEngine(THEMES);
  installStyles(engine);
  installSiteIcons(engine);
  if (window.top === window.self) {
    if (!document.getElementById('onche-retro-desktop')) mountDesktop(engine);
  } else {
    document.documentElement.setAttribute('data-onche-frame', '');
    engine.update();
    window.addEventListener('message', event => {
      if (event.origin !== window.location.origin || event.source !== window.top) return;
      if (event.data?.type === 'onche-retro-theme') engine.update(event.data.state);
    });
  }
}

return {  };
})();
})();
