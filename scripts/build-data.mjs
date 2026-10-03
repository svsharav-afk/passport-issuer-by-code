import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDataset, parseFmsUnitCsv, validateDataset } from '../lib/data.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(root, 'data/source/fms_unit.csv');
const metadataPath = resolve(root, 'data/source/fms_unit.csv-metadata.json');
const pinPath = resolve(root, 'data/source/UPSTREAM_COMMIT.txt');
const outputPath = resolve(root, 'data/fms-units.json');
const infoPath = resolve(root, 'data/dataset-info.json');

const [csv, sourceMetadataText, upstreamCommitText] = await Promise.all([
  readFile(sourcePath, 'utf8'),
  readFile(metadataPath, 'utf8'),
  readFile(pinPath, 'utf8')
]);
const sourceMetadata = JSON.parse(sourceMetadataText);
const upstreamCommit = upstreamCommitText.trim();
if (!/^[a-f0-9]{40}$/.test(upstreamCommit)) throw new Error('Invalid upstream commit pin');
if (sourceMetadata['dc:issued'] !== '2026-09-22') {
  throw new Error(`Unexpected source date: ${sourceMetadata['dc:issued']}`);
}
if (sourceMetadata['dc:license'] !== 'CC BY-SA 4.0') {
  throw new Error(`Unexpected dataset license: ${sourceMetadata['dc:license']}`);
}

const records = parseFmsUnitCsv(csv);
const dataset = buildDataset(records);
if (!validateDataset(dataset)) throw new Error('Generated runtime dataset is invalid');

const storedRecords = Object.entries(dataset).flatMap(([code, names]) => names.map((name) => ({ code, name })));
if (storedRecords.length !== records.length) throw new Error('A source record was lost during conversion');
for (let index = 0; index < records.length; index += 1) {
  if (records[index].code !== storedRecords[index].code || records[index].name !== storedRecords[index].name) {
    throw new Error(`Source record ${index + 1} changed or moved during conversion`);
  }
}

const sourceSha256 = createHash('sha256').update(csv).digest('hex');
const datasetText = `${JSON.stringify(dataset, null, 2)}\n`;
const info = {
  source: `https://github.com/hflabs/fms-unit/blob/${upstreamCommit}/fms_unit.csv`,
  upstreamCommit,
  issued: sourceMetadata['dc:issued'],
  creator: sourceMetadata['dc:creator'],
  license: sourceMetadata['dc:license'],
  sourceSha256,
  sourceRecords: records.length,
  uniqueCodes: Object.keys(dataset).length,
  variants: storedRecords.length
};

await Promise.all([
  writeFile(outputPath, datasetText, 'utf8'),
  writeFile(infoPath, `${JSON.stringify(info, null, 2)}\n`, 'utf8')
]);
console.log(JSON.stringify(info, null, 2));
