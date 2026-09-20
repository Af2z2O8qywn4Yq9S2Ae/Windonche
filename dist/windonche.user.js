// ==UserScript==
// @name         Onche — Windows 95 / 98
// @namespace    local.onche.windows-retro
// @version      2.0.0
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

/* Installation : dans Tampermonkey ou Violentmonkey, créer un script,
 * remplacer tout le contenu par ce fichier, enregistrer puis recharger Onche.
 * Démarrer permet de choisir 95/98, la densité et l'apparence d'origine.
 * HTML/CSS publics inspectés le 19 septembre 2026 : accueil, forum, sujet.
 * Ne remplace aucun contenu, lien ou gestionnaire d'événement du forum.
 * Icônes : https://98.js.org/images/icons/ (hébergement tiers, pas Microsoft).
 * Les icônes restent des images distantes, elles ne sont pas redessinées.
 * Les pages privées et l'envoi de messages nécessitent une vérification connecté.
 */
(() => {
  'use strict';
  if (window.top !== window.self || document.getElementById('onche-retro-desktop')) return;
  const root = document.documentElement;
  const ICON_BASE = 'https://98.js.org/images/icons/';
  const iconURL = name => ICON_BASE + name + '.png';
  const icon = (name, size = 16) => `<img class="sys-icon" src="${iconURL(name)}" width="${size}" height="${size}" alt="" aria-hidden="true" referrerpolicy="no-referrer" draggable="false">`;

  const read = (key, fallback) => {
    try { return typeof GM_getValue === 'function' ? GM_getValue(key, fallback) : fallback; }
    catch { return fallback; }
  };
  const write = (key, value) => {
    try { if (typeof GM_setValue === 'function') GM_setValue(key, value); } catch { /* Session-only fallback. */ }
  };
  // THEME REGISTRY. Add themes here; component rules contain no palette literals.
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
  function contrast(a,b) {
    const lum = hex => {
      const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255)
        .map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
      return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;
    };
    const x=lum(a),y=lum(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);
  }
  class ThemeEngine {
    constructor(registry) {
      this.registry=registry;
      this.state={enabled:read('retro-enabled',true)!==false,
        theme:read('retro-version','98'), compact:read('retro-compact',false)===true};
      if (!registry[this.state.theme]) this.state.theme='98';
      this.layers=new Map();
      this.tokens=document.createElement('style');
      this.tokens.id='onche-retro-tokens'; document.head.append(this.tokens);
    }
    use(name,css) {
      let sheet=this.layers.get(name);
      if (!sheet) {
        sheet=document.createElement('style'); sheet.id='onche-retro-'+name;
        document.head.append(sheet); this.layers.set(name,sheet);
      }
      sheet.textContent=css; return sheet;
    }
    update(patch={}) {
      const next={...this.state,...patch};
      const t=this.registry[next.theme];
      if (!t) throw new Error('Thème inconnu : '+next.theme);
      for (const [fg,bg] of [['ink','face'],['muted','face'],['link','surface'],
        ['visited','surface'],['selectedText','selected'],
        ['selectedText','titleStart'],['selectedText','titleEnd']]) {
        if (contrast(t[fg],t[bg])<4.5) throw new Error('Contraste insuffisant : '+fg+'/'+bg);
      }
      this.state=next;
      const vars=Object.entries(t).filter(([k])=>k!=='name')
        .map(([k,v])=>`--w9-${k}:${v}`).join(';');
      this.tokens.textContent=`html[data-onche-retro],#onche-retro-desktop{${vars};
        --w9-title:linear-gradient(90deg,var(--w9-titleStart),var(--w9-titleEnd));
        --w9-raised:inset 1px 1px var(--w9-light),inset -1px -1px var(--w9-dark),inset 2px 2px var(--w9-edge),inset -2px -2px var(--w9-shadow);
        --w9-sunken:inset 1px 1px var(--w9-shadow),inset -1px -1px var(--w9-light),inset 2px 2px var(--w9-dark),inset -2px -2px var(--w9-edge);
        --w9-chrome-height:70px;}`;
      if (next.enabled) root.setAttribute('data-onche-retro',next.theme);
      else root.removeAttribute('data-onche-retro');
      root.toggleAttribute('data-onche-compact',next.enabled&&next.compact);
      write('retro-enabled',next.enabled); write('retro-version',next.theme);
      write('retro-compact',next.compact);
    }
    destroy() {
      root.removeAttribute('data-onche-retro');root.removeAttribute('data-onche-compact');
      for (const sheet of this.layers.values()) sheet.remove();
      this.layers.clear(); this.tokens.remove();
    }
  }
  const engine=new ThemeEngine(THEMES);
  engine.use('components', `
html[data-onche-retro] {
  background:var(--w9-desktop)!important; color-scheme:light!important;
  scroll-padding-top:110px; scrollbar-color:var(--w9-face) var(--w9-edge);
}
/* Square corners also cover dynamically inserted widgets and pseudo-elements. */
html[data-onche-retro] *,
html[data-onche-retro] *::before,
html[data-onche-retro] *::after {
  border-radius:0!important;
  border-start-start-radius:0!important; border-start-end-radius:0!important;
  border-end-start-radius:0!important; border-end-end-radius:0!important;
}
html[data-onche-retro] body {
  background:var(--w9-desktop)!important; background-image:none!important; color:var(--w9-ink)!important;
  font-family:var(--w9-font)!important;
  font-size:14px; padding-bottom:48px!important;
}
html[data-onche-retro] body > header {
  top:28px!important; height:42px!important; background:var(--w9-face)!important;
  border:0!important; box-shadow:var(--w9-raised)!important; padding:3px 6px!important;
}
html[data-onche-retro] body > header .logo { height:36px!important; }
html[data-onche-retro] body > header .logo .image {
  background:none!important; width:130px!important; height:32px!important;
  display:flex; align-items:center; justify-content:center; text-decoration:none;
}
html[data-onche-retro] body > header .logo .image::after {
  content:"Onche"; color:var(--w9-ink); font:700 14px var(--w9-font);
  letter-spacing:0; text-shadow:none;
}
html[data-onche-retro] body > header .logo .image::before {
  content:""; width:16px; height:16px; margin-right:6px;
  background:url("${iconURL('internet-explorer-16x16')}") center/16px 16px no-repeat;
  image-rendering:pixelated;
}
html[data-onche-retro] body > header .item { color:var(--w9-ink)!important; height:34px!important; }
html[data-onche-retro] body > header .item .mdi { color:var(--w9-ink)!important; }
html[data-onche-retro] #content { padding-top:88px!important; background:transparent!important; }
html[data-onche-retro] #content > .container { width:min(1280px,calc(100% - 32px))!important; }
html[data-onche-retro] #content #left { min-width:0; }
html[data-onche-retro] body.sticky-right #content #right { top:84px!important; }
html[data-onche-retro] :is(.bloc,.messages > .message,.composer,.home-join,.home-greeting) {
  border:0!important; border-radius:0!important; background:var(--w9-face)!important;
  color:var(--w9-ink)!important; box-shadow:var(--w9-raised)!important;
}
html[data-onche-retro] .bloc { padding:3px!important; }
html[data-onche-retro] .bloc > .title {
  background:var(--w9-title)!important; color:var(--w9-selectedText)!important; border:0!important;
  border-radius:0!important; padding:5px 7px!important; min-height:28px;
}
html[data-onche-retro] .bloc > .title :is(h1,h2,h3,a,.mdi,span) {
  color:var(--w9-selectedText)!important;
}
html[data-onche-retro] .bloc > .title :is(h1,h2,h3) { font-size:13px!important; font-weight:700!important; font-family:var(--w9-font)!important; }
html[data-onche-retro] .bloc > .title.is_sticky { position:relative!important; top:auto!important; transform:none!important; }
html[data-onche-retro] .bloc > .content {
  background:var(--w9-face)!important; color:var(--w9-ink)!important; border-radius:0!important;
}
html[data-onche-retro] .bloc > .content.links { background:var(--w9-surface)!important; box-shadow:var(--w9-sunken)!important; margin:3px 0 0; }
html[data-onche-retro] .content.links a { color:var(--w9-selected)!important; border-radius:0!important; }
html[data-onche-retro] .content.links a:hover { background:var(--w9-selected)!important; color:var(--w9-selectedText)!important; }
html[data-onche-retro] .bloc > .topics { background:var(--w9-surface)!important; box-shadow:var(--w9-sunken)!important; padding:2px!important; margin-top:3px; }
html[data-onche-retro] .topics .topic {
  background:var(--w9-surface)!important; border-bottom:1px solid var(--w9-edge)!important;
  border-radius:0!important; transition:none!important;
}
html[data-onche-retro] .topics .topic:nth-child(even) { background:var(--w9-stripe)!important; }
html[data-onche-retro] .topics .topic .topic-subject { color:var(--w9-selected)!important; font-size:14px!important; }
html[data-onche-retro] .topics .topic .topic-subject:visited { color:var(--w9-visited)!important; }
html[data-onche-retro] .topics .topic .topic-subject span { font-family:var(--w9-font)!important; }
html[data-onche-retro] .topics .topic :is(.topic-username,.topic-nb,.right span) { color:var(--w9-muted)!important; }
html[data-onche-retro] .topics .topic:hover { background:var(--w9-selected)!important; }
html[data-onche-retro] .topics .topic:hover :is(.topic-subject,.topic-subject span,.topic-username,.topic-username span,.topic-nb,.right span) { color:var(--w9-selectedText)!important; -webkit-text-fill-color:var(--w9-selectedText)!important; background-image:none!important; }
html[data-onche-retro] .topics .topic::after { background:none!important; animation:none!important; }
html[data-onche-retro] .topics .topic::before { animation:none!important; }
html[data-onche-retro] .topics .topic:focus-within { outline:1px dotted var(--w9-selected); outline-offset:-2px; }
html[data-onche-retro] .topic-left img { border-radius:0!important; }
html[data-onche-retro][data-onche-compact] .topics .topic .topic-subject { padding-top:4px!important; padding-bottom:4px!important; }
html[data-onche-retro][data-onche-compact] .topic-username { display:none!important; }
html[data-onche-retro] .messages > .message { padding:3px!important; row-gap:0!important; margin-bottom:14px!important; }
html[data-onche-retro] .messages > .message > .message-top {
  background:var(--w9-title)!important; color:var(--w9-selectedText)!important; padding:5px 7px!important;
  min-height:38px; font-family:var(--w9-font)!important;
}
html[data-onche-retro] .messages > .message > .message-top :is(.message-username,.message-username span,.right a,.right .mdi) {
  color:var(--w9-selectedText)!important; text-shadow:none!important; background-image:none!important;
  -webkit-text-fill-color:var(--w9-selectedText)!important;
}
html[data-onche-retro] .messages > .message > .message-top img.avatar {
  width:30px!important; height:30px!important; border-radius:0!important; border:1px solid var(--w9-surface);
}
html[data-onche-retro] .messages > .message > .message-content {
  background:var(--w9-surface)!important; color:var(--w9-ink)!important; margin:3px 0!important; padding:12px!important;
  box-shadow:var(--w9-sunken)!important; font-size:15px!important; line-height:1.5!important;
}
html[data-onche-retro] .message-content .message.answer {
  background:var(--w9-quote)!important; color:var(--w9-ink)!important; border:1px solid var(--w9-shadow)!important;
  border-left:3px solid var(--w9-shadow)!important; border-radius:0!important; box-shadow:none!important;
}
html[data-onche-retro] .message.answer .message-content { color:var(--w9-ink)!important; }
html[data-onche-retro] .message-content a.link { color:var(--w9-link)!important; }
html[data-onche-retro] .message-content .signature { color:var(--w9-muted)!important; border-top-color:var(--w9-shadow)!important; }
html[data-onche-retro] .messages > .message > .message-bottom {
  background:var(--w9-face)!important; padding:5px 7px!important; box-shadow:inset 1px 1px var(--w9-shadow),inset -1px -1px var(--w9-light);
}
html[data-onche-retro] .message-date { background:transparent!important; color:var(--w9-muted)!important; border-radius:0!important; }
html[data-onche-retro] :is(button:not(.stories-bubble),.button,input[type="submit"],input[type="button"],.pagination a,.navigation a,.format .items .item,.composer__toolbar .item) {
  border:0!important; border-radius:0!important; background:var(--w9-face)!important;
  color:var(--w9-ink)!important; box-shadow:var(--w9-raised)!important;
  font-family:var(--w9-font)!important; text-shadow:none!important;
}
html[data-onche-retro] :is(button:not(.stories-bubble),.button,input[type="submit"],input[type="button"],.pagination a,.navigation a) { padding:6px 10px; }
html[data-onche-retro] :is(button:not(.stories-bubble),.button,.pagination a,.navigation a):active,
html[data-onche-retro] .pagination a.active { box-shadow:var(--w9-sunken)!important; background:var(--w9-edge)!important; }
html[data-onche-retro] :is(button:not(.stories-bubble),.button,input,textarea,select,a):focus-visible { outline:1px dotted var(--w9-ink)!important; outline-offset:2px!important; }
html[data-onche-retro] :is(button:disabled,input:disabled,.pagination a.disabled) { color:var(--w9-shadow)!important; text-shadow:1px 1px var(--w9-surface)!important; }
html[data-onche-retro] :is(textarea,select,input:not([type]),input[type="text"],input[type="search"],input[type="email"],input[type="password"],input[type="url"],input[type="number"],.textarea) {
  background:var(--w9-surface)!important; color:var(--w9-ink)!important; border:0!important; border-radius:0!important;
  box-shadow:var(--w9-sunken)!important; font-family:var(--w9-font)!important; padding:8px!important;
}
html[data-onche-retro] :is(input,textarea)::placeholder { color:var(--w9-muted)!important; }
html[data-onche-retro] :is(.composer__toolbar,.composer__footer,.format .items) { background:var(--w9-face)!important; border-radius:0!important; }
html[data-onche-retro] .composer { padding:4px!important; }
html[data-onche-retro] .home-greeting { padding:20px!important; }
html[data-onche-retro] .home-greeting-text { color:var(--w9-selected)!important; font-family:var(--w9-font)!important; }
html[data-onche-retro] footer { color:var(--w9-desktopText)!important; background:transparent!important; }
html[data-onche-retro] footer :is(a,.footer__meta) { color:var(--w9-desktopText)!important; }
html[data-onche-retro] .forum-fab { bottom:54px!important; border-radius:0!important; background:var(--w9-face)!important; color:var(--w9-ink)!important; box-shadow:var(--w9-raised)!important; }
html[data-onche-retro] ::selection { background:var(--w9-selected); color:var(--w9-selectedText); }
/* Finishing: editor, account menu, dialogs, picker and profile cards. */
html[data-onche-retro] :is(.composer__card,#menu,#confirmation_content,.media-picker,.profileCard,.clubCard,.mention-ac) {
  --menu-bg:var(--w9-face)!important; background:var(--w9-face)!important; color:var(--w9-ink)!important;
  border:0!important; box-shadow:var(--w9-raised)!important;
}
html[data-onche-retro] :is(.composer__card,.media-picker) { padding:3px!important; }
html[data-onche-retro] :is(.composer__toolbar,.composer__staff,.composer__edit-actions,.menu__footer,.menu__primary,.media-picker__tools) { background:var(--w9-face)!important; color:var(--w9-ink)!important; }
html[data-onche-retro] :is(.composer__toolbar,.media-picker__tools) { border-top:1px solid var(--w9-surface)!important; border-bottom:1px solid var(--w9-shadow)!important; }
html[data-onche-retro] .composer__textarea { margin:3px 0!important; }
html[data-onche-retro] :is(.menu__header,.media-picker__head) { background:var(--w9-title)!important; color:var(--w9-selectedText)!important; }
html[data-onche-retro] :is(.menu__header,.media-picker__head) :is(a,span,div,h2,h3) { color:var(--w9-selectedText)!important; }
html[data-onche-retro] :is(.menu__item,.menu__section-title,.menu__cta,.menu__level,.media-picker__label,.media-picker__name,.profileCard,.clubCard) { color:var(--w9-ink)!important; }
html[data-onche-retro] .menu__cta { background:var(--w9-face)!important; box-shadow:var(--w9-raised)!important; }
html[data-onche-retro] .menu__item:hover { color:var(--w9-selectedText)!important; background:var(--w9-selected)!important; }
html[data-onche-retro] .menu__item:hover * { color:inherit!important; }
html[data-onche-retro] #confirmation_content span { color:var(--w9-ink)!important; }
html[data-onche-retro] #toast { bottom:45px!important; background:var(--w9-tip)!important; color:var(--w9-ink)!important; border:1px solid var(--w9-ink)!important; box-shadow:1px 1px var(--w9-ink)!important; }
html[data-onche-retro] :is(#menu,.profileCard,.clubCard) { transition:none!important; }
html[data-onche-retro] #menu { top:74px!important; bottom:40px!important; }
html[data-onche-retro] :is(#confirmation,#media-picker) { padding-top:80px!important; padding-bottom:45px!important; }
html[data-onche-retro] .sticky-container { top:70px!important; background:var(--w9-face)!important; }
html[data-onche-retro] .sticky-radius { display:none!important; }
html[data-onche-retro] .bloc.border::before { display:none!important; }
html[data-onche-retro] .message-highlighted { outline:2px dotted var(--w9-selected)!important; outline-offset:2px; }
html[data-onche-retro] :is(.message-op,.topic-forum-pill,.likeButton__reaction) { box-shadow:none!important; }
html[data-onche-retro] .message-op { border-color:var(--w9-selectedText)!important; }
html[data-onche-retro] .message-op::before { color:var(--w9-selectedText)!important; }
html[data-onche-retro] .message.answer .message-op { border-color:var(--w9-shadow)!important; }
html[data-onche-retro] .message.answer .message-op::before { color:var(--w9-ink)!important; }
html[data-onche-retro] input:is([type="checkbox"],[type="radio"]) { accent-color:var(--w9-selected); }
html[data-onche-retro] input[type="radio"] { appearance:none!important; width:13px; height:13px; background:var(--w9-surface); box-shadow:var(--w9-sunken); vertical-align:middle; }
html[data-onche-retro] input[type="radio"]:checked { background:var(--w9-selected); border:3px solid var(--w9-surface); outline:1px solid var(--w9-shadow); }
html[data-onche-retro] ::-webkit-scrollbar { width:16px; height:16px; }
html[data-onche-retro] ::-webkit-scrollbar-track { background:var(--w9-edge); }
html[data-onche-retro] ::-webkit-scrollbar-thumb { background:var(--w9-face); box-shadow:var(--w9-raised); border-radius:0; }
html[data-onche-retro] ::-webkit-scrollbar-corner { background:var(--w9-face); }
@media(max-width:880px) {
 html[data-onche-retro] #content > .container { width:calc(100% - 12px)!important; }
 html[data-onche-retro] #content { padding-top:80px!important; }
 html[data-onche-retro] .messages > .message > .message-content { padding:9px!important; }
 html[data-onche-retro] body > header .logo .image { width:95px!important; }
 html[data-onche-retro] body > header .logo .image::after { font-size:14px; }
}
@media print {
 html[data-onche-retro],html[data-onche-retro] body { background:var(--w9-surface)!important; }
 html[data-onche-retro] body { padding-bottom:0!important; }
 html[data-onche-retro] #content { padding-top:0!important; }
 #onche-retro-desktop { display:none!important; }
}
`);
  engine.use('onche-adapter', `
/* Original heading stays in flow. Only Onche's clone is fixed. */
html[data-onche-retro] :is(#forum,#topic) > .title {
  position:relative!important; top:auto!important; left:auto!important;
  transform:none!important; margin:0!important; z-index:1!important;
}
html[data-onche-retro] .sticky-container { top:var(--w9-chrome-height)!important; }
html[data-onche-retro] .sticky-container > .title {
  position:relative!important; top:auto!important; margin:0!important;
  background:var(--w9-title)!important; color:var(--w9-selectedText)!important;
  padding:5px 7px!important; border:0!important;
}
html[data-onche-retro] .sticky-container > .title :is(h1,h2,a,span,.mdi) { color:var(--w9-selectedText)!important; }
/* Stories are thumbnails, not raised command buttons. Preserve native visibility. */
html[data-onche-retro] #stories-root { position:relative!important; clear:both; margin:0!important; }
html[data-onche-retro] .stories-bar { background:var(--w9-face)!important; padding:10px!important; }
html[data-onche-retro] .stories-bubble {
  padding:2px!important; background:transparent!important; border:0!important;
  box-shadow:none!important; color:var(--w9-ink)!important;
}
html[data-onche-retro] .stories-bubble__ring {
  background:var(--w9-face)!important; box-shadow:var(--w9-sunken)!important;
  padding:3px!important; transform:none!important;
}
html[data-onche-retro] .stories-bubble--unseen .stories-bubble__ring { outline:2px solid var(--w9-selected); outline-offset:1px; }
html[data-onche-retro] .stories-bubble__name,
html[data-onche-retro] .stories-bubble > :is(span,div):last-child {
  color:var(--w9-ink)!important; -webkit-text-fill-color:var(--w9-ink)!important;
  text-shadow:none!important; opacity:1!important;
}
/* Neutralize gradient usernames on light surfaces; keep title usernames white. */
html[data-onche-retro] body .pseudo {
  background-image:none!important; background-clip:border-box!important;
  -webkit-text-fill-color:currentColor!important; color:var(--w9-ink)!important;
  text-shadow:none!important;
}
html[data-onche-retro] body > header :is(a,span,.username,.pseudo) {
  color:var(--w9-ink)!important; -webkit-text-fill-color:currentColor!important;
  opacity:1!important; text-shadow:none!important;
}
html[data-onche-retro] body .messages > .message > .message-top .pseudo,
html[data-onche-retro] body .topics .topic:hover .pseudo {
  color:var(--w9-selectedText)!important; -webkit-text-fill-color:currentColor!important;
}
html[data-onche-retro] #right .content:not(.centered) { background:var(--w9-surface)!important; }
html[data-onche-retro] #right .content:not(.centered) :is(a,span,.color,.pseudo) {
  color:var(--w9-ink)!important; -webkit-text-fill-color:currentColor!important;
}
html[data-onche-retro] #right .content.links a:hover,
html[data-onche-retro] #right .content.links a:hover * { color:var(--w9-selectedText)!important; }
html[data-onche-retro] :is(.bloc-title-more,.bloc > .title .right) { opacity:1!important; }
html[data-onche-retro] .bloc > .title .button {
  background:var(--w9-face)!important; color:var(--w9-ink)!important;
}
html[data-onche-retro] .bloc > .title .button * { color:var(--w9-ink)!important; }
html[data-onche-retro] :is(.button,button):not(:disabled):not([aria-disabled="true"]) {
  opacity:1!important; -webkit-text-fill-color:currentColor!important;
}
html[data-onche-retro] :is(.message-date,.answer-date,.topic-username,.composer__welcome) { color:var(--w9-muted)!important; }
/* Do not recolor spoiler descendants or alter their visibility. */
html[data-onche-retro] #context { background:var(--w9-face)!important; color:var(--w9-ink)!important; box-shadow:var(--w9-raised)!important; }
html[data-onche-retro] #context .item { color:var(--w9-ink)!important; }
html[data-onche-retro] #context .item:hover { background:var(--w9-selected)!important; color:var(--w9-selectedText)!important; }
`);
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
  const host = document.createElement('div');
  host.id = 'onche-retro-desktop';
  // Isolate the desktop's styles from Onche, including the site's night themes.
  const shadow = host.attachShadow({mode:'open'});
  shadow.innerHTML = `
<style>
:host { all:initial; font:12px var(--w9-font); color:var(--w9-ink); }
*,*::before,*::after { box-sizing:border-box; border-radius:0!important; }
.sys-icon { flex:none; object-fit:contain; image-rendering:pixelated; vertical-align:middle; }
button,a { font:inherit; color:inherit; }
button { cursor:pointer; }
[hidden] { display:none!important; }
.raised { border:0; border-radius:0; background:var(--w9-face); box-shadow:inset 1px 1px var(--w9-light),inset -1px -1px var(--w9-ink),inset 2px 2px var(--w9-edge),inset -2px -2px var(--w9-shadow); }
button:active,.pressed { box-shadow:inset 1px 1px var(--w9-shadow),inset -1px -1px var(--w9-light),inset 2px 2px var(--w9-ink),inset -2px -2px var(--w9-edge); }
button:focus-visible,a:focus-visible { outline:1px dotted var(--w9-ink); outline-offset:-4px; }
.title { position:fixed; top:0; left:0; right:0; height:28px; z-index:9000; padding:3px; display:flex; align-items:center; gap:6px; background:var(--w9-title); color:var(--w9-selectedText); border:2px solid var(--w9-face); }

.caption { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:bold; }
.close { width:21px; height:19px; color:var(--w9-ink); font:bold 16px Arial; line-height:16px; padding:0; }
.taskbar { position:fixed; bottom:0; left:0; right:0; height:36px; padding:4px; display:flex; gap:6px; align-items:stretch; background:var(--w9-face); box-shadow:inset 0 1px var(--w9-surface),inset 0 2px var(--w9-edge); z-index:9000; }
.start { display:flex; align-items:center; gap:4px; padding:3px 8px 3px 3px; font-weight:bold; }
.separator { width:2px; border-left:1px solid var(--w9-shadow); border-right:1px solid var(--w9-surface); margin:1px; }
.task { text-align:left; width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding:4px 8px; font-weight:bold; background:var(--w9-edge); display:flex; align-items:center; gap:6px; min-width:0; }
.task-label { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.tray { margin-left:auto; display:flex; align-items:center; padding:0 9px; gap:10px; box-shadow:inset 1px 1px var(--w9-shadow),inset -1px -1px var(--w9-light); white-space:nowrap; }
.menu { position:fixed; bottom:35px; left:3px; width:270px; max-width:calc(100vw - 6px); max-height:calc(100dvh - 44px); overflow-y:auto; padding:3px; z-index:9001; display:flex; box-shadow:inset 1px 1px var(--w9-light),inset -1px -1px var(--w9-ink),inset 2px 2px var(--w9-edge),inset -2px -2px var(--w9-shadow),2px 2px var(--w9-shadow); background:var(--w9-face); }
.brand { writing-mode:vertical-rl; transform:rotate(180deg); background:var(--w9-selected); color:var(--w9-selectedText); padding:10px 5px; font-size:21px; font-weight:bold; letter-spacing:-1px; }
.items { flex:1; padding:3px; }
.items a,.items button { display:flex; align-items:center; gap:9px; width:100%; text-align:left; border:0; border-radius:0; background:transparent; box-shadow:none; padding:7px 8px; min-height:40px; text-decoration:none; }
.items a:hover,.items button:hover,.items a:focus-visible,.items button:focus-visible { background:var(--w9-selected); color:var(--w9-selectedText); outline:none; }
.items hr { border:0; border-top:1px solid var(--w9-shadow); border-bottom:1px solid var(--w9-surface); margin:4px 2px; }
.restore { position:fixed; bottom:8px; left:8px; z-index:9000; padding:8px 12px; }
@media(max-width:500px) { .task { flex:1; width:80px; } .tray .network { display:none; } }
</style>
<div class="title" data-version="98">${icon('internet-explorer-16x16')}<span class="caption">Onche — Internet Explorer</span><button class="raised close" title="Rétablir l’apparence d’origine" aria-label="Désactiver le thème Windows">×</button></div>
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
  shadow.addEventListener('error', event => {
    if (event.target instanceof HTMLImageElement) event.target.style.visibility = 'hidden';
  }, true);
  document.body.append(host);
  const $ = selector => shadow.querySelector(selector);
  const menu = $('.menu');
  const start = $('.start');
  function closeMenu(returnFocus = false) {
    menu.hidden = true;
    start.setAttribute('aria-expanded','false');
    if (returnFocus) start.focus();
  }
  function apply(patch={}) {
    engine.update(patch);
    const {enabled,theme:version,compact}=engine.state;
    $('.title').hidden=!enabled; $('.taskbar').hidden=!enabled;
    $('.restore').hidden=enabled; $('.title').dataset.version=version;
    $('.brand').textContent=THEMES[version].name;
    for (const id of Object.keys(THEMES)) {
      $(`#w${id} span`).textContent=`${version===id?'✓':'○'}  ${THEMES[id].name}`;
      $(`#w${id}`).setAttribute('aria-pressed',String(version===id));
    }
    $('#density span').textContent=`${compact?'✓':'○'}  Liste compacte`;
    $('#density').setAttribute('aria-pressed',String(compact));
    closeMenu();
  }
  function setEnabled(value) { apply({enabled:value}); }
  start.addEventListener('click',() => {
    menu.hidden = !menu.hidden;
    start.setAttribute('aria-expanded',String(!menu.hidden));
    if (!menu.hidden) $('.items a').focus();
  });
  document.addEventListener('pointerdown',event => { if (!event.composedPath().includes(host)) closeMenu(); });
  document.addEventListener('keydown',event => { if (event.key === 'Escape' && !menu.hidden) closeMenu(true); });
  menu.addEventListener('keydown',event => {
    if (!['ArrowDown','ArrowUp','Home','End'].includes(event.key)) return;
    const items = [...menu.querySelectorAll('a,button')];
    const current = items.indexOf(shadow.activeElement);
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? items.length-1 : (current+(event.key === 'ArrowDown' ? 1 : -1)+items.length)%items.length;
    event.preventDefault(); items[index].focus();
  });
  for (const v of Object.keys(THEMES)) $(`#w${v}`).addEventListener('click',() => { apply({theme:v}); start.focus(); });
  $('#density').addEventListener('click',() => { apply({compact:!engine.state.compact}); start.focus(); });
  $('#disable').addEventListener('click',() => setEnabled(false));
  $('.close').addEventListener('click',() => setEnabled(false));
  $('.restore').addEventListener('click',() => setEnabled(true));
  $('.task').addEventListener('click',() => window.scrollTo({top:0,behavior:'auto'}));
  function updateTitle() {
    const value = `${document.title || 'Onche'} — Internet Explorer`;
    $('.caption').textContent=value; $('.task-label').textContent=document.title || 'Onche';
  }
  updateTitle();
  const titleNode = document.querySelector('title');
  if (titleNode) new MutationObserver(updateTitle).observe(titleNode,{childList:true,characterData:true,subtree:true});
  function tick() {
    const now=new Date(); const clock=$('time');
    clock.textContent=now.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
    clock.dateTime=now.toISOString(); clock.title=now.toLocaleDateString('fr-FR',{dateStyle:'full'});
  }
  tick(); setInterval(tick,30000);
  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('Activer / désactiver Windows 95/98',() => setEnabled(!engine.state.enabled));
  }
  apply();
})();
