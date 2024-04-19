# Retrieve NANDO class by the given NANDO ID

## Parameters

* `nando_id` NANDO ID
  * default: 1200005
  * examples: 1200009, 2200865

## Endpoint

https://pubcasefinder-rdf.dbcls.jp/sparql

## `nando2mondo` get mondo_id correspoinding to nando_id

```sparql
PREFIX : <http://nanbyodata.jp/ontology/nando#>
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX obo: <http://purl.obolibrary.org/obo/>
PREFIX oboInOwl: <http://www.geneontology.org/formats/oboInOwl#>

SELECT *
WHERE {
  ?nando a owl:Class ;
         dcterms:identifier "NANDO:{{nando_id}}" .
  OPTIONAL {
    ?nando skos:closeMatch ?mondo .
    ?mondo oboInOwl:id ?mondo_id
  }
}
```

## `mondo_uri_list` get mondo uri

```javascript
({
  json({nando2mondo}) {
    let rows = nando2mondo.results.bindings;
    let mondo_uris = [];
    
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].mondo_id) {
        mondo_uris.push((rows[i].mondo_id.value).replace('MONDO:', 'MONDO_'));
      } else {
        mondo_uris.push("NA");
      }
    }
    //return mondo_uris[0]
    return "obo:" + mondo_uris.join(' obo:')
  }
})
```

## Endpoint

https://grch38.togovar.org/sparql

## `medgen` retrieve information from medgen

```sparql
prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
prefix skos: <http://www.w3.org/2004/02/skos/core#>
prefix prov: <http://www.w3.org/ns/prov#>
prefix pav: <http://purl.org/pav/>
prefix medgen: <http://www.ncbi.nlm.nih.gov/medgen/>
prefix mo: <http://med2rdf/ontology/medgen#>
prefix ispref: <http://med2rdf/ontology/medgen/ispref#>
prefix sty: <http://purl.bioontology.org/ontology/STY/>
prefix omim: <http://purl.bioontology.org/ontology/OMIM/>
prefix obo: <http://purl.obolibrary.org/obo/>
prefix mesh: <http://id.nlm.nih.gov/mesh/>
prefix ordo: <http://www.orpha.net/ORDO/>
prefix nci: <http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl#>
prefix dct: <http://purl.org/dc/terms/>
prefix pubmedid: <http://identifiers.org/pubmed/>
prefix pubmed: <http://rdf.ncbi.nlm.nih.gov/pubmed/>

SELECT DISTINCT ?medgen ?concept ?concept_id ?concept_name ?definition (GROUP_CONCAT(?label, ":") AS ?labels) ?mondo
FROM <http://togovar.biosciencedbc.jp/medgen>
WHERE {
  {{#if mondo_uri_list}}
	VALUES ?mondo_uri { {{mondo_uri_list}} }
  {{/if}}
  ?medgen rdfs:seeAlso ?concept .
  ?concept a mo:ConceptID .
  ?concept dct:identifier ?concept_id .
  ?concept rdfs:label ?concept_name .
  ?concept skos:definition ?definition .
  ?concept mo:mgconso ?mgconso .
  ?mgconso dct:source mo:MONDO ;
           rdfs:seeAlso ?mondo .
  ?mgconso rdfs:label ?label .
  FILTER REGEX(?mondo,?mondo_uri)
}
GROUP BY ?medgen ?concept ?definition ?concept_id ?concept_name ?mondo
LIMIT 100

```

## Endpoint

https://pubcasefinder-rdf.dbcls.jp/sparql

## `inheritance` retrieve inheritances associated with the mondo uri

```sparql
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX sio: <http://semanticscience.org/resource/>
PREFIX mondo: <http://purl.obolibrary.org/obo/>
PREFIX ncit: <http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl#>
PREFIX nando: <http://nanbyodata.jp/ontology/nando#>
PREFIX obo: <http://purl.obolibrary.org/obo/>

SELECT distinct ?inheritance ?inheritance_ja WHERE{
  {{#if mondo_uri_list}}
	VALUES ?mondo_uri { {{mondo_uri_list}} }
  {{/if}}

  ?disease rdfs:seeAlso ?mondo_uri ;
           nando:hasInheritance ?inheritance .
  optional { ?inheritance rdfs:label ?inheritance_ja . FILTER (lang(?inheritance_ja) = "ja") }
}
order by ?inheritance
```

## Endpoint

https://pubcasefinder-rdf.dbcls.jp/sparql

## `gene` retrieve genes associated with the mondo uri

```sparql
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX ncit: <http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl#>
PREFIX obo: <http://purl.obolibrary.org/obo/>
PREFIX sio: <http://semanticscience.org/resource/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

SELECT distinct ?gene ?hgnc_gene_symbol WHERE{
  {
    SELECT DISTINCT ?disease WHERE {
      VALUES ?mondo_uri { {{mondo_uri_list}} }
      ?mondo_sub_tier rdfs:subClassOf* ?mondo_uri ;
      skos:exactMatch ?exactMatch_disease .
      FILTER(CONTAINS(STR(?exactMatch_disease), "omim") || CONTAINS(STR(?exactMatch_disease), "Orphanet"))
      BIND (IRI(replace(STR(?exactMatch_disease), 'http://identifiers.org/omim/', 'http://identifiers.org/mim/')) AS ?disease) .
    }
  }
  ?as sio:SIO_000628 ?disease ;
      sio:SIO_000628 ?gene .
  ?disease rdf:type ncit:C7057 .
  ?gene sio:SIO_000205 [rdfs:label ?hgnc_gene_symbol] .
  ?gene rdf:type ncit:C16612 .
}
order by ?hgnc_gene_symbol
```

## Endpoint

https://pubcasefinder-rdf.dbcls.jp/sparql

## `phenotype` retrieve phenotypes associated with the mondo uri

```sparql
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX mim: <http://identifiers.org/mim/>
PREFIX oa: <http://www.w3.org/ns/oa#>
PREFIX obo: <http://purl.obolibrary.org/obo/>
PREFIX dcterms: <http://purl.org/dc/terms/>

SELECT DISTINCT
?hpo_category
?hpo_category_name_en
?hpo_category_name_ja
?hpo_id
?hpo_url
?hpo_label_en
?hpo_label_ja
WHERE { 
  {{#if mondo_uri_list}}
	VALUES ?mondo_uri { {{mondo_uri_list}} }
  {{/if}}
    
  ?an rdf:type oa:Annotation ;
      oa:hasTarget [rdfs:seeAlso ?mondo_uri] ;
      oa:hasBody ?hpo_url ;
      dcterms:source [dcterms:creator ?creator] .
  FILTER(?creator NOT IN("Database Center for Life Science"))
    
  GRAPH <https://pubcasefinder.dbcls.jp/rdf/ontology/hp>{
    optional { ?hpo_category rdfs:subClassOf obo:HP_0000118 . }
    ?hpo_category rdfs:label ?hpo_category_name_en .
    ?hpo_url rdfs:subClassOf+ ?hpo_category .
    ?hpo_url rdfs:label ?hpo_label_en .
    ?hpo_url <http://www.geneontology.org/formats/oboInOwl#id> ?hpo_id .
    ?hpo_url obo:IAO_0000115 ?definition .
  }
    
  optional { ?hpo_category rdfs:label ?hpo_category_name_ja . FILTER (lang(?hpo_category_name_ja) = "ja") }
  optional { ?hpo_url rdfs:label ?hpo_label_ja . FILTER (lang(?hpo_label_ja) = "ja") }    
}
order by ?hpo_category_name_en ?hpo_label_ja
```

## Endpoint

https://pubcasefinder-rdf.dbcls.jp/sparql

## `genetesting` retrieve gene testing associated with the nando uri

```sparql
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX dct:  <http://purl.org/dc/terms/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX obo: <http://purl.obolibrary.org/obo/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX genetest: <http://nanbyodata.jp/ontology/genetest_>

SELECT DISTINCT
?hp ?label ?contact ?gene
WHERE {
 ?s  foaf:homepage ?hp.
 OPTIONAL{?s  rdfs:label    ?label.}
 OPTIONAL{?s  genetest:contact ?contact.}
 OPTIONAL{?s  genetest:has_test ?gene.}
 ?s rdfs:seeAlso ?disease.
 FILTER (CONTAINS(STR(?disease), "{{nando_id}}"))
}
```

## Endpoint

https://knowledge.brc.riken.jp/sparql

## `cell` retrieve the number of cell in Riken BRC associated with the nando id

```sparql
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX dct:  <http://purl.org/dc/terms/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX obo: <http://purl.obolibrary.org/obo/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX brso: <http://purl.jp/bio/10/brso/>
PREFIX dc: <http://purl.org/dc/elements/1.1/>
PREFIX nando: <http://nanbyodata.jp/ontology/nando#>
SELECT DISTINCT ?donor ?ontology
FROM <http://metadb.riken.jp/db/xsearch_cell_brso>
WHERE {
 ?cell brso:donor ?donor.
 ?donor obo:RO_0000091 ?disease.
 OPTIONAL {?disease rdfs:seeAlso ?ontology}
 FILTER (CONTAINS(STR(?ontology), "{{nando_id}}"))
}
```

## Endpoint

https://knowledge.brc.riken.jp/sparql

## `mouse` retrieve the number of mouse in Riken BRC associated with the nando id

```sparql
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX dct:  <http://purl.org/dc/terms/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX brso: <http://purl.jp/bio/10/brso/>
PREFIX dc: <http://purl.org/dc/elements/1.1/>
PREFIX nando: <http://nanbyodata.jp/ontology/NANDO_>

select ?mouse STR(?name) AS ?mouse_name ?hp STR(?id) AS ?mouse_id ?description ?nando
where{
  VALUES ?nando { nando:{{nando_id}} }
  graph <http://metadb.riken.jp/db/mouse_diseaseID>{
    ?mouse <http://purl.obolibrary.org/obo/RO_0003301> ?nando.}
  graph <http://metadb.riken.jp/db/xsearch_animal_brso>{
    ?mouse rdfs:label ?name;
           foaf:homepage ?hp;
           dct:identifier ?id.
      OPTIONAL {?mouse dc:description ?description.}
      FILTER (lang(?description) = "ja")
      }
}
```

## Endpoint

https://knowledge.brc.riken.jp/sparql

## `dna` retrieve the number of dna in Riken BRC associated with the nando id

```sparql
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX dct:  <http://purl.org/dc/terms/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX brso: <http://purl.jp/bio/10/brso/>
PREFIX dc: <http://purl.org/dc/elements/1.1/>
PREFIX nando: <http://nanbyodata.jp/ontology/NANDO_>

SELECT DISTINCT ?dna STR(?label) AS ?gene_label ?hp STR(?id)AS ?gene_id ?ncbi_gene ?nando
WHERE{
  VALUES ?nando { nando:{{nando_id}} }
  graph <http://metadb.riken.jp/db/dna_diseaseID>{
    ?dna <http://purl.obolibrary.org/obo/RO_0003301> ?nando.}
  graph <http://metadb.riken.jp/db/xsearch_dnabank_brso>{
    ?dna rdfs:label ?label;
         foaf:homepage ?hp;
         dct:identifier ?id;
         brso:genomic_feature ?B.
    ?B   brso:has_genomic_segment ?B1.
    ?B1  rdfs:seeAlso ?ncbi_gene.}
}
```

## Endpoint

https://pubcasefinder-rdf.dbcls.jp/sparql

## `result` retrieve a NANDO class

```sparql
PREFIX : <http://nanbyodata.jp/ontology/nando#>
PREFIX nando: <http://nanbyodata.jp/ontology/NANDO_>
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX obo: <http://purl.obolibrary.org/obo/>
PREFIX oboInOwl: <http://www.geneontology.org/formats/oboInOwl#>
PREFIX mondo: <http://purl.obolibrary.org/obo/mondo#>
PREFIX nando: <http://nanbyodata.jp/ontology/NANDO_>

SELECT DISTINCT ?nando ?nando_id ?label_ja ?label_hira ?label_en ?alt_label_ja ?alt_label_en ?notification_number 
                ?source ?description ?mondo ?mondo_id ?mondo_description ?site ?db_xref
WHERE {
  ?nando a owl:Class ;
    dcterms:identifier "NANDO:{{nando_id}}" .
  OPTIONAL {
    ?nando rdfs:label ?label_ja
    FILTER(LANG(?label_ja) = 'ja')
  }
  OPTIONAL {
    ?nando rdfs:label ?label_hira
    FILTER(LANG(?label_hira) = 'ja-hira')
  }
  OPTIONAL {
    ?nando rdfs:label ?label_en
    FILTER(LANG(?label_en) = 'en')
  }
  OPTIONAL {
    ?nando skos:altLabel ?alt_label_en
    FILTER(LANG(?alt_label_en) = 'en')
  }
  OPTIONAL {
    ?nando skos:altLabel ?alt_label_ja
    FILTER(LANG(?alt_label_ja) = 'ja')
  }
  OPTIONAL {
    ?nando dcterms:source ?source 
  }
  OPTIONAL {
    ?nando nando:hasNotificationNumber ?notification_number
  }
  OPTIONAL {
    ?nando dcterms:description ?description  
  }
  OPTIONAL {
    ?nando skos:closeMatch ?mondo .
    ?mondo oboInOwl:id ?mondo_id .
    ?mondo skos:exactMatch ?db_xref .
    ?mondo obo:IAO_0000115 ?mondo_description
  }
  OPTIONAL {
    ?nando rdfs:seeAlso ?site
  }
  BIND({{nando_id}} AS ?nando_id)
}
```

## Output

```javascript
({
  json({result, medgen, gene, inheritance, phenotype, cell, mouse, dna, genetesting}) {
    let rows = result.results.bindings;
    let medgen_rows = medgen.results.bindings;
    let gene_rows = gene.results.bindings;
    let inheritance_rows = inheritance.results.bindings;
    let phenotype_rows = phenotype.results.bindings;
    let cell_rows = cell.results.bindings;
    let mouse_rows = mouse.results.bindings;
    let dna_rows = dna.results.bindings;
    let genetesting_rows = genetesting.results.bindings;
    let data = {};
    let mondo_ids = [];
    let db_xrefs = [];
    let mondo_decs = [];
    let orpha_ids = [];
    let omim_ids = [];
    let gene_uris = [];
    let inheritance_uris = [];
    
    for (let i = 0; i < rows.length ;i++) {
      if (rows[i].nando_id) {
        data.nando_id = rows[i].nando_id.value;
      };
      if (rows[i].label_en) {
        data.label_en = rows[i].label_en.value;
      };
      if (rows[i].label_ja) {   
        data.label_ja = rows[i].label_ja.value;
      };
      if (rows[i].label_hira) {
        data.ruby = rows[i].label_hira.value;
      };
      if (rows[i].alt_label_en) {
        if (data.alt_label_en) {
          if (!data.alt_label_en.includes(rows[i].alt_label_en.value)) {
            data.alt_label_en.push(rows[i].alt_label_en.value);
          }
        } else {
          data.alt_label_en = [rows[i].alt_label_en.value];
        }
      };
      if (rows[i].alt_label_ja) {
        if (data.alt_label_ja) {
          if (!data.alt_label_ja.includes(rows[i].alt_label_ja.value)) {
            data.alt_label_ja.push(rows[i].alt_label_ja.value);
          }
        } else {
          data.alt_label_ja = [rows[i].alt_label_ja.value];
        }
      };
      if (rows[i].notification_number) {
        data.notification_number = rows[i].notification_number.value;
      };
      if (rows[i].description) {
        data.description = rows[i].description.value;
      };
      if (rows[i].source) {
        data.source = rows[i].source.value;
      };
      if (rows[i].site) {
        switch (true) {
          case /nanbyou/.test(rows[i].site.value):
            data.nanbyou = {id: rows[i].site.value.split("/").slice(-1)[0],
                            url: rows[i].site.value};
            break;
          case /mhlw/.test(rows[i].site.value):
            data.mhlw = {id: rows[i].site.value.split("/").slice(-1)[0],
                             url: rows[i].site.value};
            break;
          case /shouman/.test(rows[i].site.value):
            data.shouman = {id: rows[i].site.value.split("/").slice(-2)[0],
                            url: rows[i].site.value};
            break;
          case /kegg/.test(rows[i].site.value):
            data.kegg = {id: rows[i].site.value.split("/").slice(-1)[0].replace('www_bget?ds_ja:',''),
                            url: rows[i].site.value};
            break;
          case /UR-DBMS/.test(rows[i].site.value):
            data.urdbms = {id: rows[i].site.value.split("/").slice(-1)[0].replace('SyndromeDetail.php?winid=1&recid=',''),
                            url: rows[i].site.value};
            break;
        }
      }
      if (rows[i].mondo) {
        if (data.mondos) {
          if (!mondo_ids.includes(rows[i].mondo_id.value)) {
           data.mondos.push({url: rows[i].mondo_id.value.replace("MONDO:", "https://monarchinitiative.org/MONDO:"), id: rows[i].mondo_id.value});
            mondo_ids.push(rows[i].mondo_id.value);
          }
        } else {
          data.mondos = [];
          data.mondos.push({url: rows[i].mondo_id.value.replace("MONDO:", "https://monarchinitiative.org/MONDO:"), id: rows[i].mondo_id.value});
          mondo_ids.push(rows[i].mondo_id.value);
        }
        if (rows[i].db_xref) {
          db_xref_uri = rows[i].db_xref.value ;
          if (data.db_xrefs) {
            if (db_xref_uri.match(/Orphanet_/)) {
              if (!orpha_ids.includes(db_xref_uri)) {
                data.db_xrefs.orphanet.push({url: db_xref_uri, id: db_xref_uri.split("/").slice(-1)[0].replace('Orphanet_','')});
                orpha_ids.push(db_xref_uri) ;
              }
            } else if (db_xref_uri.match(/omim/)) {
              if (!omim_ids.includes(db_xref_uri)) {
                data.db_xrefs.omim.push({url: db_xref_uri.replace('omim','mim'), id: db_xref_uri.split("/").slice(-1)[0]});
                omim_ids.push(db_xref_uri);
              }
            }
          } else {
            data.db_xrefs = {orphanet: [], omim: []};
            if (db_xref_uri.match(/Orphanet_/)) {
              data.db_xrefs.orphanet.push({url: db_xref_uri, id: db_xref_uri.split("/").slice(-1)[0].replace('Orphanet_','')});
              orpha_ids.push(db_xref_uri);
            } else if (db_xref_uri.match(/omim/)) {
              data.db_xrefs.omim.push({url: db_xref_uri.replace('omim','mim'), id: db_xref_uri.split("/").slice(-1)[0]});
              omim_ids.push(db_xref_uri);
            }
          }
        }
        if (data.mondo_decs) {
          if (!mondo_decs.includes(rows[i].mondo_description.value)) {
            data.mondo_decs.push({url: rows[i].mondo.value, id: rows[i].mondo_description.value});
            mondo_decs.push(rows[i].mondo_description.value);
          }
        } else {
          data.mondo_decs = [];
          data.mondo_decs.push({url: rows[i].mondo.value, id: rows[i].mondo_description.value});
          mondo_decs.push(rows[i].mondo_description.value);
        }
      }
    }
    
    let medgen_data = [];
    
    if (medgen_rows.length > 0) {
      for (let i = 0; i < medgen_rows.length; i++ ) {
        medgen_data.push({medgen: medgen_rows[i].medgen.value});
        medgen_data[i].medgen_id = medgen_rows[i].medgen.value.split("/").slice(-1)[0];
        medgen_data[i].concept = medgen_rows[i].concept.value;
        medgen_data[i].concept_id = medgen_rows[i].concept_id.value;
        medgen_data[i].concept_name = medgen_rows[i].concept_name.value;
        medgen_data[i].definition = medgen_rows[i].definition.value;
        medgen_data[i].labels = Array.from(new Set(medgen_rows[i].labels.value.split(":")));
        if (medgen_data[i].labels.indexOf(medgen_rows[i].concept_name.value) != -1) {
          medgen_data[i].labels.splice(medgen_data[i].labels.indexOf(medgen_rows[i].concept_name.value), 1);
        }
      }
      if (data.alt_label_en) {
        for (let i = 0; i < medgen_data[0].labels.length; i++) {
          if (!data.alt_label_en.includes(medgen_data[0].labels[i])) {
            data.alt_label_en.push(medgen_data[0].labels[i]);
          }
        }
      } else {
        data.alt_label_en = [];
        for (let i = 0; i < medgen_data[0].labels.length; i++) {
          data.alt_label_en.push(medgen_data[0].labels[i]);
        }
      }

      data.medgen_id = medgen_data[0].medgen_id;
      data.medgen_uri = medgen_data[0].medgen;
      data.concept = medgen_data[0].concept;
      data.concept_name = medgen_data[0].concept_name;
      data.concept_id = medgen_data[0].concept_id;
      data.medgen_definition = medgen_data[0].definition;
    }
    
    if (gene_rows.length > 0) {
      for (let i = 0; i < gene_rows.length; i++ ) {
        gene_uri = gene_rows[i].gene.value
        hgnc_gene_symbol = gene_rows[i].hgnc_gene_symbol.value
        if (data.gene_uris) {
          if (!gene_uris.includes(gene_uri)) {
            //data.gene_uris.push({uri: gene_uri, id: gene_uri.split("/").slice(-1)[0]});
            data.gene_uris.push({uri: gene_uri, id: hgnc_gene_symbol});
            gene_uris.push(gene_uri);
          }
        } else {
          data.gene_uris = [];
          //data.gene_uris.push({uri: gene_uri, id: gene_uri.split("/").slice(-1)[0]});
          data.gene_uris.push({uri: gene_uri, id: hgnc_gene_symbol});
          gene_uris.push(gene_uri);
        }
      }
    }

    if (inheritance_rows.length > 0) {
      for (let i = 0; i < inheritance_rows.length; i++ ) {
        inheritance_uri = inheritance_rows[i].inheritance.value
        inheritance_ja = inheritance_rows[i].inheritance_ja.value
        if (data.inheritance_uris) {
          if (!inheritance_uris.includes(inheritance_uri)) {
            data.inheritance_uris.push({uri: inheritance_uri, id: inheritance_ja});
            inheritance_uris.push(inheritance_uri);
          }
        } else {
          data.inheritance_uris = [];
          data.inheritance_uris.push({uri: inheritance_uri, id: inheritance_ja});
          inheritance_uris.push(inheritance_uri);
        }
      }
    }
    
    
    if (phenotype_rows.length > 0) {
      for (let i = 0; i < phenotype_rows.length; i++ ) {
        phenotype_category = phenotype_rows[i].hpo_category.value
        phenotype_category_en = phenotype_rows[i].hpo_category_name_en.value
        //phenotype_category_ja = phenotype_rows[i].hpo_category_name_ja.value
        if(phenotype_rows[i].hpo_category_name_ja) {
          phenotype_category_en = phenotype_rows[i].hpo_category_name_ja.value
        }
        phenotype_id = phenotype_rows[i].hpo_id.value
        phenotype_url = phenotype_rows[i].hpo_url.value
        phenotype_label_en = phenotype_rows[i].hpo_label_en.value
        //phenotype_label_ja = phenotype_rows[i].hpo_label_ja.value
        if(phenotype_rows[i].hpo_label_ja) {
          phenotype_label_en = phenotype_rows[i].hpo_label_ja.value
        }
        
        switch (true) {
          case /HP_0025354/.test(phenotype_category):
            data.phenotype_flg = phenotype_category_en
            data.phenotype_HP_0025354_label = phenotype_category_en
            if (data.phenotype_HP_0025354) {
              data.phenotype_HP_0025354.push({uri: phenotype_url, id: phenotype_label_en});
            } else {
              data.phenotype_HP_0025354 = [];
              data.phenotype_HP_0025354.push({uri: phenotype_url, id: phenotype_label_en});
            }
            break;
          case /HP_0040064/.test(phenotype_category):
            data.phenotype_flg = phenotype_category_en
            data.phenotype_HP_0040064_label = phenotype_category_en
            if (data.phenotype_HP_0040064) {
              data.phenotype_HP_0040064.push({uri: phenotype_url, id: phenotype_label_en});
            } else {
              data.phenotype_HP_0040064 = [];
              data.phenotype_HP_0040064.push({uri: phenotype_url, id: phenotype_label_en});
            }
            break;
          case /HP_0025031/.test(phenotype_category):
            data.phenotype_flg = phenotype_category_en
            data.phenotype_HP_0025031_label = phenotype_category_en
            if (data.phenotype_HP_0025031) {
              data.phenotype_HP_0025031.push({uri: phenotype_url, id: phenotype_label_en});
            } else {
              data.phenotype_HP_0025031 = [];
              data.phenotype_HP_0025031.push({uri: phenotype_url, id: phenotype_label_en});
            }
            break;
          case /HP_0045027/.test(phenotype_category):
            data.phenotype_flg = phenotype_category_en
            data.phenotype_HP_0045027_label = phenotype_category_en
            if (data.phenotype_HP_0045027) {
              data.phenotype_HP_0045027.push({uri: phenotype_url, id: phenotype_label_en});
            } else {
              data.phenotype_HP_0045027 = [];
              data.phenotype_HP_0045027.push({uri: phenotype_url, id: phenotype_label_en});
            }
            break;
          case /HP_0025142/.test(phenotype_category):
            data.phenotype_flg = phenotype_category_en
            data.phenotype_HP_0025142_label = phenotype_category_en
            if (data.phenotype_HP_0025142) {
              data.phenotype_HP_0025142.push({uri: phenotype_url, id: phenotype_label_en});
            } else {
              data.phenotype_HP_0025142 = [];
              data.phenotype_HP_0025142.push({uri: phenotype_url, id: phenotype_label_en});
            }
            break;
          case /HP_0000769/.test(phenotype_category):
            data.phenotype_flg = phenotype_category_en
            data.phenotype_HP_0000769_label = phenotype_category_en
            if (data.phenotype_HP_0000769) {
              data.phenotype_HP_0000769.push({uri: phenotype_url, id: phenotype_label_en});
            } else {
              data.phenotype_HP_0000769 = [];
              data.phenotype_HP_0000769.push({uri: phenotype_url, id: phenotype_label_en});
            }
            break;
          case /HP_0001939/.test(phenotype_category):
            data.phenotype_flg = phenotype_category_en
            data.phenotype_HP_0001939_label = phenotype_category_en
            if (data.phenotype_HP_0001939) {
              data.phenotype_HP_0001939.push({uri: phenotype_url, id: phenotype_label_en});
            } else {
              data.phenotype_HP_0001939 = [];
              data.phenotype_HP_0001939.push({uri: phenotype_url, id: phenotype_label_en});
            }
            break;
          case /HP_0002715/.test(phenotype_category):
            data.phenotype_flg = phenotype_category_en
            data.phenotype_HP_0002715_label = phenotype_category_en
            if (data.phenotype_HP_0002715) {
              data.phenotype_HP_0002715.push({uri: phenotype_url, id: phenotype_label_en});
            } else {
              data.phenotype_HP_0002715 = [];
              data.phenotype_HP_0002715.push({uri: phenotype_url, id: phenotype_label_en});
            }
            break;
          case /HP_0000818/.test(phenotype_category):
            data.phenotype_flg = phenotype_category_en
            data.phenotype_HP_0000818_label = phenotype_category_en
            if (data.phenotype_HP_0000818) {
              data.phenotype_HP_0000818.push({uri: phenotype_url, id: phenotype_label_en});
            } else {
              data.phenotype_HP_0000818 = [];
              data.phenotype_HP_0000818.push({uri: phenotype_url, id: phenotype_label_en});
            }
            break;
          case /HP_0001197/.test(phenotype_category):
            data.phenotype_flg = phenotype_category_en
            data.phenotype_HP_0001197_label = phenotype_category_en
            if (data.phenotype_HP_0001197) {
              data.phenotype_HP_0001197.push({uri: phenotype_url, id: phenotype_label_en});
            } else {
              data.phenotype_HP_0001197 = [];
              data.phenotype_HP_0001197.push({uri: phenotype_url, id: phenotype_label_en});
            }
            break;
          case /HP_0002086/.test(phenotype_category):
            data.phenotype_flg = phenotype_category_en
            data.phenotype_HP_0002086_label = phenotype_category_en
            if (data.phenotype_HP_0002086) {
              data.phenotype_HP_0002086.push({uri: phenotype_url, id: phenotype_label_en});
            } else {
              data.phenotype_HP_0002086 = [];
              data.phenotype_HP_0002086.push({uri: phenotype_url, id: phenotype_label_en});
            }
            break;
          case /HP_0001608/.test(phenotype_category):
            data.phenotype_flg = phenotype_category_en
            data.phenotype_HP_0001608_label = phenotype_category_en
            if (data.phenotype_HP_0001608) {
              data.phenotype_HP_0001608.push({uri: phenotype_url, id: phenotype_label_en});
            } else {
              data.phenotype_HP_0001608 = [];
              data.phenotype_HP_0001608.push({uri: phenotype_url, id: phenotype_label_en});
            }
            break;
          case /HP_0001574/.test(phenotype_category):
            data.phenotype_flg = phenotype_category_en
            data.phenotype_HP_0001574_label = phenotype_category_en
            if (data.phenotype_HP_0001574) {
              data.phenotype_HP_0001574.push({uri: phenotype_url, id: phenotype_label_en});
            } else {
              data.phenotype_HP_0001574 = [];
              data.phenotype_HP_0001574.push({uri: phenotype_url, id: phenotype_label_en});
            }
            break;
          case /HP_0001626/.test(phenotype_category):
            data.phenotype_flg = phenotype_category_en
            data.phenotype_HP_0001626_label = phenotype_category_en
            if (data.phenotype_HP_0001626) {
              data.phenotype_HP_0001626.push({uri: phenotype_url, id: phenotype_label_en});
            } else {
              data.phenotype_HP_0001626 = [];
              data.phenotype_HP_0001626.push({uri: phenotype_url, id: phenotype_label_en});
            }
            break;
          case /HP_0001507/.test(phenotype_category):
            data.phenotype_flg = phenotype_category_en
            data.phenotype_HP_0001507_label = phenotype_category_en
            if (data.phenotype_HP_0001507) {
              data.phenotype_HP_0001507.push({uri: phenotype_url, id: phenotype_label_en});
            } else {
              data.phenotype_HP_0001507 = [];
              data.phenotype_HP_0001507.push({uri: phenotype_url, id: phenotype_label_en});
            }
            break;
          case /HP_0002664/.test(phenotype_category):
            data.phenotype_flg = phenotype_category_en
            data.phenotype_HP_0002664_label = phenotype_category_en
            if (data.phenotype_HP_0002664) {
              data.phenotype_HP_0002664.push({uri: phenotype_url, id: phenotype_label_en});
            } else {
              data.phenotype_HP_0002664 = [];
              data.phenotype_HP_0002664.push({uri: phenotype_url, id: phenotype_label_en});
            }
            break;
          case /HP_0000119/.test(phenotype_category):
            data.phenotype_flg = phenotype_category_en
            data.phenotype_HP_0000119_label = phenotype_category_en
            if (data.phenotype_HP_0000119) {
              data.phenotype_HP_0000119.push({uri: phenotype_url, id: phenotype_label_en});
            } else {
              data.phenotype_HP_0000119 = [];
              data.phenotype_HP_0000119.push({uri: phenotype_url, id: phenotype_label_en});
            }
            break;
          case /HP_0000478/.test(phenotype_category):
            data.phenotype_flg = phenotype_category_en
            data.phenotype_HP_0000478_label = phenotype_category_en
            if (data.phenotype_HP_0000478) {
              data.phenotype_HP_0000478.push({uri: phenotype_url, id: phenotype_label_en});
            } else {
              data.phenotype_HP_0000478 = [];
              data.phenotype_HP_0000478.push({uri: phenotype_url, id: phenotype_label_en});
            }
            break;
          case /HP_0000707/.test(phenotype_category):
            data.phenotype_flg = phenotype_category_en
            data.phenotype_HP_0000707_label = phenotype_category_en
            if (data.phenotype_HP_0000707) {
              data.phenotype_HP_0000707.push({uri: phenotype_url, id: phenotype_label_en});
            } else {
              data.phenotype_HP_0000707 = [];
              data.phenotype_HP_0000707.push({uri: phenotype_url, id: phenotype_label_en});
            }
            break;
          case /HP_0003011/.test(phenotype_category):
            data.phenotype_flg = phenotype_category_en
            data.phenotype_HP_0003011_label = phenotype_category_en
            if (data.phenotype_HP_0003011) {
              data.phenotype_HP_0003011.push({uri: phenotype_url, id: phenotype_label_en});
            } else {
              data.phenotype_HP_0003011 = [];
              data.phenotype_HP_0003011.push({uri: phenotype_url, id: phenotype_label_en});
            }
            break;
          case /HP_0003549/.test(phenotype_category):
            data.phenotype_flg = phenotype_category_en
            data.phenotype_HP_0003549_label = phenotype_category_en
            if (data.phenotype_HP_0003549) {
              data.phenotype_HP_0003549.push({uri: phenotype_url, id: phenotype_label_en});
            } else {
              data.phenotype_HP_0003549 = [];
              data.phenotype_HP_0003549.push({uri: phenotype_url, id: phenotype_label_en});
            }
            break;
          case /HP_0000598/.test(phenotype_category):
            data.phenotype_flg = phenotype_category_en
            data.phenotype_HP_0000598_label = phenotype_category_en
            if (data.phenotype_HP_0000598) {
              data.phenotype_HP_0000598.push({uri: phenotype_url, id: phenotype_label_en});
            } else {
              data.phenotype_HP_0000598 = [];
              data.phenotype_HP_0000598.push({uri: phenotype_url, id: phenotype_label_en});
            }
            break;
          case /HP_0001871/.test(phenotype_category):
            data.phenotype_flg = phenotype_category_en
            data.phenotype_HP_0001871_label = phenotype_category_en
            if (data.phenotype_HP_0001871) {
              data.phenotype_HP_0001871.push({uri: phenotype_url, id: phenotype_label_en});
            } else {
              data.phenotype_HP_0001871 = [];
              data.phenotype_HP_0001871.push({uri: phenotype_url, id: phenotype_label_en});
            }
            break;
          case /HP_0000152/.test(phenotype_category):
            data.phenotype_flg = phenotype_category_en
            data.phenotype_HP_0000152_label = phenotype_category_en
            if (data.phenotype_HP_0000152) {
              data.phenotype_HP_0000152.push({uri: phenotype_url, id: phenotype_label_en});
            } else {
              data.phenotype_HP_0000152 = [];
              data.phenotype_HP_0000152.push({uri: phenotype_url, id: phenotype_label_en});
            }
            break;
          case /HP_0000924/.test(phenotype_category):
            data.phenotype_flg = phenotype_category_en
            data.phenotype_HP_0000924_label = phenotype_category_en
            if (data.phenotype_HP_0000924) {
              data.phenotype_HP_0000924.push({uri: phenotype_url, id: phenotype_label_en});
            } else {
              data.phenotype_HP_0000924 = [];
              data.phenotype_HP_0000924.push({uri: phenotype_url, id: phenotype_label_en});
            }
            break;
        }
      }
    }

    if (cell_rows.length > 0) {
      for (let i = 0; i < cell_rows.length; i++ ) {
        cell_donor = cell_rows[i].donor.value
        data.cell = cell_donor
      }
    }    

    if (mouse_rows.length > 0) {
      for (let i = 0; i < mouse_rows.length; i++ ) {
        mouse_mouse = mouse_rows[i].mouse.value
        data.mus = mouse_mouse
      }
    }    

    if (dna_rows.length > 0) {
      for (let i = 0; i < dna_rows.length; i++ ) {
        dna_dna = dna_rows[i].dna.value
        data.dna = dna_dna
      }
    }    

    if (genetesting_rows.length > 0) {
      for (let i = 0; i < genetesting_rows.length; i++ ) {
        genetesting_hp = genetesting_rows[i].hp.value
        data.genetesting = genetesting_hp
      }
    }    

    return data;
  }
})
```

## Description
- 2024/04/03
- APIの差し替えにより、リネームをしました
- 現在NanbyouDataの表示で疾患のメタ情報を表示する部分に利用しています。
- 過去のUIからの変遷の結果、部分的に必要の無いパートがあるので、それについては調整を行います。
- 編集：高月　2024/01/12