import test from 'node:test';
import assert from 'node:assert/strict';
import {validateGenericPlan} from '../src/generic-proof.mjs';

const segments = [{id: 's0', start: 3, text: 'Create a page titled Example and show a button.'}];

test('generic plans must cite exact source and provide visible checks', () => {
  const plan = {
    supported: true, summary: 'Build a page', interactive: true,
    requirements: [{description: 'HTML page', available: true, segment_id: 's0', quote: 'Create a page'}],
    steps: [{action: 'Create a page', segment_id: 's0', quote: 'page titled Example'}],
    checks: [{type: 'click', target: 'Go', expected: 'Example', segment_id: 's0', quote: 'show a button'}]
  };
  assert.deepEqual(validateGenericPlan(plan, segments), []);
  assert.equal(plan.steps[0].timestamp, 3);
  assert.equal(plan.steps[0].quote, segments[0].text);
  assert.deepEqual(validateGenericPlan({...plan, checks: [{...plan.checks[0], expected: '1'}]}, segments), []);
  assert.notDeepEqual(validateGenericPlan({...plan, steps: [{...plan.steps[0], segment_id: 'missing'}]}, segments), []);
  assert.notDeepEqual(validateGenericPlan({...plan, checks: []}, segments), []);
  assert.notDeepEqual(validateGenericPlan({...plan, summary: 'Insufficient evidence to determine behavior'}, segments), []);
  assert.deepEqual(validateGenericPlan({...plan, checks: [{...plan.checks[0], type: 'click_console'}]}, segments), []);
  assert.notDeepEqual(validateGenericPlan({...plan, checks: [{...plan.checks[0], type: 'visible'}]}, segments), []);
  assert.notDeepEqual(validateGenericPlan({...plan, supported: false}, segments), []);
  assert.notDeepEqual(validateGenericPlan({...plan, requirements: [{...plan.requirements[0], available: false}]}, segments), []);
});

test('frame-observation citations retain their provenance', () => {
  const frame = {id: 'f1', start: 1, text: 'A button says Go', sourceKind: 'frame-observation'};
  const plan = {supported: true, interactive: false, summary: 'Page',
    requirements: [{description: 'Button', available: true, segment_id: 'f1', quote: 'button says Go'}],
    steps: [{action: 'Make button', segment_id: 'f1', quote: 'button says Go'}],
    checks: [{type: 'visible', target: '', expected: 'Go!', segment_id: 'f1', quote: 'button says Go'}]};
  assert.deepEqual(validateGenericPlan(plan, [frame]), []);
  assert.equal(plan.steps[0].sourceKind, 'frame-observation');
});

test('unsupported interactive plans retain their explicit incompatibility', () => {
  const plan = {supported: false, interactive: true, summary: 'Requires an unavailable backend',
    requirements: [{description: 'Backend', available: false, segment_id: 's0', quote: 'Create a page'}],
    steps: [], checks: []};
  assert.deepEqual(validateGenericPlan(plan, segments), []);
});
