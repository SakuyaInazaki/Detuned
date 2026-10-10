import { type Static } from '@sinclair/typebox';
export declare const WEB_AUTH_PATH = "/auth/session";
export declare const WEB_CSRF_HEADER = "x-detuned-csrf";
export declare const WEB_SESSION_COOKIE = "detuned_session";
export declare const WebSessionQuerySchema: import("@sinclair/typebox").TObject<{}>;
export declare const CreateWebSessionRequestSchema: import("@sinclair/typebox").TObject<{}>;
export declare const WebSessionResponseSchema: import("@sinclair/typebox").TObject<{
    me: import("@sinclair/typebox").TObject<{
        actor: import("@sinclair/typebox").TObject<{
            id: import("@sinclair/typebox").TString;
            kind: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"human">, import("@sinclair/typebox").TLiteral<"agent">, import("@sinclair/typebox").TLiteral<"service">]>;
            display_name: import("@sinclair/typebox").TString;
            created_at: import("@sinclair/typebox").TString;
            disabled_at: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        }>;
        capabilities: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"read">, import("@sinclair/typebox").TLiteral<"write">, import("@sinclair/typebox").TLiteral<"admin">, import("@sinclair/typebox").TLiteral<"verify">]>>;
        allowed_space_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        visible_spaces: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            id: import("@sinclair/typebox").TString;
            slug: import("@sinclair/typebox").TString;
            role: import("@sinclair/typebox").TString;
        }>>;
    }>;
    csrf_token: import("@sinclair/typebox").TString;
    expires_at: import("@sinclair/typebox").TString;
}>;
export type WebSessionResponse = Static<typeof WebSessionResponseSchema>;
//# sourceMappingURL=web-auth.d.ts.map