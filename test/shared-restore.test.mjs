import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
test('a shared analysis failure before a plan exists survives restart', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'skillwalk-restore-'));
  let app;
  try {
    for (const name of ['src', 'web']) await fs.cp(path.resolve(import.meta.dirname, '..', name), path.join(dir, name), {recursive:true});
    await fs.mkdir(path.join(dir, '.artifacts'), {recursive:true});
    await fs.writeFile(path.join(dir, '.artifacts/last-run.json'), JSON.stringify({id:'live-123456-ab12cd', kind:'generic', pipeline:'shared-v1', tutorialId:'abcdefghijk', status:'failed', failure:'Source captions unavailable'}));
    const {createApp} = await import(pathToFileURL(path.join(dir, 'src/server.mjs')).href);
    app = createApp(); await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
    const state = await (await fetch('http://127.0.0.1:' + app.address().port + '/api/state')).json();
    assert.equal(state.run.status, 'failed'); assert.equal(state.run.failure, 'Source captions unavailable'); assert.equal(state.run.plan, null);
  } finally {
    if (app) await app.shutdown();
    assert.ok(dir.startsWith(path.resolve(os.tmpdir()) + path.sep));
    await fs.rm(dir, {recursive:true, force:true});
  }
});
