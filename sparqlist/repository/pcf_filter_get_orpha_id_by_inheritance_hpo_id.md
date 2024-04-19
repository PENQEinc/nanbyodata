# FILTER: Get ORPHA ID by HPO ID (inheritance) - https://pubcasefinder-rdf.dbcls.jp/sparql
## Parameters
* `hpo_id` HPO ID
  * default: 0001428
  * example: 0001428, 0003745

## Endpoint
https://pubcasefinder-rdf.dbcls.jp/sparql

## `hpo_id_list`
```javascript
({hpo_id}) => {
  hpo_id = hpo_id.replace(/HP:/g,"")
  return hpo_id;
}
```

## `result`
```sparql
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX hpo: <http://purl.obolibrary.org/obo/HP_>
PREFIX nando: <http://nanbyodata.jp/ontology/nando#>

SELECT DISTINCT
?orpha_id

WHERE {
  ?hpo_id rdfs:subClassOf* hpo:{{hpo_id_list}} .
  ?orpha_uri nando:hasInheritance ?hpo_id ;
            dcterms:identifier ?orpha_id .
  FILTER(CONTAINS(STR(?orpha_uri), "Orphanet_"))
} order by ?orpha_id
```

## `return`
```javascript
({hpo_id_list, result})=>{ 
  var list = []
  var dic = {}
  var rows = result.results.bindings;
  
  for (let i = 0; i < rows.length; i++) {
    list.push('ORPHA:' + rows[i].orpha_id.value);
  }

  if(rows){
    dic['HP:' + hpo_id_list] = list;
  }
  
  return dic
};