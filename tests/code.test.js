import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCodeInput, isAllowedCodeEdit, normalizeCode, searchDataset } from '../lib/code.js';

test('normalizeCode accepts six digits and adds the separator', () => {
  assert.equal(normalizeCode('420001'), '420-001');
});

test('normalizeCode accepts an already formatted code and outer whitespace', () => {
  assert.equal(normalizeCode('  420-001  '), '420-001');
});

test('normalizeCode rejects incomplete and internally separated values', () => {
  for (const value of ['', '420', '42-0001', '420 001', '420/001', '420--001', 'abc420001']) {
    assert.equal(normalizeCode(value), null, value);
  }
});

test('formatCodeInput inserts the separator while preserving the digit caret position', () => {
  assert.deepEqual(formatCodeInput('4200', 4), { value: '420-0', caret: 5 });
  assert.deepEqual(formatCodeInput('420001', 3), { value: '420-001', caret: 3 });
  assert.deepEqual(formatCodeInput('420-001', 7), { value: '420-001', caret: 7 });
});

test('code editing allows partial digit groups but blocks invalid characters and excess digits', () => {
  assert.equal(isAllowedCodeEdit('420'), true);
  assert.equal(isAllowedCodeEdit('420-00'), true);
  assert.equal(isAllowedCodeEdit('420001'), true);
  assert.equal(isAllowedCodeEdit('420-0017'), false);
  assert.equal(isAllowedCodeEdit('420 001'), false);
});

test('searchDataset returns all names for a normalized code', () => {
  const dataset = { '420-001': ['ГУ МВД РОССИИ ПО КЕМЕРОВСКОЙ ОБЛ.', 'УФМС РОССИИ ПО КЕМЕРОВСКОЙ ОБЛ.'] };
  assert.deepEqual(searchDataset(dataset, '420001'), dataset['420-001']);
  assert.deepEqual(searchDataset(dataset, '420-001'), dataset['420-001']);
});

test('searchDataset returns an empty list for a missing or invalid code', () => {
  assert.deepEqual(searchDataset({}, '999-999'), []);
  assert.deepEqual(searchDataset({}, '42'), []);
});
