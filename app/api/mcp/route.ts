import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { buildMcpServer } from "@/agent/mcpServer";

/**
 * /api/mcp: Kickoff Stocks' MCP endpoint for BYO agents (Streamable HTTP,
 * stateless). No login: the tools only read the league and prepare
 * transactions; the user's own wallet signs them.
 */
export const dynamic = "force-dynamic";

const origin = (req: Request) => {
  const u = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? u.host;
  const proto = req.headers.get("x-forwarded-proto") ?? u.protocol.replace(":", "");
  return `${proto}://${host}`;
};

async function handle(req: Request): Promise<Response> {
  const server = buildMcpServer(origin(req));
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  try {
    return await transport.handleRequest(await acceptJson(req));
  } finally {
    void server.close();
  }
}

/** Plain-HTTP agents often send only `Accept: application/json`; replies are always JSON here. */
async function acceptJson(req: Request): Promise<Request> {
  const accept = req.headers.get("accept") ?? "";
  if (req.method !== "POST" || accept.includes("text/event-stream")) return req;
  const headers = new Headers(req.headers);
  headers.set("accept", "application/json, text/event-stream");
  return new Request(req.url, { method: "POST", headers, body: await req.text() });
}

export const POST = handle;
export const GET = handle;
export const DELETE = handle;
