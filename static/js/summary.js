(function () {
  const DEFAULT_ID = '1200473';
  let currentDownloadData = null;
  let activeLoadToken = 0;

  const $ = (id) => document.getElementById(id);
  const summaryRoot = $('summary-root');

  function normalizeNandoId(raw) {
    const trimmed = String(raw || '').trim();
    if (!trimmed) return '';
    return trimmed.toUpperCase().startsWith('NANDO:') ? trimmed.slice(6) : trimmed;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function uniqueBy(items, keyFn) {
    const seen = new Set();
    return items.filter((item) => {
      const key = keyFn(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function setStatus(message, isError = false) {
    const el = $('status');
    if (!el) return;
    el.textContent = message;
    el.className = isError ? 'summary-status error' : 'summary-status';
  }

  function setText(id, value) {
    const el = $(id);
    if (el) {
      el.textContent = value ?? '-';
    }
  }

  function setHref(id, href) {
    const el = $(id);
    if (el) {
      el.href = href;
    }
  }

  async function fetchJson(endpoint, id) {
    const url = `/sparqlist/api/${endpoint}?nando_id=${encodeURIComponent(id)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`${endpoint}: HTTP ${response.status}`);
    }
    return response.json();
  }

  function downloadBlob(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function sanitizeFilename(value) {
    return String(value || 'nando-disease')
      .replace(/[\\/:*?"<>|]+/g, '_')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function buildTxtDownload(data) {
    const lines = [];
    lines.push(`${data.overview.labelJa || ''}`);
    lines.push(`${data.overview.labelEn || ''}`);
    lines.push('');
    lines.push(`NANDO ID: ${data.overview.nandoId || '-'}`);
    lines.push(`MONDO ID: ${data.overview.mondoId || '-'} (${data.overview.mondoMatchType || '-'})`);
    lines.push(`告示番号: ${data.overview.notificationNumber || '-'}`);
    lines.push(`代表略称: ${data.overview.aliasPrimary || '-'}`);
    lines.push('');
    lines.push('説明');
    lines.push(data.overview.description || '-');
    lines.push('');
    lines.push('統計情報');
    Object.entries(data.stats || {}).forEach(([key, value]) => {
      lines.push(`${key}: ${value}`);
    });
    lines.push('');
    lines.push('特定医療費受給者証所持者数の推移');
    (data.patients || []).forEach((item) => {
      lines.push(`${item.year}: ${item.count}`);
    });
    lines.push('');
    lines.push('関連遺伝子');
    (data.genes || []).forEach((gene) => {
      lines.push(`${gene.symbol} | ${gene.name}`);
      lines.push(`URL: ${gene.url || '-'}`);
      lines.push(`${gene.note || '-'}`);
      lines.push('');
    });
    lines.push('臨床所見');
    (data.features || []).forEach((feature) => {
      lines.push(`${feature.category} | ${feature.categoryUrl || '-'}`);
      feature.items.forEach((item) => lines.push(`- ${item.label} | ${item.url || '-'}`));
      lines.push('');
    });
    lines.push('疾患階層');
    lines.push(`${data.subclasses?.root?.ja || '-'} | ${data.subclasses?.root?.en || '-'} | ${data.subclasses?.root?.id || '-'}`);
    (data.subclasses?.children || []).forEach((child) => lines.push(`- ${child.ja} | ${child.en} | ${child.id}`));
    lines.push('');
    lines.push('外部リンク');
    (data.links || []).forEach((link) => lines.push(`${link.label}: ${link.url}`));
    lines.push('');
    lines.push('最新文献');
    (data.references || []).forEach((ref) => {
      lines.push(`${ref.date} | PMID ${ref.pmid}`);
      lines.push(ref.title);
      lines.push(`${ref.journal}`);
      lines.push(`${ref.url}`);
      lines.push('');
    });
    return lines.join('\n');
  }

  function updateDownloadData(patch) {
    currentDownloadData = {
      ...(currentDownloadData || {}),
      ...patch,
    };
  }

  function setDescription(text) {
    const el = $('description');
    const button = $('description-toggle');
    if (!el || !button) return;
    el.textContent = text || '説明データはありません。';
    el.classList.remove('expanded');

    const isLong = (text || '').length > 360;
    button.hidden = !isLong;
    button.textContent = 'More';
  }

  function configureStatLinks(id) {
    const base = `${window.location.origin}/disease/NANDO:${encodeURIComponent(id)}`;
    setHref('detail-link', base);
    setHref('link-overview', `${base}#overview`);
    setHref('link-genes-japan', `${base}#genes-japan-curated`);
    setHref('link-genes-international', `${base}#genes-internationally-curated`);
    setHref('link-glycan-genes', `${base}#glycan-related-genes`);
    setHref('link-genetic-testing', `${base}#genetic-testing`);
    setHref('link-clinical-features', `${base}#clinical-features`);
    setHref('link-facial-features', `${base}#facial-features`);
    setHref('link-human-datasets', `${base}#human-genomic-datasets`);
    setHref('link-cell', `${base}#bio-resources-cell`);
    setHref('link-mouse', `${base}#bio-resources-mouse`);
    setHref('link-dna', `${base}#bio-resources-dna`);
    setHref('link-compounds', `${base}#compounds`);
    setHref('link-clinvar', `${base}#variants-clinvar`);
    setHref('link-mgend', `${base}#variants-mgend`);
    setHref('link-references', `${base}#references`);
  }

  function resetView(id) {
    document.title = 'Disease Summary | NanbyoData';
    currentDownloadData = {
      overview: {
        nandoId: `NANDO:${id}`,
      },
      stats: {},
      patients: [],
      genes: [],
      features: [],
      subclasses: {
        root: null,
        children: [],
      },
      links: [],
      references: [],
    };
    setText('title-ja', 'Loading...');
    setText('title-en', '');
    setDescription('');
    setText('nando-id', `NANDO:${id}`);
    setText('notification-number', '-');
    setText('alias-primary', '-');
    configureStatLinks(id);

    [
      'latest-patient-count',
      'japan-gene-count',
      'reference-count',
      'variant-count',
      'gene-count',
      'glycan-gene-count',
      'genetic-testing-count',
      'clinical-feature-count',
      'facial-feature-count',
      'human-dataset-count',
      'cell-count',
      'mouse-count',
      'dna-count',
      'compound-count',
      'mgend-count',
      'insight-axis',
      'insight-axis-note',
      'insight-patients',
      'insight-patients-note',
      'insight-paper',
      'insight-paper-note',
    ].forEach((key) => setText(key, '-'));

    $('trend-chart').innerHTML = '<div class="summary-tiny">読み込み中...</div>';
    $('gene-grid').innerHTML = '<div class="summary-tiny">読み込み中...</div>';
    $('feature-grid').innerHTML = '<div class="summary-tiny">読み込み中...</div>';
    $('subclass-tree').innerHTML = '<div class="summary-tiny">読み込み中...</div>';
    $('link-grid').innerHTML = '<div class="summary-tiny">読み込み中...</div>';
    $('reference-list').innerHTML = '<div class="summary-tiny">読み込み中...</div>';
  }

  function isActiveLoad(token) {
    return token === activeLoadToken;
  }

  function renderTrendChart(points) {
    if (!points.length) {
      $('trend-chart').innerHTML = '<div class="summary-tiny">患者数データはありません。</div>';
      return;
    }

    const width = 760;
    const height = 260;
    const padX = 48;
    const padY = 28;
    const counts = points.map((p) => p.count);
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    const range = Math.max(max - min, 1);
    const xStep = (width - padX * 2) / Math.max(points.length - 1, 1);
    const y = (value) => height - padY - ((value - min) / range) * (height - padY * 2);
    const x = (index) => padX + index * xStep;
    const d = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(point.count)}`).join(' ');
    const area = `${d} L ${x(points.length - 1)} ${height - padY} L ${x(0)} ${height - padY} Z`;
    const markers = points
      .map(
        (point, index) => `
        <g>
          <circle cx="${x(index)}" cy="${y(point.count)}" r="5" fill="#1d6b52"></circle>
          <text x="${x(index)}" y="${height - 8}" text-anchor="middle" fill="#5f685f" font-size="12">${escapeHtml(point.year)}</text>
          <text x="${x(index)}" y="${y(point.count) - 12}" text-anchor="middle" fill="#114736" font-size="12" font-weight="700">${escapeHtml(point.count)}</text>
        </g>
      `
      )
      .join('');

    $('trend-chart').innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="患者数推移">
        <defs>
          <linearGradient id="summaryTrendFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="rgba(29,107,82,0.26)"></stop>
            <stop offset="100%" stop-color="rgba(29,107,82,0.02)"></stop>
          </linearGradient>
        </defs>
        <line x1="${padX}" y1="${height - padY}" x2="${width - padX}" y2="${height - padY}" stroke="rgba(21,32,24,0.14)"></line>
        <line x1="${padX}" y1="${padY}" x2="${padX}" y2="${height - padY}" stroke="rgba(21,32,24,0.14)"></line>
        <path d="${area}" fill="url(#summaryTrendFill)"></path>
        <path d="${d}" fill="none" stroke="#1d6b52" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"></path>
        ${markers}
      </svg>
      <div class="summary-chart-caption">
        <span>最小 ${escapeHtml(min)}人</span>
        <span>最大 ${escapeHtml(max)}人</span>
      </div>
    `;
  }

  function renderGenes(items) {
    $('gene-grid').innerHTML = items.length
      ? items
          .map(
            (gene) => `
        <article class="summary-gene-card">
          <a class="summary-gene-symbol" href="${escapeHtml(gene.url || '#')}" target="_blank" rel="noopener noreferrer">${escapeHtml(gene.symbol)}</a>
          <h3>${escapeHtml(gene.name)}</h3>
          <div class="summary-tiny">${escapeHtml(gene.note)}</div>
        </article>
      `
          )
          .join('')
      : '<div class="summary-tiny">遺伝子データはありません。</div>';
  }

  function renderFeatures(items) {
    $('feature-grid').innerHTML = items.length
      ? items
          .map(
            (feature) => `
        <article class="summary-feature-card">
          <h3><a href="${escapeHtml(feature.categoryUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(feature.category)}</a></h3>
          <div class="summary-feature-tags">
            ${feature.items
              .map(
                (item) =>
                  `<a class="summary-tag" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.label)}</a>`
              )
              .join('')}
          </div>
        </article>
      `
          )
          .join('')
      : '<div class="summary-tiny">臨床所見データはありません。</div>';
  }

  function renderSubclasses(root, children) {
    $('subclass-tree').innerHTML = `
      <div class="summary-tree-root">
        <strong>${escapeHtml(root.ja)}</strong><br>
        <span>${escapeHtml(root.en)}</span><br>
        <span>${escapeHtml(root.id)}</span>
      </div>
      <div class="summary-tree-children">
        ${
          children.length
            ? children
                .map(
                  (child) => `
          <div class="summary-child-card">
            <h3>${escapeHtml(child.ja)}</h3>
            <div class="summary-tiny">${escapeHtml(child.en)}<br>${escapeHtml(child.id)}</div>
          </div>
        `
                )
                .join('')
            : '<div class="summary-tiny">サブクラスはありません。</div>'
        }
      </div>
    `;
  }

  function renderLinks(items) {
    $('link-grid').innerHTML = items.length
      ? items
          .map(
            (link) => `
        <article class="summary-link-card">
          <h3><a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a></h3>
          <div class="summary-tiny">${escapeHtml(getLinkDescription(link.label))}</div>
        </article>
      `
          )
          .join('')
      : '<div class="summary-tiny">リンク情報はありません。</div>';
  }

  function renderReferences(items) {
    $('reference-list').innerHTML = items.length
      ? items
          .map(
            (ref) => `
        <article class="summary-reference-card">
          <div class="summary-reference-meta">
            <span>${escapeHtml(ref.date)}</span>
            <span>PMID ${escapeHtml(ref.pmid)}</span>
          </div>
          <h3><a href="${escapeHtml(ref.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(ref.title)}</a></h3>
          <div class="summary-tiny">${escapeHtml(ref.journal)}</div>
        </article>
      `
          )
          .join('')
      : '<div class="summary-tiny">文献データはありません。</div>';
  }

  function mapGenes(japanGenes, causalGenes) {
    const japanMap = new Map(
      japanGenes.map((gene) => [
        gene.symbol,
        {
          symbol: gene.symbol,
          name: gene.gene_name || gene.symbol,
          note: gene.gene_description || 'Japan-curated gene',
          url: gene.ncbi || (gene.ncbi_id ? `https://www.ncbi.nlm.nih.gov/gene/${gene.ncbi_id}` : '#'),
        },
      ])
    );

    for (const gene of causalGenes) {
      if (!japanMap.has(gene.gene_symbol)) {
        japanMap.set(gene.gene_symbol, {
          symbol: gene.gene_symbol,
          name: gene.mondo_label || gene.gene_symbol,
          note: `${gene.source || 'curated'}: ${gene.mondo_label_ja || gene.mondo_label || 'associated subtype'}`,
          url: gene.ncbi_url || (gene.ncbi_id ? `https://www.ncbi.nlm.nih.gov/gene/${gene.ncbi_id}` : '#'),
        });
      }
    }

    return Array.from(japanMap.values()).slice(0, 8);
  }

  function mapFeatures(hpoData) {
    const grouped = new Map();
    for (const item of hpoData) {
      const key =
        item.hpo_category ||
        item.hpo_category_name_ja ||
        item.hpo_category_name_en ||
        '未分類';
      if (!grouped.has(key)) {
        grouped.set(key, {
          category: item.hpo_category_name_ja || item.hpo_category_name_en || '未分類',
          categoryUrl: item.hpo_category || '#',
          items: new Map(),
        });
      }
      const group = grouped.get(key);
      const itemKey =
        item.hpo_url || item.hpo_id || item.hpo_label_ja || item.hpo_label_en;
      if (!group.items.has(itemKey)) {
        group.items.set(itemKey, {
          label: item.hpo_label_ja || item.hpo_label_en || item.hpo_id,
          url: item.hpo_url || '#',
        });
      }
    }
    return Array.from(grouped.values()).map((group) => ({
      category: group.category,
      categoryUrl: group.categoryUrl,
      items: Array.from(group.items.values()),
    }));
  }

  function mapLinks(overview, mondo, orphanet, medgen, kegg) {
    const links = [];

    if (overview.mhlw?.url) links.push({ label: 'MHLW 概要・診断基準', url: overview.mhlw.url });
    if (overview.source) links.push({ label: 'MHLW 個票', url: overview.source });
    if (overview.nanbyou?.url) links.push({ label: '難病情報センター', url: overview.nanbyou.url });

    const mondoItem = mondo.find((item) => item.mondo_url);
    if (mondoItem?.mondo_url) links.push({ label: 'MONDO', url: mondoItem.mondo_url });

    const orphanetItem = orphanet.find((item) => item.original_disease);
    if (orphanetItem?.original_disease) links.push({ label: 'Orphanet', url: orphanetItem.original_disease });

    const medgenItem = medgen.find((item) => item.original_disease);
    if (medgenItem?.original_disease) links.push({ label: 'MedGen', url: medgenItem.original_disease });

    const keggItem = kegg.find((item) => item.kegg_url);
    if (keggItem?.kegg_url) links.push({ label: 'KEGG Disease', url: keggItem.kegg_url });

    return uniqueBy(links, (link) => `${link.label}:${link.url}`);
  }

  function getLinkDescription(label) {
    const descriptions = {
      'MHLW 概要・診断基準': '厚生労働省が公開する疾患概要と診断基準の資料です。',
      'MHLW 個票': '指定難病の臨床調査個人票の様式を確認できます。',
      '難病情報センター': '患者向けの解説や支援制度情報を掲載する国内ポータルです。',
      MONDO: '疾患オントロジー上の統合 ID と対応関係を参照できます。',
      Orphanet: '希少疾患の国際データベースにある該当疾患ページです。',
      MedGen: 'NCBI の疾患概念データベースで関連概念を確認できます。',
      'KEGG Disease': 'KEGG Disease に登録された疾患エントリです。',
    };
    return descriptions[label] || '関連する外部データベースへのリンクです。';
  }

  function formatMatchType(property) {
    if (!property) return '-';
    if (property.includes('exactMatch')) return 'Exact Match';
    if (property.includes('closeMatch')) return 'Close Match';
    return property.split('#').pop() || property;
  }

  function buildSummaryUrl(id) {
    const params = new URLSearchParams(window.location.search);
    const exportParam = params.get('export');
    const langParam = params.get('lang');
    const nextParams = new URLSearchParams();
    if (langParam) nextParams.set('lang', langParam);
    if (exportParam) nextParams.set('export', exportParam);
    const queryString = nextParams.toString();
    return `/summary/NANDO:${encodeURIComponent(id)}${queryString ? `?${queryString}` : ''}`;
  }

  async function loadDisease(rawId) {
    const id = normalizeNandoId(rawId);
    if (!id) {
      setStatus('URL に NANDO ID を指定してください。例: /summary/NANDO:1200473', true);
      return;
    }

    const loadToken = ++activeLoadToken;
    resetView(id);
    setStatus('');

    const overviewPromise = fetchJson('nanbyodata_get_overview_by_nando_id', id);
    const patientPromise = fetchJson('nanbyodata_get_stats_on_patient_number_by_nando_id', id);
    const subClassPromise = fetchJson('nanbyodata_get_sub_class_by_nando_id', id);
    const japanGenesPromise = fetchJson('nanbyodata_get_japan_curated_gene_by_nando_id', id);
    const causalGenesPromise = fetchJson('nanbyodata_get_causal_gene_by_nando_id', id);
    const hpoPromise = fetchJson('nanbyodata_get_hpo_data_by_nando_id', id);
    const glycanPromise = fetchJson('nanbyodata_get_glycosmos_gene_by_nando_id', id);
    const facialPromise = fetchJson('nanbyodata_get_gestaltmatcher_data_by_nando_id', id);
    const humanPromise = fetchJson('nanbyodata_get_nbdc_human_databases_info_by_nando_id', id);
    const cellPromise = fetchJson('nanbyodata_get_riken_brc_cell_info_by_nando_id', id);
    const mousePromise = fetchJson('nanbyodata_get_riken_brc_mouse_info_by_nando_id', id);
    const dnaPromise = fetchJson('nanbyodata_get_riken_brc_dna_info_by_nando_id', id);
    const compoundsPromise = fetchJson('nanbyodata_get_pubchem_chemical_information_by_nando_id', id);
    const referencesPromise = fetchJson('nanbyodata_get_pubmed_data_by_nando_id', id);
    const mondoPromise = fetchJson('nanbyodata_get_link_mondo_by_nando_id', id);
    const orphanetPromise = fetchJson('nanbyodata_get_link_orphanet_by_nando_id', id);
    const medgenPromise = fetchJson('nanbyodata_get_link_medgen_by_nando_id', id);
    const keggPromise = fetchJson('nanbyodata_get_link_kegg_by_nando_id', id);
    const clinvarPromise = fetchJson('nanbyodata_get_clinvar_variant_by_nando_id', id);
    const mgendPromise = fetchJson('nanbyodata_get_mgend_variant_by_nando_id', id);
    const geneticTestsPromise = fetchJson('nanbyodata_get_genetic_test_by_nando_id', id);

    let failures = 0;
    const noteFailure = (error) => {
      failures += 1;
      if (isActiveLoad(loadToken)) {
        setStatus(`一部データの取得に失敗しています。${error.message}`, true);
      }
    };

    overviewPromise
      .then((overview) => {
        if (!isActiveLoad(loadToken)) return;
        const alias = overview.alt_label_en?.[0] || overview.alt_label_ja?.[0] || '-';
        document.title = `${overview.label_ja || overview.label_en || `NANDO:${id}`} | Disease Summary`;
        setText('title-ja', overview.label_ja || overview.label_en || `NANDO:${id}`);
        setText('title-en', overview.label_en || '');
        setDescription(
          overview.description ||
            overview.medgen_definition ||
            overview.kegg_description ||
            '説明データはありません。'
        );
        setText('notification-number', overview.notification_number || '-');
        setText('alias-primary', alias);
        updateDownloadData({
          overview: {
            ...(currentDownloadData?.overview || {}),
            nandoId: `NANDO:${id}`,
            labelJa: overview.label_ja || '',
            labelEn: overview.label_en || '',
            notificationNumber: overview.notification_number || '-',
            aliasPrimary: alias,
            description:
              overview.description ||
              overview.medgen_definition ||
              overview.kegg_description ||
              '',
          },
        });
      })
      .catch(noteFailure);

    Promise.all([overviewPromise, mondoPromise])
      .then(([overview, mondo]) => {
        if (!isActiveLoad(loadToken)) return;
        const mondoItem = mondo.find((item) => item.id?.startsWith('MONDO:'));
        setText('insight-axis', mondoItem?.id || overview.mondos?.[0]?.id || '-');
        setText('insight-axis-note', formatMatchType(mondoItem?.property));
        updateDownloadData({
          overview: {
            ...(currentDownloadData?.overview || {}),
            mondoId: mondoItem?.id || overview.mondos?.[0]?.id || '-',
            mondoMatchType: formatMatchType(mondoItem?.property),
          },
        });
      })
      .catch(noteFailure);

    patientPromise
      .then((patientData) => {
        if (!isActiveLoad(loadToken)) return;
        const patients = patientData.map((item) => ({
          year: item.year,
          count: item.num_of_patients,
        }));
        const latestPatient = patients.at(-1);
        setText('latest-patient-count', latestPatient ? latestPatient.count : '-');
        setText('insight-patients', latestPatient ? `${latestPatient.count}人` : '-');
        setText(
          'insight-patients-note',
          latestPatient ? `${latestPatient.year}年の特定医療費受給者証所持者数` : '患者統計なし'
        );
        renderTrendChart(patients);
        updateDownloadData({
          patients,
          stats: {
            ...(currentDownloadData?.stats || {}),
            特定医療費受給者証所持者数: latestPatient ? latestPatient.count : '-',
          },
        });
      })
      .catch(noteFailure);

    Promise.all([japanGenesPromise, causalGenesPromise])
      .then(([japanGenes, causalGenes]) => {
        if (!isActiveLoad(loadToken)) return;
        setText('japan-gene-count', japanGenes.length);
        setText('gene-count', causalGenes.length);
        const genes = mapGenes(japanGenes, causalGenes);
        renderGenes(genes);
        updateDownloadData({
          genes,
          stats: {
            ...(currentDownloadData?.stats || {}),
            '疾患関連遺伝子 国内基準由来': japanGenes.length,
            '疾患関連遺伝子 国際リソース由来': causalGenes.length,
          },
        });
      })
      .catch(noteFailure);

    hpoPromise
      .then((hpoData) => {
        if (!isActiveLoad(loadToken)) return;
        setText('clinical-feature-count', hpoData.length);
        const features = mapFeatures(hpoData);
        renderFeatures(features);
        updateDownloadData({
          features,
          stats: {
            ...(currentDownloadData?.stats || {}),
            臨床的特徴: hpoData.length,
          },
        });
      })
      .catch(noteFailure);

    subClassPromise
      .then((subClassData) => {
        if (!isActiveLoad(loadToken)) return;
        const root = subClassData[0] || {};
        const children = subClassData
          .filter((item) => item.parent)
          .map((item) => ({ id: item.id, ja: item.label, en: item.engLabel }));
        renderSubclasses(
          {
            id: `NANDO:${id}`,
            ja: root.label || root.engLabel || '-',
            en: root.engLabel || root.label || '-',
          },
          children
        );
        updateDownloadData({
          subclasses: {
            root: {
              id: `NANDO:${id}`,
              ja: root.label || root.engLabel || '-',
              en: root.engLabel || root.label || '-',
            },
            children,
          },
        });
      })
      .catch(noteFailure);

    Promise.all([overviewPromise, mondoPromise, orphanetPromise, medgenPromise, keggPromise])
      .then(([overview, mondo, orphanet, medgen, kegg]) => {
        if (!isActiveLoad(loadToken)) return;
        const links = mapLinks(overview, mondo, orphanet, medgen, kegg);
        renderLinks(links);
        updateDownloadData({ links });
      })
      .catch(noteFailure);

    referencesPromise
      .then((references) => {
        if (!isActiveLoad(loadToken)) return;
        const recentReferences = references.slice(0, 6);
        setText('reference-count', references.length);
        setText('insight-paper', recentReferences[0]?.date || '-');
        setText('insight-paper-note', recentReferences[0]?.title || '文献データなし');
        renderReferences(recentReferences);
        updateDownloadData({
          references: recentReferences,
          stats: {
            ...(currentDownloadData?.stats || {}),
            文献: references.length,
          },
        });
      })
      .catch(noteFailure);

    glycanPromise
      .then((data) => {
        if (!isActiveLoad(loadToken)) return;
        setText('glycan-gene-count', data.length);
        updateDownloadData({ stats: { ...(currentDownloadData?.stats || {}), 糖鎖関連遺伝子: data.length } });
      })
      .catch(noteFailure);
    facialPromise
      .then((data) => {
        if (!isActiveLoad(loadToken)) return;
        setText('facial-feature-count', data.length);
        updateDownloadData({ stats: { ...(currentDownloadData?.stats || {}), 顔貌特徴: data.length } });
      })
      .catch(noteFailure);
    humanPromise
      .then((data) => {
        if (!isActiveLoad(loadToken)) return;
        setText('human-dataset-count', data.length);
        updateDownloadData({ stats: { ...(currentDownloadData?.stats || {}), ヒトゲノムデータセット: data.length } });
      })
      .catch(noteFailure);
    cellPromise
      .then((data) => {
        if (!isActiveLoad(loadToken)) return;
        setText('cell-count', data.length);
        updateDownloadData({ stats: { ...(currentDownloadData?.stats || {}), 細胞: data.length } });
      })
      .catch(noteFailure);
    mousePromise
      .then((data) => {
        if (!isActiveLoad(loadToken)) return;
        setText('mouse-count', data.length);
        updateDownloadData({ stats: { ...(currentDownloadData?.stats || {}), マウス: data.length } });
      })
      .catch(noteFailure);
    dnaPromise
      .then((data) => {
        if (!isActiveLoad(loadToken)) return;
        setText('dna-count', data.length);
        updateDownloadData({ stats: { ...(currentDownloadData?.stats || {}), DNA: data.length } });
      })
      .catch(noteFailure);
    compoundsPromise
      .then((data) => {
        if (!isActiveLoad(loadToken)) return;
        setText('compound-count', data.length);
        updateDownloadData({ stats: { ...(currentDownloadData?.stats || {}), 化合物: data.length } });
      })
      .catch(noteFailure);
    clinvarPromise
      .then((data) => {
        if (!isActiveLoad(loadToken)) return;
        setText('variant-count', data.length);
        updateDownloadData({ stats: { ...(currentDownloadData?.stats || {}), ClinVar: data.length } });
      })
      .catch(noteFailure);
    mgendPromise
      .then((data) => {
        if (!isActiveLoad(loadToken)) return;
        setText('mgend-count', data.length);
        updateDownloadData({ stats: { ...(currentDownloadData?.stats || {}), MGeND: data.length } });
      })
      .catch(noteFailure);
    geneticTestsPromise
      .then((data) => {
        if (!isActiveLoad(loadToken)) return;
        setText('genetic-testing-count', data.length);
        updateDownloadData({ stats: { ...(currentDownloadData?.stats || {}), 診療用遺伝学的検査: data.length } });
      })
      .catch(noteFailure);

    Promise.allSettled([
      overviewPromise,
      patientPromise,
      subClassPromise,
      japanGenesPromise,
      causalGenesPromise,
      hpoPromise,
      glycanPromise,
      facialPromise,
      humanPromise,
      cellPromise,
      mousePromise,
      dnaPromise,
      compoundsPromise,
      referencesPromise,
      mondoPromise,
      orphanetPromise,
      medgenPromise,
      keggPromise,
      clinvarPromise,
      mgendPromise,
      geneticTestsPromise,
    ]).then(() => {
      if (!isActiveLoad(loadToken)) return;
      const today = new Date().toISOString().slice(0, 10);
      $('footer-note').innerHTML = `出典: NanbyoData API / NANDO:${escapeHtml(id)}<br>取得日: ${escapeHtml(today)}`;
      window.history.replaceState(null, '', buildSummaryUrl(id));
      setStatus(failures === 0 ? '' : '一部データの取得に失敗しています。', failures > 0);
    });
  }

  function bootstrap() {
    if (!summaryRoot) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('export') === 'pdf') {
      document.body.classList.add('pdf-export');
    }

    const descriptionToggle = $('description-toggle');
    if (descriptionToggle) {
      descriptionToggle.addEventListener('click', () => {
        const description = $('description');
        const expanded = description.classList.toggle('expanded');
        descriptionToggle.textContent = expanded ? 'Less' : 'More';
      });
    }

    $('txt-download').addEventListener('click', () => {
      if (!currentDownloadData) return;
      const name = sanitizeFilename(
        currentDownloadData.overview?.labelJa ||
          currentDownloadData.overview?.nandoId ||
          'nando-disease'
      );
      downloadBlob(`${name}.txt`, buildTxtDownload(currentDownloadData), 'text/plain;charset=utf-8');
    });

    $('json-download').addEventListener('click', () => {
      if (!currentDownloadData) return;
      const name = sanitizeFilename(
        currentDownloadData.overview?.labelJa ||
          currentDownloadData.overview?.nandoId ||
          'nando-disease'
      );
      downloadBlob(
        `${name}.json`,
        JSON.stringify(currentDownloadData, null, 2),
        'application/json;charset=utf-8'
      );
    });

    const initialId = params.get('id') || summaryRoot.dataset.initialId || DEFAULT_ID;
    loadDisease(initialId);

    if (params.get('export') === 'pdf') {
      window.addEventListener('load', () => {
        window.setTimeout(() => window.print(), 800);
      });
    }
  }

  bootstrap();
})();
