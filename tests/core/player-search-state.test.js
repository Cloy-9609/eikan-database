const assert = require("node:assert/strict");
const test = require("node:test");

const OPTIONS = {
  allowedPlayerTypes: ["normal", "genius", "reincarnated"],
  allowedMainPositions: ["投手", "捕手", "一塁手", "二塁手", "三塁手", "遊撃手", "外野手", "全野手", "全内野手"],
  allowedSchoolGrades: ["1", "2", "3"],
  allowedRosterStatuses: ["active", "graduated"],
  allowedSnapshotLabels: ["entrance", "y1_summer", "graduation"],
  allowedSortKeys: ["updated_at", "name", "admission_year", "school_grade", "roster_status", "power", "velocity", "trajectory"],
  abilityDefinitions: [
    { value: "power", min: 0, max: 100 },
    { value: "trajectory", min: 1, max: 4 },
    { value: "velocity", min: 30, max: 175 },
  ],
};

let stateModule;

test.before(async () => {
  stateModule = await import("../../frontend/js/state/playerSearchState.mjs");
});

function read(query) {
  return stateModule.readPlayerSearchStateFromParams(new URLSearchParams(query), OPTIONS);
}

function canonical(query, state = read(query)) {
  return stateModule.buildCanonicalPlayerSearchParams(new URLSearchParams(query), state, OPTIONS);
}

function api(query, state = read(query)) {
  return stateModule.buildPlayerListParams(state, OPTIONS);
}

test("default state is used for empty query and canonical params include default sort", () => {
  const state = read("");
  assert.deepEqual(state, stateModule.createDefaultPlayerSearchState());
  assert.equal(canonical("", state).get("sort_by"), "updated_at");
  assert.equal(canonical("", state).get("sort_order"), "desc");
});

test("canonical query matches state, API query, and canonical params", () => {
  const query = "name=山田&school_name=青葉&admission_year_from=2024&admission_year_to=2026&player_type=normal&main_position=投手&school_grade=2&roster_status=active&snapshot_label=entrance&sort_by=name&sort_order=asc&ability_key=power&ability_min=80&ability_max=89";
  const state = read(query);
  assert.deepEqual(state, {
    name: "山田", schoolName: "青葉", admissionYearFrom: "2024", admissionYearTo: "2026", playerType: "normal", mainPosition: "投手", schoolGrade: "2", rosterStatus: "active", snapshotLabel: "entrance", sortBy: "name", sortOrder: "asc", abilityKey: "power", abilityMin: "80", abilityMax: "89",
  });
  assert.equal(api(query, state).school_name, "青葉");
  assert.equal(canonical(query, state).get("ability_max"), "89");
});

test("canonical builder does not mutate source params and keeps unrelated query", () => {
  const source = new URLSearchParams("debug=1&sort=name:asc&player_type=invalid");
  const params = stateModule.buildCanonicalPlayerSearchParams(source, read(source), OPTIONS);
  assert.equal(source.get("sort"), "name:asc");
  assert.equal(source.get("player_type"), "invalid");
  assert.equal(params.get("debug"), "1");
  assert.equal(params.has("player_type"), false);
});

test("fixed select values are preserved when valid and removed when invalid", () => {
  assert.equal(read("player_type=genius").playerType, "genius");
  assert.equal(read("player_type=unknown").playerType, "");
  assert.equal(read("main_position=捕手").mainPosition, "捕手");
  assert.equal(read("main_position=invalid").mainPosition, "");
  assert.equal(read("school_grade=1").schoolGrade, "1");
  assert.equal(read("school_grade=4").schoolGrade, "");
  assert.equal(read("roster_status=active").rosterStatus, "active");
  assert.equal(read("roster_status=unknown").rosterStatus, "");
});

test("snapshot label is injected and invalid snapshot is removed", () => {
  assert.equal(read("snapshot_label=y1_summer").snapshotLabel, "y1_summer");
  assert.equal(read("snapshot_label=invalid").snapshotLabel, "");
  assert.equal(api("snapshot_label=invalid").snapshot_label, "");
  assert.equal(canonical("snapshot_label=invalid").has("snapshot_label"), false);
});

test("sort contract supports canonical, ability, legacy, precedence, empty legacy, invalid, and order normalization", () => {
  assert.deepEqual(read("sort_by=name&sort_order=asc"), { ...stateModule.createDefaultPlayerSearchState(), sortBy: "name", sortOrder: "asc" });
  assert.equal(read("sort_by=power&sort_order=desc").sortBy, "power");
  assert.deepEqual({ sortBy: read("sort_by=bad&sort_order=asc").sortBy, sortOrder: read("sort_by=bad&sort_order=asc").sortOrder }, { sortBy: "updated_at", sortOrder: "desc" });
  assert.deepEqual({ sortBy: read("sort=name:asc").sortBy, sortOrder: read("sort=name:asc").sortOrder }, { sortBy: "name", sortOrder: "asc" });
  assert.deepEqual({ sortBy: read("sort_by=updated_at&sort_order=desc&sort=name:asc").sortBy, sortOrder: read("sort_by=updated_at&sort_order=desc&sort=name:asc").sortOrder }, { sortBy: "name", sortOrder: "asc" });
  assert.deepEqual({ sortBy: read("sort=&sort_by=name&sort_order=desc").sortBy, sortOrder: read("sort=&sort_by=name&sort_order=desc").sortOrder }, { sortBy: "name", sortOrder: "desc" });
  assert.deepEqual({ sortBy: read("sort=bad:asc").sortBy, sortOrder: read("sort=bad:asc").sortOrder }, { sortBy: "updated_at", sortOrder: "desc" });
  assert.equal(read("sort_by=name&sort_order=ASC").sortOrder, "asc");
  assert.equal(read("sort_by=name&sort_order=sideways").sortOrder, "desc");
});

test("legacy admission_year precedence is preserved and legacy key is removed from canonical URL", () => {
  assert.deepEqual({ from: read("admission_year=2026").admissionYearFrom, to: read("admission_year=2026").admissionYearTo }, { from: "2026", to: "2026" });
  assert.deepEqual({ from: read("admission_year_from=2025&admission_year_to=2027&admission_year=2026").admissionYearFrom, to: read("admission_year_from=2025&admission_year_to=2027&admission_year=2026").admissionYearTo }, { from: "2025", to: "2027" });
  assert.deepEqual({ from: read("admission_year=2026&admission_year_from=2025").admissionYearFrom, to: read("admission_year=2026&admission_year_from=2025").admissionYearTo }, { from: "2025", to: "2026" });
  assert.deepEqual({ from: read("admission_year=2026&admission_year_from=").admissionYearFrom, to: read("admission_year=2026&admission_year_from=").admissionYearTo }, { from: "", to: "2026" });
  assert.equal(canonical("admission_year=2026").has("admission_year"), false);
});

test("legacy position_type precedence is preserved", () => {
  assert.equal(read("position_type=pitcher").mainPosition, "投手");
  assert.equal(read("position_type=fielder").mainPosition, "全野手");
  assert.equal(read("main_position=捕手&position_type=pitcher").mainPosition, "捕手");
  assert.equal(read("main_position=&position_type=pitcher").mainPosition, "投手");
  assert.equal(read("main_position=invalid&position_type=pitcher").mainPosition, "");
});

test("integer parsing is strict and trims surrounding whitespace", () => {
  assert.equal(stateModule.parsePlayerIntegerSearchValue(""), "");
  assert.equal(stateModule.parsePlayerIntegerSearchValue("0"), "0");
  assert.equal(stateModule.parsePlayerIntegerSearchValue("50"), "50");
  assert.equal(stateModule.parsePlayerIntegerSearchValue("50.5"), "");
  assert.equal(stateModule.parsePlayerIntegerSearchValue("abc"), "");
  assert.equal(stateModule.parsePlayerIntegerSearchValue("01"), "");
  assert.equal(stateModule.parsePlayerIntegerSearchValue(" 50 "), "50");
});

test("ability key and range normalization covers invalid, partial, boundaries, decimals, non-numeric, and reversed ranges", () => {
  assert.deepEqual(read("ability_key=bad&ability_min=50&ability_max=80"), stateModule.createDefaultPlayerSearchState());
  assert.deepEqual({ key: read("ability_key=power&ability_min=80").abilityKey, min: read("ability_key=power&ability_min=80").abilityMin, max: read("ability_key=power&ability_min=80").abilityMax }, { key: "power", min: "80", max: "" });
  assert.deepEqual({ key: read("ability_key=power&ability_max=89").abilityKey, min: read("ability_key=power&ability_max=89").abilityMin, max: read("ability_key=power&ability_max=89").abilityMax }, { key: "power", min: "", max: "89" });
  assert.deepEqual({ key: read("ability_key=power&ability_min=80&ability_max=89").abilityKey, min: read("ability_key=power&ability_min=80&ability_max=89").abilityMin, max: read("ability_key=power&ability_min=80&ability_max=89").abilityMax }, { key: "power", min: "80", max: "89" });
  assert.deepEqual({ min: read("ability_key=power&ability_min=-1").abilityMin, max: read("ability_key=power&ability_max=101").abilityMax }, { min: "", max: "" });
  assert.equal(read("ability_key=power&ability_min=50.5").abilityMin, "");
  assert.equal(read("ability_key=power&ability_max=abc").abilityMax, "");
  assert.deepEqual({ min: read("ability_key=trajectory&ability_min=1").abilityMin, max: read("ability_key=trajectory&ability_max=4").abilityMax }, { min: "1", max: "4" });
  assert.deepEqual({ min: read("ability_key=velocity&ability_min=30").abilityMin, max: read("ability_key=velocity&ability_max=175").abilityMax }, { min: "30", max: "175" });

  const reversed = read("ability_key=power&ability_min=80&ability_max=50");
  assert.equal(reversed.abilityKey, "power");
  assert.equal(reversed.abilityMin, "");
  assert.equal(reversed.abilityMax, "");
  assert.equal(canonical("ability_key=power&ability_min=80&ability_max=50", reversed).has("ability_min"), false);
  assert.equal(canonical("ability_key=power&ability_min=80&ability_max=50", reversed).has("ability_max"), false);
  assert.equal(api("ability_key=power&ability_min=80&ability_max=50", reversed).ability_min, "");
  assert.equal(api("ability_key=power&ability_min=80&ability_max=50", reversed).ability_max, "");
});

test("ability range normalization preserves the valid opposite bound when only one side is invalid", () => {
  const invalidMin = read("ability_key=power&ability_min=-1&ability_max=80");
  assert.deepEqual(
    { key: invalidMin.abilityKey, min: invalidMin.abilityMin, max: invalidMin.abilityMax },
    { key: "power", min: "", max: "80" }
  );
  assert.equal(api("", invalidMin).ability_min, "");
  assert.equal(api("", invalidMin).ability_max, "80");
  assert.equal(canonical("ability_key=power&ability_min=-1&ability_max=80", invalidMin).has("ability_min"), false);
  assert.equal(canonical("ability_key=power&ability_min=-1&ability_max=80", invalidMin).get("ability_max"), "80");

  const invalidMax = read("ability_key=power&ability_min=20&ability_max=101");
  assert.deepEqual(
    { key: invalidMax.abilityKey, min: invalidMax.abilityMin, max: invalidMax.abilityMax },
    { key: "power", min: "20", max: "" }
  );
  assert.equal(api("", invalidMax).ability_min, "20");
  assert.equal(api("", invalidMax).ability_max, "");
  assert.equal(canonical("ability_key=power&ability_min=20&ability_max=101", invalidMax).get("ability_min"), "20");
  assert.equal(canonical("ability_key=power&ability_min=20&ability_max=101", invalidMax).has("ability_max"), false);

  const decimalMin = read("ability_key=power&ability_min=50.5&ability_max=80");
  assert.equal(decimalMin.abilityMin, "");
  assert.equal(decimalMin.abilityMax, "80");

  const nonNumericMax = read("ability_key=power&ability_min=20&ability_max=abc");
  assert.equal(nonNumericMax.abilityMin, "20");
  assert.equal(nonNumericMax.abilityMax, "");

  const bothInvalid = read("ability_key=power&ability_min=-1&ability_max=101");
  assert.deepEqual(
    { key: bothInvalid.abilityKey, min: bothInvalid.abilityMin, max: bothInvalid.abilityMax },
    { key: "power", min: "", max: "" }
  );
});

test("canonical cleanup removes legacy and invalid recognized keys while preserving unrelated query", () => {
  const params = canonical("debug=1&sort=name:asc&admission_year=2026&position_type=pitcher&player_type=bad&snapshot_label=bad&ability_key=bad&ability_min=80");
  assert.equal(params.get("debug"), "1");
  assert.equal(params.has("sort"), false);
  assert.equal(params.has("admission_year"), false);
  assert.equal(params.has("position_type"), false);
  assert.equal(params.has("player_type"), false);
  assert.equal(params.has("snapshot_label"), false);
  assert.equal(params.has("ability_key"), false);
  assert.equal(params.has("ability_min"), false);
  assert.equal(params.get("main_position"), "投手");
});

test("recognized query keys are the player URL state contract and hash remains page orchestration responsibility", () => {
  assert.deepEqual(stateModule.PLAYER_SEARCH_QUERY_KEYS, [
    "name", "school_name", "admission_year", "admission_year_from", "admission_year_to", "player_type", "main_position", "position_type", "school_grade", "roster_status", "snapshot_label", "sort_by", "sort_order", "sort", "ability_key", "ability_min", "ability_max",
  ]);
  assert.equal(canonical("debug=1#ignored").toString().includes("#"), false);
});
