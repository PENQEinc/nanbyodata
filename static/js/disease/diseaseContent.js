import { makeSideNavigation } from './diseaseSideNavigation.js';
import {
  geneColumns,
  referenceGeneColumns,
  glycanRelatedGeneColumns,
  geneticTestingColumns,
  phenotypesJaColumns,
  phenotypesEnColumns,
  humanGenomicDatasetsJaColumns,
  humanGenomicDatasetsEnColumns,
  referencesColumns,
  bioResourceCellColumns,
  bioResourceMouseJaColumns,
  bioResourceMouseEnColumns,
  bioResourceDnaColumns,
  variantClinvarColumns,
  variantMgendColumns,
  facialFeaturesColumns,
  compoundsColumns,
  convertColumnToText,
} from '../utils/stanzaColumns.js';

import {
  createObjectUrlFromData,
  updateElementWithTable,
} from '../utils/stanzaUtils.js';

makeSideNavigation();

// internationallyCuratedGenes(国際リソース由来の疾患関連遺伝子)
export function makeInternationallyCuratedGenes(geneData) {
  const genes = document.getElementById('genes');
  const tabWrap = genes.querySelector('.tab-wrap');

  const genesDataset = processData(geneData);
  // gene_symbolの重複を除外したユニークな値の数を計算
  let uniqueGeneSymbolCount = 0;
  if (geneData && Array.isArray(geneData) && geneData.length > 0) {
    const uniqueGeneSymbols = new Set();
    geneData.forEach((gene) => {
      if (gene.gene_symbol) {
        uniqueGeneSymbols.add(gene.gene_symbol);
      }
    });
    uniqueGeneSymbolCount = uniqueGeneSymbols.size;
  }

  const items = {
    id: 'internationally-curated',
    columns: convertColumnToText(geneColumns),
    data: geneData,
    object: genesDataset.dataObject,
  };

  processTabs(items, 'genes', tabWrap, uniqueGeneSymbolCount);
  if (geneData?.length > 0 && geneData !== null) {
    const navLink = document.querySelector('.nav-link.internationally-curated');
    const genesWrapper = document.querySelector('.genes');
    navLink.style.cursor = 'pointer';
    navLink.classList.remove('-disabled');
    genesWrapper.classList.remove('-disabled');
  } else {
    document.querySelector('#genes-internationally-curated').remove();
    document.querySelector('.tab-label.genes-internationally-curated').remove();
    document.querySelector('.tab-content.internationally-curated').remove();
  }
}

// japanCuratedGenes(国内基準由来の疾患関連遺伝子)
export function makeJapanCuratedGenes(japanCuratedGeneData) {
  const genes = document.getElementById('genes');
  const tabWrap = genes.querySelector('.tab-wrap');

  const japanCuratedGenesDataset = processData(japanCuratedGeneData);

  // symbolの重複を除外したユニークな値の数を計算
  let uniqueJapanCuratedSymbolCount = 0;
  if (
    japanCuratedGeneData &&
    Array.isArray(japanCuratedGeneData) &&
    japanCuratedGeneData.length > 0
  ) {
    const uniqueJapanCuratedSymbols = new Set();
    japanCuratedGeneData.forEach((gene) => {
      if (gene.symbol) {
        uniqueJapanCuratedSymbols.add(gene.symbol);
      }
    });
    uniqueJapanCuratedSymbolCount = uniqueJapanCuratedSymbols.size;
  }

  const items = {
    id: 'japan-curated',
    columns: convertColumnToText(referenceGeneColumns),
    data: japanCuratedGeneData,
    object: japanCuratedGenesDataset.dataObject,
  };

  processTabs(items, 'genes', tabWrap, uniqueJapanCuratedSymbolCount);
  if (japanCuratedGeneData?.length > 0 && japanCuratedGeneData !== null) {
    const navLink = document.querySelector('.nav-link.japan-curated');
    const genesWrapper = document.querySelector('.genes');
    navLink.style.cursor = 'pointer';
    navLink.classList.remove('-disabled');
    genesWrapper.classList.remove('-disabled');
  } else {
    document.querySelector('#genes-japan-curated').remove();
    document.querySelector('.tab-label.genes-japan-curated').remove();
    document.querySelector('.tab-content.japan-curated').remove();
  }
}

// glycanRelatedGene(糖鎖関連遺伝子)
export function makeGlycanRelatedGene(glycanRelatedGeneData) {
  // gene_idの重複を除外したユニークな値の数を計算
  let uniqueGeneIdCount = 0;
  if (
    glycanRelatedGeneData &&
    Array.isArray(glycanRelatedGeneData) &&
    glycanRelatedGeneData.length > 0
  ) {
    const uniqueGeneIds = new Set();
    glycanRelatedGeneData.forEach((gene) => {
      if (gene.gene_id) {
        uniqueGeneIds.add(gene.gene_id);
      }
    });
    uniqueGeneIdCount = uniqueGeneIds.size;
  }

  makeData(
    glycanRelatedGeneData,
    'glycan-related-genes',
    'glycan-related-genes-table',
    convertColumnToText(glycanRelatedGeneColumns),
    uniqueGeneIdCount, // 重複のないgene_idの数を渡す
    'https://togostanza.github.io/togostanza-themes/contrib/nanbyodata-glycan.css'
  );
  if (glycanRelatedGeneData?.length > 0 && glycanRelatedGeneData !== null) {
    const navLink = document.querySelector('.nav-link.glycan-related-genes');
    navLink.style.cursor = 'pointer';
    navLink.classList.remove('-disabled');
  }
}

// geneticTesting(診療用遺伝学的検査)
export function makeGeneticTesting(geneticTestingData) {
  makeData(
    geneticTestingData,
    'genetic-testing',
    'genetic-testing-table',
    convertColumnToText(geneticTestingColumns)
  );
  if (geneticTestingData?.length > 0 && geneticTestingData !== null) {
    const navLink = document.querySelector('.nav-link.genetic-testing');
    navLink.style.cursor = 'pointer';
    navLink.classList.remove('-disabled');
  }
}

// phenotypes(臨床的特徴)
export function makePhenotypes(phenotypesData) {
  // hpo_idの重複を除外したユニークな値の数を計算
  let uniqueHpoIdCount = 0;
  if (
    phenotypesData &&
    Array.isArray(phenotypesData) &&
    phenotypesData.length > 0
  ) {
    const uniqueHpoIds = new Set();
    phenotypesData.forEach((phenotype) => {
      if (phenotype.hpo_id) {
        uniqueHpoIds.add(phenotype.hpo_id);
      }
    });
    uniqueHpoIdCount = uniqueHpoIds.size;
  }

  const currentLang = document.querySelector('.language-select').value;
  const phenotypeLang = currentLang === 'ja' ? 'phenotype-ja' : 'phenotype-en';
  const columns = {
    ja: convertColumnToText(phenotypesJaColumns),
    en: convertColumnToText(phenotypesEnColumns),
  };
  makeData(
    phenotypesData,
    'clinical-features',
    phenotypeLang,
    columns[currentLang],
    uniqueHpoIdCount
  );
  if (phenotypesData?.length > 0 && phenotypesData !== null) {
    const navLink = document.querySelector('.nav-link.clinical-features');
    navLink.style.cursor = 'pointer';
    navLink.classList.remove('-disabled');
  }
}

// humanGenomicDatasets(ヒトゲノムデータセット)
export function makeHumanGenomicDatasets(humanGenomicDatasetsData) {
  const currentLang = document.querySelector('.language-select').value;
  const humanGenomicDatasetsLang =
    currentLang === 'ja'
      ? 'human-genomic-datasets-ja'
      : 'human-genomic-datasets-en';
  const columns = {
    ja: convertColumnToText(humanGenomicDatasetsJaColumns),
    en: convertColumnToText(humanGenomicDatasetsEnColumns),
  };
  makeData(
    humanGenomicDatasetsData,
    'human-genomic-datasets',
    humanGenomicDatasetsLang,
    columns[currentLang],
    humanGenomicDatasetsData?.length || 0
  );
  if (
    humanGenomicDatasetsData?.length > 0 &&
    humanGenomicDatasetsData !== null
  ) {
    const navLink = document.querySelector('.nav-link.human-genomic-datasets');
    navLink.style.cursor = 'pointer';
    navLink.classList.remove('-disabled');
  }
}

// references(文献)
export function makeReferences(referencesData) {
  const columns = convertColumnToText(referencesColumns);
  makeData(
    referencesData,
    'references',
    'references-table',
    columns,
    referencesData?.length || 0
  );
  if (referencesData?.length > 0 && referencesData !== null) {
    const navLink = document.querySelector('.nav-link.references');
    navLink.style.cursor = 'pointer';
    navLink.classList.remove('-disabled');
  }
}

// bioResource(難病特異的バイオリソース)
// Cell
export function makeCell(cellData) {
  const bioResource = document.getElementById('bio-resource');
  const tabWrap = bioResource.querySelector('.tab-wrap');

  const cellDataset = processData(cellData);

  const items = {
    id: 'cell',
    columns: convertColumnToText(bioResourceCellColumns),
    data: cellData,
    object: cellDataset.dataObject,
  };

  processTabs(items, 'bio-resources', tabWrap);
  if (cellData?.length > 0 && cellData !== null) {
    const navLink = document.querySelector('.nav-link.cell');
    const bioResource = document.querySelector('.bio-resource');
    navLink.style.cursor = 'pointer';
    navLink.classList.remove('-disabled');
    bioResource.classList.remove('-disabled');
  } else {
    document.querySelector('#bio-resources-cell').remove();
    document.querySelector('.tab-label.bio-resources-cell').remove();
    document.querySelector('.tab-content.cell').remove();
  }
}

// Mouse
export function makeMouse(mouseData) {
  const bioResource = document.getElementById('bio-resource');
  const tabWrap = bioResource.querySelector('.tab-wrap');

  // mouse_idの重複を除外したユニークな値の数を計算
  let uniqueMouseIdCount = 0;
  if (mouseData && Array.isArray(mouseData) && mouseData.length > 0) {
    const uniqueMouseIds = new Set();
    mouseData.forEach((mouse) => {
      if (mouse.mouse_id) {
        uniqueMouseIds.add(mouse.mouse_id);
      }
    });
    uniqueMouseIdCount = uniqueMouseIds.size;
  }

  const mouseDataset = processData(mouseData);
  const currentLang = document.querySelector('.language-select').value;
  const mouseColumns =
    currentLang === 'ja'
      ? bioResourceMouseJaColumns
      : bioResourceMouseEnColumns;

  const items = {
    id: 'mouse',
    columns: convertColumnToText(mouseColumns),
    data: mouseData,
    object: mouseDataset.dataObject,
  };

  processTabs(items, 'bio-resources', tabWrap, uniqueMouseIdCount);
  if (mouseData?.length > 0 && mouseData !== null) {
    const navLink = document.querySelector('.nav-link.mouse');
    const bioResource = document.querySelector('.bio-resource');
    navLink.style.cursor = 'pointer';
    navLink.classList.remove('-disabled');
    bioResource.classList.remove('-disabled');
  } else {
    document.querySelector('#bio-resources-mouse').remove();
    document.querySelector('.tab-label.bio-resources-mouse').remove();
    document.querySelector('.tab-content.mouse').remove();
  }
}

// DNA
export function makeDNA(dnaData) {
  const bioResource = document.getElementById('bio-resource');
  const tabWrap = bioResource.querySelector('.tab-wrap');

  const dnaDataset = processData(dnaData);

  const items = {
    id: 'dna',
    columns: convertColumnToText(bioResourceDnaColumns),
    data: dnaData,
    object: dnaDataset.dataObject,
  };

  processTabs(items, 'bio-resources', tabWrap);
  if (dnaData?.length > 0 && dnaData !== null) {
    const navLink = document.querySelector('.nav-link.dna');
    const bioResource = document.querySelector('.bio-resource');
    navLink.style.cursor = 'pointer';
    navLink.classList.remove('-disabled');
    bioResource.classList.remove('-disabled');
  } else {
    document.querySelector('#bio-resources-dna').remove();
    document.querySelector('.tab-label.bio-resources-dna').remove();
    document.querySelector('.tab-content.dna').remove();
  }
}

// variant(バリアント)
// Clinvar
export function makeClinvar(clinvarData) {
  const variant = document.getElementById('variant');
  const tabWrap = variant.querySelector('.tab-wrap');

  const clinvarDataset = processData(clinvarData);

  const items = {
    id: 'clinvar',
    columns: convertColumnToText(variantClinvarColumns),
    data: clinvarData,
    object: clinvarDataset.dataObject,
  };

  processTabs(items, 'variants', tabWrap);
  if (clinvarData?.length > 0 && clinvarData !== null) {
    const navLink = document.querySelector('.nav-link.clinvar');
    const variant = document.querySelector('.variant');
    navLink.style.cursor = 'pointer';
    navLink.classList.remove('-disabled');
    variant.classList.remove('-disabled');
  } else {
    document.querySelector('#variants-clinvar').remove();
    document.querySelector('.tab-label.variants-clinvar').remove();
    document.querySelector('.tab-content.clinvar').remove();
  }
}

// Mgend
export function makeMgend(mgendData) {
  const variant = document.getElementById('variant');
  const tabWrap = variant.querySelector('.tab-wrap');

  const mgendDataset = processData(mgendData);

  const items = {
    id: 'mgend',
    columns: convertColumnToText(variantMgendColumns),
    data: mgendData,
    object: mgendDataset.dataObject,
  };

  processTabs(items, 'variants', tabWrap);
  if (mgendData?.length > 0 && mgendData !== null) {
    const navLink = document.querySelector('.nav-link.mgend');
    const variant = document.querySelector('.variant');
    navLink.style.cursor = 'pointer';
    navLink.classList.remove('-disabled');
    variant.classList.remove('-disabled');
  } else {
    document.querySelector('#variants-mgend').remove();
    document.querySelector('.tab-label.variants-mgend').remove();
    document.querySelector('.tab-content.mgend').remove();
  }
}

// Facial Features
export function makeFacialFeatures(facialFeaturesData) {
  const currentLang = document.querySelector('.language-select').value;
  const facialFeaturesLang =
    currentLang === 'ja' ? 'facial-features-ja' : 'facial-features-en';
  const columns = convertColumnToText(facialFeaturesColumns);
  makeData(
    facialFeaturesData,
    'facial-features',
    facialFeaturesLang,
    columns,
    facialFeaturesData?.length || 0
  );
  if (facialFeaturesData?.length > 0 && facialFeaturesData !== null) {
    const navLink = document.querySelector('.nav-link.facial-features');
    navLink.style.cursor = 'pointer';
    navLink.classList.remove('-disabled');
  }
}

// Compounds
export function makeCompounds(compoundsData) {
  const currentLang = document.querySelector('.language-select').value;
  const compoundsLang = currentLang === 'ja' ? 'compounds-ja' : 'compounds-en';
  const columns = convertColumnToText(compoundsColumns);
  makeData(
    compoundsData,
    'compounds',
    compoundsLang,
    columns,
    compoundsData?.length || 0
  );
  if (compoundsData?.length > 0 && compoundsData !== null) {
    const navLink = document.querySelector('.nav-link.compounds');
    navLink.style.cursor = 'pointer';
    navLink.classList.remove('-disabled');
  }
}

/**
 * Generates and updates data table for genes, geneticTesting and phenotypes.
 * @param {Array} data - Data from API (e.g., geneData, geneticTestingData, phenotypesData).
 * @param {string} categoryName - Category name (e.g., 'genes', 'genetic-testing', 'phenotypes').
 * @param {string} tableId - Table element ID (e.g., 'genes-table', 'genetic-testing-table', 'phenotype-ja', 'phenotype-en').
 * @param {string} columns - Columns for togostanza-pagination-table.
 * @param {number} customCount - Optional custom count for data-num (used for unique gene counts).
 */
function makeData(
  data,
  categoryName,
  tableId,
  columns,
  customCount,
  customCssUrl
) {
  const container = document.getElementById(categoryName);
  const tableView = container.querySelector(`#${tableId}`);
  const objectUrl = createObjectUrlFromData(data);
  updateElementWithTable(tableView, objectUrl, columns, customCssUrl);

  // カスタム数値が指定されていれば使用し、そうでなければデータの長さを使用
  const displayCount =
    customCount !== undefined
      ? customCount
      : data === null
      ? 'error'
      : data.length;
  updateDataNumElement(`#${categoryName}`, `.${categoryName}`, displayCount);

  const links = document.querySelectorAll('#temp-side-navigation .nav-link');
  links.forEach((link) => {
    link.addEventListener('click', () => {
      if (!link.classList.contains('-disabled')) {
        links.forEach((l) => l.classList.remove('selected'));
        link.classList.add('selected');
      }
    });
  });
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
  const navLoadingSpinner = document.querySelector(
    `${navWrapperName} .loading-spinner`
  );
  if (navLoadingSpinner) navLoadingSpinner.style.display = 'none';
  if (mainContentNumberEl) mainContentNumberEl.innerText = dataLength;
  if (navContentNumberEl) navContentNumberEl.innerText = dataLength;
}

// for BioResource & Variant
/**
 * Processes tabs for BioResource & Variant.
 * @param {Object[]} items - Array of tab items.
 * @param {string} rootId - ID of the root element.
 * @param {HTMLElement} tabWrap - The tab wrapper element.
 * @param {number} customCount - Optional custom count for data-num.
 */
function processTabs(items, rootId, tabWrap, customCount) {
  // Ensure items is always an array
  if (!Array.isArray(items)) {
    items = [items];
  }

  items.forEach(({ id, columns, data, object }) => {
    const tableView = tabWrap.querySelector(`.${id}`);
    const currentTab = tabWrap.querySelector(`#${rootId}-${id}`);
    if (object !== null) {
      updateElementWithTable(tableView, object, columns);
    }
    // カスタム数値が指定されていれば使用し、そうでなければデータの長さを使用
    const displayCount =
      customCount !== undefined
        ? customCount
        : data === null
        ? 'error'
        : data.length;
    updateDataNumElement(`.${rootId}-${id}`, `.${id}`, displayCount);
  });
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
