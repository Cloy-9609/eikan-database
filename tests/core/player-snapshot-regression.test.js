const test = require("node:test");
const assert = require("node:assert/strict");
const { createTestContext } = require("../helpers/testContext");
const {
  buildSchoolPayload,
  buildPlayerPayload,
  buildPitchTypes,
  buildSpecialAbilities,
  buildSubPositions,
  stripRelationIds,
} = require("../helpers/playerFixtures");

let context;
let schoolId;

test.before(async () => {
  context = await createTestContext();
  const school = await context.requestJson({ method: "POST", path: "/api/schools", body: buildSchoolPayload({ name: "snapshot回帰" }) });
  assert.equal(school.status, 201);
  schoolId = school.body.data.id;
});

test.after(async () => {
  await context.cleanup();
});

async function createPlayer(overrides = {}) {
  const response = await context.requestJson({
    method: "POST",
    path: "/api/players",
    body: buildPlayerPayload({ school_id: schoolId, snapshot_note: null, evidence_image_path: null, ...overrides }),
  });
  assert.equal(response.status, 201, response.text);
  return response.body.data;
}

async function addSnapshot(seriesId, payload) {
  const response = await context.requestJson({ method: "POST", path: `/api/player-series/${seriesId}/snapshots`, body: payload });
  assert.equal(response.status, 201, response.text);
  return response.body.data;
}

function assertAbilities(player, expected) {
  for (const key of ["velocity", "control", "stamina", "trajectory", "meat", "power", "run_speed", "arm_strength", "fielding", "catching"]) {
    assert.equal(player[key], expected[key], key);
  }
}

function sortByStableFields(items, keys) {
  return [...items].sort((left, right) => {
    for (const key of keys) {
      const compared = String(left[key] ?? "").localeCompare(String(right[key] ?? ""));
      if (compared !== 0) {
        return compared;
      }
    }
    return 0;
  });
}

function assertRelationsEqual(actual, expected) {
  assert.deepEqual(
    sortByStableFields(stripRelationIds(actual.pitch_types), ["pitch_name", "level"]),
    sortByStableFields(stripRelationIds(expected.pitch_types), ["pitch_name", "level"])
  );
  assert.deepEqual(
    sortByStableFields(stripRelationIds(actual.special_abilities), ["ability_category", "ability_name", "rank_value"]),
    sortByStableFields(stripRelationIds(expected.special_abilities), ["ability_category", "ability_name", "rank_value"])
  );
  assert.deepEqual(
    sortByStableFields(stripRelationIds(actual.sub_positions), ["position_name", "suitability_value", "defense_value"]),
    sortByStableFields(stripRelationIds(expected.sub_positions), ["position_name", "suitability_value", "defense_value"])
  );
}

function assertEmptySeed(seed) {
  assert.equal(seed.main_position, null);
  assert.equal(seed.total_stars, 0);
  assertAbilities(seed, { velocity: null, control: null, stamina: null, trajectory: null, meat: null, power: null, run_speed: null, arm_strength: null, fielding: null, catching: null });
  assert.deepEqual(seed.pitch_types, []);
  assert.deepEqual(seed.special_abilities, []);
  assert.deepEqual(seed.sub_positions, []);
  assert.equal(seed.snapshot_note, null);
  assert.equal(seed.evidence_image_path, null);
}

test("seed uses the nearest previous official snapshot, skipping missing middle labels", async () => {
  const entrance = await createPlayer({ name: "seed近傍", snapshot_label: "entrance", total_stars: 101, velocity: 130, power: 40, pitch_types: buildPitchTypes([{ level: 1 }]) });
  const autumnPayload = { snapshot_label: "y1_autumn", total_stars: 222, main_position: "捕手", velocity: 151, control: 82, stamina: 73, trajectory: 4, meat: 70, power: 81, run_speed: 65, arm_strength: 74, fielding: 69, catching: 66, pitch_types: buildPitchTypes([{ pitch_name: "カーブ", level: 5 }]), special_abilities: buildSpecialAbilities([{ ability_name: "対ピンチ", rank_value: "A" }]), sub_positions: buildSubPositions([{ position_name: "三塁手", suitability_value: "B", defense_value: 77 }]), snapshot_note: "copy禁止", evidence_image_path: "/copy/forbidden.png" };
  const autumn = await addSnapshot(entrance.player_series_id, autumnPayload);

  const response = await context.requestJson({ path: `/api/player-series/${entrance.player_series_id}/snapshot-seed?snapshot_label=y1_spring` });
  assert.equal(response.status, 200);
  const { source_snapshot, target_snapshot_label, seed } = response.body.data;
  assert.equal(source_snapshot.snapshot_label, "y1_autumn");
  assert.equal(target_snapshot_label, "y1_spring");
  assert.equal(seed.grade, 1);
  assert.equal(seed.main_position, autumn.main_position);
  assert.equal(seed.total_stars, autumn.total_stars);
  assertAbilities(seed, autumn);
  assertRelationsEqual(seed, autumn);
  assert.equal(seed.snapshot_note, null);
  assert.equal(seed.evidence_image_path, null);
});

test("POST snapshot persists seeded values as independent relation rows and lets payload override them", async () => {
  const base = await createPlayer({ name: "seed保存", snapshot_label: "entrance", total_stars: 111, power: 60 });
  const source = await addSnapshot(base.player_series_id, { snapshot_label: "y1_autumn", total_stars: 333, main_position: "遊撃手", power: 60, velocity: 140, pitch_types: buildPitchTypes([{ pitch_name: "フォーク", level: 4 }]), special_abilities: buildSpecialAbilities([{ ability_name: "チャンス", ability_category: "batter_ranked", rank_value: "C" }]), sub_positions: buildSubPositions([{ position_name: "二塁手", suitability_value: "A", defense_value: 84 }]), snapshot_note: "コピーされない", evidence_image_path: "/old.png" });
  const created = await addSnapshot(base.player_series_id, { snapshot_label: "y1_spring" });
  assert.equal(created.snapshot_label, "y1_spring");
  assert.equal(created.snapshot_note, null);
  assert.equal(created.evidence_image_path, null);
  assertAbilities(created, source);
  assertRelationsEqual(created, source);
  assert.notDeepEqual(created.pitch_types.map((r) => r.id), source.pitch_types.map((r) => r.id));
  assert.notDeepEqual(created.special_abilities.map((r) => r.id), source.special_abilities.map((r) => r.id));
  assert.notDeepEqual(created.sub_positions.map((r) => r.id), source.sub_positions.map((r) => r.id));

  for (const [table, relationKey] of [
    ["player_pitch_types", "pitch_types"],
    ["player_special_abilities", "special_abilities"],
    ["player_sub_positions", "sub_positions"],
  ]) {
    const sourceCount = await context.db.get(`SELECT COUNT(*) AS count FROM ${table} WHERE player_id = ?`, [source.id]);
    const createdCount = await context.db.get(`SELECT COUNT(*) AS count FROM ${table} WHERE player_id = ?`, [created.id]);
    assert.equal(sourceCount.count, source[relationKey].length);
    assert.equal(createdCount.count, source[relationKey].length);
  }

  const sourceAfterCreate = await context.requestJson({ path: `/api/players/${source.id}` });
  assert.equal(sourceAfterCreate.status, 200);
  assertRelationsEqual(sourceAfterCreate.body.data, source);

  const overridePitch = [{ pitch_name: "シュート", level: 6, is_original: 0, original_pitch_name: null }];
  const overrideAbility = [{ ability_name: "流し打ち", ability_category: "batter_unranked", rank_value: null }];
  const overridden = await addSnapshot(base.player_series_id, { snapshot_label: "y2_summer", power: 75, pitch_types: overridePitch, special_abilities: overrideAbility, sub_positions: [], snapshot_note: "新規メモ", evidence_image_path: "/new.png" });
  assert.equal(overridden.power, 75);
  assert.equal(overridden.main_position, created.main_position);
  assert.equal(overridden.name, base.name);
  assert.deepEqual(stripRelationIds(overridden.pitch_types), overridePitch);
  assert.deepEqual(stripRelationIds(overridden.special_abilities), overrideAbility);
  assert.deepEqual(stripRelationIds(overridden.sub_positions), []);
  assert.equal(overridden.snapshot_note, "新規メモ");
  assert.equal(overridden.evidence_image_path, "/new.png");
});

test("empty seed does not fall back to future snapshots", async () => {
  const future = await createPlayer({ name: "未来禁止", snapshot_label: "y1_summer", total_stars: 444, main_position: "投手", velocity: 155, power: 88 });
  const seedResponse = await context.requestJson({ path: `/api/player-series/${future.player_series_id}/snapshot-seed?snapshot_label=entrance` });
  assert.equal(seedResponse.status, 200);
  assert.equal(seedResponse.body.data.source_snapshot, null);
  assert.equal(seedResponse.body.data.seed.grade, 1);
  assertEmptySeed(seedResponse.body.data.seed);

  const created = await addSnapshot(future.player_series_id, { snapshot_label: "entrance", main_position: "捕手" });
  assert.equal(created.main_position, "捕手");
  assert.equal(created.total_stars, 0);
  assertAbilities(created, { velocity: null, control: null, stamina: null, trajectory: null, meat: null, power: null, run_speed: null, arm_strength: null, fielding: null, catching: null });
  assert.deepEqual(created.pitch_types, []);
  assert.deepEqual(created.special_abilities, []);
  assert.deepEqual(created.sub_positions, []);
  assert.equal(created.snapshot_note, null);
  assert.equal(created.evidence_image_path, null);
  assert.notEqual(created.velocity, future.velocity);
  assert.notEqual(created.power, future.power);
});

test("seed source is official order, not creation order, updated_at, or max id", async () => {
  const entrance = await createPlayer({ name: "順序非依存", snapshot_label: "entrance", velocity: 120 });
  const summer = await addSnapshot(entrance.player_series_id, { snapshot_label: "y1_summer", velocity: 135, power: 45 });
  const spring = await addSnapshot(entrance.player_series_id, { snapshot_label: "y1_spring", velocity: 150, power: 88 });
  assert.ok(spring.id > summer.id);

  const maxIdRow = await context.db.get("SELECT MAX(id) AS max_id FROM players WHERE player_series_id = ?", [entrance.player_series_id]);
  assert.equal(maxIdRow.max_id, spring.id);

  await context.db.run("UPDATE players SET updated_at = '2000-01-01 00:00:00' WHERE id = ?", [summer.id]);
  await context.db.run("UPDATE players SET updated_at = '2099-01-01 00:00:00' WHERE id = ?", [spring.id]);
  await context.db.run("UPDATE players SET updated_at = '2088-01-01 00:00:00' WHERE id = ?", [entrance.id]);

  const seedResponse = await context.requestJson({ path: `/api/player-series/${entrance.player_series_id}/snapshot-seed?snapshot_label=y1_autumn` });
  assert.equal(seedResponse.status, 200);
  assert.equal(seedResponse.body.data.source_snapshot.snapshot_label, "y1_summer");
  assert.equal(seedResponse.body.data.seed.velocity, summer.velocity);
  assert.equal(seedResponse.body.data.seed.power, summer.power);
  assert.notEqual(seedResponse.body.data.seed.velocity, spring.velocity);
  assert.notEqual(seedResponse.body.data.seed.power, spring.power);
});

test("duplicate snapshot labels are rejected without mutating snapshots or relations", async () => {
  const player = await createPlayer({ name: "duplicate拒否", snapshot_label: "entrance" });
  const beforeSnapshots = await context.db.get("SELECT COUNT(*) AS count FROM players WHERE player_series_id = ?", [player.player_series_id]);
  const beforeRelations = await context.db.get("SELECT COUNT(*) AS count FROM player_pitch_types WHERE player_id = ?", [player.id]);
  const seed = await context.requestJson({ path: `/api/player-series/${player.player_series_id}/snapshot-seed?snapshot_label=entrance` });
  assert.equal(seed.status, 409);
  assert.equal(seed.body.success, false);
  const post = await context.requestJson({ method: "POST", path: `/api/player-series/${player.player_series_id}/snapshots`, body: { snapshot_label: "entrance", power: 99 } });
  assert.equal(post.status, 409);
  const afterSnapshots = await context.db.get("SELECT COUNT(*) AS count FROM players WHERE player_series_id = ?", [player.player_series_id]);
  const afterRelations = await context.db.get("SELECT COUNT(*) AS count FROM player_pitch_types WHERE player_id = ?", [player.id]);
  assert.equal(afterSnapshots.count, beforeSnapshots.count);
  assert.equal(afterRelations.count, beforeRelations.count);
  const unchanged = await context.requestJson({ path: `/api/players/${player.id}` });
  assert.notEqual(unchanged.body.data.power, 99);
});

test("series timeline is official order and current snapshot follows query or latest official snapshot", async () => {
  const first = await createPlayer({ name: "timeline順", snapshot_label: "y2_summer" });
  await addSnapshot(first.player_series_id, { snapshot_label: "entrance", main_position: "投手" });
  await addSnapshot(first.player_series_id, { snapshot_label: "y1_autumn" });

  const series = await context.requestJson({ path: `/api/player-series/${first.player_series_id}` });
  assert.equal(series.status, 200);
  assert.deepEqual(series.body.data.snapshots.map((s) => s.snapshot_label), ["entrance", "y1_autumn", "y2_summer"]);
  assert.deepEqual(series.body.data.snapshots.map((s) => s.snapshot_order), [0, 2, 4]);
  assert.equal(series.body.data.currentSnapshot.snapshot_label, "y2_summer");

  const queried = await context.requestJson({ path: `/api/player-series/${first.player_series_id}?snapshot=entrance` });
  assert.equal(queried.status, 200);
  assert.equal(queried.body.data.currentSnapshot.snapshot_label, "entrance");
});

test("legacy post_tournament remains readable but is not a seed target or official seed source", async () => {
  const legacy = await createPlayer({ name: "legacy互換", snapshot_label: "entrance", velocity: 111 });
  await context.db.run("UPDATE players SET snapshot_label = 'post_tournament' WHERE id = ?", [legacy.id]);

  const series = await context.requestJson({ path: `/api/player-series/${legacy.player_series_id}` });
  assert.equal(series.status, 200);
  assert.equal(series.body.data.playerSeries.has_legacy_snapshot_labels, true);
  assert.equal(series.body.data.snapshots[0].snapshot_label, "post_tournament");
  assert.equal(series.body.data.snapshots[0].is_legacy_snapshot_label, true);
  assert.equal(series.body.data.snapshots[0].snapshot_label_display, "大会後");

  const list = await context.requestJson({ path: "/api/players?snapshot_label=post_tournament" });
  assert.equal(list.status, 200);
  assert.ok(list.body.data.some((item) => item.player_series_id === legacy.player_series_id));

  const officialSeedWithoutOfficialSource = await context.requestJson({ path: `/api/player-series/${legacy.player_series_id}/snapshot-seed?snapshot_label=y1_summer` });
  assert.equal(officialSeedWithoutOfficialSource.status, 200);
  assert.equal(officialSeedWithoutOfficialSource.body.data.source_snapshot, null);
  assertEmptySeed(officialSeedWithoutOfficialSource.body.data.seed);
  assert.notEqual(officialSeedWithoutOfficialSource.body.data.seed.velocity, legacy.velocity);
  assert.deepEqual(officialSeedWithoutOfficialSource.body.data.seed.pitch_types, []);
  assert.deepEqual(officialSeedWithoutOfficialSource.body.data.seed.special_abilities, []);
  assert.deepEqual(officialSeedWithoutOfficialSource.body.data.seed.sub_positions, []);

  const legacyTarget = await context.requestJson({ path: `/api/player-series/${legacy.player_series_id}/snapshot-seed?snapshot_label=post_tournament` });
  assert.equal(legacyTarget.status, 400);

  const official = await addSnapshot(legacy.player_series_id, { snapshot_label: "y1_summer", main_position: "投手", velocity: 122 });
  const seed = await context.requestJson({ path: `/api/player-series/${legacy.player_series_id}/snapshot-seed?snapshot_label=y1_autumn` });
  assert.equal(seed.status, 200);
  assert.equal(seed.body.data.source_snapshot.snapshot_label, "y1_summer");
  assert.equal(seed.body.data.seed.velocity, official.velocity);
});

test("seed API validates id, existence, label presence, invalid label, legacy label, and existing label", async () => {
  const player = await createPlayer({ name: "validation", snapshot_label: "entrance" });
  const cases = [
    { path: "/api/player-series/not-a-number/snapshot-seed?snapshot_label=y1_summer", status: 400 },
    { path: "/api/player-series/999999/snapshot-seed?snapshot_label=y1_summer", status: 404 },
    { path: `/api/player-series/${player.player_series_id}/snapshot-seed`, status: 400 },
    { path: `/api/player-series/${player.player_series_id}/snapshot-seed?snapshot_label=bad_label`, status: 400 },
    { path: `/api/player-series/${player.player_series_id}/snapshot-seed?snapshot_label=post_tournament`, status: 400 },
    { path: `/api/player-series/${player.player_series_id}/snapshot-seed?snapshot_label=entrance`, status: 409 },
  ];
  for (const item of cases) {
    const response = await context.requestJson({ path: item.path });
    assert.equal(response.status, item.status, item.path);
    assert.equal(response.body.success, false, item.path);
    assert.ok(response.body.error, item.path);
  }
});
