const test = require("node:test");
const assert = require("node:assert/strict");
const { createTestContext } = require("../helpers/testContext");
const {
  ABILITY_KEYS,
  createSchool,
  createPlayer,
  addSnapshot,
  setSeriesState,
  setSnapshotUpdatedAt,
  setSnapshotLabel,
  assertSuccessList,
  assertErrorResponse,
} = require("../helpers/playersListFixtures");

let context;
let fx;

test.before(async () => {
  context = await createTestContext();
  fx = await seedSortFixtures(context);
});

test.after(async () => {
  await context.cleanup();
});

const baseAbilities = { velocity: 130, control: 50, stamina: 50, trajectory: 2, meat: 50, power: 50, run_speed: 50, arm_strength: 50, fielding: 50, catching: 50 };

async function seedSortFixtures(context) {
  const schools = {
    a: await createSchool(context, "A Sort School"),
    b: await createSchool(context, "B Sort School"),
    c: await createSchool(context, "C Sort School"),
    snapshot: await createSchool(context, "Snapshot Legacy School"),
  };
  const specs = [
    ["alpha", schools.b.id, "Sort Alpha", 2025, 2, "active", "entrance", { velocity: 120, control: 40, stamina: 70, trajectory: 1, meat: 55, power: 20, run_speed: 65, arm_strength: 75, fielding: 45, catching: 35 }, "2000-01-01 00:00:00"],
    ["bravo", schools.a.id, "Sort Bravo", 2024, 1, "graduated", "entrance", { velocity: 140, control: 70, stamina: 40, trajectory: 2, meat: 85, power: 60, run_speed: 45, arm_strength: 55, fielding: 85, catching: 75 }, "2010-01-01 00:00:00"],
    ["charlie", schools.c.id, "Sort Charlie", 2026, 3, "active", "y2_summer", { velocity: 160, control: 55, stamina: 85, trajectory: 4, meat: 35, power: 50, run_speed: 85, arm_strength: 35, fielding: 65, catching: 55 }, "2020-01-01 00:00:00"],
    ["nuller", schools.c.id, "Sort Nuller", 2027, 2, "graduated", "y1_summer", { velocity: null, control: null, stamina: null, trajectory: null, meat: null, power: null, run_speed: null, arm_strength: null, fielding: null, catching: null }, "2030-01-01 00:00:00"],
  ];
  const players = {};
  for (const [key, schoolId, name, admission_year, school_grade, roster_status, snapshot_label, abilities, updatedAt] of specs) {
    players[key] = await createPlayer(context, schoolId, { name, admission_year, grade: school_grade, snapshot_label, main_position: key === "alpha" ? "投手" : "遊撃手", ...baseAbilities, ...abilities });
    await setSeriesState(context, players[key].player_series_id, { school_grade, roster_status });
    await setSnapshotUpdatedAt(context, players[key].id, updatedAt);
  }
  const switchEntrance = await createPlayer(context, schools.a.id, { name: "Sort Switch", admission_year: 2025, grade: 1, snapshot_label: "entrance", main_position: "投手", ...baseAbilities, power: 95, velocity: 150 });
  await setSeriesState(context, switchEntrance.player_series_id, { school_grade: 1, roster_status: "active" });
  await setSnapshotUpdatedAt(context, switchEntrance.id, "2005-01-01 00:00:00");
  const bravoSummer = await addSnapshot(context, players.bravo.player_series_id, { snapshot_label: "y1_summer", main_position: "遊撃手", ...baseAbilities, power: 80, velocity: 145, control: 45, stamina: 60, trajectory: 3, meat: 65, run_speed: 55, arm_strength: 65, fielding: 75, catching: 85 });
  await setSnapshotUpdatedAt(context, bravoSummer.id, "2010-01-01 00:00:00");
  const switchSummer = await addSnapshot(context, switchEntrance.player_series_id, { snapshot_label: "y1_summer", main_position: "遊撃手", ...baseAbilities, power: 10, velocity: 110, control: 85, stamina: 55, trajectory: 3, meat: 75, run_speed: 75, arm_strength: 45, fielding: 55, catching: 65 });
  await setSnapshotUpdatedAt(context, switchSummer.id, "2025-01-01 00:00:00");
  players.switcher = { ...switchSummer, entrance_id: switchEntrance.id, entrance_series_id: switchEntrance.player_series_id, player_series_id: switchEntrance.player_series_id };
  players.bravo.summer_id = bravoSummer.id;
  const snapSummer = await createPlayer(context, schools.snapshot.id, { name: "Snapshot Summer", snapshot_label: "y1_summer", admission_year: 2024, main_position: "遊撃手", ...baseAbilities });
  const snapLegacy = await createPlayer(context, schools.snapshot.id, { name: "Snapshot Legacy", snapshot_label: "entrance", admission_year: 2024, main_position: "遊撃手", ...baseAbilities });
  const snapEntrance = await createPlayer(context, schools.snapshot.id, { name: "Snapshot Entrance", snapshot_label: "entrance", admission_year: 2024, main_position: "遊撃手", ...baseAbilities });
  const snapSecondSummer = await createPlayer(context, schools.snapshot.id, { name: "Snapshot Second Summer", snapshot_label: "y2_summer", admission_year: 2024, main_position: "遊撃手", ...baseAbilities });
  await setSnapshotLabel(context, snapLegacy.id, "post_tournament");
  players.snapshotEntrance = snapEntrance;
  players.snapshotSummer = snapSummer;
  players.snapshotSecondSummer = snapSecondSummer;
  players.legacy = snapLegacy;
  return { schools, players };
}

async function rows(query = "") {
  return assertSuccessList(await context.requestJson({ path: `/api/players${query}` }));
}
function seriesOrder(items) { return items.map((item) => item.player_series_id); }
function ids(...keys) { return keys.map((key) => fx.players[key].player_series_id); }
async function expectOrder(query, expectedKeys) { assert.deepEqual(seriesOrder(await rows(query)), ids(...expectedKeys)); }

test("sorts ordinary list columns in asc and desc order", async () => {
  await expectOrder("?school_name=Sort%20School&sort_by=name&sort_order=asc", ["alpha", "bravo", "charlie", "nuller", "switcher"]);
  await expectOrder("?school_name=Sort%20School&sort_by=name&sort_order=desc", ["switcher", "nuller", "charlie", "bravo", "alpha"]);
  await expectOrder("?school_name=Sort%20School&sort_by=school_name&sort_order=asc", ["bravo", "switcher", "alpha", "charlie", "nuller"]);
  await expectOrder("?school_name=Sort%20School&sort_by=school_name&sort_order=desc", ["charlie", "nuller", "alpha", "bravo", "switcher"]);
  await expectOrder("?school_name=Sort%20School&sort_by=admission_year&sort_order=asc", ["bravo", "switcher", "alpha", "charlie", "nuller"]);
  await expectOrder("?school_name=Sort%20School&sort_by=admission_year&sort_order=desc", ["nuller", "charlie", "switcher", "alpha", "bravo"]);
  await expectOrder("?school_name=Sort%20School&sort_by=school_grade&sort_order=asc", ["bravo", "switcher", "alpha", "nuller", "charlie"]);
  await expectOrder("?school_name=Sort%20School&sort_by=school_grade&sort_order=desc", ["charlie", "alpha", "nuller", "bravo", "switcher"]);
  await expectOrder("?school_name=Sort%20School&sort_by=roster_status&sort_order=asc", ["switcher", "alpha", "charlie", "bravo", "nuller"]);
  await expectOrder("?school_name=Sort%20School&sort_by=roster_status&sort_order=desc", ["bravo", "nuller", "switcher", "alpha", "charlie"]);
});

test("sorts snapshot labels by official timeline order instead of id order", async () => {
  const asc = await rows("?school_name=Sort%20School&sort_by=snapshot&sort_order=asc");
  assert.deepEqual(asc.map((row) => row.snapshot_label), ["entrance", "y1_summer", "y1_summer", "y1_summer", "y2_summer"]);
  const desc = await rows("?school_name=Sort%20School&sort_by=snapshot&sort_order=desc");
  assert.deepEqual(desc.map((row) => row.snapshot_label), ["y2_summer", "y1_summer", "y1_summer", "y1_summer", "entrance"]);
});

test("snapshot sort keeps legacy labels at the end in both directions", async () => {
  const asc = await rows(`?school_id=${fx.schools.snapshot.id}&sort_by=snapshot&sort_order=asc`);
  assert.deepEqual(asc.map((row) => row.snapshot_label), ["entrance", "y1_summer", "y2_summer", "post_tournament"]);
  assert.deepEqual(seriesOrder(asc), ids("snapshotEntrance", "snapshotSummer", "snapshotSecondSummer", "legacy"));
  assert.equal(new Set(asc.map((row) => row.player_series_id)).size, asc.length);
  const desc = await rows(`?school_id=${fx.schools.snapshot.id}&sort_by=snapshot&sort_order=desc`);
  assert.deepEqual(desc.map((row) => row.snapshot_label), ["y2_summer", "y1_summer", "entrance", "post_tournament"]);
  assert.deepEqual(seriesOrder(desc), ids("snapshotSecondSummer", "snapshotSummer", "snapshotEntrance", "legacy"));
  assert.equal(new Set(desc.map((row) => row.player_series_id)).size, desc.length);
});


test("updated_at default sort matches explicit updated_at desc and uses edited fixture timestamps", async () => {
  await expectOrder("?school_name=Sort%20School&sort_by=updated_at&sort_order=asc", ["alpha", "bravo", "charlie", "switcher", "nuller"]);
  await expectOrder("?school_name=Sort%20School&sort_by=updated_at&sort_order=desc", ["nuller", "switcher", "charlie", "bravo", "alpha"]);
  assert.deepEqual(seriesOrder(await rows("?school_name=Sort%20School")), seriesOrder(await rows("?school_name=Sort%20School&sort_by=updated_at&sort_order=desc")));
});

test("sorts all ability columns asc and desc with null ability values last", async () => {
  const abilityValues = {
    alpha: { velocity: 120, control: 40, stamina: 70, trajectory: 1, meat: 55, power: 20, run_speed: 65, arm_strength: 75, fielding: 45, catching: 35 },
    bravo: { velocity: 145, control: 45, stamina: 60, trajectory: 3, meat: 65, power: 80, run_speed: 55, arm_strength: 65, fielding: 75, catching: 85 },
    charlie: { velocity: 160, control: 55, stamina: 85, trajectory: 4, meat: 35, power: 50, run_speed: 85, arm_strength: 35, fielding: 65, catching: 55 },
    switcher: { velocity: 110, control: 85, stamina: 55, trajectory: 3, meat: 75, power: 10, run_speed: 75, arm_strength: 45, fielding: 55, catching: 65 },
    nuller: { velocity: null, control: null, stamina: null, trajectory: null, meat: null, power: null, run_speed: null, arm_strength: null, fielding: null, catching: null },
  };
  const expectedKeys = (key, direction) => Object.keys(abilityValues).sort((left, right) => {
    const leftValue = abilityValues[left][key];
    const rightValue = abilityValues[right][key];
    if (leftValue === null && rightValue === null) return left.localeCompare(right);
    if (leftValue === null) return 1;
    if (rightValue === null) return -1;
    if (leftValue !== rightValue) return direction === "asc" ? leftValue - rightValue : rightValue - leftValue;
    return abilityValues[left].name?.localeCompare?.(abilityValues[right].name) ?? left.localeCompare(right);
  });
  const uniqueAscOrders = new Set(ABILITY_KEYS.map((key) => JSON.stringify(expectedKeys(key, "asc"))));
  assert.equal(uniqueAscOrders.size, ABILITY_KEYS.length);
  assert.notDeepEqual(expectedKeys("velocity", "asc"), expectedKeys("power", "asc"));
  for (const key of ABILITY_KEYS) {
    await expectOrder(`?school_name=Sort%20School&sort_by=${key}&sort_order=asc`, expectedKeys(key, "asc"));
    await expectOrder(`?school_name=Sort%20School&sort_by=${key}&sort_order=desc`, expectedKeys(key, "desc"));
    assert.equal((await rows(`?school_name=Sort%20School&sort_by=${key}&sort_order=asc`)).at(-1).player_series_id, fx.players.nuller.player_series_id);
    assert.equal((await rows(`?school_name=Sort%20School&sort_by=${key}&sort_order=desc`)).at(-1).player_series_id, fx.players.nuller.player_series_id);
  }
});

test("snapshot_label changes the ability sort target for the same two series", async () => {
  const entrance = await rows(`?school_id=${fx.schools.a.id}&snapshot_label=entrance&sort_by=power&sort_order=desc`);
  assert.deepEqual(seriesOrder(entrance), ids("switcher", "bravo"));
  assert.deepEqual(entrance.map((row) => row.snapshot_label), ["entrance", "entrance"]);
  assert.deepEqual(entrance.map((row) => row.power), [95, 60]);
  const summer = await rows(`?school_id=${fx.schools.a.id}&snapshot_label=y1_summer&sort_by=power&sort_order=desc`);
  assert.deepEqual(seriesOrder(summer), ids("bravo", "switcher"));
  assert.deepEqual(summer.map((row) => row.snapshot_label), ["y1_summer", "y1_summer"]);
  assert.deepEqual(summer.map((row) => row.power), [80, 10]);
  assert.deepEqual(new Set(seriesOrder(entrance)), new Set(seriesOrder(summer)));
});

test("sort validation rejects invalid sort and ability range query values", async () => {
  const badPaths = [
    "/api/players?sort_by=invalid", "/api/players?sort_order=invalid", "/api/players?admission_year_from=abc",
    "/api/players?admission_year_from=1931", "/api/players?admission_year_to=2040", "/api/players?ability_key=power&ability_min=abc",
    "/api/players?ability_key=power&ability_max=abc", "/api/players?ability_key=velocity&ability_min=29",
    "/api/players?ability_key=velocity&ability_max=176", "/api/players?ability_key=trajectory&ability_min=0",
    "/api/players?ability_key=trajectory&ability_max=5", "/api/players?ability_key=power&ability_min=-1",
    "/api/players?ability_key=power&ability_max=101", "/api/players?ability_key=power&ability_min=80&ability_max=60",
  ];
  for (const path of badPaths) assertErrorResponse(await context.requestJson({ path }));
});
