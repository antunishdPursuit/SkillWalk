import fs from 'node:fs/promises';
import {renameSync} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

// Keep the old proof until the final stop check. Commit and completion are one
// event-loop turn, so an acknowledged Stop cannot land between those operations.
export async function deliverCheckedResult(run,proof,message,{writeFile=fs.writeFile,openFile=fs.open,commit=renameSync}={}){
 run.throwIfStopping();
 const target=path.join(run.dir,'result.json');
 const staging=path.join(run.dir,'.result-'+randomUUID()+'.tmp');
 let handle,owned=false;
 try{
  handle=await openFile(staging,'wx');owned=true;run.throwIfStopping();
  await writeFile(handle,JSON.stringify(proof,null,2)+'\n',{encoding:'utf8'});
  await handle.close();handle=null;
  run.throwIfStopping();
  commit(staging,target);
  run.checks=proof.checks||[];
  run.state('complete',message);
 }finally{await handle?.close();if(owned)await fs.rm(staging,{force:true});}
}
