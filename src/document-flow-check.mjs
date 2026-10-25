import path from 'node:path';
import fs from 'node:fs/promises';
import {DocumentRun} from './document-run.mjs';
import {readJSON,json,sha256} from './util.mjs';
const id=process.env.PROOF_RUN||'document-full-'+Date.now();
if(!/^[a-z0-9][a-z0-9-]{0,60}$/.test(id))throw Error('Invalid run ID');
const run=new DocumentRun(id,e=>{if(!['browser-frame','model-output','log'].includes(e.type))console.log(e.type,JSON.stringify(e).slice(0,1000));});
try{
 await run.init();await json(path.join(run.dir,'flow-check.json'),{passed:false,status:'running',startedAt:new Date().toISOString()});
 if(process.argv.includes('--reuse-analysis')){run.plan=await readJSON(path.join(run.dir,'output/plan.json'));const demo=await readJSON(path.join(run.dir,'output/demo-brief.json'));run.demoBrief=demo.brief;run.demoSource=demo.provenance;}else await run.analyze();
 if(process.argv.includes('--reuse-build'))await run.retry();else await run.execute();
 await run.saveWorkspace();await json(path.join(run.dir,'flow-check.json'),{passed:run.status==='complete',realModels:true,sourceVideoId:run.tutorialId,additionalUserChoices:0,checks:run.checks,browserReportHash:sha256(await fs.readFile(path.join(run.dir,'verification/document-browser-report.json'))),extractionHash:sha256(await fs.readFile(path.join(run.dir,'verification/document-extraction.json'))),configHash:sha256(await fs.readFile(path.join(run.dir,'output/app/config.json')))});console.log('DOCUMENT FLOW',run.status,run.dir);
}catch(error){await run.fail(error);await json(path.join(run.dir,'flow-check.json'),{passed:false,status:run.status,failure:error.message});console.error(error);process.exitCode=1;}finally{await run.close();}
