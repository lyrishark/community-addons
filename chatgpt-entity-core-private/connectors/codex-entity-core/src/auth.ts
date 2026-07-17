import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { OAuthTokenVerifier } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import {
  createRemoteJWKSet,
  decodeJwt,
  type JWTPayload,
  jwtVerify,
} from "jose";

export const ENTITY_CORE_READ_SCOPE = "entity:read";
export const ENTITY_CORE_MEMORY_WRITE_SCOPE = "memory:write";
export const ENTITY_CORE_SUPPORTED_SCOPES = [
  ENTITY_CORE_READ_SCOPE,
  ENTITY_CORE_MEMORY_WRITE_SCOPE,
] as const;

type HttpAuthMode = "none" | "static-bearer" | "oauth";

export interface ToolAuthContext {
  enabled: boolean;
  resourceMetadataUrl?: string;
}

export interface HttpAuthContext {
  mode: HttpAuthMode;
  toolAuth: ToolAuthContext;
  resource?: string;
  resourceMetadataUrl?: string;
  protectedResourceMetadata?: Record<string, unknown>;
  verifier?: OAuthTokenVerifier;
}

interface CreateHttpAuthContextOptions {
  defaultBaseUrl: string;
}

function envFlag(name: string): boolean {
  return Deno.env.get(name) === "true";
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/g, "");
}

function splitScopes(value: string | undefined): string[] {
  return value?.split(/[,\s]+/).map((scope) => scope.trim()).filter(Boolean) ??
    [];
}

function parseNonNegativeInteger(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value ?? "");
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function quoteHeaderValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function readJwtScopes(payload: JWTPayload): string[] {
  const scope = payload.scope;
  if (typeof scope === "string") return splitScopes(scope);

  const scp = payload.scp;
  if (Array.isArray(scp)) {
    return scp.filter((value): value is string => typeof value === "string");
  }

  const permissions = payload.permissions;
  if (Array.isArray(permissions)) {
    return permissions.filter((value): value is string =>
      typeof value === "string"
    );
  }

  return [];
}

function claimContains(value: unknown, expected: string): boolean {
  if (typeof value === "string") return value === expected;
  if (Array.isArray(value)) return value.includes(expected);
  return false;
}

function readUnverifiedExpiry(token: string): number | null {
  try {
    const payload = decodeJwt(token);
    return typeof payload.exp === "number" && Number.isFinite(payload.exp)
      ? payload.exp
      : null;
  } catch {
    return null;
  }
}

function formatRelativeExpiry(secondsUntilExpiry: number): string {
  if (secondsUntilExpiry <= 0) return "has expired";
  if (secondsUntilExpiry < 60) {
    return `expires in ${secondsUntilExpiry} second${
      secondsUntilExpiry === 1 ? "" : "s"
    }`;
  }
  const minutes = Math.ceil(secondsUntilExpiry / 60);
  return `expires in about ${minutes} minute${minutes === 1 ? "" : "s"}`;
}

function buildConnectorRefreshMessage(secondsUntilExpiry: number): string {
  return `ChatGPT connector OAuth token ${
    formatRelativeExpiry(secondsUntilExpiry)
  }. Refresh or reconnect the Psycheros connector in ChatGPT before retrying.`;
}

async function discoverJwksUri(issuer: string): Promise<string> {
  const issuerBase = trimTrailingSlash(issuer);
  const candidates = [
    `${issuerBase}/.well-known/openid-configuration`,
    `${issuerBase}/.well-known/oauth-authorization-server`,
  ];

  for (const url of candidates) {
    const response = await fetch(url);
    if (!response.ok) continue;
    const metadata = await response.json() as { jwks_uri?: unknown };
    if (typeof metadata.jwks_uri === "string") return metadata.jwks_uri;
  }

  throw new Error(
    `No jwks_uri found in OAuth/OIDC discovery metadata for ${issuer}`,
  );
}

async function discoverIssuerIdentifier(issuer: string): Promise<string> {
  const issuerBase = trimTrailingSlash(issuer.trim());
  const candidates = [
    `${issuerBase}/.well-known/openid-configuration`,
    `${issuerBase}/.well-known/oauth-authorization-server`,
  ];

  for (const url of candidates) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const metadata = await response.json() as { issuer?: unknown };
      if (typeof metadata.issuer === "string" && metadata.issuer.trim()) {
        return metadata.issuer;
      }
    } catch {
      continue;
    }
  }

  return issuer.trim();
}

class StaticBearerVerifier implements OAuthTokenVerifier {
  constructor(private readonly expectedToken: string) {}

  verifyAccessToken(token: string): Promise<AuthInfo> {
    if (token !== this.expectedToken) {
      return Promise.reject(new Error("Invalid static bearer token"));
    }

    return Promise.resolve({
      token,
      clientId: "static-bearer",
      scopes: [...ENTITY_CORE_SUPPORTED_SCOPES],
      expiresAt: Math.floor(Date.now() / 1000) + 31_536_000,
    });
  }
}

class OidcJwtVerifier implements OAuthTokenVerifier {
  private jwks?: ReturnType<typeof createRemoteJWKSet>;

  constructor(
    private readonly config: {
      issuer: string;
      jwksUri?: string;
      audience?: string;
      resource: string;
      algorithms: string[];
      clockToleranceSeconds: number;
      expiryWarningSeconds: number;
    },
  ) {}

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const expiresAt = readUnverifiedExpiry(token);
    if (
      expiresAt !== null &&
      this.config.expiryWarningSeconds > 0
    ) {
      const secondsUntilExpiry = expiresAt - Math.floor(Date.now() / 1000);
      if (secondsUntilExpiry <= this.config.expiryWarningSeconds) {
        throw new Error(buildConnectorRefreshMessage(secondsUntilExpiry));
      }
    }

    const jwksUri = this.config.jwksUri ??
      await discoverJwksUri(this.config.issuer);
    this.jwks ??= createRemoteJWKSet(new URL(jwksUri));

    const verifyOptions = {
      issuer: this.config.issuer,
      algorithms: this.config.algorithms,
      clockTolerance: this.config.clockToleranceSeconds,
      ...(this.config.audience ? { audience: this.config.audience } : {}),
    };
    const { payload } = await jwtVerify(token, this.jwks, verifyOptions);

    if (!this.config.audience) {
      const resourceClaim = (payload as JWTPayload & { resource?: unknown })
        .resource;
      const matchesResource =
        claimContains(payload.aud, this.config.resource) ||
        claimContains(resourceClaim, this.config.resource);
      if (!matchesResource) {
        throw new Error(
          "Token audience/resource does not match this MCP server",
        );
      }
    }

    return {
      token,
      clientId: String(payload.client_id ?? payload.azp ?? "unknown-client"),
      scopes: readJwtScopes(payload),
      expiresAt: payload.exp,
      resource: new URL(this.config.resource),
      extra: {
        subject: payload.sub,
        issuer: payload.iss,
        audience: payload.aud,
      },
    };
  }
}

export async function createHttpAuthContext(
  options: CreateHttpAuthContextOptions,
): Promise<HttpAuthContext> {
  const defaultBaseUrl = trimTrailingSlash(
    Deno.env.get("ENTITY_CONNECTOR_PUBLIC_BASE_URL") ?? options.defaultBaseUrl,
  );
  const allowUnauthenticated = envFlag(
    "ENTITY_CONNECTOR_HTTP_ALLOW_UNAUTHENTICATED",
  );
  const explicitMode = Deno.env.get("ENTITY_CONNECTOR_HTTP_AUTH_MODE") as
    | HttpAuthMode
    | undefined;
  const bearerToken = Deno.env.get("ENTITY_CONNECTOR_HTTP_BEARER_TOKEN");
  const issuer = Deno.env.get("ENTITY_CONNECTOR_OAUTH_ISSUER");
  const resource = trimTrailingSlash(
    Deno.env.get("ENTITY_CONNECTOR_OAUTH_RESOURCE") ?? defaultBaseUrl,
  );
  const resourceMetadataUrl = new URL(
    "/.well-known/oauth-protected-resource",
    defaultBaseUrl,
  ).toString();

  const mode: HttpAuthMode = explicitMode ??
    (allowUnauthenticated
      ? "none"
      : issuer
      ? "oauth"
      : bearerToken
      ? "static-bearer"
      : "none");

  if (mode === "none") {
    if (!allowUnauthenticated) {
      throw new Error(
        "Refusing to start HTTP MCP server without auth. Set ENTITY_CONNECTOR_HTTP_AUTH_MODE=oauth with OAuth env vars, set ENTITY_CONNECTOR_HTTP_BEARER_TOKEN for local static bearer mode, or set ENTITY_CONNECTOR_HTTP_ALLOW_UNAUTHENTICATED=true only for local smoke tests.",
      );
    }

    return {
      mode,
      toolAuth: { enabled: false },
    };
  }

  if (mode === "static-bearer") {
    if (!bearerToken) {
      throw new Error(
        "ENTITY_CONNECTOR_HTTP_BEARER_TOKEN is required when ENTITY_CONNECTOR_HTTP_AUTH_MODE=static-bearer.",
      );
    }

    return {
      mode,
      toolAuth: { enabled: false },
      verifier: new StaticBearerVerifier(bearerToken),
    };
  }

  if (!issuer) {
    throw new Error(
      "ENTITY_CONNECTOR_OAUTH_ISSUER is required when ENTITY_CONNECTOR_HTTP_AUTH_MODE=oauth.",
    );
  }

  const issuerIdentifier = await discoverIssuerIdentifier(issuer);
  const audience = Deno.env.get("ENTITY_CONNECTOR_OAUTH_AUDIENCE") ?? undefined;
  const algorithms = splitScopes(
    Deno.env.get("ENTITY_CONNECTOR_OAUTH_ALLOWED_ALGS") ??
      "RS256 ES256 PS256",
  );
  const clockToleranceSeconds = Number(
    Deno.env.get("ENTITY_CONNECTOR_OAUTH_CLOCK_TOLERANCE_SECONDS") ?? "30",
  );
  const expiryWarningSeconds = parseNonNegativeInteger(
    Deno.env.get("ENTITY_CONNECTOR_OAUTH_EXPIRY_WARNING_SECONDS"),
    120,
  );

  return {
    mode,
    toolAuth: {
      enabled: true,
      resourceMetadataUrl,
    },
    resource,
    resourceMetadataUrl,
    protectedResourceMetadata: {
      resource,
      authorization_servers: [issuerIdentifier],
      scopes_supported: [...ENTITY_CORE_SUPPORTED_SCOPES],
      ...Deno.env.get("ENTITY_CONNECTOR_RESOURCE_DOCUMENTATION")
        ? {
          resource_documentation: Deno.env.get(
            "ENTITY_CONNECTOR_RESOURCE_DOCUMENTATION",
          ),
        }
        : {},
    },
    verifier: new OidcJwtVerifier({
      issuer: issuerIdentifier,
      jwksUri: Deno.env.get("ENTITY_CONNECTOR_OAUTH_JWKS_URI") ?? undefined,
      audience,
      resource,
      algorithms,
      clockToleranceSeconds: Number.isFinite(clockToleranceSeconds)
        ? clockToleranceSeconds
        : 30,
      expiryWarningSeconds,
    }),
  };
}

export function buildWwwAuthenticateHeader(
  resourceMetadataUrl: string,
  scopes: string[],
  error = "invalid_token",
  errorDescription = "Authentication required.",
): string {
  const parts = [
    `resource_metadata="${quoteHeaderValue(resourceMetadataUrl)}"`,
    `error="${quoteHeaderValue(error)}"`,
    `error_description="${quoteHeaderValue(errorDescription)}"`,
  ];
  if (scopes.length > 0) {
    parts.push(`scope="${quoteHeaderValue(scopes.join(" "))}"`);
  }
  return `Bearer ${parts.join(", ")}`;
}

function bearerTokenFromRequest(req: Request): string | null {
  const authHeader = req.header("authorization");
  if (!authHeader) return null;
  const [type, token] = authHeader.split(" ");
  if (type?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

function sendAuthChallenge(
  res: Response,
  context: HttpAuthContext,
  status: number,
  error: string,
  errorDescription: string,
): void {
  if (context.resourceMetadataUrl) {
    res.setHeader(
      "WWW-Authenticate",
      buildWwwAuthenticateHeader(
        context.resourceMetadataUrl,
        [...ENTITY_CORE_SUPPORTED_SCOPES],
        error,
        errorDescription,
      ),
    );
  } else {
    res.setHeader("WWW-Authenticate", 'Bearer realm="psycheros-entity-core"');
  }

  res.status(status).json({
    error,
    error_description: errorDescription,
  });
}

export function createAttachAuthMiddleware(
  context: HttpAuthContext,
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (context.mode === "none") {
      next();
      return;
    }

    const token = bearerTokenFromRequest(req);
    if (!token) {
      if (context.mode === "oauth") {
        next();
        return;
      }
      sendAuthChallenge(
        res,
        context,
        401,
        "invalid_token",
        "Missing bearer token.",
      );
      return;
    }

    try {
      req.auth = await context.verifier!.verifyAccessToken(token);
      next();
    } catch (error) {
      sendAuthChallenge(
        res,
        context,
        401,
        "invalid_token",
        error instanceof Error ? error.message : "Invalid bearer token.",
      );
    }
  };
}

export function createRequireAuthMiddleware(
  context: HttpAuthContext,
): RequestHandler {
  const attachAuth = createAttachAuthMiddleware(context);
  return (req: Request, res: Response, next: NextFunction) => {
    attachAuth(req, res, () => {
      if (context.mode === "none" || req.auth) {
        next();
        return;
      }

      sendAuthChallenge(
        res,
        context,
        401,
        "invalid_token",
        "Authentication required.",
      );
    });
  };
}

export function toolSecurityMeta(
  auth: ToolAuthContext | undefined,
  scopes: string[],
): Record<string, unknown> | undefined {
  if (!auth?.enabled) return undefined;
  return {
    securitySchemes: toolSecuritySchemes(auth, scopes),
    ui: { visibility: ["model", "app"] },
    "openai/visibility": "public",
  };
}

export function toolSecuritySchemes(
  auth: ToolAuthContext | undefined,
  scopes: string[],
): Array<{ type: "oauth2"; scopes: string[] }> | undefined {
  if (!auth?.enabled) return undefined;
  return [
    {
      type: "oauth2",
      scopes,
    },
  ];
}

export function requireToolScopes(
  auth: ToolAuthContext | undefined,
  authInfo: AuthInfo | undefined,
  scopes: string[],
) {
  if (!auth?.enabled) return null;

  const hasScopes = authInfo &&
    scopes.every((scope) => authInfo.scopes.includes(scope));
  if (hasScopes) return null;

  const error = authInfo ? "insufficient_scope" : "invalid_token";
  const message = authInfo
    ? `Token is missing required scope(s): ${scopes.join(" ")}.`
    : "Authentication required: no access token provided.";

  const data = {
    success: false,
    error,
    message,
    requiredScopes: scopes,
  };

  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
    _meta: {
      "mcp/www_authenticate": [
        buildWwwAuthenticateHeader(
          auth.resourceMetadataUrl!,
          scopes,
          error,
          message,
        ),
      ],
    },
  };
}
