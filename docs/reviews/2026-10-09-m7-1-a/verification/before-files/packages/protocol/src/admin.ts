import { Type, Static } from '@sinclair/typebox';
import { ActorKindSchema, ActorSchema, CredentialCapabilitySchema } from './actors.js';
import { SpaceRoleSchema } from './spaces.js';

export const CreateActorRequestSchema = Type.Object({
  kind: ActorKindSchema,
  display_name: Type.String({ minLength: 1, maxLength: 80 }),
}, { additionalProperties: false });

export type CreateActorRequest = Static<typeof CreateActorRequestSchema>;

export const CreateCredentialRequestSchema = Type.Object({
  actor_id: Type.String({ minLength: 1 }),
  allowed_space_ids: Type.Optional(Type.Array(Type.String())),
  capabilities: Type.Optional(Type.Array(CredentialCapabilitySchema)),
  expires_at: Type.Optional(Type.Union([Type.String({ format: 'date-time' }), Type.Null()])),
}, { additionalProperties: false });

export type CreateCredentialRequest = Static<typeof CreateCredentialRequestSchema>;

export const CreateMembershipRequestSchema = Type.Object({
  actor_id: Type.String({ minLength: 1 }),
  role: SpaceRoleSchema,
  reviewer_eligible: Type.Optional(Type.Boolean()),
  independence_group: Type.Optional(Type.Union([Type.String(), Type.Null()])),
}, { additionalProperties: false });

export type CreateMembershipRequest = Static<typeof CreateMembershipRequestSchema>;

export const PatchMembershipRequestSchema = Type.Object({
  role: Type.Optional(SpaceRoleSchema),
  reviewer_eligible: Type.Optional(Type.Boolean()),
  active: Type.Optional(Type.Boolean()),
  independence_group: Type.Optional(Type.Union([Type.String(), Type.Null()])),
}, { additionalProperties: false });

export type PatchMembershipRequest = Static<typeof PatchMembershipRequestSchema>;

export const CreateRedactionRequestSchema = Type.Object({
  target_type: Type.Union([Type.Literal('post'), Type.Literal('artifact')]),
  target_id: Type.String({ minLength: 1 }),
  reason: Type.String({ minLength: 1, maxLength: 2000 }),
}, { additionalProperties: false });

export type CreateRedactionRequest = Static<typeof CreateRedactionRequestSchema>;

// Public operation data; credential token is returned only by its creation call.
export const CreateCredentialDataSchema = Type.Object({ credential_id: ActorSchema.properties.id, actor_id: ActorSchema.properties.id, token: Type.String() }, { additionalProperties: false });
export type CreateCredentialData = Static<typeof CreateCredentialDataSchema>;
export const RevokeCredentialDataSchema = Type.Object({ revoked: Type.Literal(true) }, { additionalProperties: false });
export type RevokeCredentialData = Static<typeof RevokeCredentialDataSchema>;
export const DeactivateMembershipDataSchema = Type.Object({ deactivated: Type.Literal(true) }, { additionalProperties: false });
export type DeactivateMembershipData = Static<typeof DeactivateMembershipDataSchema>;
export const RedactionResultSchema = Type.Object({ redaction_id: ActorSchema.properties.id }, { additionalProperties: false });
export type RedactionResult = Static<typeof RedactionResultSchema>;
