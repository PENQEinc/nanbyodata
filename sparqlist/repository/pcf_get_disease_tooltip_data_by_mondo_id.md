# [PCF] Get Disease tooltip data by MONDO ID - https://pubcasefinder-rdf.dbcls.jp/sparql
## Parameters
* `mondo_id` MONDO ID
  * default: 0009903
  * example: 0003847, 0018096, 0007477, 0001046

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
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX mondo: <http://purl.obolibrary.org/obo/>
PREFIX mim: <http://identifiers.org/mim/>
PREFIX oa: <http://www.w3.org/ns/oa#>
PREFIX obo: <http://purl.obolibrary.org/obo/>

SELECT DISTINCT
str(?name_en) as ?name_en
str(?name_ja) as ?name_ja
str(?definition) as ?definition
str(?synonym) as ?synonym
str(?mondo) as ?mondo_url
str(?omim_id) as ?omim_id
str(?omim_url) as ?omim_url
str(?orpha_id) as ?orpha_id
str(?orpha_url) as ?orpha_url

WHERE {
  VALUES ?mondo_url { mondo:MONDO_{{mondo_id_list}} }

  ?mondo_url rdfs:label ?name_en .
  optional { ?mondo_url mondo:IAO_0000115 ?definition }
  optional { ?mondo_url <http://www.geneontology.org/formats/oboInOwl#hasExactSynonym> ?synonym }

  optional { ?disease rdfs:seeAlso ?mondo_url ;
                      rdfs:label ?name_ja .            
            FILTER (lang(?name_ja) = "ja") }
  
  optional { ?omim_url rdfs:seeAlso ?mondo_url ;
                       dcterms:identifier ?omim_id .
            FILTER(CONTAINS(STR(?omim_url), "mim")) }

  optional { ?ordo_id rdfs:seeAlso ?mondo_url ;
                        dcterms:identifier ?orpha_id .
            FILTER(CONTAINS(STR(?ordo_id), "ORDO")) }
  
  BIND (CONCAT('https://www.orpha.net/en/disease/detail/', ?orpha_id, '?name=', ?orpha_id, '&mode=orpha') AS ?orpha_url)
  BIND (replace(str(?mondo_url), 'http://purl.obolibrary.org/obo/MONDO_', 'https://monarchinitiative.org/disease/MONDO:') AS ?mondo)
  
} order by ?mondo_url ?synonym
```

## Output
```javascript
({result})=>{ 
  var dic = {}
  var rows = result.results.bindings;
  
  dic['name_en'] = {}
  dic['name_ja'] = {}
  dic['definition'] = {}
  dic['mondo_url'] = {}
  dic['omim_id'] = new Set();
  dic['omim_url'] = new Set();
  dic['orpha_id'] = new Set();
  dic['orpha_url'] = new Set();
  dic['synonym'] = new Set();
  
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].name_en) { 
        dic['name_en'] = rows[i].name_en.value
     }
    if (rows[i].name_ja) { 
        dic['name_ja'] = rows[i].name_ja.value
     }
    if (rows[i].definition) { 
        dic['definition'] = rows[i].definition.value
     }
    if (rows[i].mondo_url) { 
        dic['mondo_url'] = rows[i].mondo_url.value
     }
    if (rows[i].omim_id) { 
        dic['omim_id'].add('OMIM:' + rows[i].omim_id.value)
     }
    if (rows[i].omim_url) { 
        dic['omim_url'].add(rows[i].omim_url.value)
     }
    if (rows[i].orpha_id) { 
        dic['orpha_id'].add('ORPHA:' + rows[i].orpha_id.value)
     }
    if (rows[i].orpha_url) { 
        dic['orpha_url'].add(rows[i].orpha_url.value)
     }
    if (rows[i].synonym) { 
        dic['synonym'].add(rows[i].synonym.value)
     }
  }
  dic['omim_id'] = Array.from(dic['omim_id'])
  dic['omim_url'] = Array.from(dic['omim_url'])
  dic['orpha_id'] = Array.from(dic['orpha_id'])
  dic['orpha_url'] = Array.from(dic['orpha_url'])
  dic['synonym'] = Array.from(dic['synonym'])
  
  return dic
}
```