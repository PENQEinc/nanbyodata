// 手動リサイズフラグ（グローバル）
let sidebarManuallyResized = false;
// windowオブジェクトに公開（treeview_component.htmlから参照するため）
window.sidebarManuallyResized = false;

const NAV_STATE_STORAGE_KEY = 'nanbyodata:disease-side-navigation-state';

const SIDEBAR_MIN_WIDTH = 250;
const SIDEBAR_MAX_WIDTH = 1200;

function getStorageItem(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function setStorageItem(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    // ignore storage write errors
  }
}

function getDefaultNavigationState() {
  return {
    sidebar: {
      collapsed: false,
      width: null,
    },
    toc: {
      collapsed: false,
    },
  };
}

function normalizeNavigationState(state) {
  const defaultState = getDefaultNavigationState();
  const normalizedState = {
    sidebar: {
      ...defaultState.sidebar,
    },
    toc: {
      ...defaultState.toc,
    },
  };

  if (!state || typeof state !== 'object') return normalizedState;

  if (state.sidebar && typeof state.sidebar === 'object') {
    if (typeof state.sidebar.collapsed === 'boolean') {
      normalizedState.sidebar.collapsed = state.sidebar.collapsed;
    }

    if (
      Number.isFinite(state.sidebar.width) &&
      state.sidebar.width > 0
    ) {
      normalizedState.sidebar.width = Math.round(state.sidebar.width);
    } else if (typeof state.sidebar.width === 'string') {
      const parsedWidth = Number.parseInt(state.sidebar.width, 10);
      if (!Number.isNaN(parsedWidth) && parsedWidth > 0) {
        normalizedState.sidebar.width = parsedWidth;
      }
    }
  }

  if (state.toc && typeof state.toc === 'object') {
    if (typeof state.toc.collapsed === 'boolean') {
      normalizedState.toc.collapsed = state.toc.collapsed;
    }
  }

  return normalizedState;
}

function setNavigationState(state) {
  const normalizedState = normalizeNavigationState(state);
  setStorageItem(NAV_STATE_STORAGE_KEY, JSON.stringify(normalizedState));
}

function getNavigationState() {
  const storedState = getStorageItem(NAV_STATE_STORAGE_KEY);
  if (storedState) {
    try {
      return normalizeNavigationState(JSON.parse(storedState));
    } catch (error) {
      // fallback to defaults
    }
  }

  return getDefaultNavigationState();
}

function updateNavigationState(mutator) {
  const state = getNavigationState();
  mutator(state);
  setNavigationState(state);
}

function getStoredSidebarCollapsed(defaultValue = false) {
  const state = getNavigationState();
  if (typeof state.sidebar.collapsed !== 'boolean') return defaultValue;
  return state.sidebar.collapsed;
}

function setStoredSidebarCollapsed(value) {
  updateNavigationState((state) => {
    state.sidebar.collapsed = Boolean(value);
  });
}

function getStoredTocCollapsed(defaultValue = false) {
  const state = getNavigationState();
  if (typeof state.toc.collapsed !== 'boolean') return defaultValue;
  return state.toc.collapsed;
}

function setStoredTocCollapsed(value) {
  updateNavigationState((state) => {
    state.toc.collapsed = Boolean(value);
  });
}

function getStoredSidebarWidth(
  minWidth,
  maxWidth = Number.POSITIVE_INFINITY
) {
  const state = getNavigationState();
  const width = state.sidebar.width;
  if (!Number.isFinite(width) || width <= 0) return null;
  return Math.max(minWidth, Math.min(maxWidth, width));
}

function setStoredSidebarWidth(width) {
  if (!Number.isFinite(width) || width <= 0) return;
  updateNavigationState((state) => {
    state.sidebar.width = Math.round(width);
  });
}

function updateToggleButtonState(buttonId, isCollapsed) {
  const button = document.getElementById(buttonId);
  if (!button) return;
  button.setAttribute('aria-expanded', String(!isCollapsed));
}

export function makeSideNavigation() {
  const sideNavigation = document.getElementById('temp-side-navigation');
  const sidebar = document.getElementById('sidebar');
  const sidebarTitle = document.querySelector('#sidebar .sidebar-title');
  const breadcrumbSection = document.querySelector('#sidebar > section');
  const sidebarToggleButton = document.getElementById('sidebar-toggle-btn');

  // 目次の折り畳み機能
  const tempSideNav = document.getElementById('temp-side-navigation');
  const navTitle = document.querySelector(
    '#temp-side-navigation .sidebar-title'
  );
  const navList = document.querySelector('#temp-side-navigation > ul');
  const tocToggleButton = document.getElementById('toc-toggle-btn');

  if (sidebarTitle && breadcrumbSection && sidebar) {
    const setSidebarCollapsed = (shouldCollapse, options = {}) => {
      const { persist = true } = options;

      if (shouldCollapse) {
        setStoredSidebarWidth(sidebar.offsetWidth);
        breadcrumbSection.classList.add('collapsed');
        sidebar.classList.add('collapsed');
        sidebar.style.width = '';
        sidebarManuallyResized = false;
        window.sidebarManuallyResized = false;
      } else {
        breadcrumbSection.classList.remove('collapsed');
        sidebar.classList.remove('collapsed');

        const savedWidth = getStoredSidebarWidth(
          SIDEBAR_MIN_WIDTH,
          SIDEBAR_MAX_WIDTH
        );
        if (savedWidth) {
          sidebar.style.width = `${savedWidth}px`;
          sidebarManuallyResized = true;
          window.sidebarManuallyResized = true;
        } else {
          sidebar.style.width = '';
          sidebarManuallyResized = false;
          window.sidebarManuallyResized = false;
        }
      }

      updateToggleButtonState(
        'sidebar-toggle-btn',
        sidebar.classList.contains('collapsed')
      );

      if (persist) {
        setStoredSidebarCollapsed(sidebar.classList.contains('collapsed'));
      }

      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 300);
    };

    const toggleSidebar = () => {
      const isCurrentlyCollapsed = sidebar.classList.contains('collapsed');
      setSidebarCollapsed(!isCurrentlyCollapsed);
    };

    const initialSidebarCollapsed = getStoredSidebarCollapsed(false);
    setSidebarCollapsed(initialSidebarCollapsed, { persist: false });

    sidebarTitle.addEventListener('click', function (event) {
      if (event.target.closest('.sidebar-controls')) return;
      toggleSidebar();
    });

    if (sidebarToggleButton) {
      sidebarToggleButton.addEventListener('click', function (event) {
        event.stopPropagation();
        toggleSidebar();
      });
    }
  }

  if (navTitle && navList && tempSideNav) {
    const setTocCollapsed = (shouldCollapse, options = {}) => {
      const { persist = true } = options;

      if (shouldCollapse) {
        navList.classList.add('collapsed');
        tempSideNav.classList.add('collapsed');
        tempSideNav.style.width = '';
      } else {
        navList.classList.remove('collapsed');
        tempSideNav.classList.remove('collapsed');
        tempSideNav.style.width = '';
      }

      updateToggleButtonState(
        'toc-toggle-btn',
        tempSideNav.classList.contains('collapsed')
      );

      if (persist) {
        setStoredTocCollapsed(tempSideNav.classList.contains('collapsed'));
      }

      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 300);
    };

    const toggleToc = () => {
      const isCurrentlyCollapsed = tempSideNav.classList.contains('collapsed');
      setTocCollapsed(!isCurrentlyCollapsed);
    };

    const initialTocCollapsed = getStoredTocCollapsed(false);
    setTocCollapsed(initialTocCollapsed, { persist: false });

    navTitle.addEventListener('click', function (event) {
      if (event.target.closest('.sidebar-controls')) return;
      toggleToc();
    });

    if (tocToggleButton) {
      tocToggleButton.addEventListener('click', function (event) {
        event.stopPropagation();
        toggleToc();
      });
    }
  }

  // リサイズ機能
  initSidebarResize();

  const items = [
    'overview',
    'internationally-curated',
    'japan-curated',
    'glycan-related-genes',
    'genetic-testing',
    'clinical-features',
    'human-genomic-datasets',
    'cell',
    'mouse',
    'dna',
    'clinvar',
    'mgend',
    'facial-features',
    'compounds',
    'references',
  ];

  items.forEach((itemId) => {
    const link = sideNavigation?.querySelector(`.nav-link.${itemId}`);
    if (!link) return;

    link.addEventListener('click', (event) => {
      if (link.classList.contains('-disabled')) {
        event.preventDefault();
        return;
      }

      const id = link.getAttribute('href').replace('#', '');
      switchingDisplayContents(id);
      document.getElementById('content').style.display = 'block';
    });
  });

  document.querySelectorAll('a[href="#bio-resource"]').forEach(function (aTag) {
    aTag.addEventListener('click', function (event) {
      if (this.classList.contains('-disabled')) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      const classList = this.classList[0];
      const selectName = 'bio-resources-' + classList;
      window.location.hash = selectName;
      const checkBox = document.getElementById(selectName);
      if (checkBox && !checkBox.checked) {
        checkBox.checked = true;
      }
    });
  });

  document.querySelectorAll('a[href="#genes"]').forEach(function (aTag) {
    aTag.addEventListener('click', function (event) {
      if (this.classList.contains('-disabled')) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      const classList = this.classList[0];
      const selectName = 'genes-' + classList;
      window.location.hash = selectName;
      const checkBox = document.getElementById(selectName);
      if (checkBox && !checkBox.checked) {
        checkBox.checked = true;
      }
    });
  });

  document.querySelectorAll('a[href="#variant"]').forEach(function (aTag) {
    aTag.addEventListener('click', function (event) {
      if (this.classList.contains('-disabled')) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      const classList = this.classList[0];
      const selectName = 'variants-' + classList;
      window.location.hash = selectName;
      const checkBox = document.getElementById(selectName);
      if (checkBox && !checkBox.checked) {
        checkBox.checked = true;
      }
    });
  });

  // processing when tabs are switched
  document.querySelectorAll('#genes .tab-switch').forEach(function (tabSwitch) {
    tabSwitch.addEventListener('change', function () {
      const selectedTabId = this.id.replace('genes-', '');
      const tocItem = document.querySelector('.genes a.' + selectedTabId);
      document.querySelectorAll('a').forEach(function (item) {
        item.classList.remove('selected');
      });
      if (tocItem) {
        if (!tocItem.classList.contains('-disabled')) {
          tocItem.classList.add('selected');
          window.location.hash = this.id;
        }
      }
    });
  });

  document
    .querySelectorAll('#bio-resource .tab-switch')
    .forEach(function (tabSwitch) {
      tabSwitch.addEventListener('change', function () {
        const selectedTabId = this.id.replace('bio-resources-', '');
        const tocItem = document.querySelector(
          '.bio-resource a.' + selectedTabId
        );
        document.querySelectorAll('a').forEach(function (item) {
          item.classList.remove('selected');
        });
        if (tocItem) {
          if (!tocItem.classList.contains('-disabled')) {
            tocItem.classList.add('selected');
            window.location.hash = this.id;
          }
        }
      });
    });

  document
    .querySelectorAll('#variant .tab-switch')
    .forEach(function (tabSwitch) {
      tabSwitch.addEventListener('change', function () {
        const selectedTabId = this.id.replace('variants-', '');
        const tocItem = document.querySelector('.variant a.' + selectedTabId);
        document.querySelectorAll('a').forEach(function (item) {
          item.classList.remove('selected');
        });
        if (tocItem) {
          if (!tocItem.classList.contains('-disabled')) {
            tocItem.classList.add('selected');
            window.location.hash = this.id;
          }
        }
      });
    });
}

export function switchingDisplayContents(selectedItemId) {
  const items = [
    '#overview',
    '#temp-disease-definition',
    '#genes',
    '#glycan-related-genes',
    '#genetic-testing',
    '#clinical-features',
    '#bio-resource',
    '#variant',
  ];

  // まず、全てのコンテンツを非表示にする
  const allContentSections = [
    '#overview',
    '#genes',
    '#glycan-related-genes',
    '#genetic-testing',
    '#clinical-features',
    '#human-genomic-datasets',
    '#bio-resource',
    '#variant',
    '#facial-features',
    '#references',
  ];

  // ローディングスピナーを追加
  const contentElement = document.getElementById('content');
  if (contentElement) {
    // 既存のローディングスピナーがあれば削除
    const existingSpinner = contentElement.querySelector('.loading-spinner');
    if (existingSpinner) {
      existingSpinner.remove();
    }

    // ローディングスピナーを追加
    const loadingSpinner = document.createElement('div');
    loadingSpinner.className = 'loading-spinner -content';
    contentElement.appendChild(loadingSpinner);
  }

  // Hide all elements
  allContentSections.forEach((selector) => toggleDisplay(selector));

  // タブIDと目次クラス名の整合を取る（genes-/bio-resources-/variants- を除去）
  let modifiedSelectedId = selectedItemId;
  if (modifiedSelectedId.startsWith('genes-')) {
    modifiedSelectedId = modifiedSelectedId.substring('genes-'.length);
  } else if (modifiedSelectedId.startsWith('bio-resources-')) {
    modifiedSelectedId = modifiedSelectedId.substring('bio-resources-'.length);
  } else if (modifiedSelectedId.startsWith('variants-')) {
    modifiedSelectedId = modifiedSelectedId.substring('variants-'.length);
  }

  const currentItemEl = document.querySelector(`.${modifiedSelectedId}`);
  if (currentItemEl && !currentItemEl.classList.contains('-disabled')) {
    // まず、全てのコンテンツを非表示にする
    const allContentSections = [
      '#overview',
      '#genes',
      '#glycan-related-genes',
      '#genetic-testing',
      '#clinical-features',
      '#bio-resource',
      '#variant',
      '#facial-features',
      '#compounds',
      '#references',
    ];

    allContentSections.forEach((selector) => {
      if (selector !== `#${selectedItemId}`) {
        toggleDisplay(selector, 'none');
      }
    });

    // Show selected items
    switch (selectedItemId) {
      case 'overview':
        toggleDisplay('#overview', 'block');
        ['.temp-wrapper', '#temp-disease-definition'].forEach((selector) => {
          toggleDisplay(selector, 'block');
        });
        break;
      case 'temp-disease-definition':
      case 'glycan-related-genes':
      case 'genetic-testing':
      case 'clinical-features':
        prepareDataWrapper();
        toggleDisplay(`#${selectedItemId}`, 'block');
        break;
      case 'genes':
      case 'genes-internationally-curated':
      case 'genes-japan-curated':
        prepareDataWrapper();
        window.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
        toggleDisplay('#genes', 'block');
        let checkBoxGenes = document.getElementById(selectedItemId);
        if (checkBoxGenes) checkBoxGenes.checked = true;
        updateGenesSelection('#genes .tab-switch:checked');
        break;
      case 'bio-resource':
      case 'bio-resources-cell':
      case 'bio-resources-mouse':
      case 'bio-resources-dna':
        prepareDataWrapper();
        window.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
        toggleDisplay('#bio-resource', 'block');
        let checkBoxBrc = document.getElementById(selectedItemId);
        if (checkBoxBrc) checkBoxBrc.checked = true;
        updateBioSelection('#bio-resource .tab-switch:checked');
        break;
      case 'variant':
      case 'variants-clinvar':
      case 'variants-mgend':
        prepareDataWrapper();
        window.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
        toggleDisplay('#variant', 'block');
        let checkBoxVariant = document.getElementById(selectedItemId);
        if (checkBoxVariant) checkBoxVariant.checked = true;
        updateVariantSelection('#variant .tab-switch:checked');
        break;
      case 'facial-features':
        prepareDataWrapper();
        toggleDisplay(`#${selectedItemId}`, 'block');
        break;
      case 'compounds':
      case 'human-genomic-datasets':
        prepareDataWrapper();
        toggleDisplay(`#${selectedItemId}`, 'block');
        break;
      case 'references':
        prepareDataWrapper();
        toggleDisplay(`#${selectedItemId}`, 'block');
        break;
      default:
        window.location.href = window.location.href.split('#')[0];
    }

    // コンテンツ表示後、ローディングスピナーを削除
    const spinner = document.querySelector('#content > .loading-spinner');
    if (spinner) {
      spinner.remove();
    }

    // コンテンツの可視性を戻す
    const contentElement = document.getElementById('content');
    if (contentElement) {
      const contentChildren = contentElement.children;
      for (let i = 0; i < contentChildren.length; i++) {
        contentChildren[i].style.visibility = 'visible';
      }
    }
  }
}

function toggleDisplay(selector, displayStyle = 'none') {
  const element = document.querySelector(selector);
  if (element) element.style.display = displayStyle;
}

function prepareDataWrapper() {
  const dataWrapper = document.getElementById('data-wrapper');
  const summary = document.querySelector('.summary-header');
  if (dataWrapper.firstChild !== summary) {
    dataWrapper.insertBefore(summary, dataWrapper.firstChild);
  }
}

function updateBioSelection(selector) {
  const checkedSwitch = document.querySelector(selector);
  if (checkedSwitch) {
    window.location.hash = checkedSwitch.id;
  }
}

function updateGenesSelection(selector) {
  const checkedSwitch = document.querySelector(selector);
  if (checkedSwitch) {
    window.location.hash = checkedSwitch.id;
  }
}

function updateVariantSelection(selector) {
  const checkedSwitch = document.querySelector(selector);
  if (checkedSwitch) {
    window.location.hash = checkedSwitch.id;
  }
}

// 疾患選択のリサイズ機能
function initSidebarResize() {
  const sidebar = document.getElementById('sidebar');
  const resizeHandle = document.getElementById('sidebar-resize-handle');

  if (!sidebar || !resizeHandle) return;

  let isResizing = false;
  let startX = 0;
  let startWidth = 0;

  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = sidebar.offsetWidth;

    // リサイズ中はtransitionを無効化
    sidebar.style.transition = 'none';

    // ドラッグ中のカーソルを変更
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    const deltaX = e.clientX - startX;
    let newWidth = startWidth + deltaX;

    // 最小・最大幅の制限
    newWidth = Math.max(
      SIDEBAR_MIN_WIDTH,
      Math.min(SIDEBAR_MAX_WIDTH, newWidth)
    );

    sidebar.style.width = `${newWidth}px`;
  });

  document.addEventListener('mouseup', () => {
    if (!isResizing) return;

    isResizing = false;

    // 手動リサイズが行われたことを記録
    sidebarManuallyResized = true;
    window.sidebarManuallyResized = true;
    setStoredSidebarWidth(sidebar.offsetWidth);

    // カーソルを元に戻す
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });
}
