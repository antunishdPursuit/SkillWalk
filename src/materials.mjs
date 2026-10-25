import fs from 'node:fs/promises';import path from 'node:path';import {artifacts,json,sha256,readJSON} from './util.mjs';

export async function getMaterials(){

 const evidence=await readJSON(path.join(artifacts,'source/evidence.json'));

 const matches=[...evidence.metadata.description.matchAll(/https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)/g)];

 const repos=[...new Set(matches.map(m=>`${m[1]}/${m[2]}`))];

 if(repos.length!==1)throw Error('Need exactly one creator-linked repository for this supported demonstration.');

 const repo=repos[0];if(repo!=='zarazhangrui/frontend-slides')throw Error('Unknown skill requires a separate capability/security review.');

 const dir=path.join(artifacts,'materials');await fs.mkdir(dir,{recursive:true});

 let pin;try{pin=await readJSON(path.join(dir,'pin.json'));}catch{

  const response=await fetch(`https://api.github.com/repos/${repo}/commits/main`,{headers:{'user-agent':'SkillWalk-local-proof'},signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(`Cannot pin creator source: ${response.status}`);const data=await response.json();pin={repo,commit:data.sha,discoveredFrom:'video description',videoId:evidence.metadata.id,acquiredAt:new Date().toISOString(),files:[]};

 }

 const names=['LICENSE','SKILL.md','STYLE_PRESETS.md','viewport-base.css','html-template.md','animation-patterns.md','bold-template-pack/selection-index.json','bold-template-pack/templates/bold-poster/preview.md','bold-template-pack/templates/block-frame/preview.md'];

 for(const name of names){const target=path.join(dir,name);let data;try{if(!pin.files.some(f=>f.name===name))throw Error('Fetch unknown cache entry from pinned source');data=await fs.readFile(target);}catch{const response=await fetch(`https://raw.githubusercontent.com/${repo}/${pin.commit}/${name}`,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(`Missing skill material ${name}: ${response.status}`);data=Buffer.from(await response.arrayBuffer());await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,data);}const old=pin.files.find(x=>x.name===name);if(old&&old.sha256!==sha256(data))throw Error(`Pinned material changed: ${name}`);if(!old)pin.files.push({name,sha256:sha256(data)});}

 await json(path.join(dir,'pin.json'),pin);return {pin,dir};

}


export async function getReference(name){
 if(!/^bold-template-pack\/templates\/(bold-poster|block-frame)\/design\.md$/.test(name))throw Error('Reference is not allowlisted');
 const {dir,pin}=await getMaterials();const file=path.join(dir,name);let data;try{if(!pin.files.some(f=>f.name===name))throw Error('Fetch unknown cache entry from pinned source');data=await fs.readFile(file);}catch{const response=await fetch(`https://raw.githubusercontent.com/${pin.repo}/${pin.commit}/${name}`,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Selected design reference unavailable');data=Buffer.from(await response.arrayBuffer());await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,data);}
 const old=pin.files.find(x=>x.name===name);if(old&&old.sha256!==sha256(data))throw Error('Pinned reference changed');if(!old){pin.files.push({name,sha256:sha256(data)});await json(path.join(dir,'pin.json'),pin);}
 return data.toString('utf8');
}
