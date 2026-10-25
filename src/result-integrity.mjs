import fs from 'node:fs/promises';import {sha256}from './util.mjs';
export async function verifiedContent(file,proof){const content=await fs.readFile(file);if(!proof.passed||!proof.presentationHash||proof.presentationHash!==sha256(content))throw Error('The artifact changed after verification. Run its checks again before downloading.');return content;}
