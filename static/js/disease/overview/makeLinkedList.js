import {
  linkedListEnColumns,
  linkedListJaColumns,
} from '../../utils/linkedListColumns.js';

import { createObjectUrlFromData } from '../../utils/stanzaUtils.js';

import { calcTreeLength } from '../../utils/calcTreeDepth.js';

export async function makeLinkedList(linkedListData, nandoId) {
  const linkedItems = document.getElementById('temp-linked-items');
  const overviewSection = linkedItems.closest('.overview-section');
  const tabWrap = linkedItems.querySelector('.tab-wrap');
  const selectGraphType = document.getElementById('linked-items-graph');
  const currentLang = document.querySelector('.language-select').value;

  // linkedListDataが全て空の場合にoverviewSectionを削除
  const hasData = Object.values(linkedListData).some(
    (dataArray) => Array.isArray(dataArray) && dataArray.length > 0,
  );
  if (!hasData) {
    overviewSection.remove();
    return;
  }

  let isFirstTab = true;
  const items =
    currentLang === 'ja' ? linkedListJaColumns : linkedListEnColumns;

  for (const item of items) {
    const content = tabWrap.querySelector(`.${item.class}`);
    const exists = makeLinksTable(item, content, linkedListData, nandoId);

    if (!exists) {
      const input = document.getElementById(`linked-item-${item.class}`);
      if (input) {
        const label = input.nextElementSibling;
        if (label) label.remove();
        input.remove();
      }
    } else {
      const currentTab = tabWrap.querySelector(`#linked-item-${item.class}`);

      // 初回のタブをチェック
      if (currentTab && isFirstTab) {
        currentTab.checked = true;
        isFirstTab = false;
        addTableOrTree(content, item, 'table', linkedListData, nandoId); // 初期表示はテーブル
      }

      // タブのクリックイベントを追加
      currentTab.addEventListener('change', function () {
        if (this.checked) {
          // タブがアクティブになったときにテーブルまたはツリーを表示
          const displayType = selectGraphType.value || 'table'; // 選択された形式に従う
          addTableOrTree(content, item, displayType, linkedListData, nandoId);
        }
      });

      // セレクトボックス変更時に表示形式を切り替える
      selectGraphType.addEventListener('change', function () {
        const displayType = this.value;
        if (currentTab.checked) {
          addTableOrTree(content, item, displayType, linkedListData, nandoId);
        }
      });
    }
  }
}

/** 同一値が続く行をまとめるための rowspan グループ（開始行インデックスと結合行数） */
function buildLinkedRowspanGroups(rows, key) {
  const groups = [];
  let i = 0;
  while (i < rows.length) {
    const val = rows[i][key];
    let span = 1;
    while (
      i + span < rows.length &&
      String(rows[i + span][key] ?? '') === String(val ?? '')
    ) {
      span++;
    }
    groups.push({ startRow: i, span });
    i += span;
  }
  return groups;
}

function sortLinkedRowsForGrouping(rows, keys) {
  return [...rows].sort((a, b) => {
    for (const key of keys) {
      const cmp = String(a[key] ?? '').localeCompare(
        String(b[key] ?? ''),
        undefined,
        {
          numeric: true,
          sensitivity: 'base',
        },
      );
      if (cmp !== 0) return cmp;
    }
    return 0;
  });
}

function fillLinkedDataCell(cell, field, itemData, key) {
  if (field && field.type === 'url' && field.hrefKey) {
    const link = document.createElement('a');
    link.href = itemData[field.hrefKey];
    link.textContent = itemData[key];
    link.target = '_blank';
    cell.appendChild(link);
  } else if (field && field.content === 'property') {
    const propertyValue = itemData[key];
    if (propertyValue == null || typeof propertyValue !== 'string') {
      cell.textContent = propertyValue != null ? String(propertyValue) : '';
    } else {
      const matchType = propertyValue.split('#')[1];
      cell.textContent =
        matchType === 'closeMatch'
          ? 'Close Match'
          : matchType === 'exactMatch'
            ? 'Exact Match'
            : matchType === 'hasDbXref'
              ? 'database_cross_reference'
              : propertyValue;
    }
  } else {
    cell.textContent = itemData[key] != null ? itemData[key] : '';
  }
}

function makeLinksTable(item, content, linkedListData, nandoId) {
  const data = linkedListData[item.class];
  if (!data || data.length === 0) {
    return false;
  }

  const filteredData = data.filter((itemData) => itemData.displayid);
  const sortedData = sortLinkedRowsForGrouping(filteredData, item.keys);

  const rowspanGroupsByColIndex = item.keys.map((key) => {
    const field = item.labels.find((l) => l.content === key);
    if (!field?.rowspan) return null;
    return buildLinkedRowspanGroups(sortedData, key);
  });

  // Feedback は外部リンク ID（displayid）単位で1つにまとめる
  const feedbackRowspanGroups = buildLinkedRowspanGroups(
    sortedData,
    'displayid',
  );

  // 既存のテーブルを削除
  const existingTable = content.querySelector('table');
  if (existingTable) {
    existingTable.style.display = 'none';
  }

  const tableWrapper = document.createElement('div');
  tableWrapper.classList.add('table-contents');

  const table = document.createElement('table');
  table.classList.add('table');

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  item.labels.forEach((label) => {
    const th = document.createElement('th');
    th.textContent = label.label;
    headerRow.appendChild(th);
  });

  const feedbackTh = document.createElement('th');
  feedbackTh.textContent = 'Feedback(*)';
  headerRow.appendChild(feedbackTh);
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  sortedData.forEach((itemData, rowIndex) => {
    const row = document.createElement('tr');
    item.keys.forEach((key, colIdx) => {
      const field = item.labels.find((labelItem) => labelItem.content === key);
      const groups = rowspanGroupsByColIndex[colIdx];

      if (field?.rowspan && groups) {
        const group = groups.find((g) => g.startRow === rowIndex);
        if (!group) {
          return;
        }
        const cell = document.createElement('td');
        cell.rowSpan = group.span;
        fillLinkedDataCell(cell, field, itemData, key);
        row.appendChild(cell);
        return;
      }

      const cell = document.createElement('td');
      fillLinkedDataCell(cell, field, itemData, key);
      row.appendChild(cell);
    });

    const feedbackGroup = feedbackRowspanGroups.find(
      (g) => g.startRow === rowIndex,
    );
    if (feedbackGroup) {
      const feedbackCell = document.createElement('td');
      feedbackCell.classList.add('feedback-cell');
      feedbackCell.rowSpan = feedbackGroup.span;
      feedbackCell.innerHTML = `
        <a href="#" class="good-icon" title="Good"><i class="far fa-thumbs-up"></i></a>
        <a href="#" class="bad-icon" title="Bad"><i class="far fa-thumbs-down"></i></a>
        <a href="mailto:nanbyodata@dbcls.rois.ac.jp?subject=Feedback%20on%20NanbyoData&body=NANDO:${nandoId}%20-%20${itemData.displayid}" class="email-icon" title="Send Feedback">
          <i class="far fa-envelope"></i>
        </a>
      `;
      row.appendChild(feedbackCell);

      feedbackCell
        .querySelector('.good-icon')
        .addEventListener('click', (e) => {
          e.preventDefault();
          sendFeedback('GOOD', `NANDO:${nandoId}`, itemData.displayid);
        });

      feedbackCell.querySelector('.bad-icon').addEventListener('click', (e) => {
        e.preventDefault();
        sendFeedback('BAD', `NANDO:${nandoId}`, itemData.displayid);
      });
    }

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  tableWrapper.appendChild(table);
  content.prepend(tableWrapper);

  return true;
}

function sendFeedback(type, idFrom, idTo) {
  const url = `/feedback?id_from=${idFrom}&id_to=${idTo}&type=${type}`;

  fetch(url, {
    method: 'GET',
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Error while sending feedback.');
      }
      alert(`${type} feedback received.`);
    })
    .catch((error) => {
      console.error('Error:', error);
      alert('Error while sending feedback.');
    });
}

function addTableOrTree(content, item, displayType, linkedListData, nandoId) {
  const currentLang = document.querySelector('.language-select').value;

  const table = content.querySelector('table');
  const tree = content.querySelector('togostanza-tree');
  let feedbackMessage = content.querySelector('p');

  const overviewSection = content.closest('.overview-section');

  if (!feedbackMessage) {
    feedbackMessage = document.createElement('p');
    feedbackMessage.textContent =
      currentLang === 'ja'
        ? '* リンクに関するフィードバックをお待ちしております.'
        : '* Welcome feedback on the links.';
    content.appendChild(feedbackMessage);
  }

  if (displayType === 'table') {
    overviewSection.style.paddingBottom = '0';

    if (table) {
      table.style.display = 'table';
    } else {
      makeLinksTable(item, content, linkedListData, nandoId);
    }

    feedbackMessage.style.display = 'block';

    if (tree) {
      tree.style.display = 'none';
    }
  } else if (displayType === 'tree') {
    overviewSection.style.paddingBottom = '15px';

    if (table) {
      table.style.display = 'none';
    }

    feedbackMessage.style.display = 'none';

    if (tree) {
      tree.style.display = 'block';
    } else {
      // データの存在チェックを追加
      if (
        !linkedListData[item.class] ||
        !Array.isArray(linkedListData[item.class])
      ) {
        console.warn(`Tree data not available for class: ${item.class}`);
        return;
      }

      const uniqueTreeId = `tree-${item.class}`;
      const objectUrl = createObjectUrlFromData(linkedListData[item.class]);
      const treeDepth = calcTreeLength(linkedListData[item.class]);
      // TODO: リンク一覧で飛ばしたいurlをAPIに追加する必要がある
      content.innerHTML += `
        <togostanza-tree 
          id="${uniqueTreeId}" 
          data-url="${objectUrl}" 
          data-type="json" 
          layout-orientation="horizontal" 
          node-label_key="id" 
          node-label_margin="8" 
          node-size_key="size" 
          node-size_min="8" 
          node-size_max="8" 
          node-color_key="color" 
          group-key="group" 
          node-color_blend="normal" 
          tooltip="{{#if url}}&lt;a href&#x3D;{{url}} target&#x3D;&quot;_blank&quot;&gt;{{id}}&lt;/a&gt;{{else}}&lt;span&gt;{{id}}&lt;/span&gt;{{/if}}"
          togostanza-custom_css_url="">
        </togostanza-tree>
      `;

      setTimeout(() => {
        const scriptElement = document.createElement('script');
        scriptElement.type = 'module';
        scriptElement.src =
          'https://togostanza.github.io/metastanza-devel/tree.js';
        scriptElement.async = true;
        content.appendChild(scriptElement);

        const treeElement = document.getElementById(uniqueTreeId);
        treeElement.style.setProperty(
          '--togostanza-theme-series_0_color',
          '#29697a',
        );
        treeElement.style.setProperty(
          '--togostanza-fonts-font_size_default',
          '14',
        );
        treeElement.style.setProperty(
          '--togostanza-canvas-height',
          `${treeDepth.maxLength * 100} px`,
        );
        treeElement.style.setProperty(
          '--togostanza-canvas-width',
          `${treeDepth.maxDepth * 300} px`,
        );
      }, 0);
    }
  }
}
