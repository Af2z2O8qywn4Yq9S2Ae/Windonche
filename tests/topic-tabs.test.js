import { test } from 'node:test';
import assert from 'node:assert/strict';
import { topicId, rememberTopic, forgetTopic } from '../src/desktop/topic-tabs.js';

test('reconnaît uniquement les URLs de topics Onche', () => {
  assert.equal(topicId('https://onche.org/topic/1286192/un-sujet/35?x=1'), '1286192');
  assert.equal(topicId('/topic/42/test'), '42');
  assert.equal(topicId('https://example.com/topic/42/test'), null);
  assert.equal(topicId('https://onche.org/forum/1/blabla-general'), null);
  assert.equal(topicId('pas une url'), null);
});

test('place le topic actif en tête, actualise son URL et évite les doublons', () => {
  const tasks = [
    { id: '1', url: '/topic/1/ancien', title: 'Ancien' },
    { id: '2', url: '/topic/2/autre', title: 'Autre' },
  ];
  const result = rememberTopic(tasks, { id: '1', url: '/topic/1/nouveau/4', title: 'Nouveau' });
  assert.deepEqual(result, [
    { id: '1', url: '/topic/1/nouveau/4', title: 'Nouveau' },
    { id: '2', url: '/topic/2/autre', title: 'Autre' },
  ]);
});

test('limite la barre des tâches et ferme seulement le topic demandé', () => {
  const tasks = Array.from({ length: 25 }, (_, index) => ({ id: String(index), url: `/topic/${index}/x` }));
  assert.equal(rememberTopic(tasks, { id: '99', url: '/topic/99/x' }).length, 20);
  assert.deepEqual(forgetTopic(tasks.slice(0, 3), '1').map(task => task.id), ['0', '2']);
});
