const assert = require("node:assert/strict");
const test = require("node:test");

const SCHOOL_OPTIONS = {
  allowedPrefectures: ["東京都"],
  allowedPlayStyles: ["continuous", "three_year"],
};

let historyModule;
let schoolStateModule;

test.before(async () => {
  historyModule = await import("../../frontend/js/utils/urlHistory.mjs");
  schoolStateModule = await import("../../frontend/js/state/schoolSearchState.mjs");
});

function createHistorySpy(currentUrl = "") {
  const calls = [];

  return {
    currentUrl,
    calls,
    pushState(state, title, url) {
      calls.push({ method: "pushState", state, title, url });
    },
    replaceState(state, title, url) {
      calls.push({ method: "replaceState", state, title, url });
    },
  };
}

test("buildRelativeUrl joins pathname, search, and hash", () => {
  assert.equal(
    historyModule.buildRelativeUrl({ pathname: "/pages/players.html", search: "name=山田", hash: "#list" }),
    "/pages/players.html?name=山田#list"
  );
});

test("buildRelativeUrl omits the question mark for empty search", () => {
  assert.equal(
    historyModule.buildRelativeUrl({ pathname: "/pages/schools.html", search: "", hash: "#list" }),
    "/pages/schools.html#list"
  );
});

test("buildRelativeUrl does not duplicate search or hash prefixes", () => {
  const url = historyModule.buildRelativeUrl({ pathname: "/pages/players.html", search: "?name=山田", hash: "#list" });

  assert.equal(url, "/pages/players.html?name=山田#list");
  assert.equal(url.includes("??name"), false);
  assert.equal(url.includes("##list"), false);
});

test("writeHistoryUrl calls pushState by default", () => {
  const state = { source: "test" };
  const history = createHistorySpy();
  const result = historyModule.writeHistoryUrl({
    history,
    pathname: "/pages/players.html",
    search: "name=山田",
    hash: "#list",
    state,
  });

  assert.deepEqual(result, { method: "pushState", nextUrl: "/pages/players.html?name=山田#list" });
  assert.equal(history.calls.length, 1);
  assert.deepEqual(history.calls[0], {
    method: "pushState",
    state,
    title: "",
    url: "/pages/players.html?name=山田#list",
  });
});

test("writeHistoryUrl calls replaceState when replace is true", () => {
  const history = createHistorySpy();
  const result = historyModule.writeHistoryUrl({
    history,
    pathname: "/pages/schools.html",
    search: "sort_by=updated_at&sort_order=desc",
    hash: "",
    replace: true,
  });

  assert.deepEqual(result, { method: "replaceState", nextUrl: "/pages/schools.html?sort_by=updated_at&sort_order=desc" });
  assert.equal(history.calls.length, 1);
  assert.equal(history.calls[0].method, "replaceState");
  assert.equal(history.calls[0].title, "");
  assert.equal(history.calls[0].url, "/pages/schools.html?sort_by=updated_at&sort_order=desc");
});

test("writeHistoryUrl does not suppress a push for an identical URL", () => {
  const currentUrl = "/pages/players.html?name=山田#list";
  const history = createHistorySpy(currentUrl);
  const result = historyModule.writeHistoryUrl({
    history,
    pathname: "/pages/players.html",
    search: "name=山田",
    hash: "#list",
  });

  assert.equal(result.nextUrl, currentUrl);
  assert.equal(history.calls.length, 1);
  assert.equal(history.calls[0].method, "pushState");
});

test("school canonical params and history helper preserve unrelated query and hash", () => {
  const sourceParams = new URLSearchParams("debug=1&name=山田");
  const searchState = schoolStateModule.readSchoolSearchStateFromParams(sourceParams, SCHOOL_OPTIONS);
  const canonicalParams = schoolStateModule.buildCanonicalSchoolSearchParams(sourceParams, searchState, SCHOOL_OPTIONS);
  const nextUrl = historyModule.buildRelativeUrl({
    pathname: "/pages/schools.html",
    search: canonicalParams.toString(),
    hash: "#list",
  });

  assert.equal(canonicalParams.get("debug"), "1");
  assert.equal(nextUrl.includes("debug=1"), true);
  assert.equal(nextUrl.endsWith("#list"), true);
});
