import fs from 'node:fs/promises';
import path from 'node:path';
import {root} from './util.mjs';import {textRuns}from './text-runs.mjs';import {stripEventAttributes}from './artifact.mjs';

// Creator fixed-stage architecture, with pixel offsets and a separate toolbar.
// Model-authored content/styles are preserved. Execution/navigation is owned here.
export function runtimeDocument(html,{preview=false,fonts='',baseCSS='',style=null}={}){
 html=stripEventAttributes(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
 const css=`<style id="skillwalk-runtime-css">${fonts}
 html,body{margin:0!important;padding:0!important;width:100%!important;height:100%!important;overflow:hidden!important}
 *,*::before,*::after{box-sizing:border-box}
 #sw-viewport{position:fixed!important;inset:0!important;overflow:hidden!important;background:#10110f}
 #sw-stage{position:absolute!important;left:0!important;top:0!important;width:1920px!important;height:1080px!important;transform-origin:0 0!important;overflow:hidden!important;margin:0!important}
 #sw-stage{font-family:var(--font-body,Manrope),sans-serif}
 :where(#sw-stage h1,#sw-stage h2){font-family:var(--font-display,'Instrument Serif'),serif}
 #sw-stage>.slide{position:absolute!important;inset:0!important;width:1920px!important;height:1080px!important;min-width:0!important;min-height:0!important;max-width:none!important;max-height:none!important;margin:0!important;box-sizing:border-box!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;overflow:hidden!important}
 #sw-stage>.slide.active{visibility:visible!important;opacity:1!important;pointer-events:auto!important}
 .slide.active .reveal{opacity:1;transform:none}
 #sw-toolbar{position:fixed!important;bottom:0!important;left:0!important;width:100%!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;flex-wrap:wrap!important;padding:8px!important;background:#1b1c19!important;color:#eeede7!important;font:14px Manrope,sans-serif!important;border-top:1px solid #45463e!important;z-index:2147483647!important}
 #sw-toolbar button{position:static!important;transform:none!important;min-height:44px!important;min-width:44px!important;padding:8px!important;flex:none!important;background:#242520!important;color:#eeede7!important;border:1px solid #b8a36d!important;border-radius:6px!important;font:inherit!important;cursor:pointer!important}
 #sw-toolbar button:disabled{opacity:.45!important;cursor:default!important}
 #sw-toolbar button:focus-visible{outline:3px solid #b8a36d!important;outline-offset:2px!important}
 #sw-counter{font:inherit!important;white-space:nowrap!important;margin:0!important;position:static!important}
 [contenteditable=true]{outline:3px dashed #b8a36d;outline-offset:4px;cursor:text}
 @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
 </style>`;
 const js=`<script id="skillwalk-runtime">(()=>{const textRuns=${textRuns.toString()};(${controller.toString()})(${JSON.stringify({preview,style})});})();</script>`;
 if(baseCSS)html=html.replace(/<head([^>]*)>/i,'<head$1><style id="creator-viewport-base">'+baseCSS+'</style>');
 return html.replace(/<\/head>/i,css+'</head>').replace(/<\/body>/i,js+'</body>');
}

function controller({preview,style}){
 const runtimeSource=document.currentScript.outerHTML;
 const slides=[...document.querySelectorAll('section.slide')];
 const originalStage=slides[0]?.closest('.deck-stage');const stageClasses=slides[0]?.dataset.swStageClasses||originalStage?.className||'deck-stage';slides.forEach(s=>s.dataset.swStageClasses=stageClasses);
 const root=document.createElement('div');root.id='sw-viewport';
 const stage=document.createElement('main');stage.id='sw-stage';stage.className=[...new Set(('deck-stage '+stageClasses).split(/\s+/))].join(' ');
 slides.forEach(s=>stage.append(s));root.append(stage);document.body.replaceChildren(root);
 let index=0,editing=false,touchStart=null,lastWheel=0;
 const toolbar=document.createElement('nav');toolbar.id='sw-toolbar';toolbar.setAttribute('aria-label','Presentation controls');
 toolbar.innerHTML='<button type="button" id="sw-prev">Previous</button><span id="sw-counter" role="status" aria-live="polite"></span><button type="button" id="sw-next">Next</button><button type="button" id="sw-edit" aria-pressed="false">Edit</button><button type="button" id="sw-save">Save copy</button>';
 if(!preview)document.body.append(toolbar);
 const button=id=>toolbar.querySelector('#sw-'+id);
 function fit(){const height=Math.max(1,innerHeight-(preview?0:toolbar.getBoundingClientRect().height));const factor=Math.min(innerWidth/1920,height/1080);const x=(innerWidth-1920*factor)/2,y=(height-1080*factor)/2;stage.style.setProperty('transform',`translate(${x}px, ${y}px) scale(${factor})`,'important');root.style.setProperty('bottom',(preview?0:toolbar.getBoundingClientRect().height)+'px','important');}
 function show(n){index=Math.max(0,Math.min(slides.length-1,n));slides.forEach((s,i)=>{s.classList.toggle('active',i===index);s.classList.toggle('visible',i===index);s.setAttribute('aria-hidden',String(i!==index));s.inert=i!==index;});if(!preview){button('prev').disabled=index===0;button('next').disabled=index===slides.length-1;toolbar.querySelector('#sw-counter').textContent=`${index+1} / ${slides.length}`;}fit();}
 function edit(on){editing=on;const semantic='h1,h2,h3,p,li,blockquote,figcaption,dd,dt';const targets=new Set(textRuns(stage).map(n=>n.parentElement.closest(semantic)||n.parentElement));for(const node of targets)node.contentEditable=on?'true':'false';button('edit').textContent=on?'Done':'Edit';button('edit').setAttribute('aria-pressed',String(on));}

 function exported(){const copy=document.documentElement.cloneNode(true);copy.querySelector('#sw-viewport')?.replaceWith(...slides.map(s=>s.cloneNode(true)));copy.querySelector('#sw-toolbar')?.remove();copy.querySelectorAll('[contenteditable]').forEach(n=>n.removeAttribute('contenteditable'));copy.querySelectorAll('.slide').forEach((s,i)=>{s.classList.toggle('active',i===0);s.classList.toggle('visible',i===0);s.removeAttribute('inert');s.removeAttribute('aria-hidden');});copy.querySelector('body').insertAdjacentHTML('beforeend',runtimeSource);return '<!doctype html>\n'+copy.outerHTML;}
 if(!preview){
 stage.addEventListener('input',()=>{if(parent!==window)parent.postMessage({type:'skillwalk-edited'},'*');});
 stage.addEventListener('paste',e=>{if(!e.target.isContentEditable)return;e.preventDefault();const selection=getSelection();if(!selection.rangeCount)return;const range=selection.getRangeAt(0);range.deleteContents();const text=document.createTextNode(e.clipboardData.getData('text/plain'));range.insertNode(text);range.setStartAfter(text);range.collapse(true);selection.removeAllRanges();selection.addRange(range);});stage.addEventListener('drop',e=>{if(e.target.isContentEditable)e.preventDefault();});
 button('prev').onclick=()=>show(index-1);button('next').onclick=()=>show(index+1);button('edit').onclick=()=>edit(!editing);
 button('save').onclick=()=>{if(parent!==window){parent.postMessage({type:'skillwalk-save-request'},'*');return;}const a=document.createElement('a');const url=URL.createObjectURL(new Blob([exported()],{type:'text/html'}));a.href=url;a.download='presentation-edited.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 addEventListener('keydown',e=>{if(e.key==='Escape'&&editing){edit(false);return;}if(e.target.isContentEditable||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(e.target.closest('#sw-toolbar')&&[' ','Enter'].includes(e.key))return;const actions={ArrowRight:()=>show(index+1),' ':()=>show(index+1),PageDown:()=>show(index+1),ArrowLeft:()=>show(index-1),PageUp:()=>show(index-1),Home:()=>show(0),End:()=>show(slides.length-1),e:()=>edit(!editing),E:()=>edit(!editing)};if(actions[e.key]){e.preventDefault();actions[e.key]();}});
 root.addEventListener('touchstart',e=>{if(!editing)touchStart={x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY};},{passive:true});
 root.addEventListener('touchend',e=>{if(!touchStart||editing)return;const dx=e.changedTouches[0].clientX-touchStart.x,dy=e.changedTouches[0].clientY-touchStart.y;touchStart=null;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy))show(index+(dx<0?1:-1));},{passive:true});
 root.addEventListener('wheel',e=>{if(editing||Math.abs(e.deltaY)<30)return;e.preventDefault();if(Date.now()-lastWheel>450){show(index+(e.deltaY>0?1:-1));lastWheel=Date.now();}},{passive:false});
 addEventListener('message',e=>{if(e.source!==parent||e.data?.type!=='skillwalk-export'||typeof e.data.nonce!=='string'||e.data.nonce.length>80)return;parent.postMessage({type:'skillwalk-exported',nonce:e.data.nonce,html:exported()},'*');});
 }
 const typeProfiles={paper:{display:'Instrument Serif',body:['Manrope']},'bold-poster':{display:'Shrikhand',body:['Libre Baskerville','Space Grotesk']},'block-frame':{display:'Inter',body:['Inter','Space Grotesk']}};const type=typeProfiles[style];if(type){for(const text of textRuns(stage)){const element=text.parentElement;if(element.closest('#sw-cover'))continue;const current=getComputedStyle(element).fontFamily.split(',')[0].replace(/["']/g,'').trim();const heading=element.closest('h1,h2,h3');const allowed=heading?[type.display]:type.body;if(!allowed.includes(current))element.style.setProperty('font-family',allowed[0],'important');}}
 addEventListener('resize',fit);new ResizeObserver(fit).observe(document.documentElement);document.fonts.ready.then(fit);show(0);
}

export async function localFontCSS({includeSlideLicense=true}={}){let css=includeSlideLicense?'/* Creator viewport CSS license\n'+(await fs.readFile(path.join(root,'.artifacts/materials/LICENSE'),'utf8')).replaceAll('*/','* /')+'\n*/\n':'';for(const [name,file]of [['Instrument Serif','instrument-serif.ttf'],['Manrope','manrope.ttf'],['Shrikhand','shrikhand.ttf'],['Libre Baskerville','librebaskerville.ttf'],['Space Grotesk','spacegrotesk.ttf'],['Inter','inter.ttf']]){const data=await fs.readFile(path.join(root,'web/assets',file));const license=await fs.readFile(path.join(root,'web/assets',file.replace('.ttf','-OFL.txt')),'utf8');css+='/* '+license.replaceAll('*/','* /')+' */\n';css+=`@font-face{font-family:'${name}';src:url(data:font/ttf;base64,${data.toString('base64')}) format('truetype');font-display:swap}`;}return css;}
