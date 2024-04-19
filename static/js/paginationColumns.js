// Epidemiology
export const epidemiologyColumns = [
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
];

// Disease
export const causalGeneColumns = [
  {
    id: 'gene_symbol',
    label: 'Gene symbol',
    link: 'omim_url',
    target: '_blank',
  },
  { id: 'ncbi_id', label: 'NCBI gene ID', link: 'ncbi_url', target: '_blank' },
  {
    id: 'nando_label_e',
    label: 'NANDO disease label',
    link: 'nando_ida',
    target: '_blank',
  },
  {
    id: 'mondo_label',
    label: 'Mondo disease label',
    link: 'mondo_url',
    target: '_blank',
  },
];

export const geneticTestingColumns = [
  { id: 'label', label: 'Test name' },
  { id: 'hp', label: 'More information', link: 'hp', target: '_blank' },
  { id: 'gene', label: 'Gene name' },
  { id: 'facility', label: 'Test facility' },
];

export const phenotypesJaColumns = [
  { id: 'hpo_label_ja', label: 'Symptom (JA)' },
  { id: 'hpo_label_en', label: 'Symptom (EN)' },
  { id: 'hpo_id', label: 'HPO ID', link: 'hpo_url', target: '_blank' },
  {
    id: 'hpo_category_name_en',
    label: 'Symptom category',
    link: 'hpo_category',
    target: '_blank',
  },
];

export const phenotypesEnColumns = [
  { id: 'hpo_label_en', label: 'Symptom' },
  { id: 'hpo_id', label: 'HPO ID', link: 'hpo_url', target: '_blank' },
  {
    id: 'hpo_category_name_en',
    label: 'Symptom category',
    link: 'hpo_category',
    target: '_blank',
  },
];

export const bioResourceCellColumns = [
  { id: 'ID', label: 'Cell No.' },
  { id: 'Cell_name', label: 'Cell name' },
  { id: 'Homepage', label: 'Homepage', link: 'Homepage', target: '_blank' },
  { id: 'Description_e', label: 'Description (EN)' },
  { id: 'Description_j', label: 'Description (JA)' },
];

export const bioResourceMouseColumns = [
  { id: 'mouse_id', label: 'RIKEN_BRC No.' },
  { id: 'hp', label: 'Homepage', link: 'hp', target: '_blank' },
  { id: 'mouse_name', label: 'Strain name' },
  { id: 'description', label: 'Strain description' },
];

export const bioResourceDnaColumns = [
  { id: 'gene_id', label: 'Catalog number' },
  { id: 'hp', label: 'Homepage', link: 'hp', target: '_blank' },
  { id: 'gene_label', label: 'Name' },
  {
    id: 'ncbi_gene',
    label: 'NCBI gene link',
    link: 'ncbi_gene',
    target: '_blank',
  },
];

export const variantClinvarColumns = [
  {
    id: 'Clinvar_id',
    label: 'Clinvar_ID',
    link: 'Clinvar_link',
    target: '_bkank',
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
    target: '_bkank',
  },
  { id: 'mondo_id', label: 'MONDO_ID', link: 'mondo', target: '_bkank' },
];


// Functions
/**
 * Convert column to text formats.
 * @param {Object[]} columns - Columns for togostanza-pagination-table.
 * @returns {string}
 */
export function convertColumntoText(columns) {
  return JSON.stringify(columns).replace(/"/g, '&quot;');
}