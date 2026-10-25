import {spawn} from 'node:child_process';
import path from 'node:path';
import {readJSON,outputDir} from './util.mjs';
const runtime=await readJSON(path.join(outputDir,'document-runtime.json'));
if(!/^skillwalk-document-[a-z0-9-]+$/.test(runtime.container)||!runtime.internalURL.startsWith('http://127.0.0.1:8501/session-'))throw Error('Invalid local document runtime identity');
const child=spawn(process.env.DOCKER_BIN||'docker.exe',['exec','-e','SKILLWALK_LIVE=1','-e','DOCUMENT_TEST_URL='+runtime.internalURL,'-w','/browser',runtime.container,'node','/browser/verify-document-browser.mjs'],{stdio:'inherit',windowsHide:true});
await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>{process.exitCode=code===0?0:1;resolve();});});
