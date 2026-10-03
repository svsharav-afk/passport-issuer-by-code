import { createContextLookup } from './lib/context-menu.js';

const menuId = 'find-issuer-by-code';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: menuId,
      title: 'Найти орган выдачи',
      contexts: ['selection']
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== menuId) return;

  const pendingLookup = createContextLookup(info.selectionText);
  try {
    await chrome.storage.session.set({ pendingLookup });
    await chrome.action.openPopup();
  } catch (error) {
    console.error('Не удалось открыть поиск по выделенному тексту.', error);
  }
});
