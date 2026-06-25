const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { createTestContext } = require("../helpers/testContext");

test("core test foundation uses an isolated database and temporary HTTP server", async (t) => {
  const context = await createTestContext();
  t.after(async () => {
    await context.cleanup();
  });

  assert.notEqual(path.resolve(context.databasePath), path.resolve(context.defaultDatabasePath));
  assert.ok(context.databasePath.startsWith(context.tempDirectory));
  assert.ok(fs.existsSync(context.databasePath), "schema initialization should create the temp DB");
  assert.notEqual(context.port, 3000);
  assert.equal(context.server.listening, true);

  const tables = await context.db.all(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schools'"
  );
  assert.equal(tables.length, 1);

  const listBefore = await context.requestJson({ path: "/api/schools" });
  assert.equal(listBefore.status, 200);
  assert.equal(listBefore.body.success, true);
  assert.deepEqual(listBefore.body.data, []);

  const createResponse = await context.requestJson({
    method: "POST",
    path: "/api/schools",
    body: {
      name: "基盤テスト",
      prefecture: "東京都",
      play_style: "continuous",
      start_year: 2026,
      current_year: 2026,
      memo: "core smoke test",
    },
  });
  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.body.success, true);
  assert.equal(createResponse.body.data.name, "基盤テスト");

  const listAfter = await context.requestJson({ path: "/api/schools" });
  assert.equal(listAfter.status, 200);
  assert.equal(listAfter.body.success, true);
  assert.equal(listAfter.body.data.length, 1);
  assert.equal(listAfter.body.data[0].id, createResponse.body.data.id);

  await context.cleanup();
  assert.equal(context.server.listening, false);
  assert.equal(fs.existsSync(context.tempDirectory), false);
});
