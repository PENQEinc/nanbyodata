(function () {
  const STORAGE_KEY = 'nanbyodata:my-diseases';
  const root = document.getElementById('data-wrapper');
  const button = document.getElementById('disease-my-disease-toggle');
  const label = document.getElementById('disease-my-disease-toggle-label');

  if (!root || !button || !label) return;

  function isJapaneseLocale() {
    const locale = String(root.dataset.locale || document.documentElement.lang || 'en');
    return locale === 'ja' || locale === 'ja_JP';
  }

  function getStorageItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function setStorageItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      // ignore storage errors
    }
  }

  function normalizeNandoId(raw) {
    const trimmed = String(raw || '').trim();
    if (!trimmed) return '';
    return trimmed.toUpperCase().startsWith('NANDO:') ? trimmed : `NANDO:${trimmed}`;
  }

  function loadEntries() {
    const raw = getStorageItem(STORAGE_KEY);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function saveEntries(entries) {
    setStorageItem(STORAGE_KEY, JSON.stringify(entries));
    updateNavCount(entries.length);
  }

  function updateNavCount(count) {
    document.querySelectorAll('.my-diseases-count').forEach((el) => {
      el.textContent = String(count);
    });
  }

  function currentEntry() {
    const id = normalizeNandoId(button.dataset.id || root.dataset.nandoId || '');
    if (!id) return null;

    return {
      id,
      label_ja: getPlainJaLabel(),
      label_en: String(document.getElementById('temp-label-en')?.textContent || '').trim(),
      saved_at: new Date().toISOString(),
    };
  }

  function getPlainJaLabel() {
    const node = document.getElementById('temp-label-ja');
    if (!node) return '';
    const clone = node.cloneNode(true);
    clone.querySelectorAll('rt').forEach((rt) => rt.remove());
    return String(clone.textContent || '').trim();
  }

  function hasEntry(id) {
    const normalized = normalizeNandoId(id);
    return loadEntries().some((entry) => normalizeNandoId(entry.id) === normalized);
  }

  function setButtonState(active) {
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
    label.textContent = active
      ? (isJapaneseLocale() ? '登録済み' : 'Added')
      : (isJapaneseLocale() ? 'マイ疾患に追加' : 'Add to My Diseases');
  }

  function syncButton() {
    const entry = currentEntry();
    button.disabled = !entry;
    setButtonState(entry ? hasEntry(entry.id) : false);
    updateNavCount(loadEntries().length);
  }

  button.addEventListener('click', () => {
    const entry = currentEntry();
    if (!entry) return;

    const current = loadEntries();
    const exists = current.some((item) => normalizeNandoId(item.id) === entry.id);

    if (exists) {
      saveEntries(current.filter((item) => normalizeNandoId(item.id) !== entry.id));
      setButtonState(false);
      return;
    }

    saveEntries([entry, ...current.filter((item) => normalizeNandoId(item.id) !== entry.id)]);
    setButtonState(true);
  });

  const observer = new MutationObserver(syncButton);
  const jaLabel = document.getElementById('temp-label-ja');
  const enLabel = document.getElementById('temp-label-en');
  if (jaLabel) observer.observe(jaLabel, { childList: true, subtree: true, characterData: true });
  if (enLabel) observer.observe(enLabel, { childList: true, subtree: true, characterData: true });

  syncButton();
})();
