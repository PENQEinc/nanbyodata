// Overview LinkedItems
export const linkedListJaColumns = [
  {
    class: 'omim',
    labels: [
      {
        label: 'OMIM ID',
        content: 'displayid',
        type: 'url',
        hrefKey: 'original_disease',
        rowspan: true,
      },
      {
        label: 'Bridge ID',
        content: 'parent',
        type: 'url',
        hrefKey: 'mondolink',
        rowspan: true,
      },
      {
        label: 'Mondo label (JA)',
        content: 'mondo_label_ja2',
        rowspan: true,
      },
      {
        label: 'Mondo label (EN)',
        content: 'mondo_label_en2',
        rowspan: true,
      },
      { label: 'Match type', content: 'property', rowspan: true },
    ],
    keys: [
      'displayid',
      'parent',
      'mondo_label_ja2',
      'mondo_label_en2',
      'property',
    ],
  },
  {
    class: 'orphanet',
    labels: [
      {
        label: 'Orphanet ID',
        content: 'displayid',
        type: 'url',
        hrefKey: 'original_disease',
        rowspan: true,
      },
      {
        label: 'Bridge ID',
        content: 'parent',
        type: 'url',
        hrefKey: 'mondolinki',
        rowspan: true,
      },
      {
        label: 'Mondo label (JA)',
        content: 'mondo_label_ja2',
        rowspan: true,
      },
      {
        label: 'Mondo label (EN)',
        content: 'mondo_label_en2',
        rowspan: true,
      },
      { label: 'Match type', content: 'property', rowspan: true },
    ],
    keys: [
      'displayid',
      'parent',
      'mondo_label_ja2',
      'mondo_label_en2',
      'property',
    ],
  },
  {
    class: 'monarch-initiative',
    labels: [
      {
        label: 'Mondo ID',
        content: 'displayid',
        type: 'url',
        hrefKey: 'mondo_url',
        rowspan: true,
      },
      {
        label: 'Mondo label (JA)',
        content: 'mondo_label_ja',
        rowspan: true,
      },
      {
        label: 'Mondo label (EN)',
        content: 'mondo_label_en',
        rowspan: true,
      },
      { label: 'Match type', content: 'property', rowspan: true },
    ],
    keys: ['displayid', 'mondo_label_ja', 'mondo_label_en', 'property'],
  },
  {
    class: 'medgen',
    labels: [
      {
        label: 'MedGen CID',
        content: 'displayid',
        type: 'url',
        hrefKey: 'original_disease',
        rowspan: true,
      },
      {
        label: 'Bridge ID',
        content: 'parent',
        type: 'url',
        hrefKey: 'mondolink',
        rowspan: true,
      },
      {
        label: 'Mondo label (JA)',
        content: 'mondo_label_ja2',
        rowspan: true,
      },
      {
        label: 'Mondo label (EN)',
        content: 'medgen_label',
        rowspan: true,
      },
      { label: 'Match type', content: 'property', rowspan: true },
    ],
    keys: [
      'displayid',
      'parent',
      'mondo_label_ja2',
      'medgen_label',
      'property',
    ],
  },
  {
    class: 'kegg',
    labels: [
      {
        label: 'KEGG ID',
        content: 'displayid',
        type: 'url',
        hrefKey: 'kegg_url',
        rowspan: true,
      },
      {
        label: 'KEGG label (JA)',
        content: 'kegg_label_ja',
        rowspan: true,
      },
      {
        label: 'KEGG label (EN)',
        content: 'kegg_label_en',
        rowspan: true,
      },
      { label: 'Match type', content: 'property', rowspan: true },
    ],
    keys: ['displayid', 'kegg_label_ja', 'kegg_label_en', 'property'],
  },
];

export const linkedListEnColumns = [
  {
    class: 'omim',
    labels: [
      {
        label: 'OMIM ID',
        content: 'displayid',
        type: 'url',
        hrefKey: 'original_disease',
        rowspan: true,
      },
      {
        label: 'Bridge ID',
        content: 'parent',
        type: 'url',
        hrefKey: 'mondo_url',
        rowspan: true,
      },
      {
        label: 'Mondo label (EN)',
        content: 'mondo_label_en2',
        rowspan: true,
      },
      { label: 'Match type', content: 'property', rowspan: true },
    ],
    keys: ['displayid', 'parent', 'mondo_label_en2', 'property'],
  },
  {
    class: 'orphanet',
    labels: [
      {
        label: 'Orphanet ID',
        content: 'displayid',
        type: 'url',
        hrefKey: 'original_disease',
        rowspan: true,
      },
      {
        label: 'Bridge ID',
        content: 'parent',
        type: 'url',
        hrefKey: 'mondolinki',
        rowspan: true,
      },
      {
        label: 'Mondo label (EN)',
        content: 'mondo_label_en2',
        rowspan: true,
      },
      { label: 'Match type', content: 'property', rowspan: true },
    ],
    keys: ['displayid', 'parent', 'mondo_label_en2', 'property'],
  },
  {
    class: 'monarch-initiative',
    labels: [
      {
        label: 'Mondo ID',
        content: 'displayid',
        type: 'url',
        hrefKey: 'mondo_url',
        rowspan: true,
      },
      {
        label: 'Mondo label (EN)',
        content: 'mondo_label_en',
        rowspan: true,
      },
      { label: 'Match type', content: 'property', rowspan: true },
    ],
    keys: ['displayid', 'mondo_label_en', 'property'],
  },
  {
    class: 'medgen',
    labels: [
      {
        label: 'MedGen CID',
        content: 'displayid',
        type: 'url',
        hrefKey: 'original_disease',
        rowspan: true,
      },
      {
        label: 'Bridge ID',
        content: 'parent',
        type: 'url',
        hrefKey: 'mondolink',
        rowspan: true,
      },
      {
        label: 'Mondo label (EN)',
        content: 'medgen_label',
        rowspan: true,
      },
      { label: 'Match type', content: 'property', rowspan: true },
    ],
    keys: ['displayid', 'parent', 'medgen_label', 'property'],
  },
  {
    class: 'kegg',
    labels: [
      {
        label: 'KEGG ID',
        content: 'displayid',
        type: 'url',
        hrefKey: 'kegg_url',
        rowspan: true,
      },
      {
        label: 'KEGG label (EN)',
        content: 'kegg_label_en',
        rowspan: true,
      },
      { label: 'Match Type', content: 'property', rowspan: true },
    ],
    keys: ['displayid', 'kegg_label_en', 'property'],
  },
];
