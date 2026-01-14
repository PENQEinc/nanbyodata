import { navToggle } from './utils/navigation.js';
import { focusInput } from './utils/focusInput.js';
import { setLangChange } from './utils/setLangChange.js';
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

  // ニュースセクションの初期状態を設定
  const newsWrapperEl = document.querySelector('.news-summary > .news-wrapper');
  if (newsWrapperEl) {
    // moreボタンを作成
    const moreButtonEl = document.createElement('button');
    moreButtonEl.className = 'more';
    moreButtonEl.textContent = 'more';
    moreButtonEl.style.display = 'none';
    newsWrapperEl.appendChild(moreButtonEl);

    // キャッシュの確認
    const currentLang = document.documentElement.lang === 'en' ? 'en' : 'ja';
    const branch =
      window.location.hostname === 'nanbyodata.jp' ? 'master' : 'dev';
    const CACHE_KEY = `news_info_${currentLang}_${branch}`;
    const CACHE_TIMESTAMP_KEY = `news_info_timestamp_${currentLang}_${branch}`;
    const CACHE_DURATION_MS = 30 * 60 * 1000;

    const now = new Date().getTime();
    const lastFetchTime = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    const hasValidCache =
      lastFetchTime && now - lastFetchTime < CACHE_DURATION_MS;

    // キャッシュが無効な場合のみローディングスピナーを表示
    if (!hasValidCache) {
      const loadingSpinner = document.createElement('div');
      loadingSpinner.className = 'loading-spinner news-loading';
      newsWrapperEl.appendChild(loadingSpinner);
    } else {
      moreButtonEl.style.display = 'block'; // キャッシュがある場合はmoreボタンを表示
    }

    // loadNewsListの完了を待ってからmore buttonのイベントリスナーを設定
    loadNewsList().then(() => {
      // ローディングスピナーを削除
      const spinner = newsWrapperEl.querySelector('.loading-spinner');
      if (spinner) {
        spinner.remove();
      }

      // moreボタンを表示
      moreButtonEl.style.display = 'block';

      // moreボタンのイベントリスナーを設定
      moreButtonEl.addEventListener('click', async () => {
        const isOpen = moreButtonEl.classList.toggle('open');
        moreButtonEl.textContent = isOpen ? 'close' : 'more';

        if (isOpen) {
          // ローディングスピナーを表示
          const loadingSpinner = document.createElement('div');
          loadingSpinner.className = 'loading-spinner news-loading';
          newsWrapperEl.appendChild(loadingSpinner);

          // 全記事を読み込む
          await loadNewsList(true);

          // ローディングスピナーを削除
          loadingSpinner.remove();
        } else {
          // 最初の5件のみ表示
          renderNewsList(JSON.parse(localStorage.getItem(CACHE_KEY)), true);
        }
      });
    });
  }
}

async function loadNewsList(loadAll = false) {
  const currentLang = document.documentElement.lang === 'en' ? 'en' : 'ja';
  const branch =
    window.location.hostname === 'nanbyodata.jp' ? 'master' : 'dev';
  const GITHUB_API_URL = `https://api.github.com/repos/aidrd/nanbyodata/contents/posts/${currentLang}?ref=${branch}`;

  const CACHE_KEY = `news_info_${currentLang}_${branch}`;
  const CACHE_TIMESTAMP_KEY = `news_info_timestamp_${currentLang}_${branch}`;
  const CACHE_DURATION_MS = 30 * 60 * 1000;

  const now = new Date().getTime();
  const lastFetchTime = localStorage.getItem(CACHE_TIMESTAMP_KEY);
  const hasValidCache =
    lastFetchTime && now - lastFetchTime < CACHE_DURATION_MS;

  let newsData = {};

  if (hasValidCache) {
    newsData = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } else {
    try {
      const response = await fetch(GITHUB_API_URL);
      if (!response.ok) throw new Error('GitHub API request failed');
      const files = await response.json();

      // ファイルを日付とpost番号でソート
      const sortedFiles = files.sort((a, b) => {
        const [dateA, postA] = a.name.split('-post');
        const [dateB, postB] = b.name.split('-post');
        if (dateA === dateB) {
          return parseInt(postB) - parseInt(postA);
        }
        return dateB.localeCompare(dateA);
      });

      // 全ファイルの基本情報を取得
      for (const file of sortedFiles) {
        if (file.type === 'file' && file.name.endsWith('.md')) {
          const datePart = file.name.split('-post')[0].replace(/-/g, '.');
          const postNum = file.name.match(/-post(\d+)\.md$/)[1];
          const filePath = file.name.replace('.md', '');

          newsData[filePath] = {
            date: datePart,
            postNum: parseInt(postNum),
            path: `news?post=${filePath}`,
            download_url: file.download_url,
            loaded: false,
          };
        }
      }

      // 最初の5件のタイトルを取得
      const first5Files = sortedFiles.slice(0, 5);
      for (const file of first5Files) {
        if (file.type === 'file' && file.name.endsWith('.md')) {
          const filePath = file.name.replace('.md', '');
          const fileResponse = await fetch(file.download_url);
          if (!fileResponse.ok) continue;
          const mdText = await fileResponse.text();
          const metadata = extractFrontMatter(mdText);

          newsData[filePath].title = metadata.title
            ? metadata.title.replace(/^['"](.*)['"]$/, '$1')
            : '(No Title)';
          newsData[filePath].loaded = true;
        }
      }

      localStorage.setItem(CACHE_KEY, JSON.stringify(newsData));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, now.toString());
    } catch (error) {
      console.error('Error fetching news:', error);
    }
  }

  if (loadAll) {
    // 未ロードの記事のタイトルを取得
    const unloadedEntries = Object.entries(newsData).filter(
      ([_, info]) => !info.loaded
    );
    for (const [filePath, info] of unloadedEntries) {
      try {
        const fileResponse = await fetch(info.download_url);
        if (!fileResponse.ok) continue;
        const mdText = await fileResponse.text();
        const metadata = extractFrontMatter(mdText);

        newsData[filePath].title = metadata.title
          ? metadata.title.replace(/^['"](.*)['"]$/, '$1')
          : '(No Title)';
        newsData[filePath].loaded = true;
      } catch (error) {
        console.error(`Error loading title for ${filePath}:`, error);
      }
    }

    // 更新されたデータをキャッシュに保存
    localStorage.setItem(CACHE_KEY, JSON.stringify(newsData));
  }

  renderNewsList(newsData, !loadAll);
}

function renderNewsList(newsData, limitTo5 = true) {
  const newsContainer = document.querySelector('.logdata');
  if (!newsContainer) return;

  let html = '';
  const now = new Date();
  const threeMonthsAgo = new Date();
  // 3ヶ月前の日付を計算
  threeMonthsAgo.setMonth(now.getMonth() - 3);

  Object.entries(newsData)
    .sort((a, b) => {
      if (a[1].date === b[1].date) {
        return b[1].postNum - a[1].postNum;
      }
      return new Date(b[1].date) - new Date(a[1].date);
    })
    .forEach(([filePath, info], index) => {
      if (limitTo5 && index >= 5) return;
      if (!info.loaded) return;

      const itemDate = new Date(info.date.replace(/\./g, '-'));
      const isRecent = itemDate > threeMonthsAgo;
      const recentClass = isRecent ? 'is-recent' : '';

      html += `
      <dl>
        <dt><time datetime="${info.date}">${info.date}</time></dt>
        <dd data-date="${info.date}" class="${recentClass}"><a href="${info.path}">${info.title}</a></dd>
      </dl>`;
    });

  newsContainer.innerHTML = html;
}

// **Markdownのメタデータを取得**
function extractFrontMatter(mdText) {
  const frontMatterPattern = /^---\n([\s\S]+?)\n---/;
  const match = mdText.match(frontMatterPattern);
  if (!match) return {};

  const lines = match[1].split('\n');
  const frontMatter = {};

  lines.forEach((line) => {
    const [key, ...values] = line.split(': ');
    if (key && values.length) {
      frontMatter[key.trim()] = values.join(': ').trim();
    }
  });

  return frontMatter;
}
