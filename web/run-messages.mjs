export const compatibilityNotice = 'SkillWalk uses local Gemma models to follow tutorials. Results depend on the tutorial’s tools, available materials, and your computer. Tutorials using compatible local tools may work more reliably. Tutorials demonstrating other models or services may require adaptations that change the result. SkillWalk will check compatibility before starting.';

export function failureMessage(failure, {stopped = false} = {}) {
  const detail = String(failure || 'The local run stopped before verification finished.');
  let action = 'Review the failed check below before retrying. A retry may produce a different result.';
  if (/captions|transcript/i.test(detail)) action = 'Try a public tutorial with available English captions.';
  else if (/ECONNREFUSED|fetch failed|model.*(?:unavailable|not found)/i.test(detail)) action = 'Check that the configured local Gemma service is running, then retry.';
  else if (/outside supported|unavailable required|unsupported capability/i.test(detail)) action = 'Choose a tutorial whose required tools and materials are available locally.';
  return `${stopped ? 'SkillWalk stopped this tutorial.' : 'SkillWalk couldn’t complete this tutorial.'} What failed: ${detail} What’s available: No verified final result from this attempt. Any visible preview is unverified. What you can try: ${action} This run is incomplete; SkillWalk has not verified that the output matches the tutorial.`;
}
