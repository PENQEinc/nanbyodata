export function makeReferenceGenes(entryData, retryCount = 0) {
  const referenceGene = document.querySelector('.reference-gene');
  const referenceGeneSubTitle = document.querySelector(
    '.sub-title.-reference-gene'
  );
  const overviewSection = referenceGeneSubTitle?.closest('.overview-section');

  // DOM要素が見つからない場合でデータがある場合、少し待ってリトライ（最大5回）
  if (!referenceGene && retryCount < 5) {
    setTimeout(() => {
      makeReferenceGenes(entryData, retryCount + 1);
    }, 200);
    return;
  }

  // DOM要素が見つからない場合
  if (!referenceGene || !overviewSection) {
    console.error(
      'Cannot process: referenceGene element not found after retries'
    );
    return;
  }

  // データの有効性をチェック（test_reference_geneからの配列データを期待）
  const hasValidData = Array.isArray(entryData) && entryData.length > 0;

  if (hasValidData) {
    appendLinks(entryData, referenceGene);
  } else {
    overviewSection.remove();
  }
}

function createLinkElement(url, text) {
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.textContent = text;
  return a;
}

function appendLinks(data, container, prefix = '') {
  if (!container) {
    console.error('Container element not found');
    return;
  }

  if (data && data.length) {
    container.innerHTML = '';

    data.forEach((item, index) => {
      const dd = document.createElement('dd');
      const currentLang =
        document.querySelector('.language-select')?.value || 'ja';
      let a;

      // test_reference_geneからのデータ構造の場合
      if (item.symbol && item.hgnc) {
        // HGNCのみを使用
        const url = item.hgnc;
        a = createLinkElement(url, prefix + item.symbol);
        // gene_nameがある場合はツールチップとして追加
        if (item.gene_name) {
          a.title = item.gene_name;
        }
      } else if (item.id || item.id_en) {
        if (currentLang === 'en' && item.id_en) {
          a = createLinkElement(item.url || item.uri, prefix + item.id_en);
        } else {
          a = createLinkElement(item.url || item.uri, prefix + item.id);
        }
      }
      // データが不完全な場合はスキップ
      else {
        return;
      }

      dd.classList.add('linked-item');
      dd.append(a);
      container.append(dd);

      if (index < data.length - 1) {
        const space = document.createTextNode(' ');
        container.append(space);
      }
    });
  } else {
    // データがない場合はコンテナを削除
    container.remove();
  }
}
