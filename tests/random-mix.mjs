import assert from 'node:assert/strict';
import {chooseMixedEffect} from '../source/random-mix.js';
let seed=12345;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const modes=['ribbons','dotmatrix','clean','letters'];
let before=0,after=0,edges=0;const used=new Set();
for(let trial=0;trial<300;trial++){
 const cells={},old={},order=Array.from({length:36},(_,i)=>i);
 for(let n=35;n>0;n--){const j=Math.floor(random()*(n+1));[order[n],order[j]]=[order[j],order[n]];}
 for(const index of order){
  cells[index]={mode:chooseMixedEffect(modes,cells,index,6,undefined,random)};
  const weighted=['clean','clean','clean','ribbons','dotmatrix','letters'];old[index]={mode:weighted[Math.floor(random()*6)]};
  used.add(cells[index].mode);
 }
 for(let i=0;i<36;i++)for(const j of [i%6<5?i+1:-1,i<30?i+6:-1])if(j>=0){edges++;before+=old[i].mode===old[j].mode;after+=cells[i].mode===cells[j].mode;}
 for(let i=0;i<36;i++)assert.notEqual(chooseMixedEffect(modes,cells,i,6,cells[i].mode,random),cells[i].mode);
}
assert.equal(used.size,4);assert(after<before*.65);assert(after>0,'Some repeated neighbours remain possible');
assert.equal(chooseMixedEffect(['one'],{},0,1,'one',random),'one');
// End of one row must not count as a horizontal neighbour of the next row.
assert.equal(chooseMixedEffect(modes,{5:{mode:'clean'}},6,6,undefined,()=>.5),chooseMixedEffect(modes,{50:{mode:'clean'}},6,6,undefined,()=>.5));
console.log(`PASS: adjacent repeats ${(100*before/edges).toFixed(1)}% → ${(100*after/edges).toFixed(1)}%; all modes, cycle changes, row boundaries.`);
