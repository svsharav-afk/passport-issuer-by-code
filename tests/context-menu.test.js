import test from 'node:test';
import assert from 'node:assert/strict';
import { createContextLookup, shouldRunLookup } from '../lib/context-menu.js';

test('context selection accepts plain or formatted department codes', () => {
  assert.deepEqual(createContextLookup('420001'), { code: '420-001' });
  assert.deepEqual(createContextLookup('  420-001  '), { code: '420-001' });
});

test('context selection rejects incomplete or malformed text with a local message', () => {
  const expected = {
    code: '',
    errorMessage: 'Выделите код в формате 420-001 или 420001.'
  };
  for (const selection of ['', '420', '420 001', 'abc420001', undefined]) {
    assert.deepEqual(createContextLookup(selection), expected);
  }
});

test('automatic lookup skips a code already displayed or currently pending', () => {
  assert.equal(shouldRunLookup('420-001', { displayedCode: '420-001', pendingCode: null }), false);
  assert.equal(shouldRunLookup('420-001', { displayedCode: null, pendingCode: '420-001' }), false);
  assert.equal(shouldRunLookup('420-001', { displayedCode: '999-999', pendingCode: null }), true);
});
