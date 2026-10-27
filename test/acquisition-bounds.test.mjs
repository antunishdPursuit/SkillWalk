import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAcquisitionMetadata} from '../src/acquire.mjs';

test('source duration is checked before video acquisition', () => {
  for (const duration of [0, 19, 3601, NaN, null]) {
    assert.throws(() => validateAcquisitionMetadata({duration}), /20 seconds and one hour/);
  }
  for (const duration of [20, 3600]) assert.doesNotThrow(() => validateAcquisitionMetadata({duration}));
});
