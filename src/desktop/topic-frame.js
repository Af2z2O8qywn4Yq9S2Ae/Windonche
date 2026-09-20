import { topicId } from './topic-tabs.js';

/** Simplifie uniquement l'intérieur d'une iframe de topic. */
export function prepareTopicFrame(documentRef = document, href = window.location.href) {
  const topic = topicId(href) && documentRef.querySelector('#topic');
  const header = documentRef.querySelector('body > header');
  if (!topic || !header || documentRef.documentElement.hasAttribute('data-onche-topic-frame')) return false;

  documentRef.documentElement.setAttribute('data-onche-topic-frame', '');
  const toolbar = documentRef.createElement('nav');
  toolbar.className = 'retro-topic-toolbar';
  toolbar.setAttribute('aria-label', 'Outils du topic');

  const pages = documentRef.createElement('div');
  pages.className = 'retro-topic-pages';
  const pagination = topic.querySelector(':scope > .content.pagination .pagination');
  if (pagination) {
    const wrapper = pagination.closest('.content.pagination');
    for (const active of pagination.querySelectorAll('a.active')) active.setAttribute('aria-current', 'page');
    pages.append(pagination);
    if (wrapper) wrapper.hidden = true;
  }

  const actions = documentRef.createElement('div');
  actions.className = 'retro-topic-actions';
  const nativeActions = topic.querySelector(':scope > .title > .right');
  if (nativeActions) actions.append(...nativeActions.children);

  toolbar.append(pages, actions);
  header.replaceChildren(toolbar);
  return true;
}
