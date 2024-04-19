# [PCF] List_Rare_Diseases - https://pubcasefinder-rdf.dbcls.jp/sparql

## Endpoint
https://pubcasefinder-rdf.dbcls.jp/sparql

## `result` 
```sparql
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX oa: <http://www.w3.org/ns/oa#>
PREFIX obo: <http://purl.obolibrary.org/obo/>
PREFIX ordo: <http://www.orpha.net/ORDO/>

SELECT DISTINCT
CONCAT('ORPHA:', STR(?orpha_id)) as ?orpha_id
#str(?ordo_id) as ?orpha_url
str(?orpha_url) as ?orpha_url
str(?disease_name_en) as ?orpha_disease_name_en
str(?disease_name_ja) as ?orpha_disease_name_ja
WHERE { 
  ?an rdf:type oa:Annotation ;
      oa:hasTarget ?ordo_id ;
      oa:hasBody ?hpo_url ;
      dcterms:source [dcterms:creator ?creator] .
  FILTER(CONTAINS(STR(?ordo_id), "ORDO"))
  FILTER(?creator NOT IN("Database Center for Life Science"))

  OPTIONAL {
    ?ordo_id rdfs:seeAlso [rdfs:label ?disease_name_en].
    ?ordo_id rdfs:label ?disease_name_ja FILTER (lang(?disease_name_ja) = "ja") 
  }
 
  GRAPH <https://pubcasefinder.dbcls.jp/rdf/ontology/hp>{
    ?hpo_url rdfs:subClassOf+ ?hpo_category .
    ?hpo_category rdfs:subClassOf obo:HP_0000118 .   
  }
  
  BIND (replace(str(?ordo_id), 'http://www.orpha.net/ORDO/Orphanet_', '') AS ?orpha_id)
  BIND (CONCAT('https://www.orpha.net/en/disease/detail/', ?orpha_id, '?name=', ?orpha_id, '&mode=orpha') AS ?orpha_url)
}
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