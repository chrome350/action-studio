import fs from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const css=`
/* grid-checkboxes:start */
aside input[type="checkbox"]{appearance:none;-webkit-appearance:none;display:inline-grid;place-content:center;flex:0 0 auto;width:16px;height:16px;margin:0;border:1px solid #ffffff40;border-radius:5px;background:#222424;box-shadow:inset 0 1px 2px #0003;vertical-align:middle;cursor:pointer;transition:background .15s,border-color .15s,box-shadow .15s}
aside input[type="checkbox"]:checked{background:linear-gradient(180deg,#a100ff,#6500d8);border-color:#b663ff;box-shadow:inset 0 1px 0 #ffffff30,0 1px 3px #0004}
aside input[type="checkbox"]::before{content:"";width:8px;height:5px;border-left:2px solid #fff;border-bottom:2px solid #fff;transform:translateY(-1px) rotate(-45deg);opacity:0}
aside input[type="checkbox"]:checked::before{opacity:1}
aside input[type="checkbox"]:hover:not(:disabled){border-color:#b77aff}
aside input[type="checkbox"]:focus-visible{outline:2px solid #c98aff;outline-offset:3px}
aside input[type="checkbox"]:disabled{opacity:.4;cursor:default}
aside label:has(>input[type="checkbox"]){cursor:pointer;min-height:24px;font-size:10px;color:#bcbcbc}
@media(max-width:960px){aside label:has(>input[type="checkbox"]){min-height:36px;font-size:11px}}
@media(prefers-reduced-motion:reduce){aside input[type="checkbox"]{transition:none}}
@media(forced-colors:active){aside input[type="checkbox"]{appearance:auto;-webkit-appearance:auto}aside input[type="checkbox"]::before{display:none}}
/* grid-checkboxes:end */
`;
for(const name of ['assets/index-DlFOVRFE.css','Grid Studio.html']){
 const file=new URL(name,root);let s=await fs.readFile(file,'utf8');s=s.replace(/\n?\/\* grid-checkboxes:start \*\/[\s\S]*?\/\* grid-checkboxes:end \*\//g,'');
 await fs.writeFile(file,name.endsWith('.css')?s+css:s.replace('</style>',css+'</style>'));
}
console.log('Shared purple checkbox styling updated in web and offline builds.');
