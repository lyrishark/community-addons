import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  createAttachAuthMiddleware,
  createHttpAuthContext,
  createRequireAuthMiddleware,
} from "./auth.ts";
import {
  closeEntityCoreConnectorStores,
  createEntityCoreMcpServer,
} from "./core.ts";

const host = Deno.env.get("ENTITY_CONNECTOR_HTTP_HOST") ?? "127.0.0.1";
const port = Number(
  Deno.env.get("ENTITY_CONNECTOR_HTTP_PORT") ?? Deno.env.get("PORT") ?? "3006",
);
const mcpPath = Deno.env.get("ENTITY_CONNECTOR_HTTP_PATH") ?? "/mcp";
const defaultBaseUrl = Deno.env.get("ENTITY_CONNECTOR_PUBLIC_BASE_URL") ??
  `http://${host}:${port}`;
const corsOrigins = new Set(
  (Deno.env.get("ENTITY_CONNECTOR_CORS_ORIGINS") ??
    "https://chatgpt.com,https://chat.openai.com")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
  throw new Error(`Invalid HTTP port: ${port}`);
}

const authContext = await createHttpAuthContext({ defaultBaseUrl });
const attachAuth = createAttachAuthMiddleware(authContext);
const requireAuth = createRequireAuthMiddleware(authContext);

const app = express();
app.use(express.json({ limit: "2mb" }));

function appendVaryHeader(res: Response, value: string): void {
  const existing = res.getHeader("Vary");
  const values = Array.isArray(existing)
    ? existing.flatMap((header) => String(header).split(","))
    : existing
    ? String(existing).split(",")
    : [];
  const normalized = values.map((header) => header.trim().toLowerCase());
  if (normalized.includes(value.toLowerCase())) return;

  res.setHeader(
    "Vary",
    [...values.map((header) => header.trim()).filter(Boolean), value].join(
      ", ",
    ),
  );
}

function applyCorsHeaders(req: Request, res: Response): void {
  const origin = req.headers.origin;
  if (!origin) return;
  if (!corsOrigins.has("*") && !corsOrigins.has(origin)) return;

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader(
    "Access-Control-Allow-Headers",
    "authorization, content-type, mcp-protocol-version, mcp-session-id",
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Expose-Headers", "www-authenticate");
  appendVaryHeader(res, "Origin");
}

app.use((req: Request, res: Response, next: NextFunction) => {
  applyCorsHeaders(req, res);
  next();
});

function normalizeMcpAcceptHeader(req: Request): void {
  const accept = req.headers.accept;
  let normalizedAccept = Array.isArray(accept)
    ? accept.join(", ")
    : accept ?? "application/json, text/event-stream";

  if (
    normalizedAccept.includes("application/json") &&
    !normalizedAccept.includes("text/event-stream")
  ) {
    normalizedAccept = `${normalizedAccept}, text/event-stream`;
  }

  req.headers.accept = normalizedAccept;

  const rawHeaders = req.rawHeaders;
  for (let i = 0; i < rawHeaders.length; i += 2) {
    if (rawHeaders[i].toLowerCase() === "accept") {
      rawHeaders[i + 1] = normalizedAccept;
      return;
    }
  }

  rawHeaders.push("accept", normalizedAccept);
}

app.get("/healthz", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    connector: "codex-entity-core-connector",
    transport: "streamable-http",
    mcpPath,
    authMode: authContext.mode,
  });
});

app.get("/readyz", requireAuth, (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.get(
  "/.well-known/oauth-protected-resource",
  (_req: Request, res: Response) => {
    if (!authContext.protectedResourceMetadata) {
      res.status(404).json({
        error: "not_configured",
        message: "OAuth protected resource metadata is not configured.",
      });
      return;
    }

    res.json(authContext.protectedResourceMetadata);
  },
);

app.options(
  "/.well-known/oauth-protected-resource",
  (_req: Request, res: Response) => {
    res.setHeader("Allow", "GET, OPTIONS");
    res.status(204).end();
  },
);

app.options(mcpPath, (_req: Request, res: Response) => {
  res.setHeader("Allow", "POST, OPTIONS");
  res.status(204).end();
});

app.post(mcpPath, attachAuth, async (req: Request, res: Response) => {
  normalizeMcpAcceptHeader(req);

  const server = createEntityCoreMcpServer({
    auth: authContext.toolAuth,
  });
  const transport = new StreamableHTTPServerTransport({
    enableJsonResponse: true,
    sessionIdGenerator: undefined,
  });

  res.on("close", () => {
    transport.close().catch(() => {});
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("HTTP MCP request failed", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : String(error),
        },
        id: null,
      });
    }
  }
});

app.all(mcpPath, (_req: Request, res: Response) => {
  res.setHeader("Allow", "POST, OPTIONS");
  res.status(405).json({
    error: "method_not_allowed",
    message: "This MCP endpoint accepts Streamable HTTP POST requests.",
  });
});

const listener = app.listen(port, host, () => {
  console.error(
    `codex-entity-core HTTP MCP server listening at http://${host}:${port}${mcpPath} (${authContext.mode} auth)`,
  );
});

function shutdown(): void {
  closeEntityCoreConnectorStores();
  listener.close(() => Deno.exit(0));
}

Deno.addSignalListener("SIGINT", shutdown);
Deno.addSignalListener("SIGTERM", shutdown);
