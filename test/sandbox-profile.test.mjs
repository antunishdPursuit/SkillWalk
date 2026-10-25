import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {ensureSandboxProfile,validateSandboxProfile,sandboxProfileSource} from '../src/sandbox-profile.mjs';
import {sha256} from '../src/util.mjs';
const bytes=Buffer.from(JSON.stringify({defaultAction:'SCMP_ACT_ERRNO',syscalls:[{names:['read'],action:'SCMP_ACT_ALLOW'}]}));
const source={url:'https://example.invalid/pinned-profile',sha256:sha256(bytes)};
async function fixture(fn){const directory=await fs.mkdtemp(path.join(os.tmpdir(),'skillwalk-profile-'));try{await fn(directory);}finally{assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep));await fs.rm(directory,{recursive:true,force:true});}}
test('cold setup prepares the pinned profile and warm setup needs no network',()=>fixture(async directory=>{
 let calls=0;const fetchImpl=async url=>{calls++;assert.equal(url,source.url);return new Response(bytes);};
 const file=await ensureSandboxProfile({directory,source,fetchImpl});
 assert.deepEqual(await fs.readFile(file),bytes);
 assert.equal(await ensureSandboxProfile({directory,source,fetchImpl:()=>{throw Error('Warm setup must not fetch');}}),file);
 assert.equal(calls,1);
}));
test('cold setup rejects failed, altered or oversized downloads without installing them',()=>fixture(async directory=>{
 for(const fetchImpl of [async()=>new Response('offline',{status:503}),async()=>new Response('{}'),async()=>new Response(Buffer.alloc(262145))]){
  await assert.rejects(()=>ensureSandboxProfile({directory,source,fetchImpl}));
  await assert.rejects(()=>fs.access(path.join(directory,'seccomp_profile.json')),/ENOENT/);
 }
}));
test('warm tampering fails closed without replacement or a weaker fallback',()=>fixture(async directory=>{
 const file=path.join(directory,'seccomp_profile.json');const altered=Buffer.from('{"defaultAction":"SCMP_ACT_ALLOW","syscalls":[]}');await fs.writeFile(file,altered);
 await assert.rejects(()=>ensureSandboxProfile({directory,source,fetchImpl:()=>{throw Error('Do not replace changed cached policy');}}),/checksum mismatch/);
 assert.deepEqual(await fs.readFile(file),altered);
}));
test('runtime missing-profile error explains setup; a matching hash never permits default allow',()=>fixture(async directory=>{
 await assert.rejects(()=>ensureSandboxProfile({directory,download:false}),/npm run setup:document/);
 const altered=Buffer.from('{"defaultAction":"SCMP_ACT_ALLOW","syscalls":[]}');
 assert.throws(()=>validateSandboxProfile(altered,{sha256:sha256(altered)}),/default-deny/);
 assert.match(sandboxProfileSource.url,/microsoft\/playwright\/v1\.64\.0/);
}));
