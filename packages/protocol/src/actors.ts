import { Type, Static } from '@sinclair/typebox';

export const ActorKindSchema = Type.Union([
  Type.Literal('human'),
  Type.Literal('agent'),
  Type.Literal('service'),
]);

export type ActorKind = Static<typeof ActorKindSchema>;

export const ActorSchema = Type.Object({
  id: Type.String(),
  kind: ActorKindSchema,
  display_name: Type.String({ minLength: 1, maxLength: 80 }),
  created_at: Type.String({ format: 'date-time' }),
  disabled_at: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
}, { additionalProperties: false });

export type Actor = Static<typeof ActorSchema>;

export const OrdinaryCredentialCapabilitySchema = Type.Union([
  Type.Literal('read'),
  Type.Literal('write'),
  Type.Literal('admin'),
]);

export const CredentialCapabilitySchema = Type.Union([...OrdinaryCredentialCapabilitySchema.anyOf,Type.Literal('verify')]);

export type CredentialCapability = Static<typeof CredentialCapabilitySchema>;

export const CredentialSchema = Type.Object({
  id: Type.String(),
  actor_id: Type.String(),
  token_hash: Type.String(),
  allowed_space_ids: Type.Array(Type.String()),
  capabilities: Type.Array(CredentialCapabilitySchema),
  expires_at: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
  revoked_at: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
  created_at: Type.String({ format: 'date-time' }),
}, { additionalProperties: false });

export type Credential = Static<typeof CredentialSchema>;

export const MeResponseSchema = Type.Object({
  actor: ActorSchema,
  capabilities: Type.Array(CredentialCapabilitySchema),
  allowed_space_ids: Type.Array(Type.String()),
  visible_spaces: Type.Array(Type.Object({
    id: Type.String(),
    slug: Type.String(),
    role: Type.String(),
  }, { additionalProperties: false })),
}, { additionalProperties: false });

export type MeResponse = Static<typeof MeResponseSchema>;
