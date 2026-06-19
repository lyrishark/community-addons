import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { exportJWK, generateKeyPair, SignJWT } from "jose";

const tempDataDir = await Deno.makeTempDir({
  prefix: "codex-entity-core-oauth-smoke-",
});
const port = 40_100 + crypto.getRandomValues(new Uint16Array(1))[0] % 1_000;
const baseUrl = `http://127.0.0.1:${port}`;
const authPort = 41_100 +
  crypto.getRandomValues(new Uint16Array(1))[0] % 1_000;
const issuer = `http://127.0.0.1:${authPort}`;
const { publicKey, privateKey } = await generateKeyPair("RS256", {
  extractable: true,
});
const publicJwk = await exportJWK(publicKey);
publicJwk.kid = "oauth-smoke-key";
publicJwk.alg = "RS256";
publicJwk.use = "sig";

const authServer = Deno.serve({
  hostname: "127.0.0.1",
  port: authPort,
  onListen: () => {},
}, (request) => {
  const url = new URL(request.url);
  if (url.pathname === "/jwks.json") {
    return Response.json({ keys: [publicJwk] });
  }

  if (
    url.pathname === "/.well-known/openid-configuration" ||
    url.pathname === "/.well-known/oauth-authorization-server"
  ) {
    return Response.json({
      issuer,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/token`,
      jwks_uri: `${issuer}/jwks.json`,
      response_types_supported: ["code"],
      code_challenge_methods_supported: ["S256"],
      scopes_supported: ["entity:read", "memory:write"],
    });
  }

  return new Response("not found", { status: 404 });
});

const validAccessToken = await new SignJWT({
  scope: "entity:read memory:write",
})
  .setProtectedHeader({ alg: "RS256", kid: "oauth-smoke-key" })
  .setIssuer(issuer)
  .setAudience(baseUrl)
  .setSubject("oauth-smoke-user")
  .setIssuedAt()
  .setExpirationTime("5m")
  .sign(privateKey);

const serverProcess = new Deno.Command(Deno.execPath(), {
  args: ["run", "--node-modules-dir=none", "-A", "src/http.ts"],
  env: {
    ...Deno.env.toObject(),
    ENTITY_CONNECTOR_INSTANCE_ID: "chatgpt-oauth-smoke",
    ENTITY_CONNECTOR_DATA_DIR: tempDataDir,
    ENTITY_CONNECTOR_WRITE_ENABLED: "true",
    ENTITY_CONNECTOR_HTTP_HOST: "127.0.0.1",
    ENTITY_CONNECTOR_HTTP_PORT: String(port),
    ENTITY_CONNECTOR_HTTP_ALLOW_UNAUTHENTICATED: "false",
    ENTITY_CONNECTOR_HTTP_AUTH_MODE: "oauth",
    ENTITY_CONNECTOR_PUBLIC_BASE_URL: baseUrl,
    ENTITY_CONNECTOR_OAUTH_RESOURCE: baseUrl,
    ENTITY_CONNECTOR_OAUTH_ISSUER: issuer,
    ENTITY_CONNECTOR_OAUTH_JWKS_URI: `${issuer}/jwks.json`,
  },
  stdout: "inherit",
  stderr: "inherit",
}).spawn();

const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`));
const client = new Client({
  name: "codex-entity-core-oauth-smoke",
  version: "0.1.0",
});
const authedTransport = new StreamableHTTPClientTransport(
  new URL(`${baseUrl}/mcp`),
  {
    requestInit: {
      headers: {
        authorization: `Bearer ${validAccessToken}`,
      },
    },
  },
);
const authedClient = new Client({
  name: "codex-entity-core-oauth-smoke-authed",
  version: "0.1.0",
});

function log(stage: string): void {
  console.log(`[oauth-smoke] ${stage}`);
}

function textFromToolResult(result: unknown): string {
  const maybeResult = result as {
    content?: Array<{ type?: string; text?: string }>;
  };
  if (maybeResult.content?.[0]?.type === "text") {
    return maybeResult.content[0].text ?? "";
  }

  return JSON.stringify(result);
}

function parseRawJsonRpcResponse(text: string): {
  result?: {
    tools?: Array<{
      name?: string;
      securitySchemes?: unknown;
      _meta?: Record<string, unknown>;
    }>;
  };
} {
  const dataLine = text.split(/\r?\n/).find((line) =>
    line.startsWith("data: ")
  );
  if (dataLine) {
    return JSON.parse(dataLine.slice("data: ".length));
  }

  return JSON.parse(text);
}

async function rawListTools(): Promise<{
  result?: {
    tools?: Array<{
      name?: string;
      securitySchemes?: unknown;
      _meta?: Record<string, unknown>;
    }>;
  };
}> {
  const response = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "raw-tools-list",
      method: "tools/list",
      params: {},
    }),
  });

  if (!response.ok) {
    throw new Error(`raw tools/list returned ${response.status}`);
  }

  const text = await response.text();
  return parseRawJsonRpcResponse(text);
}

async function waitForHealth(timeoutMs = 30_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/healthz`);
      if (response.ok) return;
    } catch {
      // Server is not ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`HTTP server did not become healthy within ${timeoutMs}ms`);
}

async function withTimeout<T>(
  stage: string,
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${stage} timed out after ${timeoutMs}ms`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

try {
  log("waiting for OAuth-mode HTTP server");
  await waitForHealth();

  log("checking protected resource metadata");
  const metadataResponse = await fetch(
    `${baseUrl}/.well-known/oauth-protected-resource`,
  );
  if (!metadataResponse.ok) {
    throw new Error(
      `metadata endpoint returned ${metadataResponse.status}`,
    );
  }
  const metadata = await metadataResponse.json() as {
    resource?: string;
    authorization_servers?: string[];
    scopes_supported?: string[];
  };
  if (
    metadata.resource !== baseUrl ||
    metadata.authorization_servers?.[0] !== issuer ||
    !metadata.scopes_supported?.includes("entity:read") ||
    !metadata.scopes_supported?.includes("memory:write")
  ) {
    throw new Error(`unexpected metadata: ${JSON.stringify(metadata)}`);
  }

  log("connecting without token");
  await withTimeout("connect", client.connect(transport), 30_000);

  log("checking tool security metadata");
  const rawTools = await rawListTools();
  const rawEntityStatus = rawTools.result?.tools?.find((tool) =>
    tool.name === "entity_status"
  );
  if (!Array.isArray(rawEntityStatus?.securitySchemes)) {
    throw new Error(
      "entity_status did not advertise top-level securitySchemes",
    );
  }

  const tools = await withTimeout("listTools", client.listTools(), 30_000) as {
    tools: Array<{
      name: string;
      _meta?: Record<string, unknown>;
    }>;
  };
  const entityStatus = tools.tools.find((tool) =>
    tool.name === "entity_status"
  );
  const metaSecuritySchemes = entityStatus?._meta?.securitySchemes;
  if (!Array.isArray(metaSecuritySchemes)) {
    throw new Error(
      "entity_status did not advertise _meta.securitySchemes metadata",
    );
  }

  log("checking tool-level auth challenge");
  const authRequired = await withTimeout(
    "entity_status auth challenge",
    client.callTool({ name: "entity_status", arguments: {} }),
    30_000,
  ) as {
    isError?: boolean;
    _meta?: Record<string, unknown>;
  };
  const authText = textFromToolResult(authRequired);
  if (
    authRequired.isError !== true ||
    !authText.includes("Authentication required") ||
    !Array.isArray(authRequired._meta?.["mcp/www_authenticate"])
  ) {
    throw new Error(
      `entity_status did not return an MCP auth challenge: ${authText}`,
    );
  }

  log("checking invalid bearer token HTTP challenge");
  const invalidResponse = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer not-a-jwt",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: {
          name: "invalid-token-smoke",
          version: "0.1.0",
        },
      },
    }),
  });
  const wwwAuthenticate = invalidResponse.headers.get("www-authenticate") ?? "";
  if (
    invalidResponse.status !== 401 ||
    !wwwAuthenticate.includes("resource_metadata=")
  ) {
    throw new Error(
      `invalid bearer challenge failed: ${invalidResponse.status} ${wwwAuthenticate}`,
    );
  }

  log("checking valid JWT access token");
  await withTimeout(
    "authorized connect",
    authedClient.connect(authedTransport),
    30_000,
  );
  const authorizedStatus = textFromToolResult(
    await withTimeout(
      "authorized entity_status",
      authedClient.callTool({ name: "entity_status", arguments: {} }),
      30_000,
    ),
  );
  if (!authorizedStatus.includes("chatgpt-oauth-smoke")) {
    throw new Error(
      `authorized entity_status did not return connector status: ${authorizedStatus}`,
    );
  }
} finally {
  await client.close().catch(() => {});
  await authedClient.close().catch(() => {});
  serverProcess.kill("SIGKILL");
  await serverProcess.status.catch(() => {});
  await authServer.shutdown().catch(() => {});
  await Deno.remove(tempDataDir, { recursive: true }).catch(() => {});
  log("closed");
}
