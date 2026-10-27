import fs from 'node:fs/promises';
import path from 'node:path';
import {LocalRun} from './ui-runner.mjs';
import {acquireTutorial} from './acquire.mjs';
import {json, readJSON, sha256} from './util.mjs';
import {deliverCheckedResult} from './result-delivery.mjs';

export class GenericRun extends LocalRun {
  constructor(id, notify, tutorialId) {
    super(id, notify);
    this.kind = 'generic';
    this.tutorialId = tutorialId;
    this.artifactName = 'website.html';
  }

  async analyze() {
    await this.init();
    this.state('analyzing', 'Acquiring actual tutorial and captions');
    await acquireTutorial('https://www.youtube.com/watch?v=' + this.tutorialId);
    this.throwIfStopping();
    const result = await this.step('generic-proof.mjs', ['analyze']);
    if (result.code !== 0) throw Error(result.error || 'Source analysis failed');
    this.plan = await readJSON(path.join(this.dir, 'output/plan.json'));
    const demo = await readJSON(path.join(this.dir, 'output/demo-brief.json'));
    this.demoBrief = demo.brief;
    await json(path.join(this.dir, 'brief.json'), demo.brief);
    this.demoSource = demo.provenance;
    this.throwIfStopping();
    this.state('review', 'Review the source-derived task before running.');
  }

  async execute() {
    this.stopping = false;
    this.failure = null;
    this.checks = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      this.throwIfStopping();
      this.state(attempt ? 'repairing' : 'generating',
        attempt ? 'Gemma is repairing the HTML' : 'Gemma is creating the source-derived HTML');
      let result = await this.step('generic-proof.mjs', ['generate']);
      if (result.code !== 0) {
        this.repairFeedback = result.error || 'Generated artifact rejected';
        continue;
      }
      this.throwIfStopping();
      this.state('testing', 'Testing the actual artifact in isolated Chromium');
      result = await this.step('verify-generic.mjs');
      this.throwIfStopping();
      const report = await readJSON(path.join(this.dir, 'verification/generic-report.json'));
      if (result.code === 0 && report.passed) {
        const hash = sha256(await fs.readFile(path.join(this.dir, 'output/website.html')));
        const generation = await readJSON(path.join(this.dir, 'output/generic-generation.json'));
        if (hash !== generation.sha256 || hash !== report.artifactHash) {
          throw Error('Artifact changed between generation and checks');
        }
        await deliverCheckedResult(this, {
          passed: true, kind: this.kind, sourceVideoId: this.tutorialId,
          presentationHash: hash, artifactHash: hash, checks: report.checks,
          verifiedAt: new Date().toISOString()
        }, 'Local HTML passed the recorded browser checks.');
        return;
      }
      this.repairFeedback = report.failure || result.error;
      this.event('validation-failed', {failure: this.repairFeedback, attempt: attempt + 1});
    }
    throw Error('Bounded generation or verification failed: ' + this.repairFeedback);
  }

  async retry() { return this.execute(); }
}
