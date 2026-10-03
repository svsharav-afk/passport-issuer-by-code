import { normalizeCode } from './code.js';

export function createContextLookup(selectionText) {
  const code = normalizeCode(typeof selectionText === 'string' ? selectionText : '');
  if (code) return { code };

  return {
    code: '',
    errorMessage: 'Выделите код в формате 420-001 или 420001.'
  };
}

export function shouldRunLookup(code, { displayedCode, pendingCode }) {
  return Boolean(code) && code !== displayedCode && code !== pendingCode;
}
