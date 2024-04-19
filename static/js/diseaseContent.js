import { makeSideNavigation } from './diseaseSideNavigation.js';
import {
  causalGeneColumns,
  geneticTestingColumns,
  phenotypesJaColumns,
  phenotypesEnColumns,
  bioResourceCellColumns,
  bioResourceMouseColumns,
  bioResourceDnaColumns,
  variantClinvarColumns,
  convertColumntoText
} from './paginationColumns.js';

// causalGene(疾患原因遺伝子)
export function makeCausalGene(causalGeneData) {
  makeData(
    causalGeneData,
    'causal-genes',
    'causal-genes-table',
    convertColumntoText(causalGeneColumns)
  );
}

// geneticTesting(診療用遺伝学的検査情報)
export function makeGeneticTesting(geneticTestingData) {
  makeData(
    geneticTestingData,
    'genetic-testing',
    'genetic-testing-table',
    convertColumntoText(geneticTestingColumns)
  );
}

// phenotypes(臨床的特徴)
export function makePhenotypes(phenotypesData) {
  const currentLang = document.querySelector('.language-select').value;
  const phenotypeLang = currentLang === 'ja' ? 'phenotype-ja' : 'phenotype-en';
  const columns = {
    ja: convertColumntoText(phenotypesJaColumns),
    en: convertColumntoText(phenotypesEnColumns),
  };
  makeData(phenotypesData, 'phenotypes', phenotypeLang, columns[currentLang]);
}

// bioResource(難病特異的バイオリソース)
export function makeBioResource(cellData, mouseData, dnaData) {
  const bioResource = document.getElementById('bio-resource');
  const tabWrap = bioResource.querySelector('.tab-wrap');

  const cellDataset = processDataAndRemoveNavItems(
    'bio-resource',
    cellData,
    'cell'
  );
  const mouseDataset = processDataAndRemoveNavItems(
    'bio-resource',
    mouseData,
    'mouse'
  );
  const dnaDataset = processDataAndRemoveNavItems(
    'bio-resource',
    dnaData,
    'dna'
  );

  const items = [
    {
      existing: cellDataset.hasData,
      id: 'cell',
      columns: convertColumntoText(bioResourceCellColumns),
      data: cellData,
      object: cellDataset.dataObject,
    },
    {
      existing: mouseDataset.hasData,
      id: 'mouse',
      columns: convertColumntoText(bioResourceMouseColumns),
      data: mouseData,
      object: mouseDataset.dataObject,
    },
    {
      existing: dnaDataset.hasData,
      id: 'dna',
      columns: convertColumntoText(bioResourceDnaColumns),
      data: dnaData,
      object: dnaDataset.dataObject,
    },
  ];

  processTabs(items, 'bio-resource', tabWrap);
}

// variant(バリアント)
export function makeVariant(clinvarData, mgendData, entryData) {
  const variant = document.getElementById('variant');
  const tabWrap = variant.querySelector('.tab-wrap');

  const clinvarDataset = processDataAndRemoveNavItems(
    'variant',
    clinvarData,
    'clinvar'
  );
  const mgendDataset = processDataAndRemoveNavItems(
    'variant',
    mgendData,
    'mgend'
  );

  const items = [
    {
      existing: clinvarDataset.hasData,
      id: 'clinvar',
      columns: convertColumntoText(variantClinvarColumns),
      data: clinvarData,
      object: clinvarDataset.dataObject,
    },
    {
      existing: mgendDataset.hasData,
      id: 'mgend',
      columns: '',
      data: mgendData,
      object: mgendDataset.dataObject,
    },
  ];

  processTabs(items, 'variant', tabWrap);

  makeSideNavigation(entryData);
  // finish loading
  document.querySelector('.loading-spinner').style.display = 'none';
  document.getElementById('content').style.display = 'block';
  document.getElementById('sidebar').style.display = 'block';
}

/**
 * Generates and updates data table for causalGene, geneticTesting and phenotypes.
 * @param {Array} data - Data from API (e.g., causalGeneData, geneticTestingData, phenotypesData).
 * @param {string} categoryName - Category name (e.g., 'causal-genes', 'genetic-testing', 'phenotypes').
 * @param {string} tableId - Table element ID (e.g., 'causal-genes-table', 'genetic-testing-table', 'phenotype-ja', 'phenotype-en').
 * @param {string} columns - Columns for togostanza-pagination-table.
 */
function makeData(data, categoryName, tableId, columns) {
  const container = document.getElementById(categoryName);
  if (Array.isArray(data) && data.length === 0) {
    container.remove();
    return;
  }
  const tableView = container.querySelector(`#${tableId}`);
  const objectUrl = createObjectUrlFromData(data);
  updateElementWithTable(tableView, objectUrl, columns);
  updateDataNumElement(`#${categoryName}`, `.${categoryName}`, data.length);
}

/**
 * Creates an object URL from the provided data.
 * @param {Array} data - The data to be converted to JSON.
 * @returns {string} - The object URL created from the data.
 */
function createObjectUrlFromData(data) {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  return URL.createObjectURL(blob);
}

/**
 * Updates the specified HTML element with a table using the provided object URL and columns.
 * @param {HTMLElement} element - The HTML element to be updated for the table.
 * @param {string} objectUrl - The object URL containing the data for the table.
 * @param {string} columns - The columns configuration for the table.
 */
function updateElementWithTable(element, objectUrl, columns) {
  element.innerHTML = `
    <togostanza-pagination-table
      data-url="${objectUrl}"
      data-type="json"
      custom-css-url="https://togostanza.github.io/togostanza-themes/contrib/nanbyodata.css"
      fixed-columns="1"
      page-size-option="100"
      page-slider="false"
      columns="${columns}"
    ></togostanza-pagination-table>
  `;
}

/**
 * Updates the data number element with the provided data length in both the main content area and the navigation area.
 * @param {string} mainWrapperName - The name of the main wrapper element.
 * @param {string} navWrapperName - The name of the navigation wrapper element.
 * @param {number} dataLength - The length of the data.
 */
function updateDataNumElement(mainWrapperName, navWrapperName, dataLength) {
  const mainContentNumberEl = document.querySelector(
    `${mainWrapperName} .data-num`
  );
  const navContentNumberEl = document.querySelector(
    `${navWrapperName} .data-num`
  );
  mainContentNumberEl.innerText = dataLength;
  navContentNumberEl.innerText = dataLength;
}

// for BioResource & Variant
/**
 * Processes tabs for BioResource & Variant.
 * @param {Object[]} items - Array of tab items.
 * @param {string} rootId - ID of the root element.
 * @param {HTMLElement} tabWrap - The tab wrapper element.
 */
function processTabs(items, rootId, tabWrap) {
  if (!items.some((item) => item.existing)) {
    // If all tabs do not exist, remove the element
    document.getElementById(rootId).remove();
  } else {
    let isFirstTab = true;
    items.forEach(({ existing, id, columns, data, object }) => {
      if (!existing) {
        // If there is no data, remove the input, label, and div
        document.getElementById(`${rootId}-${id}`).remove();
        tabWrap.querySelector(`label.tab-label.${rootId}-${id}`).remove();
        tabWrap.querySelector(`.tab-content.${id}`).remove();
      } else {
        const tableView = tabWrap.querySelector(`.${id}`);
        const currentTab = tabWrap.querySelector(`#${rootId}-${id}`);
        if (currentTab && isFirstTab) {
          currentTab.checked = true;
          isFirstTab = false;
        }
        updateElementWithTable(tableView, object, columns);
        updateDataNumElement(`.${rootId}-${id}`, `.${id}`, data.length);
      }
    });
  }
}

/**
 * Processes the provided data and removes navigation items if the data does not exist.
 * @param {string} rootId - The root ID of the elements.
 * @param {Array} data - The data to be processed.
 * @param {string} className - The class name of the navigation item.
 * @returns {Object} - An object containing information about the processed data.
 */
function processDataAndRemoveNavItems(rootId, data, className) {
  const processDataResult = processData(data);
  removeNavItemIfNotExist(rootId, processDataResult.hasData, className);
  return processDataResult;
}
/**
 * Processes the provided data and checks if it exists.
 * @param {Array} data - The data to be processed.
 * @returns {Object} - An object containing information about the processed data.
 */
function processData(data) {
  let hasData = false;
  let dataObject = null;
  if (Array.isArray(data) && data.length > 0) {
    hasData = true;
    dataObject = createObjectUrlFromData(data);
  }
  return { hasData, dataObject };
}
/**
 * Removes the navigation item if the provided data does not exist.
 * @param {string} rootId - The root ID of the elements.
 * @param {boolean} hasData - Indicates whether the data exists.
 * @param {string} className - The class name of the navigation item.
 */
function removeNavItemIfNotExist(rootId, hasData, className) {
  if (!hasData) {
    const navItem = document.querySelector(`.${rootId} .${className}.nav-link`);
    if (navItem) {
      navItem.parentElement.remove();
    }
  }
}
