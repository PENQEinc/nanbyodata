export function makeSideNavigation() {
  const sideNavigation = document.getElementById('temp-side-navigation');
  const sideNavigationUl = sideNavigation.querySelector('ul');
  const items = [
    'overview',
    'causal-genes',
    'genetic-testing',
    'phenotypes',
    'bio-resource',
    'variant',
  ];
  const lis = sideNavigationUl.querySelectorAll('li');
  lis.forEach((li) => {
    li.addEventListener('click', (event) => {
      const link = li.querySelector('a');
      if (link.classList.contains('-disabled')) {
        event.preventDefault();
        return;
      }
      const id = link.getAttribute('href').replace('#', '');
      switchingDisplayContents(id);
      document.getElementById('content').style.display = 'block';
    });
  });

  items.forEach((id) => {
    const liElement = document.getElementById(id);
    if (!liElement) {
      switch (id) {
        case 'bio-resource':
        case 'variant':
          const elementToRemove = document.querySelector(`.${id}`);
          if (elementToRemove && elementToRemove.parentNode) {
            elementToRemove.parentNode.remove();
          }
          break;
        default:
          const anchorElement = document.querySelector(`[href="#${id}"]`);
          if (anchorElement && anchorElement.parentElement) {
            const liToRemove = anchorElement.parentElement;
            if (liToRemove.parentNode) {
              liToRemove.remove();
            }
          }
          break;
      }
    }
  });

  document.querySelectorAll('a[href="#bio-resource"]').forEach(function (aTag) {
    aTag.addEventListener('click', function (event) {
      if (this.classList.contains('-disabled')) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      const classList = this.classList[0];
      const selectName = 'bio-resource-' + classList;
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
      const selectName = 'variant-' + classList;
      window.location.hash = selectName;
      const checkBox = document.getElementById(selectName);
      if (checkBox && !checkBox.checked) {
        checkBox.checked = true;
      }
    });
  });

  // processing when tabs are switched
  document
    .querySelectorAll('#bio-resource .tab-switch')
    .forEach(function (tabSwitch) {
      tabSwitch.addEventListener('change', function () {
        const selectedTabId = this.id.replace('bio-resource-', '');
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
        const selectedTabId = this.id.replace('variant-', '');
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
    '#causal-genes',
    '#genetic-testing',
    '#phenotypes',
    '#bio-resource',
    '#variant',
  ];

  // Hide all elements
  items.forEach((selector) => toggleDisplay(selector));
  const currentItemEl = document.querySelector(`.${selectedItemId}`);
  if (!currentItemEl.classList.contains('-disabled')) {
    // Show selected items
    switch (selectedItemId) {
      case 'overview':
        toggleDisplay('#overview', 'block');
        ['temp-aliases', '.temp-wrapper', '#temp-disease-definition'].forEach(
          (selector) => {
            toggleDisplay(selector, 'block');
          }
        );
        break;
      case 'temp-disease-definition':
      case 'causal-genes':
      case 'genetic-testing':
      case 'phenotypes':
        prepareDataWrapper();
        toggleDisplay(`#${selectedItemId}`, 'block');
        break;
      case 'bio-resource':
      case 'bio-resource-cell':
      case 'bio-resource-mouse':
      case 'bio-resource-dna':
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
      case 'variant-clinvar':
      case 'variant-mgend':
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
      default:
        window.location.href = window.location.href.split('#')[0];
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

function updateVariantSelection(selector) {
  const checkedSwitch = document.querySelector(selector);
  if (checkedSwitch) {
    window.location.hash = checkedSwitch.id;
  }
}
