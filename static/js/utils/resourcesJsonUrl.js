const FALLBACK_RESOURCES_JSON_URL = '/static/data/resources.json';

export function getResourcesJsonUrl() {
  const host = window.location.hostname;
  if (host === 'dev-nanbyodata.dbcls.jp') {
    return 'https://raw.githubusercontent.com/aidrd/nanbyodata/refs/heads/dev/static/data/resources.json';
  }
  if (host === 'nanbyodata.jp') {
    return 'https://raw.githubusercontent.com/aidrd/nanbyodata/refs/heads/master/static/data/resources.json';
  }
  return FALLBACK_RESOURCES_JSON_URL;
}

/**
 * resources.json を取得。GitHub 等の第一 URL に失敗した場合は /static/data/resources.json にフォールバックする。
 * @returns {{ ja: Array, en: Array }}
 */
export async function fetchResourcesJson() {
  const primaryUrl = getResourcesJsonUrl();
  try {
    const res = await fetch(primaryUrl);
    if (res.ok) {
      return await res.json();
    }
    throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    if (primaryUrl === FALLBACK_RESOURCES_JSON_URL) {
      throw err;
    }
    console.warn('Resources fetch failed, trying fallback:', err.message || err);
    const fallback = await fetch(FALLBACK_RESOURCES_JSON_URL);
    if (!fallback.ok) throw new Error('Failed to fetch resources.json (primary and fallback)');
    return await fallback.json();
  }
}
