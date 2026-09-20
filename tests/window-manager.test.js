import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampPosition, removeWindow, upsertWindow, windowId } from '../src/desktop/window-manager.js';

test('une page différente du même topic conserve la même fenêtre', () => {
  assert.equal(windowId('https://onche.org/topic/42/test'), 'topic:42');
  assert.equal(windowId('https://onche.org/topic/42/test/50'), 'topic:42');
  assert.equal(windowId('https://onche.org/forum/1/blabla-general/2'), 'forum:1');
  assert.equal(windowId('https://example.com/topic/42/test'), null);
});

test('les fenêtres gardent leur ordre lors de leur mise à jour', () => {
  const windows = [
    { id: 'forum:1', url: '/forum/1' },
    { id: 'topic:2', url: '/topic/2' },
  ];
  assert.deepEqual(upsertWindow(windows, { id: 'topic:2', url: '/topic/2/x/4' }), [
    { id: 'forum:1', url: '/forum/1' },
    { id: 'topic:2', url: '/topic/2/x/4' },
  ]);
  assert.equal(upsertWindow(windows, { id: 'topic:3', url: '/topic/3' }).at(-1).id, 'topic:3');
  const full = Array.from({ length: 8 }, (_, index) => ({ id: `topic:${index}` }));
  assert.equal(upsertWindow(full, { id: 'topic:9' }).length, 8);
  assert.deepEqual(removeWindow(windows, 'forum:1'), [{ id: 'topic:2', url: '/topic/2' }]);
});

test('le déplacement reste dans les limites du bureau', () => {
  assert.equal(clampPosition(-20, 300, 1000), 0);
  assert.equal(clampPosition(900, 300, 1000), 700);
  assert.equal(clampPosition(120, 300, 1000), 120);
});
