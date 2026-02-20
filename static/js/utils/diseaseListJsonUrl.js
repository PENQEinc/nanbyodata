const FALLBACK_DISEASE_LIST_JSON_URL = '/static/data/disease_list.json';

export function getDiseaseListJsonUrl() {
  const host = window.location.hostname;
  if (host === 'dev-nanbyodata.dbcls.jp') {
    return 'https://raw.githubusercontent.com/aidrd/nanbyodata/refs/heads/dev/static/data/disease_list.json';
  }
  if (host === 'nanbyodata.jp' || host === 'www.nanbyodata.jp') {
    return 'https://raw.githubusercontent.com/aidrd/nanbyodata/refs/heads/master/static/data/disease_list.json';
  }
  return FALLBACK_DISEASE_LIST_JSON_URL;
}

/**
 * disease_list.json を取得。GitHub 等の第一 URL に失敗した場合は /static/data/disease_list.json にフォールバックする。
 * @returns {Promise<Array>}
 */
export async function fetchDiseaseListJson() {
  const primaryUrl = getDiseaseListJsonUrl();
  try {
    const res = await fetch(primaryUrl);
    if (res.ok) {
      return await res.json();
    }
    throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    if (primaryUrl === FALLBACK_DISEASE_LIST_JSON_URL) {
      throw err;
    }
    console.warn('Disease list fetch failed, trying fallback:', err.message || err);
    const fallback = await fetch(FALLBACK_DISEASE_LIST_JSON_URL);
    if (!fallback.ok)
      throw new Error(
        'Failed to fetch disease_list.json (primary and fallback)',
      );
    return await fallback.json();
  }
}
