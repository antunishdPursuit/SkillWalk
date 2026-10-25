import {ensureSandboxProfile} from './sandbox-profile.mjs';
import fs from 'node:fs/promises';import path from 'node:path';import {execFile,spawn} from 'node:child_process';import {promisify} from 'node:util';import {root,artifacts,json,sha256,outputDir,verificationDir} from './util.mjs';

const exec=promisify(execFile);const image='mcr.microsoft.com/playwright:v1.64.0-noble';const runtime=path.join(artifacts,'runtime');await fs.mkdir(runtime,{recursive:true});

const profile=await ensureSandboxProfile();


const website=['website','baseline'].includes(process.argv[2]),artifact=website?(process.argv[2]==='baseline'?'baseline.html':'website.html'):'presentation.html',reportName=website?(process.argv[2]==='baseline'?'baseline-report.json':'website-report.json'):'browser-report.json',browserScript=website?'verify-website-browser.mjs':'verify-browser.mjs';
const output=verificationDir;await fs.mkdir(output,{recursive:true});const input=outputDir;const testedHash=process.argv[2]==='previews'?null:sha256(await fs.readFile(path.join(input,artifact)));

for(const name of (process.argv[2]==='previews'?['previews.json','generation.json']:(website?[artifact,'website-spec.json']:[artifact,'generation.json'])))await fs.access(path.join(input,name));

const args=['run','--rm','--network','none','--read-only','--cap-drop','ALL','--cap-add','SYS_CHROOT','--security-opt','no-new-privileges','--security-opt',`seccomp=${profile}`,'--user','pwuser','--memory','2g','--cpus','2','--pids-limit','128','--shm-size','256m','--tmpfs','/tmp:rw,nosuid,nodev,size=536870912','--mount',`type=bind,source=${path.join(root,'node_modules')},target=/app/node_modules,readonly`,'--mount',`type=bind,source=${path.join(root,'src',browserScript)},target=/app/${browserScript},readonly`,'--mount',`type=bind,source=${input},target=/input,readonly`,'--mount',`type=bind,source=${output},target=/output`,'-e','VERIFY_MODE='+(process.argv[2]||'full'),'--mount',`type=bind,source=${path.join(root,'src','text-runs.mjs')},target=/app/text-runs.mjs,readonly`,'-w','/app',image,'node',browserScript];

await json(path.join(runtime,'verification-config.json'),{image,network:'none',readOnlyRoot:true,user:'pwuser',allCapabilitiesDropped:true,capabilityAdded:'SYS_CHROOT (Chromium namespace sandbox)',noNewPrivileges:true,seccompSha256:sha256(await fs.readFile(profile)),browserSandbox:true,inputsReadOnly:true,outputDirectory:path.relative(root,output)});

if(process.env.SKILLWALK_LIVE==='1'){

 args.splice(1,0,'--name','skillwalk-browser-'+process.env.PROOF_RUN);
 const child=spawn(process.env.DOCKER_BIN||'docker.exe',args.slice(0,args.indexOf(image)).concat(['-e','SKILLWALK_LIVE=1',...args.slice(args.indexOf(image))]),{stdio:'inherit',windowsHide:true});

 // Environment flags must precede the image, not the container command.

 await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>{process.exitCode=code===0?0:1;resolve();});});

}else{try{const r=await exec(process.env.DOCKER_BIN||'docker.exe',args,{timeout:120000,maxBuffer:1024*1024,windowsHide:true});console.log(r.stdout);}catch(error){console.error(error.stderr||error.message);process.exitCode=1;}}


if(testedHash){const report=JSON.parse(await fs.readFile(path.join(output,reportName),'utf8'));report.presentationHash=testedHash;if(sha256(await fs.readFile(path.join(input,artifact)))!==testedHash){report.passed=false;report.failure='Presentation changed while its browser checks were running';process.exitCode=1;}await json(path.join(output,reportName),report);}
