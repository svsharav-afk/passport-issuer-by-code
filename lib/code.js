export function normalizeCode(value) {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (/^\d{6}$/.test(trimmed)) {
    return `${trimmed.slice(0, 3)}-${trimmed.slice(3)}`;
  }
  if (/^\d{3}-\d{3}$/.test(trimmed)) return trimmed;
  return null;
}

export function formatCodeInput(value, caretPosition = value.length) {
  if (typeof value !== 'string') return null;
  if (!/^\d{0,6}$/.test(value) && !/^\d{0,3}-\d{0,3}$/.test(value)) return null;

  const digitsBeforeCaret = value.slice(0, caretPosition).replace(/\D/g, '').length;
  const digits = value.replace('-', '');
  const formatted = digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits;
  const caret = digitsBeforeCaret > 3 ? digitsBeforeCaret + 1 : digitsBeforeCaret;

  return { value: formatted, caret };
}

export function isAllowedCodeEdit(value) {
  return typeof value === 'string' && (/^\d{0,6}$/.test(value) || /^\d{0,3}-\d{0,3}$/.test(value));
}

export function searchDataset(dataset, code) {
  const normalized = normalizeCode(code);
  if (!normalized || !dataset || typeof dataset !== 'object') return [];
  const names = dataset[normalized];
  return Array.isArray(names) ? names : [];
}
