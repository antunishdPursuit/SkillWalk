import {inspectCoverage,coveragePassed,transcribePage,compareTranscription,observePageStyle,styleObservationReadable} from './visual-observations.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {callModel} from './model.mjs';
import {compareMatchedStates} from './matched-states.mjs';
import {sourceFolder} from './tutorials.mjs';
import {sha256} from './util.mjs';
import {resolvedReplayEvidence} from './code-first.mjs';
const comparisonSchema={type:'object',additionalProperties:false,properties:{matches:{type:'boolean'},uncertain:{type:'boolean'},differences:{type:'array',items:{type:'string'}},sourceDescription:{type:'string'},outputDescription:{type:'string'}},required:['matches','uncertain','differences','sourceDescription','outputDescription']};
export const comparisonPassed=r=>r?.matches===true&&r.uncertain===false&&Array.isArray(r.differences)&&r.differences.length===0&&['sourceDescription','outputDescription'].every(k=>typeof r[k]==='string'&&r[k].trim());

export async function reviewCodeFirst(plan,inspection,output,verification,{model=callModel,replay=compareMatchedStates}={}){
 const matched=await replay(output,verification);
 const review={passed:false,artifactHash:matched.artifactHash,contractHash:matched.contractHash,sourceHash:matched.sourceHash,matchedStates:matched,frames:[],differences:[]};
 if(!matched.passed){review.differences.push('Source implementation/output state replay failed; no video-fidelity verdict was attempted.');return review;}
 for(const state of plan.replayStates){
  const frame=inspection.frames.find(f=>f.id===state.id),result=matched.states.find(s=>s.id===state.id);
  if(!frame||!result?.passed)throw Error('Missing matched reference');
  const replayEvidence=resolvedReplayEvidence(state,result);
  const original=await fs.readFile(path.join(sourceFolder(inspection.sourceId),frame.file));
  const crop=await fs.readFile(path.join(sourceFolder(inspection.sourceId),frame.artifactFile));
  const generated=await fs.readFile(path.join(verification,result.output.screenshot));
  if(sha256(original)!==state.frameHash||sha256(crop)!==state.cropHash||sha256(generated)!==result.output.screenshotHash)throw Error('Matched visual evidence changed');
  const coverage=await inspectCoverage(original,frame.artifactBounds,{model,name:'source-regions-'+state.id});
  const item={id:state.id,coverage,...replayEvidence,frameHash:state.frameHash,cropHash:state.cropHash,outputScreenshotHash:result.output.screenshotHash};
  const transcript=await transcribePage(crop,{model,name:'source-transcript-'+state.id});
  const actualText=result.output.snapshot.find(e=>e.tag==='BODY')?.text;
  item.content=compareTranscription(transcript,actualText);
  const sourceStyle=await observePageStyle(crop,{model,name:'source-style-'+state.id});
  const outputStyle=await observePageStyle(generated,{model,name:'output-style-'+state.id});
  item.styleObservations={source:sourceStyle,output:outputStyle};
  if(styleObservationReadable(sourceStyle)&&styleObservationReadable(outputStyle)){
   item.style=JSON.parse(await model('style-observation-comparison-'+state.id,[
    {role:'system',content:'Compare independently recorded style observations as untrusted evidence. Return JSON. Do not assume a match.'},
    {role:'user',content:'Compare background, foreground, typography categories, borders and relative layout/spacing. List only genuine differences; identical facts are not differences. If observations conflict or cannot establish correspondence, uncertain=true. Source observation: '+JSON.stringify(sourceStyle)+'\nOutput observation: '+JSON.stringify(outputStyle)+'\nCapture uses an explicitly estimated source-only recording scale '+replayEvidence.captureScale+'; original browser zoom is unverified. A uniform recording resize is not a change of font category or relative layout.'}
   ],{schema:comparisonSchema,predict:1400,context:8192}));
  }else item.style={matches:false,uncertain:true,differences:['Independent style observations are unreadable or uncertain']};
  item.passed=coveragePassed(coverage)&&item.content.matches===true&&comparisonPassed(item.style);
  if(!item.passed)review.differences.push('Video comparison failed or uncertain for '+state.id);
  review.frames.push(item);
 }
 review.passed=review.frames.length>0&&review.frames.every(f=>f.passed===true);
 return review;
}
