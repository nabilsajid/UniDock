import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareVersions, parseVersion, updateKind } from '../../src/lib/domain/version';

test('versions are read with or without the v, and anything else is refused', () => {
  assert.deepEqual(parseVersion('v1.2.3'), [1, 2, 3]);
  assert.deepEqual(parseVersion('10.0.1'), [10, 0, 1]);
  assert.deepEqual(parseVersion('1.2.3-beta.1'), [1, 2, 3]);
  assert.equal(parseVersion('1.2'), null);
  assert.equal(parseVersion('latest'), null);
});

test('versions compare by number, not as text', () => {
  assert.ok(compareVersions('1.10.0', '1.9.9') > 0);
  assert.ok(compareVersions('1.0.1', '1.1.0') < 0);
  assert.equal(compareVersions('v2.0.0', '2.0.0'), 0);
});

test('the kind of update follows which number went up', () => {
  assert.equal(updateKind('1.0.0', '1.0.1'), 'patch');
  assert.equal(updateKind('1.0.1', '1.1.0'), 'minor');
  assert.equal(updateKind('1.4.2', '2.0.0'), 'major');
  assert.equal(updateKind('1.1.0', '1.1.0'), null);
  assert.equal(updateKind('1.2.0', '1.1.9'), null);
});
