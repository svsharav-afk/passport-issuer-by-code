const CODE_PATTERN = /^\d{3}-\d{3}$/;

function parseCsvRows(text) {
  const source = text.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let afterQuote = false;

  const finishRow = () => {
    row.push(field);
    if (row.length > 1 || row[0] !== '') rows.push(row);
    row = [];
    field = '';
    afterQuote = false;
  };

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
        afterQuote = true;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field === '') {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
      afterQuote = false;
    } else if (character === '\r' || character === '\n') {
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      finishRow();
    } else {
      if (afterQuote) throw new Error(`Unexpected character after a quoted CSV field at offset ${index}`);
      field += character;
    }
  }

  if (quoted) throw new Error('Unterminated quoted CSV field');
  if (row.length > 0 || field !== '') finishRow();
  return rows;
}

export function parseFmsUnitCsv(text) {
  const rows = parseCsvRows(text);
  const header = rows.shift();
  if (!header || header.length !== 2 || header[0] !== 'code' || header[1] !== 'name') {
    throw new Error('Expected CSV header: code,name');
  }

  return rows.map((columns, index) => {
    if (columns.length !== 2) throw new Error(`CSV row ${index + 2} has ${columns.length} columns; expected 2`);
    const [code, name] = columns;
    if (!CODE_PATTERN.test(code)) throw new Error(`CSV row ${index + 2} has an invalid code: ${code}`);
    if (name.length === 0) throw new Error(`CSV row ${index + 2} has an empty name`);
    return { code, name };
  });
}

export function buildDataset(records) {
  const dataset = {};
  for (const { code, name } of records) {
    if (!CODE_PATTERN.test(code) || typeof name !== 'string' || name.length === 0) {
      throw new Error('Cannot build dataset from an invalid code/name record');
    }
    (dataset[code] ??= []).push(name);
  }
  return dataset;
}

export function validateDataset(dataset) {
  if (!dataset || typeof dataset !== 'object' || Array.isArray(dataset)) return false;
  return Object.entries(dataset).every(([code, names]) =>
    CODE_PATTERN.test(code)
    && Array.isArray(names)
    && names.length > 0
    && names.every((name) => typeof name === 'string' && name.length > 0)
  );
}
