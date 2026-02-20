import {
  subclassTableEnColumns,
  subclassTableJaColumns,
  convertColumnToText,
} from '../../utils/stanzaColumns.js';

import { createObjectUrlFromData } from '../../utils/stanzaUtils.js';

import { calcTreeLength } from '../../utils/calcTreeDepth.js';

export async function makeSubClass(data) {
  const targetDiv = document.getElementById('temp-sub-class');
  const chartTypeSelect = document.getElementById('sub-class-graph');
  const currentLang = document.querySelector('.language-select').value;
  const MIN_RENDER_WIDTH = 160;
  const isJapanese = currentLang === 'ja';

  // parentが設定されていないデータを除外するためのフィルタリング
  const filteredDataForTable = data.filter((item) => item.parent !== undefined);

  // objectUrlをそれぞれ作成
  const tableObjectUrl = createObjectUrlFromData(filteredDataForTable);
  const treeObjectUrl = createObjectUrlFromData(data);

  // データの確認と処理
  if (!data || data.length <= 1) {
    const overviewSection = targetDiv.closest('.overview-section');
    overviewSection.remove();
    return;
  }

  // データの件数を表示
  const dataNum = document.querySelector('.overview-section .data-num');
  if (dataNum) {
    const count = (data?.length || 0) - 1;
    dataNum.textContent = count >= 0 ? count : 0;
  }

  // 初期表示用のHTMLを設定
  targetDiv.innerHTML = `
    <div id="tableView" style="display: none;"></div>
    <div id="treeView" style="display: block;"></div>
  `;

  // 初期表示をツリーに設定
  toggleDisplay('tree');

  // チャートタイプが変更されたときに表示を更新
  chartTypeSelect.addEventListener('change', () => {
    const selectedChartType = chartTypeSelect.value;
    toggleDisplay(selectedChartType);
  });

  // URLハッシュ変更時にツリーを再レンダリング
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash;

    // ツリーが選択されている場合のみ再レンダリング
    if (chartTypeSelect.value === 'tree' && hash === '#overview') {
      toggleDisplay('tree');
    }
  });

  // 表示を切り替える関数
  function toggleDisplay(chartType) {
    const tableView = document.getElementById('tableView');
    const treeView = document.getElementById('treeView');

    if (chartType === 'table') {
      ensureTableView(tableView);
      tableView.style.display = 'block';
      treeView.style.display = 'none';
    } else if (chartType === 'tree') {
      tableView.style.display = 'none';

      // データの存在チェックを追加
      if (!data || !Array.isArray(data)) {
        console.warn('Tree data not available');
        treeView.innerHTML = '<p>データが利用できません</p>';
        treeView.style.display = 'block';
        return;
      }

      treeView.style.display = 'block';
      ensureTreeView(treeView);
    }
  }

  function ensureTableView(tableView) {
    if (tableView.dataset.initialized === 'true') return;

    tableView.innerHTML = `
      <togostanza-pagination-table
        data-url="${tableObjectUrl}"
        data-type="json"
        data-unavailable_message="No data found."
        custom-css-url=""
        width="100%"
        fixed-columns="1"
        padding="0px"
        page-size-option="100"
        page-slider="false"
        columns='${
          currentLang === 'ja'
            ? convertColumnToText(subclassTableJaColumns)
            : convertColumnToText(subclassTableEnColumns)
        }'
      ></togostanza-pagination-table>
    `;

    loadScriptOnce(
      'https://togostanza.github.io/metastanza/pagination-table.js',
      'subclass-pagination-table-script-loaded'
    );
    tableView.dataset.initialized = 'true';
  }

  function ensureTreeView(treeView, retryCount = 0) {
    if (treeView.dataset.initialized === 'true') return;
    const containerWidth = treeView.getBoundingClientRect().width;

    if (containerWidth < MIN_RENDER_WIDTH && retryCount < 20) {
      window.requestAnimationFrame(() => {
        ensureTreeView(treeView, retryCount + 1);
      });
      return;
    }

    // データを元にツリーの深さを計算
    const treeDepth = calcTreeLength(data);
    const labelKey = isJapanese ? 'label' : 'engLabel';
    const canvasWidth = calcCanvasWidth(data, treeDepth, labelKey, isJapanese);

    treeView.innerHTML = `
      <togostanza-tree
        data-url="${treeObjectUrl}"
        data-type="json"
        layout-orientation="horizontal"
        node-label_key="${labelKey}"
        node-label_margin="8"
        node-size_key="size"
        node-size_min="8"
        node-size_max="8"
        node-color_key="color"
        group-key="group"
        node-color_blend="normal"
        tooltip="{{#if idurl}}&lt;a href&#x3D;{{idurl}}&gt;{{id}}&lt;/a&gt;{{else}}&lt;span&gt;{{id}}&lt;/span&gt;{{/if}}"
        togostanza-custom_css_url=""
        style="
          --togostanza-fonts-font_size_default: 14;
          --togostanza-canvas-height: ${treeDepth.maxLength * 60}px;
          --togostanza-canvas-width: ${canvasWidth}px;
          --togostanza-theme-series_0_color: #29697a;
        "
      ></togostanza-tree>
    `;

    loadScriptOnce(
      'https://togostanza.github.io/metastanza-devel/tree.js',
      'subclass-tree-script-loaded'
    );
    treeView.dataset.initialized = 'true';
  }

  function loadScriptOnce(src, key) {
    if (!window.__nanbyodataScriptLoadedFlags) {
      window.__nanbyodataScriptLoadedFlags = {};
    }
    if (window.__nanbyodataScriptLoadedFlags[key]) return;

    const scriptElement = document.createElement('script');
    scriptElement.type = 'module';
    scriptElement.src = src;
    scriptElement.async = true;
    document.body.appendChild(scriptElement);
    window.__nanbyodataScriptLoadedFlags[key] = true;
  }

  function calcCanvasWidth(items, treeMetrics, activeLabelKey, japaneseMode) {
    const maxDepth = Math.max(treeMetrics.maxDepth || 1, 1);
    const longestLabel = items.reduce((max, item) => {
      const raw = item?.[activeLabelKey] || item?.label || item?.engLabel || '';
      return Math.max(max, String(raw).length);
    }, 0);

    const depthBase = japaneseMode ? 620 : 500;
    const labelFactor = japaneseMode ? 24 : 12;
    const depthBasedWidth = maxDepth * depthBase;
    const labelBasedWidth = longestLabel * labelFactor + maxDepth * 220;

    return Math.max(depthBasedWidth, labelBasedWidth, 1200);
  }
}
