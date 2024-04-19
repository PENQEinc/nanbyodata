# [PCF] Get GENE data by NCBI GENE ID - https://pubcasefinder-rdf.dbcls.jp/sparql
## Parameters
* `ncbi_gene_id` NCBI GENE ID (複数のIDを入力可能)
  * default: GENEID:1723, GENEID:9723, GENEID:4038
  * example: 1723, 9723, 55636, 157570, 10262, 2260, 4038, 5144, 9469, 324
* `mode` (パラメータに"download"を入力すると全件取得可能)
	* example: download

## Endpoint
https://pubcasefinder-rdf.dbcls.jp/sparql

## `ncbi_gene_id_list`
```javascript
({ncbi_gene_id}) => {
  ncbi_gene_id = ncbi_gene_id.replace(/GENEID:/g,"")
  ncbi_gene_id = 'ncbigene:' + ncbi_gene_id.replace(/[\s,]+/g," ncbigene:")
  return ncbi_gene_id;
}
```

## `result` 
```sparql
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX nando: <http://nanbyodata.jp/ontology/nando#>
PREFIX ncbigene: <http://identifiers.org/ncbigene/>
PREFIX ncit: <http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl#>
PREFIX mim: <http://identifiers.org/mim/>
PREFIX mondo: <http://purl.obolibrary.org/obo/>
PREFIX oa: <http://www.w3.org/ns/oa#>
PREFIX obo: <http://purl.obolibrary.org/obo/>
PREFIX sio: <http://semanticscience.org/resource/>
PREFIX nuc: <http://ddbj.nig.ac.jp/ontologies/nucleotide/>
PREFIX hop: <http://purl.org/net/orthordf/hOP/ontology#>

SELECT DISTINCT
str(?ncbi_gene_url) as ?ncbi_gene_url
CONCAT('GENEID:', STR(?ncbi_gene_id)) as ?ncbi_gene_id
CONCAT('HGNC:', STR(?hgnc_gene_id)) as ?hgnc_gene_id
STR(?hgnc_gene_url) as ?hgnc_gene_url
STR(?hgnc_gene_symbol) as ?hgnc_gene_symbol
str(?ncbi_gene_summary) as ?ncbi_gene_summary
str(?full_name) as ?full_name
str(?synonym) as ?synonym
STR(?inheritance_en) as ?inheritance_en
STR(?inheritance_ja) as ?inheritance_ja
STR(?mondo_id) as ?mondo_id
STR(?mondo_url) as ?mondo_url
STR(?mondo_disease_name_en) as ?mondo_disease_name_en
STR(?mondo_disease_name_ja) as ?mondo_disease_name_ja
STR(?disease_url) as ?disease_url
STR(?disease_id) as ?disease_id

WHERE {
  {{#unless mode}}
    {{#if ncbi_gene_id_list}}
      VALUES ?ncbi_gene_url { {{ncbi_gene_id_list}} }
    {{/if}}
  {{/unless}}
      ?as rdf:type sio:SIO_000983 ;
          sio:SIO_000628 ?ncbi_gene_url ;
          sio:SIO_000628 ?disease_url .
      ?ncbi_gene_url rdf:type ncit:C16612 ;
                     dcterms:identifier ?ncbi_gene_id ;
                     sio:SIO_000205 ?hgnc_gene_url .
      OPTIONAL { ?ncbi_gene_url dcterms:description ?full_name . }
      OPTIONAL { ?ncbi_gene_url nuc:gene_synonym ?synonym . }
      OPTIONAL { ?ncbi_gene_url obo:NCIT_C42581 ?ncbi_gene_summary . }
      
      ?hgnc_gene_url rdfs:label ?hgnc_gene_symbol .
      ?disease_url rdf:type ncit:C7057 ;
                   dcterms:identifier ?disease_id ;
                   rdfs:seeAlso ?mondo_url .
      
      ?mondo_url rdfs:label ?mondo_disease_name_en ;
                 <http://www.geneontology.org/formats/oboInOwl#id> ?mondo_id . 
      
      OPTIONAL { ?disease_url nando:hasInheritance ?inheritance . ?inheritance rdfs:label ?inheritance_en, ?inheritance_ja . FILTER (lang(?inheritance_en) = "en") . FILTER (lang(?inheritance_ja) = "ja") . }
      OPTIONAL { ?disease_url rdfs:label ?mondo_disease_name_ja FILTER (lang(?mondo_disease_name_ja) = "ja") }

      BIND (replace(str(?hgnc_gene_url), 'https://www.genenames.org/data/gene-symbol-report/#!/hgnc_id/HGNC:', '') AS ?hgnc_gene_id)
      
      ?mondo_url rdfs:subClassOf* mondo:MONDO_0000001 .
      
} order by ?ncbi_gene_id
```

## Output
```javascript
({result})=>{ 
  
  var dic = {}
  var rows = result.results.bindings;
  
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].ncbi_gene_id.value in dic)
    {
      if (rows[i].hgnc_gene_id) { 
        dic[rows[i].ncbi_gene_id.value].hgnc_gene_id = rows[i].hgnc_gene_id.value;
      }
      if (rows[i].hgnc_gene_url) { 
        dic[rows[i].ncbi_gene_id.value].hgnc_gene_url = rows[i].hgnc_gene_url.value;
      }
      if (rows[i].hgnc_gene_symbol) { 
        dic[rows[i].ncbi_gene_id.value].hgnc_gene_symbol = rows[i].hgnc_gene_symbol.value;
      }
      if (rows[i].full_name) { 
        dic[rows[i].ncbi_gene_id.value].full_name = rows[i].full_name.value;
      }
      if (rows[i].ncbi_gene_summary) { 
        dic[rows[i].ncbi_gene_id.value].ncbi_gene_summary = rows[i].ncbi_gene_summary.value;
      }
      if (rows[i].synonym) { 
        if (dic[rows[i].ncbi_gene_id.value].inheritance_en)
          dic[rows[i].ncbi_gene_id.value].synonym.add(rows[i].synonym.value);
        else
        {
          dic[rows[i].ncbi_gene_id.value].synonym = new Set();  
          dic[rows[i].ncbi_gene_id.value].synonym.add(rows[i].synonym.value);
        }
      }
      if (rows[i].inheritance_en) { 
        if (dic[rows[i].ncbi_gene_id.value].inheritance_en)
          dic[rows[i].ncbi_gene_id.value].inheritance_en.add(rows[i].inheritance_en.value);
        else
        {
          dic[rows[i].ncbi_gene_id.value].inheritance_en = new Set();
          dic[rows[i].ncbi_gene_id.value].inheritance_en.add(rows[i].inheritance_en.value);
        }
      }
      if (rows[i].inheritance_ja) { 
        if (dic[rows[i].ncbi_gene_id.value].inheritance_ja)
          dic[rows[i].ncbi_gene_id.value].inheritance_ja.add(rows[i].inheritance_ja.value);
        else
        {
          dic[rows[i].ncbi_gene_id.value].inheritance_ja = new Set();
          dic[rows[i].ncbi_gene_id.value].inheritance_ja.add(rows[i].inheritance_ja.value);
        }
      }
      if (rows[i].mondo_id) { 
        dic[rows[i].ncbi_gene_id.value].mondo_id.add(rows[i].mondo_id.value);
      }
      if (rows[i].mondo_url) { 
        dic[rows[i].ncbi_gene_id.value].mondo_url.add(rows[i].mondo_url.value);
      }
      if (rows[i].mondo_disease_name_en) { 
        if (dic[rows[i].ncbi_gene_id.value].mondo_disease_name_en)
	        dic[rows[i].ncbi_gene_id.value].mondo_disease_name_en.add(dic[rows[i].ncbi_gene_id.value].mondo_disease_name_en[rows[i].mondo_id.value] = rows[i].mondo_disease_name_en.value);
        else
        {
          dic[rows[i].ncbi_gene_id.value].mondo_disease_name_en = new Set();
          dic[rows[i].ncbi_gene_id.value].mondo_disease_name_en.add(dic[rows[i].ncbi_gene_id.value].mondo_disease_name_en[rows[i].mondo_id.value] = rows[i].mondo_disease_name_en.value);
        }
      }
      if (rows[i].mondo_disease_name_ja) { 
        if (dic[rows[i].ncbi_gene_id.value].mondo_disease_name_ja)
          dic[rows[i].ncbi_gene_id.value].mondo_disease_name_ja.add(dic[rows[i].ncbi_gene_id.value].mondo_disease_name_ja[rows[i].mondo_id.value] = rows[i].mondo_disease_name_ja.value);
        else
        {
          dic[rows[i].ncbi_gene_id.value].mondo_disease_name_ja = new Set();
          dic[rows[i].ncbi_gene_id.value].mondo_disease_name_ja.add(dic[rows[i].ncbi_gene_id.value].mondo_disease_name_ja[rows[i].mondo_id.value] = rows[i].mondo_disease_name_ja.value);
        }
      }
      if (rows[i].disease_url) {
        if (rows[i].disease_url.value.includes("mim"))
        //if (rows[i].disease_url.value.match("mim"))
        {
          dic[rows[i].ncbi_gene_id.value].mondo_id_to_omim_id.add(
            dic[rows[i].ncbi_gene_id.value].mondo_id_to_omim_id[rows[i].mondo_id.value] = 'OMIM:' + rows[i].disease_id.value
          );
        }
        if (rows[i].disease_url.value.includes("ORDO"))
        //if (rows[i].disease_url.value.match("ORDO"))
        {
          dic[rows[i].ncbi_gene_id.value].mondo_id_to_orpha_id.add(
            dic[rows[i].ncbi_gene_id.value].mondo_id_to_orpha_id[rows[i].mondo_id.value] = 'ORPHA:' + rows[i].disease_id.value
          );
        }
      }
    }
    else
    {
      dic[rows[i].ncbi_gene_id.value] = {};
     
      if (rows[i].hgnc_gene_id) { 
        dic[rows[i].ncbi_gene_id.value].hgnc_gene_id = rows[i].hgnc_gene_id.value;
      }
      if (rows[i].hgnc_gene_url) { 
        dic[rows[i].ncbi_gene_id.value].hgnc_gene_url = rows[i].hgnc_gene_url.value;
      }
      if (rows[i].hgnc_gene_symbol) { 
        dic[rows[i].ncbi_gene_id.value].hgnc_gene_symbol = rows[i].hgnc_gene_symbol.value;
      }
      if (rows[i].full_name) { 
        dic[rows[i].ncbi_gene_id.value].full_name = rows[i].full_name.value;
      }
      if (rows[i].ncbi_gene_summary) { 
        dic[rows[i].ncbi_gene_id.value].ncbi_gene_summary = rows[i].ncbi_gene_summary.value;
      }
      if (rows[i].synonym) { 
        dic[rows[i].ncbi_gene_id.value].synonym = new Set();  
        dic[rows[i].ncbi_gene_id.value].synonym.add(rows[i].synonym.value);
      }
      if (rows[i].inheritance_en) { 
        dic[rows[i].ncbi_gene_id.value].inheritance_en = new Set();  
        dic[rows[i].ncbi_gene_id.value].inheritance_en.add(rows[i].inheritance_en.value);
      }
      if (rows[i].inheritance_ja) { 
        dic[rows[i].ncbi_gene_id.value].inheritance_ja = new Set();  
        dic[rows[i].ncbi_gene_id.value].inheritance_ja.add(rows[i].inheritance_ja.value);
      }
      if (rows[i].mondo_id) { 
        dic[rows[i].ncbi_gene_id.value].mondo_id = new Set();
        dic[rows[i].ncbi_gene_id.value].mondo_id.add(rows[i].mondo_id.value);
      }
      if (rows[i].mondo_url) { 
        dic[rows[i].ncbi_gene_id.value].mondo_url = new Set();
        dic[rows[i].ncbi_gene_id.value].mondo_url.add(rows[i].mondo_url.value);
      }
      if (rows[i].mondo_disease_name_en) { 
        dic[rows[i].ncbi_gene_id.value].mondo_disease_name_en = new Set();
        dic[rows[i].ncbi_gene_id.value].mondo_disease_name_en.add(dic[rows[i].ncbi_gene_id.value].mondo_disease_name_en[rows[i].mondo_id.value] = rows[i].mondo_disease_name_en.value);
      }
      if (rows[i].mondo_disease_name_ja) { 
        dic[rows[i].ncbi_gene_id.value].mondo_disease_name_ja = new Set();
        dic[rows[i].ncbi_gene_id.value].mondo_disease_name_ja.add(dic[rows[i].ncbi_gene_id.value].mondo_disease_name_ja[rows[i].mondo_id.value] = rows[i].mondo_disease_name_ja.value);
      }
      if (rows[i].disease_url) { 
        dic[rows[i].ncbi_gene_id.value].mondo_id_to_omim_id = new Set();
        dic[rows[i].ncbi_gene_id.value].mondo_id_to_orpha_id = new Set();

        if (rows[i].disease_url.value.includes("mim"))
        //if (rows[i].disease_url.value.match("mim"))
        {
          dic[rows[i].ncbi_gene_id.value].mondo_id_to_omim_id.add(
            dic[rows[i].ncbi_gene_id.value].mondo_id_to_omim_id[rows[i].mondo_id.value] = 'OMIM:' + rows[i].disease_id.value
          );
        }
        if (rows[i].disease_url.value.includes("ORDO"))
        //if (rows[i].disease_url.value.match("ORDO"))
        {        
          dic[rows[i].ncbi_gene_id.value].mondo_id_to_orpha_id.add(
            dic[rows[i].ncbi_gene_id.value].mondo_id_to_orpha_id[rows[i].mondo_id.value] = 'ORPHA:' + rows[i].disease_id.value
          );
        }
      }
    };
  }
    
  for (let i = 0; i < rows.length; i++) {
    if(rows[i].ncbi_gene_id.value in dic){
      if(dic[rows[i].ncbi_gene_id.value].synonym){
        dic[rows[i].ncbi_gene_id.value].synonym = Array.from(dic[rows[i].ncbi_gene_id.value].synonym)
      }
      if(dic[rows[i].ncbi_gene_id.value].inheritance_en){
        dic[rows[i].ncbi_gene_id.value].inheritance_en = Array.from(dic[rows[i].ncbi_gene_id.value].inheritance_en)
      }
      if(dic[rows[i].ncbi_gene_id.value].inheritance_ja){
        dic[rows[i].ncbi_gene_id.value].inheritance_ja = Array.from(dic[rows[i].ncbi_gene_id.value].inheritance_ja)
      }
      if(dic[rows[i].ncbi_gene_id.value].mondo_id){
        dic[rows[i].ncbi_gene_id.value].mondo_id = Array.from(dic[rows[i].ncbi_gene_id.value].mondo_id)
      }
      if(dic[rows[i].ncbi_gene_id.value].mondo_url){
        dic[rows[i].ncbi_gene_id.value].mondo_url = Array.from(dic[rows[i].ncbi_gene_id.value].mondo_url)
      }
    }
  }

  return dic
};
```