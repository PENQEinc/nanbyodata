import { fetchDiseaseListJson } from '../utils/diseaseListJsonUrl.js';

const currentLang = document.documentElement.lang === 'en' ? 'en' : 'ja';
const isEnglish = currentLang === 'en';

const UI_LABELS = {
  ja: {
    all: 'すべて',
    ungrouped: '未分類',
    diseaseGroup: '疾患群',
    noData: '該当データがありません',
    loadFailed: '読み込みに失敗しました',
    noticeMax: '最大',
  },
  en: {
    all: 'All',
    ungrouped: 'Ungrouped',
    diseaseGroup: 'Disease group',
    noData: 'No matching data found',
    loadFailed: 'Failed to load',
    noticeMax: 'max',
  },
};
const t = UI_LABELS[currentLang];

const categoryLabel = {
  ja: {
    shitei: '指定難病',
    syoman: '小児慢性特定疾病',
  },
  en: {
    shitei: 'Designated Intractable Diseases',
    syoman: 'Specified Chronic Pediatric Diseases',
  },
};

const kanaTree = [
  {
    row: 'あ行',
    children: [
      { key: 'あ', chars: 'あぁ' },
      { key: 'い', chars: 'いぃ' },
      { key: 'う', chars: 'うぅゔ' },
      { key: 'え', chars: 'えぇ' },
      { key: 'お', chars: 'おぉ' },
    ],
  },
  {
    row: 'か行',
    children: [
      { key: 'か', chars: 'かが' },
      { key: 'き', chars: 'きぎ' },
      { key: 'く', chars: 'くぐ' },
      { key: 'け', chars: 'けげ' },
      { key: 'こ', chars: 'こご' },
    ],
  },
  {
    row: 'さ行',
    children: [
      { key: 'さ', chars: 'さざ' },
      { key: 'し', chars: 'しじ' },
      { key: 'す', chars: 'すず' },
      { key: 'せ', chars: 'せぜ' },
      { key: 'そ', chars: 'そぞ' },
    ],
  },
  {
    row: 'た行',
    children: [
      { key: 'た', chars: 'ただ' },
      { key: 'ち', chars: 'ちぢ' },
      { key: 'つ', chars: 'つづっ' },
      { key: 'て', chars: 'てで' },
      { key: 'と', chars: 'とど' },
    ],
  },
  {
    row: 'な行',
    children: [
      { key: 'な', chars: 'な' },
      { key: 'に', chars: 'に' },
      { key: 'ぬ', chars: 'ぬ' },
      { key: 'ね', chars: 'ね' },
      { key: 'の', chars: 'の' },
    ],
  },
  {
    row: 'は行',
    children: [
      { key: 'は', chars: 'はばぱ' },
      { key: 'ひ', chars: 'ひびぴ' },
      { key: 'ふ', chars: 'ふぶぷ' },
      { key: 'へ', chars: 'へべぺ' },
      { key: 'ほ', chars: 'ほぼぽ' },
    ],
  },
  {
    row: 'ま行',
    children: [
      { key: 'ま', chars: 'ま' },
      { key: 'み', chars: 'み' },
      { key: 'む', chars: 'む' },
      { key: 'め', chars: 'め' },
      { key: 'も', chars: 'も' },
    ],
  },
  {
    row: 'や行',
    children: [
      { key: 'や', chars: 'やゃ' },
      { key: 'ゆ', chars: 'ゆゅ' },
      { key: 'よ', chars: 'よょ' },
    ],
  },
  {
    row: 'ら行',
    children: [
      { key: 'ら', chars: 'ら' },
      { key: 'り', chars: 'り' },
      { key: 'る', chars: 'る' },
      { key: 'れ', chars: 'れ' },
      { key: 'ろ', chars: 'ろ' },
    ],
  },
  {
    row: 'わ行',
    children: [
      { key: 'わ', chars: 'わゎ' },
      { key: 'を', chars: 'を' },
      { key: 'ん', chars: 'ん' },
    ],
  },
];

const allKanaKeys = kanaTree.flatMap((group) =>
  group.children.map((child) => child.key),
);
const alphabetKeys = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '#'];
const initialKeys = isEnglish ? alphabetKeys : allKanaKeys;
const kanaCharToKey = new Map(
  kanaTree.flatMap((group) =>
    group.children.flatMap((child) =>
      child.chars.split('').map((ch) => [ch, child.key]),
    ),
  ),
);

const state = {
  all: [],
  filtered: [],
  page: 1,
  sortKey: null,
  sortOrder: 'asc',
  selectedCategories: new Set(['shitei', 'syoman']),
  selectedKana: new Set(initialKeys),
  expandedKanaRows: new Set(),
  selectedGroups: new Set(),
  selectedSymptoms: new Set(),
  noticeMin: null,
  noticeMax: null,
  expandedGroupRows: new Set(),
  groupTree: null,
  allSelectableGroupIds: new Set(),
  allSymptoms: new Set(),
  expandedFilterPanels: {
    category: true,
    kana: true,
    group: true,
    symptom: true,
  },
};

const el = {
  categoryFilter: document.getElementById('categoryFilter'),
  kanaFilter: document.getElementById('kanaFilter'),
  noticeMin: document.getElementById('noticeMin'),
  noticeMax: document.getElementById('noticeMax'),
  groupFilter: document.getElementById('groupFilter'),
  symptomFilter: document.getElementById('symptomFilter'),
  rows: document.getElementById('rows'),
  pager: document.getElementById('pager'),
  sortableHeaders: Array.from(
    document.querySelectorAll('#disease-list-page thead th.sortable'),
  ),
};

function extractNandoNum(id) {
  const m = String(id || '').match(/NANDO:(\d+)/);
  return m ? Number.parseInt(m[1], 10) : Number.POSITIVE_INFINITY;
}

function compareBySortKey(a, b) {
  if (!state.sortKey) return 0;
  if (state.sortKey === 'notice') {
    return (a.noticeNum || 0) - (b.noticeNum || 0);
  }
  if (state.sortKey === 'name') {
    return getSortName(a).localeCompare(getSortName(b), currentLang);
  }
  return extractNandoNum(a.id) - extractNandoNum(b.id);
}

function sortFiltered() {
  if (!state.sortKey) return;
  state.filtered.sort((a, b) => {
    const base = compareBySortKey(a, b);
    return state.sortOrder === 'asc' ? base : -base;
  });
}

function renderSortIcons() {
  el.sortableHeaders.forEach((th) => {
    const icon = th.querySelector('.sort-icon');
    const isActive = state.sortKey && th.dataset.sortKey === state.sortKey;
    if (!icon) return;
    icon.className = 'fas sort-icon';
    if (!isActive) {
      icon.classList.add('fa-sort');
      return;
    }
    icon.classList.add(
      state.sortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down',
    );
  });
}

function initTableSort() {
  el.sortableHeaders.forEach((th) => {
    th.setAttribute('role', 'button');
    th.setAttribute('tabindex', '0');
    th.addEventListener('click', () => {
      const key = th.dataset.sortKey;
      if (!key) return;
      if (state.sortKey === key) {
        state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortKey = key;
        state.sortOrder = 'asc';
      }
      state.page = 1;
      applyFilters();
      renderSortIcons();
    });
    th.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        th.click();
      }
    });
  });
  renderSortIcons();
}

function groupIdFromUri(uri) {
  if (!uri) return null;
  const m = uri.match(/NANDO_(\d+)$/);
  return m ? `NANDO:${m[1]}` : null;
}

function groupLabelFromId(groupId, idToLabelMap) {
  if (!groupId) return t.ungrouped;
  if (idToLabelMap.has(groupId)) return idToLabelMap.get(groupId);
  return `${t.diseaseGroup} (${groupId})`;
}

function groupLabelFromUri(uri, idToLabelMap) {
  const groupId = groupIdFromUri(uri);
  return groupLabelFromId(groupId, idToLabelMap);
}

function normalizeToHiraganaChar(c) {
  if (!c) return '';
  const code = c.charCodeAt(0);
  if (code >= 0x30a1 && code <= 0x30f6) return String.fromCharCode(code - 0x60);
  return c;
}

function getKanaKey(yomigana) {
  if (isEnglish) {
    const name = String(getDisplayName(yomigana)).trim();
    const c = name.charAt(0).toUpperCase();
    return /^[A-Z]$/.test(c) ? c : '#';
  }
  if (!yomigana?.yomigana) return 'わ';
  const c = normalizeToHiraganaChar(String(yomigana.yomigana).trim().charAt(0));
  return kanaCharToKey.get(c) || 'わ';
}

function uniqSorted(values) {
  return Array.from(new Set(values)).sort((a, b) =>
    String(a).localeCompare(String(b), currentLang),
  );
}

function getDisplayName(record) {
  if (!record) return '';
  if (isEnglish) return record.label_en || record.label_ja || '';
  return record.label_ja || record.label_en || '';
}

/** 名前列ソート用：日本語のときはよみがな、英語のときは表示名 */
function getSortName(record) {
  if (!record) return '';
  if (isEnglish) return String(getDisplayName(record)).trim();
  const y = String(record.yomigana || '').trim();
  return y || String(getDisplayName(record)).trim();
}

function normalizeSymptomList(values) {
  if (!Array.isArray(values)) return [];

  function countParenDepthDelta(text) {
    let delta = 0;
    for (const ch of text) {
      if (ch === '(' || ch === '（') delta += 1;
      else if (ch === ')' || ch === '）') delta -= 1;
    }
    return delta;
  }

  const parts = [];
  values.forEach((v) => {
    const raw = String(v || '').trim();
    if (!raw) return;
    raw.split('|').forEach((chunk) => {
      const part = chunk.trim();
      if (part) parts.push(part);
    });
  });

  const merged = [];
  let buf = '';
  let depth = 0;

  parts.forEach((part) => {
    if (!buf) {
      buf = part;
      depth = Math.max(0, countParenDepthDelta(part));
      if (depth === 0) {
        merged.push(buf);
        buf = '';
      }
      return;
    }

    if (depth > 0) {
      buf = `${buf}, ${part}`;
      depth = Math.max(0, depth + countParenDepthDelta(part));
      if (depth === 0) {
        merged.push(buf);
        buf = '';
      }
      return;
    }

    merged.push(buf);
    buf = part;
    depth = Math.max(0, countParenDepthDelta(part));
    if (depth === 0) {
      merged.push(buf);
      buf = '';
    }
  });

  if (buf) merged.push(buf);
  return merged;
}

function buildGroupTree(records, idToLabelMap) {
  const usedGroupIds = new Set(records.map((r) => r.groupId).filter(Boolean));
  const byId = new Map(records.map((r) => [r.id, r]));
  const categoryGroupIds = {
    shitei: new Set(),
    syoman: new Set(),
  };

  records.forEach((r) => {
    if (!r.groupId) return;
    if (r.category === 'shitei') categoryGroupIds.shitei.add(r.groupId);
    if (r.category === 'syoman') categoryGroupIds.syoman.add(r.groupId);
  });

  const parentByChild = new Map();
  usedGroupIds.forEach((gid) => {
    const rec = byId.get(gid);
    if (!rec) return;
    const parentId = groupIdFromUri(rec.group);
    if (parentId) parentByChild.set(gid, parentId);
  });

  const nodes = new Map();
  function ensureNode(id) {
    if (!nodes.has(id)) {
      nodes.set(id, {
        id,
        label: groupLabelFromId(id, idToLabelMap),
        children: [],
      });
    }
    return nodes.get(id);
  }

  usedGroupIds.forEach((gid) => ensureNode(gid));
  parentByChild.forEach((parentId, childId) => {
    const parent = ensureNode(parentId);
    ensureNode(childId);
    if (!parent.children.includes(childId)) parent.children.push(childId);
  });

  const childSet = new Set(parentByChild.keys());
  const rootIds = Array.from(nodes.keys()).filter((id) => !childSet.has(id));

  const sortByLabel = (a, b) =>
    String(nodes.get(a).label).localeCompare(
      String(nodes.get(b).label),
      currentLang,
    );
  rootIds.sort(sortByLabel);
  nodes.forEach((node) => node.children.sort(sortByLabel));

  return { rootIds, nodes, usedGroupIds, categoryGroupIds };
}

function createChevronToggle(isExpanded, onClick) {
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'kana-toggle';
  toggle.innerHTML = isExpanded
    ? '<i class="fas fa-angle-down" aria-hidden="true"></i>'
    : '<i class="fas fa-angle-right" aria-hidden="true"></i>';
  toggle.addEventListener('click', onClick);
  return toggle;
}

function renderCheckboxList(container, items, selectedSet, onToggle, panelKey) {
  container.innerHTML = '';
  const itemCheckboxes = [];
  const expanded = state.expandedFilterPanels[panelKey] !== false;

  const allWrap = document.createElement('div');
  allWrap.className = 'kana-row';
  const allHead = document.createElement('div');
  allHead.className = 'kana-row-head';
  const allToggle = createChevronToggle(expanded, () => {
    state.expandedFilterPanels[panelKey] = !expanded;
    renderFilters();
  });
  const allLabel = document.createElement('label');
  allLabel.className = 'kana-all';
  const allCheckbox = document.createElement('input');
  allCheckbox.type = 'checkbox';
  const allSpan = document.createElement('span');
  allSpan.textContent = t.all;
  allLabel.appendChild(allCheckbox);
  allLabel.appendChild(allSpan);
  allHead.appendChild(allToggle);
  allHead.appendChild(allLabel);
  allWrap.appendChild(allHead);
  container.appendChild(allWrap);

  const childrenWrap = document.createElement('div');
  childrenWrap.className = 'filter-children';
  childrenWrap.hidden = !expanded;
  container.appendChild(childrenWrap);

  function syncAllState() {
    const count = items.reduce(
      (n, item) => n + (selectedSet.has(item.value) ? 1 : 0),
      0,
    );
    allCheckbox.checked = count === items.length && items.length > 0;
    allCheckbox.indeterminate = count > 0 && count < items.length;
  }

  allCheckbox.addEventListener('change', () => {
    if (allCheckbox.checked) {
      items.forEach((item) => selectedSet.add(item.value));
    } else {
      selectedSet.clear();
    }
    itemCheckboxes.forEach((cb) => {
      cb.checked = allCheckbox.checked;
    });
    syncAllState();
    onToggle();
  });

  items.forEach((item) => {
    const label = document.createElement('label');
    const spacer = document.createElement('span');
    spacer.className = 'toggle-spacer';
    spacer.setAttribute('aria-hidden', 'true');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = selectedSet.has(item.value);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) selectedSet.add(item.value);
      else selectedSet.delete(item.value);
      syncAllState();
      onToggle();
    });

    const span = document.createElement('span');
    span.textContent = item.label;

    label.appendChild(spacer);
    label.appendChild(checkbox);
    label.appendChild(span);
    childrenWrap.appendChild(label);
    itemCheckboxes.push(checkbox);
  });

  syncAllState();
}

function renderKanaFilter() {
  el.kanaFilter.innerHTML = '';
  const panelExpanded = state.expandedFilterPanels.kana !== false;
  const panelRow = document.createElement('div');
  panelRow.className = 'kana-row';
  const panelHead = document.createElement('div');
  panelHead.className = 'kana-row-head';
  const panelToggle = createChevronToggle(panelExpanded, () => {
    state.expandedFilterPanels.kana = !panelExpanded;
    renderFilters();
  });
  const allLabel = document.createElement('label');
  allLabel.className = 'kana-all';
  const allCheckbox = document.createElement('input');
  allCheckbox.type = 'checkbox';
  const allSpan = document.createElement('span');
  allSpan.textContent = t.all;
  allLabel.appendChild(allCheckbox);
  allLabel.appendChild(allSpan);
  panelHead.appendChild(panelToggle);
  panelHead.appendChild(allLabel);
  panelRow.appendChild(panelHead);
  el.kanaFilter.appendChild(panelRow);

  const panelChildren = document.createElement('div');
  panelChildren.className = 'filter-children';
  panelChildren.hidden = !panelExpanded;
  el.kanaFilter.appendChild(panelChildren);

  function syncAllState() {
    const count = initialKeys.reduce(
      (n, k) => n + (state.selectedKana.has(k) ? 1 : 0),
      0,
    );
    allCheckbox.checked = count === initialKeys.length;
    allCheckbox.indeterminate = count > 0 && count < initialKeys.length;
  }

  allCheckbox.addEventListener('change', () => {
    if (allCheckbox.checked) {
      initialKeys.forEach((k) => state.selectedKana.add(k));
    } else {
      state.selectedKana.clear();
    }
    renderFilters();
    state.page = 1;
    applyFilters();
  });

  if (isEnglish) {
    alphabetKeys.forEach((key) => {
      const label = document.createElement('label');
      const spacer = document.createElement('span');
      spacer.className = 'toggle-spacer';
      spacer.setAttribute('aria-hidden', 'true');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = state.selectedKana.has(key);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) state.selectedKana.add(key);
        else state.selectedKana.delete(key);
        renderFilters();
        state.page = 1;
        applyFilters();
      });
      const span = document.createElement('span');
      span.textContent = key;
      label.appendChild(spacer);
      label.appendChild(checkbox);
      label.appendChild(span);
      panelChildren.appendChild(label);
    });
    syncAllState();
    return;
  }

  kanaTree.forEach((group) => {
    const rowWrap = document.createElement('div');
    rowWrap.className = 'kana-row';

    const rowHead = document.createElement('div');
    rowHead.className = 'kana-row-head';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'kana-toggle';
    const isExpanded = state.expandedKanaRows.has(group.row);
    toggle.innerHTML = isExpanded
      ? '<i class="fas fa-angle-down" aria-hidden="true"></i>'
      : '<i class="fas fa-angle-right" aria-hidden="true"></i>';

    const rowLabel = document.createElement('label');
    const rowCheckbox = document.createElement('input');
    rowCheckbox.type = 'checkbox';
    const selectedCount = group.children.reduce(
      (n, child) => n + (state.selectedKana.has(child.key) ? 1 : 0),
      0,
    );
    rowCheckbox.checked = selectedCount === group.children.length;
    rowCheckbox.indeterminate =
      selectedCount > 0 && selectedCount < group.children.length;
    rowCheckbox.addEventListener('change', () => {
      if (rowCheckbox.checked) {
        group.children.forEach((child) => state.selectedKana.add(child.key));
      } else {
        group.children.forEach((child) => state.selectedKana.delete(child.key));
      }
      renderFilters();
      state.page = 1;
      applyFilters();
    });

    const rowSpan = document.createElement('span');
    rowSpan.textContent = group.row;
    rowLabel.appendChild(rowCheckbox);
    rowLabel.appendChild(rowSpan);

    const childrenWrap = document.createElement('div');
    childrenWrap.className = 'kana-children';
    childrenWrap.hidden = !isExpanded;
    toggle.addEventListener('click', () => {
      if (state.expandedKanaRows.has(group.row))
        state.expandedKanaRows.delete(group.row);
      else state.expandedKanaRows.add(group.row);
      renderFilters();
    });

    group.children.forEach((child) => {
      const childLabel = document.createElement('label');
      const childSpacer = document.createElement('span');
      childSpacer.className = 'toggle-spacer';
      childSpacer.setAttribute('aria-hidden', 'true');
      const childCheckbox = document.createElement('input');
      childCheckbox.type = 'checkbox';
      childCheckbox.checked = state.selectedKana.has(child.key);
      childCheckbox.addEventListener('change', () => {
        if (childCheckbox.checked) state.selectedKana.add(child.key);
        else state.selectedKana.delete(child.key);
        renderFilters();
        state.page = 1;
        applyFilters();
      });

      const childSpan = document.createElement('span');
      childSpan.textContent = child.key;
      childLabel.appendChild(childSpacer);
      childLabel.appendChild(childCheckbox);
      childLabel.appendChild(childSpan);
      childrenWrap.appendChild(childLabel);
    });

    rowHead.appendChild(toggle);
    rowHead.appendChild(rowLabel);
    rowWrap.appendChild(rowHead);
    rowWrap.appendChild(childrenWrap);
    panelChildren.appendChild(rowWrap);
  });

  syncAllState();
}

function renderGroupFilter() {
  const tree = state.groupTree;
  if (!tree) return;
  el.groupFilter.innerHTML = '';
  el.groupFilter.classList.add('group-tree');

  const panelExpanded = state.expandedFilterPanels.group !== false;
  const allWrap = document.createElement('div');
  allWrap.className = 'kana-row';
  const allHead = document.createElement('div');
  allHead.className = 'kana-row-head';
  const panelToggle = createChevronToggle(panelExpanded, () => {
    state.expandedFilterPanels.group = !panelExpanded;
    renderFilters();
  });
  const allLabel = document.createElement('label');
  allLabel.className = 'group-all';
  const allCheckbox = document.createElement('input');
  allCheckbox.type = 'checkbox';
  const allSpan = document.createElement('span');
  allSpan.textContent = t.all;
  allLabel.appendChild(allCheckbox);
  allLabel.appendChild(allSpan);
  allHead.appendChild(panelToggle);
  allHead.appendChild(allLabel);
  allWrap.appendChild(allHead);
  el.groupFilter.appendChild(allWrap);

  const childrenWrap = document.createElement('div');
  childrenWrap.className = 'filter-children';
  childrenWrap.hidden = !panelExpanded;
  el.groupFilter.appendChild(childrenWrap);

  function collectSelectableIds(id, visited = new Set(), allowedSet = null) {
    if (visited.has(id)) return [];
    visited.add(id);
    const node = tree.nodes.get(id);
    if (!node) return [];
    const own =
      tree.usedGroupIds.has(id) && (!allowedSet || allowedSet.has(id))
        ? [id]
        : [];
    return own.concat(
      node.children.flatMap((cid) =>
        collectSelectableIds(cid, visited, allowedSet),
      ),
    );
  }

  const allSelectableIds = tree.rootIds.flatMap((rid) =>
    collectSelectableIds(rid),
  );
  const selectedCount = allSelectableIds.reduce(
    (n, id) => n + (state.selectedGroups.has(id) ? 1 : 0),
    0,
  );
  allCheckbox.checked =
    allSelectableIds.length > 0 && selectedCount === allSelectableIds.length;
  allCheckbox.indeterminate =
    selectedCount > 0 && selectedCount < allSelectableIds.length;
  allCheckbox.addEventListener('change', () => {
    if (allCheckbox.checked)
      allSelectableIds.forEach((id) => state.selectedGroups.add(id));
    else allSelectableIds.forEach((id) => state.selectedGroups.delete(id));
    renderFilters();
    state.page = 1;
    applyFilters();
  });

  function renderNode(id, container, allowedSet = null, expandPrefix = '') {
    const node = tree.nodes.get(id);
    if (!node) return;
    const selectableIds = collectSelectableIds(id, new Set(), allowedSet);
    if (selectableIds.length === 0) return;
    const row = document.createElement('div');
    row.className = 'group-row';

    const head = document.createElement('div');
    head.className = 'group-row-head';

    const hasChildren = node.children.length > 0;
    const expandKey = `${expandPrefix}${id}`;
    const expanded = state.expandedGroupRows.has(expandKey);
    let toggleOrSpacer;
    if (hasChildren) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'kana-toggle';
      toggle.innerHTML = expanded
        ? '<i class="fas fa-angle-down" aria-hidden="true"></i>'
        : '<i class="fas fa-angle-right" aria-hidden="true"></i>';
      toggle.addEventListener('click', () => {
        if (expanded) state.expandedGroupRows.delete(expandKey);
        else state.expandedGroupRows.add(expandKey);
        renderFilters();
      });
      toggleOrSpacer = toggle;
    } else {
      const spacer = document.createElement('span');
      spacer.className = 'toggle-spacer';
      spacer.setAttribute('aria-hidden', 'true');
      toggleOrSpacer = spacer;
    }

    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    const checkedNum = selectableIds.reduce(
      (n, gid) => n + (state.selectedGroups.has(gid) ? 1 : 0),
      0,
    );
    checkbox.checked =
      selectableIds.length > 0 && checkedNum === selectableIds.length;
    checkbox.indeterminate =
      checkedNum > 0 && checkedNum < selectableIds.length;
    checkbox.addEventListener('change', () => {
      if (checkbox.checked)
        selectableIds.forEach((gid) => state.selectedGroups.add(gid));
      else selectableIds.forEach((gid) => state.selectedGroups.delete(gid));
      renderFilters();
      state.page = 1;
      applyFilters();
    });

    const span = document.createElement('span');
    span.textContent = node.label;
    label.appendChild(checkbox);
    label.appendChild(span);
    head.appendChild(toggleOrSpacer);
    head.appendChild(label);
    row.appendChild(head);

    if (hasChildren) {
      const childrenWrap = document.createElement('div');
      childrenWrap.className = 'group-children';
      childrenWrap.hidden = !expanded;
      node.children.forEach((cid) =>
        renderNode(cid, childrenWrap, allowedSet, expandPrefix),
      );
      row.appendChild(childrenWrap);
    }

    container.appendChild(row);
  }

  const categories = [
    { key: 'shitei', label: categoryLabel[currentLang].shitei },
    { key: 'syoman', label: categoryLabel[currentLang].syoman },
  ];

  categories.forEach((category) => {
    const allowedSet = tree.categoryGroupIds[category.key];
    if (!allowedSet || allowedSet.size === 0) return;

    const categorySelectableIds = tree.rootIds.flatMap((rid) =>
      collectSelectableIds(rid, new Set(), allowedSet),
    );
    if (categorySelectableIds.length === 0) return;

    const row = document.createElement('div');
    row.className = 'group-row';

    const head = document.createElement('div');
    head.className = 'group-row-head';

    const expandKey = `category:${category.key}`;
    const expanded = state.expandedGroupRows.has(expandKey);
    const toggle = createChevronToggle(expanded, () => {
      if (expanded) state.expandedGroupRows.delete(expandKey);
      else state.expandedGroupRows.add(expandKey);
      renderFilters();
    });

    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    const checkedNum = categorySelectableIds.reduce(
      (n, gid) => n + (state.selectedGroups.has(gid) ? 1 : 0),
      0,
    );
    checkbox.checked =
      categorySelectableIds.length > 0 &&
      checkedNum === categorySelectableIds.length;
    checkbox.indeterminate =
      checkedNum > 0 && checkedNum < categorySelectableIds.length;
    checkbox.addEventListener('change', () => {
      if (checkbox.checked)
        categorySelectableIds.forEach((gid) => state.selectedGroups.add(gid));
      else categorySelectableIds.forEach((gid) => state.selectedGroups.delete(gid));
      renderFilters();
      state.page = 1;
      applyFilters();
    });

    const span = document.createElement('span');
    span.textContent = category.label;
    label.appendChild(checkbox);
    label.appendChild(span);
    head.appendChild(toggle);
    head.appendChild(label);
    row.appendChild(head);

    const categoryChildren = document.createElement('div');
    categoryChildren.className = 'group-children';
    categoryChildren.hidden = !expanded;
    tree.rootIds.forEach((rid) =>
      renderNode(rid, categoryChildren, allowedSet, `${category.key}:`),
    );
    row.appendChild(categoryChildren);
    childrenWrap.appendChild(row);
  });
}

function renderFilters() {
  renderCheckboxList(
    el.categoryFilter,
    [
      { value: 'shitei', label: categoryLabel[currentLang].shitei },
      { value: 'syoman', label: categoryLabel[currentLang].syoman },
    ],
    state.selectedCategories,
    () => {
      state.page = 1;
      applyFilters();
    },
    'category',
  );

  renderKanaFilter();
  renderGroupFilter();

  const symptoms = Array.from(state.allSymptoms);
  renderCheckboxList(
    el.symptomFilter,
    symptoms.map((s) => ({ value: s, label: s })),
    state.selectedSymptoms,
    () => {
      state.page = 1;
      applyFilters();
    },
    'symptom',
  );
}

function parseNoticeInput() {
  const minVal = Number(el.noticeMin.value);
  const maxVal = Number(el.noticeMax.value);
  state.noticeMin = Number.isFinite(minVal) && minVal > 0 ? minVal : null;
  state.noticeMax = Number.isFinite(maxVal) && maxVal > 0 ? maxVal : null;
  state.page = 1;
  applyFilters();
}

function applyFilters() {
  const allGroupsSelected =
    state.allSelectableGroupIds.size > 0 &&
    state.selectedGroups.size === state.allSelectableGroupIds.size;
  const allSymptomsSelected =
    state.allSymptoms.size > 0 &&
    state.selectedSymptoms.size === state.allSymptoms.size;

  state.filtered = state.all.filter((d) => {
    if (!state.selectedCategories.has(d.category)) return false;
    if (!state.selectedKana.has(d.kanaKey)) return false;

    if (state.noticeMin !== null && d.noticeNum < state.noticeMin) return false;
    if (state.noticeMax !== null && d.noticeNum > state.noticeMax) return false;

    if (
      !allGroupsSelected &&
      state.selectedGroups.size > 0 &&
      !state.selectedGroups.has(d.groupId)
    )
      return false;

    if (!allSymptomsSelected && state.selectedSymptoms.size > 0) {
      const hasSymptom = d.symptoms_list.some((s) =>
        state.selectedSymptoms.has(s),
      );
      if (!hasSymptom) return false;
    }

    return true;
  });

  sortFiltered();
  renderTable();
  el.pager.innerHTML = '';
}

function renderTable() {
  el.rows.innerHTML = '';
  if (state.filtered.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 3;
    td.className = 'empty';
    td.textContent = t.noData;
    tr.appendChild(td);
    el.rows.appendChild(tr);
    return;
  }

  const pageRows = state.filtered;

  pageRows.forEach((d) => {
    const tr = document.createElement('tr');

    const idTd = document.createElement('td');
    idTd.textContent = d.id || '-';
    tr.appendChild(idTd);

    const noticeTd = document.createElement('td');
    noticeTd.textContent = d.notificationNumber || '-';
    tr.appendChild(noticeTd);

    const nameTd = document.createElement('td');
    const displayName = getDisplayName(d);
    if (d.id && displayName) {
      const link = document.createElement('a');
      link.className = 'disease-link';
      link.href = `/disease/${d.id}`;
      link.textContent = displayName;
      nameTd.appendChild(link);
    } else {
      nameTd.textContent = displayName || '-';
    }
    tr.appendChild(nameTd);

    el.rows.appendChild(tr);
  });
}

function initFilters(records) {
  state.groupTree = buildGroupTree(
    records,
    new Map(records.map((r) => [r.id, getDisplayName(r) || r.id])),
  );
  state.allSelectableGroupIds = new Set(state.groupTree.usedGroupIds);
  state.groupTree.usedGroupIds.forEach((gid) => state.selectedGroups.add(gid));

  const symptoms = uniqSorted(records.flatMap((r) => r.symptoms_list || []));
  state.allSymptoms = new Set(symptoms);
  symptoms.forEach((s) => state.selectedSymptoms.add(s));

  renderFilters();

  const noticeNums = records
    .map((r) => r.noticeNum)
    .filter((n) => Number.isFinite(n));
  el.noticeMin.placeholder = '1';
  if (noticeNums.length > 0) {
    const max = Math.max(...noticeNums);
    el.noticeMax.placeholder = String(max);
  } else {
    el.noticeMax.placeholder = t.noticeMax;
  }

  el.noticeMin.addEventListener('input', parseNoticeInput);
  el.noticeMax.addEventListener('input', parseNoticeInput);
}

async function fetchDiseaseData() {
  return await fetchDiseaseListJson();
}

async function boot() {
  initTableSort();
  const raw = await fetchDiseaseData();

  const idToLabelMap = new Map(
    raw.map((r) => [r.id, getDisplayName(r) || r.id]),
  );

  state.all = raw.map((r) => {
    const noticeNum = Number.parseInt(r.notificationNumber, 10);
    const symptomsJaList = normalizeSymptomList(r.symptoms_ja_list);
    const symptomsEnList = normalizeSymptomList(r.symptoms_en_list);
    return {
      ...r,
      symptoms_ja_list: symptomsJaList,
      symptoms_en_list: symptomsEnList,
      symptoms_list: isEnglish ? symptomsEnList : symptomsJaList,
      noticeNum: Number.isNaN(noticeNum) ? 0 : noticeNum,
      kanaKey: getKanaKey(r),
      groupId: groupIdFromUri(r.group),
      groupLabel: groupLabelFromUri(r.group, idToLabelMap),
      mainSymptom: symptomsJaList[0] || '-',
    };
  });

  initFilters(state.all);
  applyFilters();
}

boot().catch((err) => {
  el.rows.innerHTML = '';
  const tr = document.createElement('tr');
  const td = document.createElement('td');
  td.colSpan = 3;
  td.className = 'empty';
  td.textContent = `${t.loadFailed}: ${err.message}`;
  tr.appendChild(td);
  el.rows.appendChild(tr);
});
