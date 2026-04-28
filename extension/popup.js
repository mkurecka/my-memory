let activeTab = null;
let appInfo = null;

const pageTitle = document.getElementById('page-title');
const statusDot = document.getElementById('status-dot');
const message = document.getElementById('message');
const noteInput = document.getElementById('quick-note');

document.addEventListener('DOMContentLoaded', async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTab = tabs[0] || null;
  pageTitle.textContent = activeTab?.title || activeTab?.url || 'Current page';

  try {
    appInfo = await chrome.runtime.sendMessage({ action: 'getAppInfo' });
    statusDot.classList.add('ready');
  } catch {
    showMessage('Extension service is waking up', 'error');
  }
});

document.getElementById('save-page').addEventListener('click', async () => {
  if (!activeTab?.url) {
    showMessage('No page URL available', 'error');
    return;
  }

  await runSave(async () => chrome.runtime.sendMessage({
    action: 'savePageToMemory',
    data: {
      tab: {
        url: activeTab.url,
        title: activeTab.title
      }
    }
  }), 'Page saved');
});

document.getElementById('save-selection').addEventListener('click', async () => {
  if (!activeTab?.id) {
    showMessage('No active tab available', 'error');
    return;
  }

  const selection = await getSelectedText(activeTab.id);
  if (!selection.text) {
    showMessage('Select text on the page first', 'error');
    return;
  }

  await runSave(async () => chrome.runtime.sendMessage({
    action: 'saveNoteToMemory',
    data: {
      text: selection.text,
      tag: 'selection',
      context: getPageContext()
    }
  }), 'Selection saved');
});

document.getElementById('save-note').addEventListener('click', async () => {
  const text = noteInput.value.trim();
  if (!text) {
    showMessage('Write a note first', 'error');
    return;
  }

  await runSave(async () => chrome.runtime.sendMessage({
    action: 'saveNoteToMemory',
    data: {
      text,
      tag: 'note',
      context: getPageContext()
    }
  }), 'Note saved');

  noteInput.value = '';
});

document.querySelectorAll('.links button').forEach((button) => {
  button.addEventListener('click', async () => {
    const base = appInfo?.dashboardUrl?.replace(/\/dashboard$/, '') || 'https://my-memory.kureckamichal.workers.dev';
    await chrome.tabs.create({ url: `${base}${button.dataset.path}` });
    window.close();
  });
});

async function runSave(action, successMessage) {
  showMessage('Saving...');
  try {
    const response = await action();
    if (!response?.success) {
      throw new Error(response?.error || 'Save failed');
    }
    showMessage(successMessage, 'success');
  } catch (error) {
    showMessage(error.message || 'Save failed', 'error');
  }
}

async function getSelectedText(tabId) {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => ({
        text: window.getSelection()?.toString().trim() || '',
        title: document.title,
        url: window.location.href
      })
    });
    return result?.result || { text: '' };
  } catch {
    return { text: '' };
  }
}

function getPageContext() {
  return {
    url: activeTab?.url,
    pageTitle: activeTab?.title,
    timestamp: new Date().toISOString(),
    source: 'popup'
  };
}

function showMessage(text, type = '') {
  message.textContent = text;
  message.className = `message ${type}`.trim();
}
