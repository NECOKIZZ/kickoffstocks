import { describe, it, expect } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildMcpServer } from "../src/agent/mcpServer";

describe("MCP server", () => {
  it("offers the read and plan tools, and refuses a plan for a non-address wallet", async () => {
    const server = buildMcpServer("https://stocks.example");
    const [a, b] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test", version: "1" });
    await Promise.all([server.connect(a), client.connect(b)]);
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(
      ["get_my_entries", "get_round", "get_rules", "list_stocks", "plan_back_team", "plan_buy_basket", "plan_buy_etf", "plan_claim", "plan_create_etf"].sort(),
    );
    expect(client.getInstructions()).toMatch(/AVERAGE/);
    const r = await client.callTool({ name: "plan_back_team", arguments: { wallet: "not-a-wallet", team_key: "0x00" } });
    expect(r.isError).toBe(true);
    await client.close();
  });
});
