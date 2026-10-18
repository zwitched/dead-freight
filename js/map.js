// The Hallow Junction network. Coordinates in track units (a wagon is 30 long). y grows south.
'use strict';
const MAP={
 W:1500,H:3640,
 nodes:{
  DB:[800,3500,-90,0], J1:[800,3100,-90,0],
  BF0:[1050,2850,-40,1], BFa:[1360,2660,146,1], BFb:[1320,2560,134,1],
  K1:[770,2500,-95,20], J2:[720,2160,-100,22],
  M0:[420,1990,-140,7], Ma:[302,1849,-133,6], Mb:[288,1863,-133,6], M1:[170,1720,-120,6], ME:[90,1380,80,6],
  V0:[712,1900,-90,22], V1:[712,1650,-90,22], J3:[712,1460,-90,22],
  G0:[990,1300,-20,22], GA:[1370,1215,170,22], GB:[1360,1125,158,22],
  J4:[684,1080,-95,24],
  L0:[420,930,-150,33], LA:[150,760,32,46], LB:[205,655,50,46],
  J5:[702,760,-85,26],
  Q0:[990,560,-30,37], QA:[1340,425,160,41], QB:[1300,330,148,41],
  UF0:[720,480,-88,27], UFa:[700,150,86,27], UFb:[772,165,99,27]
 },
 edges:[
  ['DB','J1',{area:'depot',route:'the depot',kind:'depot'}],
  ['J1','BF0',{route:'Brickfield'}], ['BF0','BFa',{kind:'siding',weeds:.5}], ['BF0','BFb',{kind:'siding',weeds:.7}],
  ['J1','K1',{route:'Main line'}], ['K1','J2'],
  ['J2','M0',{route:'Mercy'}], ['M0','Ma',{kind:'loop'}], ['Ma','M1',{kind:'loop'}], ['M0','Mb',{kind:'loop',weeds:.4}], ['Mb','M1',{kind:'loop',weeds:.4}],
  ['M1','ME',{kind:'siding',weeds:.6}],
  ['J2','V0',{route:'Kesh Viaduct'}], ['V0','V1',{bars:[8],barKey:'viaduct',kind:'bridge'}], ['V1','J3'],
  ['J3','G0',{route:'Harl Glassworks'}], ['G0','GA',{kind:'siding',weeds:.3}], ['G0','GB',{kind:'siding',weeds:.5}],
  ['J3','J4',{route:'Main line'}],
  ['J4','L0',{route:'Larch Cut',bars:[30],barKey:'larch',wet:.3}], ['L0','LA',{kind:'siding',wet:1,weeds:.8}], ['L0','LB',{kind:'siding',wet:1,weeds:.9}],
  ['J4','J5',{route:'Main line'}],
  ['J5','Q0',{route:'Cobble Hill',bars:[40],barKey:'quarry'}], ['Q0','QA',{kind:'siding',weeds:.2}], ['Q0','QB',{kind:'siding',weeds:.4}],
  ['J5','UF0',{route:'Upper Ferrow',bars:[40],barKey:'ferrow'}], ['UF0','UFa',{kind:'siding',weeds:.6}], ['UF0','UFb',{kind:'siding',weeds:.8}]
 ]
};
