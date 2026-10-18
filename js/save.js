'use strict';
// Persistent progress in localStorage. Everything survives reloads; a broken save falls back to a fresh one.
const SV=(()=>{
const KEY='deadfreight.v1';
function blank(){return {v:1,career:null,daily:{},set:{snd:1,vol:.8,buzz:1,marker:1},notes:[],
  stats:{shifts:0,wagons:0,tonnes:0,earned:0,dist:0,bestShift:0,heaviest:0,longest:0,soft:0,hard:0,tows:0,derails:0}};}
function newCareer(){return {day:1,cash:0,up:{},open:[],tut:0,ended:0,seed:(Math.random()*1e9)|0,lots:null,lotsDay:0,towFree:2};}
let D=blank();
function load(){try{const s=localStorage.getItem(KEY);if(s){const o=JSON.parse(s);D=Object.assign(blank(),o);D.set=Object.assign(blank().set,o.set||{});D.stats=Object.assign(blank().stats,o.stats||{});}}catch(e){D=blank();}return D;}
function save(){try{localStorage.setItem(KEY,JSON.stringify(D));}catch(e){}}
function reset(){D=blank();save();return D;}
return {load,save,reset,newCareer,get D(){return D}};
})();
