import assert from "node:assert/strict";
import { GET as getTableState } from "../src/app/api/tables/[tableId]/state/route";
import { getTableManager } from "../src/lib/server/simulator";

const origin = "http://localhost:3000";

async function main() {
  const runner = getTableManager(origin).defaultRunner();
  const tableId = runner.cachedSnapshot().snapshot.tableId;
  assert.ok(typeof tableId === "string" && tableId.length > 0, "expected non-empty tableId from runner snapshot");

  const response = await getTableState(
    new Request(`${origin}/api/tables/${tableId}/state`),
    { params: Promise.resolve({ tableId }) },
  );

  assert.equal(response.status, 200);

  const contentType = response.headers.get("content-type");
  assert.ok(contentType, "expected Content-Type header on 200 response");
  assert.ok(
    contentType.toLowerCase().includes("application/json"),
    "expected Content-Type to include application/json",
  );

  const cacheControl = response.headers.get("cache-control");
  assert.ok(cacheControl, "expected Cache-Control header on 200 response");
  assert.ok(cacheControl.trim().length > 0, "expected Cache-Control header to be non-empty");

  const body = (await response.json()) as {
    tableId?: string;
    tableName?: string;
    handId?: number;
    running?: boolean;
    players?: unknown[];
    communityCards?: unknown[];
    spectatorCount?: number;
  };

  assert.equal(typeof body.tableId, "string");
  assert.ok(body.tableId && body.tableId.length > 0);
  assert.equal(typeof body.tableName, "string");
  assert.ok(body.tableName && body.tableName.length > 0);
  assert.equal(typeof body.handId, "number");
  const handId = body.handId;
  assert.ok(typeof handId === "number" && handId >= 0);
  assert.equal(typeof body.running, "boolean");
  assert.ok(Array.isArray(body.players));
  assert.ok(Array.isArray(body.communityCards));
  assert.equal(typeof body.spectatorCount, "number");
  const spectatorCount = body.spectatorCount;
  assert.ok(typeof spectatorCount === "number" && spectatorCount >= 0);

  console.log("Tables state contract smoke test passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
