# [PCF] FILTER: GET GENE by MONDO ID - https://pubcasefinder-rdf.dbcls.jp/sparql
## Parameters
* `mondo_id` MONDO ID
  * default: 0017838
  * example: 0018096, 0003847, 0018096, 0007477

## Endpoint
https://pubcasefinder-rdf.dbcls.jp/sparql

## `mondo_id_list`
```javascript
({mondo_id}) => {
  mondo_id = mondo_id.replace(/MONDO:/g,"")
  return mondo_id;
}
```

## `result` 
```sparql
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX dcterm: <http://purl.org/dc/terms/>
PREFIX nando: <http://nanbyodata.jp/ontology/nando#>
PREFIX ncit: <http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl#>
PREFIX mondo: <http://purl.obolibrary.org/obo/>
PREFIX sio: <http://semanticscience.org/resource/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

SELECT
?hgnc_gene_symbol 
?gene_id
(GROUP_concat(distinct ?disease_info; separator = " | ") as ?disease_info)
(GROUP_concat(distinct ?source_name; separator = " | ") as ?source_name)
(GROUP_concat(distinct ?inheritance_en; separator = ", ") as ?inheritance_en)
(GROUP_concat(distinct ?inheritance_ja; separator = ", ") as ?inheritance_ja)
WHERE {
  {
    SELECT DISTINCT ?disease WHERE { 
      ?mondo_sub_tier rdfs:subClassOf* mondo:MONDO_{{mondo_id_list}} ;
      				  skos:exactMatch ?exactMatch_disease .
      FILTER(CONTAINS(STR(?exactMatch_disease), "omim") || CONTAINS(STR(?exactMatch_disease), "Orphanet"))
      BIND(IRI(replace(STR(?exactMatch_disease), 'http://identifiers.org/omim/', 'http://identifiers.org/mim/')) AS ?disease) .
    }
  }
  ?as sio:SIO_000628 ?disease ;
      sio:SIO_000628 ?gene ;
      dcterm:source ?source .
  ?disease rdf:type ncit:C7057 ;
           dcterm:identifier ?disease_id ;
           rdfs:seeAlso [rdfs:label ?disease_name] .
  ?gene rdf:type ncit:C16612 ;
        sio:SIO_000205 [rdfs:label ?hgnc_gene_symbol] ;
        dcterm:identifier ?gene_id . 
  OPTIONAL { 
    ?disease nando:hasInheritance ?inheritance .
    ?inheritance rdfs:label ?inheritance_en, ?inheritance_ja .
    FILTER (lang(?inheritance_en) = "en") . FILTER (lang(?inheritance_ja) = "ja") . 
  }
  
  BIND(CONCAT(?disease_name, IF(CONTAINS(STR(?disease), "Orphanet"), ", ORPHA:", ", OMIM:"), ?disease_id) AS ?disease_info)
  BIND(IF(STR(?source) = 'http://www.orphadata.org/data/xml/en_product6.xml', 'Orphadata',
       IF(STR(?source) = 'ftp://ftp.ncbi.nlm.nih.gov/gene/DATA/mim2gene_medgen', 'OMIM', 'GenCC')) AS ?source_name)
} order by ?hgnc_gene_symbol
```

## Output
```javascript
({result})=>{ 
  return result.results.bindings.map(data => {
    return Object.keys(data).reduce((obj, key) => {
      obj[key] = data[key].value;
      return obj;
    }, {});
  });
}
```