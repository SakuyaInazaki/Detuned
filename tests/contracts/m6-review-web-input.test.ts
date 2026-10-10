import { it, expect } from 'vitest';
import { parseReviewArray, parseRequestInput, parseSubmissionInput, freezeReviewIntent } from '../../packages/web/src/review-input.js';
it('WI01 structured form arrays reject malformed and byte-over-budget inputs without reflecting contents', () => {
  expect(parseReviewArray('[{"post_id":"p","revision":1}]','依赖')).toEqual([{post_id:'p',revision:1}]);
  for(const text of ['PRIVATE_INVALID','{}','["'+'界'.repeat(90000)+'"]']) {
    try { parseReviewArray(text,'依赖'); throw new Error('accepted'); } catch(e) { expect(String(e)).not.toContain('PRIVATE_INVALID'); expect(String(e)).not.toBe('Error: accepted'); }
  }
});
it('WI02 complete request and submission forms retain canonical service input constraints', () => {
  const request={target_ref:{post_id:'p',revision:1},dependency_refs:[],artifact_ids:[],code_refs:[],declared_contributors:[],reviewer_actor_ids:['a'],expected_policy_revision:1,reproduction_instructions:'run'};
  expect(parseRequestInput(request)).toBe(request);
  expect(()=>parseRequestInput({...request,reviewer_actor_ids:[]})).toThrow();
  const submission={snapshot_sha256:'a'.repeat(64),reviewer_session_id:'s',completion_status:'complete',verdict:'accept',coverage:'all',checks_performed:'manual',evidence_refs:[],pending_requirements:[],limitations:[],independence_statement:{participated_in_material:false,exposed_to_other_reviews:false,statement:'own'}};
  expect(parseSubmissionInput(submission)).toBe(submission);
  expect(()=>parseSubmissionInput({...submission,pending_requirements:['not done']})).toThrow();
  expect(()=>parseSubmissionInput({...submission,independence_statement:{...submission.independence_statement,participated_in_material:true}})).toThrow();
});
it('WI03 unknown-result retry owns a detached body and original key while edits form a separate intent',()=>{
  const body={target_ref:{post_id:'p',revision:1},dependency_refs:[],artifact_ids:[],code_refs:[],declared_contributors:[],reviewer_actor_ids:['a'],expected_policy_revision:1,reproduction_instructions:'original'};
  const frozen=freezeReviewIntent({kind:'request',key:'fixed-key',body});
  body.reproduction_instructions='edited';body.reviewer_actor_ids.push('b');
  expect(frozen.key).toBe('fixed-key');expect(frozen.body.reproduction_instructions).toBe('original');expect(frozen.body.reviewer_actor_ids).toEqual(['a']);
});
