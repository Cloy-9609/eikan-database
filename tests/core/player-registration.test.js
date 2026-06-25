const test = require("node:test");
const assert = require("node:assert/strict");
const { createTestContext } = require("../helpers/testContext");
const {
  buildSchoolPayload,
  buildPlayerPayload,
  stripRelationIds,
} = require("../helpers/playerFixtures");

let context;

test.before(async () => {
  context = await createTestContext();
});

test.after(async () => {
  await context.cleanup();
});

test("POST /api/players creates a player_series, first snapshot, and relations", async () => {
  const schoolResponse = await context.requestJson({ method: "POST", path: "/api/schools", body: buildSchoolPayload({ name: "登録回帰" }) });
  assert.equal(schoolResponse.status, 201);
  const schoolId = schoolResponse.body.data.id;

  const payload = buildPlayerPayload({ school_id: schoolId, name: "登録 回帰", snapshot_label: "entrance" });
  const response = await context.requestJson({ method: "POST", path: "/api/players", body: payload });
  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);

  const player = response.body.data;
  assert.ok(player.id);
  assert.ok(player.player_series_id);
  assert.equal(player.name, payload.name);
  assert.equal(player.school_id, schoolId);
  assert.equal(player.snapshot_label, "entrance");
  assert.equal(player.snapshot_note, payload.snapshot_note);
  assert.equal(player.evidence_image_path, payload.evidence_image_path);
  assert.deepEqual(stripRelationIds(player.pitch_types), payload.pitch_types);
  assert.deepEqual(stripRelationIds(player.special_abilities), payload.special_abilities);
  assert.deepEqual(stripRelationIds(player.sub_positions), payload.sub_positions);

  const seriesCount = await context.db.get("SELECT COUNT(*) AS count FROM player_series WHERE id = ?", [player.player_series_id]);
  const snapshotCount = await context.db.get("SELECT COUNT(*) AS count FROM players WHERE player_series_id = ?", [player.player_series_id]);
  const snapshotRow = await context.db.get("SELECT player_series_id FROM players WHERE id = ?", [player.id]);
  assert.equal(seriesCount.count, 1);
  assert.equal(snapshotCount.count, 1);
  assert.equal(snapshotRow.player_series_id, player.player_series_id);

  for (const [table, expected] of [["player_pitch_types", 2], ["player_special_abilities", 2], ["player_sub_positions", 2]]) {
    const row = await context.db.get(`SELECT COUNT(*) AS count FROM ${table} WHERE player_id = ?`, [player.id]);
    assert.equal(row.count, expected);
  }

  const detailResponse = await context.requestJson({ path: `/api/players/${player.id}` });
  assert.equal(detailResponse.status, 200);
  assert.deepEqual(stripRelationIds(detailResponse.body.data.pitch_types), payload.pitch_types);

  const seriesResponse = await context.requestJson({ path: `/api/player-series/${player.player_series_id}` });
  assert.equal(seriesResponse.status, 200);
  assert.equal(seriesResponse.body.data.playerSeries.id, player.player_series_id);
  assert.equal(seriesResponse.body.data.snapshots.length, 1);
  assert.equal(seriesResponse.body.data.snapshots[0].snapshot_label, "entrance");
  assert.equal(seriesResponse.body.data.snapshots[0].snapshot_order, 0);
  assert.equal(seriesResponse.body.data.snapshots[0].is_official_snapshot_label, true);
  assert.equal(seriesResponse.body.data.currentSnapshot.id, player.id);

  const filterResponse = await context.requestJson({ path: "/api/players?snapshot_label=entrance" });
  assert.equal(filterResponse.status, 200);
  assert.ok(filterResponse.body.data.some((item) => item.id === player.id && item.snapshot_label === "entrance"));
});
