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
SELECT DISTINCT
?s
?nando
?label
?label_en
?number
?num_of_2015
?num_of_2016
?num_of_2017
?num_of_2018
?num_of_2019
?num_of_2020
?num_of_2021
?num_of_2022

WHERE {
  GRAPH<https://pubcasefinder.dbcls.jp/rdf/ontology/nando> {
  ?s dcterms:identifier ?nando;
     rdfs:label ?label .
     FILTER (lang(?label) = "ja") .
  OPTIONAL {?s nando:hasNotificationNumber ?number.}
  ?s sio:SIO_000216 ?B_any .
  ?B_any nando:has_aYearOfStatistics ?any .
  ?any sio:SIO_000300 ?any_year .
  OPTIONAL { ?s rdfs:label ?label_en .
            FILTER (lang(?label_en) = "en")
  }
  OPTIONAL {
    ?s sio:SIO_000216 ?B1_2015 .
    ?B1_2015 nando:has_aYearOfStatistics ?B2_2015.
    ?B2_2015 sio:SIO_000300 2015 .
    ?B1_2015 nando:has_theNumberOfPatients ?B3_2015.
    ?B3_2015 sio:SIO_000300 ?num_of_participant_2015.
  }
  OPTIONAL {
    ?s sio:SIO_000216 ?B1_2016 .
    ?B1_2016 nando:has_aYearOfStatistics ?B2_2016.
    ?B2_2016 sio:SIO_000300 2016 .
    ?B1_2016 nando:has_theNumberOfPatients ?B3_2016.
    ?B3_2016 sio:SIO_000300 ?num_of_participant_2016.
  }
  OPTIONAL {
    ?s sio:SIO_000216 ?B1_2017 .
    ?B1_2017 nando:has_aYearOfStatistics ?B2_2017.
    ?B2_2017 sio:SIO_000300 2017 .
    ?B1_2017 nando:has_theNumberOfPatients ?B3_2017.
    ?B3_2017 sio:SIO_000300 ?num_of_participant_2017.
  }
  OPTIONAL {
    ?s sio:SIO_000216 ?B1_2018 .
    ?B1_2018 nando:has_aYearOfStatistics ?B2_2018.
    ?B2_2018 sio:SIO_000300 2018 .
    ?B1_2018 nando:has_theNumberOfPatients ?B3_2018.
    ?B3_2018 sio:SIO_000300 ?num_of_participant_2018.
  }
  OPTIONAL {
    ?s sio:SIO_000216 ?B1_2019 .
    ?B1_2019 nando:has_aYearOfStatistics ?B2_2019.
    ?B2_2019 sio:SIO_000300 2019 .
    ?B1_2019 nando:has_theNumberOfPatients ?B3_2019.
    ?B3_2019 sio:SIO_000300 ?num_of_participant_2019.
  }
  OPTIONAL {
    ?s sio:SIO_000216 ?B1_2020 .
    ?B1_2020 nando:has_aYearOfStatistics ?B2_2020.
    ?B2_2020 sio:SIO_000300 2020 .
    ?B1_2020 nando:has_theNumberOfPatients ?B3_2020.
    ?B3_2020 sio:SIO_000300 ?num_of_participant_2020.
  }
   OPTIONAL {
    ?s sio:SIO_000216 ?B1_2021 .
    ?B1_2021 nando:has_aYearOfStatistics ?B2_2021.
    ?B2_2021 sio:SIO_000300 2021 .
    ?B1_2021 nando:has_theNumberOfPatients ?B3_2021.
    ?B3_2021 sio:SIO_000300 ?num_of_participant_2021.
  } 
    OPTIONAL {
    ?s sio:SIO_000216 ?B1_2022 .
    ?B1_2022 nando:has_aYearOfStatistics ?B2_2022.
    ?B2_2022 sio:SIO_000300 2022 .
    ?B1_2022 nando:has_theNumberOfPatients ?B3_2022.
    ?B3_2022 sio:SIO_000300 ?num_of_participant_2022.
  }  
  BIND(IF(bound(?num_of_participant_2015), ?num_of_participant_2015, '-') AS ?num_of_2015)
  BIND(IF(bound(?num_of_participant_2016), ?num_of_participant_2016, '-') AS ?num_of_2016)
  BIND(IF(bound(?num_of_participant_2017), ?num_of_participant_2017, '-') AS ?num_of_2017)
  BIND(IF(bound(?num_of_participant_2018), ?num_of_participant_2018, '-') AS ?num_of_2018)
  BIND(IF(bound(?num_of_participant_2019), ?num_of_participant_2019, '-') AS ?num_of_2019)
  BIND(IF(bound(?num_of_participant_2020), ?num_of_participant_2020, '-') AS ?num_of_2020)
  BIND(IF(bound(?num_of_participant_2021), ?num_of_participant_2021, '-') AS ?num_of_2021)
  BIND(IF(bound(?num_of_participant_2022), ?num_of_participant_2021, '-') AS ?num_of_2022) 
}
}
ORDER BY ?nando

```
## Output

```javascript
({result}) => {
  let tree = [];
  result.results.bindings.forEach(d => {
    tree.push({
      s: d.s.value,
      nando: d.nando.value,
      label: d.label.value,
      label_en: d.label_en.value,
      number: Number(d.number.value),
      num_of_2015: Number(d.num_of_2015.value),
      num_of_2016: Number(d.num_of_2016.value),
      num_of_2017: Number(d.num_of_2017.value),
      num_of_2018: Number(d.num_of_2018.value),
      num_of_2019: Number(d.num_of_2019.value),
      num_of_2020: Number(d.num_of_2020.value),
      num_of_2021: Number(d.num_of_2021.value),
      num_of_2022: Number(d.num_of_2022.value),
    });
  });
  return tree;
};

```
## Description
- 2024/03/21 タイトルを変更しました。旧："nanbyoData_the_number_of_patients_list"
- 2024/03/13 タイトルを修正して新規に作成、患者数のデータを2021年、2022年を追加しました。
- NanbyoDataで希少難病疾患の患者数を表示させるために利用しているSPARQListです。
- RDFのデータは高月の方で作成し、PubcaseFinderのエンドポイントにデータはあります。
- 編集：高月（2024/01/12)
