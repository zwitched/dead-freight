'use strict';
// Places, cargo, upgrades, line repairs, radio lines and logbook notes.
const DATA=(()=>{
const LOC={
 depot:{name:'Hallow Junction',short:'Depot',tier:0},
 brick:{name:'Brickfield Sidings',short:'Brickfield',tier:1,slots:[['BFa','BF0',6],['BFb','BF0',6],['BFa','BF0',130]]},
 mercy:{name:'Mercy Grain Elevator',short:'Mercy',tier:1,slots:[['ME','M1',6],['Mb','M0',40],['ME','M1',150]]},
 glass:{name:'Harl & Sons Glassworks',short:'Glassworks',tier:2,need:'viaduct',slots:[['GA','G0',6],['GB','G0',6],['GA','G0',140]]},
 larch:{name:'Larch Cut',short:'Larch Cut',tier:3,need:'larch',slots:[['LA','L0',6],['LB','L0',6]]},
 quarry:{name:'Cobble Hill Quarry',short:'Cobble Hill',tier:3,need:'quarry',slots:[['QA','Q0',6],['QB','Q0',6],['QA','Q0',130]]},
 ferrow:{name:'Upper Ferrow',short:'Upper Ferrow',tier:4,need:'ferrow',slots:[['UFb','UF0',6],['UFa','UF0',6],['UFb','UF0',130]]}
};
// kind: open, hopper, van, flat, tank. m = load tonnes, v = value, fr = fragile, lo = loose
const CARGO={
 brick:[
  {n:'Fire bricks, 1987 batch',k:'open',ld:'bricks',m:30,v:60,d:'Still warm, apparently. They are not.'},
  {n:'Chimney pots, assorted',k:'open',ld:'pots',m:14,v:85,fr:.6,d:'Forty-one pots for chimneys that mostly fell down.'},
  {n:'Glazed clay pipe',k:'open',ld:'pipes',m:22,v:70,fr:.3,d:'Ordered for a sewer scheme in 1979. The town made do.'},
  {n:'Kiln door, cast iron',k:'flat',ld:'plate',m:26,v:95,d:'Heavy. Labelled "Do not open til Monday".'},
  {n:'Paving bricks, herringbone',k:'open',ld:'bricks',m:34,v:72,d:'Pre-sorted into a pattern by someone with time on their hands.'}
 ],
 mercy:[
  {n:'Seed barley, still dry',k:'hopper',ld:'grain',m:32,v:80,lo:.5,d:'Dry, somehow. The hopper roof is the best roof on the line.'},
  {n:'Sacks of layers mash',k:'van',ld:'sacks',m:20,v:62,d:'Chicken feed. The chickens have moved on.'},
  {n:'Harvester header',k:'flat',ld:'machine',m:16,v:115,fr:.2,d:'The front bit of a combine. Nobody knows where the rest went.'},
  {n:'Weighbridge weights',k:'open',ld:'weights',m:40,v:90,d:'Exactly 40 tonnes, certified, 1971.'},
  {n:'Oats, mostly',k:'hopper',ld:'grain',m:28,v:70,lo:.5,d:'Some barley in there too. Mercy never minded.'}
 ],
 glass:[
  {n:'Cobalt bottles in straw',k:'van',ld:'crates',m:12,v:165,fr:1,d:'Harl\'s blue. Very fragile, very blue.'},
  {n:'Lighthouse lens, part of one',k:'van',ld:'crates',m:9,v:270,fr:1,d:'Three rings of a lens for a lighthouse on a coast nobody here has visited.'},
  {n:'Cullet, mixed colours',k:'open',ld:'cullet',m:30,v:95,lo:.6,d:'Broken glass for melting. Breaking it more is fine.'},
  {n:'Greenhouse panes',k:'van',ld:'crates',m:14,v:185,fr:.9,d:'Enough for one very long greenhouse.'},
  {n:'Marbles, by the barrel',k:'van',ld:'crates',m:16,v:150,fr:.5,lo:.4,d:'Barrels of rejects. Each one slightly the wrong round.'}
 ],
 larch:[
  {n:'Larch logs, thirty years seasoned',k:'flat',ld:'logs',m:34,v:145,lo:.6,d:'Seasoned well past the point anyone planned.'},
  {n:'Telegraph poles, unused',k:'flat',ld:'poles',m:26,v:150,lo:.4,d:'For a phone line to a village that got a mast instead.'},
  {n:'Compressed sawdust',k:'hopper',ld:'dust',m:18,v:75,d:'Light, cheap and somehow the most flammable thing in the county.'},
  {n:'Fence posts, four thousand or so',k:'flat',ld:'posts',m:24,v:125,lo:.5,d:'Counted twice. Got different numbers both times.'}
 ],
 quarry:[
  {n:'Granite setts',k:'open',ld:'setts',m:44,v:175,d:'Cobbles for a high street that got tarmac in the end.'},
  {n:'Ballast, unclaimed',k:'hopper',ld:'ballast',m:46,v:135,lo:.3,d:'Track ballast. Possibly for this very railway.'},
  {n:'Crusher jaw',k:'flat',ld:'plate',m:42,v:225,d:'Two tonnes of teeth. Forty more of mounting.'},
  {n:'Gravel, sorted by size',k:'hopper',ld:'ballast',m:40,v:155,lo:.3,d:'Someone sorted this by hand. You can tell.'}
 ],
 ferrow:[
  {n:'Parcels nobody collected',k:'van',ld:'parcels',m:10,v:220,fr:.4,d:'Brown paper, string, 1990s postmarks.'},
  {n:'Station clock and benches',k:'van',ld:'crates',m:9,v:265,fr:.7,d:'The clock says 4:52. It has said that for a while.'},
  {n:'Twelve church pews',k:'van',ld:'crates',m:15,v:205,d:'Bound for a chapel that closed the same week as the line.'},
  {n:'Lost property, 1981 to 1996',k:'van',ld:'parcels',m:7,v:240,fr:.3,d:'Umbrellas, mostly. One trombone.'}
 ]
};
const LAST={n:'Mail van M2204',k:'mail',ld:'mail',m:12,v:900,fr:.5,d:'Christmas post, 1996. Still sealed. Still addressed.',last:1};
const UP={
 brakes:{name:'Brake blocks',desc:'Stronger loco brakes, and the wagon brakes get new hoses.',cost:[150,350,700],lv:['Worn','Relined','New shoes','Ex-mainline']},
 power:{name:'Traction motors',desc:'More pull at low speed and a heavier loco that grips better.',cost:[200,450,900],lv:['Tired','Rewound','Rebuilt','Overhauled']},
 tank:{name:'Fuel tank',desc:'Carry more diesel. Go further, come back heavier.',cost:[120,300,600],lv:['100 gal','135 gal','170 gal','210 gal']},
 sand:{name:'Sanders',desc:'Tap SAND to throw sand under the wheels for grip. Doses per shift.',cost:[180,320,520],lv:['None','3 doses','5 doses','8 doses']},
 coupler:{name:'Buffers & couplers',desc:'Softer buffers. Couple a bit faster without breaking anything.',cost:[120,280,550],lv:['Stiff','Greased','Sprung','Hydraulic']}
};
const REPAIR={
 viaduct:{name:'Kesh Viaduct',desc:'Replace the missing span. Opens the line north and Harl & Sons Glassworks.',cost:450,opens:'glass'},
 larch:{name:'Larch Cut',desc:'Clear the fallen larch off the branch. Wet rails up there.',cost:650,need:'viaduct',opens:'larch'},
 ferrow:{name:'Upper Ferrow points',desc:'Free the seized points at Upper Ferrow station.',cost:800,need:'viaduct',opens:'ferrow'},
 quarry:{name:'Cobble Hill landslip',desc:'Dig out the cutting to the quarry. Steep, heavy, worth it.',cost:1000,need:'viaduct',opens:'quarry'}
};
function spec(u){u=u||{};const b=u.brakes|0,p=u.power|0,t=u.tank|0,s=u.sand|0,c=u.coupler|0;
 return {Bl:[1000,1200,1450,1700][b],cb:[1,1.3,1.6,2][b],Fmax:[600,680,770,860][p],P:[16000,18500,21000,24000][p],ADH:[560,610,660,720][p],mass:[40,42,44,46][p],
  tank:[100,135,170,210][t],sand:[0,3,5,8][s],safe:[9,12,15,18][c]};}
const RADIO={
 start:['Morning. Kettle\'s on at Control. Mind how you go.','Dot here. Line\'s quiet. Line\'s always quiet.','Fuel\'s in, brakes are sort of in. Off you go.','Another shift, then. The trains will be pleased.'],
 slip:['She\'s slipping. Ease the throttle back a notch.','Wheels are spinning. Less throttle, more patience.'],
 stall:['You\'re not getting up there with that lot. Back down and take a run at it, or leave a wagon.'],
 roll:['You\'re rolling back. Brake, love.'],
 fuel25:['Quarter tank. Start thinking about home.'],fuel10:['Running on fumes. Head for the depot.'],
 hard:['That was a firm one. Whatever was in there has opinions now.','Bit brisk on the coupling there.'],
 soft:['Lovely. Barely heard that one.','Nice and gentle.'],
 curve:['Easy on the curves with a load on.','Load\'s shifting. Slow down on the bends.'],
 brakeHard:['Gentle with the brakes, there\'s glass back there.'],
 heavy:['Heavy train. She\'ll take longer to stop, so start early.'],
 home:['Depot\'s ahead. Plenty of brake, the shed wall is older than both of us.'],
 bar:{viaduct:'That\'s the viaduct. Or half of it. Repairs are on the depot board.',larch:'Tree across the Larch branch. Has been since the storm in \'97.',quarry:'Landslip on the Cobble Hill branch. It\'s on the board if you fancy paying for it.',ferrow:'Ferrow points are seized solid. Repair\'s on the board.'},
 locked:['Can\'t throw those, you\'re sitting on them.'],
 area:{brick:'Brickfield. Wagons on the left road usually.',mercy:'Mercy Bank\'s steep. Easy going down. Coming back up full is another thing.',glass:'Harl\'s. Everything there breaks if you look at it.',larch:'Leaves on the line up at Larch. You\'ll slip if you rush it.',quarry:'Cobble Hill. Heavy stuff, and it\'s all downhill home. Think about your brakes.',ferrow:'Upper Ferrow. End of the line. They used to have a band.'}
};
// logbook notes placed by the line; found by driving past
const NOTES=[
 {id:'roster',at:'depot',x:850,y:3330,t:'Shift roster by the shed door',b:'Last name on it is P. Varley, 6 October 1996. Nobody crossed it off, so technically he is still at work.'},
 {id:'kiln',at:'brick',x:1190,y:2700,t:'Chalk on a kiln door',b:'"Fired the 3rd. Do not open til Monday." Some Mondays take longer than others.'},
 {id:'ledger',at:'mercy',x:200,y:1500,t:'Elevator ledger',b:'412 tonnes in, every week of 1995. Out: a line through the column and the word "later".'},
 {id:'span',at:'viaduct',x:765,y:1780,t:'Tag on the viaduct',b:'"Condemned. Repair approved, funding to follow." The tag is from 1994. The funding was you.'},
 {id:'blue',at:'glass',x:1180,y:1330,t:'Rack of test bottles',b:'Thirty bottles, each a slightly different blue. The last one has a label: "Harl\'s blue. At last."'},
 {id:'post',at:'larch',x:300,y:770,t:'Carved fence post',b:'"D.H. + the 4:15". The 4:15 was a goods train. They seem to have been very happy.'},
 {id:'blast',at:'quarry',x:1150,y:560,t:'Blasting log',b:'Final entry: "Holding the last charge till the trains come back." The charge was handed in, says the next page. Good.'},
 {id:'clock',at:'ferrow',x:640,y:260,t:'Platform timetable',b:'Last train out, 16:50. The station clock stopped at 16:52. The mail van is still in the goods road.'}
];
return {LOC,CARGO,LAST,UP,REPAIR,spec,RADIO,NOTES};
})();
