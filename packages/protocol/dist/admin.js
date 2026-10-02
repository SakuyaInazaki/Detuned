import { Type } from '@sinclair/typebox';
import { ActorKindSchema, CredentialCapabilitySchema } from './actors.js';
import { SpaceRoleSchema } from './spaces.js';
export const CreateActorRequestSchema = Type.Object({
    kind: ActorKindSchema,
    display_name: Type.String({ minLength: 1, maxLength: 80 }),
}, { additionalProperties: false });
export const CreateCredentialRequestSchema = Type.Object({
    actor_id: Type.String({ minLength: 1 }),
    allowed_space_ids: Type.Optional(Type.Array(Type.String())),
    capabilities: Type.Optional(Type.Array(CredentialCapabilitySchema)),
    expires_at: Type.Optional(Type.Union([Type.String({ format: 'date-time' }), Type.Null()])),
}, { additionalProperties: false });
export const CreateMembershipRequestSchema = Type.Object({
    actor_id: Type.String({ minLength: 1 }),
    role: SpaceRoleSchema,
    reviewer_eligible: Type.Optional(Type.Boolean()),
    independence_group: Type.Optional(Type.Union([Type.String(), Type.Null()])),
}, { additionalProperties: false });
export const PatchMembershipRequestSchema = Type.Object({
    role: Type.Optional(SpaceRoleSchema),
    reviewer_eligible: Type.Optional(Type.Boolean()),
    active: Type.Optional(Type.Boolean()),
    independence_group: Type.Optional(Type.Union([Type.String(), Type.Null()])),
}, { additionalProperties: false });
export const CreateRedactionRequestSchema = Type.Object({
    target_type: Type.Union([Type.Literal('post'), Type.Literal('artifact')]),
    target_id: Type.String({ minLength: 1 }),
    reason: Type.String({ minLength: 1, maxLength: 2000 }),
}, { additionalProperties: false });
//# sourceMappingURL=admin.js.map