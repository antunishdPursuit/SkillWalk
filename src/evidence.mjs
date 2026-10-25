export const actionSignals={setup_skill:/install|github|coding agent/i,provide_content:/outline|content|notes/i,clarify_preferences:/question|density|deck for|speaker led/i,preview_styles:/preview|cover.*design/i,choose_style:/pick|select.*design|design direction/i,generate_deck:/generate.*deck|building.*slide|done.*slides/i,verify_deck:/screenshot|correct|mistake|take a look/i,local_delivery:/local HTML|open.*browser/i};
export function timestamp(s){const n=s.replace(',','.').split(':').map(Number);return n.reduce((a,b)=>a*60+b,0);}
export function parseVtt(text){
 const segments=[];let previous='';
 for(const block of text.replace(/\r/g,'').split(/\n\s*\n/)){
  const lines=block.split('\n');const ti=lines.findIndex(x=>x.includes(' --> '));if(ti<0)continue;
  const [start,end]=lines[ti].split(' --> ').map(x=>timestamp(x.split(' ')[0]));
  const words=lines.slice(ti+1).join(' ').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&gt;/g,'>').replace(/&lt;/g,'<').replace(/\s+/g,' ').trim();
  if(!words||words===previous)continue;previous=words;
  segments.push({id:`t${segments.length}`,start,end,text:words});
 }
 return segments;
}
export function validatePlan(plan,evidence){
 const errors=[];const segmentMap=new Map(evidence.segments.map(x=>[x.id,x]));const frameMap=new Map(evidence.frames.map(x=>[x.id,x]));
 if(typeof plan.supported!=='boolean')errors.push('supported must be boolean');
 if(!Array.isArray(plan.steps))return ['steps must be an array'];
 if(!plan.supported&&plan.steps.length)errors.push('unsupported evidence must not produce executable steps');
 for(const step of plan.steps){
  if(!['setup_skill','provide_content','clarify_preferences','preview_styles','choose_style','generate_deck','verify_deck','local_delivery'].includes(step.action))errors.push(`Unsupported action: ${step.action}`);
  const seg=segmentMap.get(step.segment_id);if(!seg)errors.push(`Unknown segment: ${step.segment_id}`);
    if(seg&&actionSignals[step.action]&&!actionSignals[step.action].test(seg.text))errors.push(`Source does not support action ${step.action}: ${step.segment_id}`);
  if(seg&&(!step.quote||!seg.text.includes(step.quote)))errors.push(`Unsupported quote: ${step.segment_id}`);
  if(!Number.isFinite(step.timestamp)||!seg||step.timestamp<seg.start-1||step.timestamp>seg.end+1)errors.push(`Unsupported timestamp: ${step.timestamp}`);
  if(step.frame_id&&!frameMap.has(step.frame_id))errors.push(`Unknown frame: ${step.frame_id}`);
 }
 if(plan.supported){for(const required of ['setup_skill','provide_content','preview_styles','choose_style','generate_deck','verify_deck','local_delivery'])if(!plan.steps.some(x=>x.action===required))errors.push(`Missing action: ${required}`);}
 return errors;
}

export function compactSegments(segments,window=10){
 const groups=new Map();let full=[];
 for(const s of segments){
  const words=s.text.split(/\s+/);let overlap=0;
  for(let n=Math.min(words.length,full.length);n>0;n--)if(full.slice(-n).join(' ')===words.slice(0,n).join(' ')){overlap=n;break;}
  const fresh=words.slice(overlap);full.push(...fresh);if(!fresh.length)continue;
  const start=Math.floor(s.start/window)*window;const key=`s${start}`;
  if(!groups.has(key))groups.set(key,{id:key,start,end:start+window,text:''});
  const g=groups.get(key);g.text=(g.text+' '+fresh.join(' ')).trim();g.end=Math.max(g.end,s.end);
 }
 return [...groups.values()];
}
export function groundSelection(selection,evidence){
 const map=new Map(evidence.segments.map(s=>[s.id,s]));
 return {...selection,steps:selection.steps.map(step=>{const s=map.get(step.segment_id);if(!s)throw Error('Unknown evidence selection');const frame=evidence.frames.filter(f=>Math.abs(f.timestamp-s.start)<=15).sort((a,b)=>Math.abs(a.timestamp-s.start)-Math.abs(b.timestamp-s.start))[0];return {action:step.action,segment_id:s.id,quote:s.text,timestamp:s.start,frame_id:frame?.id||''};}).sort((a,b)=>a.timestamp-b.timestamp)};
}
