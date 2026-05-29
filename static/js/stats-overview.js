// 統計情報概要のデータ取得と表示
class StatsOverview {
  constructor() {
    this.apiEndpoint = 'NANDO_link_count2';
    this.timestamp = Date.now();
    this.statsConfigPath = '/static/data/nanbyodata-in-numbers-config.json';
    this.devDataOrigin = 'https://dev-nanbyodata.dbcls.jp';
  }

  isLocalhostHostname() {
    const h = typeof window !== 'undefined' ? window.location.hostname : '';
    return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '0.0.0.0';
  }

  resolveFetchUrl(pathOrUrl) {
    if (!pathOrUrl || typeof pathOrUrl !== 'string') return pathOrUrl;
    const s = pathOrUrl.trim();
    if (!s) return s;
    if (/^https?:\/\//i.test(s)) return s;
    if (!this.isLocalhostHostname()) return s;
    const path = s.startsWith('/') ? s : `/${s}`;
    if (path.startsWith('/static/')) return s;
    return `${this.devDataOrigin}${path}`;
  }

  normalizeTabCountValue(raw, countKey) {
    if (raw === null || raw === undefined) return '';
    const trimmed = String(raw).trim();
    if (!trimmed) return '';
    const key = String(countKey || '').toLowerCase();
    const geneSymbolKeys = new Set(['symbol', 'gene_symbol', 'genesymbol']);
    return geneSymbolKeys.has(key) ? trimmed.toUpperCase() : trimmed;
  }

  getTabCountValue(rows, tab) {
    if (!Array.isArray(rows)) return 0;
    const countKey =
      tab?.countDataKey ||
      (tab?.columns && tab.columns[0] ? tab.columns[0].dataKey : null);
    if (countKey === '__row_count__') return rows.length;
    if (!countKey) return rows.length;
    const seen = new Set();
    rows.forEach((row) => {
      if (!row || typeof row !== 'object') return;
      const normalized = this.normalizeTabCountValue(row[countKey], countKey);
      if (normalized !== '') seen.add(normalized);
    });
    return seen.size;
  }

  applyRowFilter(rows, filterConfig) {
    if (!Array.isArray(rows) || !filterConfig || typeof filterConfig !== 'object') {
      return rows;
    }
    const key = typeof filterConfig.key === 'string' ? filterConfig.key : '';
    if (!key) return rows;

    if (filterConfig.exists === true) {
      return rows.filter((row) => row && row[key] != null && row[key] !== '');
    }
    if (filterConfig.exists === false) {
      return rows.filter((row) => !row || row[key] == null || row[key] === '');
    }
    if (Object.prototype.hasOwnProperty.call(filterConfig, 'equals')) {
      return rows.filter((row) => row && row[key] === filterConfig.equals);
    }
    if (Array.isArray(filterConfig.in)) {
      const allowed = new Set(filterConfig.in);
      return rows.filter((row) => row && allowed.has(row[key]));
    }
    return rows;
  }

  applyRowGroup(rows, groupConfig) {
    if (!Array.isArray(rows) || !groupConfig || typeof groupConfig !== 'object') {
      return rows;
    }
    const groupKeys = Array.isArray(groupConfig.keys)
      ? groupConfig.keys.filter((k) => typeof k === 'string' && k)
      : [];
    if (groupKeys.length === 0) return rows;
    const mergeFields = Array.isArray(groupConfig.mergeFields)
      ? groupConfig.mergeFields.filter((k) => typeof k === 'string' && k)
      : [];
    const separator =
      typeof groupConfig.separator === 'string' && groupConfig.separator
        ? groupConfig.separator
        : ' / ';

    const grouped = new Map();
    rows.forEach((row) => {
      if (!row || typeof row !== 'object') return;
      const key = groupKeys.map((k) => String(row[k] ?? '')).join('\u0000');
      if (!grouped.has(key)) {
        const seed = { ...row };
        mergeFields.forEach((field) => {
          seed[field] = row[field] ?? '';
        });
        grouped.set(key, seed);
        return;
      }
      const acc = grouped.get(key);
      mergeFields.forEach((field) => {
        const current = acc[field] == null ? '' : String(acc[field]);
        const next = row[field] == null ? '' : String(row[field]);
        if (!next) return;
        const existing = current
          ? current
              .split(separator)
              .map((v) => v.trim())
              .filter(Boolean)
          : [];
        if (!existing.includes(next)) {
          existing.push(next);
        }
        acc[field] = existing.join(separator);
      });
    });
    return Array.from(grouped.values());
  }

  prepareSectionRows(rows, section) {
    if (!Array.isArray(rows)) return [];
    const prepared = rows.map((row) => ({ ...row }));
    prepared.forEach((row) => {
      if (row && row.kegg_url != null && row.kegg == null) {
        row.kegg = row.kegg_url;
      }
    });
    let result = this.applyRowFilter(prepared, section?.rowFilter);
    result = this.applyRowGroup(result, section?.rowGroupBy);
    return result;
  }

  prepareTabRows(rows, tab) {
    return this.prepareSectionRows(rows, tab);
  }

  async fetchRowsFromDataUrl(dataUrl) {
    const url = this.resolveFetchUrl(dataUrl);
    const res = await fetch(`${url}?timestamp=${this.timestamp}`);
    if (!res.ok) throw new Error(`Failed to fetch ${dataUrl}: ${res.status}`);
    const json = await res.json();
    return json.rows || json.data || (Array.isArray(json) ? json : []);
  }

  async fetchSectionTotalFromConfig(sectionId) {
    const configUrl = this.resolveFetchUrl(this.statsConfigPath);
    const res = await fetch(`${configUrl}?timestamp=${this.timestamp}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch stats config: ${res.status}`);
    }
    const config = await res.json();
    const sections = Array.isArray(config?.sections) ? config.sections : [];
    const section = sections.find((s) => s?.id === sectionId);
    if (!section) {
      throw new Error(`Section not found: ${sectionId}`);
    }

    if (Array.isArray(section.tabs) && section.tabs.length > 0) {
      const tabs = section.tabs.filter(
        (tab) =>
          typeof tab?.dataUrl === 'string' &&
          tab.dataUrl.trim() !== '' &&
          Array.isArray(tab.columns) &&
          tab.columns.length > 0,
      );
      if (tabs.length === 0) {
        throw new Error(`No data tabs found: ${sectionId}`);
      }

      const counts = await Promise.all(
        tabs.map(async (tab) => {
          const rows = await this.fetchRowsFromDataUrl(tab.dataUrl.trim());
          const preparedRows = this.prepareTabRows(rows, tab);
          return this.getTabCountValue(preparedRows, tab);
        }),
      );
      return counts.reduce((sum, value) => sum + value, 0);
    }

    const dataUrl = section.dataUrl ?? section.dataApi;
    if (
      typeof dataUrl === 'string' &&
      dataUrl.trim() !== '' &&
      Array.isArray(section.columns) &&
      section.columns.length > 0
    ) {
      const rows = await this.fetchRowsFromDataUrl(dataUrl.trim());
      const preparedRows = this.prepareSectionRows(rows, section);
      return this.getTabCountValue(preparedRows, section);
    }

    throw new Error(`Section not found: ${sectionId}`);
  }

  // 各APIを個別に取得して、取得できたものから順次表示
  async fetchStatsData() {
    const allData = {};

    // NANDO_count APIからNANDOデータを取得
    fetch(`/sparqlist/api/NANDO_count?timestamp=${this.timestamp}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((nandoData) => {
        if (nandoData) {
          allData.nandoData = nandoData;
          const shiteiAll = parseInt(nandoData.shitei_all?.['callret-0'] || 0);
          const shomanAll = parseInt(nandoData.shoman_all?.['callret-0'] || 0);
          const nandoTotal = shiteiAll + shomanAll;
          this.updateCard(
            'intractable_diseases',
            nandoTotal > 0 ? nandoTotal.toString() : '-',
          );
        }
      })
      .catch((error) => {
        console.error('NANDO_count API failed:', error);
        this.updateCard('intractable_diseases', 'N/A');
      });

    // NANDO_link_count2 APIから検査・臨床特徴データを取得
    fetch(`/sparqlist/api/NANDO_link_count2?timestamp=${this.timestamp}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((linkData2) => {
        if (linkData2) {
          allData.linkData2 = linkData2;

          // 診療用遺伝学的検査
          const shiteiTests = parseInt(
            linkData2.shitei_genetest?.genetest || 0,
          );
          const shomanTests = parseInt(
            linkData2.shoman_genetest?.genetest || 0,
          );
          const totalTests = shiteiTests + shomanTests;
          this.updateCard(
            'clinical_tests',
            totalTests > 0 ? totalTests.toString() : '-',
          );
        }
      })
      .catch((error) => {
        console.error('NANDO_link_count2 API failed:', error);
        this.updateCard('clinical_tests', 'N/A');
      });

    this.fetchSectionTotalFromConfig('clinical-features-content')
      .then((total) => {
        this.updateCard(
          'clinical_features',
          total > 0 ? total.toString() : '-',
        );
      })
      .catch((error) => {
        console.error('Failed to load clinical features total from stats config:', error);
        const linkData2 = allData.linkData2;
        if (!linkData2) {
          this.updateCard('clinical_features', 'N/A');
          return;
        }
        const shiteiFeatures = parseInt(linkData2.shitei_hp?.hp || 0);
        const shomanFeatures = parseInt(linkData2.shoman_hp?.hp || 0);
        const fallbackTotal = shiteiFeatures + shomanFeatures;
        this.updateCard(
          'clinical_features',
          fallbackTotal > 0 ? fallbackTotal.toString() : '-',
        );
      });

    this.fetchSectionTotalFromConfig('facial-features-content')
      .then((total) => {
        this.updateCard(
          'facial_features',
          total > 0 ? total.toString() : '-',
        );
      })
      .catch((error) => {
        console.error('Failed to load facial features total from stats config:', error);
        fetch(`/sparqlist/api/NANDO_link_count4?timestamp=${this.timestamp}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((linkData4) => {
            if (!linkData4) {
              this.updateCard('facial_features', 'N/A');
              return;
            }
            const shiteiFacial = parseInt(linkData4.shitei_gm?.GM || 0);
            const shomanFacial = parseInt(linkData4.shoman_gm?.GM || 0);
            const fallbackTotal = shiteiFacial + shomanFacial;
            this.updateCard(
              'facial_features',
              fallbackTotal > 0 ? fallbackTotal.toString() : '-',
            );
          })
          .catch(() => {
            this.updateCard('facial_features', 'N/A');
          });
      });

    // APIから糖鎖関連遺伝子データを取得
    fetch(`/sparqlist/api/NANDO_link_count8?timestamp=${this.timestamp}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((glycoData) => {
        if (glycoData) {
          allData.glycoData = glycoData;
          const glycoGeneTotal = parseInt(glycoData.glyco_gene_total?.num || 0);
          this.updateCard(
            'glycan_genes',
            glycoGeneTotal > 0 ? glycoGeneTotal.toString() : '-',
          );
        }
      })
      .catch((error) => {
        console.error('NANDO_link_count8 API failed:', error);
        this.updateCard('glycan_genes', 'N/A');
      });

    fetch(`/sparqlist/api/NANDO_link_count?timestamp=${this.timestamp}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((linkData) => {
        if (linkData) {
          allData.linkData = linkData;
        }
      })
      .catch((error) => {
        console.error('NANDO_link_count API failed:', error);
      });

    // 各ページの合計値（nanbyodata-in-numbers のタブ集計）でカード件数を更新
    this.fetchSectionTotalFromConfig('genes-content')
      .then((total) => {
        this.updateCard('disease_genes', total > 0 ? total.toString() : '-');
      })
      .catch((error) => {
        console.error('Failed to load genes total from stats config:', error);
        const linkData2 = allData.linkData2;
        if (!linkData2) {
          this.updateCard('disease_genes', 'N/A');
          return;
        }
        const shiteiGenes = parseInt(linkData2.shitei_gene?.gene || 0);
        const shomanGenes = parseInt(linkData2.shoman_gene?.gene || 0);
        const fallbackTotal = shiteiGenes + shomanGenes;
        this.updateCard(
          'disease_genes',
          fallbackTotal > 0 ? fallbackTotal.toString() : '-',
        );
      });

    this.fetchSectionTotalFromConfig('bioresources-content')
      .then((total) => {
        this.updateCard('bioresources', total > 0 ? total.toString() : '-');
      })
      .catch((error) => {
        console.error('Failed to load bioresources total from stats config:', error);
        fetch(`/sparqlist/api/NANDO_link_count3?timestamp=${this.timestamp}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((brcData) => {
            if (!brcData) {
              this.updateCard('bioresources', 'N/A');
              return;
            }
            const shiteiCells = parseInt(brcData.shitei_cell?.cell || 0);
            const shomanCells = parseInt(brcData.shoman_cell?.cell || 0);
            const shiteiMice = parseInt(brcData.shitei_mouse?.mouse || 0);
            const shomanMice = parseInt(brcData.shoman_mouse?.mouse || 0);
            const shiteiDna = parseInt(brcData.shitei_DNA?.gene || 0);
            const shomanDna = parseInt(brcData.shoman_DNA?.gene || 0);
            const fallbackTotal =
              shiteiCells +
              shomanCells +
              shiteiMice +
              shomanMice +
              shiteiDna +
              shomanDna;
            this.updateCard(
              'bioresources',
              fallbackTotal > 0 ? fallbackTotal.toString() : '-',
            );
          })
          .catch(() => {
            this.updateCard('bioresources', 'N/A');
          });
      });

    this.fetchSectionTotalFromConfig('links-content')
      .then((total) => {
        this.updateCard('external_links', total > 0 ? total.toString() : '-');
      })
      .catch((error) => {
        console.error('Failed to load links total from stats config:', error);
        const linkData = allData.linkData;
        if (!linkData) {
          this.updateCard('external_links', 'N/A');
          return;
        }
        const shiteiMonarchExact = parseInt(linkData.name2?.mondo || 0);
        const shiteiMonarchClose = parseInt(linkData.name4?.mondo || 0);
        const shiteiOrphanet = parseInt(linkData.name12?.mondo || 0);
        const shiteiMedgen = parseInt(linkData.name10?.medgen || 0);
        const shiteiKegg = parseInt(linkData.name5?.kegg || 0);
        const shomanMonarchExact = parseInt(linkData.name1?.mondo || 0);
        const shomanMonarchClose = parseInt(linkData.name3?.mondo || 0);
        const shomanOrphanet = parseInt(linkData.name11?.mondo || 0);
        const shomanMedgen = parseInt(linkData.name9?.medgen || 0);
        const shomanKegg = parseInt(linkData.name6?.kegg || 0);
        const fallbackTotal =
          shiteiMonarchExact +
          shiteiMonarchClose +
          shiteiOrphanet +
          shiteiMedgen +
          shiteiKegg +
          shomanMonarchExact +
          shomanMonarchClose +
          shomanOrphanet +
          shomanMedgen +
          shomanKegg;
        this.updateCard(
          'external_links',
          fallbackTotal > 0 ? fallbackTotal.toString() : '-',
        );
      });

    return allData;
  }

  // 個別のカードを更新するヘルパーメソッド
  updateCard(apiName, value) {
    const element = document.querySelector(`[data-api="${apiName}"]`);
    if (element) {
      const spinner = element.querySelector('.loading-spinner');
      if (spinner) {
        spinner.remove();
      }
      element.textContent = this.formatNumber(value);
    }
  }

  // 数値をカンマ区切りでフォーマット
  formatNumber(num) {
    if (num === '-' || num === null || num === undefined || num === 'N/A') {
      return num;
    }
    return parseInt(num).toLocaleString();
  }

  // ローディング状態を表示
  showLoading() {
    const loadingElements = document.querySelectorAll('[data-api]');
    loadingElements.forEach((element) => {
      // 既存のspinnerがあれば削除
      const existingSpinner = element.querySelector('.loading-spinner');
      if (existingSpinner) {
        existingSpinner.remove();
      }

      // 新しいspinnerを追加
      const spinner = document.createElement('div');
      spinner.className = 'loading-spinner -stats';
      element.appendChild(spinner);
    });
  }

  // エラー状態を表示
  showError() {
    const errorElements = document.querySelectorAll('[data-api]');
    errorElements.forEach((element) => {
      // spinnerを削除してエラーメッセージを表示
      const spinner = element.querySelector('.loading-spinner');
      if (spinner) {
        spinner.remove();
      }
      element.textContent = 'N/A';
    });
  }

  // 初期化
  async init() {
    // ローディング状態を表示
    this.showLoading();

    try {
      // データを取得（各APIが完了次第、個別に表示される）
      await this.fetchStatsData();
    } catch (error) {
      console.error('Error initializing stats overview:', error);
      this.showError();
    }
  }
}

export { StatsOverview };
