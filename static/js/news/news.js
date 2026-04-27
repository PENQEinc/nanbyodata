/**
 * ニュース一覧・詳細ページ
 * news.json を取得して表示。サイドバーで Year / Tags フィルター。
 * タグ定義は tags.json の news セクションから取得（dev/本番は GitHub、ローカルは /static/data）。
 */
import { fetchNewsJson } from '../utils/newsJsonUrl.js';
import { fetchTagsJson, buildTagHelpers } from '../utils/tagsJsonUrl.js';
import { isNewsRecent } from '../utils/newsRecency.js';

function getLang() {
  const el = document.querySelector('.language-select');
  if (el && el.value) return el.value === 'en' ? 'en' : 'ja';
  return document.documentElement.lang === 'en' ? 'en' : 'ja';
}

function parseYearFromDate(dateStr) {
  // "2025.11.26" → 2025
  const part = dateStr.split('.')[0];
  return part ? parseInt(part, 10) : null;
}

document.addEventListener('DOMContentLoaded', async () => {
  const lang = getLang();
  const listView = document.getElementById('news-list-view');
  const detailView = document.getElementById('news-detail-view');
  const loadingEl = document.getElementById('news-loading');
  const errorEl = document.getElementById('news-error');
  const yearOptionsEl = document.getElementById('news-year-options');
  const tagOptionsEl = document.getElementById('news-tag-options');
  const listTitleEl = document.getElementById('news-list-title');
  const listEl = document.getElementById('news-list');

  const params = new URLSearchParams(window.location.search);
  const postId = params.get('post');

  function showLoading() {
    listView.style.display = 'none';
    detailView.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';
    if (loadingEl) {
      loadingEl.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.className = 'news-loading-spinner-wrap';
      const spinner = document.createElement('div');
      spinner.className = 'loading-spinner';
      wrap.appendChild(spinner);
      loadingEl.appendChild(wrap);
      loadingEl.style.display = 'block';
    }
  }

  function showError(msg) {
    listView.style.display = 'none';
    detailView.style.display = 'none';
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) {
      errorEl.style.display = 'block';
      errorEl.textContent =
        msg || (lang === 'ja' ? '読み込みに失敗しました。' : 'Failed to load.');
    }
  }

  let newsData = null;
  let tagsConfig = null;

  try {
    showLoading();
    [tagsConfig, newsData] = await Promise.all([
      fetchTagsJson(),
      fetchNewsJson(),
    ]);
    if (!newsData[lang]) newsData[lang] = [];
  } catch (e) {
    console.error('News or tags fetch error:', e);
    showError();
    return;
  }

  if (loadingEl) loadingEl.style.display = 'none';

  const { getTagLabel, getTagStyle, SIDEBAR_TAGS } = buildTagHelpers(
    tagsConfig.news,
  );
  const posts = newsData[lang] || [];

  // 年リスト（重複なし・降順）
  const years = [
    ...new Set(posts.map((p) => parseYearFromDate(p.date)).filter(Boolean)),
  ].sort((a, b) => b - a);

  // サイドバー: Year
  const yearAllLabel = lang === 'ja' ? 'すべて' : 'All';
  const yearAllSelectedClass = postId ? '' : ' class="is-selected"';
  yearOptionsEl.innerHTML = [
    `<li><label${yearAllSelectedClass} data-year=""><span class="option-check"></span><span>${yearAllLabel}</span></label></li>`,
    ...years.map(
      (y) =>
        `<li><label data-year="${y}"><span class="option-check"></span><span>${y}</span></label></li>`,
    ),
  ].join('');

  // サイドバー: Tags
  const tagAllLabel = lang === 'ja' ? 'すべて' : 'All';
  const tagAllSelectedClass = postId ? '' : ' class="is-selected"';
  tagOptionsEl.innerHTML = [
    `<li><label${tagAllSelectedClass} data-tag=""><span class="option-check"></span><span>${tagAllLabel}</span></label></li>`,
    ...SIDEBAR_TAGS.map(
      (t) =>
        `<li><label data-tag="${t.key}"><span class="tag-dot" style="${getTagStyle(t.key)}"></span><span>${getTagLabel(t.key, lang)}</span></label></li>`,
    ),
  ].join('');

  let selectedYears = new Set();
  let selectedTags = new Set();

  function getFilteredPosts() {
    return posts.filter((p) => {
      if (selectedYears.size > 0) {
        const y = parseYearFromDate(p.date);
        if (!y || !selectedYears.has(y)) return false;
      }
      if (selectedTags.size > 0) {
        if (!p.tags || !p.tags.some((t) => selectedTags.has(t))) return false;
      }
      return true;
    });
  }

  function updateYearSelectionUI() {
    const noFilter = selectedYears.size === 0;
    const allYearsSelected =
      years.length > 0 && years.every((y) => selectedYears.has(y));
    const allSelected = noFilter || allYearsSelected;
    yearOptionsEl.querySelectorAll('label').forEach((label) => {
      const year = label.dataset.year;
      const isAll = year === '';
      const isSelected =
        allSelected || (!isAll && selectedYears.has(parseInt(year, 10)));
      label.classList.toggle('is-selected', isSelected);
    });
  }

  function updateTagSelectionUI() {
    const allTagKeys = SIDEBAR_TAGS.map((t) => t.key);
    const noFilter = selectedTags.size === 0;
    const allTagsSelected = allTagKeys.every((key) => selectedTags.has(key));
    const allSelected = noFilter || allTagsSelected;
    tagOptionsEl.querySelectorAll('label').forEach((label) => {
      const tag = label.dataset.tag;
      const isAll = tag === '';
      const isSelected = allSelected || (!isAll && selectedTags.has(tag));
      label.classList.toggle('is-selected', isSelected);
    });
  }

  function renderList() {
    const filtered = getFilteredPosts();

    listTitleEl.textContent = lang === 'ja' ? 'ニュース一覧' : 'News list';
    listEl.innerHTML = filtered
      .map((p) => {
        const isRecent = isNewsRecent(p.date);
        const newBadge = isRecent
          ? '<span class="news-item-new">new</span>'
          : '';
        const tagsHtml = (p.tags || [])
          .map(
            (t) =>
              `<span class="news-tag"><span class="tag-dot" style="${getTagStyle(t)}"></span>${escapeHtml(getTagLabel(t, lang))}</span>`,
          )
          .join('');
        return `
      <li class="news-list-item">
        <div class="news-item-date"><time datetime="${p.date}">${p.date}</time></div>
        <div class="news-item-body">
          <div class="news-item-title-row"><span class="news-item-title"><a href="/news?post=${encodeURIComponent(p.id)}">${escapeHtml(p.title)}</a></span>${newBadge}</div>
          ${tagsHtml ? `<div class="news-item-tags">${tagsHtml}</div>` : ''}
        </div>
      </li>`;
      })
      .join('');
  }

  function renderDetail(entry) {
    if (!entry) {
      showError(
        lang === 'ja' ? '指定された記事は見つかりません。' : 'Post not found.',
      );
      return;
    }
    listView.style.display = 'none';
    detailView.style.display = 'block';
    document.getElementById('news-detail-title').textContent = entry.title;
    document.getElementById('news-detail-date').textContent = entry.date;
    document.getElementById('news-detail-tags').innerHTML = (entry.tags || [])
      .map(
        (t) =>
          `<span class="news-tag"><span class="tag-dot" style="${getTagStyle(t)}"></span>${escapeHtml(getTagLabel(t, lang))}</span>`,
      )
      .join('');
    document.getElementById('news-detail-body').innerHTML = entry.body || '';
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  // サイドバー選択（複数選択・トグル。フィルター変更時は一覧表示に切り替え）
  yearOptionsEl.querySelectorAll('label').forEach((label) => {
    label.addEventListener('click', () => {
      const year = label.dataset.year;
      if (year === '') {
        selectedYears.clear();
      } else {
        const y = parseInt(year, 10);
        if (selectedYears.has(y)) selectedYears.delete(y);
        else selectedYears.add(y);
      }
      updateYearSelectionUI();
      if (postId) window.history.replaceState({}, '', '/news');
      listView.style.display = 'block';
      detailView.style.display = 'none';
      renderList();
    });
  });

  tagOptionsEl.querySelectorAll('label').forEach((label) => {
    label.addEventListener('click', () => {
      const tag = label.dataset.tag;
      if (tag === '') {
        selectedTags.clear();
      } else {
        if (selectedTags.has(tag)) selectedTags.delete(tag);
        else selectedTags.add(tag);
      }
      updateTagSelectionUI();
      if (postId) window.history.replaceState({}, '', '/news');
      listView.style.display = 'block';
      detailView.style.display = 'none';
      renderList();
    });
  });

  if (!postId) {
    updateYearSelectionUI();
    updateTagSelectionUI();
  }

  if (postId) {
    const entry = posts.find((p) => p.id === postId);
    renderDetail(entry);
  } else {
    listView.style.display = 'block';
    detailView.style.display = 'none';
    renderList();
  }
});
