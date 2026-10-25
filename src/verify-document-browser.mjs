import {checkDocumentAnswer,hasInventedSampleDates} from './document-answers.mjs';
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const url=process.env.DOCUMENT_TEST_URL,checks=[],demoAnswers=[];
if(!/^http:\/\/127\.0\.0\.1:8501\/session-[a-f0-9]{48}\/$/.test(url||''))throw Error('Invalid document test URL');
const emit=(type,data={})=>process.stdout.write('@@SKILLWALK '+JSON.stringify({type,at:new Date().toISOString(),...data})+'\n');
const passed=check=>{checks.push(check);emit('check',{check});};
let browser,context,report={passed:false,checks},timer;
try{
 browser=await chromium.launch({headless:true,chromiumSandbox:true,args:['--disable-dev-shm-usage']});
 context=await browser.newContext({viewport:{width:1280,height:720},reducedMotion:'reduce'});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const cdp=await context.newCDPSession(page);emit('browser-start');
 cdp.on('Page.screencastFrame',async frame=>{emit('browser-frame',{image:frame.data});await cdp.send('Page.screencastFrameAck',{sessionId:frame.sessionId}).catch(()=>{});});
 await cdp.send('Page.startScreencast',{format:'jpeg',quality:65,maxWidth:1280,maxHeight:720,everyNthFrame:2});
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});emit('browser-location',{url:page.url()});
 await Promise.race([
  page.getByText('Document ready. Answers use retrieved evidence;', {exact:false}).waitFor({timeout:300000}),
  page.getByTestId('stException').waitFor({timeout:300000}).then(async()=>{throw Error('Local document runtime error: '+await page.getByTestId('stException').innerText());}),
  page.getByText('Local document processing failed:',{exact:false}).waitFor({timeout:300000}).then(async()=>{throw Error('Local document extraction failed: '+await page.getByText('Local document processing failed:',{exact:false}).innerText());})
 ]);
 const extraction=JSON.parse(await fs.readFile('/work/extraction.json','utf8'));
 const categories=extraction.corpus.filter(x=>x.figure).map(x=>x.category);
 assert.ok(categories.includes('Image'),'HI_RES must extract and describe the chart as an Image');
 assert.ok(categories.includes('Table'),'HI_RES must extract and describe the table');
 assert.ok(extraction.corpus.filter(x=>x.figure).every(x=>x.page!==null),'Sample crop page provenance must be available');
 passed('HI_RES extracted both table and chart; real Gemma described both with page provenance');
 assert.ok(!hasInventedSampleDates(extraction.corpus),'Gemma visual interpretation invented dates absent from the sample PDF');passed('Image descriptions do not invent dates absent from this sample');
 assert.ok(extraction.chunks>0);assert.equal(extraction.embeddingModel,'embeddinggemma');passed('Document chunks embedded locally with the tutorial embedding model');
 const questions=[
  {question:'What is the population of Germany according to the chart?'},
  {question:'Which has the larger population, United States or Egypt?'},
  {question:'How much does a ticket to the concert cost?'}
 ];
 await fs.writeFile('/work/answers.ndjson','');
 for(const [index,item] of questions.entries()){
  const input=page.getByRole('textbox',{name:'Ask about the document'});
  await input.fill(item.question);await input.press('Enter');
  let result;
  for(let i=0;i<180;i++){const lines=(await fs.readFile('/work/answers.ndjson','utf8')).trim().split('\n').filter(Boolean);result=lines.map(x=>JSON.parse(x)).find(x=>x.question===item.question);if(result)break;const runtimeError=page.getByTestId('stException');if(await runtimeError.count())throw Error('Local document runtime error: '+await runtimeError.first().innerText());await page.waitForTimeout(1000);}
  assert.ok(result,'Gemma answer did not finish for '+item.question);assert.ok(result.evidence?.length,'Answer must retain real retrieved source evidence');assert.ok(checkDocumentAnswer(index,result),'Gemma answer failed expected document behavior: '+result.answer);demoAnswers.push(result);passed('Real local Gemma: '+item.question);
 }
 assert.equal(errors.length,0,'Browser runtime errors: '+errors.join('; '));passed('Real Streamlit chat, document evidence and browser runtime checks');
 await page.screenshot({path:'/work/document-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Document app overflows phone width');passed('Document app contains its layout at 390px');
 await page.screenshot({path:'/work/document-phone.png',fullPage:true});
 report={passed:true,checks,documentHash:extraction.documentHash,configurationHash:extraction.configurationHash,demoAnswers,model:extraction.model,embeddingModel:extraction.embeddingModel,figures:categories};
}catch(e){report={passed:false,checks,failure:e.message};emit('check-failed',{failure:e.message});}
finally{await fs.writeFile('/work/browser-report.json',JSON.stringify(report,null,2));if(browser)await browser.close();emit('browser-end');}
if(!report.passed)process.exitCode=1;
