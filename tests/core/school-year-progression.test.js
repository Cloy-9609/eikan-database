const test = require("node:test");
const assert = require("node:assert/strict");
const { createTestContext } = require("../helpers/testContext");
const {
  buildSchoolPayload,
  buildPlayerPayload,
  buildPitchTypes,
  buildSpecialAbilities,
  buildSubPositions,
} = require("../helpers/playerFixtures");

let context;
let caseNo = 0;

test.before(async () => {
  context = await createTestContext();
});

test.after(async () => {
  await context.cleanup();
});

function caseName(name) {
  caseNo += 1;
  return `年度進行${caseNo}-${name}`;
}

async function createSchool(name, startYear = 2026) {
  const response = await context.requestJson({
    method: "POST",
    path: "/api/schools",
    body: buildSchoolPayload({ name: caseName(name), start_year: startYear }),
  });
  assert.equal(response.status, 201, response.text);
  assert.equal(response.body.success, true);
  return response.body.data;
}

async function createPlayerSnapshot(schoolId, overrides = {}) {
  const response = await context.requestJson({
    method: "POST",
    path: "/api/players",
    body: buildPlayerPayload({
      school_id: schoolId,
      name: overrides.name ?? caseName("選手"),
      snapshot_label: overrides.snapshot_label ?? "entrance",
      snapshot_note: overrides.snapshot_note ?? `note-${caseNo}`,
      total_stars: overrides.total_stars ?? 100 + caseNo,
      velocity: overrides.velocity ?? 130 + caseNo,
      power: overrides.power ?? 40 + caseNo,
      pitch_types: overrides.pitch_types ?? buildPitchTypes([{ pitch_name: `スライダー${caseNo}`, level: 1 + (caseNo % 5) }]),
      special_abilities: overrides.special_abilities ?? buildSpecialAbilities([{ ability_name: `ノビ${caseNo}`, rank_value: "B" }]),
      sub_positions: overrides.sub_positions ?? buildSubPositions([{ position_name: "一塁手", suitability_value: "C", defense_value: 50 + caseNo }]),
      ...overrides,
    }),
  });
  assert.equal(response.status, 201, response.text);
  assert.equal(response.body.success, true);
  return response.body.data;
}

async function setSeriesState(seriesId, schoolGrade, rosterStatus) {
  await context.db.run(
    "UPDATE player_series SET school_grade = ?, roster_status = ? WHERE id = ?",
    [schoolGrade, rosterStatus, seriesId]
  );
}

async function createSeriesWithState(schoolId, key, schoolGrade, rosterStatus, snapshotLabel = "entrance") {
  const player = await createPlayerSnapshot(schoolId, {
    name: `${key}-${caseNo}`,
    snapshot_label: snapshotLabel,
    total_stars: 200 + caseNo,
    velocity: 140 + caseNo,
    power: 60 + caseNo,
  });
  await setSeriesState(player.player_series_id, schoolGrade, rosterStatus);
  return { key, playerId: player.id, seriesId: player.player_series_id, before: { schoolGrade, rosterStatus } };
}

async function createFourSeriesSchool(name = "基本") {
  const school = await createSchool(name, 2026);
  const series = [
    await createSeriesWithState(school.id, "A", 1, "active", "entrance"),
    await createSeriesWithState(school.id, "B", 2, "active", "y1_summer"),
    await createSeriesWithState(school.id, "C", 3, "active", "y2_autumn"),
    await createSeriesWithState(school.id, "D", 3, "graduated", "graduation"),
  ];
  await addPlayerResultsForSeries(series);
  return { school, series };
}

async function getSchool(id) {
  return context.db.get("SELECT * FROM schools WHERE id = ?", [id]);
}

async function getSeriesRows(schoolId) {
  return context.db.all(
    "SELECT id, school_grade, roster_status FROM player_series WHERE school_id = ? ORDER BY id ASC",
    [schoolId]
  );
}

function rowsById(rows) {
  return new Map(rows.map((row) => [Number(row.id), row]));
}

async function getLogs(schoolId) {
  return context.db.all("SELECT * FROM school_year_progress_logs WHERE school_id = ? ORDER BY id ASC", [schoolId]);
}

async function getLogPlayers(logId) {
  return context.db.all(
    "SELECT * FROM school_year_progress_log_players WHERE log_id = ? ORDER BY player_series_id ASC",
    [logId]
  );
}

async function createPlayerResult(playerId, overrides = {}) {
  const result = {
    result_label: "summer",
    batting_average: null,
    home_runs: null,
    runs_batted_in: null,
    stolen_bases: null,
    earned_run_average: null,
    wins: null,
    losses: null,
    holds: null,
    saves: null,
    ...overrides,
  };
  await context.db.run(
    `INSERT INTO player_results (
      player_id,
      result_label,
      batting_average,
      home_runs,
      runs_batted_in,
      stolen_bases,
      earned_run_average,
      wins,
      losses,
      holds,
      saves
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      playerId,
      result.result_label,
      result.batting_average,
      result.home_runs,
      result.runs_batted_in,
      result.stolen_bases,
      result.earned_run_average,
      result.wins,
      result.losses,
      result.holds,
      result.saves,
    ]
  );
}

async function addPlayerResultsForSeries(series) {
  if (series.length < 2) {
    return;
  }

  await createPlayerResult(series[0].playerId, {
    result_label: "summer",
    batting_average: 0.321,
    home_runs: 3,
    runs_batted_in: 12,
    stolen_bases: 4,
  });
  await createPlayerResult(series[1].playerId, {
    result_label: "autumn",
    earned_run_average: 2.45,
    wins: 5,
    losses: 1,
    saves: 2,
  });
}

async function captureSnapshotState(schoolId) {
  const players = await context.db.all(
    `SELECT
      id,
      player_series_id,
      school_id,
      name,
      player_type,
      player_type_note,
      total_stars,
      prefecture,
      grade,
      admission_year,
      snapshot_label,
      snapshot_note,
      main_position,
      throwing_hand,
      batting_hand,
      is_reincarnated,
      is_genius,
      velocity,
      control,
      stamina,
      trajectory,
      meat,
      power,
      run_speed,
      arm_strength,
      fielding,
      catching,
      evidence_image_path,
      created_at,
      updated_at
    FROM players
    WHERE school_id = ?
    ORDER BY id ASC`,
    [schoolId]
  );
  const pitchTypes = await context.db.all(
    `SELECT
      player_pitch_types.id,
      player_pitch_types.player_id,
      player_pitch_types.pitch_name,
      player_pitch_types.level,
      player_pitch_types.is_original,
      player_pitch_types.original_pitch_name
    FROM player_pitch_types
    INNER JOIN players ON players.id = player_pitch_types.player_id
    WHERE players.school_id = ?
    ORDER BY player_pitch_types.id ASC`,
    [schoolId]
  );
  const specialAbilities = await context.db.all(
    `SELECT
      player_special_abilities.id,
      player_special_abilities.player_id,
      player_special_abilities.ability_name,
      player_special_abilities.ability_category,
      player_special_abilities.rank_value
    FROM player_special_abilities
    INNER JOIN players ON players.id = player_special_abilities.player_id
    WHERE players.school_id = ?
    ORDER BY player_special_abilities.id ASC`,
    [schoolId]
  );
  const subPositions = await context.db.all(
    `SELECT
      player_sub_positions.id,
      player_sub_positions.player_id,
      player_sub_positions.position_name,
      player_sub_positions.suitability_value,
      player_sub_positions.defense_value
    FROM player_sub_positions
    INNER JOIN players ON players.id = player_sub_positions.player_id
    WHERE players.school_id = ?
    ORDER BY player_sub_positions.id ASC`,
    [schoolId]
  );
  const playerResults = await context.db.all(
    `SELECT
      player_results.id,
      player_results.player_id,
      player_results.result_label,
      player_results.batting_average,
      player_results.home_runs,
      player_results.runs_batted_in,
      player_results.stolen_bases,
      player_results.earned_run_average,
      player_results.wins,
      player_results.losses,
      player_results.holds,
      player_results.saves
    FROM player_results
    INNER JOIN players ON players.id = player_results.player_id
    WHERE players.school_id = ?
    ORDER BY player_results.id ASC`,
    [schoolId]
  );

  return {
    players,
    relations: {
      player_pitch_types: pitchTypes,
      player_special_abilities: specialAbilities,
      player_sub_positions: subPositions,
      player_results: playerResults,
    },
  };
}

function assertSnapshotStateUnchanged(before, after) {
  assert.deepEqual(after.players, before.players);
  assert.deepEqual(after.relations, before.relations);
}

function assertProgressedRows(series, rows) {
  const byId = rowsById(rows);
  assert.deepEqual({ schoolGrade: byId.get(series[0].seriesId).school_grade, rosterStatus: byId.get(series[0].seriesId).roster_status }, { schoolGrade: 2, rosterStatus: "active" });
  assert.deepEqual({ schoolGrade: byId.get(series[1].seriesId).school_grade, rosterStatus: byId.get(series[1].seriesId).roster_status }, { schoolGrade: 3, rosterStatus: "active" });
  assert.deepEqual({ schoolGrade: byId.get(series[2].seriesId).school_grade, rosterStatus: byId.get(series[2].seriesId).roster_status }, { schoolGrade: 3, rosterStatus: "graduated" });
  assert.deepEqual({ schoolGrade: byId.get(series[3].seriesId).school_grade, rosterStatus: byId.get(series[3].seriesId).roster_status }, { schoolGrade: 3, rosterStatus: "graduated" });
}

function assertRestoredRows(series, rows) {
  const byId = rowsById(rows);
  for (const item of series) {
    assert.deepEqual(
      { schoolGrade: byId.get(item.seriesId).school_grade, rosterStatus: byId.get(item.seriesId).roster_status },
      item.before
    );
  }
}

test("player_seriesが0件の学校は年度進行を409で拒否し、部分更新しない", async () => {
  const school = await createSchool("空学校", 2026);
  const beforeSchool = await getSchool(school.id);

  const response = await context.requestJson({ method: "POST", path: `/api/schools/${school.id}/progress-year` });
  assert.equal(response.status, 409, response.text);
  assert.equal(response.body.success, false);
  assert.ok(response.body.error?.message);

  const afterSchool = await getSchool(school.id);
  assert.equal(afterSchool.current_year, beforeSchool.current_year);
  assert.equal((await getLogs(school.id)).length, 0);
  const logPlayers = await context.db.get(
    `SELECT COUNT(*) AS count
     FROM school_year_progress_log_players AS log_players
     INNER JOIN school_year_progress_logs AS logs ON logs.id = log_players.log_id
     WHERE logs.school_id = ?`,
    [school.id]
  );
  assert.equal(logPlayers.count, 0);
  assert.equal((await getSeriesRows(school.id)).length, 0);
});

test("年度進行は学校年度・系列状態・progress log・undo表示を更新し、snapshotとrelationを変更しない", async () => {
  const { school, series } = await createFourSeriesSchool("基本動作");
  const snapshotsBefore = await captureSnapshotState(school.id);

  const response = await context.requestJson({ method: "POST", path: `/api/schools/${school.id}/progress-year` });
  assert.equal(response.status, 200, response.text);
  assert.equal(response.body.success, true);
  assert.deepEqual(response.body.data.progression, {
    previousYear: 2026,
    currentYear: 2027,
    advancedCount: 2,
    graduatedCount: 1,
    alreadyGraduatedCount: 1,
    snapshotsCreated: 0,
  });

  assert.equal((await getSchool(school.id)).current_year, 2027);
  assertProgressedRows(series, await getSeriesRows(school.id));
  assertSnapshotStateUnchanged(snapshotsBefore, await captureSnapshotState(school.id));

  const logs = await getLogs(school.id);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].school_id, school.id);
  assert.equal(logs[0].previous_year, 2026);
  assert.equal(logs[0].current_year, 2027);
  assert.equal(logs[0].snapshots_created, 0);
  assert.equal(logs[0].is_undo_available, 1);
  assert.equal(logs[0].undone_at, null);

  const logPlayers = await getLogPlayers(logs[0].id);
  assert.equal(logPlayers.length, series.length);
  const logPlayerBySeriesId = rowsById(logPlayers.map((row) => ({ id: row.player_series_id, ...row })));
  for (const item of series) {
    const row = logPlayerBySeriesId.get(item.seriesId);
    assert.equal(row.before_school_grade, item.before.schoolGrade);
    assert.equal(row.before_roster_status, item.before.rosterStatus);
  }

  const summaries = await context.requestJson({ path: `/api/schools/${school.id}/player-series` });
  assert.equal(summaries.status, 200, summaries.text);
  assert.deepEqual(summaries.body.data.yearProgressUndo, {
    canUndo: true,
    logId: logs[0].id,
    previousYear: 2026,
    currentYear: 2027,
    createdAt: logs[0].created_at,
  });
  const summaryById = rowsById(summaries.body.data.playerSeriesSummaries.map((row) => ({ id: row.playerSeriesId, ...row })));
  assert.equal(summaryById.get(series[0].seriesId).schoolGrade, 2);
  assert.equal(summaryById.get(series[2].seriesId).rosterStatus, "graduated");
});

test("undoは最新の年度進行を1回だけ完全復元し、二重undoを409で拒否する", async () => {
  const { school, series } = await createFourSeriesSchool("undo基本");
  const snapshotsBefore = await captureSnapshotState(school.id);
  const progress = await context.requestJson({ method: "POST", path: `/api/schools/${school.id}/progress-year` });
  assert.equal(progress.status, 200, progress.text);
  const log = (await getLogs(school.id))[0];
  const logPlayersBeforeUndo = await getLogPlayers(log.id);

  const undo = await context.requestJson({ method: "POST", path: `/api/schools/${school.id}/progress-year/undo` });
  assert.equal(undo.status, 200, undo.text);
  assert.equal(undo.body.success, true);
  assert.deepEqual(undo.body.data.undoProgression, {
    previousYear: 2027,
    currentYear: 2026,
    restoredPlayerSeriesCount: 4,
    snapshotsRestored: 0,
  });
  assert.equal((await getSchool(school.id)).current_year, 2026);
  assertRestoredRows(series, await getSeriesRows(school.id));
  assertSnapshotStateUnchanged(snapshotsBefore, await captureSnapshotState(school.id));

  const undoneLog = (await getLogs(school.id))[0];
  assert.equal(undoneLog.is_undo_available, 0);
  assert.notEqual(undoneLog.undone_at, null);
  assert.deepEqual(await getLogPlayers(log.id), logPlayersBeforeUndo);

  const summaries = await context.requestJson({ path: `/api/schools/${school.id}/player-series` });
  assert.equal(summaries.status, 200, summaries.text);
  assert.equal(summaries.body.data.yearProgressUndo.canUndo, false);
  assert.equal(summaries.body.data.yearProgressUndo.logId, null);

  const stateBeforeDoubleUndo = { school: await getSchool(school.id), series: await getSeriesRows(school.id), snapshots: await captureSnapshotState(school.id), logs: await getLogs(school.id) };
  const doubleUndo = await context.requestJson({ method: "POST", path: `/api/schools/${school.id}/progress-year/undo` });
  assert.equal(doubleUndo.status, 409, doubleUndo.text);
  assert.equal(doubleUndo.body.success, false);
  assert.ok(doubleUndo.body.error?.message);
  assert.equal((await getSchool(school.id)).current_year, stateBeforeDoubleUndo.school.current_year);
  assert.deepEqual(await getSeriesRows(school.id), stateBeforeDoubleUndo.series);
  assertSnapshotStateUnchanged(stateBeforeDoubleUndo.snapshots, await captureSnapshotState(school.id));
  assert.deepEqual(await getLogs(school.id), stateBeforeDoubleUndo.logs);
});

test("複数回進行後は最新logだけundoでき、undo後に再進行できる", async () => {
  const school = await createSchool("複数進行", 2026);
  const [series] = [await createSeriesWithState(school.id, "single", 1, "active", "entrance")];

  assert.equal((await context.requestJson({ method: "POST", path: `/api/schools/${school.id}/progress-year` })).status, 200);
  assert.equal((await context.requestJson({ method: "POST", path: `/api/schools/${school.id}/progress-year` })).status, 200);

  let logs = await getLogs(school.id);
  assert.equal(logs.length, 2);
  assert.equal(logs[0].is_undo_available, 0);
  assert.equal(logs[1].is_undo_available, 1);
  assert.equal((await getSchool(school.id)).current_year, 2028);
  assert.equal((await getSeriesRows(school.id))[0].school_grade, 3);

  const undo = await context.requestJson({ method: "POST", path: `/api/schools/${school.id}/progress-year/undo` });
  assert.equal(undo.status, 200, undo.text);
  assert.equal((await getSchool(school.id)).current_year, 2027);
  assert.deepEqual({ schoolGrade: (await getSeriesRows(school.id))[0].school_grade, rosterStatus: (await getSeriesRows(school.id))[0].roster_status }, { schoolGrade: 2, rosterStatus: "active" });
  logs = await getLogs(school.id);
  assert.equal(logs[0].is_undo_available, 0);
  assert.equal(logs[1].is_undo_available, 0);
  assert.notEqual(logs[1].undone_at, null);

  const secondUndo = await context.requestJson({ method: "POST", path: `/api/schools/${school.id}/progress-year/undo` });
  assert.equal(secondUndo.status, 409, secondUndo.text);
  assert.equal((await getSchool(school.id)).current_year, 2027);
  assert.deepEqual({ schoolGrade: (await getSeriesRows(school.id))[0].school_grade, rosterStatus: (await getSeriesRows(school.id))[0].roster_status }, { schoolGrade: 2, rosterStatus: "active" });

  const reprogress = await context.requestJson({ method: "POST", path: `/api/schools/${school.id}/progress-year` });
  assert.equal(reprogress.status, 200, reprogress.text);
  assert.equal((await getSchool(school.id)).current_year, 2028);
  assert.equal((await getSeriesRows(school.id))[0].school_grade, 3);
  logs = await getLogs(school.id);
  assert.equal(logs.length, 3);
  assert.equal(logs[0].is_undo_available, 0);
  assert.equal(logs[1].is_undo_available, 0);
  assert.equal(logs[2].is_undo_available, 1);
  const summaries = await context.requestJson({ path: `/api/schools/${school.id}/player-series` });
  assert.equal(summaries.body.data.yearProgressUndo.logId, logs[2].id);
  assert.equal(series.before.schoolGrade, 1);
});

test("2039年の学校は年度進行できず状態を変更しない", async () => {
  const school = await createSchool("上限年度", 2039);
  await createSeriesWithState(school.id, "limit", 1, "active", "entrance");
  const snapshotsBefore = await captureSnapshotState(school.id);
  const seriesBefore = await getSeriesRows(school.id);

  const response = await context.requestJson({ method: "POST", path: `/api/schools/${school.id}/progress-year` });
  assert.equal(response.status, 409, response.text);
  assert.equal(response.body.success, false);
  assert.equal((await getSchool(school.id)).current_year, 2039);
  assert.deepEqual(await getSeriesRows(school.id), seriesBefore);
  assert.equal((await getLogs(school.id)).length, 0);
  assertSnapshotStateUnchanged(snapshotsBefore, await captureSnapshotState(school.id));
});

test("progress/undoのID・不存在validation", async () => {
  const row = await context.db.get("SELECT COALESCE(MAX(id), 0) AS max_id FROM schools");
  const missingSchoolId = Number(row.max_id) + 1000;
  const cases = [
    { method: "POST", path: "/api/schools/not-number/progress-year", status: 400 },
    { method: "POST", path: `/api/schools/${missingSchoolId}/progress-year`, status: 404 },
    { method: "POST", path: "/api/schools/not-number/progress-year/undo", status: 400 },
    { method: "POST", path: `/api/schools/${missingSchoolId}/progress-year/undo`, status: 404 },
  ];

  for (const item of cases) {
    const response = await context.requestJson(item);
    assert.equal(response.status, item.status, item.path);
    assert.equal(response.body.success, false, item.path);
    assert.ok(response.body.error?.message, item.path);
  }
});
