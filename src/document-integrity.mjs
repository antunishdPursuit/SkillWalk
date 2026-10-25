import fs from 'node:fs/promises';
import path from 'node:path';
import {sha256} from './util.mjs';
export const documentAppFiles=['app.py','entry.py','ollama_bridge.py','make_sample.py','config.json','requirements.txt','Dockerfile','SOURCE-LICENSE.txt','source-original.py','source-provenance.json','README.md'];
export async function appManifest(directory){
 const names=await fs.readdir(directory);
 if(names.length!==documentAppFiles.length||names.some(n=>!documentAppFiles.includes(n)))throw Error('Checked app contains unexpected or missing source files');
 const hashes={};
 for(const name of documentAppFiles){const file=path.join(directory,name),stat=await fs.lstat(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>2000000)throw Error('Unsafe checked app source file');hashes[name]=sha256(await fs.readFile(file));}
 return hashes;
}
export async function verifyAppManifest(directory,expected){
 if(!expected||Object.keys(expected).length!==documentAppFiles.length)throw Error('Saved app lacks a verified source manifest. Use the checked download or run the tutorial again.');
 const actual=await appManifest(directory);
 if(documentAppFiles.some(name=>actual[name]!==expected[name]))throw Error('App source or configuration changed after verification. Use the original checked download or run the tutorial again.');
 return actual;
}

export async function sealDocumentEvidence(directory){
 const data=path.join(directory,'document-data'),output=path.join(directory,'output');
 const reportBytes=await fs.readFile(path.join(data,'browser-report.json')),extractionBytes=await fs.readFile(path.join(data,'extraction.json')),configBytes=await fs.readFile(path.join(output,'app/config.json'));
 const report=JSON.parse(reportBytes),extraction=JSON.parse(extractionBytes),configHash=sha256(configBytes);
 if(!report.passed||report.documentHash!==extraction.documentHash||report.configurationHash!==configHash||extraction.configurationHash!==configHash)throw Error('Document evidence changed or does not match the checked configuration');
 const verification=path.join(directory,'verification');await fs.mkdir(verification,{recursive:true});
 await fs.writeFile(path.join(verification,'document-browser-report.json'),reportBytes);
 await fs.writeFile(path.join(verification,'document-extraction.json'),extractionBytes);
 return{browserReportHash:sha256(reportBytes),extractionHash:sha256(extractionBytes),configHash,verificationFiles:{report:'verification/document-browser-report.json',extraction:'verification/document-extraction.json'}};
}
export async function verifySealedEvidence(directory,proof){
 for(const [file,hash]of [['document-browser-report.json',proof.browserReportHash],['document-extraction.json',proof.extractionHash]]){
  if(!hash||sha256(await fs.readFile(path.join(directory,'verification',file)))!==hash)throw Error('The checked document evidence changed after verification');
 }
}
