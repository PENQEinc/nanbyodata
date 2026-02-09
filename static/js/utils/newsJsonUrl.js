const FALLBACK_NEWS_JSON_URL = '/static/data/news.json';

export function getNewsJsonUrl() {
  const host = window.location.hostname;
  if (host === 'dev-nanbyodata.dbcls.jp') {
    return 'https://raw.githubusercontent.com/aidrd/nanbyodata/refs/heads/dev/static/data/news.json';
  }
  if (host === 'nanbyodata.jp') {
    return 'https://raw.githubusercontent.com/aidrd/nanbyodata/refs/heads/master/static/data/news.json';
  }
  return FALLBACK_NEWS_JSON_URL;
}

/**
 * news.json を取得。GitHub 等の第一 URL に失敗した場合は /static/data/news.json にフォールバックする。
 * @returns {{ ja: Array, en: Array }}
 */
export async function fetchNewsJson() {
  const primaryUrl = getNewsJsonUrl();
  try {
    const res = await fetch(primaryUrl);
    if (res.ok) {
      return await res.json();
    }
    throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    if (primaryUrl === FALLBACK_NEWS_JSON_URL) {
      throw err;
    }
    console.warn('News fetch failed, trying fallback:', err.message || err);
    const fallback = await fetch(FALLBACK_NEWS_JSON_URL);
    if (!fallback.ok) throw new Error('Failed to fetch news.json (primary and fallback)');
    return await fallback.json();
  }
}
