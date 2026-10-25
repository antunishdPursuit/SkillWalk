// Controlled browser regressions: real server/UI, no model calls or live-app changes.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createApp} from './server.mjs';
import {LocalRun} from './ui-runner.mjs';
import {artifacts,json} from './util.mjs';
const url='https://youtu.be/hBDNv47KCKo',checks=[],errors=[];
const lastRunFile=path.join(artifacts,'last-run.json');
const previousLastRun=await fs.readFile(lastRunFile).catch(()=>null);
async function fixture(hold=false){
 let number=0,executeCalls=0,releaseClose;
 const gate=new Promise(r=>releaseClose=r);if(!hold)releaseClose();
 class ControlledRun extends LocalRun{
  constructor(id,notify){super(id,notify);this.number=++number;this.kind='document';this.tutorialId='hBDNv47KCKo';this.taskTitle='Controlled document '+this.number;}
  async analyze(){this.plan={supported:true,summary:'Controlled analysis, no inference',steps:[]};this.demoBrief={kind:'document',title:this.taskTitle,sections:[]};this.state('review','Controlled local plan ready');}
  async execute(){executeCalls++;this.state('generating','Controlled execution accepted');}
  async saveWorkspace(){}
  async close(){if(this.number===1)await gate;}
 }
 const app=createApp({restore:false,runFactory:(_,id,notify)=>new ControlledRun(id,notify)});
 await new Promise(r=>app.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+app.address().port;
 const html=await(await fetch(origin)).text(),token=html.match(/name="skillwalk-token" content="([a-f0-9]+)"/)[1];
 const state=async()=>(await(await fetch(origin+'/api/state')).json());
 const analyze=async()=>{const response=await fetch(origin+'/api/analyze',{method:'POST',headers:{origin,'x-skillwalk-token':token,'content-type':'application/json'},body:JSON.stringify({url})});assert.equal(response.status,202);return response.json();};
 async function idle(){for(let i=0;i<100;i++){if(!(await state()).busy)return;await new Promise(r=>setTimeout(r,10));}throw Error('Controlled server did not settle');}
 return {app,origin,state,analyze,idle,releaseClose,get executeCalls(){return executeCalls;}};
}
let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true});
 async function pageFor(f){
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://www.youtube-nocookie.com/**',route=>route.abort());
  return page;
 }
 // The new viewer really connects while the old runtime is still closing.
 {
  const f=await fixture(true);let page;
  try{
   const first=await f.analyze();await f.idle();page=await pageFor(f);
   await page.goto(f.origin+'/execution');await page.getByRole('button',{name:'Start now',exact:true}).waitFor();
   const pending=f.analyze();while(!(await f.state()).busy)await new Promise(r=>setTimeout(r,5));
   await page.reload();await page.getByRole('button',{name:'Start now',exact:true}).waitFor();
   f.releaseClose();const second=await pending;await f.idle();
   await page.waitForFunction(()=>document.querySelector('#run-title').textContent==='Controlled document 2');
   assert.notEqual(first.id,second.id);
   await page.waitForTimeout(11000);
   assert.equal((await f.state()).run.id,second.id);assert.equal((await f.state()).run.status,'review');
   assert.match(await page.locator('#countdown-text').innerText(),/Paused/);assert.equal(f.executeCalls,0);
   assert.equal(await page.locator('#practice').isVisible(),false);
   checks.push('Reconnect during cleanup adopts the new run and keeps preapproval paused beyond10seconds');
  }finally{f.releaseClose();await page?.close();await f.app.shutdown();}
 }
 // SSE can deliver review before the initiating HTTP response reaches the browser.
 {
  const f=await fixture();let page,releaseResponse;
  const responseGate=new Promise(r=>releaseResponse=r);
  try{
   page=await pageFor(f);
   await page.route('**/api/analyze',async route=>{const response=await route.fetch();await responseGate;await route.fulfill({response});});
   await page.goto(f.origin+'/tutorial');
   await page.getByRole('button',{name:'Use document tutorial',exact:true}).click();
   await page.getByRole('button',{name:'This is my video. Analyze it.',exact:true}).click();
   await page.getByRole('button',{name:'Pause countdown',exact:true}).click();
   releaseResponse();await page.waitForTimeout(250);
   assert.equal((await f.state()).run.status,'review');
   assert.equal(await page.locator('#execution-brief').isVisible(),true);
   assert.match(await page.locator('#countdown-text').innerText(),/Paused/);
   assert.equal(f.executeCalls,0);
   checks.push('Fast canonical review and a user pause survive a delayed Analyze response');
  }finally{releaseResponse();await page?.close();await f.app.shutdown();}
 }
 // Another viewer can start work without overwriting a local unconfirmed source edit.
 {
  const f=await fixture();let page;
  try{
   await f.analyze();await f.idle();page=await pageFor(f);await page.goto(f.origin+'/tutorial');
   await page.getByRole('textbox',{name:'YouTube tutorial link',exact:true}).fill('https://youtu.be/dQw4w9WgXcQ');
   const second=await f.analyze();await f.idle();await page.waitForTimeout(200);
   assert.equal(await page.getByRole('textbox',{name:'YouTube tutorial link',exact:true}).inputValue(),'https://youtu.be/dQw4w9WgXcQ');
   assert.match(page.url(),/\/tutorial$/);assert.equal(await page.locator('#analysis').isVisible(),false);
   assert.equal((await f.state()).run.id,second.id);assert.equal(f.executeCalls,0);
   checks.push('Canonical run replacement preserves local source edits and tutorial-page intent');
  }finally{await page?.close();await f.app.shutdown();}
 }
 assert.equal(errors.length,0,errors.join('; '));
 const after=await fs.readFile(lastRunFile).catch(()=>null);assert.deepEqual(after,previousLastRun,'Controlled tests must not change the actual saved run');
 await json(path.join(artifacts,'fix-review/reconnect-ui.json'),{passed:true,evidence:'Controlled real-server/UI lifecycle, no inference or live runtime changes',checks,errors,actualSavedRunUnchanged:true});
 console.log(JSON.stringify({passed:true,checks:checks.length,errors}));
}finally{await browser?.close();}
