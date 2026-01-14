import { navToggle } from '../utils/navigation.js';
import { focusInput } from '../utils/focusInput.js';
import { popup } from '../utils/popup.js';
import { breadcrumb } from './breadcrumb.js';
import { downloadDatasets } from './download.js';
import { makeHeader } from './overview/makeHeader.js';
import { makeLinkedList } from './overview/makeLinkedList.js';
import { makeExternalLinks } from './overview/makeExternalLinks.js';
import { makeAlternativeName } from './overview/makeAlternativeName.js';
import { makeInheritanceUris } from './overview/makeInheritanceUris.js';
import { makeReferenceGenes } from './overview/makeReferenceGenes.js';
import { makeNumOfPatients } from './overview/makeNumOfPatients.js';
import { makeSubClass } from './overview/makeSubclass.js';
import { checkSummaryData } from './overview/checkSummaryData.js';
import { makeDiseaseDefinition } from './overview/makeDiseaseDefinition.js';
import { updateOverviewDisplay } from './overview/updateOverviewDisplay.js';

import {
  makeInternationallyCuratedGenes,
  makeJapanCuratedGenes,
  makeGlycanRelatedGene,
  makeGeneticTesting,
  makePhenotypes,
  makeHumanGenomicDatasets,
  makeCell,
  makeMouse,
  makeDNA,
  makeClinvar,
  makeMgend,
  makeFacialFeatures,
  makeCompounds,
  makeReferences,
} from './diseaseContent.js';
import { switchingDisplayContents } from './diseaseSideNavigation.js';
import { setLangChange } from '../utils/setLangChange.js';

// get NANDO ID
const pathname = window.location.pathname;
const nandoIndex = pathname.indexOf('NANDO:');
const nandoId = pathname.slice(nandoIndex + 6);

// for cache busting
const timestamp = Date.now();

// external functions
navToggle();
focusInput();
popup();
breadcrumb(nandoId);
setLangChange();

// 初期ローディングスピナーを表示
const contentElement = document.getElementById('content');
if (contentElement) {
  // 既存のローディングスピナーがあれば削除
  const existingSpinner = contentElement.querySelector('.loading-spinner');
  if (existingSpinner) {
    existingSpinner.remove();
  }

  // コンテンツのバックグラウンドを表示しながらコンテンツ部分は非表示に
  contentElement.style.display = 'block';
  // コンテンツ内の要素を一旦非表示にする
  const contentChildren = contentElement.children;
  for (let i = 0; i < contentChildren.length; i++) {
    contentChildren[i].style.visibility = 'hidden';
  }

  // スピナーは表示
  const loadingSpinner = document.createElement('div');
  loadingSpinner.className = 'loading-spinner';
  contentElement.appendChild(loadingSpinner);
}

const datasets = [
  { name: 'Overview', data: null },
  { name: 'Synonyms', data: null },
  { name: 'Modes of Inheritance', data: null },
  { name: 'Reference Genes', data: null },
  { name: 'OMIM', data: null },
  { name: 'Orphanet', data: null },
  { name: 'Monarch Initiative', data: null },
  { name: 'MedGen', data: null },
  { name: 'KEGG', data: null },
  { name: 'Descriptions', data: null },
  { name: 'Japan-curated', data: null },
  { name: 'Internationally curated', data: null },
  {
    name: 'Number of Specific Medical Expenses Beneficiary Certificate Holders',
    data: null,
  },
  { name: 'Sub-classes', data: null },
  { name: 'Genes', data: null },
  { name: 'Glycan-related Genes', data: null },
  { name: 'Genetic Testing', data: null },
  { name: 'Clinical Features', data: null },
  { name: 'Human Genomic Datasets', data: null },
  { name: 'Cell', data: null },
  { name: 'Mouse', data: null },
  { name: 'DNA', data: null },
  { name: 'Clinvar', data: null },
  { name: 'MGeND', data: null },
  { name: 'Facial Features', data: null },
  { name: 'Compounds', data: null },
  { name: 'References', data: null },
];

(async () => {
  try {
    const hash = window.location.hash.replace('#', '');
    async function fetchData(apiEndpoint) {
      const url = `/sparqlist/api/${apiEndpoint}?nando_id=${nandoId}&timestamp=${timestamp}`;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching data:', error.message);
        return null;
      }
    }

    // 全てのAPIを並列で呼び出す
    await Promise.all([
      // リンク一覧データ
      Promise.all([
        fetchData('nanbyodata_get_link_omim_by_nando_id'),
        fetchData('nanbyodata_get_link_orphanet_by_nando_id'),
        fetchData('nanbyodata_get_link_mondo_by_nando_id'),
        fetchData('nanbyodata_get_link_medgen_by_nando_id'),
        fetchData('nanbyodata_get_link_kegg_by_nando_id'),
      ]).then(([omimData, orphanetData, monarchData, medgenData, keggData]) => {
        const linkedListData = {
          omim: omimData,
          orphanet: orphanetData,
          'monarch-initiative': monarchData,
          medgen: medgenData,
          kegg: keggData,
        };
        makeLinkedList(linkedListData, nandoId);
        datasets.find((d) => d.name === 'OMIM').data = omimData;
        datasets.find((d) => d.name === 'Orphanet').data = orphanetData;
        datasets.find((d) => d.name === 'Monarch Initiative').data =
          monarchData;
        datasets.find((d) => d.name === 'MedGen').data = medgenData;
        datasets.find((d) => d.name === 'KEGG').data = keggData;
        checkAndLogDatasets();
      }),

      // 他のAPI呼び出し
      fetchData('nanbyodata_get_japan_curated_gene_by_nando_id').then(
        (response) => {
          const japanCuratedGeneData = response;
          makeJapanCuratedGenes(japanCuratedGeneData);
          datasets.find((d) => d.name === 'Japan-curated').data =
            japanCuratedGeneData;
          datasets.find((d) => d.name === 'Genes').data = japanCuratedGeneData;
          makeReferenceGenes(japanCuratedGeneData);
          datasets.find((d) => d.name === 'Reference Genes').data =
            japanCuratedGeneData;
          checkAndLogDatasets();
        }
      ),
      fetchData('nanbyodata_get_stats_on_patient_number_by_nando_id').then(
        (response) => {
          const numOfPatientsData = response;
          makeNumOfPatients(numOfPatientsData);
          datasets.find(
            (d) =>
              d.name ===
              'Number of Specific Medical Expenses Beneficiary Certificate Holders'
          ).data = numOfPatientsData;
          checkAndLogDatasets();
        }
      ),
      fetchData('nanbyodata_get_sub_class_by_nando_id').then((response) => {
        const subClassData = response;
        makeSubClass(subClassData);
        // 親を持たないデータを除外
        const filteredDataForDL = subClassData.filter(
          (item) => item.parent !== undefined
        );
        datasets.find((d) => d.name === 'Sub-classes').data = filteredDataForDL;
        checkAndLogDatasets();
      }),
      fetchData('nanbyodata_get_overview_by_nando_id').then((entryData) => {
        if (entryData) {
          makeHeader(entryData);
          makeExternalLinks(entryData);
          makeAlternativeName(entryData);
          makeInheritanceUris(entryData);
          checkSummaryData(entryData);
          makeDiseaseDefinition(entryData);
          updateOverviewDisplay();

          // remove unnecessary overview data
          const {
            alt_label_en,
            alt_label_ja,
            inheritance_uris,
            kegg,
            mondos,
            db_xrefs,
            medgen_id,
            medgen_uri,
            urdbms,
            description,
            mondo_decs,
            medgen_definition,
            kegg_description,
            ordo_dif,
            ...filteredOverviewData
          } = entryData;

          datasets.find((d) => d.name === 'Overview').data =
            filteredOverviewData;

          // 遺伝形式ダウンロードデータの用意
          const inheritanceUrisData = Object.fromEntries(
            Object.entries({ inheritance_uris }).filter(([_, v]) => v != null)
          );

          const inheritanceUrisDataset = datasets.find(
            (d) => d.name === 'Modes of Inheritance'
          );
          if (Object.keys(inheritanceUrisData).length > 0) {
            inheritanceUrisDataset.data = inheritanceUrisData;
          } else {
            inheritanceUrisDataset.data = {};
          }

          // 別疾患名ダウンロードデータの用意
          const synonymsData = Object.fromEntries(
            Object.entries({ alt_label_en, alt_label_ja }).filter(
              ([_, v]) => v != null
            )
          );

          const synonymsDataset = datasets.find((d) => d.name === 'Synonyms');
          if (Object.keys(synonymsData).length > 0) {
            synonymsDataset.data = synonymsData;
          } else {
            synonymsDataset.data = {};
          }

          // 疾患定義ダウンロードデータの用意
          const definitionData = Object.fromEntries(
            Object.entries({
              description,
              mondo_decs,
              medgen_definition,
              kegg_description,
              ordo_dif,
            }).filter(([_, v]) => v != null)
          );

          const definitionDataset = datasets.find(
            (d) => d.name === 'Descriptions'
          );
          if (Object.keys(definitionData).length > 0) {
            definitionDataset.data = definitionData;
          } else {
            definitionDataset.data = {};
          }

          checkAndLogDatasets();

          if (hash) {
            trySwitchingContent(hash);
          } else {
            switchingDisplayContents('overview');
            const overviewEl = document.querySelector('.nav-link.overview');
            overviewEl.classList.add('selected');
            overviewEl.style.cursor = 'pointer';

            // スピナーを削除
            const spinner = document.querySelector(
              '#content > .loading-spinner'
            );
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

            document.getElementById('content').style.display = 'block';
          }
        }
      }),
      fetchData('nanbyodata_get_pubmed_data_by_nando_id').then(
        (referencesData) => {
          makeReferences(referencesData);
          datasets.find((d) => d.name === 'References').data = referencesData;
          checkAndLogDatasets();
        }
      ),
      fetchData('nanbyodata_get_causal_gene_by_nando_id').then((geneData) => {
        makeInternationallyCuratedGenes(geneData);
        datasets.find((d) => d.name === 'Internationally curated').data =
          geneData;
        checkAndLogDatasets();
      }),
      fetchData('nanbyodata_get_glycosmos_gene_by_nando_id').then(
        (glycanRelatedGeneData) => {
          makeGlycanRelatedGene(glycanRelatedGeneData);
          datasets.find((d) => d.name === 'Glycan-related Genes').data =
            glycanRelatedGeneData;
          checkAndLogDatasets();
        }
      ),
      fetchData('nanbyodata_get_genetic_test_by_nando_id').then(
        (geneticTestingData) => {
          makeGeneticTesting(geneticTestingData);
          datasets.find((d) => d.name === 'Genetic Testing').data =
            geneticTestingData;
          checkAndLogDatasets();
        }
      ),
      fetchData('nanbyodata_get_hpo_data_by_nando_id').then(
        (phenotypesData) => {
          makePhenotypes(phenotypesData);
          datasets.find((d) => d.name === 'Clinical Features').data =
            phenotypesData;
          checkAndLogDatasets();
        }
      ),
      fetchData('nanbyodata_get_nbdc_human_databases_info_by_nando_id').then(
        (humanGenomicDatasetsData) => {
          makeHumanGenomicDatasets(humanGenomicDatasetsData);
          datasets.find((d) => d.name === 'Human Genomic Datasets').data =
            humanGenomicDatasetsData;
          checkAndLogDatasets();
        }
      ),
      fetchData('nanbyodata_get_riken_brc_cell_info_by_nando_id').then(
        (cellData) => {
          makeCell(cellData);
          datasets.find((d) => d.name === 'Cell').data = cellData;
          checkAndLogDatasets();
        }
      ),
      fetchData('nanbyodata_get_riken_brc_mouse_info_by_nando_id').then(
        (mouseData) => {
          makeMouse(mouseData);
          datasets.find((d) => d.name === 'Mouse').data = mouseData;
          checkAndLogDatasets();
        }
      ),
      fetchData('nanbyodata_get_riken_brc_dna_info_by_nando_id').then(
        (dnaData) => {
          makeDNA(dnaData);
          datasets.find((d) => d.name === 'DNA').data = dnaData;
          checkAndLogDatasets();
        }
      ),
      fetchData('nanbyodata_get_clinvar_variant_by_nando_id').then(
        (clinvarData) => {
          makeClinvar(clinvarData);
          datasets.find((d) => d.name === 'Clinvar').data = clinvarData;
          checkAndLogDatasets();
        }
      ),
      fetchData('nanbyodata_get_mgend_variant_by_nando_id').then(
        (mgendData) => {
          makeMgend(mgendData);
          datasets.find((d) => d.name === 'MGeND').data = mgendData;
          checkAndLogDatasets();
        }
      ),
      fetchData('nanbyodata_get_gestaltmatcher_data_by_nando_id').then(
        (facialFeaturesData) => {
          makeFacialFeatures(facialFeaturesData);
          datasets.find((d) => d.name === 'Facial Features').data =
            facialFeaturesData;
          checkAndLogDatasets();
        }
      ),
      fetchData('nanbyodata_get_pubchem_chemical_information_by_nando_id').then(
        (compoundsData) => {
          makeCompounds(compoundsData);
          datasets.find((d) => d.name === 'Compounds').data = compoundsData;
          checkAndLogDatasets();
        }
      ),
    ]);
  } catch (error) {
    console.error('Error:', error);
  }
})();

function checkAndLogDatasets() {
  if (datasets.every((dataset) => dataset.data !== null)) {
    downloadDatasets(nandoId, datasets);
    document.querySelector(
      '.summary-download > .open-popup-btn'
    ).disabled = false;
  }
}

function trySwitchingContent(hash, retries = 0) {
  const maxRetries = 10;
  let found = false;

  // コンテンツがロード中の場合はローディングスピナーを表示
  const contentElement = document.getElementById('content');
  if (contentElement) {
    // 既存のローディングスピナーがあれば削除
    const existingSpinner = contentElement.querySelector('.loading-spinner');
    if (existingSpinner) {
      existingSpinner.remove();
    }

    // コンテンツを非表示にし、ローディングスピナーを追加
    contentElement.style.display = 'block';
    const loadingSpinner = document.createElement('div');
    loadingSpinner.className = 'loading-spinner';
    contentElement.appendChild(loadingSpinner);
  }

  const items = [
    'overview',
    'genes-internationally-curated',
    'genes-japan-curated',
    'glycan-related-genes',
    'genetic-testing',
    'clinical-features',
    'human-genomic-datasets',
    'bio-resources-cell',
    'bio-resources-mouse',
    'bio-resources-dna',
    'variants-clinvar',
    'variants-mgend',
    'facial-features',
    'compounds',
    'references',
  ];

  if (!items.includes(hash)) {
    window.location.hash = '';
    window.location.reload();
    return;
  }

  let modifiedHash = hash;
  switch (hash) {
    case 'genes-internationally-curated':
    case 'genes-japan-curated':
      modifiedHash = hash.substring('genes-'.length);
      break;
    case 'bio-resources-cell':
    case 'bio-resources-mouse':
    case 'bio-resources-dna':
      modifiedHash = hash.substring('bio-resources-'.length);
      break;
    case 'variants-clinvar':
    case 'variants-mgend':
      modifiedHash = hash.substring('variants-'.length);
      break;
  }

  const element = document.querySelector(`.${modifiedHash}`);
  if (element && !element.classList.contains('-disabled')) found = true;

  const alreadySelected = document.querySelector('.nav-link.selected');

  if (found && (!alreadySelected || alreadySelected === element)) {
    element.classList.add('selected');
    switchingDisplayContents(hash);
    // スピナーを削除
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
    document.getElementById('content').style.display = 'block';
  } else if (!found && retries < maxRetries) {
    console.error('No hash item found, retrying...');
    setTimeout(() => {
      trySwitchingContent(hash, retries + 1);
    }, 1000);
  } else {
    // 最大リトライ回数に達した場合もスピナーを削除
    const spinner = document.querySelector('#content > .loading-spinner');
    if (spinner) {
      spinner.remove();
    }

    if (alreadySelected) {
      return;
    } else {
      window.location.hash = '';
      window.location.reload();
    }
  }
}

// smartbox
document.addEventListener('selectedSmartBoxLabel', function (event) {
  const labelInfo = event.detail.labelInfo;
  window.location.href = `${location.origin}/disease/${labelInfo.id}`;
});
