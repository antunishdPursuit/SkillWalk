import test from 'node:test';
import assert from 'node:assert/strict';
import {experimentalModelEnvironment} from '../src/experimental-model.mjs';
test('experimental model profile does not inherit the featured text alias', () => {
  const env = {OLLAMA_BASE:'http://127.0.0.1:11435', OLLAMA_TEXT_BASE:'http://127.0.0.1:11434', GEMMA_TEXT_MODEL:'local-gemma'};
  const selected = experimentalModelEnvironment(env);
  assert.equal(selected.GEMMA_TEXT_MODEL, 'gemma3:12b');
  assert.equal(selected.GEMMA_MODEL, selected.GEMMA_TEXT_MODEL);
  assert.equal(selected.OLLAMA_TEXT_BASE, env.OLLAMA_BASE);
  assert.equal(env.GEMMA_TEXT_MODEL, 'local-gemma');
});
test('experimental overrides remain local and explicit', () => {
  assert.equal(experimentalModelEnvironment({EXPERIMENTAL_GEMMA_MODEL:'gemma3:4b'}).GEMMA_MODEL, 'gemma3:4b');
  for (const base of ['https://example.com', 'http://example.com', 'http://user:secret@localhost:11434']) {
    assert.throws(() => experimentalModelEnvironment({EXPERIMENTAL_OLLAMA_BASE:base}), /local loopback/);
  }
});

import {validateBridgeRequest} from '../src/document-broker.mjs';
test('document broker admits only its trusted run model and unchanged embeddings',()=>{
 const request={method:'POST',path:'/api/generate',body:{model:'gemma3:12b',prompt:'test'}};
 assert.throws(()=>validateBridgeRequest(request),/Unapproved model/);
 assert.equal(validateBridgeRequest(request,'gemma3:12b'),request);
 assert.throws(()=>validateBridgeRequest({...request,body:{model:'gemma3:4b'}},'gemma3:12b'),/Unapproved model/);
 assert.doesNotThrow(()=>validateBridgeRequest({method:'POST',path:'/api/embed',body:{model:'embeddinggemma',input:'test'}},'gemma3:12b'));
});
