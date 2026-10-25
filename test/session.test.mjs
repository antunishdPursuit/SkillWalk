import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../src/server.mjs';
import {LocalRun} from '../src/ui-runner.mjs';
test('a viewer reconnecting during cleanup receives the new canonical run before its later events',async()=>{
 let count=0,releaseClose;const gate=new Promise(resolve=>releaseClose=resolve);
 class ControlledRun extends LocalRun{
  constructor(id,notify){super(id,notify);this.number=++count;}
  async analyze(){this.state('review','Controlled ready');}
  async saveWorkspace(){}
  async close(){if(this.number===1)await gate;}
 }
 const app=createApp({restore:false,runFactory:(_,id,notify)=>new ControlledRun(id,notify)});
 await new Promise(r=>app.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+app.address().port;
 let reader;
 try{
  const html=await(await fetch(origin)).text(),token=html.match(/name="skillwalk-token" content="([a-f0-9]+)"/)[1];
  const headers={origin,'content-type':'application/json','x-skillwalk-token':token};
  const analyze=()=>fetch(origin+'/api/analyze',{method:'POST',headers,body:JSON.stringify({url:'https://youtu.be/372Iksaz8b0'})});
  const first=await(await analyze()).json();
  while((await(await fetch(origin+'/api/state')).json()).busy)await new Promise(r=>setTimeout(r,5));
  const second=analyze();
  while(!(await(await fetch(origin+'/api/state')).json()).busy)await new Promise(r=>setTimeout(r,5));
  reader=(await fetch(origin+'/api/events')).body.getReader();const decoder=new TextDecoder();
  assert.match(decoder.decode((await reader.read()).value),new RegExp(first.id));
  releaseClose();const result=await(await second).json();assert.equal(result.run.id,result.id);
  let text='',timer;
  await Promise.race([(async()=>{while(!text.includes('run-replaced')){const part=await reader.read();if(part.done)throw Error('Stream ended');text+=decoder.decode(part.value);}})(),new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('New canonical snapshot missing')),1500))]).finally(()=>clearTimeout(timer));
  const events=text.split('\n\n').filter(x=>x.startsWith('data: ')).map(x=>JSON.parse(x.slice(6)));
  const replacement=events.find(x=>x.type==='snapshot'&&x.reason==='run-replaced');
  assert.equal(replacement.run.id,result.id);assert.notEqual(replacement.run.id,first.id);
 }finally{releaseClose();await reader?.cancel();await app.shutdown();}
});

test('a Stop processed after completion returns409 without changing result or state',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'skillwalk-terminal-'));let run;
 class ControlledRun extends LocalRun{async analyze(){this.state('review','Controlled ready');}async saveWorkspace(){}}
 const app=createApp({restore:false,runFactory:(_,id,notify)=>{run=new ControlledRun(id,notify);run.dir=dir;return run;}});
 await new Promise(r=>app.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+app.address().port;
 try{
  const token=(await(await fetch(origin)).text()).match(/name="skillwalk-token" content="([a-f0-9]+)"/)[1];
  const headers={origin,'x-skillwalk-token':token,'content-type':'application/json'};
  const started=await(await fetch(origin+'/api/analyze',{method:'POST',headers,body:JSON.stringify({url:'https://youtu.be/372Iksaz8b0'})})).json();
  while((await(await fetch(origin+'/api/state')).json()).busy)await new Promise(r=>setTimeout(r,5));
  await fs.writeFile(path.join(dir,'result.json'),'prior checked bytes');run.state('complete','Controlled completed outside work');
  const response=await fetch(origin+'/api/stop',{method:'POST',headers,body:JSON.stringify({id:started.id})});
  assert.equal(response.status,409);assert.equal(run.status,'complete');assert.equal(run.stopping,false);
  assert.equal(await fs.readFile(path.join(dir,'result.json'),'utf8'),'prior checked bytes');
 }finally{await app.shutdown();assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));await fs.rm(dir,{recursive:true,force:true});}
});
