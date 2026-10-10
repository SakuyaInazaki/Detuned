import { PostRevisionMetadataSchema, PostRevisionCatalogPageSchema, PostRevisionArtifactsPageSchema, RevisionArtifactCatalogItemSchema, RevisionArtifactCatalogReadySchema, RevisionArtifactCatalogMissingSchema, RevisionArtifactCatalogRedactedSchema, type PostRevisionCatalogPage, type PostRevisionArtifactsPage } from './post-catalogs.js';
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

// Catalog format locations are only revision.created_at and ready/missing
// artifact.created_at. Keep public schemas intact and every other constraint.
const { format: revisionMetadataFormat, ...revisionMetadataDate } = PostRevisionMetadataSchema.properties.created_at;
const revisionMetadataCheck = { ...PostRevisionMetadataSchema, properties: { ...PostRevisionMetadataSchema.properties, created_at: revisionMetadataDate } };
const revisionCatalogCheck = { ...PostRevisionCatalogPageSchema, anyOf: PostRevisionCatalogPageSchema.anyOf.map(page => ({
  ...page, properties: { ...page.properties, data: { ...page.properties.data, properties: { ...page.properties.data.properties,
    revisions: { ...page.properties.data.properties.revisions, items: revisionMetadataCheck },
  } } },
})) };
const { format: readyCatalogFormat, ...readyCatalogDate } = RevisionArtifactCatalogReadySchema.properties.created_at;
const { format: missingCatalogFormat, ...missingCatalogDate } = RevisionArtifactCatalogMissingSchema.properties.created_at;
const artifactCatalogItemsCheck = { ...RevisionArtifactCatalogItemSchema, anyOf: [
  { ...RevisionArtifactCatalogReadySchema, properties: { ...RevisionArtifactCatalogReadySchema.properties, created_at: readyCatalogDate } },
  { ...RevisionArtifactCatalogMissingSchema, properties: { ...RevisionArtifactCatalogMissingSchema.properties, created_at: missingCatalogDate } },
  RevisionArtifactCatalogRedactedSchema,
] };
const revisionArtifactsCheck = { ...PostRevisionArtifactsPageSchema, anyOf: PostRevisionArtifactsPageSchema.anyOf.map(page => ({
  ...page, properties: { ...page.properties, data: { ...page.properties.data, properties: { ...page.properties.data.properties,
    artifacts: { ...page.properties.data.properties.artifacts, items: artifactCatalogItemsCheck },
  } } },
})) };
export function isPostRevisionCatalogPage(value: unknown): value is PostRevisionCatalogPage {
  return Value.Check(revisionCatalogCheck, value) && revisionMetadataFormat === 'date-time'
    && value.data.revisions.every(revision => validDate(revision.created_at));
}
export function isPostRevisionArtifactsPage(value: unknown): value is PostRevisionArtifactsPage {
  return Value.Check(revisionArtifactsCheck, value) && readyCatalogFormat === 'date-time' && missingCatalogFormat === 'date-time'
    && value.data.artifacts.every(artifact => artifact.state === 'redacted' || validDate(artifact.created_at));
}
