## Parameters
* `nando_id` NANDO ID
  * default: nando:1200003
 

## Endpoint

https://pubcasefinder-rdf.dbcls.jp/sparql

## `result` 
```sparql
prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
prefix xml: <http://www.w3.org/XML/1998/namespace>
prefix xsd: <http://www.w3.org/2001/XMLSchema#>
prefix owl: <http://www.w3.org/2002/07/owl#>
prefix obo: <http://purl.obolibrary.org/obo/>
prefix dcterms: <http://purl.org/dc/terms/>
prefix skos: <http://www.w3.org/2004/02/skos/core#>
prefix dc: <http://purl.org/dc/elements/1.1/>
prefix nando: <http://nanbyodata.jp/ontology/NANDO_>
prefix sio: <http://semanticscience.org/resource/>
SELECT DISTINCT ?nando ?label ?label_en ?year ?num_of_participant


WHERE {
  GRAPH<https://pubcasefinder.dbcls.jp/rdf/ontology/nando> {
      {{nando_id}} sio:SIO_000216 ?B1 .
    ?B1 nando:has_aYearOfStatistics ?B2.
    ?B2 sio:SIO_000300 ?year.
    ?B1 nando:has_theNumberOfPatients ?B3.
    ?B3 sio:SIO_000300 ?num_of_participant.
    }
    }
    ORDER BY ?year

```
 Output
```javascript
({result}) => {
  let tree = [];
  result.results.bindings.forEach(d => {
    tree.push({
      year: d.year.value,
      num_of_participant: Number(d.num_of_participant.value),
    });
  });
  return tree;
};
```


 