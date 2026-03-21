(function () {
  const STORAGE_KEY = 'nanbyodata:my-diseases';

  function getStorageItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function loadMyDiseases() {
    const raw = getStorageItem(STORAGE_KEY);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function updateMyDiseasesCount() {
    const count = String(loadMyDiseases().length);
    document.querySelectorAll('.my-diseases-count').forEach((el) => {
      el.textContent = count;
    });
  }

  updateMyDiseasesCount();
})();
