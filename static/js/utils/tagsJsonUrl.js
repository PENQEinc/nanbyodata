/**
 * News/Resources 用タグ設定 JSON の URL を環境に応じて返す。
 * dev → GitHub dev, 本番 → GitHub master, ローカル → /static/data/tags.json
 */
const FALLBACK_TAGS_JSON_URL = '/static/data/tags.json';

export function getTagsJsonUrl() {
  const host = window.location.hostname;
  if (host === 'dev-nanbyodata.dbcls.jp') {
    return 'https://raw.githubusercontent.com/aidrd/nanbyodata/refs/heads/dev/static/data/tags.json';
  }
  if (host === 'nanbyodata.jp' || host === 'www.nanbyodata.jp') {
    return 'https://raw.githubusercontent.com/aidrd/nanbyodata/refs/heads/master/static/data/tags.json';
  }
  return FALLBACK_TAGS_JSON_URL;
}

/**
 * tags.json を取得。GitHub 等の第一 URL に失敗した場合はローカルにフォールバックする。
 * @returns {Promise<{ news: { tags }, resources: { tags } }>}
 */
export async function fetchTagsJson() {
  const primaryUrl = getTagsJsonUrl();
  try {
    const res = await fetch(primaryUrl);
    if (res.ok) {
      return await res.json();
    }
    throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    if (primaryUrl === FALLBACK_TAGS_JSON_URL) {
      throw err;
    }
    console.warn('Tags config fetch failed, trying fallback:', err.message || err);
    const fallback = await fetch(FALLBACK_TAGS_JSON_URL);
    if (!fallback.ok) {
      throw new Error('Failed to fetch tags.json (primary and fallback)');
    }
    return await fallback.json();
  }
}

const DEFAULT_TAG_COLOR = '#94a3b8';

/**
 * 1セクション分のタグ設定（tagsConfig.news または tagsConfig.resources）から
 * getTagLabel / getTagStyle / SIDEBAR_TAGS を生成。
 */
export function buildTagHelpers(sectionConfig) {
  const tags = (sectionConfig && sectionConfig.tags) || [];
  const keyToTag = Object.fromEntries(tags.map((t) => [t.key, t]));

  function getTagLabel(tagKey, lang) {
    const t = keyToTag[tagKey];
    if (!t || !t.labels) return tagKey;
    return t.labels[lang] || t.labels.ja || tagKey;
  }

  /** タグのドット用 style 文字列（background-color）。JSON の color を使う。 */
  function getTagStyle(tagKey) {
    const t = keyToTag[tagKey];
    const color = t && t.color != null ? t.color : DEFAULT_TAG_COLOR;
    return `background-color: ${color}`;
  }

  const SIDEBAR_TAGS = tags.map((t) => ({
    key: t.key,
    color: t.color != null ? t.color : DEFAULT_TAG_COLOR,
  }));

  return { getTagLabel, getTagStyle, SIDEBAR_TAGS };
}
