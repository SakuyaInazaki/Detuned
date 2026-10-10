import { Type, type Static } from '@sinclair/typebox';
import { MeResponseSchema } from './actors.js';
export const WEB_AUTH_PATH = '/auth/session';
export const WEB_CSRF_HEADER = 'x-detuned-csrf';
export const WEB_SESSION_COOKIE = 'detuned_session';
export const WebSessionQuerySchema = Type.Object({}, { additionalProperties: false });
export const CreateWebSessionRequestSchema = Type.Object({}, { additionalProperties: false });
export const WebSessionResponseSchema = Type.Object({
  me: MeResponseSchema,
  csrf_token: Type.String({ minLength: 1 }),
  expires_at: Type.String({ format: 'date-time' }),
}, { additionalProperties: false });
export type WebSessionResponse = Static<typeof WebSessionResponseSchema>;
