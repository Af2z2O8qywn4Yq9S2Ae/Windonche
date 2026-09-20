// ==UserScript==
// @name         Onche — Windows 95 / 98
// @namespace    local.onche.windows-retro
// @version      2.1.0
// @description  Moteur de thèmes Onche : Windows 95/98, palette centralisée, contrôle du contraste, composants et icônes externes 98.js.
// @match        https://onche.org/*
// @match        https://www.onche.org/*
// @run-at       document-end
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @noframes
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

// Source: src/icons/assets.js
modules["src/icons/assets.js"] = (() => {
// Images distantes du projet 98.js ; aucun code distant n'est exécuté.
const ICON_BASE = 'https://98.js.org/images/icons/';

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
const { iconURL } = modules["src/icons/assets.js"];

/** L'ordre de cascade reproduit celui du userscript d'origine. */
function installStyles(engine) {
  engine.use('components', [layout, topics, messages, controls, widgets]
    .join('\n').replaceAll('__BROWSER_ICON_URL__', iconURL('internet-explorer-16x16')));
  engine.use('onche-adapter', adapter);
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

return { installSiteIcons };
})();

// Source: src/desktop/template.js
modules["src/desktop/template.js"] = (() => {
const { THEMES } = modules["src/themes/registry.js"];
const { icon } = modules["src/icons/assets.js"];

function renderDesktop() {
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
/** Synchronise le titre du document et l'horloge du bureau. */
function bindStatus(shadow) {
  function updateTitle() {
    const title = document.title || 'Onche';
    shadow.querySelector('.caption').textContent = `${title} — Internet Explorer`;
    shadow.querySelector('.task-label').textContent = title;
  }
  updateTitle();
  const titleNode = document.querySelector('title');
  if (titleNode) {
    new MutationObserver(updateTitle).observe(titleNode, {
      childList: true, characterData: true, subtree: true,
    });
  }

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

return { bindStatus };
})();

// Source: src/styles/desktop.css
modules["src/styles/desktop.css"] = { default: ":host { all:initial; font:12px var(--w9-font); color:var(--w9-ink); }\n*,*::before,*::after { box-sizing:border-box; border-radius:0!important; }\n.sys-icon { flex:none; object-fit:contain; image-rendering:pixelated; vertical-align:middle; }\nbutton,a { font:inherit; color:inherit; }\nbutton { cursor:pointer; }\n[hidden] { display:none!important; }\n.raised { border:0; border-radius:0; background:var(--w9-face); box-shadow:inset 1px 1px var(--w9-light),inset -1px -1px var(--w9-ink),inset 2px 2px var(--w9-edge),inset -2px -2px var(--w9-shadow); }\nbutton:active,.pressed { box-shadow:inset 1px 1px var(--w9-shadow),inset -1px -1px var(--w9-light),inset 2px 2px var(--w9-ink),inset -2px -2px var(--w9-edge); }\nbutton:focus-visible,a:focus-visible { outline:1px dotted var(--w9-ink); outline-offset:-4px; }\n.title { position:fixed; top:0; left:0; right:0; height:28px; z-index:9000; padding:3px; display:flex; align-items:center; gap:6px; background:var(--w9-title); color:var(--w9-selectedText); border:2px solid var(--w9-face); }\n\n.caption { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:bold; }\n.close { width:21px; height:19px; color:var(--w9-ink); font:bold 16px Arial; line-height:16px; padding:0; }\n.taskbar { position:fixed; bottom:0; left:0; right:0; height:36px; padding:4px; display:flex; gap:6px; align-items:stretch; background:var(--w9-face); box-shadow:inset 0 1px var(--w9-surface),inset 0 2px var(--w9-edge); z-index:9000; }\n.start { display:flex; align-items:center; gap:4px; padding:3px 8px 3px 3px; font-weight:bold; }\n.separator { width:2px; border-left:1px solid var(--w9-shadow); border-right:1px solid var(--w9-surface); margin:1px; }\n.task { text-align:left; width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding:4px 8px; font-weight:bold; background:var(--w9-edge); display:flex; align-items:center; gap:6px; min-width:0; }\n.task-label { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }\n.tray { margin-left:auto; display:flex; align-items:center; padding:0 9px; gap:10px; box-shadow:inset 1px 1px var(--w9-shadow),inset -1px -1px var(--w9-light); white-space:nowrap; }\n.menu { position:fixed; bottom:35px; left:3px; width:270px; max-width:calc(100vw - 6px); max-height:calc(100dvh - 44px); overflow-y:auto; padding:3px; z-index:9001; display:flex; box-shadow:inset 1px 1px var(--w9-light),inset -1px -1px var(--w9-ink),inset 2px 2px var(--w9-edge),inset -2px -2px var(--w9-shadow),2px 2px var(--w9-shadow); background:var(--w9-face); }\n.brand { writing-mode:vertical-rl; transform:rotate(180deg); background:var(--w9-selected); color:var(--w9-selectedText); padding:10px 5px; font-size:21px; font-weight:bold; letter-spacing:-1px; }\n.items { flex:1; padding:3px; }\n.items a,.items button { display:flex; align-items:center; gap:9px; width:100%; text-align:left; border:0; border-radius:0; background:transparent; box-shadow:none; padding:7px 8px; min-height:40px; text-decoration:none; }\n.items a:hover,.items button:hover,.items a:focus-visible,.items button:focus-visible { background:var(--w9-selected); color:var(--w9-selectedText); outline:none; }\n.items hr { border:0; border-top:1px solid var(--w9-shadow); border-bottom:1px solid var(--w9-surface); margin:4px 2px; }\n.restore { position:fixed; bottom:8px; left:8px; z-index:9000; padding:8px 12px; }\n@media(max-width:500px) { .task { flex:1; width:80px; } .tray .network { display:none; } }\n" };

// Source: src/desktop/mount.js
modules["src/desktop/mount.js"] = (() => {
const { THEMES } = modules["src/themes/registry.js"];
const { renderDesktop } = modules["src/desktop/template.js"];
const { bindStartMenu } = modules["src/desktop/menu.js"];
const { bindStatus } = modules["src/desktop/status.js"];
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

  function apply(patch = {}) {
    engine.update(patch);
    const { enabled, theme, compact } = engine.state;
    select('.title').hidden = !enabled;
    select('.taskbar').hidden = !enabled;
    select('.restore').hidden = enabled;
    select('.title').dataset.version = theme;
    select('.brand').textContent = THEMES[theme].name;
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
  select('.close').addEventListener('click', () => setEnabled(false));
  select('.restore').addEventListener('click', () => setEnabled(true));
  select('.task').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'auto' }));
  bindStatus(shadow);
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

// Un seul bureau, uniquement dans la fenêtre principale.
if (window.top === window.self && !document.getElementById('onche-retro-desktop')) {
  const engine = new ThemeEngine(THEMES);
  installStyles(engine);
  installSiteIcons(engine);
  mountDesktop(engine);
}

return {  };
})();
})();
