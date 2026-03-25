(function () {
  const DEFAULT_ID = '1200473';
  const MY_DISEASES_STORAGE_KEY = 'nanbyodata:my-diseases';
  let currentDownloadData = null;
  let activeLoadToken = 0;
  let quickFactsState = {};
  let clinicalOverviewState = {
    features: [],
    facialItems: [],
    bodyMap: null,
    facialMap: null,
    selectedCategoryIds: [],
    showAll: false,
    facialSelection: null,
  };
  const labelCache = new Map();
  const monarchEntityCache = new Map();
  let bodyMapPromise = null;
  let facialMapPromise = null;
  let currentMyDiseaseEntry = null;

  const $ = (id) => document.getElementById(id);
  const summaryRoot = $('summary-root');

  function getCurrentLang() {
    const params = new URLSearchParams(window.location.search);
    const lang = params.get('lang');
    if (lang === 'ja' || lang === 'ja_JP') return 'ja';
    if (lang === 'en') return 'en';
    const locale = summaryRoot?.dataset.locale || document.documentElement.lang || 'en';
    return locale === 'ja' || locale === 'ja_JP' ? 'ja' : 'en';
  }

  function isJapaneseLocale() {
    return getCurrentLang() === 'ja';
  }

  function t(ja, en) {
    return isJapaneseLocale() ? ja : en;
  }

  function getDiseaseCharacter(rawId) {
    return window.NanbyoDataDiseaseCharacters?.get?.(rawId) || null;
  }

  function stripDiseasePrefix(label) {
    return String(label || '')
      .replace(/^\[[^\]]+\]\s*/, '')
      .trim();
  }

  function pickDiseaseName(overview, lang) {
    if (lang === 'ja') {
      return (
        stripDiseasePrefix(overview.label_ja) ||
        stripDiseasePrefix(overview.label) ||
        overview.label ||
        overview.title_ja ||
        stripDiseasePrefix(overview.label_en) ||
        overview.label_en ||
        overview.engLabel ||
        overview.nando_id ||
        ''
      );
    }

    return (
      stripDiseasePrefix(overview.label_en) ||
      overview.label_en ||
      overview.engLabel ||
      overview.title_en ||
      stripDiseasePrefix(overview.label) ||
      overview.label ||
      stripDiseasePrefix(overview.label_ja) ||
      overview.label_ja ||
      overview.nando_id ||
      ''
    );
  }

  function normalizeNandoId(raw) {
    const trimmed = String(raw || '').trim();
    if (!trimmed) return '';
    return trimmed.toUpperCase().startsWith('NANDO:') ? trimmed.slice(6) : trimmed;
  }

  function getStorageItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function setStorageItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      // ignore storage write errors
    }
  }

  function normalizeMyDiseaseEntry(entry) {
    if (!entry || typeof entry !== 'object') return null;

    const normalizedId = normalizeNandoId(entry.id);
    if (!normalizedId) return null;

    return {
      id: `NANDO:${normalizedId}`,
      label_ja: String(entry.label_ja || '').trim(),
      label_en: String(entry.label_en || '').trim(),
      saved_at: String(entry.saved_at || new Date().toISOString()),
    };
  }

  function loadMyDiseases() {
    const raw = getStorageItem(MY_DISEASES_STORAGE_KEY);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(normalizeMyDiseaseEntry).filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  function saveMyDiseases(entries) {
    const normalized = uniqueBy(
      (Array.isArray(entries) ? entries : [])
        .map(normalizeMyDiseaseEntry)
        .filter(Boolean),
      (entry) => entry.id
    );
    setStorageItem(MY_DISEASES_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function isMyDisease(id) {
    const targetId = `NANDO:${normalizeNandoId(id)}`;
    return loadMyDiseases().some((entry) => entry.id === targetId);
  }

  function addMyDisease(entry) {
    const normalizedEntry = normalizeMyDiseaseEntry(entry);
    if (!normalizedEntry) return loadMyDiseases();

    const current = loadMyDiseases().filter((item) => item.id !== normalizedEntry.id);
    return saveMyDiseases([normalizedEntry, ...current]);
  }

  function removeMyDisease(id) {
    const targetId = `NANDO:${normalizeNandoId(id)}`;
    return saveMyDiseases(loadMyDiseases().filter((entry) => entry.id !== targetId));
  }

  function toggleMyDisease(entry) {
    const normalizedEntry = normalizeMyDiseaseEntry(entry);
    if (!normalizedEntry) {
      return {
        active: false,
        entries: loadMyDiseases(),
      };
    }

    if (isMyDisease(normalizedEntry.id)) {
      return {
        active: false,
        entries: removeMyDisease(normalizedEntry.id),
      };
    }

    return {
      active: true,
      entries: addMyDisease(normalizedEntry),
    };
  }

  window.NanbyoDataMyDiseases = {
    key: MY_DISEASES_STORAGE_KEY,
    load: loadMyDiseases,
    save: saveMyDiseases,
    has: isMyDisease,
    add: addMyDisease,
    remove: removeMyDisease,
    toggle: toggleMyDisease,
    normalizeEntry: normalizeMyDiseaseEntry,
  };

  function setMyDiseaseButtonState(active) {
    const button = $('my-disease-toggle');
    const label = $('my-disease-toggle-label');
    if (!button || !label) return;

    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
    label.textContent = active
      ? t('登録済み', 'Added')
      : t('マイ疾患に追加', 'Add to My Diseases');
  }

  function updateMyDiseasesNavCount() {
    const countEl = $('my-diseases-nav-count');
    if (!countEl) return;
    countEl.textContent = String(loadMyDiseases().length);
  }

  function syncMyDiseaseButton(entry) {
    const button = $('my-disease-toggle');
    if (!button) return;
    currentMyDiseaseEntry = normalizeMyDiseaseEntry(entry);
    button.disabled = !currentMyDiseaseEntry;
    setMyDiseaseButtonState(currentMyDiseaseEntry ? isMyDisease(currentMyDiseaseEntry.id) : false);
    updateMyDiseasesNavCount();
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

  function countUniqueGlycanGenes(items) {
    if (!Array.isArray(items) || items.length === 0) return 0;

    return uniqueBy(
      items.filter((item) => item?.gene_id),
      (item) => String(item.gene_id).trim().toUpperCase()
    ).length;
  }

  function extractHpoId(value) {
    const raw = String(value || '');
    const colonMatch = raw.match(/HP:\d{7}/i);
    if (colonMatch) return colonMatch[0].toUpperCase();

    const underscoreMatch = raw.match(/HP[_:](\d{7})/i);
    if (underscoreMatch) return `HP:${underscoreMatch[1]}`;

    return '';
  }

  function toFeatureAnchorId(hpoId) {
    return `feature-category-${String(hpoId || '').replace(':', '-')}`;
  }

  function filtersEqual(left, right) {
    if (!left && !right) return true;
    if (!left || !right) return false;
    return left.type === right.type && left.value === right.value;
  }

  function setStatus(message, isError = false) {
    const el = $('status');
    if (!el) return;
    el.textContent = message;
    el.className = isError ? 'summary-status error' : 'summary-status';
  }

  function renderDiseaseCharacter(rawId) {
    const slot = $('summary-character-slot');
    const wrap = $('summary-hero-overview');
    if (!slot) return;

    const character = getDiseaseCharacter(rawId);
    if (!character) {
      slot.hidden = true;
      slot.innerHTML = '';
      wrap?.classList.add('summary-hero-overview--single');
      return;
    }

    slot.hidden = false;
    wrap?.classList.remove('summary-hero-overview--single');
    const baseName = isJapaneseLocale() ? character.base_name_ja : character.base_name_en;
    const baseUrl = isJapaneseLocale() ? character.base_url_ja : character.base_url_en;
    const note = isJapaneseLocale()
      ? (character.caption_ja || character.caption_en || '')
      : (character.caption_en || character.caption_ja || '');
    const noteHtml = baseName && baseUrl && note.includes(baseName)
      ? escapeHtml(note).replace(
          escapeHtml(baseName),
          `<a class="summary-character-link" href="${escapeHtml(baseUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(baseName)}</a>`
        )
      : escapeHtml(note);
    const imageSrc = character.asset_fallback
      ? `${escapeHtml(character.asset)}" onerror="this.onerror=null;this.src='${escapeHtml(character.asset_fallback)}`
      : escapeHtml(character.asset);
    slot.innerHTML = `
      <figure class="summary-character-card summary-character-card--${escapeHtml(character.theme || 'default')}">
        <img class="summary-character-image" src="${imageSrc}" alt="${escapeHtml(isJapaneseLocale() ? character.alt_ja : character.alt_en)}" loading="lazy" />
        <figcaption class="summary-character-copy">
          <div class="summary-character-kicker">${escapeHtml(isJapaneseLocale() ? '疾患キャラクター' : 'Disease mascot')}</div>
          <div class="summary-character-name">${escapeHtml(isJapaneseLocale() ? character.name_ja : character.name_en)}</div>
          <div class="summary-character-note">${noteHtml}</div>
        </figcaption>
      </figure>
    `;
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

  function setHtml(id, html) {
    const el = $(id);
    if (el) {
      el.innerHTML = html;
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

  async function fetchMonarchEntity(mondoId) {
    const normalizedId = String(mondoId || '').trim();
    if (!normalizedId) return null;
    if (monarchEntityCache.has(normalizedId)) return monarchEntityCache.get(normalizedId);

    const promise = fetch(`https://api-v3.monarchinitiative.org/v3/api/entity/${encodeURIComponent(normalizedId)}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Monarch entity ${normalizedId}: HTTP ${response.status}`);
        }
        return response.json();
      })
      .catch((error) => {
        monarchEntityCache.delete(normalizedId);
        throw error;
      });

    monarchEntityCache.set(normalizedId, promise);
    return promise;
  }

  async function fetchOntologyLabels(id) {
    const cacheKey = `NANDO:${normalizeNandoId(id)}`;
    if (labelCache.has(cacheKey)) return labelCache.get(cacheKey);

    const response = await fetch('/ontology/current_release/nando.tsv');
    if (!response.ok) throw new Error(`nando.tsv: HTTP ${response.status}`);

    const text = await response.text();
    const line = text
      .split('\n')
      .find((row) => row.startsWith(`${cacheKey}\t`));

    const labels = { ja: '', en: '', programJa: '', programEn: '' };
    if (line) {
      const cols = line.split('\t');
      const rawEn = cols[1] || '';
      const rawJa = cols[3] || '';
      labels.en = stripDiseasePrefix(rawEn);
      labels.ja = stripDiseasePrefix(rawJa);
      if (/\[Shitei\]/.test(rawEn) || /\[指定\]/.test(rawJa)) {
        labels.programJa = '指定難病';
        labels.programEn = 'Designated Intractable Disease';
      } else if (/\[Shoman\]/.test(rawEn) || /\[小慢\]/.test(rawJa)) {
        labels.programJa = '小児慢性特定疾病';
        labels.programEn = 'Chronic Pediatric Disease';
      }
    }

    labelCache.set(cacheKey, labels);
    return labels;
  }

  async function fetchBodyMap() {
    if (!bodyMapPromise) {
      bodyMapPromise = fetch('/static/data/hpo-body-map.json')
        .then((response) => {
          if (!response.ok) {
            throw new Error(`hpo-body-map.json: HTTP ${response.status}`);
          }
          return response.json();
        })
        .catch((error) => {
          bodyMapPromise = null;
          throw error;
        });
    }
    return bodyMapPromise;
  }

  async function fetchFacialMap() {
    if (!facialMapPromise) {
      facialMapPromise = fetch('/static/data/facial-map-regions.json')
        .then((response) => {
          if (!response.ok) {
            throw new Error(`facial-map-regions.json: HTTP ${response.status}`);
          }
          return response.json();
        })
        .catch((error) => {
          facialMapPromise = null;
          throw error;
        });
    }
    return facialMapPromise;
  }

  async function fetchSubtypeStats(children) {
    const entries = await Promise.all(
      children.map(async (child) => {
        const childId = normalizeNandoId(child.id);
        const settled = await Promise.allSettled([
          fetchJson('nanbyodata_get_japan_curated_gene_by_nando_id', childId),
          fetchJson('nanbyodata_get_causal_gene_by_nando_id', childId),
          fetchJson('nanbyodata_get_hpo_data_by_nando_id', childId),
          fetchJson('nanbyodata_get_sub_class_by_nando_id', childId),
        ]);

        const japanGenes = settled[0].status === 'fulfilled' ? settled[0].value : [];
        const causalGenes = settled[1].status === 'fulfilled' ? settled[1].value : [];
        const hpoData = settled[2].status === 'fulfilled' ? settled[2].value : [];
        const subClassData = settled[3].status === 'fulfilled' ? settled[3].value : [];

        const relatedGenes = uniqueBy(
          [...japanGenes.map((gene) => gene.symbol), ...causalGenes.map((gene) => gene.gene_symbol)].filter(Boolean),
          (symbol) => symbol
        ).length;
        const subtypeCount = (subClassData || []).filter((item) => item.parent).length;

        return [
          child.id,
          {
            genes: relatedGenes,
            features: hpoData.length,
            subtypes: subtypeCount,
          },
        ];
      })
    );

    return new Map(entries);
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
    el.textContent = text || t('説明データはありません。', 'No description available.');
    el.classList.remove('expanded');

    const isLong = (text || '').length > 360;
    button.hidden = !isLong;
    button.textContent = 'More';
  }

  function configureSummaryLinks(id) {
    const base = `${window.location.origin}/disease/NANDO:${encodeURIComponent(id)}`;
    setHref('detail-link', base);
    setHref('nando-id-link', base);
    setHref('reference-detail-link', `${base}#references`);
  }

  function renderQuickFactsList() {
    const facts = [
      {
        href: '#patient-trend',
        label: t('特定医療費受給者証所持者数', 'Certificate Holders'),
        value: quickFactsState.patients || '-',
        note: quickFactsState.patientsNote || '',
      },
      {
        href: '#subtype-classification',
        label: t('病型数', 'Subtypes'),
        value: quickFactsState.subtypes || '-',
        note: quickFactsState.subtypesNote || '',
      },
      {
        href: '#molecular-diagnosis',
        label: t('関連遺伝子', 'Related genes'),
        value: quickFactsState.genes || '-',
        note: quickFactsState.genesNote || '',
      },
      {
        href: '#clinical-overview',
        label: t('臨床所見', 'Clinical features'),
        value: quickFactsState.features || '-',
        note: quickFactsState.featuresNote || '',
      },
      {
        href: '#molecular-diagnosis',
        label: t('遺伝学的検査', 'Genetic tests'),
        value: quickFactsState.tests || '-',
        note: quickFactsState.testsNote || '',
      },
    ];

    setHtml(
      'quick-facts-list',
      facts
        .map(
          (fact) => `
        <a class="summary-compact-link" href="${escapeHtml(fact.href)}">
          <strong>${escapeHtml(fact.label)}:</strong> ${escapeHtml(fact.value)}
          ${fact.note ? `<div class="summary-compact-note">${escapeHtml(fact.note)}</div>` : ''}
        </a>
      `
        )
        .join('')
    );
  }

  function renderAliases(overview) {
    const aliases = isJapaneseLocale()
      ? [...(overview.alt_label_ja || []), ...(overview.alt_label_en || [])]
      : [...(overview.alt_label_en || []), ...(overview.alt_label_ja || [])];
    const cleaned = uniqueBy(
      aliases.map((alias) => stripDiseasePrefix(alias)).filter(Boolean),
      (alias) => alias.toLowerCase()
    ).slice(0, 6);

    setHtml(
      'alias-row',
      cleaned.length
        ? cleaned.map((alias) => `<span class="summary-alias-pill">${escapeHtml(alias)}</span>`).join('')
        : ''
    );
  }

  function renderPrimaryLinks(links) {
    setHtml(
      'primary-link-grid',
      links.length
        ? links
            .map(
              (link) => `
          <a class="summary-primary-link" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">
            <span>${escapeHtml(link.label)}</span>
            <span class="summary-link-icon" aria-hidden="true"></span>
          </a>
        `
            )
            .join('')
        : ''
    );
  }

  function slugifySegment(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function formatInheritanceItem(item) {
    if (!item) return '-';
    return (isJapaneseLocale() ? item.id || item.id_en : item.id_en || item.id) || '-';
  }

  function buildInheritanceSummary(items) {
    const list = Array.isArray(items) ? items.filter(Boolean) : [];
    if (!list.length) {
      return {
        value: '-',
        note: '',
        url: '#',
      };
    }

    const primary = list[0];
    const value = formatInheritanceItem(primary);
    const englishLabel = String(primary.id_en || '').trim();
    return {
      value,
      note: isJapaneseLocale() && englishLabel && englishLabel !== value ? englishLabel : '',
      url: primary.url || primary.uri || '#',
    };
  }

  function extractMondoId(overview, mondo) {
    const mondoItem = (Array.isArray(mondo) ? mondo : []).find((item) => item.id?.startsWith('MONDO:'));
    return mondoItem?.id || overview?.mondos?.[0]?.id || '';
  }

  async function fetchGardLinkByMondoId(mondoId, overview) {
    if (!mondoId) return null;

    const entity = await fetchMonarchEntity(mondoId);
    const gardXref = Array.isArray(entity?.xref)
      ? entity.xref.find((xref) => String(xref).startsWith('GARD:'))
      : '';
    if (!gardXref) return null;

    const gardId = gardXref.split(':')[1];
    if (!gardId) return null;

    const slugSource =
      pickDiseaseName(overview || {}, 'en') ||
      entity?.name ||
      pickDiseaseName(overview || {}, 'ja') ||
      '';
    const slug = slugifySegment(slugSource);

    return {
      label: 'GARD',
      url: slug
        ? `https://rarediseases.info.nih.gov/diseases/${encodeURIComponent(gardId)}/${slug}`
        : `https://rarediseases.info.nih.gov/search?search=${encodeURIComponent(gardXref)}`,
    };
  }

  function buildMonarchXrefLink(xref) {
    const raw = String(xref || '').trim();
    if (!raw || !raw.includes(':')) return null;

    const [prefix, ...rest] = raw.split(':');
    const localId = rest.join(':').trim();
    if (!prefix || !localId) return null;

    const normalizedPrefix = prefix.toUpperCase();
    const mappings = {
      DOID: {
        label: 'DOID',
        url: `http://purl.obolibrary.org/obo/DOID_${encodeURIComponent(localId)}`,
      },
      MESH: {
        label: 'MESH',
        url: `https://id.nlm.nih.gov/mesh/${encodeURIComponent(localId)}.html`,
      },
      NCIT: {
        label: 'NCIT',
        url: `https://evsexplore.semantics.cancer.gov/evsexplore/concept/ncit/${encodeURIComponent(localId)}`,
      },
      ICD10CM: {
        label: 'ICD10CM',
        url: `https://www.icd10data.com/search?s=${encodeURIComponent(localId)}`,
      },
      'ICD11.FOUNDATION': {
        label: 'ICD11',
        url: `https://icd.who.int/browse/2025-01/foundation/en#${encodeURIComponent(localId)}`,
      },
    };

    const match = mappings[normalizedPrefix];
    if (!match) return null;

    return {
      label: match.label,
      url: match.url,
    };
  }

  async function fetchMonarchXrefLinksByMondoId(mondoId) {
    if (!mondoId) return [];

    const entity = await fetchMonarchEntity(mondoId);
    const xrefs = Array.isArray(entity?.xref) ? entity.xref : [];
    return uniqueBy(
      xrefs
        .map((xref) => buildMonarchXrefLink(xref))
        .filter(Boolean),
      (item) => item.label
    );
  }

  function resetView(id) {
    document.title = 'Disease Summary | NanbyoData';
    currentMyDiseaseEntry = null;
    quickFactsState = {
      patients: '-',
      patientsNote: '',
      subtypes: '-',
      subtypesNote: '',
      genes: '-',
      genesNote: '',
      features: '-',
      featuresNote: '',
      tests: '-',
      testsNote: '',
    };
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
    clinicalOverviewState = {
      features: [],
      facialItems: [],
      bodyMap: null,
      selectedCategoryIds: [],
      showAll: false,
    };
    setText('title-ja', 'Loading...');
    setText('title-en', '');
    setDescription('');
    setHtml('alias-row', '');
    setHtml('primary-link-grid', '');
    setText('nando-id', `NANDO:${id}`);
    setText('notification-number', '-');
    setText('notification-program', '');
    setText('alias-primary', '-');
    configureSummaryLinks(id);
    setHref('mondo-link', '#');
    setHref('inheritance-link', '#');

    [
      'insight-axis',
      'insight-axis-note',
      'insight-inheritance',
      'insight-inheritance-note',
      'insight-patients',
      'insight-patients-note',
    ].forEach((key) => setText(key, '-'));

    $('trend-chart').innerHTML = `<div class="summary-tiny">${t('読み込み中...', 'Loading...')}</div>`;
    $('quick-facts-list').innerHTML = `<div class="summary-tiny">${t('読み込み中...', 'Loading...')}</div>`;
    $('gene-grid').innerHTML = `<div class="summary-tiny">${t('読み込み中...', 'Loading...')}</div>`;
    $('diagnostic-grid').innerHTML = `<div class="summary-tiny">${t('読み込み中...', 'Loading...')}</div>`;
    $('diagnostic-detail').innerHTML = '';
    $('bodymap-wrap').innerHTML = `<div class="summary-tiny">${t('読み込み中...', 'Loading...')}</div>`;
    $('selection-summary').innerHTML = `<div class="summary-tiny">${t('読み込み中...', 'Loading...')}</div>`;
    $('feature-grid').innerHTML = `<div class="summary-tiny">${t('読み込み中...', 'Loading...')}</div>`;
    $('facial-panel').innerHTML = `<div class="summary-tiny">${t('読み込み中...', 'Loading...')}</div>`;
    setText('subclass-meta', '');
    $('subclass-tree').innerHTML = `<div class="summary-tiny">${t('読み込み中...', 'Loading...')}</div>`;
    $('link-grid').innerHTML = `<div class="summary-tiny">${t('読み込み中...', 'Loading...')}</div>`;
    $('reference-list').innerHTML = `<div class="summary-tiny">${t('読み込み中...', 'Loading...')}</div>`;
    const myDiseaseButton = $('my-disease-toggle');
    if (myDiseaseButton) {
      myDiseaseButton.disabled = true;
      setMyDiseaseButtonState(false);
    }
  }

  function isActiveLoad(token) {
    return token === activeLoadToken;
  }

  function renderTrendChart(points) {
    if (!points.length) {
      $('trend-chart').innerHTML = `<div class="summary-tiny">${t('患者数データはありません。', 'No patient data available.')}</div>`;
      return;
    }

    const width = 760;
    const height = 260;
    const padX = 48;
    const padY = 28;
    const counts = points.map((p) => p.count);
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    const hasTruncatedBaseline = min > 0;
    const baselineGap = hasTruncatedBaseline ? 40 : 0;
    const axisY = height - padY;
    const chartBottom = axisY - baselineGap;
    const range = Math.max(max - min, 1);
    const xStep = (width - padX * 2) / Math.max(points.length - 1, 1);
    const y = (value) => chartBottom - ((value - min) / range) * (chartBottom - padY);
    const x = (index) => padX + index * xStep;
    const d = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(point.count)}`).join(' ');
    const area = `${d} L ${x(points.length - 1)} ${chartBottom} L ${x(0)} ${chartBottom} Z`;
    const axisBreakTopY = chartBottom + 10;
    const axisBreakMarker = hasTruncatedBaseline
      ? `
        <g aria-hidden="true">
          <path
            d="M ${padX - 11} ${axisBreakTopY}
               C ${padX - 7} ${axisBreakTopY - 3}, ${padX - 3} ${axisBreakTopY - 3}, ${padX + 1} ${axisBreakTopY}
               S ${padX + 9} ${axisBreakTopY + 3}, ${padX + 13} ${axisBreakTopY}"
            fill="none"
            stroke="#5f685f"
            stroke-width="2"
            stroke-linecap="round"
          ></path>
          <path
            d="M ${padX - 11} ${axisBreakTopY + 10}
               C ${padX - 7} ${axisBreakTopY + 7}, ${padX - 3} ${axisBreakTopY + 7}, ${padX + 1} ${axisBreakTopY + 10}
               S ${padX + 9} ${axisBreakTopY + 13}, ${padX + 13} ${axisBreakTopY + 10}"
            fill="none"
            stroke="#5f685f"
            stroke-width="2"
            stroke-linecap="round"
          ></path>
        </g>
      `
      : '';
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
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(t('特定医療費受給者証所持者数の推移', 'Certificate Holder Trend'))}">
        <defs>
          <linearGradient id="summaryTrendFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="rgba(29,107,82,0.26)"></stop>
            <stop offset="100%" stop-color="rgba(29,107,82,0.02)"></stop>
          </linearGradient>
        </defs>
        <line x1="${padX}" y1="${axisY}" x2="${width - padX}" y2="${axisY}" stroke="rgba(21,32,24,0.14)"></line>
        <line x1="${padX}" y1="${padY}" x2="${padX}" y2="${axisY}" stroke="rgba(21,32,24,0.14)"></line>
        <text x="${18}" y="${padY + 8}" fill="#5f685f" font-size="12" font-weight="700">${escapeHtml(t('人', 'People'))}</text>
        <text x="${width - 18}" y="${axisY + 14}" text-anchor="end" fill="#5f685f" font-size="12" font-weight="700">${escapeHtml(t('年', 'Year'))}</text>
        ${axisBreakMarker}
        <path d="${area}" fill="url(#summaryTrendFill)"></path>
        <path d="${d}" fill="none" stroke="#1d6b52" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"></path>
        ${markers}
      </svg>
      <div class="summary-chart-caption">
        ${
          hasTruncatedBaseline
            ? `<span>${escapeHtml(t('Y軸は 0 人から一部省略しています', 'Y-axis is truncated above 0'))}</span>`
            : ''
        }
        <span>${escapeHtml(t(`最小 ${min}人`, `Min ${min}`))}</span>
        <span>${escapeHtml(t(`最大 ${max}人`, `Max ${max}`))}</span>
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
          ${
            isJapaneseLocale() && gene.nameJa
              ? `<div class="summary-gene-name-ja">${escapeHtml(gene.nameJa)}</div>`
              : ''
          }
          ${
            isJapaneseLocale() && gene.noteJa
              ? `<div class="summary-gene-note-ja">${escapeHtml(gene.noteJa)}</div>`
              : ''
          }
          <div class="summary-tiny summary-gene-note" data-expanded="false">${escapeHtml(gene.note)}</div>
          ${
            gene.note && gene.note.length > 180
              ? '<button class="summary-inline-toggle summary-gene-toggle" type="button">More</button>'
              : ''
          }
        </article>
      `
          )
          .join('')
      : `<div class="summary-tiny">${t('遺伝子データはありません。', 'No gene data available.')}</div>`;
  }

  function renderDiagnosticCards(cards) {
    $('diagnostic-grid').innerHTML = cards.length
      ? cards
          .map(
            (card) => `
        ${
          card.panelId
            ? `<button class="summary-diagnostic-card summary-card-link summary-diagnostic-toggle" type="button" data-panel-target="${escapeHtml(card.panelId)}" aria-expanded="false">`
            : `<a class="summary-diagnostic-card summary-card-link" href="${escapeHtml(card.href)}">`
        }
          ${card.panelId ? '' : '<span class="summary-link-icon" aria-hidden="true"></span>'}
          <h3>${escapeHtml(card.title)}</h3>
          <div class="summary-diagnostic-value">${escapeHtml(card.value)}</div>
          <div class="summary-diagnostic-note">${card.noteHtml || escapeHtml(card.note)}</div>
        ${card.panelId ? '</button>' : '</a>'}
      `
          )
          .join('')
      : `<div class="summary-tiny">${t('診断関連データはありません。', 'No diagnostic data available.')}</div>`;
  }

  function renderGeneticTestingPanel(items, detailHref) {
    const panelHost = $('diagnostic-detail');
    if (!panelHost) return;

    const tests = Array.isArray(items) ? items.filter(Boolean) : [];
    if (!tests.length) {
      panelHost.innerHTML = '';
      return;
    }

    panelHost.innerHTML = `
      <section class="summary-inline-panel" id="genetic-testing-panel" hidden>
        <div class="summary-inline-panel-head">
          <div>
            <h3 class="summary-inline-panel-title">${escapeHtml(t('診療用遺伝学的検査', 'Clinical genetic tests'))}</h3>
          </div>
          <a class="summary-inline-panel-link" href="${escapeHtml(detailHref)}">${escapeHtml(
            t('詳細ページで見る', 'Open detail page')
          )}</a>
        </div>
        <div class="summary-inline-panel-list">
          ${tests
            .map((test) => {
              const label = String(test.label || test.hp || '-').trim();
              const infoUrl = String(test.hp || '').trim();
              const gene = String(test.gene || '').trim();
              const facility = String(test.facility || '').trim();
              return `
                ${
                  infoUrl
                    ? `<a class="summary-inline-item summary-card-link summary-inline-item-link" href="${escapeHtml(infoUrl)}" target="_blank" rel="noopener noreferrer">`
                    : '<article class="summary-inline-item">'
                }
                  ${infoUrl ? '<span class="summary-link-icon" aria-hidden="true"></span>' : ''}
                  <h4>
                    ${escapeHtml(label)}
                  </h4>
                  ${
                    gene
                      ? `<div class="summary-inline-item-meta"><strong>${escapeHtml(t('遺伝子', 'Gene'))}:</strong> ${escapeHtml(gene)}</div>`
                      : ''
                  }
                  ${
                    facility
                      ? `<div class="summary-inline-item-meta"><strong>${escapeHtml(t('実施施設', 'Facility'))}:</strong> ${escapeHtml(facility)}</div>`
                      : ''
                  }
                ${infoUrl ? '</a>' : '</article>'}
              `;
            })
            .join('')}
        </div>
      </section>
    `;
  }

  function pulseTarget(target) {
    if (!target) return;
    target.classList.remove('is-targeted');
    window.requestAnimationFrame(() => {
      target.classList.add('is-targeted');
      window.setTimeout(() => {
        target.classList.remove('is-targeted');
      }, 4600);
    });
  }

  function getSelectedFeatureIds() {
    if (clinicalOverviewState.showAll) {
      return new Set(clinicalOverviewState.features.map((feature) => feature.categoryId).filter(Boolean));
    }
    return new Set(clinicalOverviewState.selectedCategoryIds);
  }

  function rerenderClinicalOverviewWithState() {
    renderClinicalOverview(
      clinicalOverviewState.features,
      clinicalOverviewState.facialItems,
      clinicalOverviewState.bodyMap,
      clinicalOverviewState.facialMap
    );
  }

  function buildBodyMapFigure() {
    return `
      <svg class="summary-bodymap-svg" viewBox="0 8 220 338" role="img" aria-label="${escapeHtml(
        t('人体部位ナビゲーション', 'Body region navigation')
      )}">
        <g fill="#f3f7f4" stroke="rgba(21,32,24,0.18)" stroke-width="2">
          <circle cx="110" cy="48" r="28"></circle>
          <rect x="98" y="74" width="24" height="18" rx="10"></rect>
          <rect x="74" y="92" width="72" height="118" rx="34"></rect>
          <rect x="48" y="102" width="26" height="110" rx="14"></rect>
          <rect x="146" y="102" width="26" height="110" rx="14"></rect>
          <rect x="82" y="208" width="24" height="128" rx="14"></rect>
          <rect x="114" y="208" width="24" height="128" rx="14"></rect>
        </g>
        <g class="summary-bodymap-hotspots">
          <rect class="summary-bodymap-shape summary-bodymap-shape--limbs" data-area="limbs" x="46" y="102" width="128" height="234" rx="40"></rect>
          <rect class="summary-bodymap-shape summary-bodymap-shape--skin" data-area="skin" x="60" y="92" width="100" height="244" rx="44"></rect>
          <rect class="summary-bodymap-shape summary-bodymap-shape--torso" data-area="torso" x="80" y="92" width="60" height="118" rx="24"></rect>
          <rect class="summary-bodymap-shape summary-bodymap-shape--torso" data-area="torso" x="66" y="132" width="18" height="88" rx="9"></rect>
          <rect class="summary-bodymap-shape summary-bodymap-shape--torso" data-area="torso" x="136" y="132" width="18" height="88" rx="9"></rect>
          <rect class="summary-bodymap-shape summary-bodymap-shape--torso" data-area="torso" x="88" y="208" width="48" height="22" rx="11"></rect>
          <circle class="summary-bodymap-shape summary-bodymap-shape--head" data-area="head" cx="110" cy="48" r="28"></circle>
          <rect class="summary-bodymap-shape summary-bodymap-shape--abdomen" data-area="abdomen" x="82" y="154" width="56" height="52" rx="20"></rect>
          <rect class="summary-bodymap-shape summary-bodymap-shape--chest" data-area="chest" x="78" y="100" width="64" height="52" rx="22"></rect>
          <rect class="summary-bodymap-shape summary-bodymap-shape--pelvis" data-area="pelvis" x="84" y="204" width="52" height="30" rx="14"></rect>
          <rect class="summary-bodymap-shape summary-bodymap-shape--ear" data-area="ear" x="74" y="40" width="8" height="18" rx="4"></rect>
          <rect class="summary-bodymap-shape summary-bodymap-shape--ear" data-area="ear" x="138" y="40" width="8" height="18" rx="4"></rect>
          <rect class="summary-bodymap-shape summary-bodymap-shape--eye" data-area="eye" x="90" y="36" width="16" height="8" rx="4"></rect>
          <rect class="summary-bodymap-shape summary-bodymap-shape--eye" data-area="eye" x="114" y="36" width="16" height="8" rx="4"></rect>
        </g>
      </svg>
    `;
  }

  function getFacialAgeMonths(item) {
    const years = Number(item.age_year);
    const months = Number(item.age_month);
    const hasYears = Number.isFinite(years) && years >= 0;
    const hasMonths = Number.isFinite(months) && months >= 0;
    if (!hasYears && !hasMonths) return null;
    return (hasYears ? years * 12 : 0) + (hasMonths ? months : 0);
  }

  function getFacialAgeBucket(item) {
    const months = getFacialAgeMonths(item);
    if (months == null) {
      return {
        key: 'unknown',
        label: t('年齢不明', 'Unknown age'),
      };
    }
    if (months < 24) {
      return { key: '0-1', label: t('0-1歳', '0-1 years') };
    }
    if (months < 72) {
      return { key: '2-5', label: t('2-5歳', '2-5 years') };
    }
    if (months < 156) {
      return { key: '6-12', label: t('6-12歳', '6-12 years') };
    }
    if (months < 216) {
      return { key: '13-17', label: t('13-17歳', '13-17 years') };
    }
    return { key: '18+', label: t('18歳以上', '18+ years') };
  }

  const FACIAL_REGION_DEFS = [
    {
      id: 'americas',
      labelJa: '米州',
      labelEn: 'Americas',
      mapLabelJa: '米州',
      mapLabelEn: 'Americas',
      countX: 112,
      countY: 92,
      paths: [
        'M42 56 C55 34 92 30 126 42 C150 50 171 68 171 93 C171 116 158 129 140 142 C127 151 124 164 118 176 C104 171 91 160 80 145 C63 123 51 96 42 56 Z',
      ],
    },
    {
      id: 'latin_america',
      labelJa: '中南米',
      labelEn: 'Latin America',
      mapLabelJa: '中南米',
      mapLabelEn: 'LatAm',
      countX: 142,
      countY: 181,
      paths: [
        'M118 154 C134 151 155 160 165 176 C171 188 171 202 164 217 C155 240 154 260 144 284 C137 300 126 314 111 324 C101 314 102 296 108 277 C116 254 116 235 111 216 C105 194 104 173 118 154 Z',
      ],
    },
    {
      id: 'europe',
      labelJa: 'ヨーロッパ',
      labelEn: 'Europe',
      mapLabelJa: '欧州',
      mapLabelEn: 'Europe',
      countX: 348,
      countY: 84,
      paths: [
        'M294 73 C308 58 334 53 362 56 C387 59 409 69 421 85 C427 94 426 105 418 112 C406 123 384 127 363 124 C332 119 301 108 292 95 C287 87 287 80 294 73 Z',
      ],
    },
    {
      id: 'mena',
      labelJa: '中東・北アフリカ',
      labelEn: 'Middle East / North Africa',
      mapLabelJa: '中東・北アフリカ',
      mapLabelEn: 'MENA',
      countX: 392,
      countY: 154,
      paths: [
        'M323 126 C346 116 381 114 416 121 C444 126 466 138 472 154 C476 166 469 177 455 185 C435 197 404 201 372 194 C344 189 321 178 314 165 C309 154 312 138 323 126 Z',
      ],
    },
    {
      id: 'sub_saharan_africa',
      labelJa: 'サブサハラアフリカ',
      labelEn: 'Sub-Saharan Africa',
      mapLabelJa: 'サブサハラ',
      mapLabelEn: 'Africa',
      countX: 393,
      countY: 241,
      paths: [
        'M356 187 C375 179 406 178 427 186 C445 194 456 210 455 231 C454 257 442 282 421 304 C404 322 385 325 372 309 C358 290 344 272 342 248 C340 226 344 199 356 187 Z',
      ],
    },
    {
      id: 'south_asia',
      labelJa: '南アジア',
      labelEn: 'South Asia',
      mapLabelJa: '南アジア',
      mapLabelEn: 'S Asia',
      countX: 532,
      countY: 175,
      paths: [
        'M493 143 C511 136 539 137 559 146 C576 154 583 169 580 184 C576 201 562 216 545 224 C529 232 516 233 505 224 C492 214 482 199 481 183 C481 165 483 150 493 143 Z',
      ],
    },
    {
      id: 'east_asia',
      labelJa: '東アジア',
      labelEn: 'East Asia',
      mapLabelJa: '東アジア',
      mapLabelEn: 'E Asia',
      countX: 626,
      countY: 118,
      paths: [
        'M565 84 C585 71 620 67 654 72 C688 76 714 90 720 109 C725 124 717 139 703 149 C684 162 657 168 626 166 C597 164 574 155 563 141 C553 128 553 95 565 84 Z',
      ],
    },
    {
      id: 'southeast_asia',
      labelJa: '東南アジア',
      labelEn: 'Southeast Asia',
      mapLabelJa: '東南アジア',
      mapLabelEn: 'SE Asia',
      countX: 604,
      countY: 220,
      paths: [
        'M551 190 C564 183 585 182 605 187 C624 192 639 201 644 214 C648 225 642 236 631 244 C616 255 596 260 577 257 C560 255 547 247 542 236 C538 226 541 198 551 190 Z',
      ],
    },
    {
      id: 'oceania',
      labelJa: 'オセアニア',
      labelEn: 'Oceania',
      mapLabelJa: 'オセアニア',
      mapLabelEn: 'Oceania',
      countX: 684,
      countY: 284,
      paths: [
        'M644 257 C658 246 680 242 703 246 C724 249 742 258 746 270 C751 285 735 297 716 301 C689 307 654 304 641 292 C634 286 635 266 644 257 Z',
      ],
    },
  ];

  const FACIAL_REGION_EXTRA_ORDER = ['asia_unspecified', 'unknown_other'];
  const FACIAL_REGION_PRIORITY = [
    'east_asia',
    'south_asia',
    'southeast_asia',
    'mena',
    'sub_saharan_africa',
    'latin_america',
    'americas',
    'oceania',
    'europe',
    'asia_unspecified',
    'unknown_other',
  ];

  const FACIAL_REGION_META = {
    asia_unspecified: {
      id: 'asia_unspecified',
      labelJa: 'アジア（詳細不明）',
      labelEn: 'Asia (unspecified)',
    },
    unknown_other: {
      id: 'unknown_other',
      labelJa: 'Unknown / Other',
      labelEn: 'Unknown / Other',
    },
  };

  const FACIAL_ETHNICITY_TO_REGION = {
    Caucasian: 'europe',
    European: 'europe',
    'European - Northwestern': 'europe',
    'European - Southern': 'europe',
    'European - Eastern': 'europe',
    'Jewish - Ashkenazi': 'europe',
    'Jewish - Sephardi': 'europe',
    'Roma/Romani': 'europe',
    'Asian - East': 'east_asia',
    'Asian - South/Indian': 'south_asia',
    'Asian - South-East': 'southeast_asia',
    'Asian - West/Middle Eastern': 'mena',
    Arab: 'mena',
    'African - North': 'mena',
    African: 'sub_saharan_africa',
    'African - Sub-Saharan': 'sub_saharan_africa',
    'American - Latin/Hispanic': 'latin_america',
    'American - Native': 'americas',
    'American - African/Black': 'americas',
    'Oceanian/Pacific Islander': 'oceania',
    Asian: 'asia_unspecified',
    Unknown: 'unknown_other',
    Other: 'unknown_other',
  };

  function normalizeEthnicityLabel(value) {
    const raw = String(value || '').trim();
    if (!raw) return 'Unknown';
    const lowered = raw.toLowerCase();
    if (['unknown', '不明', 'na', 'n/a', '-', 'null'].includes(lowered)) {
      return 'Unknown';
    }
    return raw;
  }

  function parseEthnicityLabels(value) {
    const raw = String(value || '').trim();
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => normalizeEthnicityLabel(item)).filter(Boolean);
      }
      return [normalizeEthnicityLabel(parsed)];
    } catch (_error) {
      return [normalizeEthnicityLabel(raw)];
    }
  }

  function getFacialRegionDef(regionId) {
    return FACIAL_REGION_DEFS.find((region) => region.id === regionId) || FACIAL_REGION_META[regionId] || null;
  }

  function getFacialRegionLabel(regionId) {
    const region = getFacialRegionDef(regionId);
    if (!region) return regionId;
    return isJapaneseLocale() ? region.labelJa : region.labelEn;
  }

  function getFacialMapLabel(regionId) {
    const region = getFacialRegionDef(regionId);
    if (!region) return regionId;
    return isJapaneseLocale()
      ? region.mapLabelJa || region.labelJa
      : region.mapLabelEn || region.labelEn;
  }

  function assignFacialRegion(value) {
    const labels = parseEthnicityLabels(value);
    if (!labels.length) return 'unknown_other';
    const candidates = labels
      .map((label) => FACIAL_ETHNICITY_TO_REGION[label])
      .filter(Boolean);
    if (!candidates.length) return 'unknown_other';
    return FACIAL_REGION_PRIORITY.find((regionId) => candidates.includes(regionId)) || 'unknown_other';
  }

  function splitSvgSubpaths(d) {
    return String(d || '').match(/M[\s\S]*?Z/g) || (d ? [d] : []);
  }

  function normalizePreciseFacialMapRegions(regions) {
    let franceSouthAmericaPath = null;
    const normalized = (regions || []).map((region) => {
      const nextRegion = { ...region, paths: (region.paths || []).map((path) => ({ ...path })) };

      if (region.id === 'americas') {
        nextRegion.label_x = -135;
        nextRegion.label_y = -44;
        nextRegion.count_y = -36;
      }

      if (region.id === 'europe') {
        nextRegion.paths = nextRegion.paths.map((path) => {
          if (path.id !== 'FRA') return path;
          const subpaths = splitSvgSubpaths(path.d);
          if (subpaths.length <= 1) return path;
          franceSouthAmericaPath = subpaths[0];
          return {
            ...path,
            d: subpaths.slice(1).join(' '),
          };
        });
      }

      return nextRegion;
    });

    if (franceSouthAmericaPath) {
      const latinAmericaRegion = normalized.find((region) => region.id === 'latin_america');
      if (latinAmericaRegion) {
        latinAmericaRegion.paths.push({
          id: 'FRA_GUIANA_OVERLAY',
          d: franceSouthAmericaPath,
        });
      }
    }

    return normalized;
  }

  function normalizeFacialSelection(selection, grouped) {
    const availableRegionIds = FACIAL_REGION_PRIORITY.filter(
      (regionId) => countUniqueFacialPatients(grouped.get(regionId) || []) > 0
    );
    const availableRegionSet = new Set(availableRegionIds);

    if (selection?.regions && Array.isArray(selection.regions)) {
      const regions = selection.regions.filter((regionId) => availableRegionSet.has(regionId));
      const buckets = {};
      regions.forEach((regionId) => {
        buckets[regionId] = selection.buckets?.[regionId] || null;
      });
      return { regions, buckets };
    }

    if (selection?.region && availableRegionSet.has(selection.region)) {
      return {
        regions: [selection.region],
        buckets: {
          [selection.region]: selection.bucketKey || null,
        },
      };
    }

    return { regions: [], buckets: {} };
  }

  function describeFacialRecord(item) {
    return [
      item.gender,
      item.gene,
      item.image_desc,
      (() => {
        const years = Number(item.age_year);
        const months = Number(item.age_month);
        if (Number.isFinite(years) && years >= 0) return `${years}${t('歳', 'y')}`;
        if (Number.isFinite(months) && months >= 0) return `${months}${t('か月', 'mo')}`;
        return '';
      })(),
      item.pmid ? `PMID ${item.pmid}` : '',
    ]
      .filter(Boolean)
      .join(' / ');
  }

  function getFacialPatientKey(item) {
    return String(item?.id || item?.person || item?.imageId || item?.pmid || '').trim();
  }

  function countUniqueFacialPatients(items) {
    return uniqueBy(
      (items || []).filter((item) => getFacialPatientKey(item)),
      (item) => getFacialPatientKey(item)
    ).length;
  }

  function dedupeFacialRecordList(items) {
    return uniqueBy(items || [], (item) => {
      const patientKey = getFacialPatientKey(item);
      if (patientKey) return patientKey;
      return [
        item.gender || '',
        item.gene || '',
        normalizeEthnicityLabel(item.ethnicity),
        String(item.age_year ?? ''),
        String(item.age_month ?? ''),
        item.age_memo || '',
      ].join('|');
    });
  }

  function buildPieSlicePath(cx, cy, radius, startAngle, endAngle) {
    if (Math.abs(endAngle - startAngle) >= Math.PI * 2 - 0.0001) {
      return [
        `M ${cx} ${cy}`,
        `m 0 ${-radius}`,
        `a ${radius} ${radius} 0 1 1 0 ${radius * 2}`,
        `a ${radius} ${radius} 0 1 1 0 ${-radius * 2}`,
        'Z',
      ].join(' ');
    }
    const toPoint = (angle) => ({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
    const start = toPoint(startAngle);
    const end = toPoint(endAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
  }

  function renderFacialPanel(records, facialMapData) {
    const panel = $('facial-panel');
    if (!panel) return;

    if (!records.length) {
      panel.innerHTML = '';
      panel.hidden = true;
      return;
    }

    panel.hidden = false;

    const grouped = new Map();
    for (const item of records) {
      const regionId = assignFacialRegion(item.ethnicity);
      if (!grouped.has(regionId)) {
        grouped.set(regionId, []);
      }
      grouped.get(regionId).push(item);
    }

    const regionEntries = FACIAL_REGION_PRIORITY
      .map((regionId) => [regionId, grouped.get(regionId) || []])
      .filter(([, items]) => countUniqueFacialPatients(items) > 0);

    if (!regionEntries.length) {
      panel.innerHTML = '';
      panel.hidden = true;
      return;
    }

    clinicalOverviewState.facialSelection = normalizeFacialSelection(
      clinicalOverviewState.facialSelection,
      grouped
    );

    const preciseMapRegions = normalizePreciseFacialMapRegions(facialMapData?.regions || []).map((region) => ({
      ...region,
      items: grouped.get(region.id) || [],
    }));
    const mapRegions = preciseMapRegions.length
      ? preciseMapRegions
      : FACIAL_REGION_DEFS.map((region) => ({
          ...region,
          items: grouped.get(region.id) || [],
        }));
    const extraRegions = FACIAL_REGION_EXTRA_ORDER.map((regionId) => ({
      id: regionId,
      label: getFacialRegionLabel(regionId),
      items: grouped.get(regionId) || [],
    })).filter((region) => region.items.length);

    const maxMapCount = Math.max(...mapRegions.map((region) => countUniqueFacialPatients(region.items)), 1);
    const totalUniquePatients = countUniqueFacialPatients(records);
    const inMapUniquePatients = countUniqueFacialPatients(
      mapRegions.flatMap((region) => region.items || [])
    );
    const offMapUniquePatients = Math.max(totalUniquePatients - inMapUniquePatients, 0);
    const mapViewBox = facialMapData?.viewBox || '0 0 760 360';
    const [viewX, viewY, viewWidth, viewHeight] = mapViewBox.split(/\s+/).map(Number);

    const bucketOrder = ['0-1', '2-5', '6-12', '13-17', '18+', 'unknown'];
    const bucketColors = {
      '0-1': '#1d6b52',
      '2-5': '#2f8a68',
      '6-12': '#59a17f',
      '13-17': '#88b798',
      '18+': '#b8d0bb',
      unknown: '#d7ddd3',
    };

    const selectedRegionIds = clinicalOverviewState.facialSelection.regions;

    const mapSvg = preciseMapRegions.length
      ? `
        <svg class="summary-facial-world summary-facial-world--precise ${selectedRegionIds.length ? 'has-selection' : ''}" viewBox="${escapeHtml(mapViewBox)}" role="img" aria-label="${escapeHtml(
          t('世界地図上の顔貌症例分布', 'World map of facial case distribution')
        )}">
          <image
            href="/static/img/maps/world-robinson-cc0.svg"
            x="${viewX}"
            y="${viewY}"
            width="${viewWidth}"
            height="${viewHeight}"
            preserveAspectRatio="none"
            class="summary-facial-world-image"
          ></image>
          ${mapRegions
            .map((region) => {
              const count = countUniqueFacialPatients(region.items);
              const intensity = count ? 0.12 + (count / maxMapCount) * 0.5 : 0.02;
              const selected = selectedRegionIds.includes(region.id);
              return `
                <g
                  class="summary-facial-map-region ${selected ? 'is-selected' : ''} ${count ? 'is-active' : 'is-empty'}"
                  ${count ? `data-facial-region="${escapeHtml(region.id)}" tabindex="0" role="button"` : 'aria-hidden="true"'}
                  aria-label="${escapeHtml(`${getFacialRegionLabel(region.id)} ${count}`)}"
                >
                  ${region.paths
                    .map(
                      (path) => `
                        <path
                          d="${path.d}"
                          fill="rgba(29, 107, 82, ${count ? intensity.toFixed(3) : '0.01'})"
                          stroke="${count ? 'rgba(29, 107, 82, 0.28)' : 'rgba(86, 105, 97, 0.08)'}"
                          stroke-width="${selected ? '0.9' : '0.45'}"
                          vector-effect="non-scaling-stroke"
                        ></path>
                      `
                    )
                    .join('')}
                  <text x="${region.label_x}" y="${region.label_y}" text-anchor="middle" class="summary-facial-map-label">${escapeHtml(
                    getFacialMapLabel(region.id)
                  )}</text>
                  <text x="${region.label_x}" y="${region.count_y}" text-anchor="middle" class="summary-facial-map-count">${escapeHtml(
                    String(count)
                  )}</text>
                </g>
              `;
            })
            .join('')}
        </svg>
      `
      : `
        <svg class="summary-facial-world ${selectedRegionIds.length ? 'has-selection' : ''}" viewBox="0 0 760 360" role="img" aria-label="${escapeHtml(
          t('世界地図上の顔貌症例分布', 'World map of facial case distribution')
        )}">
          <rect x="18" y="18" width="724" height="324" rx="28" fill="rgba(244,247,242,0.96)"></rect>
          <image
            href="/static/img/maps/world-robinson-cc0.svg"
            x="30"
            y="32"
            width="700"
            height="286"
            preserveAspectRatio="xMidYMid meet"
            class="summary-facial-world-image"
          ></image>
          ${mapRegions
            .map((region) => {
              const count = countUniqueFacialPatients(region.items);
              const intensity = count ? 0.18 + (count / maxMapCount) * 0.64 : 0.08;
              const selected = selectedRegionIds.includes(region.id);
              return `
                <g
                  class="summary-facial-map-region ${selected ? 'is-selected' : ''} ${count ? 'is-active' : 'is-empty'}"
                  ${count ? `data-facial-region="${escapeHtml(region.id)}" tabindex="0" role="button"` : 'aria-hidden="true"'}
                  aria-label="${escapeHtml(`${getFacialRegionLabel(region.id)} ${count}`)}"
                >
                  ${region.paths
                    .map(
                      (path) => `
                        <path
                          d="${path}"
                          fill="rgba(29, 107, 82, ${count ? intensity.toFixed(3) : '0.06'})"
                          stroke="${count ? 'rgba(29, 107, 82, 0.35)' : 'rgba(86, 105, 97, 0.12)'}"
                          stroke-width="${selected ? '3' : '2'}"
                          vector-effect="non-scaling-stroke"
                        ></path>
                      `
                    )
                    .join('')}
                  <text x="${region.countX}" y="${region.countY}" text-anchor="middle" class="summary-facial-map-label">${escapeHtml(
                    getFacialMapLabel(region.id)
                  )}</text>
                  <text x="${region.countX}" y="${region.countY + 21}" text-anchor="middle" class="summary-facial-map-count">${escapeHtml(
                    String(count)
                  )}</text>
                </g>
              `;
            })
            .join('')}
        </svg>
      `;

    const detailHtml = selectedRegionIds
      .map((selectedRegionId) => {
        const selectedItems = grouped.get(selectedRegionId) || [];
        const selectedRegionLabel = getFacialRegionLabel(selectedRegionId);
        const buckets = new Map();
        selectedItems.forEach((item) => {
          const bucket = getFacialAgeBucket(item);
          if (!buckets.has(bucket.key)) {
            buckets.set(bucket.key, {
              key: bucket.key,
              label: bucket.label,
              color: bucketColors[bucket.key],
              items: [],
            });
          }
          buckets.get(bucket.key).items.push(item);
        });

        const orderedBuckets = bucketOrder
          .map((key) => buckets.get(key))
          .filter(Boolean);
        const total = countUniqueFacialPatients(selectedItems);
        let angle = -Math.PI / 2;
        const selectedBucketKey = clinicalOverviewState.facialSelection.buckets[selectedRegionId] || null;
        const selectedBucket = orderedBuckets.find((bucket) => bucket.key === selectedBucketKey) || null;
        const slices = orderedBuckets
          .map((bucket) => {
            const bucketCount = countUniqueFacialPatients(bucket.items);
            const ratio = bucketCount / Math.max(total, 1);
            const nextAngle = angle + ratio * Math.PI * 2;
            const path = buildPieSlicePath(54, 54, 42, angle, nextAngle);
            const selected = selectedBucketKey === bucket.key;
            const slice = `
              <path
                d="${path}"
                fill="${bucket.color}"
                class="summary-facial-slice ${selected ? 'is-selected' : ''}"
                data-facial-region="${escapeHtml(selectedRegionId)}"
                data-facial-bucket="${escapeHtml(bucket.key)}"
                tabindex="0"
                role="button"
              ></path>
            `;
            angle = nextAngle;
            return slice;
          })
          .join('');

        return `
          <div class="summary-facial-detail">
            <div class="summary-facial-detail-head">
              <div>
                <h4>${escapeHtml(selectedRegionLabel)}</h4>
                <div class="summary-tiny">${escapeHtml(
                  t(`${total}件の一意の Patient ID`, `${total} unique Patient IDs`)
                )}</div>
              </div>
            </div>
            <div class="summary-facial-card-body">
              <svg class="summary-facial-pie" viewBox="0 0 108 108" role="img" aria-label="${escapeHtml(
                `${selectedRegionLabel} age distribution`
              )}">
                ${slices}
                <circle cx="54" cy="54" r="18" fill="rgba(255,252,246,0.96)"></circle>
                <text x="54" y="51" text-anchor="middle" class="summary-facial-pie-total">${escapeHtml(String(total))}</text>
                <text x="54" y="65" text-anchor="middle" class="summary-facial-pie-label">${escapeHtml(
                  t('件', 'cases')
                )}</text>
              </svg>
              <div class="summary-facial-legend">
                ${orderedBuckets
                  .map(
                    (bucket) => `
                      <div class="summary-facial-legend-block">
                        <button
                          class="summary-facial-legend-item ${selectedBucketKey === bucket.key ? 'is-selected' : ''}"
                          type="button"
                          data-facial-region="${escapeHtml(selectedRegionId)}"
                          data-facial-bucket="${escapeHtml(bucket.key)}"
                        >
                          <span class="summary-facial-legend-swatch" style="background:${escapeHtml(bucket.color)}"></span>
                          <span>${escapeHtml(bucket.label)}</span>
                          <span class="summary-facial-legend-count">${escapeHtml(String(countUniqueFacialPatients(bucket.items)))}</span>
                        </button>
                        ${
                          selectedBucket && selectedBucket.key === bucket.key
                            ? `
                              <div class="summary-facial-records summary-facial-records--inline">
                                <div class="summary-selection-note">${escapeHtml(
                                  t('選択中の年齢帯の症例', 'Records in selected age range')
                                )}</div>
                                <div class="summary-facial-record-list">
                                  ${dedupeFacialRecordList(selectedBucket.items)
                                    .map(
                                      (item) => `
                                        <a class="summary-facial-record" href="${escapeHtml(item.person || '#')}" target="_blank" rel="noopener noreferrer">
                                          <strong>${escapeHtml(item.id || t('症例', 'Case'))}</strong>
                                          <div class="summary-tiny">${escapeHtml(describeFacialRecord(item))}</div>
                                        </a>
                                      `
                                    )
                                    .join('')}
                                </div>
                              </div>
                            `
                            : ''
                        }
                      </div>
                    `
                  )
                  .join('')}
              </div>
            </div>
            ${
              selectedBucket
                ? ''
                : `
                  <div class="summary-facial-records">
                    <div class="summary-selection-note">${escapeHtml(
                      t('年齢帯を選ぶと、その症例一覧が表示されます。', 'Choose an age range to show the matching records.')
                    )}</div>
                  </div>
                `
            }
          </div>
        `;
      })
      .join('');

    panel.innerHTML = `
      <h3>${escapeHtml(t('顔貌・視覚的特徴', 'Facial features'))}</h3>
      <div class="summary-facial-meta">${escapeHtml(
        t(
          `${totalUniquePatients} 件の一意の Patient ID（地図内 ${inMapUniquePatients} / 地図外 ${offMapUniquePatients}）`,
          `${totalUniquePatients} unique Patient IDs (on-map ${inMapUniquePatients} / off-map ${offMapUniquePatients})`
        )
      )}</div>
      <div class="summary-facial-map-shell">
        <div class="summary-facial-map-frame">
          ${mapSvg}
        </div>
        <div class="summary-facial-extra">
          ${extraRegions.length
            ? `
              <div class="summary-selection-note">${escapeHtml(
                t('地図外の地域カテゴリ', 'Additional region categories')
              )}</div>
              <div class="summary-selection-pills">
                ${extraRegions
                  .map(
                    (region) => `
                      <button
                        type="button"
                        class="summary-selection-pill summary-selection-pill--toggle ${selectedRegionIds.includes(region.id) ? 'is-active' : ''}"
                        data-facial-region="${escapeHtml(region.id)}"
                      >
                        ${escapeHtml(region.label)}
                        <span class="summary-selection-pill-count">${escapeHtml(String(countUniqueFacialPatients(region.items)))}</span>
                      </button>
                    `
                  )
                  .join('')}
              </div>
            `
            : ''}
        </div>
      </div>
      ${
        selectedRegionIds.length
          ? detailHtml
          : `
            <div class="summary-facial-detail summary-facial-detail-empty">
              <div class="summary-selection-note">${escapeHtml(
                t('世界地図の地域を選ぶと、その地域の年齢分布と症例一覧を表示します。', 'Select a region on the world map to view age distribution and matching records.')
              )}</div>
            </div>
          `
      }
    `;

    const toggleRegionSelection = (regionId) => {
      const current = normalizeFacialSelection(clinicalOverviewState.facialSelection, grouped);
      if (current.regions[0] === regionId) {
        clinicalOverviewState.facialSelection = { regions: [], buckets: {} };
      } else {
        clinicalOverviewState.facialSelection = {
          regions: [regionId],
          buckets: { [regionId]: current.buckets?.[regionId] || null },
        };
      }
      rerenderClinicalOverviewWithState();
    };

    const toggleFacialSelection = (regionId, bucketKey) => {
      const current = normalizeFacialSelection(clinicalOverviewState.facialSelection, grouped);
      clinicalOverviewState.facialSelection = {
        regions: [regionId],
        buckets: {
          [regionId]: current.buckets[regionId] === bucketKey ? null : bucketKey,
        },
      };
      rerenderClinicalOverviewWithState();
    };
    panel.querySelectorAll('[data-facial-region]:not([data-facial-bucket])').forEach((element) => {
      const regionId = element.dataset.facialRegion;
      element.addEventListener('click', () => {
        toggleRegionSelection(regionId);
      });
      element.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleRegionSelection(regionId);
        }
      });
    });

    panel.querySelectorAll('[data-facial-region][data-facial-bucket]').forEach((element) => {
      const regionId = element.dataset.facialRegion;
      const bucketKey = element.dataset.facialBucket;
      element.addEventListener('click', () => {
        toggleFacialSelection(regionId, bucketKey);
      });
      element.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleFacialSelection(regionId, bucketKey);
        }
      });
    });

  }

  function renderBodyMap(features, bodyMap) {
    const wrap = $('bodymap-wrap');
    if (!wrap) return;

    if (!features.length) {
      wrap.innerHTML = '';
      return;
    }

    const featureById = new Map(
      features
        .filter((feature) => feature.categoryId)
        .map((feature) => [feature.categoryId, feature])
    );
    const resolvedRegions = (bodyMap?.body_regions || [])
      .map((region) => ({
        ...region,
        feature: featureById.get(region.hpo_id),
      }))
      .filter((region) => region.feature);

    const regions = resolvedRegions;

    const supplemental = (bodyMap?.supplemental_categories || [])
      .map((category) => ({
        ...category,
        feature: featureById.get(category.hpo_id),
      }))
      .filter((category) => category.feature);

    if (!regions.length && !supplemental.length) {
      wrap.innerHTML = '';
      return;
    }

    const selectedIds = getSelectedFeatureIds();
    const selectedAreas = new Set(
      regions
        .filter((region) => selectedIds.has(region.hpo_id))
        .map((region) => region.target_area)
    );
    const totalFeatureCount = features.reduce((sum, feature) => sum + feature.items.length, 0);

    wrap.innerHTML = `
      <div class="summary-bodymap">
        <div class="summary-bodymap-figure">
          ${buildBodyMapFigure()}
        </div>
        <div class="summary-bodymap-labels">
          <div class="summary-bodymap-actions">
            <button class="summary-bodymap-action" type="button" data-bodymap-action="all">
              <span>${escapeHtml(t('全表示', 'Show all'))}</span>
              <span class="summary-bodymap-count">${escapeHtml(String(totalFeatureCount))}</span>
            </button>
            <button class="summary-bodymap-action" type="button" data-bodymap-action="clear">
              ${escapeHtml(t('クリア', 'Clear'))}
            </button>
          </div>
          <div>
            <div class="summary-bodymap-title">${escapeHtml(t('人体部位から探す', 'Browse by body region'))}</div>
            <div class="summary-bodymap-links">
              ${regions
                .map(
                  (region) => `
                    <a
                      class="summary-bodymap-link ${selectedIds.has(region.hpo_id) ? 'is-selected' : ''}"
                      href="#${escapeHtml(toFeatureAnchorId(region.hpo_id))}"
                      data-bodymap-target="${escapeHtml(region.target_area)}"
                      data-bodymap-filter-type="hpo"
                      data-bodymap-filter-value="${escapeHtml(region.hpo_id)}"
                    >
                      <span>${escapeHtml(isJapaneseLocale() ? region.label_ja : region.label_en)}</span>
                      <span class="summary-bodymap-count">${escapeHtml(region.feature.items.length)}</span>
                    </a>
                  `
                )
                .join('')}
            </div>
          </div>
          ${
            supplemental.length
              ? `
                <div>
                  <div class="summary-bodymap-title">${escapeHtml(
                    t('全身・補助カテゴリから探す', 'Browse general and supplemental categories')
                  )}</div>
                  <div class="summary-bodymap-links">
                    ${supplemental
                      .map(
                        (category) => `
                          <a
                            class="summary-bodymap-link ${selectedIds.has(category.hpo_id) ? 'is-selected' : ''}"
                            href="#${escapeHtml(toFeatureAnchorId(category.hpo_id))}"
                            data-bodymap-filter-type="hpo"
                            data-bodymap-filter-value="${escapeHtml(category.hpo_id)}"
                          >
                            <span>${escapeHtml(isJapaneseLocale() ? category.label_ja : category.label_en)}</span>
                            <span class="summary-bodymap-count">${escapeHtml(category.feature.items.length)}</span>
                          </a>
                        `
                      )
                      .join('')}
                  </div>
                </div>
              `
              : ''
          }
        </div>
      </div>
    `;

    const hotspotAreas = wrap.querySelectorAll('[data-area]');
    const filterLinks = wrap.querySelectorAll('[data-bodymap-filter-type]');
    const applySelectedState = () => {
      selectedAreas.forEach((area) => {
        wrap.querySelectorAll(`[data-area="${area}"]`).forEach((node) => node.classList.add('is-active'));
      });
    };
    const clearActiveState = () => {
      hotspotAreas.forEach((node) => node.classList.remove('is-active'));
      filterLinks.forEach((node) => node.classList.remove('is-active'));
      applySelectedState();
    };

    filterLinks.forEach((link) => {
      const filterType = link.dataset.bodymapFilterType;
      const filterValue = link.dataset.bodymapFilterValue;
      const region = regions.find((item) => item.hpo_id === filterValue);
      const area = region?.target_area || null;
      const matchingHotspots = area ? wrap.querySelectorAll(`[data-area="${area}"]`) : [];
      const matchingLinks = wrap.querySelectorAll(
        `[data-bodymap-filter-type="${filterType}"][data-bodymap-filter-value="${filterValue}"]`
      );
      const activate = () => {
        clearActiveState();
        matchingHotspots.forEach((node) => node.classList.add('is-active'));
        matchingLinks.forEach((node) => node.classList.add('is-active'));
      };
      link.addEventListener('mouseenter', activate);
      link.addEventListener('focus', activate);
      link.addEventListener('mouseleave', clearActiveState);
      link.addEventListener('blur', clearActiveState);
      link.addEventListener('click', (event) => {
        event.preventDefault();
        if (filterType !== 'hpo') return;
        clinicalOverviewState.showAll = false;
        if (clinicalOverviewState.selectedCategoryIds.includes(filterValue)) {
          clinicalOverviewState.selectedCategoryIds = clinicalOverviewState.selectedCategoryIds.filter((id) => id !== filterValue);
        } else {
          clinicalOverviewState.selectedCategoryIds = [...clinicalOverviewState.selectedCategoryIds, filterValue];
        }
        rerenderClinicalOverviewWithState();
      });
    });

    hotspotAreas.forEach((hotspot) => {
      const area = hotspot.dataset.area;
      const targetRegions = regions.filter((region) => region.target_area === area);
      if (!targetRegions.length) {
        hotspot.classList.add('is-inactive');
        hotspot.removeAttribute('tabindex');
        return;
      }

      const matchingHotspots = wrap.querySelectorAll(`[data-area="${area}"]`);
      const matchingLinks = targetRegions.flatMap((region) =>
        Array.from(wrap.querySelectorAll(`[data-bodymap-filter-type="hpo"][data-bodymap-filter-value="${region.hpo_id}"]`))
      );
      const activate = () => {
        clearActiveState();
        matchingHotspots.forEach((node) => node.classList.add('is-active'));
        matchingLinks.forEach((node) => node.classList.add('is-active'));
      };
      const navigate = () => {
        clinicalOverviewState.showAll = false;
        const targetIds = targetRegions.map((region) => region.hpo_id);
        const currentIds = new Set(clinicalOverviewState.selectedCategoryIds);
        const allSelected = targetIds.every((id) => currentIds.has(id));

        if (allSelected) {
          clinicalOverviewState.selectedCategoryIds = clinicalOverviewState.selectedCategoryIds.filter(
            (id) => !targetIds.includes(id)
          );
        } else {
          targetIds.forEach((id) => currentIds.add(id));
          clinicalOverviewState.selectedCategoryIds = Array.from(currentIds);
        }
        rerenderClinicalOverviewWithState();
      };

      hotspot.setAttribute('tabindex', '0');
      hotspot.setAttribute('role', 'link');
      hotspot.setAttribute(
        'aria-label',
        matchingLinks[0]?.textContent?.trim() || t('該当カテゴリを表示', 'Show matching categories')
      );

      hotspot.addEventListener('mouseenter', activate);
      hotspot.addEventListener('focus', activate);
      hotspot.addEventListener('mouseleave', clearActiveState);
      hotspot.addEventListener('blur', clearActiveState);
      hotspot.addEventListener('click', navigate);
      hotspot.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          navigate();
        }
      });
    });

    wrap.querySelectorAll('[data-bodymap-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.bodymapAction;
        if (action === 'all') {
          clinicalOverviewState.showAll = true;
          clinicalOverviewState.selectedCategoryIds = [];
        } else if (action === 'clear') {
          clinicalOverviewState.showAll = false;
          clinicalOverviewState.selectedCategoryIds = [];
        }
        rerenderClinicalOverviewWithState();
      });
    });

    applySelectedState();
  }

  function renderClinicalOverview(features, facialItems, bodyMap, facialMap) {
    clinicalOverviewState = {
      features,
      facialItems,
      bodyMap,
      facialMap,
      selectedCategoryIds: clinicalOverviewState.selectedCategoryIds,
      showAll: clinicalOverviewState.showAll,
      facialSelection: clinicalOverviewState.facialSelection,
    };

    const selectedIds = getSelectedFeatureIds();
    const visibleFeatures = clinicalOverviewState.showAll
      ? features
      : features.filter((feature) => selectedIds.has(feature.categoryId));

    renderBodyMap(features, bodyMap);

    const selectedFeatures = clinicalOverviewState.showAll ? features : visibleFeatures;

    $('selection-summary').innerHTML = clinicalOverviewState.showAll
      ? `<div class="summary-selection-note">${escapeHtml(t('すべてのカテゴリを表示中です。', 'Showing all categories.'))}</div>`
      : selectedFeatures.length
        ? `
          <div class="summary-selection-note">${escapeHtml(t('選択中のカテゴリ', 'Selected categories'))}</div>
          <div class="summary-selection-pills">
            ${selectedFeatures
              .map(
                (feature) => `
                  <button class="summary-selection-pill" type="button" data-remove-hpo="${escapeHtml(feature.categoryId)}">
                    ${escapeHtml(feature.category)}
                  </button>
                `
              )
              .join('')}
          </div>
        `
        : `<div class="summary-selection-note">${escapeHtml(
            t('人体図またはカテゴリボタンを押すと、該当カテゴリがここに表示されます。', 'Pick a body area or category to show matching sections here.')
          )}</div>`;

    $('feature-grid').innerHTML = selectedFeatures.length
      ? selectedFeatures
          .map(
            (feature) => `
        <article class="summary-feature-card is-match" id="${escapeHtml(toFeatureAnchorId(feature.categoryId))}" data-hpo-id="${escapeHtml(feature.categoryId || '')}">
          <h3>
            <a href="${escapeHtml(feature.categoryUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(feature.category)}</a>
            <span class="summary-feature-count">${escapeHtml(feature.items.length)}</span>
          </h3>
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
      : '';

    $('selection-summary')
      .querySelectorAll('[data-remove-hpo]')
      .forEach((button) => {
        button.addEventListener('click', () => {
          const hpoId = button.dataset.removeHpo;
          clinicalOverviewState.showAll = false;
          clinicalOverviewState.selectedCategoryIds = clinicalOverviewState.selectedCategoryIds.filter((id) => id !== hpoId);
          rerenderClinicalOverviewWithState();
        });
      });

    renderFacialPanel(facialItems, facialMap);
  }

  function renderSubclasses(root, children, statsById = new Map()) {
    setText(
      'subclass-meta',
      children.length
        ? (isJapaneseLocale() ? `${children.length} 病型` : `${children.length} subtypes`)
        : t('病型なし', 'No subtypes')
    );

    if (!children.length) {
      $('subclass-tree').innerHTML = `<div class="summary-tiny">${t('病型分類はありません。', 'No subtype classification available.')}</div>`;
      return;
    }

    $('subclass-tree').innerHTML = `
      <div class="summary-tree-root">
        <div class="summary-subclass-kicker">${escapeHtml(t('親疾患', 'Parent disease'))}</div>
        <strong>${escapeHtml(isJapaneseLocale() ? root.ja : root.en)}</strong>
        ${isJapaneseLocale() ? `<span>${escapeHtml(root.en)}</span>` : root.ja ? `<span>${escapeHtml(root.ja)}</span>` : ''}
        <span class="summary-tree-root-id">${escapeHtml(root.id)}</span>
        <div class="summary-tree-root-note">
          ${escapeHtml(t('主疾患からたどれる病型分類です。', 'Subtype entries derived from the main disease.'))}
        </div>
      </div>
      <div class="summary-tree-children">
        ${children
          .map((child, index) => {
            const stats = statsById.get(child.id) || { genes: 0, features: 0, subtypes: 0 };
            const diseaseUrl = `/disease/${escapeHtml(child.id)}`;
            const childSummaryUrl = `/summary/${encodeURIComponent(child.id)}?lang=${getCurrentLang()}`;
            return `
          <article class="summary-child-card">
            <div class="summary-child-kicker">${escapeHtml(
              isJapaneseLocale() ? `病型 ${String(index + 1).padStart(2, '0')}` : `Subtype ${String(index + 1).padStart(2, '0')}`
            )}</div>
            <a class="summary-child-id" href="${childSummaryUrl}">${escapeHtml(child.id)}</a>
            <h3>${escapeHtml(isJapaneseLocale() ? child.ja : child.en)}</h3>
            ${
              isJapaneseLocale() && child.en
                ? `<div class="summary-child-subtitle">${escapeHtml(child.en)}</div>`
                : ''
            }
            <div class="summary-child-stats">
              <a class="summary-child-stat summary-card-link" href="${diseaseUrl}#genes">
                <span class="summary-child-stat-label">${escapeHtml(t('遺伝子', 'Genes'))}</span>
                <strong>${escapeHtml(String(stats.genes))}</strong>
              </a>
              <a class="summary-child-stat summary-card-link" href="${diseaseUrl}#clinical-features">
                <span class="summary-child-stat-label">${escapeHtml(t('所見', 'Features'))}</span>
                <strong>${escapeHtml(String(stats.features))}</strong>
              </a>
              <a class="summary-child-stat summary-card-link" href="${diseaseUrl}#nanbyo-subtype">
                <span class="summary-child-stat-label">${escapeHtml(t('病型', 'Subtypes'))}</span>
                <strong>${escapeHtml(String(stats.subtypes))}</strong>
              </a>
            </div>
          </article>
        `;
          })
          .join('')}
      </div>
    `;
  }

  function renderLinks(items) {
    $('link-grid').innerHTML = items.length
      ? items
          .map(
            (link) => `
        <a class="summary-compact-link" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">
          <strong>${escapeHtml(link.label)}</strong>
          <div class="summary-compact-note">${escapeHtml(getLinkDescription(link.label))}</div>
        </a>
      `
          )
          .join('')
      : `<div class="summary-tiny">${t('リンク情報はありません。', 'No external links available.')}</div>`;
  }

  function renderReferences(items) {
    $('reference-list').innerHTML = items.length
      ? items
          .map(
            (ref) => `
        <a class="summary-compact-link" href="${escapeHtml(ref.url)}" target="_blank" rel="noopener noreferrer">
          <strong>${escapeHtml(ref.date)}</strong>
          <div class="summary-compact-note">${escapeHtml(ref.title)}</div>
        </a>
      `
          )
          .join('')
      : `<div class="summary-tiny">${t('文献データはありません。', 'No references available.')}</div>`;
  }

  function mapGenes(japanGenes, causalGenes) {
    const japanMap = new Map(
      japanGenes.map((gene) => [
        gene.symbol,
        {
          symbol: gene.symbol,
          name: gene.gene_name || gene.symbol,
          nameJa: gene.gene_name_ja || gene.name_ja || '',
          noteJa: gene.gene_description_ja || gene.ncbigene_description_ja || '',
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
          nameJa: gene.mondo_label_ja || '',
          noteJa: '',
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
      const categoryId = extractHpoId(item.hpo_category || item.hpo_category_id || item.hpo_category_url);
      const key =
        categoryId ||
        item.hpo_category ||
        item.hpo_category_name_ja ||
        item.hpo_category_name_en ||
        '未分類';
      if (!grouped.has(key)) {
        grouped.set(key, {
          categoryId,
          category: isJapaneseLocale()
            ? item.hpo_category_name_ja || item.hpo_category_name_en || '未分類'
            : item.hpo_category_name_en || item.hpo_category_name_ja || 'Uncategorized',
          categoryUrl: item.hpo_category || '#',
          items: new Map(),
        });
      }
      const group = grouped.get(key);
      const itemKey =
        item.hpo_url || item.hpo_id || item.hpo_label_ja || item.hpo_label_en;
      if (!group.items.has(itemKey)) {
        group.items.set(itemKey, {
          label: isJapaneseLocale()
            ? item.hpo_label_ja || item.hpo_label_en || item.hpo_id
            : item.hpo_label_en || item.hpo_label_ja || item.hpo_id,
          url: item.hpo_url || '#',
        });
      }
    }
    return Array.from(grouped.values()).map((group) => ({
      categoryId: group.categoryId,
      category: group.category,
      categoryUrl: group.categoryUrl,
      items: Array.from(group.items.values()),
    }));
  }

  function mapFacialFeatures(items) {
    return uniqueBy(
      items
        .map((item) => ({
          id: item.id || '',
          person: item.person || '',
          gender: item.gender || '',
          gene: item.gene || '',
          ethnicity: item.minzoku || t('不明', 'Unknown'),
          ethnicityNote: item.minzokumemo || '',
          imageId: item.image_id || '',
          imageType: item.image_desc || '',
          age_year: item.age_year,
          age_month: item.age_month,
          age_memo: item.age_memo || '',
          pmid: item.pmid || '',
          pmid_url: item.pmid_url || '',
        }))
        .filter((item) => item.id || item.person || item.pmid),
      (item) => `${item.id}|${item.person}|${item.pmid}|${item.imageId}`
    );
  }

  function mapLinks(overview, mondo, orphanet, medgen, kegg, omim, gard, monarchXrefs) {
    const links = [];
    const linkOrder = new Map([
      ['MHLW 概要・診断基準', 10],
      ['MHLW 個票', 20],
      ['難病情報センター', 30],
      ['MONDO', 100],
      ['OMIM', 110],
      ['Orphanet', 120],
      ['MedGen', 130],
      ['GARD', 140],
      ['DOID', 150],
      ['MESH', 160],
      ['ICD10CM', 170],
      ['ICD11', 180],
      ['NCIT', 190],
      ['KEGG Disease', 200],
    ]);

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

    const omimItem = (Array.isArray(omim) ? omim : []).find((item) => item.original_disease);
    if (omimItem?.original_disease) links.push({ label: 'OMIM', url: omimItem.original_disease });

    if (gard?.url) links.push({ label: 'GARD', url: gard.url });
    if (Array.isArray(monarchXrefs) && monarchXrefs.length) links.push(...monarchXrefs);

    return uniqueBy(links, (link) => `${link.label}:${link.url}`).sort((left, right) => {
      const leftOrder = linkOrder.get(left.label) ?? 999;
      const rightOrder = linkOrder.get(right.label) ?? 999;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.label.localeCompare(right.label);
    });
  }

  function getLinkDescription(label) {
    const descriptions = {
      'MHLW 概要・診断基準': t(
        '厚生労働省が公開する疾患概要と診断基準の資料です。',
        'Overview and diagnostic criteria published by MHLW.'
      ),
      'MHLW 個票': t(
        '指定難病の臨床調査個人票の様式を確認できます。',
        'Clinical survey form for designated intractable diseases.'
      ),
      '難病情報センター': t(
        '患者向けの解説や支援制度情報を掲載する国内ポータルです。',
        'Japanese portal with patient-oriented disease and support information.'
      ),
      MONDO: t(
        '疾患オントロジー上の統合 ID と対応関係を参照できます。',
        'Integrated disease ontology identifier and mappings.'
      ),
      Orphanet: t(
        '希少疾患の国際データベースにある該当疾患ページです。',
        'Relevant disease page in the Orphanet rare disease database.'
      ),
      MedGen: t(
        'NCBI の疾患概念データベースで関連概念を確認できます。',
        'Related concept page in NCBI MedGen.'
      ),
      OMIM: t(
        '遺伝性疾患と表現型の知識ベースで疾患概要を確認できます。',
        'Disease overview in the OMIM knowledgebase of genes and phenotypes.'
      ),
      GARD: t(
        '患者向けに整理された希少疾患情報を確認できます。',
        'Patient-friendly rare disease information provided by GARD.'
      ),
      DOID: t(
        'Disease Ontology の該当疾患エントリです。',
        'Disease Ontology entry for the mapped disease.'
      ),
      MESH: t(
        'MeSH の該当疾患概念を確認できます。',
        'Mapped disease concept in MeSH.'
      ),
      NCIT: t(
        'NCI Thesaurus の該当概念です。',
        'Mapped concept in the NCI Thesaurus.'
      ),
      ICD11: t(
        'WHO ICD-11 Foundation の該当概念です。',
        'Mapped concept in the WHO ICD-11 Foundation.'
      ),
      ICD10CM: t(
        'ICD-10-CM の該当コードを確認できます。',
        'Mapped code in ICD-10-CM.'
      ),
      'KEGG Disease': t(
        'KEGG Disease に登録された疾患エントリです。',
        'Disease entry in KEGG Disease.'
      ),
    };
    return descriptions[label] || t(
      '関連する外部データベースへのリンクです。',
      'Link to a related external database.'
    );
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

  function setupToc() {
    const tocLinks = Array.from(document.querySelectorAll('.summary-toc-link'));
    if (!tocLinks.length) return;

    const sections = tocLinks
      .map((link) => document.getElementById(link.dataset.target))
      .filter(Boolean);

    const setActive = (id) => {
      tocLinks.forEach((link) => {
        link.classList.toggle('is-active', link.dataset.target === id);
      });
    };

    if (sections[0]?.id) {
      setActive(sections[0].id);
    }

    const updateByScrollPosition = () => {
      const headerOffset = 140;
      const candidates = sections
        .map((section) => ({ section, top: section.getBoundingClientRect().top }))
        .filter(({ top }) => top <= headerOffset);

      if (candidates.length) {
        setActive(candidates[candidates.length - 1].section.id);
        return;
      }

      const nearest = sections
        .map((section) => ({ section, distance: Math.abs(section.getBoundingClientRect().top - headerOffset) }))
        .sort((a, b) => a.distance - b.distance)[0];

      if (nearest?.section?.id) {
        setActive(nearest.section.id);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) {
          setActive(visible.target.id);
        } else {
          updateByScrollPosition();
        }
      },
      {
        rootMargin: '-10% 0px -70% 0px',
        threshold: [0, 0.15, 0.35],
      }
    );

    sections.forEach((section) => observer.observe(section));

    const mobileToc = document.querySelector('.summary-toc-mobile');
    tocLinks.forEach((link) => {
      link.addEventListener('click', () => {
        if (mobileToc?.open) mobileToc.open = false;
      });
    });

    window.addEventListener('scroll', updateByScrollPosition, { passive: true });
    updateByScrollPosition();
  }

  async function loadDisease(rawId) {
    const id = normalizeNandoId(rawId);
    if (!id) {
      setStatus(
        t(
          'URL に NANDO ID を指定してください。例: /summary/NANDO:1200473',
          'Specify a NANDO ID in the URL. Example: /summary/NANDO:1200473'
        ),
        true
      );
      return;
    }

    const loadToken = ++activeLoadToken;
    resetView(id);
    setStatus('');

    const overviewPromise = fetchJson('nanbyodata_get_overview_by_nando_id', id);
    const ontologyLabelsPromise = fetchOntologyLabels(id).catch(() => ({
      ja: '',
      en: '',
      programJa: '',
      programEn: '',
    }));
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
    const bodyMapPromiseForLoad = fetchBodyMap().catch(() => null);
    const facialMapPromiseForLoad = fetchFacialMap().catch(() => null);
    const mondoPromise = fetchJson('nanbyodata_get_link_mondo_by_nando_id', id);
    const orphanetPromise = fetchJson('nanbyodata_get_link_orphanet_by_nando_id', id);
    const medgenPromise = fetchJson('nanbyodata_get_link_medgen_by_nando_id', id);
    const omimPromise = fetchJson('nanbyodata_get_link_omim_by_nando_id', id).catch((error) => {
      if (isActiveLoad(loadToken)) {
        console.warn('OMIM link fetch failed:', error);
      }
      return [];
    });
    const keggPromise = fetchJson('nanbyodata_get_link_kegg_by_nando_id', id).catch((error) => {
      if (isActiveLoad(loadToken)) {
        console.warn('KEGG link fetch failed:', error);
      }
      return [];
    });
    const gardPromise = Promise.all([overviewPromise, mondoPromise])
      .then(([overview, mondo]) => fetchGardLinkByMondoId(extractMondoId(overview, mondo), overview))
      .catch((error) => {
        if (isActiveLoad(loadToken)) {
          console.warn('GARD link fetch failed:', error);
        }
        return null;
      });
    const monarchXrefsPromise = Promise.all([overviewPromise, mondoPromise])
      .then(([overview, mondo]) => fetchMonarchXrefLinksByMondoId(extractMondoId(overview, mondo)))
      .catch((error) => {
        if (isActiveLoad(loadToken)) {
          console.warn('Monarch xref link fetch failed:', error);
        }
        return [];
      });
    const clinvarPromise = fetchJson('nanbyodata_get_clinvar_variant_by_nando_id', id);
    const mgendPromise = fetchJson('nanbyodata_get_mgend_variant_by_nando_id', id);
    const geneticTestsPromise = fetchJson('nanbyodata_get_genetic_test_by_nando_id', id);

    let failures = 0;
    const noteFailure = (error) => {
      failures += 1;
      if (isActiveLoad(loadToken)) {
        setStatus(t('一部データの取得に失敗しています。', 'Some data could not be loaded.'), true);
      }
    };

    overviewPromise
      .then(async (overview) => {
        if (!isActiveLoad(loadToken)) return;
        const ontologyLabels = await ontologyLabelsPromise;
        if (!isActiveLoad(loadToken)) return;
        const currentLang = getCurrentLang();
        const alias = isJapaneseLocale()
          ? overview.alt_label_ja?.[0] || overview.alt_label_en?.[0] || '-'
          : overview.alt_label_en?.[0] || overview.alt_label_ja?.[0] || '-';
        const primaryTitle =
          (currentLang === 'ja'
            ? ontologyLabels.ja || pickDiseaseName(overview, 'ja')
            : ontologyLabels.en || pickDiseaseName(overview, 'en')) || `NANDO:${id}`;
        const secondaryTitle =
          currentLang === 'ja'
            ? (ontologyLabels.en || pickDiseaseName(overview, 'en'))
            : '';
        document.title = `${primaryTitle} | Disease Summary`;
        renderDiseaseCharacter(`NANDO:${id}`);
        setText('title-ja', primaryTitle);
        if (currentLang === 'ja') {
          setText('title-en', secondaryTitle || '');
        } else {
          setText('title-en', '');
        }
        renderAliases(overview);
        setDescription(
          isJapaneseLocale()
            ? (
                overview.description ||
                overview.medgen_definition ||
                overview.kegg_description ||
                ''
              )
            : (
                overview.medgen_definition ||
                overview.mondo_decs?.[0]?.id ||
                overview.kegg_description ||
                overview.description ||
                ''
              )
        );
        setText('notification-number', overview.notification_number || '-');
        setText('notification-program', isJapaneseLocale() ? ontologyLabels.programJa : ontologyLabels.programEn);
        setText('alias-primary', alias);
        const inheritanceSummary = buildInheritanceSummary(overview.inheritance_uris);
        setText('insight-inheritance', inheritanceSummary.value);
        setText('insight-inheritance-note', inheritanceSummary.note);
        setHref('inheritance-link', inheritanceSummary.url);
        updateDownloadData({
          overview: {
            ...(currentDownloadData?.overview || {}),
            nandoId: `NANDO:${id}`,
            labelJa: overview.label_ja || '',
            labelEn: overview.label_en || '',
            notificationNumber: overview.notification_number || '-',
            aliasPrimary: alias,
            inheritance: inheritanceSummary.value,
            description:
              overview.description ||
              overview.medgen_definition ||
              overview.kegg_description ||
              '',
          },
        });
        syncMyDiseaseButton({
          id: `NANDO:${id}`,
          label_ja: ontologyLabels.ja || overview.label_ja || '',
          label_en: ontologyLabels.en || overview.label_en || overview.engLabel || '',
        });
      })
      .catch(noteFailure);

    Promise.all([overviewPromise, mondoPromise])
      .then(([overview, mondo]) => {
        if (!isActiveLoad(loadToken)) return;
        const mondoItem = mondo.find((item) => item.id?.startsWith('MONDO:'));
        setText('insight-axis', mondoItem?.id || overview.mondos?.[0]?.id || '-');
        setText('insight-axis-note', formatMatchType(mondoItem?.property));
        setHref('mondo-link', mondoItem?.mondo_url || mondoItem?.url || '#');
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
        quickFactsState.patients = latestPatient ? `${latestPatient.count}人` : '-';
        quickFactsState.patientsNote = latestPatient
          ? (isJapaneseLocale() ? `${latestPatient.year}年` : String(latestPatient.year))
          : t('患者統計なし', 'No patient data');
        renderQuickFactsList();
        setText('insight-patients', latestPatient ? `${latestPatient.count}人` : '-');
        setText(
          'insight-patients-note',
          latestPatient
            ? (isJapaneseLocale()
                ? `${latestPatient.year}年の特定医療費受給者証所持者数`
                : `Patients in ${latestPatient.year}`)
            : t('患者統計なし', 'No patient statistics')
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
        const uniqueJapanGeneSymbols = uniqueBy(
          japanGenes.map((gene) => gene.symbol).filter(Boolean),
          (symbol) => String(symbol).toUpperCase()
        );
        const uniqueIntlGeneSymbols = uniqueBy(
          causalGenes.map((gene) => gene.gene_symbol).filter(Boolean),
          (symbol) => String(symbol).toUpperCase()
        );
        const totalGenes = uniqueBy(
          [...japanGenes.map((gene) => gene.symbol), ...causalGenes.map((gene) => gene.gene_symbol)].filter(Boolean),
          (symbol) => String(symbol).toUpperCase()
        ).length;
        quickFactsState.genes = String(totalGenes);
        quickFactsState.genesNote = isJapaneseLocale()
          ? `国内 ${uniqueJapanGeneSymbols.length} / 国際 ${uniqueIntlGeneSymbols.length}`
          : `Japan ${uniqueJapanGeneSymbols.length} / Intl ${uniqueIntlGeneSymbols.length}`;
        renderQuickFactsList();
        const genes = mapGenes(japanGenes, causalGenes);
        renderGenes(genes);
        updateDownloadData({
          genes,
          stats: {
            ...(currentDownloadData?.stats || {}),
            '疾患関連遺伝子 国内基準由来': uniqueJapanGeneSymbols.length,
            '疾患関連遺伝子 国際リソース由来': uniqueIntlGeneSymbols.length,
          },
        });
      })
      .catch(noteFailure);

    Promise.all([glycanPromise, geneticTestsPromise, clinvarPromise, mgendPromise])
      .then(([glycanData, geneticTests, clinvarData, mgendData]) => {
        if (!isActiveLoad(loadToken)) return;
        const base = `${window.location.origin}/disease/NANDO:${encodeURIComponent(id)}`;
        const uniqueGlycanGeneCount = countUniqueGlycanGenes(glycanData);
        quickFactsState.tests = String(geneticTests.length);
        quickFactsState.testsNote = isJapaneseLocale()
          ? '診療用の遺伝学的検査'
          : 'Clinical genetic testing entries';
        renderQuickFactsList();
        renderDiagnosticCards([
          {
            title: t('遺伝学的検査', 'Genetic tests'),
            value: String(geneticTests.length),
            noteHtml: `<span class="summary-note-with-icon"><i class="far fa-hand-pointer" aria-hidden="true"></i> ${escapeHtml(
              t('一覧を表示する', 'View list')
            )}</span>`,
            panelId: geneticTests.length ? 'genetic-testing-panel' : '',
            href: `${base}#genetic-testing`,
          },
          {
            title: 'ClinVar',
            value: String(clinvarData.length),
            note: t('国際的なバリアント知識ベース', 'International variant knowledge base'),
            href: `${base}#variants-clinvar`,
          },
          {
            title: 'MGeND',
            value: String(mgendData.length),
            note: t('国内のバリアント知識ベース', 'Japanese variant knowledge base'),
            href: `${base}#variants-mgend`,
          },
          {
            title: 'GlyCosmos',
            value: String(uniqueGlycanGeneCount),
            note: t('糖鎖関連遺伝子', 'Glycan-related genes'),
            href: `${base}#glycan-related-genes`,
          },
        ]);
        renderGeneticTestingPanel(geneticTests, `${base}#genetic-testing`);
      })
      .catch(noteFailure);

    Promise.all([hpoPromise, bodyMapPromiseForLoad, facialMapPromiseForLoad])
      .then(([hpoData, bodyMap, facialMap]) => {
        if (!isActiveLoad(loadToken)) return;
        const features = mapFeatures(hpoData);
        quickFactsState.features = String(hpoData.length);
        quickFactsState.featuresNote = isJapaneseLocale()
          ? `症状カテゴリ ${features.length}`
          : `Categories ${features.length}`;
        renderQuickFactsList();
        facialPromise
          .then((facialData) => {
            if (!isActiveLoad(loadToken)) return;
            renderClinicalOverview(features, mapFacialFeatures(facialData), bodyMap, facialMap);
            updateDownloadData({
              features,
              stats: {
                ...(currentDownloadData?.stats || {}),
                臨床的特徴: hpoData.length,
                顔貌特徴: facialData.length,
              },
            });
          })
          .catch(() => {
            if (!isActiveLoad(loadToken)) return;
            renderClinicalOverview(features, [], bodyMap, facialMap);
            updateDownloadData({
              features,
              stats: {
                ...(currentDownloadData?.stats || {}),
                臨床的特徴: hpoData.length,
              },
            });
          });
      })
      .catch(noteFailure);

    subClassPromise
      .then(async (subClassData) => {
        if (!isActiveLoad(loadToken)) return;
        const root = subClassData[0] || {};
        const children = subClassData
          .filter((item) => item.parent)
          .map((item) => ({ id: item.id, ja: item.label, en: item.engLabel }));
        quickFactsState.subtypes = String(children.length);
        quickFactsState.subtypesNote = children.length
          ? t('親疾患を除く', 'Excluding parent disease')
          : t('病型分類なし', 'No subtype classification');
        renderQuickFactsList();
        const statsById = children.length ? await fetchSubtypeStats(children) : new Map();
        if (!isActiveLoad(loadToken)) return;
        renderSubclasses(
          {
            id: `NANDO:${id}`,
            ja: root.label || root.engLabel || '-',
            en: root.engLabel || root.label || '-',
          },
          children,
          statsById
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

    Promise.all([overviewPromise, mondoPromise, orphanetPromise, medgenPromise, keggPromise, omimPromise, gardPromise, monarchXrefsPromise])
      .then(([overview, mondo, orphanet, medgen, kegg, omim, gard, monarchXrefs]) => {
        if (!isActiveLoad(loadToken)) return;
        const links = mapLinks(overview, mondo, orphanet, medgen, kegg, omim, gard, monarchXrefs);
        renderPrimaryLinks(links.slice(0, 4));
        renderLinks(links);
        updateDownloadData({ links });
      })
      .catch(noteFailure);

    referencesPromise
      .then((references) => {
        if (!isActiveLoad(loadToken)) return;
        const recentReferences = references.slice(0, 5);
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
        updateDownloadData({
          stats: {
            ...(currentDownloadData?.stats || {}),
            糖鎖関連遺伝子: countUniqueGlycanGenes(data),
          },
        });
      })
      .catch(noteFailure);
    facialPromise
      .then((data) => {
        if (!isActiveLoad(loadToken)) return;
        updateDownloadData({ stats: { ...(currentDownloadData?.stats || {}), 顔貌特徴: data.length } });
      })
      .catch(noteFailure);
    humanPromise
      .then((data) => {
        if (!isActiveLoad(loadToken)) return;
        updateDownloadData({ stats: { ...(currentDownloadData?.stats || {}), ヒトゲノムデータセット: data.length } });
      })
      .catch(noteFailure);
    cellPromise
      .then((data) => {
        if (!isActiveLoad(loadToken)) return;
        updateDownloadData({ stats: { ...(currentDownloadData?.stats || {}), 細胞: data.length } });
      })
      .catch(noteFailure);
    mousePromise
      .then((data) => {
        if (!isActiveLoad(loadToken)) return;
        updateDownloadData({ stats: { ...(currentDownloadData?.stats || {}), マウス: data.length } });
      })
      .catch(noteFailure);
    dnaPromise
      .then((data) => {
        if (!isActiveLoad(loadToken)) return;
        updateDownloadData({ stats: { ...(currentDownloadData?.stats || {}), DNA: data.length } });
      })
      .catch(noteFailure);
    compoundsPromise
      .then((data) => {
        if (!isActiveLoad(loadToken)) return;
        updateDownloadData({ stats: { ...(currentDownloadData?.stats || {}), 化合物: data.length } });
      })
      .catch(noteFailure);
    clinvarPromise
      .then((data) => {
        if (!isActiveLoad(loadToken)) return;
        updateDownloadData({ stats: { ...(currentDownloadData?.stats || {}), ClinVar: data.length } });
      })
      .catch(noteFailure);
    mgendPromise
      .then((data) => {
        if (!isActiveLoad(loadToken)) return;
        updateDownloadData({ stats: { ...(currentDownloadData?.stats || {}), MGeND: data.length } });
      })
      .catch(noteFailure);
    geneticTestsPromise
      .then((data) => {
        if (!isActiveLoad(loadToken)) return;
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
      omimPromise,
      keggPromise,
      gardPromise,
      monarchXrefsPromise,
      clinvarPromise,
      mgendPromise,
      geneticTestsPromise,
    ]).then(() => {
      if (!isActiveLoad(loadToken)) return;
      const today = new Date().toISOString().slice(0, 10);
      $('footer-note').innerHTML = `出典: NanbyoData API / NANDO:${escapeHtml(id)}<br>取得日: ${escapeHtml(today)}`;
      window.history.replaceState(null, '', buildSummaryUrl(id));
      setStatus(failures === 0 ? '' : t('一部データの取得に失敗しています。', 'Some data could not be loaded.'), failures > 0);
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

    const myDiseaseToggle = $('my-disease-toggle');
    if (myDiseaseToggle) {
      myDiseaseToggle.addEventListener('click', () => {
        if (!currentMyDiseaseEntry) return;
        const result = toggleMyDisease(currentMyDiseaseEntry);
        setMyDiseaseButtonState(result.active);
        updateMyDiseasesNavCount();
      });
    }

    $('gene-grid').addEventListener('click', (event) => {
      const button = event.target.closest('.summary-gene-toggle');
      if (!button) return;
      const card = button.closest('.summary-gene-card');
      const note = card?.querySelector('.summary-gene-note');
      if (!note) return;
      const expanded = note.dataset.expanded === 'true';
      note.dataset.expanded = expanded ? 'false' : 'true';
      button.textContent = expanded ? 'More' : 'Less';
    });

    $('diagnostic-grid').addEventListener('click', (event) => {
      const button = event.target.closest('.summary-diagnostic-toggle');
      if (!button) return;
      const panelId = button.dataset.panelTarget;
      const panel = panelId ? $(panelId) : null;
      if (!panel) return;
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      panel.hidden = expanded;
      if (!expanded) {
        pulseTarget(panel);
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });

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
    updateMyDiseasesNavCount();
    setupToc();
    loadDisease(initialId);

    if (params.get('export') === 'pdf') {
      window.addEventListener('load', () => {
        window.setTimeout(() => window.print(), 800);
      });
    }
  }

  bootstrap();
})();
