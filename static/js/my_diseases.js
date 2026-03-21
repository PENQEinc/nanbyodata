(function () {
  const MY_DISEASES_STORAGE_KEY = 'nanbyodata:my-diseases';
  const PROGRAM_ROOTS = {
    designated: 'NANDO:1000001',
    pediatric: 'NANDO:2000001',
  };
  let ontologyPromise = null;
  let activeProgramKey = null;

  const $ = (id) => document.getElementById(id);
  const root = $('my-diseases-root');

  function getCurrentLang() {
    const locale = root?.dataset.locale || document.documentElement.lang || 'en';
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

  function normalizeNandoId(raw) {
    const trimmed = String(raw || '').trim();
    if (!trimmed) return '';
    return trimmed.toUpperCase().startsWith('NANDO:') ? trimmed : `NANDO:${trimmed}`;
  }

  function loadMyDiseases() {
    const raw = getStorageItem(MY_DISEASES_STORAGE_KEY);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((entry) => ({
          id: normalizeNandoId(entry.id),
          label_ja: normalizeJaLabel(entry.label_ja),
          label_en: String(entry.label_en || '').trim(),
          saved_at: String(entry.saved_at || ''),
        }))
        .filter((entry) => entry.id);
    } catch (error) {
      return [];
    }
  }

  function normalizeJaLabel(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    if (!/[\u4E00-\u9FFF]/.test(text)) return text;
    return text.replace(/[\u3040-\u309F\u30A0-\u30FFー]{2,}$/u, '').trim() || text;
  }

  function saveMyDiseases(entries) {
    setStorageItem(MY_DISEASES_STORAGE_KEY, JSON.stringify(entries));
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function formatSavedAt(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return isJapaneseLocale()
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      : date.toISOString().slice(0, 10);
  }

  async function fetchOntologyIndex() {
    if (!ontologyPromise) {
      const url = isJapaneseLocale()
        ? '/ontology/current_release/nando_ja.obo'
        : '/ontology/current_release/nando_en.obo';

      ontologyPromise = fetch(url)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`ontology: HTTP ${response.status}`);
          }
          return response.text();
        })
        .then((text) => {
          const index = new Map();
          text.split('\n[Term]\n').forEach((block) => {
            const idMatch = block.match(/^id:\s+(NANDO:\d+)/m);
            if (!idMatch) return;
            const nameMatch = block.match(/^name:\s+(.+)$/m);
            const parentMatch = block.match(/^is_a:\s+(NANDO:\d+)/m);
            index.set(idMatch[1], {
              id: idMatch[1],
              name: (nameMatch?.[1] || idMatch[1]).trim(),
              parent: parentMatch?.[1] || null,
            });
          });
          return index;
        })
        .catch((error) => {
          ontologyPromise = null;
          throw error;
        });
    }

    return ontologyPromise;
  }

  function getProgramLabel(programKey) {
    if (programKey === 'designated') {
      return t('指定難病', 'Designated Intractable Diseases');
    }
    if (programKey === 'pediatric') {
      return t('小児慢性特定疾病', 'Pediatric Chronic Diseases');
    }
    return t('その他', 'Other');
  }

  function findProgramCategory(id, ontologyIndex) {
    let currentId = normalizeNandoId(id);
    const seen = new Set();

    while (currentId && !seen.has(currentId)) {
      seen.add(currentId);
      const node = ontologyIndex.get(currentId);
      if (!node) return null;
      if (node.parent === PROGRAM_ROOTS.designated) {
        return { program: 'designated', category: node };
      }
      if (node.parent === PROGRAM_ROOTS.pediatric) {
        return { program: 'pediatric', category: node };
      }
      currentId = node.parent;
    }

    return null;
  }

  function groupEntriesByProgram(entries, ontologyIndex) {
    const programs = new Map();

    entries.forEach((entry) => {
      const resolved = findProgramCategory(entry.id, ontologyIndex);
      const programKey = resolved?.program || 'uncategorized';
      const groupId = resolved?.category?.id || 'uncategorized';
      const groupLabel = resolved?.category?.name || t('その他', 'Other');

      if (!programs.has(programKey)) {
        programs.set(programKey, {
          key: programKey,
          label: getProgramLabel(programKey),
          groups: new Map(),
          entries: [],
        });
      }

      const program = programs.get(programKey);
      program.entries.push(entry);

      if (!program.groups.has(groupId)) {
        program.groups.set(groupId, {
          id: groupId,
          label: groupLabel,
          entries: [],
        });
      }

      program.groups.get(groupId).entries.push(entry);
    });

    return Array.from(programs.values())
      .map((program) => ({
        ...program,
        groups: Array.from(program.groups.values()).sort((a, b) =>
          a.label.localeCompare(b.label, isJapaneseLocale() ? 'ja' : 'en')
        ),
      }))
      .sort((a, b) => {
        const order = ['designated', 'pediatric', 'uncategorized'];
        return order.indexOf(a.key) - order.indexOf(b.key);
      });
  }

  function renderEntryCard(entry) {
    const character = getDiseaseCharacter(entry.id);
    const imageSrc = character?.asset_fallback
      ? `${escapeHtml(character.asset)}" onerror="this.onerror=null;this.src='${escapeHtml(character.asset_fallback)}`
      : (character ? escapeHtml(character.asset) : '');
    return `
      <article class="my-disease-card">
        ${character ? `
        <div class="my-disease-character">
          <img class="my-disease-character-image" src="${imageSrc}" alt="${escapeHtml(isJapaneseLocale() ? character.alt_ja : character.alt_en)}" loading="lazy" />
          <div class="my-disease-character-meta">
            <div class="my-disease-character-kicker">${escapeHtml(isJapaneseLocale() ? '疾患キャラクター' : 'Disease mascot')}</div>
            <div class="my-disease-character-name">${escapeHtml(isJapaneseLocale() ? character.name_ja : character.name_en)}</div>
          </div>
        </div>` : ''}
        <div class="my-disease-card-top">
          <div class="my-disease-card-kicker">${escapeHtml(t('登録日', 'Saved'))}</div>
          <div class="my-disease-card-date">${escapeHtml(formatSavedAt(entry.saved_at))}</div>
        </div>
        <div class="my-disease-card-id">${escapeHtml(entry.id)}</div>
        <h3>${escapeHtml(isJapaneseLocale() ? (entry.label_ja || entry.label_en || entry.id) : (entry.label_en || entry.label_ja || entry.id))}</h3>
        ${
          isJapaneseLocale() && entry.label_en
            ? `<div class="my-disease-card-subtitle">${escapeHtml(entry.label_en)}</div>`
            : ''
        }
        <div class="my-disease-card-actions">
          <a class="my-disease-action" href="/summary/${escapeHtml(entry.id)}">
            <span class="my-disease-action-label">${escapeHtml(t('サマリー', 'Summary'))}</span>
            <strong>→</strong>
          </a>
          <a class="my-disease-action" href="/disease/${escapeHtml(entry.id)}">
            <span class="my-disease-action-label">${escapeHtml(t('詳細', 'Detail'))}</span>
            <strong>→</strong>
          </a>
          <button class="my-disease-action my-disease-remove" type="button" data-remove-id="${escapeHtml(entry.id)}">
            <span class="my-disease-action-label">${escapeHtml(t('解除', 'Remove'))}</span>
            <strong>×</strong>
          </button>
        </div>
      </article>
    `;
  }

  function updateNavCount(entries) {
    const countEl = $('my-diseases-nav-count');
    if (countEl) countEl.textContent = String(entries.length);
  }

  function renderTabs(programs) {
    const tabs = $('my-diseases-tabs');
    if (!tabs) return;

    if (!programs || programs.length <= 1) {
      tabs.hidden = true;
      tabs.innerHTML = '';
      return;
    }

    tabs.hidden = false;
    tabs.innerHTML = programs
      .map(
        (program) => `
          <button
            class="my-diseases-tab ${program.key === activeProgramKey ? 'is-active' : ''}"
            type="button"
            data-program-key="${escapeHtml(program.key)}"
            aria-pressed="${program.key === activeProgramKey ? 'true' : 'false'}">
            <span>${escapeHtml(program.label)}</span>
            <span class="my-diseases-tab-count">${escapeHtml(String(program.entries.length))}</span>
          </button>
        `
      )
      .join('');

    tabs.querySelectorAll('[data-program-key]').forEach((button) => {
      button.addEventListener('click', () => {
        activeProgramKey = button.dataset.programKey;
        render(currentEntries, currentPrograms);
      });
    });
  }

  let currentEntries = [];
  let currentPrograms = null;

  function render(entries, programs = null) {
    currentEntries = entries;
    currentPrograms = programs;
    $('my-diseases-count').textContent = isJapaneseLocale()
      ? `${entries.length}件`
      : `${entries.length} items`;
    updateNavCount(entries);

    const empty = $('my-diseases-empty');
    const list = $('my-diseases-list');

    if (!entries.length) {
      renderTabs([]);
      list.innerHTML = '';
      empty.hidden = false;
      return;
    }

    empty.hidden = true;
    const availablePrograms = programs || [
      {
        key: 'all',
        label: t('すべての疾患', 'All diseases'),
        groups: [
          {
            id: 'all',
            label: t('すべての疾患', 'All diseases'),
            entries,
          },
        ],
        entries,
      },
    ];

    if (!activeProgramKey || !availablePrograms.some((program) => program.key === activeProgramKey)) {
      activeProgramKey = availablePrograms[0].key;
    }

    renderTabs(availablePrograms);
    const activeProgram = availablePrograms.find((program) => program.key === activeProgramKey) || availablePrograms[0];
    const sections = activeProgram.groups;

    list.innerHTML = sections
      .map(
        (group) => `
        <section class="my-diseases-group" data-group-id="${escapeHtml(group.id)}">
          <div class="my-diseases-group-head">
            <div>
              <h3>${escapeHtml(group.label)}</h3>
            </div>
            <div class="my-diseases-group-count">${escapeHtml(isJapaneseLocale() ? `${group.entries.length}件` : `${group.entries.length} items`)}</div>
          </div>
          <div class="my-diseases-grid">
            ${group.entries.map(renderEntryCard).join('')}
          </div>
        </section>
      `
      )
      .join('');

    list.querySelectorAll('[data-remove-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const nextEntries = loadMyDiseases().filter((entry) => entry.id !== button.dataset.removeId);
        saveMyDiseases(nextEntries);
        render(nextEntries, programs ? groupEntriesByProgram(nextEntries, currentOntologyIndex) : null);
      });
    });
  }

  let currentOntologyIndex = null;

  async function bootstrap() {
    const entries = loadMyDiseases();

    try {
      currentOntologyIndex = await fetchOntologyIndex();
      render(entries, groupEntriesByProgram(entries, currentOntologyIndex));
    } catch (error) {
      $('my-diseases-status').textContent = t(
        '制度カテゴリを取得できなかったため、保存順で表示しています。',
        'Program categories could not be loaded, so diseases are shown in saved order.'
      );
      render(entries);
    }
  }

  bootstrap();
})();
