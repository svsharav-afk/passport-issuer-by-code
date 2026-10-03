import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildDataset, parseFmsUnitCsv, validateDataset } from '../lib/data.js';

const root = resolve(import.meta.dirname, '..');

test('CSV parser preserves quoted commas, escaped quotes, and row order', () => {
  const records = parseFmsUnitCsv('code,name\r\n420-001,"УПРАВЛЕНИЕ, ОТДЕЛ"\r\n420-001,"ОТДЕЛ ""СЕВЕР"""\r\n');
  assert.deepEqual(records, [
    { code: '420-001', name: 'УПРАВЛЕНИЕ, ОТДЕЛ' },
    { code: '420-001', name: 'ОТДЕЛ "СЕВЕР"' }
  ]);
});

test('CSV parser rejects malformed rows and codes', () => {
  assert.throws(() => parseFmsUnitCsv('code,name\n420001,NAME\n'), /invalid code/);
  assert.throws(() => parseFmsUnitCsv('code,name\n420-001\n'), /expected 2/);
  assert.throws(() => parseFmsUnitCsv('code,name\n420-001,"NAME\n'), /Unterminated/);
});

test('buildDataset keeps every original name for the same code', () => {
  const records = [
    { code: '420-001', name: 'НАЗВАНИЕ 1' },
    { code: '420-001', name: 'НАЗВАНИЕ 2' }
  ];
  assert.deepEqual(buildDataset(records), { '420-001': ['НАЗВАНИЕ 1', 'НАЗВАНИЕ 2'] });
});

test('runtime dataset is valid and contains every source CSV record unchanged', async () => {
  const csv = await readFile(resolve(root, 'data/source/fms_unit.csv'), 'utf8');
  const generated = JSON.parse(await readFile(resolve(root, 'data/fms-units.json'), 'utf8'));
  const info = JSON.parse(await readFile(resolve(root, 'data/dataset-info.json'), 'utf8'));
  const records = parseFmsUnitCsv(csv);
  const rebuilt = buildDataset(records);
  const runtimeRecords = Object.entries(generated).flatMap(([code, names]) => names.map((name) => ({ code, name })));

  assert.equal(validateDataset(generated), true);
  assert.deepEqual(generated, rebuilt);
  assert.deepEqual(runtimeRecords, records);
  assert.equal(records.length, 16584);
  assert.equal(Object.keys(generated).length, 7509);
  assert.equal(info.sourceRecords, records.length);
  assert.equal(info.uniqueCodes, Object.keys(generated).length);
  assert.equal(info.variants, runtimeRecords.length);
});

test('runtime dataset retains both known names for code 420-001', async () => {
  const generated = JSON.parse(await readFile(resolve(root, 'data/fms-units.json'), 'utf8'));
  assert.deepEqual(generated['420-001'], [
    'ГУ МВД РОССИИ ПО КЕМЕРОВСКОЙ ОБЛ.',
    'УФМС РОССИИ ПО КЕМЕРОВСКОЙ ОБЛ.'
  ]);
});
