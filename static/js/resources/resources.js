/**
 * リソース 一覧ページ
 * resources.json を取得して表示。サイドバーで Year / Tags フィルター。
 * タグ定義は tags.json の resources セクションから取得（dev/本番は GitHub、ローカルは /static/data）。
 */
import { fetchResourcesJson } from '../utils/resourcesJsonUrl.js';
import { fetchTagsJson, buildTagHelpers } from '../utils/tagsJsonUrl.js';

function getLang() {
  const el = document.querySelector('.language-select');
  if (el && el.value) return el.value === 'en' ? 'en' : 'ja';
  return document.documentElement.lang === 'en' ? 'en' : 'ja';
}

function parseYearFromDate(dateStr) {
  const part = dateStr.split('.')[0];
  return part ? parseInt(part, 10) : null;
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', async () => {
  const lang = getLang();
  const listView = document.getElementById('resources-list-view');
  const loadingEl = document.getElementById('resources-loading');
  const errorEl = document.getElementById('resources-error');
  const yearOptionsEl = document.getElementById('resources-year-options');
  const tagOptionsEl = document.getElementById('resources-tag-options');
  const listTitleEl = document.getElementById('resources-list-title');
  const listEl = document.getElementById('resources-list');

  function showLoading() {
    listView.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';
    if (loadingEl) {
      loadingEl.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.className = 'resources-loading-spinner-wrap';
      const spinner = document.createElement('div');
      spinner.className = 'loading-spinner';
      wrap.appendChild(spinner);
      loadingEl.appendChild(wrap);
      loadingEl.style.display = 'block';
    }
  }

  function showError(msg) {
    listView.style.display = 'none';
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) {
      errorEl.style.display = 'block';
      errorEl.textContent =
        msg || (lang === 'ja' ? '読み込みに失敗しました。' : 'Failed to load.');
    }
  }

  let resourcesData = null;
  let tagsConfig = null;

  try {
    showLoading();
    [tagsConfig, resourcesData] = await Promise.all([
      fetchTagsJson(),
      fetchResourcesJson(),
    ]);
    if (!resourcesData[lang]) resourcesData[lang] = [];
  } catch (e) {
    console.error('Resources or tags fetch error:', e);
    showError();
    return;
  }

  if (loadingEl) loadingEl.style.display = 'none';

  const { getTagLabel, getTagStyle, SIDEBAR_TAGS } = buildTagHelpers(
    tagsConfig.resources,
  );
  const items = resourcesData[lang] || [];

  // 年リスト（重複なし・降順）
  const years = [
    ...new Set(items.map((p) => parseYearFromDate(p.date)).filter(Boolean)),
  ].sort((a, b) => b - a);

  // サイドバー: Year
  const yearAllLabel = lang === 'ja' ? 'すべて' : 'All';
  yearOptionsEl.innerHTML = [
    `<li><label class="is-selected" data-year=""><span class="option-check"></span><span>${yearAllLabel}</span></label></li>`,
    ...years.map(
      (y) =>
        `<li><label data-year="${y}"><span class="option-check"></span><span>${y}</span></label></li>`,
    ),
  ].join('');

  // サイドバー: Tags
  const tagAllLabel = lang === 'ja' ? 'すべて' : 'All';
  tagOptionsEl.innerHTML = [
    `<li><label class="is-selected" data-tag=""><span class="option-check"></span><span>${tagAllLabel}</span></label></li>`,
    ...SIDEBAR_TAGS.map(
      (t) =>
        `<li><label data-tag="${t.key}"><span class="tag-dot" style="${getTagStyle(t.key)}"></span><span>${getTagLabel(t.key, lang)}</span></label></li>`,
    ),
  ].join('');

  let selectedYears = new Set();
  let selectedTags = new Set();

  function getFilteredItems() {
    return items.filter((p) => {
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
    const filtered = getFilteredItems();
    const listTitle =
      lang === 'ja' ? '論文・発表一覧' : 'Papers & Presentations';
    listTitleEl.textContent = listTitle;
    listEl.innerHTML = filtered
      .map((p) => {
        const metaHtml = p.publisher
          ? `<span class="resource-item-date">${p.date}</span> <span class="resource-item-publisher">${escapeHtml(p.publisher)}</span>`
          : `<span class="resource-item-date">${p.date}</span>`;
        const titleLink = p.url
          ? `<a href="${escapeHtml(p.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(p.title)}</a>`
          : escapeHtml(p.title);
        const tagsHtml = (p.tags || [])
          .map(
            (t) =>
              `<span class="resource-tag"><span class="tag-dot" style="${getTagStyle(t)}"></span>${escapeHtml(getTagLabel(t, lang))}</span>`,
          )
          .join('');
        const authorsHtml =
          p.authors || ''
            ? `<div class="resource-item-authors"><i class="fas fa-user resource-author-icon" aria-hidden="true"></i>${escapeHtml(p.authors)}</div>`
            : '';
        return `
      <li class="resources-list-item">
        <div class="resource-item-meta">${metaHtml}</div>
        <div class="resource-item-body">
          <div class="resource-item-title">${titleLink}</div>
          ${authorsHtml}
          ${p.description ? `<div class="resource-item-description">${escapeHtml(p.description)}</div>` : ''}
          ${tagsHtml ? `<div class="resource-item-tags">${tagsHtml}</div>` : ''}
        </div>
      </li>`;
      })
      .join('');
  }

  // サイドバー選択（複数選択・トグル）
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
      listView.style.display = 'block';
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
      listView.style.display = 'block';
      renderList();
    });
  });

  updateYearSelectionUI();
  updateTagSelectionUI();
  listView.style.display = 'block';
  renderList();
});
