import {
  linkedListJaColumns,
  linkedListEnColumns,
} from '../utils/linkedListColumns.js';
import {
  geneColumns,
  referenceGeneColumns,
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
  numOfPatientsColumns,
  subclassTableJaColumns,
  subclassTableEnColumns,
  glycanRelatedGeneColumns,
  compoundsColumns,
} from '../utils/stanzaColumns.js';

export const downloadDatasets = (nandoId, datasets) => {
  const currentLang = document.querySelector('.language-select').value;
  function prepareDataToDownload(format) {
    if (format === 'json') {
      return JSON.stringify(prepareJsonData(), null, 2);
    } else if (format === 'txt') {
      return prepareTxtData();
    }
    return '';
  }

  function prepareDatasets() {
    const convertedDatasets = Object.values(datasets)
      .filter((dataset) => dataset && dataset.name && dataset.data !== null)
      .filter((dataset) => dataset.name !== 'Reference Genes')
      .map(({ name, data }) => {
        switch (name) {
          case 'Overview':
            return { name, data };
          case 'Synonyms':
            return { name, data };
          case 'Modes of Inheritance':
            return { name, data };
          case 'OMIM':
            return {
              name,
              data: reconstructLinkedListData(
                currentLang === 'ja'
                  ? linkedListJaColumns
                  : linkedListEnColumns,
                'omim',
                data
              ),
            };
          case 'Orphanet':
            return {
              name,
              data: reconstructLinkedListData(
                currentLang === 'ja'
                  ? linkedListJaColumns
                  : linkedListEnColumns,
                'orphanet',
                data
              ),
            };
          case 'Monarch Initiative':
            return {
              name,
              data: reconstructLinkedListData(
                currentLang === 'ja'
                  ? linkedListJaColumns
                  : linkedListEnColumns,
                'monarch-initiative',
                data
              ),
            };
          case 'MedGen':
            return {
              name,
              data: reconstructLinkedListData(
                currentLang === 'ja'
                  ? linkedListJaColumns
                  : linkedListEnColumns,
                'medgen',
                data
              ),
            };
          case 'KEGG':
            return {
              name,
              data: reconstructLinkedListData(
                currentLang === 'ja'
                  ? linkedListJaColumns
                  : linkedListEnColumns,
                'kegg',
                data
              ),
            };
          case 'Descriptions':
            return { name, data };
          case 'Number of Specific Medical Expenses Beneficiary Certificate Holders':
            return {
              name,
              data: reconstructionData(numOfPatientsColumns, data),
            };
          case 'Sub-classes':
            return {
              name,
              data: reconstructionData(
                currentLang === 'ja'
                  ? subclassTableJaColumns
                  : subclassTableEnColumns,
                data
              ),
            };
          case 'Genes':
            // Japan-curatedのデータ（symbolフィールド）を使用
            const reconstructedData = reconstructionData(
              referenceGeneColumns,
              data
            );
            return {
              name: 'Overview',
              data: reconstructedData,
            };
          case 'Japan-curated':
            return {
              name,
              data: reconstructionData(referenceGeneColumns, data),
            };
          case 'Internationally curated':
            return {
              name,
              data: reconstructionData(geneColumns, data),
            };
          case 'Glycan-related Genes':
            return {
              name,
              data: reconstructionData(glycanRelatedGeneColumns, data),
            };
          case 'Genetic Testing':
            return {
              name,
              data: reconstructionData(geneticTestingColumns, data),
            };
          case 'Clinical Features':
            const currentColumns =
              currentLang === 'ja' ? phenotypesJaColumns : phenotypesEnColumns;
            return { name, data: reconstructionData(currentColumns, data) };
          case 'Facial Features':
            return {
              name,
              data: reconstructionData(facialFeaturesColumns, data),
            };
          case 'Human Genomic Datasets':
            const humanGenomicDatasetsColumns =
              currentLang === 'ja'
                ? humanGenomicDatasetsJaColumns
                : humanGenomicDatasetsEnColumns;
            return {
              name,
              data: reconstructionData(humanGenomicDatasetsColumns, data),
            };
          case 'Cell':
            return {
              name,
              data: reconstructionData(bioResourceCellColumns, data),
            };
          case 'Mouse':
            const mouseColumns =
              currentLang === 'ja'
                ? bioResourceMouseJaColumns
                : bioResourceMouseEnColumns;
            return {
              name,
              data: reconstructionData(mouseColumns, data),
            };
          case 'DNA':
            return {
              name,
              data: reconstructionData(bioResourceDnaColumns, data),
            };
          case 'Clinvar':
            return {
              name,
              data: reconstructionData(variantClinvarColumns, data),
            };
          case 'MGeND':
            return {
              name,
              data: reconstructionData(variantMgendColumns, data),
            };
          case 'Compounds':
            return {
              name,
              data: reconstructionData(compoundsColumns, data),
            };
          case 'References':
            return { name, data: reconstructionData(referencesColumns, data) };
          default:
            return { name, data };
        }
      });

    return convertedDatasets;
  }

  function reconstructionData(columns, data) {
    return data.map((d) => {
      const reducedData = {};
      for (const [currentKey, currentValue] of Object.entries(d)) {
        const column = columns.find((column) => column.id === currentKey);
        if (column) {
          reducedData[column.label] = currentValue;
        }
      }
      const orderedData = {};
      for (const column of columns) {
        orderedData[column.label] = reducedData[column.label];
      }
      return orderedData;
    });
  }

  // Processing of linkedList only
  function reconstructLinkedListData(columnsArray, className, data) {
    const columns = columnsArray.find((col) => col.class === className);

    if (!columns) {
      console.error(`Class "${className}" not found in columns array.`);
      return [];
    }

    return data
      .filter((d) => d.displayid)
      .map((d) => {
        const reducedData = {};

        for (const [key, value] of Object.entries(d)) {
          const column = columns.labels.find((label) => label.content === key);

          if (column) {
            if (column.label === 'Link Type') {
              const matchType = value.split('#')[1];
              reducedData[column.label] =
                matchType === 'closeMatch'
                  ? 'Close Match'
                  : matchType === 'exactMatch'
                  ? 'Exact Match'
                  : matchType === 'hasDbXref'
                  ? 'database_cross_reference'
                  : value;
            } else {
              reducedData[column.label] = value;
            }
          }
        }

        const orderedData = {};
        for (const column of columns.labels) {
          orderedData[column.label] = reducedData[column.label] || '';
        }

        return orderedData;
      });
  }

  function prepareJsonData() {
    const categoryMappings = {
      Overview: [],
      'Modes of Inheritance': [],
      'Overview/Links': [
        'OMIM',
        'Orphanet',
        'Monarch Initiative',
        'MedGen',
        'KEGG',
      ],
      Descriptions: [],
      Synonyms: [],
      'Number of Specific Medical Expenses Beneficiary Certificate Holders': [],
      'Sub-classes': [],
      Genes: ['Japan-curated', 'Internationally curated'],
      'Glycan-related Genes': [],
      'Genetic Testing': [],
      'Clinical Features': [],
      'Facial Features': [],
      'Human Genomic Datasets': [],
      'Bio Resources': ['Cell', 'Mouse', 'DNA'],
      Compounds: [],
      Variants: ['Clinvar', 'MGeND'],
      References: [],
    };
    // 初期jsonData作成
    const jsonData = Object.fromEntries(
      Object.keys(categoryMappings).map((category) => [category, {}])
    );
    //カテゴリーに分類
    const overviewData = {};
    prepareDatasets().forEach((dataset) => {
      if (dataset && dataset.name && dataset.data !== null) {
        const { name, data } = dataset;

        // Overviewのデータを統合
        if (name === 'Overview') {
          if (Array.isArray(data)) {
            // Genesデータの場合、symbolのみを抽出（Japan-curatedのデータを使用）
            const geneSymbols = data
              .filter((item) => item && item['Gene symbol'])
              .map((item) => item['Gene symbol'])
              .filter((symbol) => symbol && symbol !== 'undefined');

            if (geneSymbols.length > 0) {
              if (!jsonData['Genes']) {
                jsonData['Genes'] = {};
              }
              jsonData['Genes']['Gene symbol'] = geneSymbols;
            }
          } else {
            Object.assign(overviewData, data);
          }
        } else {
          const category = Object.keys(categoryMappings).find((category) =>
            categoryMappings[category].includes(name)
          );
          if (category) {
            jsonData[category][name] = data;
          } else {
            jsonData[name] = data;
          }
        }
      }
    });

    if (Object.keys(overviewData).length > 0) {
      jsonData['Overview'] = overviewData;
    }

    return jsonData;
  }

  function prepareTxtData() {
    const jsonData = prepareJsonData();
    let txtData = '';

    Object.entries(jsonData).forEach(([categoryName, categoryData]) => {
      switch (categoryName) {
        case 'Overview':
          txtData += `-- ${categoryName} --\n`;
          processObject(categoryData, '');
          txtData += '\n';
          break;

        case 'Synonyms':
        case 'Descriptions':
          txtData += `-- Overview/${categoryName} --\n`;
          processObject(categoryData, '');
          txtData += '\n';
          break;

        case 'Modes of Inheritance':
          txtData += `-- Overview/${categoryName} --\n`;
          processObject(categoryData, '');
          txtData += '\n';
          if (jsonData['Genes'] && jsonData['Genes']['Gene symbol']) {
            txtData += `-- Overview/Genes --\n`;
            processObject(
              { 'Gene symbol': jsonData['Genes']['Gene symbol'] },
              ''
            );
            txtData += '\n';
          }
          break;

        case 'Genes':
          if (Object.keys(categoryData).length > 0) {
            Object.entries(categoryData).forEach(([key, value]) => {
              // 'Gene symbol'はすでにOverview/Genesとして出力済みなのでスキップ
              if (key === 'Gene symbol') return;

              txtData += `-- Genes/${key} --\n`;
              if (value.length > 0) {
                const keysTxt = Object.keys(value[0]).join('\t') + '\n';
                const valuesTxt = value
                  .map((item) => Object.values(item).join('\t'))
                  .join('\n');
                txtData += keysTxt + valuesTxt + '\n';
              }
              txtData += '\n';
            });
          }
          break;

        case 'Number of Specific Medical Expenses Beneficiary Certificate Holders':
        case 'Sub-classes':
          processCategory(`Overview/${categoryName}`, categoryData);
          break;
        default:
          processCategory(categoryName, categoryData);
          break;
      }
    });

    return txtData;

    function processObject(obj, prefix) {
      if (!obj || typeof obj !== 'object') {
        return;
      }
      Object.entries(obj).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          if (
            value.length > 0 &&
            typeof value[0] === 'object' &&
            value[0] !== null
          ) {
            processArray(value, `${prefix}${key}/`);
          } else {
            processArray(value, `${prefix}${key} - `);
          }
        } else if (typeof value === 'object' && value !== null) {
          processObject(value, `${prefix}${key}/`);
        } else {
          txtData += `${prefix}${key} - ${value}\n`;
        }
      });
    }

    function processArray(arr, prefix) {
      arr.forEach((item) => {
        if (typeof item === 'object' && item !== null) {
          processObject(item, prefix);
        } else {
          txtData += `${prefix}${item}\n`;
        }
      });
    }

    function processCategory(categoryName, categoryData) {
      if (Array.isArray(categoryData)) {
        txtData += `-- ${categoryName} --\n`;
        if (categoryData.length > 0) {
          const keysTxt = Object.keys(categoryData[0]).join('\t') + '\n';
          const valuesTxt = categoryData
            .map((item) => Object.values(item).join('\t'))
            .join('\n');
          txtData += keysTxt + valuesTxt + '\n';
        }
        txtData += '\n';
      } else {
        Object.entries(categoryData).forEach(([key, value]) => {
          txtData += `-- ${categoryName}/${key} --\n`;
          if (value.length > 0) {
            const keysTxt = Object.keys(value[0]).join('\t') + '\n';
            const valuesTxt = value
              .map((item) => Object.values(item).join('\t'))
              .join('\n');
            txtData += keysTxt + valuesTxt + '\n';
          }
          txtData += '\n';
        });
      }
    }
  }

  function downloadFile(data, type, filename) {
    const blob = new Blob([data], { type: type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  document
    .getElementById('downloadForm')
    .addEventListener('submit', function (e) {
      e.preventDefault();
      const format = new FormData(this).get('format');
      const dataToDownload = prepareDataToDownload(format);

      // データをダウンロード用ファイルとしてユーザーに提供
      const mimeType = format === 'json' ? 'application/json' : 'text/plain';

      downloadFile(dataToDownload, mimeType, `NANDO_ID_${nandoId}.${format}`);
    });
};
