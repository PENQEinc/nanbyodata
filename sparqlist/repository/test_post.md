# test-Fetch

## Parameters

* `sid` substance id
  * default: 57514+6521
  * example: 10+100+10000+10002+100033413+10008+1001+10011+100128927+10013+100131801+100134444+100144748+100151683+10019+10020+10021+100422910+10046+10049+100506658+10056+10058+10059+10060+10075+10082+10083+10084+10087+1009+10095+10102+10108+10111+10117+10126+10128+1013+10133+10134+10137+10142+10149+10157+10159+10161+10165+10166+1019+10194+10195+102+1020+10205+1021+10210+10216+10225+10229+10235+10243+10253+10262+10265+10269+1027+10273+10274+1028+10280+10283+1029+10290+10293+10295+10297+103+10300+10309+10312+10319+10320+10324+10329+10342+10345+10347+10352+10367+10369+10370+10371+10381+10382+10383+10395+10397+1041+10410+10413+10436+10456+10457+10459+10461+10463+10464+10466+10472+10479+10481+10483+10484+10491+1050+10516+10518+10519+10522+10525+105259599+10528+1053+10535+10555+10558+10559+1056+10560+10564+10568+10577+10584+10585+10586+10587+10588+10594+10599+10613+10616+10617+1062+1063+10641+10644+10653+10654+1066+10661+10664+10667+10681+10682+10683+10686+10695+10699+107+1071+10715+10716+10717+1073+10730+107305681+10733+10734+10735+10743+10747+10749+1075+10750+10758+10765+10771+10785+10786+1080+10801+10804+10806+10815+10841+10842+10845+10846+10847+10861+10878+10892+109+10907+10908+10913+10916+10939+10940+109580095+10978+10982+10984+10999+11005+11011+11019+11020+11023+1103+11041+11043+1105+1106+1107+11078+1108+11081+1109+11093+111+11107+11113+11128+11132+11133+11136+11141+11146+11149+11151+11152+11154+11155+1116+11160+11178+1118+11181+11190+112+1120+11200+1121+11212+11213+11216+11222+11224+1123+11231+11232+11234+11235+11236+112476+11253+112609+11261+11274+112744+112752+112755+11277+11280+112802+11281+112812+112817+11284+11285+112858+112939+1130+1131+11311+11315+113179+113189+11322+113235+113246+113263+113278+11330+1134+11340+11342+113457+1135+1136+113612+1137+1138+1139+1140+114034+1141+114327+1144+1145+114548+1146+114609+114625+1147+114798+114803+114902+114928+115286+115399+1154+115650+115908+115948+116085+1161+116150+116228+116369+116442+116461+116519+117144+117155+117156+1174+1175+117531+117581+118+1180+1181+1183+1184+118429+118+1187+1188+118813+118856+1193+119559+120+1200+1201+120227+1203+120892+121214+121278+1213+121340+121391+121512+122042+122402+122481+122553+122622+122961+123016+123041+123263+1234+123606+123624+123872+124093+1244+124404+124454+124512+124583+124590+124842+124976+124997+125+125336+1258+1259+125988+126+1261+126129+126326+126328+126410+126695+126792+1272+127534+1277+1278+127833+1280+1281
## Output
```javascript

async ({ sid })=>{
    console.log({ sid });
    const options = {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };

    try{
      //var url = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/substance/sid/' + sid + '/synonyms/JSON';
      var url = 'https://pubcasefinder.dbcls.jp/sparqlist/api/pcf_filter_get_omim_id_by_multi_ncbi_gene_id?ncbi_gene_id=' + sid;
      
      console.log(url);
      
      var res = await fetch(url, options).then(res=>res.json());
      return res;
    }catch(error){
      console.log(error);
    }
};
```