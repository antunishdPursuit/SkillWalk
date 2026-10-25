import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const artifacts=path.join(root,'.artifacts');
export const sha256=data=>createHash('sha256').update(data).digest('hex');
export async function json(file,value){await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(value,null,2)+'\n');}
export async function readJSON(file){return JSON.parse(await fs.readFile(file,'utf8'));}

const run=process.env.PROOF_RUN||'';if(run&&!/^[a-z0-9][a-z0-9-]{0,60}$/.test(run))throw Error('Invalid PROOF_RUN');
export const outputDir=run?path.join(artifacts,'experiments',run,'output'):path.join(artifacts,'output');
export const verificationDir=run?path.join(artifacts,'experiments',run,'verification'):path.join(artifacts,'verification');
