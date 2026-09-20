import { icon } from '../icons/assets.js';
import { topicId } from './topic-tabs.js';

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
export function windowId(url, base = 'https://onche.org') {
  const target = oncheURL(url, base);
  if (!target) return null;
  const topic = topicId(target.href);
  if (topic) return `topic:${topic}`;
  const forum = target.pathname.match(/^\/forum\/(\d+)(?:\/|$)/)?.[1];
  if (forum) return `forum:${forum}`;
  return `page:${target.pathname.replace(/\/$/, '') || '/'}`;
}

/** Ajoute une fenêtre à la fin ou la met à jour sans changer son ordre. */
export function upsertWindow(windows, next, limit = MAX_WINDOWS) {
  const index = windows.findIndex(item => item.id === next.id);
  if (index < 0) return windows.length >= limit ? windows : [...windows, next];
  return windows.map((item, itemIndex) => itemIndex === index ? { ...item, ...next } : item);
}

export function removeWindow(windows, id) {
  return windows.filter(item => item.id !== id);
}

export function clampPosition(value, size, boundary) {
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
export class WindowManager {
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
    this.themeState = { enabled: state.enabled, theme: state.theme, mode: state.mode, compact: state.compact };
    for (const panel of this.elements.values()) this.postTheme(panel.querySelector('iframe').contentWindow);
  }
}

export function bindWindowManager(shadow, options) {
  return new WindowManager(shadow, options);
}
