# [PCF] Get HPO data by MONDO ID - https://pubcasefinder-rdf.dbcls.jp/sparql
## Parameters
* `mondo_id` MONDO ID
  * default: 0007045
  * example: 0018096, 0007477, 0001046

## Endpoint
https://pubcasefinder-rdf.dbcls.jp/sparql

## `mondo_id_list`
```javascript
({mondo_id}) => {
  mondo_id = mondo_id.replace(/[MONDO:\s,]+/gi,"")
  return mondo_id;
}
```

## `result` 
```sparql
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX hoom: <http://www.semanticweb.org/ontology/HOOM#>
PREFIX mondo: <http://purl.obolibrary.org/obo/>
PREFIX oa: <http://www.w3.org/ns/oa#>
PREFIX obo: <http://purl.obolibrary.org/obo/>
PREFIX oboinowl: <http://www.geneontology.org/formats/oboInOwl#>

SELECT DISTINCT
str(?hpo_category_name_en) as ?hpo_category_name_en
str(?hpo_category_name_ja) as ?hpo_category_name_ja
str(?hpo_id) as ?hpo_id
str(?hpo_url) as ?hpo_url
str(?hpo_label_en) as ?hpo_label_en
str(?hpo_label_ja) as ?hpo_label_ja
str(?definition) as ?definition
str(?frequency) as ?frequency

WHERE { 
  VALUES ?mondo { mondo:MONDO_{{mondo_id_list}} }

  ?disease_url rdfs:seeAlso ?mondo .
 
  ?an rdf:type oa:Annotation ;
      oa:hasTarget ?disease_url ;
      oa:hasBody ?hpo_url ;
      dcterms:source [dcterms:creator ?creator] .
  FILTER(?creator NOT IN("Database Center for Life Science"))

  GRAPH <https://pubcasefinder.dbcls.jp/rdf/ontology/hp>{
    ?hpo_url rdfs:label ?hpo_label_en .
    ?hpo_url oboinowl:id ?hpo_id .
    #BIND (replace(str(?hpo_url), 'http://purl.obolibrary.org/obo/HP_', 'HP:') AS ?hpo_id)
    optional { ?hpo_url obo:IAO_0000115 ?definition . }
    ?hpo_url rdfs:subClassOf+ ?hpo_category .
    ?hpo_category rdfs:subClassOf obo:HP_0000118 .
    ?hpo_category rdfs:label ?hpo_category_name_en .
  }
  optional { ?an hoom:with_frequency [rdfs:label ?frequency] FILTER(LANG(?frequency) = "en") FILTER(LANG(?frequency) = "en") }
  optional { ?hpo_url rdfs:label ?hpo_label_ja . FILTER (lang(?hpo_label_ja) = "ja") }
  optional { ?hpo_category rdfs:label ?hpo_category_name_ja . FILTER (lang(?hpo_category_name_ja) = "ja") }
 
} order by ?hpo_category ?hpo_id
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