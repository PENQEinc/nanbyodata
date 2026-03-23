// Stats page JavaScript
document.addEventListener('DOMContentLoaded', function () {
  updateViewByHash();
  window.addEventListener('hashchange', updateViewByHash);

  setupTooltipPortal();
  setupStatsDownloadButtons();

  // 言語切り替えイベントリスナーを追加
  const languageSelect = document.querySelector('.language-select');
  if (languageSelect) {
    languageSelect.addEventListener('change', function () {
      const value = this.value;
      const currentHash = window.location.hash;
      const currentPath = window.location.pathname;
      const search = window.location.search;
      let newUrl = '';

      if (search.includes('post')) {
        const params = new URLSearchParams(search);
        params.set('lang', value);
        newUrl = currentPath + '?' + params.toString() + currentHash;
      } else {
        newUrl = currentPath + '?lang=' + value + currentHash;
      }
      window.location.href = newUrl;
    });
  }
});

const CARD_DETAIL_FETCH_TIMEOUT_MS = 10000;

const DETAIL_HASH_ALIASES = {
  nando: 'nando-content',
  'nando-content': 'nando-content',
  genes: 'genes-content',
  'genes-content': 'genes-content',
  'clinical-features': 'clinical-features-content',
  'clinical-features-content': 'clinical-features-content',
  'glycan-related-genes': 'related-data-content',
  'related-data-content': 'related-data-content',
  bioresources: 'bioresources-content',
  'bioresources-content': 'bioresources-content',
  links: 'links-content',
  'links-content': 'links-content',
  variants: 'variants-content',
  'variants-content': 'variants-content',
};

/** トップページのカードで使っているAPIと合計抽出ロジック（sectionId → { api, extract }） */
const TOP_PAGE_API_MAP = {
  'nando-content': {
    api: '/sparqlist/api/NANDO_count',
    extract: (d) => {
      const s = parseInt(d.shitei_all?.['callret-0'] || 0);
      const m = parseInt(d.shoman_all?.['callret-0'] || 0);
      return (Number.isFinite(s) ? s : 0) + (Number.isFinite(m) ? m : 0);
    },
  },
  'genes-content': {
    api: '/sparqlist/api/NANDO_link_count2',
    extract: (d) => {
      const s = parseInt(d.shitei_gene?.gene || 0);
      const m = parseInt(d.shoman_gene?.gene || 0);
      return (Number.isFinite(s) ? s : 0) + (Number.isFinite(m) ? m : 0);
    },
  },
  'clinical-features-content': {
    api: '/sparqlist/api/NANDO_link_count2',
    extract: (d) => {
      const s = parseInt(d.shitei_hp?.hp || 0);
      const m = parseInt(d.shoman_hp?.hp || 0);
      return (Number.isFinite(s) ? s : 0) + (Number.isFinite(m) ? m : 0);
    },
  },
  'related-data-content': {
    api: '/sparqlist/api/NANDO_link_count8',
    extract: (d) => parseInt(d.glyco_gene_total?.num || 0) || 0,
  },
  'bioresources-content': {
    api: '/sparqlist/api/NANDO_link_count3',
    extract: (d) => {
      const sc = parseInt(d.shitei_cell?.cell || 0);
      const mc = parseInt(d.shoman_cell?.cell || 0);
      const sm = parseInt(d.shitei_mouse?.mouse || 0);
      const mm = parseInt(d.shoman_mouse?.mouse || 0);
      const sd = parseInt(d.shitei_DNA?.gene || 0);
      const md = parseInt(d.shoman_DNA?.gene || 0);
      return [sc, mc, sm, mm, sd, md].reduce(
        (a, v) => a + (Number.isFinite(v) ? v : 0),
        0,
      );
    },
  },
  'links-content': {
    api: '/sparqlist/api/NANDO_link_count',
    extract: (d) => {
      const keys = [
        ['name2', 'mondo'],
        ['name4', 'mondo'],
        ['name12', 'mondo'],
        ['name10', 'medgen'],
        ['name5', 'kegg'],
        ['name1', 'mondo'],
        ['name3', 'mondo'],
        ['name11', 'mondo'],
        ['name9', 'medgen'],
        ['name6', 'kegg'],
      ];
      return keys.reduce((sum, [k1, k2]) => {
        const v = parseInt(d[k1]?.[k2] || 0);
        return sum + (Number.isFinite(v) ? v : 0);
      }, 0);
    },
  },
};

async function fetchWithTimeout(url, options = {}, timeoutMs = CARD_DETAIL_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timerId);
  }
}

/**
 * ツールチップを body 直下に表示して、テーブルの overflow で切れないようにする。
 */
function setupTooltipPortal() {
  let portalEl = null;
  let hideTimer = null;

  function showTooltip(trigger, text) {
    if (!text || !trigger) return;
    if (!portalEl) {
      portalEl = document.createElement('div');
      portalEl.className = 'stats-tooltip-portal';
      portalEl.setAttribute('role', 'tooltip');
      portalEl.setAttribute('aria-hidden', 'true');
      document.body.appendChild(portalEl);
    }
    trigger.setAttribute('data-tooltip-active', '1');
    portalEl.textContent = text;
    portalEl.setAttribute('aria-hidden', 'false');
    portalEl.style.position = 'fixed';
    portalEl.style.left = '0';
    portalEl.style.top = '0';
    portalEl.style.display = 'block';
    portalEl.style.visibility = 'hidden';

    const rect = trigger.getBoundingClientRect();
    const padding = 8;
    const portalRect = portalEl.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - portalRect.width / 2;
    let top = rect.top - portalRect.height - padding;

    if (left < padding) left = padding;
    if (left + portalRect.width > window.innerWidth - padding)
      left = window.innerWidth - portalRect.width - padding;
    if (top < padding) top = rect.bottom + padding;

    portalEl.style.left = left + 'px';
    portalEl.style.top = top + 'px';
    portalEl.style.zIndex = '100000';
    portalEl.style.visibility = 'visible';
  }

  function hideTooltip(trigger) {
    if (trigger) trigger.removeAttribute('data-tooltip-active');
    if (portalEl) {
      portalEl.style.display = 'none';
      portalEl.setAttribute('aria-hidden', 'true');
    }
  }

  document.addEventListener(
    'mouseenter',
    function (e) {
      if (!e.target || typeof e.target.closest !== 'function') return;
      const trigger = e.target.closest(
        '.stats-th-tooltip, .stats-section-title-tooltip, .stats-tab-tooltip',
      );
      if (!trigger) return;
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      const text = trigger.getAttribute('data-tooltip');
      if (text) showTooltip(trigger, text);
    },
    true,
  );

  document.addEventListener(
    'mouseleave',
    function (e) {
      if (!e.target || typeof e.target.closest !== 'function') return;
      const trigger = e.target.closest(
        '.stats-th-tooltip, .stats-section-title-tooltip, .stats-tab-tooltip',
      );
      if (!trigger) return;
      hideTimer = setTimeout(function () {
        hideTooltip(trigger);
        hideTimer = null;
      }, 50);
    },
    true,
  );
}

/**
 * テーブル Download ボタンのクリックハンドラをセットアップ（イベント委譲）
 */
function setupStatsDownloadButtons() {
  document.addEventListener('click', function (e) {
    if (!e.target || typeof e.target.closest !== 'function') return;
    const btn = e.target.closest('.stats-download-btn');
    if (!btn) return;
    if (typeof btn._statsDownloadHandler === 'function') {
      btn._statsDownloadHandler(e);
      return;
    }
    const section = btn.closest('.stats-section');
    if (!section) return;
    const table = section.querySelector('.table-contents table.stats-table');
    if (!table) return;
    const csv = tableToCsv(table);
    if (!csv) return;
    const sectionId = btn.getAttribute('data-section-id') || 'stats-table';
    const filename = sectionId + '.csv';
    downloadCsv(csv, filename);
  });

  document.addEventListener('click', function (e) {
    if (!e.target || typeof e.target.closest !== 'function') return;
    const isPopupButton = e.target.closest('.stats-header-actions .open-popup-btn');
    const isInsidePopup = e.target.closest('.stats-header-actions .popup-view');
    if (isPopupButton || isInsidePopup) return;

    document
      .querySelectorAll('.stats-header-actions .open-popup-btn')
      .forEach((button) => button.setAttribute('aria-expanded', 'false'));
    document
      .querySelectorAll('.stats-header-actions .popup-view')
      .forEach((popup) => popup.setAttribute('aria-hidden', 'true'));
  });
}

/**
 * HTML テーブルを CSV 文字列に変換
 */
function tableToCsv(table) {
  const rows = [];
  const theadTr = table.querySelector('thead tr');
  const ths = theadTr ? theadTr.querySelectorAll('th') : [];
  const headers = Array.from(ths).map((th) => {
    const span = th.querySelector('.stats-th-label');
    const text = span ? span.textContent : th.textContent;
    return escapeCsvCell(text || '');
  });
  if (headers.length) rows.push(headers.join(','));

  const tbodyTrs = table.querySelectorAll('tbody tr');
  tbodyTrs.forEach((tr) => {
    const cells = [];
    const tds = tr.querySelectorAll('td');
    tds.forEach((td) => {
      let text = td.textContent || '';
      const link = td.querySelector('a[href]');
      if (link && link.href) {
        text = link.href;
      }
      cells.push(escapeCsvCell(text.trim()));
    });
    if (cells.length) rows.push(cells.join(','));
  });
  return rows.length ? rows.join('\n') : null;
}

function getConfigDataKeysForLocale(col, locale) {
  if (!col) return [];
  const multi = col.dataKeysByLocale;
  if (multi && typeof multi === 'object') {
    const keys = multi[locale] || multi.en || multi.ja;
    return Array.isArray(keys) ? keys.filter(Boolean) : [];
  }
  const single = col.dataKeyByLocale;
  if (single && typeof single === 'object') {
    const key = single[locale] || single.en || single.ja || col.dataKey;
    return key ? [key] : [];
  }
  return col.dataKey ? [col.dataKey] : [];
}

function getNandoIdForCsv(val) {
  if (val == null || val === '') return '';
  const s = String(val).trim();
  const fromUrl = s.match(/\/?(NANDO_\d+)$/i);
  if (fromUrl) return fromUrl[1];
  const fromColon = s.match(/^NANDO:(\d+)$/i);
  if (fromColon) return 'NANDO_' + fromColon[1];
  return s;
}

function htmlToPlainText(html) {
  if (html == null || html === '') return '';
  const div = document.createElement('div');
  div.innerHTML = String(html).replace(/\r\n|\r|\n/g, '<br>');
  return (div.textContent || div.innerText || '').trim();
}

function getCsvCellValueFromRow(row, col, locale) {
  const keys = getConfigDataKeysForLocale(col, locale);
  const values = keys
    .map((key) => row?.[key])
    .filter((value) => value != null && value !== '');

  if (col.link === 'external') {
    const hrefVal = col.linkHrefKey ? row?.[col.linkHrefKey] : values[0];
    return hrefVal != null && hrefVal !== '' ? String(hrefVal) : '—';
  }

  if (col.link === 'nando') {
    const raw = row?.nando_id != null ? row.nando_id : values[0];
    const normalized = getNandoIdForCsv(raw);
    return normalized
      ? `${window.location.origin}/disease/${encodeURIComponent(normalized)}`
      : '—';
  }

  if (col.html) {
    const htmlValues = values.map((value) => htmlToPlainText(value)).filter(Boolean);
    return htmlValues.length > 0 ? htmlValues.join('\n') : '—';
  }

  if (values.length === 0) return '—';
  if (values.length === 1) return String(values[0]);
  return values.map((value) => String(value)).join('\n');
}

function buildCsvFromConfigRows(columns, rows, locale) {
  const header = (columns || []).map((col) =>
    escapeCsvCell(col?.label?.[locale] || col?.label?.en || ''),
  );
  const body = (rows || []).map((row) =>
    (columns || [])
      .map((col) => escapeCsvCell(getCsvCellValueFromRow(row, col, locale)))
      .join(','),
  );
  const allRows = [];
  if (header.length > 0) allRows.push(header.join(','));
  allRows.push(...body);
  return allRows.length > 0 ? allRows.join('\n') : null;
}

function escapeCsvCell(str) {
  if (str == null) return '""';
  const s = String(str);
  if (
    s.includes('"') ||
    s.includes(',') ||
    s.includes('\n') ||
    s.includes('\r')
  ) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function downloadCsv(csv, filename) {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getCountLoadingMarkup() {
  return '<span class="stats-count-loading" aria-label="Loading"><span class="loading-spinner -stats -count" aria-hidden="true"></span></span>';
}

function setCountLoading(element) {
  if (!element) return;
  element.classList.add('is-loading');
  element.innerHTML = getCountLoadingMarkup();
}

function setCountValue(element, value) {
  if (!element) return;
  element.classList.remove('is-loading');
  element.textContent =
    Number.isFinite(value) && value >= 0 ? value.toLocaleString() : '-';
}

function setCountUnavailable(element) {
  if (!element) return;
  element.classList.remove('is-loading');
  element.textContent = '-';
}

function getLocalizedConfigText(configValue, locale) {
  if (!configValue || typeof configValue !== 'object') return '';
  return configValue[locale] || configValue.en || configValue.ja || '';
}

function createStatsTooltipIcon(className, tooltipText) {
  if (!tooltipText) return null;
  const tooltip = document.createElement('span');
  tooltip.className = className;
  tooltip.setAttribute('data-tooltip', tooltipText);
  tooltip.setAttribute('aria-label', tooltipText);
  const icon = document.createElement('i');
  icon.className = 'fas fa-info-circle';
  tooltip.appendChild(icon);
  return tooltip;
}

function getTabCountValue(rows, tab) {
  if (!Array.isArray(rows)) return 0;
  const countKey =
    tab?.countDataKey || (tab?.columns && tab.columns[0] ? tab.columns[0].dataKey : null);
  if (!countKey) return rows.length;
  return new Set(
    rows
      .map((row) => row?.[countKey])
      .filter((value) => value != null && String(value).trim() !== ''),
  ).size;
}

/**
 * ハッシュの有無で表示を切り替え。
 * ハッシュあり → そのカード用の新規テーブルを config JSON で表示。
 * ハッシュなし → 従来の NanbyoData in numbers テーブルを表示。
 */
function updateViewByHash() {
  const rawHash = window.location.hash.slice(1);
  const hashTarget = resolveStatsHashTarget(rawHash);
  const originalEl = document.getElementById('nanbyodata-in-numbers-original');
  const cardDetailEl = document.getElementById('card-detail-view');
  if (!originalEl || !cardDetailEl) return;

  if (hashTarget?.mode === 'detail') {
    originalEl.style.display = 'none';
    originalEl.setAttribute('aria-hidden', 'true');
    cardDetailEl.style.display = 'block';
    cardDetailEl.removeAttribute('aria-hidden');
    showCardDetailTable(hashTarget.sectionId);
  } else {
    originalEl.style.display = '';
    originalEl.removeAttribute('aria-hidden');
    cardDetailEl.style.display = 'none';
    cardDetailEl.setAttribute('aria-hidden', 'true');
    loadStatsData();
  }
}

function resolveStatsHashTarget(hash) {
  if (!hash) return '';
  if (DETAIL_HASH_ALIASES[hash]) {
    return {
      mode: 'detail',
      sectionId: DETAIL_HASH_ALIASES[hash],
    };
  }
  return '';
}

function getValueByPath(obj, path) {
  if (!obj || !path) return undefined;
  return String(path)
    .split('.')
    .reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function getSectionTotalFromRows(rows, columns) {
  if (!Array.isArray(rows) || !Array.isArray(columns)) return NaN;
  return rows.reduce((sum, row) => {
    const rowTotal = columns.reduce((rowSum, col) => {
      if (!col || col.dataKey === 'category') return rowSum;
      const raw = row?.[col.dataKey];
      const value = Number(
        typeof raw === 'number'
          ? raw
          : String(raw ?? '')
              .replace(/,/g, '')
              .trim(),
      );
      return Number.isFinite(value) ? rowSum + value : rowSum;
    }, 0);
    return sum + rowTotal;
  }, 0);
}

function getConfigDataKeyForLocale(col, locale) {
  if (!col) return null;
  const byLocale = col.dataKeyByLocale;
  if (byLocale && typeof byLocale === 'object') {
    return byLocale[locale] || byLocale.en || byLocale.ja || col.dataKey;
  }
  return col.dataKey;
}

/**
 * カード用の新規テーブルを config に基づいて表示する（ハッシュで指定されたセクション）
 */
async function showCardDetailTable(sectionId) {
  const container = document.getElementById('card-detail-content');
  if (!container) return;
  const locale = getStatsLocale();
  const loadingSpinnerHtml =
    '<div class="stats-table-loading"><div class="stats-table-loading-spinner-wrap"><div class="loading-spinner -stats"></div></div></div>';
  container.innerHTML = loadingSpinnerHtml;

  try {
    const res = await fetchWithTimeout(
      '/static/data/nanbyodata-in-numbers-config.json',
    );
    if (!res.ok) throw new Error(res.statusText);
    const config = await res.json();
    const sectionConfig = config.sections?.find((s) => s.id === sectionId);
    if (!sectionConfig) {
      container.innerHTML =
        '<p>' +
        (locale === 'ja'
          ? '指定されたセクションが見つかりません。'
          : 'Section not found.') +
        '</p>';
      return;
    }

    const section = document.createElement('div');
    section.className = 'stats-section card-detail-section';

    const header = document.createElement('div');
    header.className = 'stats-section-header';
    const title = document.createElement('h4');
    title.className = 'stats-section-title';
    title.textContent =
      sectionConfig.title?.[locale] || sectionConfig.title?.en || sectionId;
    const titleTooltip = getLocalizedConfigText(sectionConfig.titleTooltip, locale);
    if (titleTooltip) {
      const tw = createStatsTooltipIcon('stats-section-title-tooltip', titleTooltip);
      if (tw) title.appendChild(tw);
    }
    const titleCount = document.createElement('span');
    titleCount.className = 'stats-title-count data-num';
    setCountLoading(titleCount);
    title.appendChild(titleCount);
    header.appendChild(title);
    let loadedRowsFromApi = [];
    let loadTabTable = null;
    const hasTabs = Array.isArray(sectionConfig.tabs) && sectionConfig.tabs.length > 0;
    const headerActions = document.createElement('div');
    headerActions.className = 'stats-header-actions';
    const downloadWrap = document.createElement('div');
    downloadWrap.className = 'summary-download';
    const downloadBtn = document.createElement('button');
    downloadBtn.type = 'button';
    downloadBtn.className = 'stats-download-btn open-popup-btn';
    downloadBtn.setAttribute('data-section-id', sectionId);
    downloadBtn.setAttribute('aria-controls', `popup-download-${sectionId}`);
    downloadBtn.setAttribute('aria-expanded', 'false');
    downloadBtn.setAttribute('aria-label', 'Download as CSV');
    downloadBtn.innerHTML =
      '<i class="fas fa-download" aria-hidden="true"></i> Download';
    downloadWrap.appendChild(downloadBtn);
    const downloadPanel = document.createElement('div');
    downloadPanel.className = 'popup-view';
    downloadPanel.id = `popup-download-${sectionId}`;
    downloadPanel.setAttribute('aria-hidden', 'true');
    downloadPanel.setAttribute('role', 'dialog');
    downloadPanel.setAttribute('aria-labelledby', `popupDownloadTitle-${sectionId}`);

    const downloadTitle = document.createElement('div');
    downloadTitle.className = 'popup-title';
    downloadTitle.id = `popupDownloadTitle-${sectionId}`;
    downloadTitle.textContent = locale === 'ja' ? 'ダウンロード' : 'Download';
    downloadPanel.appendChild(downloadTitle);

    const downloadBody = document.createElement('div');
    downloadBody.className = 'popup-body';

    let downloadTabSelect = null;
    let downloadFormatSelect = null;

    if (hasTabs) {
      const tabWrapper = document.createElement('div');
      tabWrapper.className = 'popup-wrapper';
      const tabLabel = document.createElement('label');
      tabLabel.className = 'label';
      tabLabel.textContent = locale === 'ja' ? 'Table :' : 'Table :';
      downloadTabSelect = document.createElement('select');
      downloadTabSelect.className = 'stats-download-select';
      sectionConfig.tabs.forEach((tab) => {
        const option = document.createElement('option');
        option.value = tab.id;
        option.textContent = tab.label?.[locale] || tab.label?.en || tab.id;
        downloadTabSelect.appendChild(option);
      });
      tabWrapper.appendChild(tabLabel);
      tabWrapper.appendChild(downloadTabSelect);
      downloadBody.appendChild(tabWrapper);
    }

    const formatWrapper = document.createElement('div');
    formatWrapper.className = 'popup-wrapper';
    const formatLabel = document.createElement('label');
    formatLabel.className = 'label';
    formatLabel.textContent = 'Format :';
    downloadFormatSelect = document.createElement('select');
    downloadFormatSelect.className = 'stats-download-select';
    const csvOption = document.createElement('option');
    csvOption.value = 'csv';
    csvOption.textContent = 'CSV';
    downloadFormatSelect.appendChild(csvOption);
    formatWrapper.appendChild(formatLabel);
    formatWrapper.appendChild(downloadFormatSelect);
    downloadBody.appendChild(formatWrapper);

    const downloadConfirmBtn = document.createElement('button');
    downloadConfirmBtn.type = 'button';
    downloadConfirmBtn.className = 'popup-btn';
    downloadConfirmBtn.textContent = 'Download';
    downloadConfirmBtn.addEventListener('click', async () => {
      if (downloadFormatSelect?.value !== 'csv') return;

      if (hasTabs) {
        const selectedTabId = downloadTabSelect?.value;
        if (!selectedTabId) return;

        if (sectionConfig.tabs?.some((tab) => tab.dataApi && tab.columns?.length)) {
          const selectedIndex = sectionConfig.tabs.findIndex(
            (tab) => tab.id === selectedTabId,
          );
          if (selectedIndex < 0) return;
          const selectedTab = sectionConfig.tabs[selectedIndex];
          const rows =
            typeof loadTabTable === 'function'
              ? await loadTabTable(selectedIndex, { silent: true })
              : [];
          const csv = buildCsvFromConfigRows(selectedTab.columns || [], rows, locale);
          if (!csv) return;
          downloadCsv(csv, `${sectionId}-${selectedTabId}.csv`);
          downloadBtn.setAttribute('aria-expanded', 'false');
          downloadPanel.setAttribute('aria-hidden', 'true');
          return;
        }

        if (sectionConfig.hasTabs && loadedRowsFromApi.length > 0) {
          const selectedIndex = sectionConfig.tabs.findIndex(
            (tab) => tab.id === selectedTabId,
          );
          if (selectedIndex < 0) return;
          const row = loadedRowsFromApi[selectedIndex];
          const csv = buildCsvFromConfigRows(
            sectionConfig.columns || [],
            row ? [row] : [],
            locale,
          );
          if (!csv) return;
          downloadCsv(csv, `${sectionId}-${selectedTabId}.csv`);
          downloadBtn.setAttribute('aria-expanded', 'false');
          downloadPanel.setAttribute('aria-hidden', 'true');
          return;
        }
      }

      const csv = buildCsvFromConfigRows(
        sectionConfig.columns || [],
        loadedRowsFromApi,
        locale,
      );
      if (!csv) return;
      downloadCsv(csv, `${sectionId}.csv`);
      downloadBtn.setAttribute('aria-expanded', 'false');
      downloadPanel.setAttribute('aria-hidden', 'true');
    });
    downloadBody.appendChild(downloadConfirmBtn);
    downloadPanel.appendChild(downloadBody);
    downloadWrap.appendChild(downloadPanel);
    headerActions.appendChild(downloadWrap);
    downloadBtn._statsDownloadHandler = () => {
      const isOpen = downloadBtn.getAttribute('aria-expanded') === 'true';
      document
        .querySelectorAll('.stats-header-actions .open-popup-btn')
        .forEach((button) => button.setAttribute('aria-expanded', 'false'));
      document
        .querySelectorAll('.stats-header-actions .popup-view')
        .forEach((popup) => popup.setAttribute('aria-hidden', 'true'));
      downloadBtn.setAttribute('aria-expanded', String(!isOpen));
      downloadPanel.setAttribute('aria-hidden', String(isOpen));
    };
    header.appendChild(headerActions);
    section.appendChild(header);

    const descriptionText =
      sectionConfig.description?.[locale] || sectionConfig.description?.en || '';
    if (descriptionText) {
      const description = document.createElement('p');
      description.className = 'stats-section-description';
      description.textContent = descriptionText;
      section.appendChild(description);
    }

    const tableWrap = document.createElement('div');
    tableWrap.className = 'table-contents';
    const table = document.createElement('table');
    table.className = 'table stats-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr></tr>';
    const tbody = document.createElement('tbody');
    table.appendChild(thead);
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    section.appendChild(tableWrap);

    const theadTr = thead.querySelector('tr');
    const columns = sectionConfig.columns || [];

    // タブごとに別テーブル（BRC の Cell / Mouse / DNA など）
    const tabsWithApi = sectionConfig.tabs?.filter(
      (t) => t.dataApi && t.columns?.length,
    );
    if (tabsWithApi && tabsWithApi.length > 0) {
      const tabBar = document.createElement('div');
      tabBar.className = 'stats-tabs';
      const tabCache = {};
      const topPageApiDef = TOP_PAGE_API_MAP[sectionId];

      /** タイトル横の件数表示を更新（タブ行数合計）。トップAPIがあるセクションでは呼ばない（API失敗時は '-' のまま） */
      function updateTitleCountFromCache() {
        if (topPageApiDef || !titleCount) return;
        const total = Object.values(tabCache).reduce(
          (sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0),
          0,
        );
        if (Number.isFinite(total)) {
          setCountValue(titleCount, total);
        }
      }

      // タイトル横の合計をトップページのBioresourcesカードと同じAPI（NANDO_link_count3 等）で取得
      // API が失敗・停止している場合はタイトル横は '-' のまま（タブ合計では上書きしない）
      if (topPageApiDef && titleCount) {
        const apiUrl = topPageApiDef.api.startsWith('http')
          ? topPageApiDef.api
          : (typeof window !== 'undefined' && window.location?.origin
              ? window.location.origin
              : '') + topPageApiDef.api;
        fetchWithTimeout(apiUrl)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data && typeof topPageApiDef.extract === 'function') {
              const total = topPageApiDef.extract(data);
              if (Number.isFinite(total) && total >= 0) {
                setCountValue(titleCount, total);
              }
            }
          })
          .catch(() => {
            setCountUnavailable(titleCount);
          });
      }

      loadTabTable = async (tabIndex, options = {}) => {
        const { silent = false } = options;
        const tab = sectionConfig.tabs[tabIndex];
        if (!tab?.dataApi || !tab.columns) return [];
        if (tabCache[tabIndex]) {
          const cachedRows = tabCache[tabIndex];
          if (!silent) {
            renderTableFromRows(table, tab.columns, cachedRows, locale);
          }
          // タブ件数＝各タブの Cell ID / Mouse ID / DNA ID の件数（重複なし、先頭列のユニーク数）
          const uniqueCountCache = getTabCountValue(cachedRows, tab);
          const cachedCountEl = tabBar.querySelector(
            `.stats-tab[data-tab-index="${tabIndex}"] .data-num`,
          );
          if (cachedCountEl) {
            setCountValue(cachedCountEl, uniqueCountCache);
          }
          if (!silent) {
            updateTitleCountFromCache();
          }
          return cachedRows;
        }
        const colCount = tab.columns.length;
        if (!silent) {
          thead.style.display = 'none';
          tbody.innerHTML =
            '<tr><td colspan="' +
            colCount +
            '" class="stats-table-loading"><div class="stats-table-loading-spinner-wrap"><div class="loading-spinner -stats"></div></div></td></tr>';
        }
        try {
          const r = await fetchWithTimeout(tab.dataApi);
          if (!r.ok) throw new Error(r.statusText);
          const data = await r.json();
          const rows = data.rows || data.data || (Array.isArray(data) ? data : []);
          tabCache[tabIndex] = rows;
          if (!silent) {
            renderTableFromRows(table, tab.columns, rows, locale);
          }
          // タブ件数＝各タブの Cell ID / Mouse ID / DNA ID の件数（重複なし、先頭列のユニーク数）
          const uniqueCount = getTabCountValue(rows, tab);
          const countEl = tabBar.querySelector(
            `.stats-tab[data-tab-index="${tabIndex}"] .data-num`,
          );
          if (countEl) {
            setCountValue(countEl, uniqueCount);
          }
          updateTitleCountFromCache();
          return rows;
        } catch (e) {
          console.warn('Stats tab API エラー (' + tab.id + '):', e);
          const countEl = tabBar.querySelector(
            `.stats-tab[data-tab-index="${tabIndex}"] .data-num`,
          );
          setCountUnavailable(countEl);
          if (!topPageApiDef && Object.keys(tabCache).length === 0) {
            setCountUnavailable(titleCount);
          }
          if (!silent) {
            tbody.innerHTML =
              '<tr><td colspan="' +
              colCount +
              '" class="stats-table-error">' +
              (locale === 'ja'
                ? 'データの読み込みに失敗しました'
                : 'Failed to load data') +
              '</td></tr>';
            thead.style.display = '';
          }
          return [];
        }
      };
      /** NANDO URL または "NANDO:1100014" 形式から疾患IDを抽出（リンク用に NANDO_xxxxx に統一） */
      function getNandoIdForLink(val) {
        if (val == null || val === '') return val;
        const s = String(val).trim();
        const fromUrl = s.match(/\/?(NANDO_\d+)$/i);
        if (fromUrl) return fromUrl[1];
        const fromColon = s.match(/^NANDO:(\d+)$/i);
        if (fromColon) return 'NANDO_' + fromColon[1];
        return s;
      }
      function getDataKeysForLocale(col, loc) {
        if (!col) return [];
        const multi = col.dataKeysByLocale;
        if (multi && typeof multi === 'object') {
          const keys = multi[loc] || multi.en || multi.ja;
          return Array.isArray(keys) ? keys.filter(Boolean) : [];
        }
        const single = col.dataKeyByLocale;
        if (single && typeof single === 'object') {
          const k = single[loc] || single.en || single.ja || col.dataKey;
          return k ? [k] : [];
        }
        return col.dataKey ? [col.dataKey] : [];
      }

      function getPrimaryDataKeyForLocale(col, loc) {
        const keys = getDataKeysForLocale(col, loc);
        return keys.length > 0 ? keys[0] : null;
      }

      function getStatsSortState(table) {
        if (!table._statsSortState) {
          table._statsSortState = { key: null, order: 'asc' };
        }
        return table._statsSortState;
      }

      function sortStatsRows(rows, sortState, cols, loc) {
        const list = Array.isArray(rows) ? rows.slice() : [];
        if (!sortState || !sortState.key) return list;

        const col = cols.find((c) => {
          const key = getPrimaryDataKeyForLocale(c, loc);
          return key === sortState.key;
        });
        const isNumericColumn =
          col && col.sortType === 'number'
            ? true
            : col && col.sortType === 'string'
              ? false
              : undefined;

        const locale =
          loc === 'ja' ? 'ja-JP' : loc === 'en' ? 'en-US' : navigator.language;

        const toComparable = (val) => {
          if (val === undefined || val === null) return null;
          if (typeof val === 'number') return val;
          const s = String(val).trim();
          const num = Number(s.replace(/,/g, ''));
          if (!Number.isNaN(num) && s !== '') return num;
          return s;
        };

        list.sort((a, b) => {
          const va = toComparable(a[sortState.key]);
          const vb = toComparable(b[sortState.key]);
          if (va == null && vb == null) return 0;
          if (va == null) return 1;
          if (vb == null) return -1;

          const bothNumbers =
            isNumericColumn === true ||
            (typeof va === 'number' && typeof vb === 'number');
          let cmp;
          if (bothNumbers) {
            cmp = va === vb ? 0 : va < vb ? -1 : 1;
          } else {
            cmp = String(va).localeCompare(String(vb), locale, {
              numeric: true,
              sensitivity: 'base',
            });
          }
          return sortState.order === 'asc' ? cmp : -cmp;
        });
        return list;
      }

      function setupStatsTableSorting(table, cols, rows, loc) {
        table._statsRows = Array.isArray(rows) ? rows.slice() : [];
        table._statsCols = cols;
        table._statsLocale = loc;

        const sortState = getStatsSortState(table);
        const thead = table.querySelector('thead');
        if (!thead) return;

        const headers = thead.querySelectorAll('th.stats-sortable');
        headers.forEach((th) => {
          const key = th.dataset.sortKey;
          if (!key) return;

          th.onclick = function () {
            const state = getStatsSortState(table);
            if (state.key === key) {
              state.order = state.order === 'asc' ? 'desc' : 'asc';
            } else {
              state.key = key;
              state.order = 'asc';
            }
            table._statsSortState = state;
            const baseRows = table._statsRows || [];
            const colsDef = table._statsCols || cols;
            const locale = table._statsLocale || loc;
            const sorted = sortStatsRows(baseRows, state, colsDef, locale);
            // 再描画（ヘッダーも含めて更新）
            const tbodyEl = table.querySelector('tbody');
            if (!tbodyEl) return;
            renderTableFromRows(table, colsDef, sorted, locale);
          };

          th.onkeydown = function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              th.click();
            }
          };
        });

        // アイコンの状態を更新
        headers.forEach((th) => {
          const icon = th.querySelector('.sort-icon');
          if (!icon) return;
          icon.classList.remove('fa-sort', 'fa-sort-up', 'fa-sort-down');
          const key = th.dataset.sortKey;
          if (key && sortState.key === key) {
            icon.classList.add(
              sortState.order === 'asc' ? 'fa-sort-up' : 'fa-sort-down',
            );
          } else {
            icon.classList.add('fa-sort');
          }
        });
      }

      /** 説明文などに含まれるHTMLをサニタイズ（&lt;a&gt;のhref・target・relのみ許可） */
      function sanitizeHtmlForDisplay(html) {
        if (html == null || html === '') return '';
        // 改行は表示上の段落として扱いたいので <br> に寄せる
        const s = String(html).replace(/\r\n|\r|\n/g, '<br>');
        const div = document.createElement('div');
        div.innerHTML = s;
        const walk = (node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            return document.createTextNode(node.textContent);
          }
          if (node.nodeType !== Node.ELEMENT_NODE) return null;
          const tag = node.tagName.toLowerCase();
          if (tag === 'br') {
            return document.createElement('br');
          }
          if (tag === 'a') {
            const a = document.createElement('a');
            const href = node.getAttribute('href');
            if (href && /^https?:\/\//i.test(href)) a.href = href;
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
            for (let i = 0; i < node.childNodes.length; i++) {
              const c = walk(node.childNodes[i]);
              if (c) a.appendChild(c);
            }
            return a;
          }
          if (tag === 'p' || tag === 'div') {
            const block = document.createElement('div');
            for (let i = 0; i < node.childNodes.length; i++) {
              const c = walk(node.childNodes[i]);
              if (c) block.appendChild(c);
            }
            return block;
          }
          const span = document.createElement('span');
          for (let i = 0; i < node.childNodes.length; i++) {
            const c = walk(node.childNodes[i]);
            if (c) span.appendChild(c);
          }
          return span;
        };
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < div.childNodes.length; i++) {
          const n = walk(div.childNodes[i]);
          if (n) fragment.appendChild(n);
        }
        const out = document.createElement('div');
        out.appendChild(fragment);
        return out.innerHTML;
      }
      const renderTableFromRows = (tbl, cols, rows, loc) => {
        const tbodyEl = tbl.querySelector('tbody');
        const theadEl = tbl.querySelector('thead');
        if (theadEl) theadEl.style.display = '';
        const tr = tbl.querySelector('thead tr');
        if (tr && cols.length) {
          const newTr = document.createElement('tr');
          cols.forEach((col) => {
            const th = document.createElement('th');
            if (col.noWrap) {
              th.classList.add('stats-cell--nowrap');
            }
            const labelSpan = document.createElement('span');
            labelSpan.className = 'stats-th-label';
            labelSpan.appendChild(
              document.createTextNode(col.label[loc] || col.label.en || ''),
            );
            if (col.tooltip && (col.tooltip[loc] || col.tooltip.en)) {
              const w = document.createElement('span');
              w.className = 'stats-th-tooltip';
              w.setAttribute(
                'data-tooltip',
                col.tooltip[loc] || col.tooltip.en,
              );
              const i = document.createElement('i');
              i.className = 'fas fa-info-circle';
              w.appendChild(i);
              labelSpan.appendChild(document.createTextNode(' '));
              labelSpan.appendChild(w);
            }

            const sortKey = getPrimaryDataKeyForLocale(col, loc);
            const isSortable =
              col.sortable !== false && !!sortKey && !col.disableSort;
            if (isSortable) {
              th.classList.add('stats-sortable');
              th.dataset.sortKey = sortKey;
              th.setAttribute('role', 'button');
              th.setAttribute('tabindex', '0');
              const icon = document.createElement('i');
              icon.className = 'fas fa-sort sort-icon';
              labelSpan.appendChild(icon);
            }
            th.appendChild(labelSpan);
            newTr.appendChild(th);
          });
          tr.replaceWith(newTr);
        }
        if (!tbodyEl) return;
        tbodyEl.innerHTML = '';
        const sortState = getStatsSortState(tbl);
        const rowList = sortStatsRows(rows, sortState, cols, loc);
        if (rowList.length === 0) return;
        // rowspan: 同じ値が続く列はまとめるためのグループを計算
        const rowspanGroups = {};
        cols.forEach((col, colIdx) => {
          if (!col.rowspan) return;
          const groups = [];
          let i = 0;
          while (i < rowList.length) {
            const key = getPrimaryDataKeyForLocale(col, loc);
            const val = key ? rowList[i][key] : undefined;
            let span = 1;
            while (
              i + span < rowList.length &&
              (function () {
                const nextVal = key ? rowList[i + span][key] : undefined;
                return String(nextVal) === String(val);
              })()
            )
              span++;
            groups.push({ startRow: i, span });
            i += span;
          }
          rowspanGroups[colIdx] = groups;
        });

        rowList.forEach((row, rowIndex) => {
          const r = document.createElement('tr');
          cols.forEach((col, colIdx) => {
            const key = getPrimaryDataKeyForLocale(col, loc);
            const val = key ? row[key] : undefined;
            const displayVal =
              val === undefined || val === null
                ? '—'
                : typeof val === 'number'
                  ? val.toLocaleString()
                  : String(val);
            const displayVals = (function () {
              const keys = getDataKeysForLocale(col, loc);
              if (!keys || keys.length <= 1) return null;
              return keys
                .map((k) => (k ? row[k] : undefined))
                .filter((v) => v != null && v !== '');
            })();
            const linkTarget =
              col.link === 'nando'
                ? getNandoIdForLink(row.nando_id != null ? row.nando_id : val)
                : null;
            const hasNandoLink =
              col.link === 'nando' &&
              ((val != null && val !== '') || row.nando_id) &&
              linkTarget;
            if (col.rowspan && rowspanGroups[colIdx]) {
              const group = rowspanGroups[colIdx].find(
                (g) => g.startRow === rowIndex,
              );
              if (!group) return;
              const td = document.createElement('td');
              td.rowSpan = group.span;
              if (col.noWrap) {
                td.classList.add('stats-cell--nowrap');
              }
              if (hasNandoLink) {
                const a = document.createElement('a');
                a.href = '/disease/' + encodeURIComponent(linkTarget);
                a.textContent = displayVal;
                td.appendChild(a);
              } else if (col.link === 'external') {
                const hrefVal = col.linkHrefKey ? row[col.linkHrefKey] : val;
                if (hrefVal) {
                  const a = document.createElement('a');
                  a.href = String(hrefVal);
                  a.target = '_blank';
                  a.rel = 'noopener noreferrer';
                  a.textContent =
                    col.linkTextKey && row[col.linkTextKey] != null
                      ? String(row[col.linkTextKey])
                      : displayVal;
                  td.appendChild(a);
                } else {
                  td.textContent = displayVal;
                }
              } else if (col.html && val != null && val !== '') {
                td.classList.add('stats-cell--html');
                if (displayVals && displayVals.length > 0) {
                  td.innerHTML = displayVals
                    .map((v) => `<div>${sanitizeHtmlForDisplay(v)}</div>`)
                    .join('');
                } else {
                  td.innerHTML = sanitizeHtmlForDisplay(val);
                }
              } else {
                td.textContent = displayVal;
              }
              r.appendChild(td);
            } else {
              const td = document.createElement('td');
              if (col.noWrap) {
                td.classList.add('stats-cell--nowrap');
              }
              if (hasNandoLink) {
                const a = document.createElement('a');
                a.href = '/disease/' + encodeURIComponent(linkTarget);
                a.textContent = displayVal;
                td.appendChild(a);
              } else if (col.link === 'external') {
                const hrefVal = col.linkHrefKey ? row[col.linkHrefKey] : val;
                if (hrefVal) {
                  const a = document.createElement('a');
                  a.href = String(hrefVal);
                  a.target = '_blank';
                  a.rel = 'noopener noreferrer';
                  a.textContent =
                    col.linkTextKey && row[col.linkTextKey] != null
                      ? String(row[col.linkTextKey])
                      : displayVal;
                  td.appendChild(a);
                } else {
                  td.textContent = displayVal;
                }
              } else if (col.html && val != null && val !== '') {
                td.classList.add('stats-cell--html');
                if (displayVals && displayVals.length > 0) {
                  td.innerHTML = displayVals
                    .map((v) => `<div>${sanitizeHtmlForDisplay(v)}</div>`)
                    .join('');
                } else {
                  td.innerHTML = sanitizeHtmlForDisplay(val);
                }
              } else {
                td.textContent = displayVal;
              }
              r.appendChild(td);
            }
          });
          tbodyEl.appendChild(r);
        });

        setupStatsTableSorting(tbl, cols, rowList, loc);
      };
      sectionConfig.tabs.forEach((tab, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'stats-tab' + (idx === 0 ? ' active' : '');
        const labelSpan = document.createElement('span');
        labelSpan.className = 'stats-tab-label';
        labelSpan.textContent = tab.label[locale] || tab.label.en || tab.id;
        const tabTooltip = createStatsTooltipIcon(
          'stats-tab-tooltip',
          getLocalizedConfigText(tab.tooltip, locale),
        );
        const countSpan = document.createElement('span');
        countSpan.className = 'data-num';
        setCountLoading(countSpan);
        btn.appendChild(labelSpan);
        if (tabTooltip) {
          btn.appendChild(tabTooltip);
        }
        btn.appendChild(countSpan);
        btn.dataset.tabIndex = String(idx);
        btn.addEventListener('click', function () {
          tabBar
            .querySelectorAll('.stats-tab')
            .forEach((b) => b.classList.remove('active'));
          this.classList.add('active');
          if (downloadTabSelect) {
            downloadTabSelect.value = tab.id;
          }
          loadTabTable(Number(this.dataset.tabIndex));
        });
        tabBar.appendChild(btn);
      });
      section.insertBefore(tabBar, tableWrap);
      // ページ表示時に全タブを並列で読み込む（先頭タブは表示、他は silent でキャッシュ）
      loadTabTable(0);
      for (let i = 1; i < tabsWithApi.length; i++) {
        loadTabTable(i, { silent: true });
      }
    } else if (
      sectionConfig.rows?.length &&
      sectionConfig.columns?.some((c) => c.dataApi)
    ) {
      // カラムごと dataApi（行キーでマージ）
      columns.forEach((col) => {
        const th = document.createElement('th');
        th.appendChild(
          document.createTextNode(col.label[locale] || col.label.en || ''),
        );
        if (col.tooltip && (col.tooltip[locale] || col.tooltip.en)) {
          const w = document.createElement('span');
          w.className = 'stats-th-tooltip';
          w.setAttribute('data-tooltip', col.tooltip[locale] || col.tooltip.en);
          const i = document.createElement('i');
          i.className = 'fas fa-info-circle';
          w.appendChild(i);
          th.appendChild(document.createTextNode(' '));
          th.appendChild(w);
        }
        theadTr.appendChild(th);
      });
      const rowsFromColumnApis = await loadSectionTableFromColumnApis(
        table,
        tbody,
        sectionConfig,
        locale,
      );
      const total = getSectionTotalFromRows(
        rowsFromColumnApis,
        sectionConfig.columns || [],
      );
      if (Number.isFinite(total)) {
        setCountValue(titleCount, total);
      } else {
        setCountUnavailable(titleCount);
      }
    } else if (sectionConfig.dataApi && columns.length) {
      let tabBar = null;
      columns.forEach((col) => {
        const th = document.createElement('th');
        th.appendChild(
          document.createTextNode(col.label[locale] || col.label.en || ''),
        );
        if (col.tooltip && (col.tooltip[locale] || col.tooltip.en)) {
          const w = document.createElement('span');
          w.className = 'stats-th-tooltip';
          w.setAttribute('data-tooltip', col.tooltip[locale] || col.tooltip.en);
          const i = document.createElement('i');
          i.className = 'fas fa-info-circle';
          w.appendChild(i);
          th.appendChild(document.createTextNode(' '));
          th.appendChild(w);
        }
        theadTr.appendChild(th);
      });
      if (sectionConfig.hasTabs && sectionConfig.tabs?.length) {
        tabBar = document.createElement('div');
        tabBar.className = 'stats-tabs';
        sectionConfig.tabs.forEach((tab, idx) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'stats-tab' + (idx === 0 ? ' active' : '');
          const labelSpan = document.createElement('span');
          labelSpan.className = 'stats-tab-label';
          labelSpan.textContent = tab.label[locale] || tab.label.en || tab.id;
          btn.appendChild(labelSpan);
          const tabTooltip = createStatsTooltipIcon(
            'stats-tab-tooltip',
            getLocalizedConfigText(tab.tooltip, locale),
          );
          if (tabTooltip) {
            btn.appendChild(tabTooltip);
          }
          btn.dataset.tabId = tab.id;
          tabBar.appendChild(btn);
        });
        section.insertBefore(tabBar, tableWrap);
      }
      const rowsFromApi = await loadSectionTableFromApi(
        table,
        tbody,
        sectionConfig,
        locale,
      );
      loadedRowsFromApi = Array.isArray(rowsFromApi) ? rowsFromApi : [];
      const topPageApiDefSingle = TOP_PAGE_API_MAP[sectionId];
      if (topPageApiDefSingle && titleCount) {
        fetchWithTimeout(topPageApiDefSingle.api)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data && typeof topPageApiDefSingle.extract === 'function') {
              const total = topPageApiDefSingle.extract(data);
              if (Number.isFinite(total) && total >= 0) {
                setCountValue(titleCount, total);
              }
            }
          })
          .catch(() => {
            setCountUnavailable(titleCount);
          });
      }
      if (
        !topPageApiDefSingle &&
        Array.isArray(rowsFromApi) &&
        titleCount &&
        rowsFromApi.length > 0
      ) {
        let total = NaN;
        if (sectionId === 'nando-content') {
          // All 列の合計（指定＋小慢）
          total = rowsFromApi.reduce((sum, row) => {
            const raw = row.all;
            if (raw === undefined || raw === null) return sum;
            const v = Number(
              typeof raw === 'number'
                ? raw
                : String(raw).replace(/,/g, '').trim(),
            );
            return Number.isFinite(v) ? sum + v : sum;
          }, 0);
        } else if (sectionId === 'genes-content') {
          // 疾患関連遺伝子: 国内基準由来＋国際リソース由来の合計
          total = rowsFromApi.reduce((sum, row) => {
            const d = Number(
              typeof row.domestic === 'number'
                ? row.domestic
                : String(row.domestic || '')
                    .replace(/,/g, '')
                    .trim(),
            );
            const i = Number(
              typeof row.international === 'number'
                ? row.international
                : String(row.international || '')
                    .replace(/,/g, '')
                    .trim(),
            );
            const part =
              (Number.isFinite(d) ? d : 0) + (Number.isFinite(i) ? i : 0);
            return sum + part;
          }, 0);
        } else if (sectionId === 'links-content') {
          // 外部リンク: 全リンク列の合計
          total = rowsFromApi.reduce((sum, row) => {
            const keys = [
              'monarchExact',
              'monarchClose',
              'orphanet',
              'medgen',
              'kegg',
            ];
            const rowSum = keys.reduce((s, key) => {
              const raw = row[key];
              if (raw === undefined || raw === null) return s;
              const v = Number(
                typeof raw === 'number'
                  ? raw
                  : String(raw).replace(/,/g, '').trim(),
              );
              return Number.isFinite(v) ? s + v : s;
            }, 0);
            return sum + rowSum;
          }, 0);
        } else if (sectionId === 'variants-content') {
          // バリアント: ClinVar＋MGeND
          total = rowsFromApi.reduce((sum, row) => {
            const c = Number(
              typeof row.clinvar === 'number'
                ? row.clinvar
                : String(row.clinvar || '')
                    .replace(/,/g, '')
                    .trim(),
            );
            const m = Number(
              typeof row.mgend === 'number'
                ? row.mgend
                : String(row.mgend || '')
                    .replace(/,/g, '')
                    .trim(),
            );
            const part =
              (Number.isFinite(c) ? c : 0) + (Number.isFinite(m) ? m : 0);
            return sum + part;
          }, 0);
        } else {
          total = rowsFromApi.length;
        }

        if (Number.isFinite(total)) {
          setCountValue(titleCount, total);
        }
      }
      if (tabBar) {
        const rows = tbody.querySelectorAll('tr');
        sectionConfig.tabs.forEach((tab, idx) => {
          if (rows[idx]) {
            rows[idx].setAttribute('data-tab-id', tab.id);
            rows[idx].classList.add('stats-tab-row');
            rows[idx].style.display = idx === 0 ? '' : 'none';
          }
        });
        tabBar.querySelectorAll('.stats-tab').forEach((btn, idx) => {
          btn.addEventListener('click', function () {
            tabBar
              .querySelectorAll('.stats-tab')
              .forEach((b) => b.classList.remove('active'));
            this.classList.add('active');
            const tabId = this.dataset.tabId;
            if (downloadTabSelect) {
              downloadTabSelect.value = tabId;
            }
            tbody.querySelectorAll('.stats-tab-row').forEach((tr) => {
              tr.style.display = tr.dataset.tabId === tabId ? '' : 'none';
            });
          });
        });
      }
    } else {
      container.innerHTML =
        '<p>' +
        (locale === 'ja'
          ? 'このセクションの表示設定がありません。'
          : 'No display config for this section.') +
        '</p>';
      return;
    }

    container.innerHTML = '';
    container.appendChild(section);
  } catch (e) {
    console.warn('カード詳細テーブルの表示に失敗しました', e);
    container.innerHTML =
      '<p class="stats-table-error">' +
      (locale === 'ja'
        ? 'データの読み込みに失敗しました'
        : 'Failed to load data') +
      '</p>';
  }
}

function getStatsLocale() {
  const lang = document.documentElement.lang;
  return lang && lang.startsWith('ja') ? 'ja' : 'en';
}

// ----- 以下はトップのカードから飛んだときの個別テーブル用（別画面・別ルートで利用想定） -----
// loadSectionTableFromApi, loadSectionTableFromColumnApis 等は個別テーブル表示時に使用

/**
 * カラムごとの dataApi からデータを取得し、行ごとにマージして tbody を生成する。
 * 例: BRC の cells / mouse / dna でそれぞれ別API。
 * 各APIのレスポンス形式: { "shitei": value, "shoman": value } など行 id をキーとしたオブジェクト。
 */
async function loadSectionTableFromColumnApis(
  table,
  tbody,
  sectionConfig,
  locale,
) {
  const columns = sectionConfig.columns || [];
  const rows = sectionConfig.rows || [];
  const colCount = columns.length;
  const errorText =
    locale === 'ja' ? 'データの読み込みに失敗しました' : 'Failed to load data';
  const loadingSpinnerHtml = `<tr><td colspan="${colCount}" class="stats-table-loading"><div class="stats-table-loading-spinner-wrap"><div class="loading-spinner -stats"></div></div></td></tr>`;

  // 読み込み中はヘッダーを非表示
  const thead = table.querySelector('thead');
  if (thead) thead.style.display = 'none';
  tbody.innerHTML = loadingSpinnerHtml;

  try {
    const columnData = {};
    for (const col of columns) {
      if (!col.dataApi) continue;
      const res = await fetchWithTimeout(col.dataApi);
      if (!res.ok) throw new Error(`${col.dataKey}: ${res.statusText}`);
      const data = await res.json();
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        if (data.rows && Array.isArray(data.rows)) {
          const byId = {};
          data.rows.forEach((r) => {
            const id = r.tabId ?? r.id ?? r.category;
            if (id != null) byId[id] = r.value ?? r.count ?? r;
          });
          columnData[col.dataKey] = byId;
        } else if (col.valuePathByRow && typeof col.valuePathByRow === 'object') {
          const byId = {};
          Object.entries(col.valuePathByRow).forEach(([rowId, path]) => {
            byId[rowId] = getValueByPath(data, path);
          });
          columnData[col.dataKey] = byId;
        } else {
          columnData[col.dataKey] = data;
        }
      } else {
        columnData[col.dataKey] = {};
      }
    }

    const renderedRows = [];
    tbody.innerHTML = '';
    rows.forEach((rowDef) => {
      const tr = document.createElement('tr');
      const rowId = rowDef.id;
      const renderedRow = {};
      columns.forEach((col) => {
        const td = document.createElement('td');
        let val;
        if (col.dataKey === 'category') {
          val = rowDef.label?.[locale] ?? rowDef.label?.en ?? rowId;
        } else if (col.dataApi && columnData[col.dataKey]) {
          val = columnData[col.dataKey][rowId];
        } else {
          val = undefined;
        }
        if (val === undefined || val === null) {
          td.textContent = '—';
        } else if (typeof val === 'number') {
          td.textContent = val.toLocaleString();
        } else {
          td.textContent = String(val);
        }
        renderedRow[col.dataKey] = val;
        tr.appendChild(td);
      });
      renderedRows.push(renderedRow);
      tbody.appendChild(tr);
    });
    if (thead) thead.style.display = '';
    return renderedRows;
  } catch (e) {
    console.warn(`Stats column API エラー (${sectionConfig.id}):`, e);
    tbody.innerHTML = `<tr><td colspan="${colCount}" class="stats-table-error">${errorText}</td></tr>`;
    if (thead) thead.style.display = '';
    return [];
  }
}

/**
 * セクションの dataApi からデータを取得し、tbody を生成して表示する。
 * API レスポンス形式: { "rows": [ { "dataKey1": value1, "dataKey2": value2, ... }, ... ] }
 * 各オブジェクトのキーは config の columns[].dataKey に対応すること。
 */
async function loadSectionTableFromApi(table, tbody, sectionConfig, locale) {
  const colCount = sectionConfig.columns ? sectionConfig.columns.length : 0;
  const errorText =
    locale === 'ja' ? 'データの読み込みに失敗しました' : 'Failed to load data';
  const loadingSpinnerHtml = `<tr><td colspan="${colCount}" class="stats-table-loading"><div class="stats-table-loading-spinner-wrap"><div class="loading-spinner -stats"></div></div></td></tr>`;

  // 読み込み中はヘッダーを非表示
  const thead = table.querySelector('thead');
  if (thead) thead.style.display = 'none';
  tbody.innerHTML = loadingSpinnerHtml;

  try {
    const res = await fetchWithTimeout(sectionConfig.dataApi);
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    const rows = data.rows || data.data || (Array.isArray(data) ? data : []);

    if (!Array.isArray(rows) || rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${colCount}">—</td></tr>`;
      if (thead) thead.style.display = '';
      return rows;
    }

    tbody.innerHTML = '';
    const columns = sectionConfig.columns || [];

    rows.forEach((row, rowIndex) => {
      const tr = document.createElement('tr');
      if (
        sectionConfig.hasTabs &&
        sectionConfig.tabs &&
        sectionConfig.tabs[rowIndex]
      ) {
        tr.setAttribute('data-tab-id', sectionConfig.tabs[rowIndex].id);
        tr.classList.add('stats-tab-row');
        tr.style.display = rowIndex === 0 ? '' : 'none';
      }
      columns.forEach((col) => {
        const td = document.createElement('td');
        const dataKey = getConfigDataKeyForLocale(col, locale);
        const val = dataKey ? row[dataKey] : undefined;
        if (col.noWrap) {
          td.classList.add('stats-cell--nowrap');
        }
        if (val === undefined || val === null) {
          td.textContent = '—';
        } else if (typeof val === 'number') {
          td.textContent = val.toLocaleString();
        } else {
          td.textContent = String(val);
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    if (thead) thead.style.display = '';
    return rows;
  } catch (e) {
    console.warn(`Stats API エラー (${sectionConfig.id}):`, e);
    tbody.innerHTML = `<tr><td colspan="${colCount}" class="stats-table-error">${errorText}</td></tr>`;
    if (thead) thead.style.display = '';
    return [];
  }
}

async function loadStatsData() {
  try {
    // 各セクションのローディング表示を開始
    const sections = [
      'nando',
      'disease-overview',
      'links',
      'related-data',
      'genes',
      'bioresources',
      'variants',
    ];
    sections.forEach((sectionId) => {
      showSectionLoading(sectionId);
    });

    // データを保持するオブジェクト
    const apiData = {
      nandoData: null,
      brcData: null,
      linkData: null,
      linkData2: null,
      linkData4: null,
      linkData5: null,
    };

    // NANDO_count APIを取得して即座にNANDOテーブルを更新
    fetchNANDOData()
      .then((data) => {
        apiData.nandoData = data;
        const statsData = {
          diseaseStats: {
            shitei: {
              all: safeParseInt(data.shitei_all?.['callret-0']),
              nanbyo_group: safeParseInt(data.shitei_group?.['callret-0']),
              nanbyo_disease: safeParseInt(data.shitei_disease?.['callret-0']),
              nanbyo_subtype: (function () {
                const all = safeParseInt(data.shitei_all?.['callret-0']);
                const group = safeParseInt(data.shitei_group?.['callret-0']);
                const disease = safeParseInt(
                  data.shitei_disease?.['callret-0'],
                );
                if (all === '-' || group === '-' || disease === '-') return '-';
                return all - group - disease;
              })(),
            },
            shoman: {
              all: safeParseInt(data.shoman_all?.['callret-0']),
              nanbyo_group: safeParseInt(data.shoman_group?.['callret-0']),
              nanbyo_disease: safeParseInt(data.shoman_disease?.['callret-0']),
              nanbyo_subtype: (function () {
                const all = safeParseInt(data.shoman_all?.['callret-0']);
                const group = safeParseInt(data.shoman_group?.['callret-0']);
                const disease = safeParseInt(
                  data.shoman_disease?.['callret-0'],
                );
                if (all === '-' || group === '-' || disease === '-') return '-';
                return all - group - disease;
              })(),
            },
          },
        };
        updateDiseaseStats(statsData.diseaseStats);
        showSectionContent('nando');
      })
      .catch((error) => {
        console.warn('NANDO_count API エラー:', error);
        hideSection('nando');
      });

    // BRC APIを取得して即座にバイオリソーステーブルを更新
    fetchBRCData()
      .then((data) => {
        apiData.brcData = data;
        const statsData = {
          bioresources: {
            shitei: {
              cells: safeParseInt(data.shitei_cell?.cell),
              mouse: safeParseInt(data.shitei_mouse?.mouse),
              dna: safeParseInt(data.shitei_DNA?.gene),
            },
            shoman: {
              cells: safeParseInt(data.shoman_cell?.cell),
              mouse: safeParseInt(data.shoman_mouse?.mouse),
              dna: safeParseInt(data.shoman_DNA?.gene),
            },
          },
        };
        updateBioresources(statsData.bioresources);
        showSectionContent('bioresources');
      })
      .catch((error) => {
        console.warn('BRC API エラー:', error);
        hideSection('bioresources');
      });

    // Link APIを取得して即座にリンクテーブルを更新
    fetchLinkData()
      .then((data) => {
        apiData.linkData = data;
        const statsData = {
          links: {
            shitei: {
              monarchExact: safeParseInt(data.name2?.mondo),
              monarchClose: safeParseInt(data.name4?.mondo),
              orphanet: safeParseInt(data.name12?.mondo),
              medgen: safeParseInt(data.name10?.medgen),
              kegg: safeParseInt(data.name5?.kegg),
            },
            shoman: {
              monarchExact: safeParseInt(data.name1?.mondo),
              monarchClose: safeParseInt(data.name3?.mondo),
              orphanet: safeParseInt(data.name11?.mondo),
              medgen: safeParseInt(data.name9?.medgen),
              kegg: safeParseInt(data.name6?.kegg),
            },
          },
        };
        updateLinks(statsData.links);
        showSectionContent('links');
      })
      .catch((error) => {
        console.warn('Link API エラー:', error);
        const dummyLinks = {
          shitei: {
            monarchExact: '-',
            monarchClose: '-',
            orphanet: '-',
            medgen: '-',
            kegg: '-',
          },
          shoman: {
            monarchExact: '-',
            monarchClose: '-',
            orphanet: '-',
            medgen: '-',
            kegg: '-',
          },
        };
        updateLinks(dummyLinks);
        showSectionContent('links');
      });

    Promise.allSettled([
      fetchLinkData2(),
      fetchLinkData4(),
      fetchLinkData5(),
      fetchGlycoGeneData(),
    ]).then((results) => {
      const linkData2 =
        results[0].status === 'fulfilled'
          ? results[0].value
          : getDefaultLinkData2();
      const linkData4 =
        results[1].status === 'fulfilled'
          ? results[1].value
          : getDefaultLinkData4();
      const linkData5 =
        results[2].status === 'fulfilled'
          ? results[2].value
          : getDefaultLinkData5();
      const glycoGeneData =
        results[3].status === 'fulfilled'
          ? results[3].value
          : getDefaultGlycoGeneData();
      apiData.linkData2 = linkData2;
      apiData.linkData4 = linkData4;
      apiData.linkData5 = linkData5;
      apiData.glycoGeneData = glycoGeneData;

      results.forEach((result, index) => {
        const apiNames = ['Link2', 'Link4', 'Link5', 'GlycoGene'];

        if (result.status === 'rejected') {
          console.warn(`${apiNames[index]} API エラー:`, result.reason);

          if (index === 0) {
            hideSection('disease-overview');
            hideSection('related-data');
            hideSection('genes');
          }
          if (index === 1) {
            hideSection('related-data');
            hideSection('genes');
          }
          if (index === 2) {
            hideSection('related-data');
          }
          if (index === 3) {
            // GlycoGene API エラーは related-data に影響するが、他のデータは表示可能
          }
        }
      });

      if (results[0].status === 'fulfilled') {
        const diseaseOverview = {
          shitei: {
            definition: safeParseInt(linkData2.shitei_description?.desc),
            inheritance: safeParseInt(
              linkData2.shitei_inheritance?.inheritance,
            ),
            alternativeNames: safeParseInt(linkData2.shitei_altlabel?.alt),
          },
          shoman: {
            definition: safeParseInt(linkData2.shoman_description?.desc),
            inheritance: safeParseInt(
              linkData2.shoman_inheritance?.inheritance,
            ),
            alternativeNames: safeParseInt(linkData2.shoman_altlabel?.alt),
          },
        };
        updateDiseaseOverview(diseaseOverview);
        showSectionContent('disease-overview');
      }

      if (
        results[0].status === 'fulfilled' &&
        results[1].status === 'fulfilled' &&
        results[2].status === 'fulfilled'
      ) {
        const relatedData = {
          shitei: {
            glycanGenes: safeParseInt(glycoGeneData.glyco_gene_shitei?.num),
            geneticTestings: safeParseInt(linkData2.shitei_genetest?.genetest),
            clinicalFeatures: safeParseInt(linkData2.shitei_hp?.hp),
            facialFeatures: safeParseInt(linkData4.shitei_gm?.GM),
            humanData: safeParseInt(linkData4.shitei_hum?.hum),
            chemicals: safeParseInt(linkData5.shitei_pubchem?.pubchem),
          },
          shoman: {
            glycanGenes: safeParseInt(glycoGeneData.glyco_gene_shoman?.num),
            geneticTestings: safeParseInt(linkData2.shoman_genetest?.genetest),
            clinicalFeatures: safeParseInt(linkData2.shoman_hp?.hp),
            facialFeatures: safeParseInt(linkData4.shoman_gm?.GM),
            humanData: safeParseInt(linkData4.shoman_hum?.hum),
            chemicals: safeParseInt(linkData5.shoman_pubchem?.pubchem),
          },
        };
        updateRelatedData(relatedData);
        showSectionContent('related-data');
      }

      if (
        results[0].status === 'fulfilled' &&
        results[1].status === 'fulfilled'
      ) {
        const genes = {
          shitei: {
            domestic: safeParseInt(linkData4.shitei_CG?.curatedGene),
            international: safeParseInt(linkData2.shitei_gene?.gene),
          },
          shoman: {
            domestic: safeParseInt(linkData4.shoman_CG?.curatedGene),
            international: safeParseInt(linkData2.shoman_gene?.gene),
          },
        };
        updateGenes(genes);
        showSectionContent('genes');
      }
    });

    fetchLinkData7()
      .then((data) => {
        apiData.linkData7 = data;
        if (apiData.linkData2) {
          const variants = {
            shitei: {
              clinvar: safeParseInt(data.shitei_clinvar?.num),
              mgend: safeParseInt(apiData.linkData2.shitei_mgened?.mgend),
            },
            shoman: {
              clinvar: safeParseInt(data.shoman_clinvar?.num),
              mgend: safeParseInt(apiData.linkData2.shoman_mgend?.mgend),
            },
          };
          updateVariants(variants);
          showSectionContent('variants');
        }
      })
      .catch((error) => {
        console.warn('Link7 API エラー:', error);
        hideSection('variants');
      });
  } catch (error) {
    console.error('統計データの読み込みに失敗しました:', error);
    console.error('エラーの詳細:', error.message);
    console.error('エラースタック:', error.stack);
    const sections = [
      'nando',
      'disease-overview',
      'links',
      'related-data',
      'genes',
      'bioresources',
      'variants',
    ];
    sections.forEach((sectionId) => {
      hideSection(sectionId);
    });
  }
}

// APIデータを統計データ形式に変換する関数
function transformApiDataToStatsData(
  nandoData,
  brcData,
  linkData,
  linkData2,
  linkData4,
  linkData5,
) {
  try {
    return {
      // 難病統計
      diseaseStats: {
        shitei: {
          all: safeParseInt(nandoData.shitei_all?.['callret-0']),
          nanbyo_group: safeParseInt(nandoData.shitei_group?.['callret-0']),
          nanbyo_disease: safeParseInt(nandoData.shitei_disease?.['callret-0']),
          nanbyo_subtype: (function () {
            const all = safeParseInt(nandoData.shitei_all?.['callret-0']);
            const group = safeParseInt(nandoData.shitei_group?.['callret-0']);
            const disease = safeParseInt(
              nandoData.shitei_disease?.['callret-0'],
            );
            if (all === '-' || group === '-' || disease === '-') return '-';
            return all - group - disease;
          })(),
        },
        shoman: {
          all: safeParseInt(nandoData.shoman_all?.['callret-0']),
          nanbyo_group: safeParseInt(nandoData.shoman_group?.['callret-0']),
          nanbyo_disease: safeParseInt(nandoData.shoman_disease?.['callret-0']),
          nanbyo_subtype: (function () {
            const all = safeParseInt(nandoData.shoman_all?.['callret-0']);
            const group = safeParseInt(nandoData.shoman_group?.['callret-0']);
            const disease = safeParseInt(
              nandoData.shoman_disease?.['callret-0'],
            );
            if (all === '-' || group === '-' || disease === '-') return '-';
            return all - group - disease;
          })(),
        },
      },
      // 疾患概要
      diseaseOverview: {
        shitei: {
          definition: safeParseInt(linkData2.shitei_description?.desc),
          inheritance: safeParseInt(linkData2.shitei_inheritance?.inheritance),
          alternativeNames: safeParseInt(linkData2.shitei_altlabel?.alt),
        },
        shoman: {
          definition: safeParseInt(linkData2.shoman_description?.desc),
          inheritance: safeParseInt(linkData2.shoman_inheritance?.inheritance),
          alternativeNames: safeParseInt(linkData2.shoman_altlabel?.alt),
        },
      },
      // リンク
      links: {
        shitei: {
          monarchExact: safeParseInt(linkData.name2?.mondo),
          monarchClose: safeParseInt(linkData.name4?.mondo),
          orphanet: safeParseInt(linkData.name12?.mondo),
          medgen: safeParseInt(linkData.name10?.medgen),
          kegg: safeParseInt(linkData.name5?.kegg),
        },
        shoman: {
          monarchExact: safeParseInt(linkData.name1?.mondo),
          monarchClose: safeParseInt(linkData.name3?.mondo),
          orphanet: safeParseInt(linkData.name11?.mondo),
          medgen: safeParseInt(linkData.name9?.medgen),
          kegg: safeParseInt(linkData.name6?.kegg),
        },
      },
      // 疾患関連データ
      relatedData: {
        shitei: {
          glycanGenes: '-', // transformApiDataToStatsDataでは使用しない（loadStatsDataで個別に取得）
          geneticTestings: safeParseInt(linkData2.shitei_genetest?.genetest),
          clinicalFeatures: safeParseInt(linkData2.shitei_hp?.hp),
          facialFeatures: safeParseInt(linkData4.shitei_gm?.GM),
          humanData: safeParseInt(linkData4.shitei_hum?.hum),
          chemicals: safeParseInt(linkData5.shitei_pubchem?.pubchem),
        },
        shoman: {
          glycanGenes: '-', // transformApiDataToStatsDataでは使用しない（loadStatsDataで個別に取得）
          geneticTestings: safeParseInt(linkData2.shoman_genetest?.genetest),
          clinicalFeatures: safeParseInt(linkData2.shoman_hp?.hp),
          facialFeatures: safeParseInt(linkData4.shoman_gm?.GM),
          humanData: safeParseInt(linkData4.shoman_hum?.hum),
          chemicals: safeParseInt(linkData5.shoman_pubchem?.pubchem),
        },
      },
      // 疾患関連遺伝子
      genes: {
        shitei: {
          domestic: safeParseInt(linkData4.shitei_CG?.curatedGene),
          international: safeParseInt(linkData2.shitei_gene?.gene),
        },
        shoman: {
          domestic: safeParseInt(linkData4.shoman_CG?.curatedGene),
          international: safeParseInt(linkData2.shoman_gene?.gene),
        },
      },

      // バイオリソース
      bioresources: {
        shitei: {
          cells: safeParseInt(brcData.shitei_cell?.cell),
          mouse: safeParseInt(brcData.shitei_mouse?.mouse),
          dna: safeParseInt(brcData.shitei_DNA?.gene),
        },
        shoman: {
          cells: safeParseInt(brcData.shoman_cell?.cell),
          mouse: safeParseInt(brcData.shoman_mouse?.mouse),
          dna: safeParseInt(brcData.shoman_DNA?.gene),
        },
      },
      // 顔貌特徴と外部リンクの合計
      facial_features:
        safeParseInt(linkData4.shitei_gm?.GM) +
        safeParseInt(linkData4.shoman_gm?.GM),
      external_links:
        safeParseInt(linkData.name8?.mondo) +
        safeParseInt(linkData.name10?.medgen) +
        safeParseInt(linkData.name5?.kegg) +
        safeParseInt(linkData.name7?.mondo) +
        safeParseInt(linkData.name9?.medgen) +
        safeParseInt(linkData.name6?.kegg),
    };
  } catch (error) {
    console.error('データ変換中にエラーが発生しました:', error);
    throw error;
  }
}

// 全テーブルを更新する関数
function updateAllTables(statsData) {
  updateDiseaseStats(statsData.diseaseStats);
  updateDiseaseOverview(statsData.diseaseOverview);
  updateLinks(statsData.links);
  updateRelatedData(statsData.relatedData);
  updateGenes(statsData.genes);
  updateBioresources(statsData.bioresources);
}

// NANDO_count APIからデータを取得する関数
async function fetchNANDOData() {
  try {
    const response = await fetch('/sparqlist/api/NANDO_count');

    if (!response.ok) {
      throw new Error(
        `NANDO_count API request failed: ${response.status} ${response.statusText}`,
      );
    }

    const contentType = response.headers.get('content-type');

    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Expected JSON but got:', contentType);
      console.error('Response text:', text.substring(0, 200) + '...');
      throw new Error(`Expected JSON response but got ${contentType}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('NANDO_count API エラー:', error);
    throw error;
  }
}

// BRC APIからデータを取得する関数
async function fetchBRCData() {
  try {
    const response = await fetch('/sparqlist/api/NANDO_link_count3');

    if (!response.ok) {
      throw new Error(
        `BRC API request failed: ${response.status} ${response.statusText}`,
      );
    }

    const contentType = response.headers.get('content-type');

    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Expected JSON but got:', contentType);
      console.error('Response text:', text.substring(0, 200) + '...');
      throw new Error(`Expected JSON response but got ${contentType}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('BRC API エラー:', error);
    throw error;
  }
}

// NANDO_link_count APIからデータを取得する関数
async function fetchLinkData() {
  try {
    const response = await fetch('/sparqlist/api/NANDO_link_count');

    if (!response.ok) {
      throw new Error(
        `Link API request failed: ${response.status} ${response.statusText}`,
      );
    }

    const contentType = response.headers.get('content-type');

    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Expected JSON but got:', contentType);
      console.error('Response text:', text.substring(0, 200) + '...');
      throw new Error(`Expected JSON response but got ${contentType}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Link API エラー:', error);
    throw error;
  }
}

// NANDO_link_count2 APIからデータを取得する関数
async function fetchLinkData2() {
  try {
    const response = await fetch('/sparqlist/api/NANDO_link_count2');

    if (!response.ok) {
      throw new Error(
        `Link2 API request failed: ${response.status} ${response.statusText}`,
      );
    }

    const contentType = response.headers.get('content-type');

    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Expected JSON but got:', contentType);
      console.error('Response text:', text.substring(0, 200) + '...');
      throw new Error(`Expected JSON response but got ${contentType}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Link2 API エラー:', error);
    throw error;
  }
}

// NANDO_link_count4 APIからデータを取得する関数
async function fetchLinkData4() {
  try {
    const response = await fetch('/sparqlist/api/NANDO_link_count4');

    if (!response.ok) {
      throw new Error(
        `Link4 API request failed: ${response.status} ${response.statusText}`,
      );
    }

    const contentType = response.headers.get('content-type');

    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Expected JSON but got:', contentType);
      console.error('Response text:', text.substring(0, 200) + '...');
      throw new Error(`Expected JSON response but got ${contentType}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Link4 API エラー:', error);
    throw error;
  }
}

// NANDO_link_count5 APIからデータを取得する関数
async function fetchLinkData5() {
  try {
    const response = await fetch('/sparqlist/api/NANDO_link_count5');

    if (!response.ok) {
      throw new Error(
        `Link5 API request failed: ${response.status} ${response.statusText}`,
      );
    }

    const contentType = response.headers.get('content-type');

    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Expected JSON but got:', contentType);
      console.error('Response text:', text.substring(0, 200) + '...');
      throw new Error(`Expected JSON response but got ${contentType}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Link5 API エラー:', error);
    throw error;
  }
}

// NANDO_link_count7 APIからデータを取得する関数（ClinVar）
async function fetchLinkData7() {
  try {
    const response = await fetch('/sparqlist/api/NANDO_link_count7');

    if (!response.ok) {
      throw new Error(
        `Link7 API request failed: ${response.status} ${response.statusText}`,
      );
    }

    const contentType = response.headers.get('content-type');

    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Expected JSON but got:', contentType);
      console.error('Response text:', text.substring(0, 200) + '...');
      throw new Error(`Expected JSON response but got ${contentType}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Link7 API エラー:', error);
    throw error;
  }
}

// NANDO_link_count8 APIから糖鎖関連遺伝子データを取得する関数
async function fetchGlycoGeneData() {
  try {
    const response = await fetch('/sparqlist/api/NANDO_link_count8');

    if (!response.ok) {
      throw new Error(
        `GlycoGene API request failed: ${response.status} ${response.statusText}`,
      );
    }

    const contentType = response.headers.get('content-type');

    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Expected JSON but got:', contentType);
      console.error('Response text:', text.substring(0, 200) + '...');
      throw new Error(`Expected JSON response but got ${contentType}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('GlycoGene API エラー:', error);
    throw error;
  }
}

// 各セクションのローディング状態を表示する関数
function showSectionLoading(sectionId) {
  const loadingDiv = document.getElementById(`${sectionId}-loading`);
  const errorDiv = document.getElementById(`${sectionId}-error`);
  const contentDiv = document.getElementById(`${sectionId}-content`);

  if (loadingDiv) loadingDiv.style.display = 'block';
  if (errorDiv) errorDiv.style.display = 'none';
  if (contentDiv) contentDiv.style.display = 'none';
}

// 各セクションのコンテンツを表示する関数
function showSectionContent(sectionId) {
  const loadingDiv = document.getElementById(`${sectionId}-loading`);
  const errorDiv = document.getElementById(`${sectionId}-error`);
  const contentDiv = document.getElementById(`${sectionId}-content`);

  if (loadingDiv) loadingDiv.style.display = 'none';
  if (errorDiv) errorDiv.style.display = 'none';
  if (contentDiv) contentDiv.style.display = 'block';
}

// 各セクションのローディングを非表示にする関数
function hideSectionLoading(sectionId) {
  const loadingDiv = document.getElementById(`${sectionId}-loading`);
  const errorDiv = document.getElementById(`${sectionId}-error`);
  const contentDiv = document.getElementById(`${sectionId}-content`);

  if (loadingDiv) loadingDiv.style.display = 'none';
  if (errorDiv) errorDiv.style.display = 'none';
  if (contentDiv) contentDiv.style.display = 'none';
}

// 各セクションのエラー状態を表示する関数
function showSectionError(sectionId) {
  const loadingDiv = document.getElementById(`${sectionId}-loading`);
  const errorDiv = document.getElementById(`${sectionId}-error`);
  const contentDiv = document.getElementById(`${sectionId}-content`);

  if (loadingDiv) loadingDiv.style.display = 'none';
  if (errorDiv) errorDiv.style.display = 'block';
  if (contentDiv) contentDiv.style.display = 'none';
}

// セクションを非表示にする関数
function hideSection(sectionId) {
  const section = document
    .querySelector(`#${sectionId}-content`)
    .closest('.stats-section');
  if (section) {
    section.style.display = 'none';
  }
}

// エラーメッセージを表示する関数（既存のテーブルセル用）
function showErrorMessage() {
  // 言語を取得
  const locale = document.querySelector('.language-select')?.value || 'en';
  const errorMessage =
    locale === 'ja' ? 'データの読み込みに失敗しました' : 'Failed to load data';

  // 全てのテーブルセルにエラーメッセージを表示
  const allCells = document.querySelectorAll(
    '[id$="-all"], [id$="-nanbyo-group"], [id$="-nanbyo-disease"], [id$="-nanbyo-subtype"], [id$="-definition"], [id$="-inheritance"], [id$="-alternative-names"], [id$="-monarch-exact"], [id$="-monarch-close"], [id$="-orphanet"], [id$="-medgen"], [id$="-kegg"], [id$="-genes"], [id$="-genetic-testings"], [id$="-clinical-features"], [id$="-facial-features"], [id$="-human-data"], [id$="-chemicals"], [id$="-domestic-genes"], [id$="-international-genes"], [id$="-clinvar"], [id$="-mgend"], [id$="-cells"], [id$="-mouse"], [id$="-dna"]',
  );

  allCells.forEach((cell) => {
    cell.textContent = errorMessage;
    cell.style.color = '#dc3545'; // 赤色で表示
  });
}

function updateDiseaseStats(diseaseStats) {
  // 難病統計テーブル
  updateDiseaseStatsRow('shitei', diseaseStats.shitei);
  updateDiseaseStatsRow('shoman', diseaseStats.shoman);
}

function updateDiseaseStatsRow(category, data) {
  try {
    const fieldMapping = {
      all: 'all',
      'nanbyo-group': 'nanbyo_group',
      'nanbyo-disease': 'nanbyo_disease',
      'nanbyo-subtype': 'nanbyo_subtype',
    };

    Object.entries(fieldMapping).forEach(([field, dataKey]) => {
      const element = document.getElementById(`${category}-${field}`);
      if (!element) {
        console.error(`Element not found: ${category}-${field}`);
        return;
      }

      const value = data[dataKey];
      if (value === undefined) {
        console.error(`Data property not found: ${dataKey} in`, data);
        element.textContent = '-';
        return;
      }

      element.textContent = value === '-' ? '-' : value.toLocaleString();
    });
  } catch (error) {
    console.error(`Error updating disease stats for ${category}:`, error);
  }
}

function updateDiseaseOverview(diseaseOverview) {
  // 疾患概要テーブル
  updateDiseaseOverviewData(diseaseOverview);
}

function updateDiseaseOverviewData(diseaseOverview) {
  if (!diseaseOverview || !diseaseOverview.shitei || !diseaseOverview.shoman) {
    diseaseOverview = {
      shitei: { definition: '-', inheritance: '-', alternativeNames: '-' },
      shoman: { definition: '-', inheritance: '-', alternativeNames: '-' },
    };
  }
  setStatsCell('shitei-definition', diseaseOverview.shitei.definition);
  setStatsCell('shitei-inheritance', diseaseOverview.shitei.inheritance);
  setStatsCell(
    'shitei-alternative-names',
    diseaseOverview.shitei.alternativeNames,
  );
  setStatsCell('shoman-definition', diseaseOverview.shoman.definition);
  setStatsCell('shoman-inheritance', diseaseOverview.shoman.inheritance);
  setStatsCell(
    'shoman-alternative-names',
    diseaseOverview.shoman.alternativeNames,
  );
}

function updateLinks(links) {
  // リンクテーブル
  updateLinksData(links);
}

/** 要素が存在するときだけ textContent を設定（dataApi で tbody 差し替え時は null になるため） */
function setStatsCell(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  const text =
    value === '-' || value === undefined || value === null
      ? '—'
      : typeof value === 'number'
        ? value.toLocaleString()
        : String(value);
  el.textContent = text;
}

function updateLinksData(links) {
  if (!links || !links.shitei || !links.shoman) {
    links = {
      shitei: {
        monarchExact: '-',
        monarchClose: '-',
        orphanet: '-',
        medgen: '-',
        kegg: '-',
      },
      shoman: {
        monarchExact: '-',
        monarchClose: '-',
        orphanet: '-',
        medgen: '-',
        kegg: '-',
      },
    };
  }
  setStatsCell('shitei-monarch-exact', links.shitei.monarchExact);
  setStatsCell('shitei-monarch-close', links.shitei.monarchClose);
  setStatsCell('shitei-orphanet', links.shitei.orphanet);
  setStatsCell('shitei-medgen', links.shitei.medgen);
  setStatsCell('shitei-kegg', links.shitei.kegg);
  setStatsCell('shoman-monarch-exact', links.shoman.monarchExact);
  setStatsCell('shoman-monarch-close', links.shoman.monarchClose);
  setStatsCell('shoman-orphanet', links.shoman.orphanet);
  setStatsCell('shoman-medgen', links.shoman.medgen);
  setStatsCell('shoman-kegg', links.shoman.kegg);
}

function updateRelatedData(relatedData) {
  // 疾患関連データテーブル
  updateRelatedDataRow('shitei', relatedData.shitei);
  updateRelatedDataRow('shoman', relatedData.shoman);
}

function updateRelatedDataRow(category, data) {
  try {
    const fields = [
      'glycanGenes',
      'geneticTestings',
      'clinicalFeatures',
      'facialFeatures',
      'humanData',
      'chemicals',
    ];

    fields.forEach((field) => {
      const elementId = `${category}-${field
        .replace(/([A-Z])/g, '-$1')
        .toLowerCase()}`;
      const element = document.getElementById(elementId);

      if (!element) {
        console.error(`Element not found: ${elementId}`);
        return;
      }

      const value = data[field];
      if (value === undefined) {
        console.error(`Data property not found: ${field} in`, data);
        element.textContent = '-';
        return;
      }

      element.textContent = value === '-' ? '-' : value.toLocaleString();
    });
  } catch (error) {
    console.error(`Error updating related data for ${category}:`, error);
  }
}

function updateGenes(genes) {
  // 疾患関連遺伝子テーブル
  updateGenesRow('shitei', genes.shitei);
  updateGenesRow('shoman', genes.shoman);
}

function updateGenesRow(category, data) {
  try {
    const domesticElement = document.getElementById(
      `${category}-domestic-genes`,
    );
    const internationalElement = document.getElementById(
      `${category}-international-genes`,
    );

    if (!domesticElement) {
      console.error(`Element not found: ${category}-domestic-genes`);
    } else {
      const domesticValue = data.domestic;
      domesticElement.textContent =
        domesticValue === '-' ? '-' : domesticValue.toLocaleString();
    }

    if (!internationalElement) {
      console.error(`Element not found: ${category}-international-genes`);
    } else {
      const internationalValue = data.international;
      internationalElement.textContent =
        internationalValue === '-' ? '-' : internationalValue.toLocaleString();
    }
  } catch (error) {
    console.error(`Error updating genes for ${category}:`, error);
  }
}

function updateBioresources(bioresources) {
  // バイオリソーステーブル
  updateBioresourcesRow('shitei', bioresources.shitei);
  updateBioresourcesRow('shoman', bioresources.shoman);
}

function updateBioresourcesRow(category, data) {
  try {
    const cellsElement = document.getElementById(`${category}-cells`);
    const mouseElement = document.getElementById(`${category}-mouse`);
    const dnaElement = document.getElementById(`${category}-dna`);

    if (!cellsElement) {
      console.error(`Element not found: ${category}-cells`);
      return;
    }
    if (!mouseElement) {
      console.error(`Element not found: ${category}-mouse`);
      return;
    }
    if (!dnaElement) {
      console.error(`Element not found: ${category}-dna`);
      return;
    }

    cellsElement.textContent =
      data.cells === '-' ? '-' : data.cells.toLocaleString();
    mouseElement.textContent =
      data.mouse === '-' ? '-' : data.mouse.toLocaleString();
    dnaElement.textContent = data.dna === '-' ? '-' : data.dna.toLocaleString();
  } catch (error) {
    console.error(`Error updating bioresources for ${category}:`, error);
  }
}

function updateVariants(variants) {
  // バリアントテーブル
  updateVariantsRow('shitei', variants.shitei);
  updateVariantsRow('shoman', variants.shoman);
}

function updateVariantsRow(category, data) {
  try {
    const clinvarElement = document.getElementById(`${category}-clinvar`);
    const mgendElement = document.getElementById(`${category}-mgend`);

    if (!clinvarElement) {
      console.error(`Element not found: ${category}-clinvar`);
      return;
    }
    if (!mgendElement) {
      console.error(`Element not found: ${category}-mgend`);
      return;
    }

    clinvarElement.textContent =
      data.clinvar === '-' ? '-' : data.clinvar.toLocaleString();
    mgendElement.textContent =
      data.mgend === '-' ? '-' : data.mgend.toLocaleString();
  } catch (error) {
    console.error(`Error updating variants for ${category}:`, error);
  }
}

// 安全な数値変換関数
function safeParseInt(value) {
  if (value === null || value === undefined || value === '-') {
    return '-';
  }
  const parsed = parseInt(value);
  return isNaN(parsed) ? '-' : parsed;
}

// デフォルトデータ関数
function getDefaultNandoData() {
  return {
    shitei_all: { 'callret-0': '0' },
    shitei_group: { 'callret-0': '0' },
    shitei_disease: { 'callret-0': '0' },
    shoman_all: { 'callret-0': '0' },
    shoman_group: { 'callret-0': '0' },
    shoman_disease: { 'callret-0': '0' },
  };
}

function getDefaultBRCData() {
  return {
    shitei_cell: { cell: '0' },
    shitei_mouse: { mouse: '0' },
    shitei_DNA: { gene: '0' },
    shoman_cell: { cell: '0' },
    shoman_mouse: { mouse: '0' },
    shoman_DNA: { gene: '0' },
  };
}

function getDefaultLinkData() {
  return {
    name8: { mondo: '0' },
    name10: { medgen: '0' },
    name5: { kegg: '0' },
    name7: { mondo: '0' },
    name9: { medgen: '0' },
    name6: { kegg: '0' },
  };
}

function getDefaultLinkData2() {
  return {
    shitei_inheritance: { inheritance: '0' },
    shoman_inheritance: { inheritance: '0' },
    shitei_description: { desc: '0' },
    shoman_description: { desc: '0' },
    shitei_genetest: { genetest: '0' },
    shoman_genetest: { genetest: '0' },
    shitei_hp: { hp: '0' },
    shoman_hp: { hp: '0' },
    shitei_gene: { gene: '0' },
    shoman_gene: { gene: '0' },
    shitei_mgend: { mgend: '0' },
    shoman_mgend: { mgend: '0' },
    shitei_altlabel: { alt: '0' },
    shoman_altlabel: { alt: '0' },
  };
}

function getDefaultLinkData4() {
  return {
    shitei_gm: { GM: '0' },
    shoman_gm: { GM: '0' },
    shitei_hum: { hum: '0' },
    shoman_hum: { hum: '0' },
    shitei_CG: { curatedGene: '0' },
    shoman_CG: { curatedGene: '0' },
  };
}

function getDefaultLinkData5() {
  return {
    shitei_pubchem: { pubchem: '0' },
    shoman_pubchem: { pubchem: '0' },
  };
}

function getDefaultLinkData7() {
  return {
    shitei_clinvar: { num: '0' },
    shoman_clinvar: { num: '0' },
  };
}

function getDefaultGlycoGeneData() {
  return {
    glyco_gene_shitei: { num: '0' },
    glyco_gene_shoman: { num: '0' },
    glyco_gene_total: { num: '0' },
  };
}
