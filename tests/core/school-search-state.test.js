const assert = require("node:assert/strict");
const test = require("node:test");

const OPTIONS = {
  allowedPrefectures: ["東京都", "アメリカ"],
  allowedPlayStyles: ["continuous", "three_year"],
};

let stateModule;

test.before(async () => {
  stateModule = await import("../../frontend/js/state/schoolSearchState.mjs");
});

function read(query) {
  return stateModule.readSchoolSearchStateFromParams(new URLSearchParams(query), OPTIONS);
}

function canonical(query, state = read(query)) {
  return stateModule.buildCanonicalSchoolSearchParams(new URLSearchParams(query), state, OPTIONS);
}

test("default state is used for empty query and canonical params include default sort", () => {
  const state = read("");
  assert.deepEqual(state, {
    name: "",
    prefecture: "",
    playStyle: "",
    sortBy: "updated_at",
    sortOrder: "desc",
  });

  const params = canonical("", state);
  assert.equal(params.get("sort_by"), "updated_at");
  assert.equal(params.get("sort_order"), "desc");
});

test("canonical query matches state, API query, and canonical params", () => {
  const query = "name=青葉&prefecture=東京都&play_style=continuous&sort_by=name&sort_order=asc";
  const state = read(query);
  assert.deepEqual(state, {
    name: "青葉",
    prefecture: "東京都",
    playStyle: "continuous",
    sortBy: "name",
    sortOrder: "asc",
  });

  assert.deepEqual(stateModule.buildSchoolListParams(state, OPTIONS), {
    name: "青葉",
    prefecture: "東京都",
    play_style: "continuous",
    sort_by: "name",
    sort_order: "asc",
  });

  const params = canonical(query, state);
  assert.equal(params.get("name"), "青葉");
  assert.equal(params.get("prefecture"), "東京都");
  assert.equal(params.get("play_style"), "continuous");
  assert.equal(params.get("sort_by"), "name");
  assert.equal(params.get("sort_order"), "asc");
});

test("valid overseas prefecture is preserved", () => {
  const state = read("prefecture=アメリカ");
  assert.equal(state.prefecture, "アメリカ");
  assert.equal(stateModule.buildSchoolListParams(state, OPTIONS).prefecture, "アメリカ");
  assert.equal(canonical("prefecture=アメリカ", state).get("prefecture"), "アメリカ");
});

test("invalid prefecture is normalized away from state, API query, and canonical params", () => {
  const state = read("prefecture=invalid");
  assert.equal(state.prefecture, "");
  assert.equal(stateModule.buildSchoolListParams(state, OPTIONS).prefecture, "");
  assert.equal(canonical("prefecture=invalid", state).has("prefecture"), false);
});

test("invalid play_style is normalized away from state, API query, and canonical params", () => {
  const state = read("play_style=invalid");
  assert.equal(state.playStyle, "");
  assert.equal(stateModule.buildSchoolListParams(state, OPTIONS).play_style, "");
  assert.equal(canonical("play_style=invalid", state).has("play_style"), false);
});

test("legacy sort is read and rewritten as canonical sort keys", () => {
  const state = read("sort=name:asc");
  assert.equal(state.sortBy, "name");
  assert.equal(state.sortOrder, "asc");

  const params = canonical("sort=name:asc", state);
  assert.equal(params.has("sort"), false);
  assert.equal(params.get("sort_by"), "name");
  assert.equal(params.get("sort_order"), "asc");
});

test("non-empty legacy sort takes precedence over canonical sort", () => {
  const state = read("sort_by=updated_at&sort_order=desc&sort=name:asc");
  assert.equal(state.sortBy, "name");
  assert.equal(state.sortOrder, "asc");
});

test("empty legacy sort falls back to canonical sort", () => {
  const state = read("sort=&sort_by=name&sort_order=desc");
  assert.equal(state.sortBy, "name");
  assert.equal(state.sortOrder, "desc");
});

test("invalid canonical sort returns default sort", () => {
  const state = read("sort_by=unknown&sort_order=sideways");
  assert.equal(state.sortBy, "updated_at");
  assert.equal(state.sortOrder, "desc");
});

test("invalid non-empty legacy sort returns default sort", () => {
  const state = read("sort=unknown:asc&sort_by=name&sort_order=asc");
  assert.equal(state.sortBy, "updated_at");
  assert.equal(state.sortOrder, "desc");
});

test("school suffix is preserved in normalized state but removed from API and canonical params", () => {
  const state = read("name=青葉高校");
  assert.equal(state.name, "青葉高校");
  assert.equal(stateModule.buildSchoolListParams(state, OPTIONS).name, "青葉");
  assert.equal(canonical("name=青葉高校", state).get("name"), "青葉");
});

test("unknown query is preserved during canonicalization", () => {
  const params = canonical("debug=1&name=青葉");
  assert.equal(params.get("debug"), "1");
  assert.equal(params.get("name"), "青葉");
});

test("flash message is not treated as a recognized search key", () => {
  const params = canonical("message=school-deleted&name=青葉");
  assert.equal(params.get("message"), "school-deleted");
  assert.equal(params.get("name"), "青葉");
});

test("recognized keys including legacy sort are cleaned before canonical keys are written", () => {
  const params = canonical(
    "name=before&prefecture=invalid&play_style=invalid&sort=updated_at:asc&sort_by=name&sort_order=desc",
    read("name=青葉&sort=name:desc")
  );

  assert.equal(params.get("name"), "青葉");
  assert.equal(params.has("prefecture"), false);
  assert.equal(params.has("play_style"), false);
  assert.equal(params.has("sort"), false);
  assert.equal(params.get("sort_by"), "name");
  assert.equal(params.get("sort_order"), "desc");
});

test("canonical params generation does not mutate source params", () => {
  const source = new URLSearchParams("debug=1&name=青葉高校&sort=name:asc");
  const before = source.toString();
  const state = stateModule.readSchoolSearchStateFromParams(source, OPTIONS);

  stateModule.buildCanonicalSchoolSearchParams(source, state, OPTIONS);

  assert.equal(source.toString(), before);
});
