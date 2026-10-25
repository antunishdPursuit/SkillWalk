import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root=path.resolve(import.meta.dirname,'..');
const base=JSON.parse(fs.readFileSync(path.join(root,'examples/repair-cafe-brief.json')));
for(const kind of ['missing-content-and-style','missing-material']){
 test(`runner pauses before inference without a source cache: ${kind}`,()=>{
  const brief=structuredClone(base);
  if(kind==='missing-content-and-style'){delete brief.style;brief.slides[1].facts=[];}
  else brief.requiredFiles=['repair-handout.pdf'];
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'skillwalk-readiness-'));
  try{
   fs.cpSync(path.join(root,'src'),path.join(dir,'src'),{recursive:true});
   const file=path.join(dir,'brief.json');
   fs.writeFileSync(file,JSON.stringify(brief));
   assert.equal(fs.existsSync(path.join(dir,'.artifacts')),false);
   const run=`gate-${kind}`;
   const child=spawnSync(process.execPath,['src/proof.mjs','generate'],{
    cwd:dir,encoding:'utf8',
    env:{...process.env,PROOF_BRIEF:file,PROOF_RUN:run,OLLAMA_BASE:'http://127.0.0.1:1',OLLAMA_TEXT_BASE:'http://127.0.0.1:1'}
   });
   assert.equal(child.status,2,child.stderr);
   const result=JSON.parse(child.stdout);
   assert.equal(result.status,'needs-input');
   assert.equal(result.ready,false);
   assert.ok(result.questions.length);
   assert.equal(fs.existsSync(path.join(dir,'.artifacts/source')),false);
   assert.equal(fs.existsSync(path.join(dir,'.artifacts/experiments',run,'output/presentation.html')),false);
  }finally{
   assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));
   assert.ok(path.basename(dir).startsWith('skillwalk-readiness-'));
   fs.rmSync(dir,{recursive:true,force:true});
  }
 });
}
