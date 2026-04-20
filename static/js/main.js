import { navToggle } from './utils/navigation.js';
import { focusInput } from './utils/focusInput.js';
import { setLangChange } from './utils/setLangChange.js';
import { fetchNewsJson } from './utils/newsJsonUrl.js';
import { fetchTagsJson, buildTagHelpers } from './utils/tagsJsonUrl.js';
import { isNewsRecent } from './utils/newsRecency.js';
import {
  drawDesignatedIntractableDiseaseColumnsTable,
  drawPediatricChronicSpecificDiseaseColumnsTable,
} from './epidemiology/epidemiology.js';
import { StatsOverview } from './stats-overview.js';

navToggle();
focusInput();
setLangChange();
if (window.location.pathname === '/epidemiology') {
  drawDesignatedIntractableDiseaseColumnsTable();
  drawPediatricChronicSpecificDiseaseColumnsTable();
}

// smartbox
if (window.location.pathname === '/') {
  // 統計情報を初期化
  const statsOverview = new StatsOverview();
  statsOverview.init();

  document.addEventListener('selectedSmartBoxLabel', function (event) {
    const labelInfo = event.detail.labelInfo;
    window.location.href = `${location.origin}/disease/${labelInfo.id}`;
  });

  // ニュースセクション: news.json とタグ設定を取得して表示（3件）。タグは tags.json の news で管理。
  function initNewsSection() {
    const newsWrapperEl = document.querySelector('.news-summary > .news-wrapper');
    if (!newsWrapperEl) return;

    const loadingSpinner = document.createElement('div');
    loadingSpinner.className = 'loading-spinner news-loading';
    newsWrapperEl.appendChild(loadingSpinner);

    Promise.all([fetchTagsJson(), fetchNewsJson()])
      .then(([tagsConfig, newsData]) => {
        const { getTagLabel, getTagStyle } = buildTagHelpers(tagsConfig.news);
        const newsDataMap = buildNewsDataFromJson(newsData);
        renderNewsList(newsDataMap, true, { getTagLabel, getTagStyle });
      })
      .catch((err) => {
        console.error('Error fetching news or tags:', err);
      })
      .finally(() => {
        const spinner = newsWrapperEl.querySelector('.loading-spinner');
        if (spinner) spinner.remove();
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNewsSection);
  } else {
    initNewsSection();
  }
}

function getCurrentLang() {
  const sel = document.querySelector('.language-select');
  if (sel && sel.value) return sel.value === 'en' ? 'en' : 'ja';
  return document.documentElement.lang === 'en' ? 'en' : 'ja';
}

function buildNewsDataFromJson(data) {
  const currentLang = getCurrentLang();
  const list = data[currentLang] || [];
  const newsData = {};
  list.forEach((entry) => {
    const postNum = (entry.id.match(/-post(\d+)$/) || [null, '0'])[1];
    newsData[entry.id] = {
      date: entry.date,
      title: entry.title,
      path: `news?post=${entry.id}`,
      postNum: parseInt(postNum, 10),
      tags: entry.tags || [],
      loaded: true,
    };
  });
  return newsData;
}

function renderNewsList(newsData, limitTo3 = true, tagHelpers = null) {
  const newsContainer = document.querySelector('.news-summary .logdata');
  if (!newsContainer) return;

  const lang = getCurrentLang();
  const getTagLabel = tagHelpers ? tagHelpers.getTagLabel : () => '';
  const getTagStyle = tagHelpers ? tagHelpers.getTagStyle : () => 'background-color: #94a3b8';

  let html = '';

  Object.entries(newsData)
    .sort((a, b) => {
      if (a[1].date === b[1].date) {
        return b[1].postNum - a[1].postNum;
      }
      return new Date(b[1].date) - new Date(a[1].date);
    })
    .forEach(([filePath, info], index) => {
      if (limitTo3 && index >= 3) return;
      if (!info.loaded) return;

      const isRecent = isNewsRecent(info.date);
      const recentClass = isRecent ? 'is-recent' : '';
      const tagsHtml = (info.tags || [])
        .map(
          (t) =>
            `<span class="news-tag"><span class="tag-dot" style="${getTagStyle(t)}"></span>${escapeHtmlForNews(getTagLabel(t, lang))}</span>`
        )
        .join('');
      const newBadge = isRecent ? '<span class="news-item-new">new</span>' : '';
      const titleRow = `<div class="news-item-title-row"><a href="${info.path}">${info.title}</a>${newBadge}</div>`;
      const tagsHtmlBlock = tagsHtml ? `<div class="news-item-tags">${tagsHtml}</div>` : '';

      html += `
      <dl>
        <dt><time datetime="${info.date}">${info.date}</time></dt>
        <dd data-date="${info.date}" class="${recentClass}">
          ${titleRow}
          ${tagsHtmlBlock}
        </dd>
      </dl>`;
    });

  newsContainer.innerHTML = html;
}

function escapeHtmlForNews(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
