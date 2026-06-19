import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  closeEntityCoreConnectorStores,
  createEntityCoreMcpServer,
} from "./core.ts";

const server = createEntityCoreMcpServer();

function shutdown(): void {
  closeEntityCoreConnectorStores();
  Deno.exit(0);
}

Deno.addSignalListener("SIGINT", shutdown);
Deno.addSignalListener("SIGTERM", shutdown);

await server.connect(new StdioServerTransport());
