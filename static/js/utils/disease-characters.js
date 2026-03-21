(function () {
  const baseRegistry = {
    'bone-joint': {
      category_ja: '骨・関節系疾患',
      category_en: 'Bone and joint disorders',
      series_reference: '/static/img/characters/base/tyrannosaurus.png',
      bases: {
        tyrannosaurus: {
          key: 'tyrannosaurus',
          name_ja: 'ティラノサウルス',
          name_en: 'Tyrannosaurus',
          asset: '/static/img/characters/base/tyrannosaurus.png',
          url_ja: 'https://ja.wikipedia.org/wiki/%E3%83%86%E3%82%A3%E3%83%A9%E3%83%8E%E3%82%B5%E3%82%A6%E3%83%AB%E3%82%B9',
          url_en: 'https://en.wikipedia.org/wiki/Tyrannosaurus',
        },
        triceratops: {
          key: 'triceratops',
          name_ja: 'トリケラトプス',
          name_en: 'Triceratops',
          asset: '/static/img/characters/base/triceratops.png',
          url_ja: 'https://ja.wikipedia.org/wiki/%E3%83%88%E3%83%AA%E3%82%B1%E3%83%A9%E3%83%88%E3%83%97%E3%82%B9',
          url_en: 'https://en.wikipedia.org/wiki/Triceratops',
        },
        stegosaurus: {
          key: 'stegosaurus',
          name_ja: 'ステゴサウルス',
          name_en: 'Stegosaurus',
          asset: '/static/img/characters/base/stegosaurus.png',
          url_ja: 'https://ja.wikipedia.org/wiki/%E3%82%B9%E3%83%86%E3%82%B4%E3%82%B5%E3%82%A6%E3%83%AB%E3%82%B9',
          url_en: 'https://en.wikipedia.org/wiki/Stegosaurus',
        },
        brachiosaurus: {
          key: 'brachiosaurus',
          name_ja: 'ブラキオサウルス',
          name_en: 'Brachiosaurus',
          asset: '/static/img/characters/base/brachiosaurus.png',
          url_ja: 'https://ja.wikipedia.org/wiki/%E3%83%96%E3%83%A9%E3%82%AD%E3%82%AA%E3%82%B5%E3%82%A6%E3%83%AB%E3%82%B9',
          url_en: 'https://en.wikipedia.org/wiki/Brachiosaurus',
        },
        pteranodon: {
          key: 'pteranodon',
          name_ja: 'プテラノドン',
          name_en: 'Pteranodon',
          asset: '/static/img/characters/base/pteranodon.png',
          url_ja: 'https://ja.wikipedia.org/wiki/%E3%83%97%E3%83%86%E3%83%A9%E3%83%8E%E3%83%89%E3%83%B3',
          url_en: 'https://en.wikipedia.org/wiki/Pteranodon',
        },
      },
    },
  };

  const registry = {
    'NANDO:1200656': {
      id: 'NANDO:1200656',
      theme: 'bone-dinosaur',
      base_key: 'stegosaurus',
      base_asset: '/static/img/characters/base/stegosaurus.png',
      asset: '/static/img/characters/nando-1200656-phosphategosaurus.png',
      asset_fallback: '/static/img/characters/nando-1200656-phosphategosaurus.svg',
      base_name_ja: 'ステゴサウルス',
      base_name_en: 'Stegosaurus',
      base_url_ja: 'https://ja.wikipedia.org/wiki/%E3%82%B9%E3%83%86%E3%82%B4%E3%82%B5%E3%82%A6%E3%83%AB%E3%82%B9',
      base_url_en: 'https://en.wikipedia.org/wiki/Stegosaurus',
      name_ja: 'ホスファテゴサウルス',
      name_en: 'Phosphategosaurus',
      caption_ja: 'ステゴサウルスをベースにデザイン・命名',
      caption_en: 'Designed and named from a Stegosaurus base',
      alt_ja: '低ホスファターゼ症専用の恐竜モチーフキャラクター',
      alt_en: 'A dinosaur-themed mascot created for hypophosphatasia',
    },
    'NANDO:1200877': {
      id: 'NANDO:1200877',
      theme: 'bone-dinosaur',
      base_key: 'triceratops',
      base_asset: '/static/img/characters/base/triceratops.png',
      asset: '/static/img/characters/nando-1200877-achondrotops.png',
      base_name_ja: 'トリケラトプス',
      base_name_en: 'Triceratops',
      base_url_ja: 'https://ja.wikipedia.org/wiki/%E3%83%88%E3%83%AA%E3%82%B1%E3%83%A9%E3%83%88%E3%83%97%E3%82%B9',
      base_url_en: 'https://en.wikipedia.org/wiki/Triceratops',
      name_ja: 'アコンドロトプス',
      name_en: 'Achondrotops',
      caption_ja: 'トリケラトプスをベースにデザイン・命名',
      caption_en: 'Designed and named from a Triceratops base',
      alt_ja: '軟骨無形成症専用の恐竜モチーフキャラクター',
      alt_en: 'A dinosaur-themed mascot created for achondroplasia',
    },
  };

  function normalizeNandoId(raw) {
    const trimmed = String(raw || '').trim().toUpperCase();
    if (!trimmed) return '';
    return trimmed.startsWith('NANDO:') ? trimmed : `NANDO:${trimmed}`;
  }

  function getCharacter(rawId) {
    return registry[normalizeNandoId(rawId)] || null;
  }

  window.NanbyoDataDiseaseCharacters = {
    bases: baseRegistry,
    all: registry,
    get: getCharacter,
    normalizeId: normalizeNandoId,
  };
})();
