import {
  causalGeneColumns,
  geneticTestingColumns,
  phenotypesJaColumns,
  phenotypesEnColumns,
  bioResourceCellColumns,
  bioResourceMouseColumns,
  bioResourceDnaColumns,
  variantClinvarColumns,
} from './paginationColumns.js';

export const downloadDatasets = (nandoId, datasets) => {
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
      .map(({ name, data }) => {
        switch (name) {
          case 'Overview':
            return { name, data };
          case 'Causal Genes':
            return { name, data: reconstructionData(causalGeneColumns, data) };
          case 'Genetic Testing':
            return {
              name,
              data: reconstructionData(geneticTestingColumns, data),
            };
          case 'Phenotypes':
            const currentLang =
              document.querySelector('.language-select').value;
            const currentColumns =
              currentLang === 'ja' ? phenotypesJaColumns : phenotypesEnColumns;
            return { name, data: reconstructionData(currentColumns, data) };
          case 'Cell':
            return {
              name,
              data: reconstructionData(bioResourceCellColumns, data),
            };
          case 'Mouse':
            return {
              name,
              data: reconstructionData(bioResourceMouseColumns, data),
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
            return;
        }
      })

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

  function prepareJsonData() {
    const categoryMappings = {
      Overview: [],
      'Causal Genes': [],
      'Genetic Testing': [],
      Phenotypes: [],
      'Bio Resource': ['Cell', 'Mouse', 'DNA'],
      Variant: ['Clinvar'],
    };
    // 初期jsonData作成
    const jsonData = Object.fromEntries(
      Object.keys(categoryMappings).map((category) => [category, {}])
    );
    //カテゴリーに分類
    prepareDatasets().forEach(({ name, data }) => {
      const category = Object.keys(categoryMappings).find((category) =>
        categoryMappings[category].includes(name)
      );
      if (category) {
        jsonData[category][name] = data;
      } else {
        jsonData[name] = data;
      }
    });
    return jsonData;
  }

  function prepareTxtData() {
    const jsonData = prepareJsonData();
    let txtData = '';

    Object.entries(jsonData).forEach(([categoryName, categoryData]) => {
      if (categoryName === 'Overview') {
        txtData += `-- ${categoryName} --\n`;
        processObject(categoryData, '');
        txtData += '\n';
      } else {
        processCategory(categoryName, categoryData);
      }
    });

    return txtData;

    function processObject(obj, prefix) {
      Object.entries(obj).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          if (typeof value[0] === 'object') {
            processArray(value, `${prefix}${key}/`);
          } else {
            processArray(value, `${prefix}${key} - `);
          }
        } else if (typeof value === 'object') {
          processObject(value, `${prefix}${key}/`);
        } else {
          txtData += `${prefix}${key} - ${value}\n`;
        }
      });
    }

    function processArray(arr, prefix) {
      arr.forEach((item) => {
        if (typeof item === 'object') {
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

          if (key !== 'Clinvar') {
            txtData += '\n';
          }
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
