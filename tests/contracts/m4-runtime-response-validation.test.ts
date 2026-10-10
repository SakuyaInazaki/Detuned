import { describe, expect, it } from 'vitest';
import { isMeResponse, isSession, type MeResponse } from '@detuned/protocol';

const date = '2026-10-09T10:00:00.000Z';
const me = (): MeResponse => ({ actor: { id: 'legacy-id', kind: 'agent', display_name: 'Reader', created_at: date, disabled_at: null }, capabilities: ['read'], allowed_space_ids: ['space'], visible_spaces: [{ id: 'space', slug: 'research', role: 'reader' }] });
const session = () => ({ id: 'session', actor_id: 'legacy-id', space_id: 'space', client_name: 'test', client_version: '1', harness_session_id: null, metadata: { arbitrary: { nested: true } }, created_at: date });

describe('runtime response guards', () => {
  it('RV01 accepts real shapes without mutation or replacement and keeps public identity semantics', () => {
    const identity = me(); const record = session(); const before = structuredClone({ identity, record });
    expect(isMeResponse(identity)).toBe(true); expect(isSession(record)).toBe(true);
    expect({ identity, record }).toEqual(before);
    identity.actor.disabled_at = date;
    expect(isMeResponse(identity)).toBe(true);
  });
  it('RV02 rejects missing, wrong and extra fields at the actual nested boundaries without repairing inputs', () => {
    const candidates: unknown[] = [null, { ...me(), extra: true }, { ...me(), actor: { ...me().actor, extra: true } }, { ...me(), visible_spaces: [{ ...me().visible_spaces[0], extra: true }] }, { ...me(), capabilities: ['owner'] }, { ...me(), actor: { ...me().actor, display_name: '' } }, { actor: me().actor }, { ...me(), allowed_space_ids: [1] }];
    const records: unknown[] = [{ ...session(), extra: true }, { ...session(), client_name: '' }, { ...session(), harness_session_id: 3 }, { ...session(), metadata: [] }, { ...session(), created_at: undefined }];
    for (const input of candidates) { const before = structuredClone(input); expect(isMeResponse(input)).toBe(false); expect(input).toEqual(before); }
    for (const input of records) { const before = structuredClone(input); expect(isSession(input)).toBe(false); expect(input).toEqual(before); }
  });
  it('RV03 checks every date-time location with full validation rather than accepting arbitrary strings', () => {
    for (const invalid of ['private-marker', '2026-02-30T00:00:00Z', '2026-10-09T25:00:00Z', '2026-10-09']) {
      expect(isMeResponse({ ...me(), actor: { ...me().actor, created_at: invalid } })).toBe(false);
      expect(isMeResponse({ ...me(), actor: { ...me().actor, disabled_at: invalid } })).toBe(false);
      expect(isSession({ ...session(), created_at: invalid })).toBe(false);
    }
    expect(isSession({ ...session(), created_at: '2026-10-09T12:30:00+02:30' })).toBe(true);
  });
});
