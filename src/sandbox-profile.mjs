import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {artifacts,sha256} from './util.mjs';

export const sandboxProfileSource=Object.freeze({
 version:'1.64.0',
 url:'https://raw.githubusercontent.com/microsoft/playwright/v1.64.0/utils/docker/seccomp_profile.json',
 sha256:'cc3e61cabda6bbc1e53e54d27ba4d55a9d3be829b6dd1a596f4a7b31b1cc7849'
});
const limit=262144;
export function validateSandboxProfile(bytes,source=sandboxProfileSource){
 if(bytes.length>limit||sha256(bytes)!==source.sha256)throw Error('Browser sandbox profile checksum mismatch; restore the pinned Playwright profile before continuing.');
 let profile;try{profile=JSON.parse(bytes.toString('utf8'));}catch{throw Error('Browser sandbox profile is not valid JSON.');}
 if(profile.defaultAction!=='SCMP_ACT_ERRNO'||!Array.isArray(profile.syscalls))throw Error('Browser sandbox profile must retain the pinned default-deny policy.');
 return profile;
}
export async function ensureSandboxProfile({directory=path.join(artifacts,'runtime'),download=true,fetchImpl=fetch,source=sandboxProfileSource}={}){
 const file=path.join(directory,'seccomp_profile.json');
 try{
  const stat=await fs.lstat(file);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size>limit)throw Error('Browser sandbox profile must be a regular pinned file.');
  validateSandboxProfile(await fs.readFile(file),source);return file;
 }catch(error){if(error.code!=='ENOENT')throw error;}
 if(!download)throw Error('Browser sandbox profile is missing. Run npm run setup:document before starting the document runtime.');
 const response=await fetchImpl(source.url,{redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Cannot download the official browser sandbox profile: HTTP '+response.status);
 const chunks=[];let size=0;
 for await(const chunk of response.body){size+=chunk.length;if(size>limit)throw Error('Browser sandbox profile download exceeds its size limit.');chunks.push(chunk);}
 const bytes=Buffer.concat(chunks);validateSandboxProfile(bytes,source);
 await fs.mkdir(directory,{recursive:true});
 const staging=file+'.'+randomUUID()+'.tmp';
 try{
  await fs.writeFile(staging,bytes,{flag:'wx'});
  await fs.rename(staging,file);
 }finally{await fs.rm(staging,{force:true});}
 return file;
}
