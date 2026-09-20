import { test } from 'node:test';
import assert from 'node:assert/strict';
import { topicId } from '../src/desktop/topic-tabs.js';

test('reconnaît uniquement les URLs de topics Onche', () => {
  assert.equal(topicId('https://onche.org/topic/1286192/un-sujet/35?x=1'), '1286192');
  assert.equal(topicId('/topic/42/test'), '42');
  assert.equal(topicId('https://example.com/topic/42/test'), null);
  assert.equal(topicId('https://onche.org/forum/1/blabla-general'), null);
  assert.equal(topicId('pas une url'), null);
});
