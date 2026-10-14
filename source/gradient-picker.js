/** Shared preset picker for Letters and Dot Matrix, matching the colour field. */
function GradientPicker({id,label,value,onChange}) {
  const [open,setOpen]=O.useState(false),[position,setPosition]=O.useState({left:12,top:12,width:300});
  const trigger=O.useRef(null),popup=O.useRef(null),dialogId=O.useId();
  const palettes=DotMatrixPalettes.filter(p=>p.id!=='spectrum');
  const selected=palettes.find(p=>p.id===value)||palettes[0];
  const background=p=>'linear-gradient(90deg,'+p.colors.join(',')+')';
  function close(){setOpen(false);trigger.current?.focus({preventScroll:true})}
  O.useLayoutEffect(()=>{
    if(!open)return;
    const place=()=>{
      const r=trigger.current.getBoundingClientRect(),viewport=window.visualViewport;
      const x=viewport?.offsetLeft||0,y=viewport?.offsetTop||0,w=viewport?.width||innerWidth,h=viewport?.height||innerHeight;
      const width=Math.min(300,w-24),height=Math.min(370,h-24);
      const left=r.left-width-12>=x+12?r.left-width-12:r.right-width;
      setPosition({left:Math.max(x+12,Math.min(left,x+w-width-12)),top:Math.max(y+12,Math.min(r.top,y+h-height-12)),width,maxHeight:height});
    };
    place();popup.current?.querySelector('[aria-checked=true]')?.focus({preventScroll:true});
    window.addEventListener('resize',place);window.addEventListener('scroll',place,true);
    window.visualViewport?.addEventListener('resize',place);
    return()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);window.visualViewport?.removeEventListener('resize',place)};
  },[open]);
  O.useEffect(()=>{
    if(!open)return;
    const outside=e=>{if(!popup.current?.contains(e.target)&&!trigger.current?.contains(e.target))setOpen(false)};
    document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);
  },[open]);
  function keyboard(e){
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return}
    const buttons=[...popup.current.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);
    if(e.key==='Tab'){e.preventDefault();buttons[(index+(e.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus();}
    if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
      e.preventDefault();const options=[...popup.current.querySelectorAll('[role=radio]')],i=options.indexOf(document.activeElement);
      options[e.key==='Home'?0:e.key==='End'?options.length-1:(i+(e.key==='ArrowUp'?-1:1)+options.length)%options.length]?.focus();
    }
  }
  return U.jsxs('div',{className:'gradient-control',children:[
    U.jsx('label',{htmlFor:id,className:'parameter-label',children:label}),
    U.jsxs('button',{id,ref:trigger,type:'button',className:'gradient-field','aria-label':label,'aria-haspopup':'dialog','aria-expanded':open,'aria-controls':open?dialogId:undefined,onClick:()=>setOpen(v=>!v),children:[
      U.jsx('span',{className:'gradient-swatch',style:{background:background(selected)},'aria-hidden':true}),
      U.jsx('span',{className:'gradient-name',children:selected.name}),
      U.jsx('svg',{width:16,height:16,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.5,'aria-hidden':true,children:U.jsx('path',{d:'m6 9 6 6 6-6'})})
    ]}),
    open&&gv.createPortal(U.jsxs('div',{id:dialogId,ref:popup,className:'gradient-popup',role:'dialog','aria-modal':true,'aria-label':'Выбор градиента',style:position,onKeyDown:keyboard,children:[
      U.jsxs('div',{className:'gradient-popup-heading',children:[U.jsx('strong',{children:'Градиент'}),U.jsx('button',{type:'button','aria-label':'Закрыть выбор градиента',onClick:close,children:'×'})]}),
      U.jsx('div',{className:'gradient-preview',style:{background:background(selected)},'aria-hidden':true}),
      U.jsx('div',{className:'gradient-options',role:'radiogroup','aria-label':'Стили градиента',children:palettes.map(p=>U.jsxs('button',{type:'button',role:'radio','aria-checked':p.id===selected.id,onClick:()=>{onChange(p.id);close()},children:[U.jsx('span',{className:'gradient-option-swatch',style:{background:background(p)},'aria-hidden':true}),U.jsx('span',{children:p.name}),U.jsx('span',{'aria-hidden':true,children:p.id===selected.id?'✓':''})]},p.id))})
    ]}),document.body)
  ]});
}
