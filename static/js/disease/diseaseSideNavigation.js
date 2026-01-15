// 手動リサイズフラグ（グローバル）
let sidebarManuallyResized = false;
// windowオブジェクトに公開（treeview_component.htmlから参照するため）
window.sidebarManuallyResized = false;

export function makeSideNavigation() {
  const sideNavigation = document.getElementById('temp-side-navigation');

  // 疾患選択の折り畳み機能
  const sidebar = document.getElementById('sidebar');
  const sidebarTitle = document.querySelector('#sidebar .sidebar-title');
  const breadcrumbSection = document.querySelector('#sidebar > section');
  if (sidebarTitle && breadcrumbSection && sidebar) {
    // 初期状態：疾患選択を閉じた状態にする
    breadcrumbSection.classList.add('collapsed');
    sidebar.classList.add('collapsed');

    sidebarTitle.addEventListener('click', function () {
      const isCurrentlyCollapsed = sidebar.classList.contains('collapsed');

      breadcrumbSection.classList.toggle('collapsed');
      sidebar.classList.toggle('collapsed');

      if (!isCurrentlyCollapsed) {
        // これから閉じる場合：widthをリセット、フラグもリセット
        sidebar.style.width = '';
        sidebarManuallyResized = false;
        window.sidebarManuallyResized = false;
      } else {
        // これから開く場合：フラグをリセット（自動調整を有効化）
        sidebarManuallyResized = false;
        window.sidebarManuallyResized = false;
      }

      // treeviewの幅を再調整するため、カスタムイベントを発火
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 300); // CSSのtransitionが完了するまで待つ
    });
  }

  // リサイズ機能
  initSidebarResize();
  initTocResize();

  // 目次の折り畳み機能
  const tempSideNav = document.getElementById('temp-side-navigation');
  const navTitle = document.querySelector(
    '#temp-side-navigation .sidebar-title'
  );
  const navList = document.querySelector('#temp-side-navigation > ul');
  if (navTitle && navList && tempSideNav) {
    navTitle.addEventListener('click', function () {
      const isCurrentlyCollapsed = tempSideNav.classList.contains('collapsed');

      navList.classList.toggle('collapsed');
      tempSideNav.classList.toggle('collapsed');

      if (!isCurrentlyCollapsed) {
        // これから閉じる場合：widthをリセット
        tempSideNav.style.width = '';
      } else {
        // これから開く場合：初期幅250pxに設定
        tempSideNav.style.width = '250px';
      }
    });
  }

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
    const link = sideNavigation.querySelector(`.nav-link.${itemId}`);
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
    loadingSpinner.className = 'loading-spinner';
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
    const minWidth = 250;
    const maxWidth = 1200;
    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

    sidebar.style.width = `${newWidth}px`;
  });

  document.addEventListener('mouseup', () => {
    if (!isResizing) return;

    isResizing = false;

    // 手動リサイズが行われたことを記録
    sidebarManuallyResized = true;
    window.sidebarManuallyResized = true;

    // カーソルを元に戻す
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });
}

// 目次のリサイズ機能
function initTocResize() {
  const tocNav = document.getElementById('temp-side-navigation');
  const resizeHandle = document.getElementById('toc-resize-handle');

  if (!tocNav || !resizeHandle) return;

  let isResizing = false;
  let startX = 0;
  let startWidth = 0;

  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = tocNav.offsetWidth;

    // リサイズ中はtransitionを無効化
    tocNav.style.transition = 'none';

    // ドラッグ中のカーソルを変更
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    const deltaX = e.clientX - startX;
    let newWidth = startWidth + deltaX;

    // 最小幅の制限のみ（最大幅の制限を削除）
    const minWidth = 250;
    newWidth = Math.max(minWidth, newWidth);

    tocNav.style.width = `${newWidth}px`;
  });

  document.addEventListener('mouseup', () => {
    if (!isResizing) return;

    isResizing = false;

    // カーソルを元に戻す
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });
}
