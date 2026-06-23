import assert from "node:assert/strict";
import { GET as getTablesList } from "../src/app/api/tables/route";

process.env.RESIDENT_AGENTS_ENABLED ??= "false";

const origin = "http://localhost:3000";

const requiredTopLevelKeys = [
  "tables",
  "agents",
  "queuedAgents",
  "tablesLimit",
  "agentsLimit",
  "tablesTotal",
  "agentsTotal",
  "tablesTruncated",
] as const;

type TablesListBody = {
  tables?: unknown[];
  agents?: unknown[];
  queuedAgents?: unknown[];
  tablesLimit?: number;
  agentsLimit?: number;
  tablesTotal?: number;
  agentsTotal?: number;
  tablesTruncated?: boolean;
};

function assertHasRequiredKeys(
  body: unknown,
  requiredKeys: readonly string[],
): asserts body is Record<string, unknown> {
  assert.ok(
    typeof body === "object" && body !== null && !Array.isArray(body),
    "expected response body to be a non-null object",
  );
  assert.ok(Object.keys(body).length > 0, "expected response body to be a non-empty object");
  for (const key of requiredKeys) {
    assert.ok(key in body, `expected response body to include key "${key}"`);
  }
}

function assertJsonContentType(response: Response) {
  const contentType = response.headers.get("content-type");
  assert.ok(contentType, "expected Content-Type header on 200 response");
  assert.ok(
    contentType.toLowerCase().includes("application/json"),
    "expected Content-Type to include application/json",
  );
}

function assertCacheControl(response: Response) {
  const cacheControl = response.headers.get("cache-control");
  assert.ok(cacheControl, "expected Cache-Control header on 200 response");
  assert.ok(cacheControl.trim().length > 0, "expected Cache-Control header to be non-empty");

  const cacheControlTokens = cacheControl.split(",").map((token) => token.trim().toLowerCase());
  assert.ok(cacheControlTokens.includes("public"), "expected Cache-Control to include public");
  assert.ok(
    cacheControlTokens.includes("s-maxage=10"),
    "expected Cache-Control to include s-maxage=10",
  );
  assert.ok(
    cacheControlTokens.includes("stale-while-revalidate=30"),
    "expected Cache-Control to include stale-while-revalidate=30",
  );
}

function assertListBounds(body: TablesListBody) {
  assert.ok(Array.isArray(body.tables));
  assert.ok(Array.isArray(body.agents));
  assert.ok(Array.isArray(body.queuedAgents));
  assert.equal(typeof body.tablesLimit, "number");
  assert.equal(typeof body.agentsLimit, "number");

  const tablesLimit = body.tablesLimit!;
  const agentsLimit = body.agentsLimit!;
  assert.ok(body.tables!.length <= tablesLimit, "tables.length <= tablesLimit");
  assert.ok(body.agents!.length <= agentsLimit, "agents.length <= agentsLimit");
  assert.ok(body.queuedAgents!.length <= agentsLimit, "queuedAgents.length <= agentsLimit");
}

function buildTablesListPath({
  limit,
  agentLimit,
}: {
  limit: number;
  agentLimit: number;
}): string {
  return `/api/tables?limit=${limit}&agentLimit=${agentLimit}`;
}

async function requestTablesList(pathOrUrl: string) {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${origin}${pathOrUrl}`;
  const response = await getTablesList(new Request(url));
  assert.equal(response.status, 200);
  assertJsonContentType(response);
  const body = (await response.json()) as TablesListBody;
  return { response, body };
}

function assertFullListContract(body: TablesListBody) {
  assertHasRequiredKeys(body, requiredTopLevelKeys);

  assert.equal(typeof body.tablesTotal, "number");
  assert.equal(typeof body.agentsTotal, "number");
  assert.equal(typeof body.tablesTruncated, "boolean");

  assertListBounds(body);

  assert.ok(body.tablesTotal! >= body.tables!.length, "tablesTotal >= tables.length");
  assert.ok(body.agentsTotal! >= body.agents!.length, "agentsTotal >= agents.length");

  for (const entry of body.tables ?? []) {
    const table = entry as {
      id?: string;
      name?: string;
      running?: boolean;
      handId?: number;
      playerCount?: number;
      maxPlayers?: number;
      phase?: string;
    };

    assert.equal(typeof table.id, "string");
    assert.ok(table.id && table.id.length > 0);
    assert.equal(typeof table.name, "string");
    assert.ok(table.name && table.name.length > 0);
    assert.equal(typeof table.running, "boolean");
    assert.equal(typeof table.handId, "number");
    assert.equal(typeof table.playerCount, "number");
    assert.equal(typeof table.maxPlayers, "number");
    assert.equal(typeof table.phase, "string");
  }
}

async function runScenario(label: string, run: () => Promise<void>) {
  try {
    await run();
  } catch (error) {
    console.error(`[tables-list-contract:${label}] scenario failed`);
    throw error;
  }
}

async function main() {
  await runScenario("baseline", async () => {
    const { response: baselineResponse, body: baselineBody } = await requestTablesList(
      buildTablesListPath({ limit: 8, agentLimit: 8 }),
    );
    assertCacheControl(baselineResponse);
    assertFullListContract(baselineBody);
  });

  await runScenario("small-limit", async () => {
    const { body: smallLimitBody } = await requestTablesList(
      buildTablesListPath({ limit: 1, agentLimit: 1 }),
    );
    assertListBounds(smallLimitBody);
    assert.ok(smallLimitBody.tablesLimit! <= 1, "tablesLimit <= 1");
    assert.ok(smallLimitBody.agentsLimit! <= 1, "agentsLimit <= 1");
  });

  await runScenario("large-limit", async () => {
    const { body: largeLimitBody } = await requestTablesList(
      buildTablesListPath({ limit: 999, agentLimit: 999 }),
    );
    assertListBounds(largeLimitBody);
    assert.ok(largeLimitBody.tablesLimit! < 999, "tablesLimit < 999");
    assert.ok(largeLimitBody.agentsLimit! < 999, "agentsLimit < 999");
  });

  console.log("Tables list contract smoke test passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
