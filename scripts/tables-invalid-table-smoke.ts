import assert from "node:assert/strict";
import { GET as getTableState } from "../src/app/api/tables/[tableId]/state/route";
import { generateMetadata } from "../src/app/tables/[tableId]/layout";

const invalidTableId = "not-a-real-table";

async function main() {
  const response = await getTableState(
    new Request(`http://localhost:3000/api/tables/${invalidTableId}/state`),
    { params: Promise.resolve({ tableId: invalidTableId }) },
  );

  assert.equal(response.status, 404);

  const body = (await response.json()) as { error?: string };
  assert.equal(body.error, "Table was not found.");

  const metadata = await generateMetadata({
    params: Promise.resolve({ tableId: invalidTableId }),
  });

  assert.equal(metadata.title, "Table Not Found");
  assert.equal(metadata.robots && typeof metadata.robots === "object" ? metadata.robots.index : undefined, false);

  console.log("Tables invalid table smoke test passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
