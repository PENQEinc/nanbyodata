// Stats page JavaScript
document.addEventListener('DOMContentLoaded', function () {
  // 統計データを読み込んで表示
  loadStatsData();

  // 言語切り替えイベントリスナーを追加
  const languageSelect = document.querySelector('.language-select');
  if (languageSelect) {
    languageSelect.addEventListener('change', function () {
      const value = this.value;
      const currentHash = window.location.hash;
      const currentPath = window.location.pathname;
      const search = window.location.search;
      let newUrl = '';

      if (search.includes('post')) {
        const params = new URLSearchParams(search);
        params.set('lang', value);
        newUrl = currentPath + '?' + params.toString() + currentHash;
      } else {
        newUrl = currentPath + '?lang=' + value + currentHash;
      }
      window.location.href = newUrl;
    });
  }
});

async function loadStatsData() {
  try {
    // 各セクションのローディング表示を開始
    const sections = [
      'nando',
      'disease-overview',
      'links',
      'related-data',
      'genes',
      'bioresources',
      'variants',
    ];
    sections.forEach((sectionId) => {
      showSectionLoading(sectionId);
    });

    // データを保持するオブジェクト
    const apiData = {
      nandoData: null,
      brcData: null,
      linkData: null,
      linkData2: null,
      linkData4: null,
      linkData5: null,
    };

    // NANDO_count APIを取得して即座にNANDOテーブルを更新
    fetchNANDOData()
      .then((data) => {
        apiData.nandoData = data;
        const statsData = {
          diseaseStats: {
            shitei: {
              all: safeParseInt(data.shitei_all?.['callret-0']),
              nanbyo_group: safeParseInt(data.shitei_group?.['callret-0']),
              nanbyo_disease: safeParseInt(data.shitei_disease?.['callret-0']),
              nanbyo_subtype: (function () {
                const all = safeParseInt(data.shitei_all?.['callret-0']);
                const group = safeParseInt(data.shitei_group?.['callret-0']);
                const disease = safeParseInt(
                  data.shitei_disease?.['callret-0']
                );
                if (all === '-' || group === '-' || disease === '-') return '-';
                return all - group - disease;
              })(),
            },
            shoman: {
              all: safeParseInt(data.shoman_all?.['callret-0']),
              nanbyo_group: safeParseInt(data.shoman_group?.['callret-0']),
              nanbyo_disease: safeParseInt(data.shoman_disease?.['callret-0']),
              nanbyo_subtype: (function () {
                const all = safeParseInt(data.shoman_all?.['callret-0']);
                const group = safeParseInt(data.shoman_group?.['callret-0']);
                const disease = safeParseInt(
                  data.shoman_disease?.['callret-0']
                );
                if (all === '-' || group === '-' || disease === '-') return '-';
                return all - group - disease;
              })(),
            },
          },
        };
        updateDiseaseStats(statsData.diseaseStats);
        showSectionContent('nando');
      })
      .catch((error) => {
        console.warn('NANDO_count API エラー:', error);
        hideSection('nando');
      });

    // BRC APIを取得して即座にバイオリソーステーブルを更新
    fetchBRCData()
      .then((data) => {
        apiData.brcData = data;
        const statsData = {
          bioresources: {
            shitei: {
              cells: safeParseInt(data.shitei_cell?.cell),
              mouse: safeParseInt(data.shitei_mouse?.mouse),
              dna: safeParseInt(data.shitei_DNA?.gene),
            },
            shoman: {
              cells: safeParseInt(data.shoman_cell?.cell),
              mouse: safeParseInt(data.shoman_mouse?.mouse),
              dna: safeParseInt(data.shoman_DNA?.gene),
            },
          },
        };
        updateBioresources(statsData.bioresources);
        showSectionContent('bioresources');
      })
      .catch((error) => {
        console.warn('BRC API エラー:', error);
        hideSection('bioresources');
      });

    // Link APIを取得して即座にリンクテーブルを更新
    fetchLinkData()
      .then((data) => {
        apiData.linkData = data;
        const statsData = {
          links: {
            shitei: {
              monarchExact: safeParseInt(data.name2?.mondo),
              monarchClose: safeParseInt(data.name4?.mondo),
              orphanet: safeParseInt(data.name12?.mondo),
              medgen: safeParseInt(data.name10?.medgen),
              kegg: safeParseInt(data.name5?.kegg),
            },
            shoman: {
              monarchExact: safeParseInt(data.name1?.mondo),
              monarchClose: safeParseInt(data.name3?.mondo),
              orphanet: safeParseInt(data.name11?.mondo),
              medgen: safeParseInt(data.name9?.medgen),
              kegg: safeParseInt(data.name6?.kegg),
            },
          },
        };
        updateLinks(statsData.links);
        showSectionContent('links');
      })
      .catch((error) => {
        console.warn('Link API エラー:', error);
        hideSection('links');
      });

    Promise.allSettled([
      fetchLinkData2(),
      fetchLinkData4(),
      fetchLinkData5(),
      fetchGlycoGeneData(),
    ]).then((results) => {
      const linkData2 =
        results[0].status === 'fulfilled'
          ? results[0].value
          : getDefaultLinkData2();
      const linkData4 =
        results[1].status === 'fulfilled'
          ? results[1].value
          : getDefaultLinkData4();
      const linkData5 =
        results[2].status === 'fulfilled'
          ? results[2].value
          : getDefaultLinkData5();
      const glycoGeneData =
        results[3].status === 'fulfilled'
          ? results[3].value
          : getDefaultGlycoGeneData();
      apiData.linkData2 = linkData2;
      apiData.linkData4 = linkData4;
      apiData.linkData5 = linkData5;
      apiData.glycoGeneData = glycoGeneData;

      results.forEach((result, index) => {
        const apiNames = ['Link2', 'Link4', 'Link5', 'GlycoGene'];

        if (result.status === 'rejected') {
          console.warn(`${apiNames[index]} API エラー:`, result.reason);

          if (index === 0) {
            hideSection('disease-overview');
            hideSection('related-data');
            hideSection('genes');
          }
          if (index === 1) {
            hideSection('related-data');
            hideSection('genes');
          }
          if (index === 2) {
            hideSection('related-data');
          }
          if (index === 3) {
            // GlycoGene API エラーは related-data に影響するが、他のデータは表示可能
          }
        }
      });

      if (results[0].status === 'fulfilled') {
        const diseaseOverview = {
          shitei: {
            definition: safeParseInt(linkData2.shitei_description?.desc),
            inheritance: safeParseInt(
              linkData2.shitei_inheritance?.inheritance
            ),
            alternativeNames: safeParseInt(linkData2.shitei_altlabel?.alt),
          },
          shoman: {
            definition: safeParseInt(linkData2.shoman_description?.desc),
            inheritance: safeParseInt(
              linkData2.shoman_inheritance?.inheritance
            ),
            alternativeNames: safeParseInt(linkData2.shoman_altlabel?.alt),
          },
        };
        updateDiseaseOverview(diseaseOverview);
        showSectionContent('disease-overview');
      }

      if (
        results[0].status === 'fulfilled' &&
        results[1].status === 'fulfilled' &&
        results[2].status === 'fulfilled'
      ) {
        const relatedData = {
          shitei: {
            glycanGenes: safeParseInt(glycoGeneData.glyco_gene_shitei?.num),
            geneticTestings: safeParseInt(linkData2.shitei_genetest?.genetest),
            clinicalFeatures: safeParseInt(linkData2.shitei_hp?.hp),
            facialFeatures: safeParseInt(linkData4.shitei_gm?.GM),
            humanData: safeParseInt(linkData4.shitei_hum?.hum),
            chemicals: safeParseInt(linkData5.shitei_pubchem?.pubchem),
          },
          shoman: {
            glycanGenes: safeParseInt(glycoGeneData.glyco_gene_shoman?.num),
            geneticTestings: safeParseInt(linkData2.shoman_genetest?.genetest),
            clinicalFeatures: safeParseInt(linkData2.shoman_hp?.hp),
            facialFeatures: safeParseInt(linkData4.shoman_gm?.GM),
            humanData: safeParseInt(linkData4.shoman_hum?.hum),
            chemicals: safeParseInt(linkData5.shoman_pubchem?.pubchem),
          },
        };
        updateRelatedData(relatedData);
        showSectionContent('related-data');
      }

      if (
        results[0].status === 'fulfilled' &&
        results[1].status === 'fulfilled'
      ) {
        const genes = {
          shitei: {
            domestic: safeParseInt(linkData4.shitei_CG?.curatedGene),
            international: safeParseInt(linkData2.shitei_gene?.gene),
          },
          shoman: {
            domestic: safeParseInt(linkData4.shoman_CG?.curatedGene),
            international: safeParseInt(linkData2.shoman_gene?.gene),
          },
        };
        updateGenes(genes);
        showSectionContent('genes');
      }
    });

    fetchLinkData7()
      .then((data) => {
        apiData.linkData7 = data;
        if (apiData.linkData2) {
          const variants = {
            shitei: {
              clinvar: safeParseInt(data.shitei_clinvar?.num),
              mgend: safeParseInt(apiData.linkData2.shitei_mgened?.mgend),
            },
            shoman: {
              clinvar: safeParseInt(data.shoman_clinvar?.num),
              mgend: safeParseInt(apiData.linkData2.shoman_mgend?.mgend),
            },
          };
          updateVariants(variants);
          showSectionContent('variants');
        }
      })
      .catch((error) => {
        console.warn('Link7 API エラー:', error);
        hideSection('variants');
      });
  } catch (error) {
    console.error('統計データの読み込みに失敗しました:', error);
    console.error('エラーの詳細:', error.message);
    console.error('エラースタック:', error.stack);
    const sections = [
      'nando',
      'disease-overview',
      'links',
      'related-data',
      'genes',
      'bioresources',
      'variants',
    ];
    sections.forEach((sectionId) => {
      hideSection(sectionId);
    });
  }
}

// APIデータを統計データ形式に変換する関数
function transformApiDataToStatsData(
  nandoData,
  brcData,
  linkData,
  linkData2,
  linkData4,
  linkData5
) {
  try {
    return {
      // 難病統計
      diseaseStats: {
        shitei: {
          all: safeParseInt(nandoData.shitei_all?.['callret-0']),
          nanbyo_group: safeParseInt(nandoData.shitei_group?.['callret-0']),
          nanbyo_disease: safeParseInt(nandoData.shitei_disease?.['callret-0']),
          nanbyo_subtype: (function () {
            const all = safeParseInt(nandoData.shitei_all?.['callret-0']);
            const group = safeParseInt(nandoData.shitei_group?.['callret-0']);
            const disease = safeParseInt(
              nandoData.shitei_disease?.['callret-0']
            );
            if (all === '-' || group === '-' || disease === '-') return '-';
            return all - group - disease;
          })(),
        },
        shoman: {
          all: safeParseInt(nandoData.shoman_all?.['callret-0']),
          nanbyo_group: safeParseInt(nandoData.shoman_group?.['callret-0']),
          nanbyo_disease: safeParseInt(nandoData.shoman_disease?.['callret-0']),
          nanbyo_subtype: (function () {
            const all = safeParseInt(nandoData.shoman_all?.['callret-0']);
            const group = safeParseInt(nandoData.shoman_group?.['callret-0']);
            const disease = safeParseInt(
              nandoData.shoman_disease?.['callret-0']
            );
            if (all === '-' || group === '-' || disease === '-') return '-';
            return all - group - disease;
          })(),
        },
      },
      // 疾患概要
      diseaseOverview: {
        shitei: {
          definition: safeParseInt(linkData2.shitei_description?.desc),
          inheritance: safeParseInt(linkData2.shitei_inheritance?.inheritance),
          alternativeNames: safeParseInt(linkData2.shitei_altlabel?.alt),
        },
        shoman: {
          definition: safeParseInt(linkData2.shoman_description?.desc),
          inheritance: safeParseInt(linkData2.shoman_inheritance?.inheritance),
          alternativeNames: safeParseInt(linkData2.shoman_altlabel?.alt),
        },
      },
      // リンク
      links: {
        shitei: {
          monarchExact: safeParseInt(linkData.name2?.mondo),
          monarchClose: safeParseInt(linkData.name4?.mondo),
          orphanet: safeParseInt(linkData.name12?.mondo),
          medgen: safeParseInt(linkData.name10?.medgen),
          kegg: safeParseInt(linkData.name5?.kegg),
        },
        shoman: {
          monarchExact: safeParseInt(linkData.name1?.mondo),
          monarchClose: safeParseInt(linkData.name3?.mondo),
          orphanet: safeParseInt(linkData.name11?.mondo),
          medgen: safeParseInt(linkData.name9?.medgen),
          kegg: safeParseInt(linkData.name6?.kegg),
        },
      },
      // 疾患関連データ
      relatedData: {
        shitei: {
          glycanGenes: '-', // transformApiDataToStatsDataでは使用しない（loadStatsDataで個別に取得）
          geneticTestings: safeParseInt(linkData2.shitei_genetest?.genetest),
          clinicalFeatures: safeParseInt(linkData2.shitei_hp?.hp),
          facialFeatures: safeParseInt(linkData4.shitei_gm?.GM),
          humanData: safeParseInt(linkData4.shitei_hum?.hum),
          chemicals: safeParseInt(linkData5.shitei_pubchem?.pubchem),
        },
        shoman: {
          glycanGenes: '-', // transformApiDataToStatsDataでは使用しない（loadStatsDataで個別に取得）
          geneticTestings: safeParseInt(linkData2.shoman_genetest?.genetest),
          clinicalFeatures: safeParseInt(linkData2.shoman_hp?.hp),
          facialFeatures: safeParseInt(linkData4.shoman_gm?.GM),
          humanData: safeParseInt(linkData4.shoman_hum?.hum),
          chemicals: safeParseInt(linkData5.shoman_pubchem?.pubchem),
        },
      },
      // 疾患関連遺伝子
      genes: {
        shitei: {
          domestic: safeParseInt(linkData4.shitei_CG?.curatedGene),
          international: safeParseInt(linkData2.shitei_gene?.gene),
        },
        shoman: {
          domestic: safeParseInt(linkData4.shoman_CG?.curatedGene),
          international: safeParseInt(linkData2.shoman_gene?.gene),
        },
      },

      // バイオリソース
      bioresources: {
        shitei: {
          cells: safeParseInt(brcData.shitei_cell?.cell),
          mouse: safeParseInt(brcData.shitei_mouse?.mouse),
          dna: safeParseInt(brcData.shitei_DNA?.gene),
        },
        shoman: {
          cells: safeParseInt(brcData.shoman_cell?.cell),
          mouse: safeParseInt(brcData.shoman_mouse?.mouse),
          dna: safeParseInt(brcData.shoman_DNA?.gene),
        },
      },
      // 顔貌特徴と外部リンクの合計
      facial_features:
        safeParseInt(linkData4.shitei_gm?.GM) +
        safeParseInt(linkData4.shoman_gm?.GM),
      external_links:
        safeParseInt(linkData.name8?.mondo) +
        safeParseInt(linkData.name10?.medgen) +
        safeParseInt(linkData.name5?.kegg) +
        safeParseInt(linkData.name7?.mondo) +
        safeParseInt(linkData.name9?.medgen) +
        safeParseInt(linkData.name6?.kegg),
    };
  } catch (error) {
    console.error('データ変換中にエラーが発生しました:', error);
    throw error;
  }
}

// 全テーブルを更新する関数
function updateAllTables(statsData) {
  updateDiseaseStats(statsData.diseaseStats);
  updateDiseaseOverview(statsData.diseaseOverview);
  updateLinks(statsData.links);
  updateRelatedData(statsData.relatedData);
  updateGenes(statsData.genes);
  updateBioresources(statsData.bioresources);
}

// NANDO_count APIからデータを取得する関数
async function fetchNANDOData() {
  try {
    const response = await fetch('/sparqlist/api/NANDO_count');

    if (!response.ok) {
      throw new Error(
        `NANDO_count API request failed: ${response.status} ${response.statusText}`
      );
    }

    const contentType = response.headers.get('content-type');

    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Expected JSON but got:', contentType);
      console.error('Response text:', text.substring(0, 200) + '...');
      throw new Error(`Expected JSON response but got ${contentType}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('NANDO_count API エラー:', error);
    throw error;
  }
}

// BRC APIからデータを取得する関数
async function fetchBRCData() {
  try {
    const response = await fetch('/sparqlist/api/NANDO_link_count3');

    if (!response.ok) {
      throw new Error(
        `BRC API request failed: ${response.status} ${response.statusText}`
      );
    }

    const contentType = response.headers.get('content-type');

    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Expected JSON but got:', contentType);
      console.error('Response text:', text.substring(0, 200) + '...');
      throw new Error(`Expected JSON response but got ${contentType}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('BRC API エラー:', error);
    throw error;
  }
}

// NANDO_link_count APIからデータを取得する関数
async function fetchLinkData() {
  try {
    const response = await fetch('/sparqlist/api/NANDO_link_count');

    if (!response.ok) {
      throw new Error(
        `Link API request failed: ${response.status} ${response.statusText}`
      );
    }

    const contentType = response.headers.get('content-type');

    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Expected JSON but got:', contentType);
      console.error('Response text:', text.substring(0, 200) + '...');
      throw new Error(`Expected JSON response but got ${contentType}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Link API エラー:', error);
    throw error;
  }
}

// NANDO_link_count2 APIからデータを取得する関数
async function fetchLinkData2() {
  try {
    const response = await fetch('/sparqlist/api/NANDO_link_count2');

    if (!response.ok) {
      throw new Error(
        `Link2 API request failed: ${response.status} ${response.statusText}`
      );
    }

    const contentType = response.headers.get('content-type');

    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Expected JSON but got:', contentType);
      console.error('Response text:', text.substring(0, 200) + '...');
      throw new Error(`Expected JSON response but got ${contentType}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Link2 API エラー:', error);
    throw error;
  }
}

// NANDO_link_count4 APIからデータを取得する関数
async function fetchLinkData4() {
  try {
    const response = await fetch('/sparqlist/api/NANDO_link_count4');

    if (!response.ok) {
      throw new Error(
        `Link4 API request failed: ${response.status} ${response.statusText}`
      );
    }

    const contentType = response.headers.get('content-type');

    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Expected JSON but got:', contentType);
      console.error('Response text:', text.substring(0, 200) + '...');
      throw new Error(`Expected JSON response but got ${contentType}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Link4 API エラー:', error);
    throw error;
  }
}

// NANDO_link_count5 APIからデータを取得する関数
async function fetchLinkData5() {
  try {
    const response = await fetch('/sparqlist/api/NANDO_link_count5');

    if (!response.ok) {
      throw new Error(
        `Link5 API request failed: ${response.status} ${response.statusText}`
      );
    }

    const contentType = response.headers.get('content-type');

    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Expected JSON but got:', contentType);
      console.error('Response text:', text.substring(0, 200) + '...');
      throw new Error(`Expected JSON response but got ${contentType}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Link5 API エラー:', error);
    throw error;
  }
}

// NANDO_link_count7 APIからデータを取得する関数（ClinVar）
async function fetchLinkData7() {
  try {
    const response = await fetch('/sparqlist/api/NANDO_link_count7');

    if (!response.ok) {
      throw new Error(
        `Link7 API request failed: ${response.status} ${response.statusText}`
      );
    }

    const contentType = response.headers.get('content-type');

    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Expected JSON but got:', contentType);
      console.error('Response text:', text.substring(0, 200) + '...');
      throw new Error(`Expected JSON response but got ${contentType}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Link7 API エラー:', error);
    throw error;
  }
}

// NANDO_link_count8 APIから糖鎖関連遺伝子データを取得する関数
async function fetchGlycoGeneData() {
  try {
    const response = await fetch('/sparqlist/api/NANDO_link_count8');

    if (!response.ok) {
      throw new Error(
        `GlycoGene API request failed: ${response.status} ${response.statusText}`
      );
    }

    const contentType = response.headers.get('content-type');

    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Expected JSON but got:', contentType);
      console.error('Response text:', text.substring(0, 200) + '...');
      throw new Error(`Expected JSON response but got ${contentType}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('GlycoGene API エラー:', error);
    throw error;
  }
}

// 各セクションのローディング状態を表示する関数
function showSectionLoading(sectionId) {
  const loadingDiv = document.getElementById(`${sectionId}-loading`);
  const errorDiv = document.getElementById(`${sectionId}-error`);
  const contentDiv = document.getElementById(`${sectionId}-content`);

  if (loadingDiv) loadingDiv.style.display = 'block';
  if (errorDiv) errorDiv.style.display = 'none';
  if (contentDiv) contentDiv.style.display = 'none';
}

// 各セクションのコンテンツを表示する関数
function showSectionContent(sectionId) {
  const loadingDiv = document.getElementById(`${sectionId}-loading`);
  const errorDiv = document.getElementById(`${sectionId}-error`);
  const contentDiv = document.getElementById(`${sectionId}-content`);

  if (loadingDiv) loadingDiv.style.display = 'none';
  if (errorDiv) errorDiv.style.display = 'none';
  if (contentDiv) contentDiv.style.display = 'block';
}

// 各セクションのローディングを非表示にする関数
function hideSectionLoading(sectionId) {
  const loadingDiv = document.getElementById(`${sectionId}-loading`);
  const errorDiv = document.getElementById(`${sectionId}-error`);
  const contentDiv = document.getElementById(`${sectionId}-content`);

  if (loadingDiv) loadingDiv.style.display = 'none';
  if (errorDiv) errorDiv.style.display = 'none';
  if (contentDiv) contentDiv.style.display = 'none';
}

// 各セクションのエラー状態を表示する関数
function showSectionError(sectionId) {
  const loadingDiv = document.getElementById(`${sectionId}-loading`);
  const errorDiv = document.getElementById(`${sectionId}-error`);
  const contentDiv = document.getElementById(`${sectionId}-content`);

  if (loadingDiv) loadingDiv.style.display = 'none';
  if (errorDiv) errorDiv.style.display = 'block';
  if (contentDiv) contentDiv.style.display = 'none';
}

// セクションを非表示にする関数
function hideSection(sectionId) {
  const section = document
    .querySelector(`#${sectionId}-content`)
    .closest('.stats-section');
  if (section) {
    section.style.display = 'none';
  }
}

// エラーメッセージを表示する関数（既存のテーブルセル用）
function showErrorMessage() {
  // 言語を取得
  const locale = document.querySelector('.language-select')?.value || 'en';
  const errorMessage =
    locale === 'ja' ? 'データの読み込みに失敗しました' : 'Failed to load data';

  // 全てのテーブルセルにエラーメッセージを表示
  const allCells = document.querySelectorAll(
    '[id$="-all"], [id$="-nanbyo-group"], [id$="-nanbyo-disease"], [id$="-nanbyo-subtype"], [id$="-definition"], [id$="-inheritance"], [id$="-alternative-names"], [id$="-monarch-exact"], [id$="-monarch-close"], [id$="-orphanet"], [id$="-medgen"], [id$="-kegg"], [id$="-genes"], [id$="-genetic-testings"], [id$="-clinical-features"], [id$="-facial-features"], [id$="-human-data"], [id$="-chemicals"], [id$="-domestic-genes"], [id$="-international-genes"], [id$="-clinvar"], [id$="-mgend"], [id$="-cells"], [id$="-mouse"], [id$="-dna"]'
  );

  allCells.forEach((cell) => {
    cell.textContent = errorMessage;
    cell.style.color = '#dc3545'; // 赤色で表示
  });
}

function updateDiseaseStats(diseaseStats) {
  // 難病統計テーブル
  updateDiseaseStatsRow('shitei', diseaseStats.shitei);
  updateDiseaseStatsRow('shoman', diseaseStats.shoman);
}

function updateDiseaseStatsRow(category, data) {
  try {
    const fieldMapping = {
      all: 'all',
      'nanbyo-group': 'nanbyo_group',
      'nanbyo-disease': 'nanbyo_disease',
      'nanbyo-subtype': 'nanbyo_subtype',
    };

    Object.entries(fieldMapping).forEach(([field, dataKey]) => {
      const element = document.getElementById(`${category}-${field}`);
      if (!element) {
        console.error(`Element not found: ${category}-${field}`);
        return;
      }

      const value = data[dataKey];
      if (value === undefined) {
        console.error(`Data property not found: ${dataKey} in`, data);
        element.textContent = '-';
        return;
      }

      element.textContent = value === '-' ? '-' : value.toLocaleString();
    });
  } catch (error) {
    console.error(`Error updating disease stats for ${category}:`, error);
  }
}

function updateDiseaseOverview(diseaseOverview) {
  // 疾患概要テーブル
  updateDiseaseOverviewData(diseaseOverview);
}

function updateDiseaseOverviewData(diseaseOverview) {
  // 指定の疾患概要データを更新
  document.getElementById('shitei-definition').textContent =
    diseaseOverview.shitei.definition === '-'
      ? '-'
      : diseaseOverview.shitei.definition.toLocaleString();
  document.getElementById('shitei-inheritance').textContent =
    diseaseOverview.shitei.inheritance === '-'
      ? '-'
      : diseaseOverview.shitei.inheritance.toLocaleString();
  document.getElementById('shitei-alternative-names').textContent =
    diseaseOverview.shitei.alternativeNames === '-'
      ? '-'
      : diseaseOverview.shitei.alternativeNames.toLocaleString();

  // 小慢の疾患概要データを更新
  document.getElementById('shoman-definition').textContent =
    diseaseOverview.shoman.definition === '-'
      ? '-'
      : diseaseOverview.shoman.definition.toLocaleString();
  document.getElementById('shoman-inheritance').textContent =
    diseaseOverview.shoman.inheritance === '-'
      ? '-'
      : diseaseOverview.shoman.inheritance.toLocaleString();
  document.getElementById('shoman-alternative-names').textContent =
    diseaseOverview.shoman.alternativeNames === '-'
      ? '-'
      : diseaseOverview.shoman.alternativeNames.toLocaleString();
}

function updateLinks(links) {
  // リンクテーブル
  updateLinksData(links);
}

function updateLinksData(links) {
  // 指定のリンクデータを更新
  document.getElementById('shitei-monarch-exact').textContent =
    links.shitei.monarchExact === '-'
      ? '-'
      : links.shitei.monarchExact.toLocaleString();
  document.getElementById('shitei-monarch-close').textContent =
    links.shitei.monarchClose === '-'
      ? '-'
      : links.shitei.monarchClose.toLocaleString();
  document.getElementById('shitei-orphanet').textContent =
    links.shitei.orphanet === '-'
      ? '-'
      : links.shitei.orphanet.toLocaleString();
  document.getElementById('shitei-medgen').textContent =
    links.shitei.medgen === '-' ? '-' : links.shitei.medgen.toLocaleString();
  document.getElementById('shitei-kegg').textContent =
    links.shitei.kegg === '-' ? '-' : links.shitei.kegg.toLocaleString();

  // 小慢のリンクデータを更新
  document.getElementById('shoman-monarch-exact').textContent =
    links.shoman.monarchExact === '-'
      ? '-'
      : links.shoman.monarchExact.toLocaleString();
  document.getElementById('shoman-monarch-close').textContent =
    links.shoman.monarchClose === '-'
      ? '-'
      : links.shoman.monarchClose.toLocaleString();
  document.getElementById('shoman-orphanet').textContent =
    links.shoman.orphanet === '-'
      ? '-'
      : links.shoman.orphanet.toLocaleString();
  document.getElementById('shoman-medgen').textContent =
    links.shoman.medgen === '-' ? '-' : links.shoman.medgen.toLocaleString();
  document.getElementById('shoman-kegg').textContent =
    links.shoman.kegg === '-' ? '-' : links.shoman.kegg.toLocaleString();
}

function updateRelatedData(relatedData) {
  // 疾患関連データテーブル
  updateRelatedDataRow('shitei', relatedData.shitei);
  updateRelatedDataRow('shoman', relatedData.shoman);
}

function updateRelatedDataRow(category, data) {
  try {
    const fields = [
      'glycanGenes',
      'geneticTestings',
      'clinicalFeatures',
      'facialFeatures',
      'humanData',
      'chemicals',
    ];

    fields.forEach((field) => {
      const elementId = `${category}-${field
        .replace(/([A-Z])/g, '-$1')
        .toLowerCase()}`;
      const element = document.getElementById(elementId);

      if (!element) {
        console.error(`Element not found: ${elementId}`);
        return;
      }

      const value = data[field];
      if (value === undefined) {
        console.error(`Data property not found: ${field} in`, data);
        element.textContent = '-';
        return;
      }

      element.textContent = value === '-' ? '-' : value.toLocaleString();
    });
  } catch (error) {
    console.error(`Error updating related data for ${category}:`, error);
  }
}

function updateGenes(genes) {
  // 疾患関連遺伝子テーブル
  updateGenesRow('shitei', genes.shitei);
  updateGenesRow('shoman', genes.shoman);
}

function updateGenesRow(category, data) {
  try {
    const domesticElement = document.getElementById(
      `${category}-domestic-genes`
    );
    const internationalElement = document.getElementById(
      `${category}-international-genes`
    );

    if (!domesticElement) {
      console.error(`Element not found: ${category}-domestic-genes`);
    } else {
      const domesticValue = data.domestic;
      domesticElement.textContent =
        domesticValue === '-' ? '-' : domesticValue.toLocaleString();
    }

    if (!internationalElement) {
      console.error(`Element not found: ${category}-international-genes`);
    } else {
      const internationalValue = data.international;
      internationalElement.textContent =
        internationalValue === '-' ? '-' : internationalValue.toLocaleString();
    }
  } catch (error) {
    console.error(`Error updating genes for ${category}:`, error);
  }
}

function updateBioresources(bioresources) {
  // バイオリソーステーブル
  updateBioresourcesRow('shitei', bioresources.shitei);
  updateBioresourcesRow('shoman', bioresources.shoman);
}

function updateBioresourcesRow(category, data) {
  try {
    const cellsElement = document.getElementById(`${category}-cells`);
    const mouseElement = document.getElementById(`${category}-mouse`);
    const dnaElement = document.getElementById(`${category}-dna`);

    if (!cellsElement) {
      console.error(`Element not found: ${category}-cells`);
      return;
    }
    if (!mouseElement) {
      console.error(`Element not found: ${category}-mouse`);
      return;
    }
    if (!dnaElement) {
      console.error(`Element not found: ${category}-dna`);
      return;
    }

    cellsElement.textContent =
      data.cells === '-' ? '-' : data.cells.toLocaleString();
    mouseElement.textContent =
      data.mouse === '-' ? '-' : data.mouse.toLocaleString();
    dnaElement.textContent = data.dna === '-' ? '-' : data.dna.toLocaleString();
  } catch (error) {
    console.error(`Error updating bioresources for ${category}:`, error);
  }
}

function updateVariants(variants) {
  // バリアントテーブル
  updateVariantsRow('shitei', variants.shitei);
  updateVariantsRow('shoman', variants.shoman);
}

function updateVariantsRow(category, data) {
  try {
    const clinvarElement = document.getElementById(`${category}-clinvar`);
    const mgendElement = document.getElementById(`${category}-mgend`);

    if (!clinvarElement) {
      console.error(`Element not found: ${category}-clinvar`);
      return;
    }
    if (!mgendElement) {
      console.error(`Element not found: ${category}-mgend`);
      return;
    }

    clinvarElement.textContent =
      data.clinvar === '-' ? '-' : data.clinvar.toLocaleString();
    mgendElement.textContent =
      data.mgend === '-' ? '-' : data.mgend.toLocaleString();
  } catch (error) {
    console.error(`Error updating variants for ${category}:`, error);
  }
}

// 安全な数値変換関数
function safeParseInt(value) {
  if (value === null || value === undefined || value === '-') {
    return '-';
  }
  const parsed = parseInt(value);
  return isNaN(parsed) ? '-' : parsed;
}

// デフォルトデータ関数
function getDefaultNandoData() {
  return {
    shitei_all: { 'callret-0': '0' },
    shitei_group: { 'callret-0': '0' },
    shitei_disease: { 'callret-0': '0' },
    shoman_all: { 'callret-0': '0' },
    shoman_group: { 'callret-0': '0' },
    shoman_disease: { 'callret-0': '0' },
  };
}

function getDefaultBRCData() {
  return {
    shitei_cell: { cell: '0' },
    shitei_mouse: { mouse: '0' },
    shitei_DNA: { gene: '0' },
    shoman_cell: { cell: '0' },
    shoman_mouse: { mouse: '0' },
    shoman_DNA: { gene: '0' },
  };
}

function getDefaultLinkData() {
  return {
    name8: { mondo: '0' },
    name10: { medgen: '0' },
    name5: { kegg: '0' },
    name7: { mondo: '0' },
    name9: { medgen: '0' },
    name6: { kegg: '0' },
  };
}

function getDefaultLinkData2() {
  return {
    shitei_inheritance: { inheritance: '0' },
    shoman_inheritance: { inheritance: '0' },
    shitei_description: { desc: '0' },
    shoman_description: { desc: '0' },
    shitei_genetest: { genetest: '0' },
    shoman_genetest: { genetest: '0' },
    shitei_hp: { hp: '0' },
    shoman_hp: { hp: '0' },
    shitei_gene: { gene: '0' },
    shoman_gene: { gene: '0' },
    shitei_mgend: { mgend: '0' },
    shoman_mgend: { mgend: '0' },
    shitei_altlabel: { alt: '0' },
    shoman_altlabel: { alt: '0' },
  };
}

function getDefaultLinkData4() {
  return {
    shitei_gm: { GM: '0' },
    shoman_gm: { GM: '0' },
    shitei_hum: { hum: '0' },
    shoman_hum: { hum: '0' },
    shitei_CG: { curatedGene: '0' },
    shoman_CG: { curatedGene: '0' },
  };
}

function getDefaultLinkData5() {
  return {
    shitei_pubchem: { pubchem: '0' },
    shoman_pubchem: { pubchem: '0' },
  };
}

function getDefaultLinkData7() {
  return {
    shitei_clinvar: { num: '0' },
    shoman_clinvar: { num: '0' },
  };
}

function getDefaultGlycoGeneData() {
  return {
    glyco_gene_shitei: { num: '0' },
    glyco_gene_shoman: { num: '0' },
    glyco_gene_total: { num: '0' },
  };
}
