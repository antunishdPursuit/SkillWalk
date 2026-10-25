import {deliverCheckedResult} from './result-delivery.mjs';
import fs from'node:fs/promises';import path from'node:path';import{LocalRun}from'./ui-runner.mjs';import{acquireTutorial}from'./acquire.mjs';import{json,readJSON,sha256}from'./util.mjs';
export class FrontendRun extends LocalRun{
 constructor(id,notify){super(id,notify);this.kind='website';this.tutorialId='DVlHZufvP10';this.artifactName='website.html';}
 view(){return{...super.view(),kind:this.kind,tutorialId:this.tutorialId,artifactName:this.artifactName};}
 async analyze(){await this.init();this.state('analyzing','Reading the selected website tutorial, captions and actual frames');await acquireTutorial('https://www.youtube.com/watch?v='+this.tutorialId);const result=await this.step('website-proof.mjs',['analyze']);if(result.code!==0)throw Error(result.error||'Website tutorial analysis failed');this.plan=await readJSON(path.join(this.dir,'output/plan.json'));const demo=await readJSON(path.join(this.dir,'output/demo-brief.json'));this.demoBrief=demo.brief;this.demoSource=demo.provenance;if(this.stopping)throw Error('Stopped at the requested step boundary.');this.state('review','Your local website task is ready. No writing required.');}
 async execute(){this.taskTitle=this.demoBrief.title;this.stopping=false;this.failure=null;this.checks=[];await json(path.join(this.dir,'brief.json'),this.demoBrief);this.state('generating','Gemma is building the initial homepage without the design skill','initial');let step=await this.step('website-proof.mjs',['baseline']);if(step.code!==0)throw Error(step.error||'Initial homepage generation failed');this.state('testing','Opening the initial homepage in the real isolated browser','initial');step=await this.step('verify.mjs',['baseline']);if(step.code!==0)this.event('baseline-failed',{message:'Initial homepage failed a smoke check; this remains the unverified comparison, not the final result'});this.state('generating','Gemma is planning, critiquing and applying the linked frontend-design skill');step=await this.step('website-proof.mjs',['generate']);if(step.code!==0)throw Error(step.error||'Skill-guided redesign failed');await this.verifyAndRepair();}
 async verifyAndRepair(){
  for(let attempt=0;attempt<=4;attempt++){
   this.throwIfStopping();
   this.state('testing',`Testing website navigation, mobile menu and responsive layout: pass ${attempt+1}`);
   const step=await this.step('verify.mjs',['website']);this.throwIfStopping();
   let report=await readJSON(path.join(this.dir,'verification/website-report.json'));this.throwIfStopping();
   if(step.code===0&&report.passed){
    this.state('testing','Gemma is inspecting actual desktop and phone website renders');
    const visual=await this.step('website-visual-review.mjs');this.throwIfStopping();
    report=await readJSON(path.join(this.dir,'verification/website-report.json'));this.throwIfStopping();
    if(visual.code!==0&&report.passed)throw Error(visual.error||'Website visual inspection failed');
   }
   if(step.code===0&&report.passed){
    const hash=sha256(await fs.readFile(path.join(this.dir,'output/website.html')));this.throwIfStopping();
    const generation=await readJSON(path.join(this.dir,'output/website-generation.json'));this.throwIfStopping();
    if(hash!==report.presentationHash||hash!==generation.websiteHash)throw Error('Website changed between generation and verification');
    await deliverCheckedResult(this,{passed:true,kind:this.kind,sourceVideoId:this.tutorialId,presentationHash:hash,artifactHash:hash,checks:report.checks,verifiedAt:new Date().toISOString()},'Website verified. Explore it here or download the local HTML.');
    return;
   }
   this.failure=report.failure;this.event('validation-failed',{failure:report.failure,attempt:attempt+1});
   if(attempt===4)throw Error('Website repair limit reached; no verified download is available');
   this.state('repairing',`Gemma is repairing the website: ${attempt+1} of 4`);
   const repaired=await this.step('website-proof.mjs',['repair']);this.throwIfStopping();
   if(repaired.code!==0)this.event('repair-rejected',{failure:repaired.error});
  }
 }

 async retry(){this.stopping=false;this.failure=null;let generated=false;try{const meta=await readJSON(path.join(this.dir,'output/website-generation.json'));generated=meta.sourceVideoId===this.tutorialId&&meta.websiteHash===sha256(await fs.readFile(path.join(this.dir,'output/website.html')));}catch{}return generated?this.verifyAndRepair():this.execute();}
}
