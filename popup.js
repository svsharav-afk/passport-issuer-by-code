import { formatCodeInput, isAllowedCodeEdit, normalizeCode, searchDataset } from './lib/code.js';
import { shouldRunLookup } from './lib/context-menu.js';

const form = document.querySelector('#searchForm');
const codeInput = document.querySelector('#departmentCode');
const statusMessage = document.querySelector('#statusMessage');
const resultCount = document.querySelector('#resultCount');
const results = document.querySelector('#results');
const themeToggle = document.querySelector('#themeToggle');
const themeLabel = document.querySelector('#themeLabel');
const emptyMessage = 'Введите шестизначный код для поиска.';
let currentDataset = null;
let lastValidValue = '';
let lastValidCaret = 0;
let displayedCode = null;
let pendingCode = null;
let searchRequestId = 0;

function setStatus(message, state = 'info') {
  statusMessage.textContent = message;
  statusMessage.dataset.state = state;
}

function clearResults() {
  resultCount.hidden = true;
  resultCount.textContent = '';
  results.replaceChildren();
}

function resetResultView() {
  searchRequestId += 1;
  displayedCode = null;
  pendingCode = null;
  clearResults();
  setStatus(codeInput.value ? '' : emptyMessage);
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('passport-checker-theme', theme);
  const nextTheme = theme === 'dark' ? 'светлую' : 'тёмную';
  themeLabel.textContent = theme === 'dark' ? 'Светлая' : 'Тёмная';
  themeToggle.setAttribute('aria-label', `Включить ${nextTheme} тему`);
}

const savedTheme = localStorage.getItem('passport-checker-theme');
setTheme(savedTheme === 'light' ? 'light' : 'dark');
themeToggle.addEventListener('click', () => {
  setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});

function applyFormattedValue(value, caretPosition) {
  const formatted = formatCodeInput(value, caretPosition);
  if (!formatted) return false;
  codeInput.value = formatted.value;
  codeInput.setSelectionRange(formatted.caret, formatted.caret);
  lastValidValue = formatted.value;
  lastValidCaret = formatted.caret;
  return true;
}

function handleCodeInput() {
  const code = normalizeCode(codeInput.value);
  if (code) {
    void runSearch(code);
    return;
  }
  resetResultView();
}

codeInput.addEventListener('beforeinput', (event) => {
  if (!event.inputType.startsWith('insert') || event.inputType === 'insertFromPaste' || event.data == null) return;
  const start = codeInput.selectionStart ?? codeInput.value.length;
  const end = codeInput.selectionEnd ?? start;
  const proposed = codeInput.value.slice(0, start) + event.data + codeInput.value.slice(end);
  if (!isAllowedCodeEdit(proposed)) {
    event.preventDefault();
    setStatus('Допускаются только шесть цифр; дефис добавляется автоматически.', 'error');
  }
});

codeInput.addEventListener('paste', (event) => {
  const pasted = event.clipboardData?.getData('text');
  if (pasted == null) return;
  event.preventDefault();

  const cleanPaste = pasted.trim();
  const start = codeInput.selectionStart ?? codeInput.value.length;
  const end = codeInput.selectionEnd ?? start;
  const proposed = codeInput.value.slice(0, start) + cleanPaste + codeInput.value.slice(end);
  if (!isAllowedCodeEdit(proposed)) {
    setStatus('Вставьте до шести цифр кода, с дефисом между группами или без него.', 'error');
    return;
  }

  const caretPosition = start + cleanPaste.length;
  applyFormattedValue(proposed, caretPosition);
  handleCodeInput();
});

codeInput.addEventListener('input', () => {
  const caret = codeInput.selectionStart ?? codeInput.value.length;
  if (!applyFormattedValue(codeInput.value, caret)) {
    codeInput.value = lastValidValue;
    codeInput.setSelectionRange(lastValidCaret, lastValidCaret);
    setStatus('Допускаются только цифры; код содержит шесть цифр.', 'error');
    return;
  }
  handleCodeInput();
});

function deleteDigitAt(index) {
  const digits = codeInput.value.replace('-', '');
  const nextDigits = digits.slice(0, index) + digits.slice(index + 1);
  const formatted = formatCodeInput(nextDigits, index);
  if (!formatted) return;
  codeInput.value = formatted.value;
  codeInput.setSelectionRange(formatted.caret, formatted.caret);
  lastValidValue = formatted.value;
  lastValidCaret = formatted.caret;
  handleCodeInput();
}

codeInput.addEventListener('keydown', (event) => {
  const start = codeInput.selectionStart;
  const end = codeInput.selectionEnd;
  if (start !== end) return;

  if (event.key === 'Backspace' && start === 4 && codeInput.value[3] === '-') {
    event.preventDefault();
    deleteDigitAt(2);
  } else if (event.key === 'Delete' && start === 3 && codeInput.value[3] === '-') {
    event.preventDefault();
    deleteDigitAt(3);
  }
});

function renderCard(name) {
  const card = document.createElement('article');
  card.className = 'result-card';

  const nameElement = document.createElement('p');
  nameElement.className = 'result-name';
  nameElement.textContent = name;

  const actions = document.createElement('div');
  actions.className = 'result-actions';
  const copyButton = document.createElement('button');
  copyButton.className = 'copy-button';
  copyButton.type = 'button';
  copyButton.textContent = 'Копировать';
  copyButton.setAttribute('aria-live', 'polite');

  const feedback = document.createElement('p');
  feedback.className = 'card-feedback';
  feedback.setAttribute('aria-live', 'polite');

  copyButton.addEventListener('click', async () => {
    copyButton.disabled = true;
    copyButton.textContent = 'Копирую…';
    feedback.textContent = '';
    feedback.dataset.state = '';
    try {
      await navigator.clipboard.writeText(name);
      copyButton.textContent = '✓ Скопировано';
    } catch {
      feedback.dataset.state = 'error';
      feedback.textContent = 'Не удалось скопировать. Попробуйте вручную.';
      copyButton.textContent = 'Копировать';
      copyButton.disabled = false;
      return;
    }
    window.setTimeout(() => {
      copyButton.textContent = 'Копировать';
      copyButton.disabled = false;
    }, 1300);
  });

  actions.append(copyButton);
  card.append(nameElement, actions, feedback);
  return card;
}

const datasetPromise = fetch(chrome.runtime.getURL('data/fms-units.json'))
  .then((response) => {
    if (!response.ok) throw new Error('Не удалось загрузить встроенный справочник.');
    return response.json();
  })
  .then((dataset) => {
    currentDataset = dataset;
    return dataset;
  });

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const code = normalizeCode(codeInput.value);
  if (!code) {
    setStatus('Введите все шесть цифр кода в формате 000-000.', 'error');
    codeInput.focus();
    return;
  }
  await runSearch(code);
});

async function runSearch(code) {
  if (!code) return;
  if (!shouldRunLookup(code, { displayedCode, pendingCode })) return;

  const requestId = ++searchRequestId;
  pendingCode = code;
  setStatus('Ищу в локальном справочнике…');
  try {
    const dataset = currentDataset ?? await datasetPromise;
    if (requestId !== searchRequestId || normalizeCode(codeInput.value) !== code) return;
    const names = searchDataset(dataset, code);
    pendingCode = null;
    displayedCode = code;
    if (names.length === 0) {
      clearResults();
      setStatus(`Для кода ${code} вариантов в справочнике не найдено.`);
      return;
    }

    resultCount.textContent = `Найдено: ${names.length}`;
    resultCount.hidden = false;
    results.replaceChildren(...names.map(renderCard));
    setStatus('');
  } catch {
    if (requestId !== searchRequestId) return;
    pendingCode = null;
    setStatus('Не удалось загрузить локальный справочник. Перезагрузите расширение в chrome://extensions.', 'error');
  }
}

async function consumePendingContextLookup() {
  try {
    const { pendingLookup } = await chrome.storage.session.get('pendingLookup');
    if (!pendingLookup) return;
    await chrome.storage.session.remove('pendingLookup');

    if (pendingLookup.code) {
      applyFormattedValue(pendingLookup.code, pendingLookup.code.length);
      void runSearch(pendingLookup.code);
      return;
    }

    codeInput.value = '';
    lastValidValue = '';
    lastValidCaret = 0;
    resetResultView();
    setStatus(pendingLookup.errorMessage, 'error');
  } catch {
    setStatus('Не удалось обработать выбранный текст.', 'error');
  }
}

void consumePendingContextLookup();
