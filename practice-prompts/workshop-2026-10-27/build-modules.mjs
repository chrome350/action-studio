import{build}from'esbuild';
const out='practice-prompts/workshop-2026-10-27/materials/';
for(const[name,globalName,contents]of[
['action-core.js','ActionEffect',"export{applyBase,preparePixels}from './source/clean-effect.ts';export{gridBlurPlane}from './source/blur-plane.js';"],
['action-animation.js','ActionAnimation',"import{prepareGlow,draw}from './source/clean-effect.ts';import{gridBlurPlane}from './source/blur-plane.js';export function prepare(frame,pixels,contrast=100){return prepareGlow(pixels,frame.data,frame.width,frame.height,contrast/100,1,gridBlurPlane,'#07080B')}export{draw};"],
['ribbons-core.js','RibbonsEffect',"export{ribbonPixels,prepareRibbonSource,renderRibbonStretch}from './source/ribbon-stretch.js';"],
['foreground-core.js','ForegroundEffect',"export{gridForegroundForEffects as prepare,gridRemovePaperGlow as removePaperGlow}from './source/adaptive-tone.js';"]])await build({stdin:{contents,resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'iife',globalName,target:'es2022',outfile:out+name});
