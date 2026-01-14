// Epidemiology
// 指定難病
export const designatedIntractableDiseaseJaColumns = [
  { id: 'nando', label: 'NANDO ID' },
  { id: 'label', label: '疾患名', link: 's', target: '_blank' },
  { id: 'number', label: '告知番号', align: 'center' },
  { id: 'num_of_2015', label: '2015年', type: 'number' },
  { id: 'num_of_2016', label: '2016年', type: 'number' },
  { id: 'num_of_2017', label: '2017年', type: 'number' },
  { id: 'num_of_2018', label: '2018年', type: 'number' },
  { id: 'num_of_2019', label: '2019年', type: 'number' },
  { id: 'num_of_2020', label: '2020年', type: 'number' },
  { id: 'num_of_2021', label: '2021年', type: 'number' },
  { id: 'num_of_2022', label: '2022年', type: 'number' },
  { id: 'num_of_2023', label: '2023年', type: 'number' },
];

export const designatedIntractableDiseaseEnColumns = [
  { id: 'nando', label: 'NANDO ID' },
  { id: 'label_en', label: 'Disease name', link: 's', target: '_blank' },
  { id: 'number', label: 'Notification number', align: 'center' },
  { id: 'num_of_2015', label: '2015', type: 'number' },
  { id: 'num_of_2016', label: '2016', type: 'number' },
  { id: 'num_of_2017', label: '2017', type: 'number' },
  { id: 'num_of_2018', label: '2018', type: 'number' },
  { id: 'num_of_2019', label: '2019', type: 'number' },
  { id: 'num_of_2020', label: '2020', type: 'number' },
  { id: 'num_of_2021', label: '2021', type: 'number' },
  { id: 'num_of_2022', label: '2022', type: 'number' },
  { id: 'num_of_2023', label: '2023', type: 'number' },
];

// 小児慢性
export const pediatricChronicSpecificDiseaseJaColumns = [
  { id: 'nando', label: 'NANDO ID' },
  { id: 'label', label: '疾患名', link: 's', target: '_blank' },
  { id: 'number', label: '告知番号', align: 'center' },
  { id: 'num_of_2015', label: '2015年', type: 'number' },
  { id: 'num_of_2016', label: '2016年', type: 'number' },
  { id: 'num_of_2017', label: '2017年', type: 'number' },
  { id: 'num_of_2018', label: '2018年', type: 'number' },
];

export const pediatricChronicSpecificDiseaseEnColumns = [
  { id: 'nando', label: 'NANDO ID' },
  { id: 'label_en', label: 'Disease name', link: 's', target: '_blank' },
  { id: 'number', label: 'Notification number', align: 'center' },
  { id: 'num_of_2015', label: '2015', type: 'number' },
  { id: 'num_of_2016', label: '2016', type: 'number' },
  { id: 'num_of_2017', label: '2017', type: 'number' },
  { id: 'num_of_2018', label: '2018', type: 'number' },
];

// References
export const referencesColumns = [
  { id: 'pmid', label: 'PMID', link: 'url', target: '_blank' },
  { id: 'title', label: 'Title' },
  { id: 'magazine', label: 'Journal' },
  { id: 'date', label: 'Date', type: 'date' },
];

// Disease
export const geneColumns = [
  {
    id: 'gene_symbol',
    label: 'Gene symbol',
    link: 'omim_url',
    target: '_blank',
    rowspan: true,
  },
  {
    id: 'ncbi_id',
    label: 'NCBI gene ID',
    link: 'ncbi_url',
    target: '_blank',
    rowspan: true,
  },
  {
    id: 'nando_id',
    label: 'NANDO ID',
    link: 'nando',
    target: '_blank',
  },
  {
    id: 'nando_label_en',
    label: 'NANDO label (EN)',
    lineClamp: 1,
  },
  {
    id: 'nando_label_ja',
    label: 'NANDO label (JA)',
    lineClamp: 1,
  },
  {
    id: 'mondo_id',
    label: 'Bridge ID',
    link: 'mondo_url',
    target: '_blank',
  },
  {
    id: 'mondo_label',
    label: 'Mondo label (EN)',
    lineClamp: 1,
  },
  {
    id: 'mondo_label_ja',
    label: 'Mondo label (JA)',
    lineClamp: 1,
  },
  { id: 'source', label: 'Source' },
];

export const glycanRelatedGeneColumns = [
  {
    id: 'genesymbol',
    label: 'Glycan related gene (GlyCosmos)',
    link: 'glycosmosgene',
    rowspan: true,
  },
  {
    id: 'ncbigene_description',
    label: 'Full name (NCBI gene)',
    link: 'ncbi_url',
    rowspan: true,
  },
  {
    id: 'go_term_mf',
    label: 'GO term (molecular function)',
    link: 'go',
  },
  {
    id: 'pmid_num',
    label: 'References',
    link: 'pmid_link',
  },
];

export const referenceGeneColumns = [
  {
    id: 'symbol',
    label: 'Gene symbol',
    link: 'hgnc',
    target: '_blank',
  },
  {
    id: 'ncbi_id',
    label: 'NCBI gene ID',
    link: 'ncbi',
    target: '_blank',
  },
  {
    id: 'hgnc_id',
    label: 'HGNC ID',
    link: 'hgnc',
    target: '_blank',
  },
  {
    id: 'gene_name',
    label: 'Gene name',
  },
  {
    id: 'gene_description',
    label: 'Description',
    lineClamp: 2,
  },
];

export const geneticTestingColumns = [
  { id: 'label', label: 'Test name' },
  { id: 'hp', label: 'More information', link: 'hp', target: '_blank' },
  { id: 'gene', label: 'Gene name' },
  { id: 'facility', label: 'Test facility' },
];

export const phenotypesJaColumns = [
  { id: 'hpo_label_ja', label: 'Symptom (JA)', rowspan: true },
  { id: 'hpo_label_en', label: 'Symptom (EN)', rowspan: true },
  {
    id: 'hpo_id',
    label: 'HPO ID',
    link: 'hpo_url',
    target: '_blank',
    rowspan: true,
  },
  {
    id: 'hpo_category_name_en',
    label: 'Symptom category',
    link: 'hpo_category',
    target: '_blank',
  },
];

export const phenotypesEnColumns = [
  { id: 'hpo_label_en', label: 'Symptom', rowspan: true },
  {
    id: 'hpo_id',
    label: 'HPO ID',
    link: 'hpo_url',
    target: '_blank',
    rowspan: true,
  },
  {
    id: 'hpo_category_name_en',
    label: 'Symptom category',
    link: 'hpo_category',
    target: '_blank',
  },
];

export const humanGenomicDatasetsJaColumns = [
  {
    id: 'hum_id',
    label: 'Hum ID',
    link: 'hum_uri',
    target: '_blank',
    rowspan: true,
  },
  { id: 'label_ja', label: '研究題目' },
  { id: 'type_study_ja', label: 'データの種類' },
  { id: 'type_data_ja', label: 'アクセス制限' },
];

export const humanGenomicDatasetsEnColumns = [
  {
    id: 'hum_id',
    label: 'Hum ID',
    link: 'hum_uri',
    target: '_blank',
    rowspan: true,
  },
  { id: 'label_en', label: 'Study Title' },
  { id: 'type_study_en', label: 'Type of Study' },
  { id: 'type_data_en', label: 'Type of Data' },
];

export const bioResourceCellColumns = [
  { id: 'ID', label: 'Cell No.', link: 'Homepage', target: '_blank' },
  { id: 'Cell_name', label: 'Cell name' },
  { id: 'Description_e', label: 'Description (EN)' },
  { id: 'Description_j', label: 'Description (JA)' },
];

export const bioResourceMouseJaColumns = [
  {
    id: 'mouse_id',
    label: 'RIKEN_BRC No.',
    link: 'hp',
    target: '_blank',
    rowspan: true,
  },
  { id: 'mouse_name', label: 'Strain name', rowspan: true },
  { id: 'description', label: 'Strain description', rowspan: true },
  { id: 'label_ja', label: '表現型', link: 'mp', target: '_blank' },
];

export const bioResourceMouseEnColumns = [
  {
    id: 'mouse_id',
    label: 'RIKEN_BRC No.',
    link: 'hp',
    target: '_blank',
    rowspan: true,
  },
  { id: 'mouse_name', label: 'Strain name', rowspan: true },
  { id: 'description', label: 'Strain description', rowspan: true },
  { id: 'label_en', label: 'Phenotype', link: 'mp', target: '_blank' },
];

export const bioResourceDnaColumns = [
  { id: 'gene_id', label: 'Catalog number', link: 'hp', target: '_blank' },
  { id: 'gene_label', label: 'Name' },
  {
    id: 'ncbi_gene_id',
    label: 'NCBI gene ID',
    link: 'ncbi_gene',
    target: '_blank',
  },
];

export const variantClinvarColumns = [
  {
    id: 'Clinvar_id',
    label: 'Clinvar_ID',
    link: 'Clinvar_link',
    target: '_blank',
  },
  { id: 'title', label: 'HGVS' },
  { id: 'Interpretation', label: 'Interpretation' },
  { id: 'type', label: 'Variant type' },
  { id: 'position', label: 'Chr:Position' },
  { id: 'tgv_id', label: 'TogoVar_ID', link: 'tgv_link', target: '_blank' },
  {
    id: 'MedGen_id',
    label: 'MedGen_ID',
    link: 'MedGen_link',
    target: '_blank',
  },
  { id: 'mondo_id', label: 'MONDO_ID', link: 'mondo', target: '_blank' },
];

export const variantMgendColumns = [
  { id: 'hgvs', label: 'HGVS' },
  { id: 'significance', label: 'Interpretation' },
  { id: 'vtype', label: 'Variant type' },
  { id: 'ch', label: 'Chr' },
  { id: 'position', label: 'Position' },
  { id: 'genelabel', label: 'Gene_symbol' },
  { id: 'hgncID', label: 'HGNC ID', link: 'hgncurl', target: '_blank' },
  { id: 'omim_id', label: 'OMIM ID', link: 'omim_url', target: '_blank' },
  { id: 'mondo_label', label: 'MONDO', link: 'mondo_url', target: '_blank' },
];

export const facialFeaturesColumns = [
  {
    id: 'id',
    label: 'Patient ID',
    link: 'person',
    target: '_blank',
    rowspan: true,
  },
  { id: 'gender', label: 'Gender' },
  {
    id: 'gene',
    label: 'Gene symbol',
    link: 'ncbi',
    target: '_blank',
  },
  { id: 'minzoku', label: 'Ethnicity' },
  { id: 'minzokumemo', label: 'Ethnicity note' },
  { id: 'image_id', label: 'Image ID' },
  { id: 'image_desc', label: 'Type' },
  { id: 'age_year', label: 'Age (at photo)' },
  { id: 'age_month', label: 'Month (at photo)' },
  { id: 'age_memo', label: 'Age note (at photo)' },
  {
    id: 'pmid',
    label: 'PMID',
    rowspan: true,
    link: 'pmid_url',
    target: '_blank',
  },
];

export const compoundsColumns = [
  {
    id: 'id',
    label: 'Compound CID',
    link: 'id_url',
    target: '_blank',
    rowspan: true,
  },
  { id: 'label', label: 'Chemical Name', rowspan: true },
  {
    id: 'title',
    label: 'Reference Title',
    link: 'ref_url',
    target: '_blank',
  },
];

// Overview Sub-classes
export const subclassTableJaColumns = [
  {
    id: 'id',
    label: 'NANDO ID',
    escape: true,
    'line-clamp': 1,
    link: 'idurl',
    target: '_blank',
  },
  {
    id: 'label',
    label: 'Label(JA)',
    escape: false,
    'line-clamp': 2,
  },
  {
    id: 'engLabel',
    label: 'Label(EN)',
    escape: false,
    'line-clamp': 2,
  },
  {
    id: 'parent',
    label: 'Parent ID',
    escape: true,
    'line-clamp': 1,
    link: 'uparent',
    target: '_blank',
  },
];

export const subclassTableEnColumns = [
  {
    id: 'id',
    label: 'NANDO ID',
    escape: true,
    'line-clamp': 1,
    link: 'idurl',
    target: '_blank',
  },
  {
    id: 'engLabel',
    label: 'Label(EN)',
    escape: false,
    'line-clamp': 2,
  },
  {
    id: 'parent',
    label: 'Parent ID',
    escape: true,
    'line-clamp': 1,
    link: 'uparent',
    target: '_blank',
  },
];

// only use download
export const numOfPatientsColumns = [
  { id: 'year', label: 'Year' },
  { id: 'num_of_patients', label: '# of certificate holders' },
];

// Functions
/**
 * Convert column to text formats.
 * @param {Object[]} columns - Columns for togostanza-pagination-table.
 * @returns {string}
 */
export function convertColumnToText(columns) {
  return JSON.stringify(columns).replace(/"/g, '&quot;');
}
