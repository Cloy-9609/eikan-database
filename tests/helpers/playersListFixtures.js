const assert = require("node:assert/strict");
const { buildSchoolPayload, buildPlayerPayload } = require("./playerFixtures");

const ABILITY_KEYS = [
  "velocity",
  "control",
  "stamina",
  "trajectory",
  "meat",
  "power",
  "run_speed",
  "arm_strength",
  "fielding",
  "catching",
];

const BASE_ABILITIES = Object.freeze({
  velocity: 130,
  control: 50,
  stamina: 50,
  trajectory: 2,
  meat: 50,
  power: 50,
  run_speed: 50,
  arm_strength: 50,
  fielding: 50,
  catching: 50,
});

function emptyRelations() {
  return { pitch_types: [], special_abilities: [], sub_positions: [] };
}

async function createSchool(context, name, overrides = {}) {
  const response = await context.requestJson({
    method: "POST",
    path: "/api/schools",
    body: buildSchoolPayload({ name, ...overrides }),
  });
  assert.equal(response.status, 201, response.text);
  return response.body.data;
}

async function createPlayer(context, schoolId, overrides = {}) {
  const payload = buildPlayerPayload({
    school_id: schoolId,
    snapshot_note: null,
    evidence_image_path: null,
    total_stars: 100,
    ...BASE_ABILITIES,
    ...emptyRelations(),
    ...overrides,
  });
  const response = await context.requestJson({ method: "POST", path: "/api/players", body: payload });
  assert.equal(response.status, 201, response.text);
  return response.body.data;
}

async function addSnapshot(context, seriesId, overrides = {}) {
  const response = await context.requestJson({
    method: "POST",
    path: `/api/player-series/${seriesId}/snapshots`,
    body: { ...emptyRelations(), ...overrides },
  });
  assert.equal(response.status, 201, response.text);
  return response.body.data;
}

async function setSeriesState(context, seriesId, updates = {}) {
  const allowed = ["school_grade", "roster_status", "updated_at"];
  const entries = Object.entries(updates).filter(([key]) => allowed.includes(key));
  if (entries.length === 0) return;
  await context.db.run(
    `UPDATE player_series SET ${entries.map(([key]) => `${key} = ?`).join(", ")} WHERE id = ?`,
    [...entries.map(([, value]) => value), seriesId]
  );
}

async function setSnapshotUpdatedAt(context, playerId, updatedAt) {
  await context.db.run("UPDATE players SET updated_at = ? WHERE id = ?", [updatedAt, playerId]);
}

async function setSnapshotLabel(context, playerId, snapshotLabel) {
  await context.db.run("UPDATE players SET snapshot_label = ? WHERE id = ?", [snapshotLabel, playerId]);
}

function bySeriesId(items) {
  return new Map(items.map((item) => [item.player_series_id, item]));
}

function sortedSeriesIds(items) {
  return items.map((item) => item.player_series_id).sort((a, b) => a - b);
}

function assertSuccessList(response) {
  assert.equal(response.status, 200, response.text);
  assert.equal(response.body.success, true);
  assert.ok(Array.isArray(response.body.data));
  return response.body.data;
}

function assertSeriesSet(items, expectedIds) {
  assert.deepEqual(sortedSeriesIds(items), [...expectedIds].sort((a, b) => a - b));
}

function assertErrorResponse(response, expectedStatus = 400) {
  assert.equal(response.status, expectedStatus, response.text);
  assert.equal(response.body.success, false);
  assert.equal(response.body.data, null);
  assert.equal(typeof response.body.error.message, "string");
  assert.ok(response.body.error.message.length > 0);
}

module.exports = {
  ABILITY_KEYS,
  BASE_ABILITIES,
  createSchool,
  createPlayer,
  addSnapshot,
  setSeriesState,
  setSnapshotUpdatedAt,
  setSnapshotLabel,
  bySeriesId,
  sortedSeriesIds,
  assertSuccessList,
  assertSeriesSet,
  assertErrorResponse,
};
