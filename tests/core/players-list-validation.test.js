const test = require("node:test");
const assert = require("node:assert/strict");
const { createTestContext } = require("../helpers/testContext");

let context;

test.before(async () => {
  context = await createTestContext();
});

test.after(async () => {
  await context.cleanup();
});

function assertErrorResponse(response, expectedStatus = 400) {
  assert.equal(response.status, expectedStatus);
  assert.equal(response.body.success, false);
  assert.equal(response.body.data, null);
  assert.equal(typeof response.body.error.message, "string");
  assert.ok(response.body.error.message.length > 0);
}

function assertSuccessListResponse(response) {
  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.ok(Array.isArray(response.body.data));
}

const successCases = [
  {
    name: "allows equal admission year range",
    path: "/api/players?admission_year_from=2025&admission_year_to=2025",
  },
  {
    name: "allows ascending admission year range",
    path: "/api/players?admission_year_from=2024&admission_year_to=2026",
  },
  {
    name: "allows admission year from only",
    path: "/api/players?admission_year_from=2025",
  },
  {
    name: "allows admission year to only",
    path: "/api/players?admission_year_to=2025",
  },
  {
    name: "allows legacy admission year as equal from/to fallback",
    path: "/api/players?admission_year=2025",
  },
];

for (const { name, path } of successCases) {
  test(`GET /api/players ${name}`, async () => {
    const response = await context.requestJson({ path });

    assertSuccessListResponse(response);
  });
}

const admissionYearRangeErrorCases = [
  {
    name: "rejects explicit reversed admission year range",
    path: "/api/players?admission_year_from=2026&admission_year_to=2025",
  },
  {
    name: "rejects reversed range after legacy admission year supplies to",
    path: "/api/players?admission_year=2025&admission_year_from=2026",
  },
  {
    name: "rejects reversed range after legacy admission year supplies from",
    path: "/api/players?admission_year=2026&admission_year_to=2025",
  },
];

for (const { name, path } of admissionYearRangeErrorCases) {
  test(`GET /api/players ${name}`, async () => {
    const response = await context.requestJson({ path });

    assertErrorResponse(response);
    assert.match(response.body.error.message, /admission_year_from.*less than or equal to.*admission_year_to/);
  });
}

test("GET /api/players keeps ability range validation unchanged", async () => {
  const response = await context.requestJson({
    path: "/api/players?ability_key=power&ability_min=80&ability_max=60",
  });

  assertErrorResponse(response);
  assert.equal(response.body.error.message, "ability_min must be less than or equal to ability_max.");
});
