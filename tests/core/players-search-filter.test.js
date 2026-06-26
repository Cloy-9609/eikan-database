const test = require("node:test");
const assert = require("node:assert/strict");
const { createTestContext } = require("../helpers/testContext");
const {
  ABILITY_KEYS,
  createSchool,
  createPlayer,
  addSnapshot,
  setSeriesState,
  assertSuccessList,
  assertSeriesSet,
  assertErrorResponse,
} = require("../helpers/playersListFixtures");

let context;
let fx;

test.before(async () => {
  context = await createTestContext();
  fx = await seedSearchFixtures(context);
});

test.after(async () => {
  await context.cleanup();
});

async function seedSearchFixtures(context) {
  const schools = {
    blue: await createSchool(context, "検索青空"),
    blueHighInside: await createSchool(context, "検索高校通り"),
    red: await createSchool(context, "検索赤雲"),
  };
  const players = {};
  const specs = [
    ["alpha", schools.blue.id, { name: "Search Alpha Core", admission_year: 2024, player_type: "normal", grade: 1, main_position: "投手", power: 20, velocity: 145 }, { school_grade: 1, roster_status: "active" }],
    ["bravo", schools.blue.id, { name: "Search Bravo Core", admission_year: 2025, player_type: "genius", grade: 2, main_position: "捕手", power: 60, velocity: 135 }, { school_grade: 2, roster_status: "active" }],
    ["charlie", schools.red.id, { name: "Search Charlie Core", admission_year: 2026, player_type: "reincarnated", grade: 3, main_position: "一塁手", power: 75, velocity: 120 }, { school_grade: 3, roster_status: "graduated" }],
    ["delta", schools.red.id, { name: "Search Delta Core", admission_year: 2023, player_type: "normal", grade: 1, main_position: "二塁手", power: 40, velocity: 125 }, { school_grade: 1, roster_status: "active" }],
    ["echo", schools.blueHighInside.id, { name: "Search Echo Core", admission_year: 2025, player_type: "genius", grade: 2, main_position: "三塁手", power: 85, velocity: 150 }, { school_grade: 2, roster_status: "graduated" }],
    ["foxtrot", schools.red.id, { name: "Search Foxtrot Core", admission_year: 2026, player_type: "normal", grade: 3, main_position: "外野手", power: null, velocity: null }, { school_grade: 3, roster_status: "active" }],
  ];
  for (const [key, schoolId, payload, series] of specs) {
    players[key] = await createPlayer(context, schoolId, payload);
    await setSeriesState(context, players[key].player_series_id, series);
  }
  const entrance = await createPlayer(context, schools.blue.id, {
    name: "Search Snapshot Switch", admission_year: 2025, player_type: "normal", grade: 1,
    snapshot_label: "entrance", main_position: "投手", power: 20, velocity: 145,
  });
  await setSeriesState(context, entrance.player_series_id, { school_grade: 1, roster_status: "active" });
  const summer = await addSnapshot(context, entrance.player_series_id, {
    snapshot_label: "y1_summer", main_position: "遊撃手", power: 80, velocity: 130,
  });
  await addSnapshot(context, entrance.player_series_id, { snapshot_label: "post_tournament", main_position: "捕手", power: 99, velocity: 175 });
  players.switcher = { ...summer, entrance_id: entrance.id, summer_id: summer.id, player_series_id: entrance.player_series_id };

  const legacy = await createPlayer(context, schools.red.id, { name: "Search Legacy Only", snapshot_label: "post_tournament", admission_year: 2024, main_position: "遊撃手", power: 55 });
  await setSeriesState(context, legacy.player_series_id, { school_grade: 2, roster_status: "active" });
  players.legacy = legacy;
  return { schools, players };
}

async function get(path) {
  return assertSuccessList(await context.requestJson({ path }));
}

function ids(...keys) {
  return keys.map((key) => fx.players[key].player_series_id);
}

test("default list returns one latest selected snapshot per series and prefers official labels", async () => {
  const rows = await get("/api/players");
  assertSeriesSet(rows, Object.values(fx.players).map((p) => p.player_series_id));
  assert.equal(new Set(rows.map((row) => row.player_series_id)).size, rows.length);
  const switcher = rows.find((row) => row.player_series_id === fx.players.switcher.player_series_id);
  assert.equal(switcher.snapshot_label, "y1_summer");
  assert.equal(switcher.id, fx.players.switcher.summer_id);
  assert.equal(switcher.main_position, "遊撃手");
  const legacy = rows.find((row) => row.player_series_id === fx.players.legacy.player_series_id);
  assert.equal(legacy.snapshot_label, "post_tournament");
});

test("name filters by player_series partial match", async () => {
  assertSeriesSet(await get("/api/players?name=Search%20Alpha"), ids("alpha"));
  assertSeriesSet(await get("/api/players?name=Bravo"), ids("bravo"));
  assertSeriesSet(await get("/api/players?name=Core"), ids("alpha", "bravo", "charlie", "delta", "echo", "foxtrot"));
});

test("school_name filters by partial name and absorbs only trailing 高校", async () => {
  const blue = ids("alpha", "bravo", "switcher");
  assertSeriesSet(await get("/api/players?school_name=検索青空"), blue);
  assertSeriesSet(await get("/api/players?school_name=検索青空高校"), blue);
  assertSeriesSet(await get("/api/players?school_name=高校通り"), ids("echo"));
  assertSeriesSet(await get("/api/players?school_name=検索高校通り高校"), ids("echo"));
});

test("school_id filters and validates school existence", async () => {
  assertSeriesSet(await get(`/api/players?school_id=${fx.schools.blue.id}`), ids("alpha", "bravo", "switcher"));
  const max = await context.db.get("SELECT MAX(id) AS id FROM schools");
  assertErrorResponse(await context.requestJson({ path: `/api/players?school_id=${max.id + 999}` }), 404);
  for (const bad of ["abc", "0", "-1"]) assertErrorResponse(await context.requestJson({ path: `/api/players?school_id=${bad}` }));
});

test("admission year filters include boundaries and legacy admission_year is equal range", async () => {
  assertSeriesSet(await get("/api/players?admission_year_from=2025"), ids("bravo", "charlie", "echo", "foxtrot", "switcher"));
  assertSeriesSet(await get("/api/players?admission_year_to=2024"), ids("alpha", "delta", "legacy"));
  assertSeriesSet(await get("/api/players?admission_year_from=2024&admission_year_to=2025"), ids("alpha", "bravo", "echo", "switcher", "legacy"));
  assertSeriesSet(await get("/api/players?admission_year=2025"), ids("bravo", "echo", "switcher"));
  assertErrorResponse(await context.requestJson({ path: "/api/players?admission_year_from=2026&admission_year_to=2025" }));
});

test("player_type school_grade and roster_status filters use series fields", async () => {
  assertSeriesSet(await get("/api/players?player_type=normal"), ids("alpha", "delta", "foxtrot", "switcher", "legacy"));
  assertSeriesSet(await get("/api/players?player_type=genius"), ids("bravo", "echo"));
  assertSeriesSet(await get("/api/players?player_type=reincarnated"), ids("charlie"));
  assertSeriesSet(await get("/api/players?school_grade=2"), ids("bravo", "echo", "legacy"));
  assertSeriesSet(await get("/api/players?roster_status=graduated"), ids("charlie", "echo"));
  assertSeriesSet(await get("/api/players?school_grade=2&roster_status=graduated"), ids("echo"));
});

test("main_position filters exact positions, aggregate categories, and legacy position_type", async () => {
  const exact = { 投手: ["alpha"], 捕手: ["bravo"], 一塁手: ["charlie"], 二塁手: ["delta"], 三塁手: ["echo"], 遊撃手: ["switcher", "legacy"], 外野手: ["foxtrot"] };
  for (const [position, keys] of Object.entries(exact)) {
    assertSeriesSet(await get(`/api/players?main_position=${encodeURIComponent(position)}`), ids(...keys));
  }
  assertSeriesSet(await get(`/api/players?main_position=${encodeURIComponent("全野手")}`), ids("bravo", "charlie", "delta", "echo", "foxtrot", "switcher", "legacy"));
  assertSeriesSet(await get(`/api/players?main_position=${encodeURIComponent("全内野手")}`), ids("charlie", "delta", "echo", "switcher", "legacy"));
  assertSeriesSet(await get("/api/players?position_type=pitcher"), ids("alpha"));
  assertSeriesSet(await get("/api/players?position_type=fielder"), ids("bravo", "charlie", "delta", "echo", "foxtrot", "switcher", "legacy"));
});

test("snapshot_label selects that snapshot row and excludes missing labels", async () => {
  const entrance = await get("/api/players?snapshot_label=entrance");
  assert.ok(entrance.some((row) => row.player_series_id === fx.players.switcher.player_series_id && row.id === fx.players.switcher.entrance_id && row.snapshot_label === "entrance"));
  assert.equal(entrance.filter((row) => row.player_series_id === fx.players.switcher.player_series_id).length, 1);
  assertSeriesSet(await get("/api/players?snapshot_label=y1_summer"), ids("switcher"));
  assertSeriesSet(await get("/api/players?snapshot_label=post_tournament"), ids("switcher", "legacy"));
});

test("ability filters cover each SQL column, include boundaries, and exclude nulls", async () => {
  const cases = {
    velocity: { min: 130, max: 145, expected: ["alpha", "bravo", "switcher", "legacy"] },
    control: { min: 50, max: 50, expected: ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "switcher", "legacy"] },
    stamina: { min: 50, max: 50, expected: ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "switcher", "legacy"] },
    trajectory: { min: 2, max: 2, expected: ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "switcher", "legacy"] },
    meat: { min: 50, max: 50, expected: ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "switcher", "legacy"] },
    power: { min: 60, max: 80, expected: ["bravo", "charlie", "switcher"] },
    run_speed: { min: 50, max: 50, expected: ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "switcher", "legacy"] },
    arm_strength: { min: 50, max: 50, expected: ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "switcher", "legacy"] },
    fielding: { min: 50, max: 50, expected: ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "switcher", "legacy"] },
    catching: { min: 50, max: 50, expected: ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "switcher", "legacy"] },
  };
  for (const key of ABILITY_KEYS) {
    const c = cases[key];
    assertSeriesSet(await get(`/api/players?ability_key=${key}&ability_min=${c.min}&ability_max=${c.max}`), ids(...c.expected));
  }
  assertSeriesSet(await get("/api/players?ability_key=power&ability_min=60"), ids("bravo", "charlie", "echo", "switcher"));
  assertSeriesSet(await get("/api/players?ability_key=power&ability_max=60"), ids("alpha", "bravo", "delta", "legacy"));
  assertSeriesSet(await get("/api/players?ability_key=velocity&ability_min=130"), ids("alpha", "bravo", "echo", "switcher", "legacy"));
  assertSeriesSet(await get("/api/players?ability_key=velocity&ability_max=145"), ids("alpha", "bravo", "charlie", "delta", "switcher", "legacy"));
});

test("snapshot_label changes ability and position filtering target", async () => {
  assertSeriesSet(await get("/api/players?snapshot_label=entrance&ability_key=power&ability_max=30"), ids("alpha", "switcher"));
  assertSeriesSet(await get("/api/players?snapshot_label=y1_summer&ability_key=power&ability_max=30"), []);
  assertSeriesSet(await get("/api/players?ability_key=power&ability_min=80"), ids("echo", "switcher"));
  assertSeriesSet(await get(`/api/players?snapshot_label=entrance&main_position=${encodeURIComponent("投手")}`), ids("alpha", "switcher"));
});

test("multiple query conditions are combined with AND", async () => {
  assertSeriesSet(await get(`/api/players?school_name=${encodeURIComponent("検索青空")}&admission_year_from=2025&admission_year_to=2025&player_type=genius&school_grade=2&roster_status=active&main_position=${encodeURIComponent("捕手")}&ability_key=power&ability_min=60&ability_max=60`), ids("bravo"));
  assertSeriesSet(await get(`/api/players?school_name=${encodeURIComponent("検索赤雲")}&roster_status=active&main_position=${encodeURIComponent("全内野手")}&ability_key=power&ability_max=55`), ids("delta", "legacy"));
  assertSeriesSet(await get(`/api/players?snapshot_label=entrance&school_name=${encodeURIComponent("検索青空")}&main_position=${encodeURIComponent("投手")}&ability_key=velocity&ability_min=140`), ids("alpha", "switcher"));
});

test("additional invalid query validation returns 400 without weakening dedicated validation tests", async () => {
  const paths = [
    "/api/players?school_grade=0", "/api/players?school_grade=4", "/api/players?player_type=invalid",
    "/api/players?roster_status=invalid", `/api/players?main_position=${encodeURIComponent("invalid")}`,
    "/api/players?position_type=invalid", "/api/players?snapshot_label=invalid", "/api/players?ability_key=invalid",
  ];
  for (const path of paths) assertErrorResponse(await context.requestJson({ path }));
});
