import {ensureSandboxProfile} from './sandbox-profile.mjs';
import {spawn} from 'node:child_process';
import {root} from './util.mjs';
import {DocumentBroker} from './document-broker.mjs';
console.log('Preparing the pinned default-deny browser sandbox profile.');
await ensureSandboxProfile();
const broker=new DocumentBroker('');
const vision=await fetch(broker.visionBase+'/api/show',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:'gemma3:4b'}),signal:AbortSignal.timeout(10000)}).then(r=>r.json());
if(!vision.capabilities?.includes('vision')||!String(vision.details?.family).includes('gemma'))throw Error('Make gemma3:4b available in your configured local Ollama vision service first.');
const available=await fetch(broker.embeddingBase+'/api/tags',{signal:AbortSignal.timeout(10000)}).then(r=>r.json());
if(!available.models?.some(m=>m.name==='embeddinggemma'||m.name==='embeddinggemma:latest')){
 console.log('Downloading local EmbeddingGemma from the Ollama library.');
 const response=await fetch(broker.embeddingBase+'/api/pull',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:'embeddinggemma',stream:false}),signal:AbortSignal.timeout(900000)});
 const result=await response.json();if(!response.ok||result.error)throw Error(result.error||'Embedding model download failed');
}
const probe=await fetch(broker.embeddingBase+'/api/embed',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:'embeddinggemma',input:['Local setup verification'],options:{num_gpu:0}}),signal:AbortSignal.timeout(120000)}).then(r=>r.json());
if(!probe.embeddings?.[0]?.length)throw Error('Local embedding generation failed: '+JSON.stringify(probe));
console.log('Local models verified. Building the isolated document runtime (first build downloads packages and extraction weights).');
const child=spawn(process.env.DOCKER_BIN||'docker.exe',['build','-t','skillwalk-document:local','document'],{cwd:root,stdio:'inherit',windowsHide:true});
await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('Document runtime build failed')));});
console.log('Document runtime ready. npm start opens only the loopback website; nothing is deployed.');
