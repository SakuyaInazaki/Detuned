import { Type } from '@sinclair/typebox';
import { WebSessionResponseSchema, type WebSessionResponse } from './web-auth.js';
import addFormats from 'ajv-formats';
import { Value } from '@sinclair/typebox/value';
import { ActorSchema, MeResponseSchema, type MeResponse } from './actors.js';
import { SessionSchema, type Session } from './spaces.js';

// These are the three known format locations, not a general schema walker.
// Preserve every other public constraint; formats are checked with the locked
// full validator below instead of mutating TypeBox's process-global registry.
const { format: actorCreatedFormat, ...actorCreated } = ActorSchema.properties.created_at;
const { format: actorDisabledFormat, ...actorDisabled } = ActorSchema.properties.disabled_at.anyOf[0];
const { format: sessionCreatedFormat, ...sessionCreated } = SessionSchema.properties.created_at;
const meCheckSchema = {
  ...MeResponseSchema,
  properties: {
    ...MeResponseSchema.properties,
    actor: {
      ...ActorSchema,
      properties: {
        ...ActorSchema.properties,
        created_at: actorCreated,
        disabled_at: { ...ActorSchema.properties.disabled_at, anyOf: [actorDisabled, ActorSchema.properties.disabled_at.anyOf[1]] },
      },
    },
  },
};
const sessionCheckSchema = { ...SessionSchema, properties: { ...SessionSchema.properties, created_at: sessionCreated } };
const dateTime: unknown = addFormats.default.get('date-time', 'full');
function validDate(value: string): boolean {
  if (typeof dateTime === 'function') return dateTime(value) === true;
  if (dateTime instanceof RegExp) return dateTime.test(value);
  if (typeof dateTime !== 'object' || dateTime === null || !('validate' in dateTime)) return false;
  const validate = dateTime.validate;
  return typeof validate === 'function' ? validate(value) === true : validate instanceof RegExp && validate.test(value);
}

export function isMeResponse(value: unknown): value is MeResponse {
  return Value.Check(meCheckSchema, value)
    && actorCreatedFormat === 'date-time' && actorDisabledFormat === 'date-time'
    && validDate(value.actor.created_at)
    && (value.actor.disabled_at === null || validDate(value.actor.disabled_at));
}

export function isSession(value: unknown): value is Session {
  return Value.Check(sessionCheckSchema, value)
    && sessionCreatedFormat === 'date-time' && validDate(value.created_at);
}

// Known web response format locations: nested me actor dates (isMeResponse)
// and expires_at. The structural derivative keeps all public constraints.
const { format: webExpiryFormat, ...webExpiry } = WebSessionResponseSchema.properties.expires_at;
const webCheckSchema = { ...WebSessionResponseSchema, properties: { ...WebSessionResponseSchema.properties,
  me: Type.Unknown(), expires_at: webExpiry } };
export function isWebSessionResponse(value: unknown): value is WebSessionResponse {
  return Value.Check(webCheckSchema, value) && isMeResponse(value.me)
    && webExpiryFormat === 'date-time' && validDate(value.expires_at);
}
