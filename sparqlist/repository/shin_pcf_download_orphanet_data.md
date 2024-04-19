# [PCF] Get ORPHA data DOWNLOAD
## Parameters
* `mode`
	* example: en
    
## Endpoint
https://integbio.jp/rdf/sparql

## `orpha_id_list`
```javascript
({orpha_id}) => {
  orpha_id = 'ordo:Orphanet_' + orpha_id.replace(/[\s,]+/g," ordo:Orphanet_")
  return orpha_id;
}
```

## `result` 
```sparql
#268300 ?mondo rdfs:label ?disease_name . 문제 해결해야됨
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX ncit: <http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl#>
PREFIX oa: <http://www.w3.org/ns/oa#>
PREFIX obo: <http://purl.obolibrary.org/obo/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX sio: <http://semanticscience.org/resource/>
PREFIX nando: <http://nanbyodata.jp/ontology/nando#>
PREFIX ordo: <http://www.orpha.net/ORDO/>

SELECT DISTINCT
str(?disease_name_en) as ?orpha_disease_name_en
str(?disease_name_ja) as ?orpha_disease_name_ja

str(?gene_ID) as ?ncbi_gene_id
str(?gene_symbol) as ?hgnc_gene_symbol

str(?inheritance_name_en) as ?inheritance_en
str(?inheritance_name_ja) as ?inheritance_ja

str(?orpha_id) as ?orpha_id
str(?ordo_id) as ?orpha_url

str(?mondo_ID) as ?mondo_id
str(?mondo) as ?mondo_url

str(?DBMS) as ?ur_dbms_url
str(?kegg) as ?kegg_url
str(?gene_reviews) as ?gene_reviews_url
str(?gtr) as ?gtr_url
str(?description) as ?description

count(?hpo) as ?count_hpo_id
WHERE {

    {
      SELECT DISTINCT ?ordo_id WHERE {
        ?an oa:hasTarget ?ordo_id .
        FILTER(CONTAINS(STR(?ordo_id), "ORDO"))
      }
    }

  OPTIONAL { 
    ?ordo_id nando:hasInheritance ?inheritance .
    ?inheritance rdfs:label ?inheritance_name_en .
    ?inheritance rdfs:label ?inheritance_name_ja .
    FILTER (lang(?inheritance_name_en) = "en")
    FILTER (lang(?inheritance_name_ja) = "ja")
  }

  OPTIONAL { ?ordo_id rdfs:seeAlso ?DBMS  FILTER(CONTAINS(STR(?DBMS), "UR-DBMS")) }
  OPTIONAL { ?ordo_id rdfs:seeAlso ?kegg  FILTER(CONTAINS(STR(?kegg), "kegg")) }
  OPTIONAL { ?ordo_id rdfs:seeAlso ?gene_reviews  FILTER(CONTAINS(STR(?gene_reviews), "books")) }
  OPTIONAL { ?ordo_id rdfs:seeAlso ?gtr  FILTER(CONTAINS(STR(?gtr), "gtr")) }

  #mondo id, disease name, description
  OPTIONAL { ?ordo_id rdfs:label ?disease_name_ja FILTER (lang(?disease_name_ja) = "ja") }

  OPTIONAL { ?ordo_id rdfs:seeAlso ?mondo . }

  ?mondo rdfs:label ?disease_name_en .    
  OPTIONAL { ?mondo <http://www.geneontology.org/formats/oboInOwl#id> ?mondo_ID . }
  OPTIONAL { ?mondo obo:IAO_0000115 ?description . }

  #gene id, gene symbol
  OPTIONAL {
    ?as sio:SIO_000628 ?ordo_id ;
        sio:SIO_000628 ?gene .
    ?gene rdf:type ncit:C16612 ;
          dcterms:identifier ?gene_ID ;
          sio:SIO_000205 ?HGNC .
    ?HGNC rdfs:label ?gene_symbol .
  }
  #gene id, gene symbol

  OPTIONAL {
    ?an rdf:type oa:Annotation ;
        oa:hasTarget ?ordo_id ;
        oa:hasBody ?hpo .
    #FILTER(CONTAINS(STR(?ordo_id), "ORDO"))
  }
  BIND (replace(str(?ordo_id), 'http://www.orpha.net/ORDO/Orphanet_', '') AS ?orpha_id)
  BIND (CONCAT('https://www.orpha.net/en/disease/detail/', ?orpha_id, '?name=', ?orpha_id, '&mode=orpha') AS ?orpha_url)
} order by ?ordo_id
```

## Output

```javascript
({result})=>{ 
  
  var dic = {}
  var rows = result.results.bindings;
  
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].orpha_id.value in dic)
    {
      if (rows[i].omim_url) { 
        dic[rows[i].orpha_id.value].omim_url = rows[i].omim_url.value;
      }
      
      if (rows[i].omim_disease_name_en) { 
        dic[rows[i].orpha_id.value].omim_disease_name_en = rows[i].omim_disease_name_en.value;
      }
      
      if (rows[i].omim_disease_name_ja) { 
        dic[rows[i].orpha_id.value].omim_disease_name_ja = rows[i].omim_disease_name_ja.value;
      }
      
      if (rows[i].description) { 
        dic[rows[i].orpha_id.value].description = rows[i].description.value;
      }
      
      if (rows[i].ur_dbms_url) { 
        dic[rows[i].orpha_id.value].ur_dbms_url = rows[i].ur_dbms_url.value;
      }
      
      if (rows[i].count_hpo_id) { 
        dic[rows[i].orpha_id.value].count_hpo_id = rows[i].count_hpo_id.value;
      }

      if (rows[i].ncbi_gene_id) { 
        dic[rows[i].orpha_id.value].ncbi_gene_id.add(rows[i].ncbi_gene_id.value);
      }
      
      if (rows[i].hgnc_gene_symbol) { 
        dic[rows[i].orpha_id.value].hgnc_gene_symbol.add(rows[i].hgnc_gene_symbol.value);
      }
      
      if (rows[i].inheritance_en) { 
        dic[rows[i].orpha_id.value].inheritance_en.add(rows[i].inheritance_en.value);
      }
      
      if (rows[i].inheritance_ja) { 
        dic[rows[i].orpha_id.value].inheritance_ja.add(rows[i].inheritance_ja.value);
      }
      
      if (rows[i].mondo_id) { 
        dic[rows[i].orpha_id.value].mondo_id.add(rows[i].mondo_id.value);
      }
      
      if (rows[i].mondo_url) { 
        dic[rows[i].orpha_id.value].mondo_url.add(rows[i].mondo_url.value);
      }
   
      if(rows[i].kegg_url) {
        dic[rows[i].orpha_id.value].kegg_url.add(rows[i].kegg_url.value);
      }
      
      if (rows[i].gene_reviews_url) { 
        dic[rows[i].orpha_id.value].gene_reviews_url.add(rows[i].gene_reviews_url.value);
      }

      if (rows[i].gtr_url) { 
        dic[rows[i].orpha_id.value].gtr_url.add(rows[i].gtr_url.value);
      }

    }
    else
    {
      dic[rows[i].orpha_id.value] = {};
      
      if (rows[i].omim_url) { 
        dic[rows[i].orpha_id.value].omim_url = rows[i].omim_url.value;
      }

      if (rows[i].omim_disease_name_en) { 
        dic[rows[i].orpha_id.value].omim_disease_name_en = rows[i].omim_disease_name_en.value;
      }
      
      if (rows[i].omim_disease_name_ja) { 
        dic[rows[i].orpha_id.value].omim_disease_name_ja = rows[i].omim_disease_name_ja.value;
      }

      if (rows[i].description) { 
        dic[rows[i].orpha_id.value].description = rows[i].description.value;
      }
      
      if (rows[i].ur_dbms_url) { 
        dic[rows[i].orpha_id.value].ur_dbms_url = rows[i].ur_dbms_url.value;
      }

      if (rows[i].count_hpo_id) { 
        dic[rows[i].orpha_id.value].count_hpo_id = rows[i].count_hpo_id.value;
      }

      if (rows[i].ncbi_gene_id) { 
        dic[rows[i].orpha_id.value].ncbi_gene_id = new Set();
        dic[rows[i].orpha_id.value].ncbi_gene_id.add(rows[i].ncbi_gene_id.value);
      }
      
      if (rows[i].hgnc_gene_symbol) { 
        dic[rows[i].orpha_id.value].hgnc_gene_symbol = new Set();
        dic[rows[i].orpha_id.value].hgnc_gene_symbol.add(rows[i].hgnc_gene_symbol.value);
      }
      
      if (rows[i].inheritance_en) { 
        dic[rows[i].orpha_id.value].inheritance_en = new Set();
        dic[rows[i].orpha_id.value].inheritance_en.add(rows[i].inheritance_en.value);
      }
      
      if (rows[i].inheritance_ja) { 
        dic[rows[i].orpha_id.value].inheritance_ja = new Set();
        dic[rows[i].orpha_id.value].inheritance_ja.add(rows[i].inheritance_ja.value);
      }
      
      if (rows[i].mondo_id) { 
        dic[rows[i].orpha_id.value].mondo_id = new Set();
        dic[rows[i].orpha_id.value].mondo_id.add(rows[i].mondo_id.value);
      }
      
      if (rows[i].mondo_url) { 
        dic[rows[i].orpha_id.value].mondo_url = new Set();
        dic[rows[i].orpha_id.value].mondo_url.add(rows[i].mondo_url.value);
      }
   
      if(rows[i].kegg_url) {
        dic[rows[i].orpha_id.value].kegg_url = new Set();
        dic[rows[i].orpha_id.value].kegg_url.add(rows[i].kegg_url.value);
      }

      if (rows[i].gene_reviews_url) { 
        dic[rows[i].orpha_id.value].gene_reviews_url = new Set();
        dic[rows[i].orpha_id.value].gene_reviews_url.add(rows[i].gene_reviews_url.value);
      }

      if (rows[i].gtr_url) { 
        dic[rows[i].orpha_id.value].gtr_url = new Set();
        dic[rows[i].orpha_id.value].gtr_url.add(rows[i].gtr_url.value);
      }

    };
  }

  for (let i = 0; i < rows.length; i++) {
    if(rows[i].orpha_id.value in dic){
      if(dic[rows[i].orpha_id.value].ncbi_gene_id){
        dic[rows[i].orpha_id.value].ncbi_gene_id = Array.from(dic[rows[i].orpha_id.value].ncbi_gene_id)
      }
      if(dic[rows[i].orpha_id.value].hgnc_gene_symbol){
        dic[rows[i].orpha_id.value].hgnc_gene_symbol = Array.from(dic[rows[i].orpha_id.value].hgnc_gene_symbol)
      }
      if(dic[rows[i].orpha_id.value].inheritance_en){
        dic[rows[i].orpha_id.value].inheritance_en = Array.from(dic[rows[i].orpha_id.value].inheritance_en)
      }
      if(dic[rows[i].orpha_id.value].inheritance_ja){
        dic[rows[i].orpha_id.value].inheritance_ja = Array.from(dic[rows[i].orpha_id.value].inheritance_ja)
      }
      if(dic[rows[i].orpha_id.value].mondo_id){
        dic[rows[i].orpha_id.value].mondo_id = Array.from(dic[rows[i].orpha_id.value].mondo_id)
      }
      if(dic[rows[i].orpha_id.value].mondo_url){
        dic[rows[i].orpha_id.value].mondo_url = Array.from(dic[rows[i].orpha_id.value].mondo_url)
      }
      if(dic[rows[i].orpha_id.value].kegg_url){
        dic[rows[i].orpha_id.value].kegg_url = Array.from(dic[rows[i].orpha_id.value].kegg_url)
      }
      if(dic[rows[i].orpha_id.value].gene_reviews_url){
        dic[rows[i].orpha_id.value].gene_reviews_url = Array.from(dic[rows[i].orpha_id.value].gene_reviews_url)
      }
      if(dic[rows[i].orpha_id.value].gtr_url){
        dic[rows[i].orpha_id.value].gtr_url = Array.from(dic[rows[i].orpha_id.value].gtr_url)
      }
    }
  }

  return dic
};
```