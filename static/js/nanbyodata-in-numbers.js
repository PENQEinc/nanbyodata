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
      const trigger = e.target.closest(
        '.stats-th-tooltip, .stats-section-title-tooltip',
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
      const trigger = e.target.closest(
        '.stats-th-tooltip, .stats-section-title-tooltip',
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
    const btn = e.target.closest('.stats-download-btn');
    if (!btn) return;
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

/**
 * ハッシュの有無で表示を切り替え。
 * ハッシュあり → そのカード用の新規テーブルを config JSON で表示。
 * ハッシュなし → 従来の NanbyoData in numbers テーブルを表示。
 */
function updateViewByHash() {
  const hash = window.location.hash.slice(1);
  const originalEl = document.getElementById('nanbyodata-in-numbers-original');
  const cardDetailEl = document.getElementById('card-detail-view');
  if (!originalEl || !cardDetailEl) return;

  if (hash) {
    originalEl.style.display = 'none';
    originalEl.setAttribute('aria-hidden', 'true');
    cardDetailEl.style.display = 'block';
    cardDetailEl.removeAttribute('aria-hidden');
    showCardDetailTable(hash);
  } else {
    originalEl.style.display = '';
    originalEl.removeAttribute('aria-hidden');
    cardDetailEl.style.display = 'none';
    cardDetailEl.setAttribute('aria-hidden', 'true');
    loadStatsData();
  }
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
    const res = await fetch('/static/data/nanbyodata-in-numbers-config.json');
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
    const titleTooltip =
      sectionConfig.titleTooltip &&
      (sectionConfig.titleTooltip[locale] || sectionConfig.titleTooltip.en);
    if (titleTooltip) {
      const tw = document.createElement('span');
      tw.className = 'stats-section-title-tooltip';
      tw.setAttribute('data-tooltip', titleTooltip);
      tw.setAttribute('aria-label', titleTooltip);
      const icon = document.createElement('i');
      icon.className = 'fas fa-info-circle';
      tw.appendChild(icon);
      title.appendChild(tw);
    }
    header.appendChild(title);
    const downloadBtn = document.createElement('button');
    downloadBtn.type = 'button';
    downloadBtn.className = 'stats-download-btn';
    downloadBtn.setAttribute('data-section-id', sectionId);
    downloadBtn.setAttribute('aria-label', 'Download as CSV');
    downloadBtn.innerHTML =
      '<i class="fas fa-download" aria-hidden="true"></i> Download';
    header.appendChild(downloadBtn);
    section.appendChild(header);

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
      const loadTabTable = (tabIndex) => {
        const tab = sectionConfig.tabs[tabIndex];
        if (!tab?.dataApi || !tab.columns) return;
        if (tabCache[tabIndex]) {
          renderTableFromRows(table, tab.columns, tabCache[tabIndex], locale);
          return;
        }
        const colCount = tab.columns.length;
        // 読み込み中はヘッダーを非表示（スピナーのみ表示）
        thead.style.display = 'none';
        tbody.innerHTML =
          '<tr><td colspan="' +
          colCount +
          '" class="stats-table-loading"><div class="stats-table-loading-spinner-wrap"><div class="loading-spinner -stats"></div></div></td></tr>';
        fetch(tab.dataApi)
          .then((r) =>
            r.ok ? r.json() : Promise.reject(new Error(r.statusText)),
          )
          .then((data) => {
            const rows =
              data.rows || data.data || (Array.isArray(data) ? data : []);
            tabCache[tabIndex] = rows;
            renderTableFromRows(table, tab.columns, rows, locale);
          })
          .catch((e) => {
            console.warn('Stats tab API エラー (' + tab.id + '):', e);
            tbody.innerHTML =
              '<tr><td colspan="' +
              colCount +
              '" class="stats-table-error">' +
              (locale === 'ja'
                ? 'データの読み込みに失敗しました'
                : 'Failed to load data') +
              '</td></tr>';
            // エラー時はヘッダーを表示に戻す
            thead.style.display = '';
          });
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
              if (hasNandoLink) {
                const a = document.createElement('a');
                a.href = '/disease/' + encodeURIComponent(linkTarget);
                a.textContent =
                  linkTarget !== String(val) ? linkTarget : displayVal;
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
              if (hasNandoLink) {
                const a = document.createElement('a');
                a.href = '/disease/' + encodeURIComponent(linkTarget);
                a.textContent =
                  linkTarget !== String(val) ? linkTarget : displayVal;
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
        btn.textContent = tab.label[locale] || tab.label.en || tab.id;
        btn.dataset.tabIndex = String(idx);
        btn.addEventListener('click', function () {
          tabBar
            .querySelectorAll('.stats-tab')
            .forEach((b) => b.classList.remove('active'));
          this.classList.add('active');
          loadTabTable(Number(this.dataset.tabIndex));
        });
        tabBar.appendChild(btn);
      });
      section.insertBefore(tabBar, tableWrap);
      loadTabTable(0);
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
      loadSectionTableFromColumnApis(table, tbody, sectionConfig, locale);
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
          btn.textContent = tab.label[locale] || tab.label.en || tab.id;
          btn.dataset.tabId = tab.id;
          tabBar.appendChild(btn);
        });
        section.insertBefore(tabBar, tableWrap);
      }
      await loadSectionTableFromApi(table, tbody, sectionConfig, locale);
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
      const res = await fetch(col.dataApi);
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
        } else {
          columnData[col.dataKey] = data;
        }
      } else {
        columnData[col.dataKey] = {};
      }
    }

    tbody.innerHTML = '';
    rows.forEach((rowDef) => {
      const tr = document.createElement('tr');
      const rowId = rowDef.id;
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
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    if (thead) thead.style.display = '';
  } catch (e) {
    console.warn(`Stats column API エラー (${sectionConfig.id}):`, e);
    tbody.innerHTML = `<tr><td colspan="${colCount}" class="stats-table-error">${errorText}</td></tr>`;
    if (thead) thead.style.display = '';
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
    const res = await fetch(sectionConfig.dataApi);
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    const rows = data.rows || data.data || (Array.isArray(data) ? data : []);

    if (!Array.isArray(rows) || rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${colCount}">—</td></tr>`;
      if (thead) thead.style.display = '';
      return;
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
        const val = row[col.dataKey];
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
  } catch (e) {
    console.warn(`Stats API エラー (${sectionConfig.id}):`, e);
    tbody.innerHTML = `<tr><td colspan="${colCount}" class="stats-table-error">${errorText}</td></tr>`;
    if (thead) thead.style.display = '';
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
