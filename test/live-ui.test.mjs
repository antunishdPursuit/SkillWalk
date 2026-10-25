import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import test from 'node:test';import assert from 'node:assert/strict';import {consumeModelStream} from '../src/events.mjs';import {tutorialId} from '../src/server.mjs';import {Countdown} from '../web/countdown.mjs';

test('stream parser preserves split UTF-8 and requires final completion',async()=>{const bytes=new TextEncoder().encode(JSON.stringify({message:{content:'café'}})+'\n'+JSON.stringify({message:{content:' done'},done:true})+'\n');async function* chunks(){for(const b of bytes)yield new Uint8Array([b]);}let live='';const r=await consumeModelStream(chunks(),s=>live+=s);assert.equal(live,'café done');assert.equal(r.message.content,live);async function* broken(){yield new TextEncoder().encode('{"message":{"content":"unfinished"}}\n');}await assert.rejects(()=>consumeModelStream(broken()),/before completion/);});

test('countdown pauses without elapsed hidden time and fires once',()=>{let now=0,fires=0;const values=[];const c=new Countdown(s=>values.push(s),()=>fires++,()=>now);c.start();now=12000;c.tick();c.pause();now=90000;assert.equal(c.remaining,18000);c.resume();now=108000;c.tick();c.tick();assert.equal(fires,1);c.dispose();assert.equal(values.at(-1),0);});

test('only canonical public YouTube URLs are accepted',()=>{assert.equal(tutorialId('https://youtu.be/372Iksaz8b0'),'372Iksaz8b0');for(const u of ['http://127.0.0.1/video','https://youtube.com.evil.test/watch?v=372Iksaz8b0','https://evil@youtube.com/watch?v=372Iksaz8b0'])assert.throws(()=>tutorialId(u));});

test('loopback API blocks foreign origins, unknown tutorials and unverified results',async()=>{
 const root=path.resolve(import.meta.dirname,'..');
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'skillwalk-api-'));
 let app;
 try{
  // Controlled local fixtures exercise HTTP behavior without downloaded media.
  await fs.cp(path.join(root,'src'),path.join(dir,'src'),{recursive:true});
  await fs.cp(path.join(root,'web'),path.join(dir,'web'),{recursive:true});
  const source=path.join(dir,'.artifacts/source');
  await fs.mkdir(source,{recursive:true});
  await fs.writeFile(path.join(source,'metadata.json'),JSON.stringify({
   id:'372Iksaz8b0',url:'https://www.youtube.com/watch?v=372Iksaz8b0',
   title:'Controlled tutorial fixture',creator:'Controlled creator',duration:60,description:'Test fixture only'
  }));
  const bytes=Buffer.from('0123456789abcdef'.repeat(8));
  await fs.writeFile(path.join(source,'tutorial.mp4'),bytes);
  const {createApp}=await import(pathToFileURL(path.join(dir,'src/server.mjs')).href);
  app=createApp({restore:false});
  await new Promise(r=>app.listen(0,'127.0.0.1',r));
  const origin='http://127.0.0.1:'+app.address().port;
  const html=await(await fetch(origin)).text();
  const token=html.match(/name="skillwalk-token" content="([a-f0-9]+)"/)[1];
  const headers={origin,'x-skillwalk-token':token,'content-type':'application/json'};
  assert.equal((await fetch(origin+'/api/preview',{method:'POST',headers:{...headers,origin:'https://evil.test'},body:'{}'})).status,403);
  const unknown=await fetch(origin+'/api/preview',{method:'POST',headers,body:JSON.stringify({url:'https://youtu.be/abcdefghijk'})});
  assert.equal(unknown.status,200);
  assert.equal((await unknown.json()).compatibility.available,false);
  const rejected=await fetch(origin+'/api/analyze',{method:'POST',headers,body:JSON.stringify({url:'https://youtu.be/abcdefghijk'})});
  assert.equal(rejected.status,400);
  const valid=await fetch(origin+'/api/preview',{method:'POST',headers,body:JSON.stringify({url:'https://youtu.be/372Iksaz8b0'})});
  assert.equal((await valid.json()).creator,'Controlled creator');
  assert.equal((await fetch(origin+'/api/result?id=missing')).status,409);
  assert.equal((await fetch(origin+'/api/execute',{method:'POST',headers,body:'{}'})).status,409);
  assert.equal((await fetch(origin+'/favicon.svg')).headers.get('content-type'),'image/svg+xml');
  const video=await fetch(origin+'/source/tutorial.mp4',{headers:{range:'bytes=0-31'}});
  assert.equal(video.status,206);
  assert.equal(video.headers.get('content-range'),'bytes 0-31/128');
  assert.deepEqual(Buffer.from(await video.arrayBuffer()),bytes.subarray(0,32));
  const stream=await fetch(origin+'/api/events');
  const reader=stream.body.getReader();
  const first=await reader.read();
  assert.match(new TextDecoder().decode(first.value),/snapshot/);
  await reader.cancel();
 }finally{
  if(app)await app.shutdown();
  assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));
  assert.ok(path.basename(dir).startsWith('skillwalk-api-'));
  await fs.rm(dir,{recursive:true,force:true});
 }
});
