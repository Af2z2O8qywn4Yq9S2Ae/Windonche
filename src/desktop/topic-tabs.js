import { icon } from '../icons/assets.js';

const STORAGE_KEY = 'onche-retro-topic-tabs';
const MAX_TOPICS = 20;

/** Retourne l'identifiant d'un topic Onche, ou null pour une autre page. */
export function topicId(url, base = 'https://onche.org') {
  try {
    const target = new URL(url, base);
    if (!/^(?:www\.)?onche\.org$/i.test(target.hostname)) return null;
    return target.pathname.match(/^\/topic\/(\d+)(?:\/|$)/)?.[1] || null;
  } catch {
    return null;
  }
}

/** Place le topic actif en tête sans créer de doublon. */
export function rememberTopic(tasks, topic, limit = MAX_TOPICS) {
  return [topic, ...tasks.filter(item => item.id !== topic.id)].slice(0, limit);
}

/** Retire un topic de la liste des tâches. */
export function forgetTopic(tasks, id) {
  return tasks.filter(item => item.id !== id);
}

function cleanTitle(title, id) {
  return String(title || `Topic ${id}`).replace(/\s+[—|-]\s+Onche.*$/i, '').trim() || `Topic ${id}`;
}

function readTasks(storage) {
  try {
    const value = JSON.parse(storage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value.filter(item => item && topicId(item.url) === item.id) : [];
  } catch {
    return [];
  }
}

function writeTasks(storage, tasks) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // La navigation reste utilisable même si le stockage est bloqué.
  }
}

/** Gère les boutons de topics de la barre des tâches pour cet onglet navigateur. */
export class TopicTabs {
  constructor(shadow, options = {}) {
    this.container = shadow.querySelector('.tasks');
    this.storage = options.storage || window.sessionStorage;
    this.navigate = options.navigate || (url => window.location.assign(url));
    this.href = options.href || window.location.href;
    this.currentId = topicId(this.href, window.location.origin);
    this.pageTitle = document.title || 'Onche';
    this.tasks = readTasks(this.storage);
    if (this.currentId) {
      this.tasks = rememberTopic(this.tasks, {
        id: this.currentId,
        url: this.href,
        title: cleanTitle(this.pageTitle, this.currentId),
      });
      writeTasks(this.storage, this.tasks);
    }
    this.render();
  }

  createButton(task, active) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `raised task${active ? ' pressed' : ''}`;
    button.dataset.topicId = task.id;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', String(active));
    button.title = task.title;
    button.insertAdjacentHTML('afterbegin', icon('internet-explorer-16x16'));
    const label = document.createElement('span');
    label.className = 'task-label';
    label.textContent = task.title;
    button.append(label);
    button.addEventListener('click', () => {
      if (active) window.scrollTo({ top: 0, behavior: 'auto' });
      else this.navigate(task.url);
    });
    return button;
  }

  render() {
    this.container.textContent = '';
    if (!this.tasks.length) {
      this.container.append(this.createButton({ id: 'page', title: this.pageTitle }, true));
      return;
    }
    for (const task of this.tasks) {
      this.container.append(this.createButton(task, task.id === this.currentId));
    }
  }

  updateTitle(title) {
    this.pageTitle = title || 'Onche';
    if (this.currentId) {
      const current = this.tasks.find(task => task.id === this.currentId);
      if (current) {
        current.title = cleanTitle(this.pageTitle, this.currentId);
        current.url = this.href;
        writeTasks(this.storage, this.tasks);
      }
    }
    this.render();
  }

  /** Ferme le topic actif et bascule vers le précédent. */
  closeCurrent() {
    if (!this.currentId) return false;
    this.tasks = forgetTopic(this.tasks, this.currentId);
    writeTasks(this.storage, this.tasks);
    this.navigate(this.tasks[0]?.url || '/forum/1/blabla-general');
    return true;
  }
}

export function bindTopicTabs(shadow, options) {
  return new TopicTabs(shadow, options);
}
