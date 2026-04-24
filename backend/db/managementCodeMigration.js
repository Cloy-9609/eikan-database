const {
  generateSchoolCodeCandidate,
  normalizeHumanSafeCode,
  resolveNextSeriesNo,
} = require("../helpers/managementCodes");

const SCHOOL_CODE_UNIQUE_INDEX = "idx_schools_school_code_unique";
const PLAYER_SERIES_NO_UNIQUE_INDEX = "idx_player_series_school_series_no_unique";
const MAX_SCHOOL_CODE_ATTEMPTS = 200;

async function tableExists(all, tableName) {
  const rows = await all(
    `
      SELECT name
      FROM sqlite_master
      WHERE type = 'table' AND name = ?
    `,
    [tableName]
  );

  return rows.length > 0;
}

async function getColumnNames(all, tableName) {
  const columns = await all(`PRAGMA table_info(${tableName})`);
  return new Set(columns.map((column) => column.name));
}

async function ensureSchoolCodeColumn(all, run) {
  const columnNames = await getColumnNames(all, "schools");

  if (!columnNames.has("school_code")) {
    await run("ALTER TABLE schools ADD COLUMN school_code TEXT");
  }
}

async function ensureSeriesNoColumn(all, run) {
  const columnNames = await getColumnNames(all, "player_series");

  if (!columnNames.has("series_no")) {
    await run("ALTER TABLE player_series ADD COLUMN series_no INTEGER");
  }
}

function generateUniqueSchoolCode(usedCodes) {
  for (let attempt = 0; attempt < MAX_SCHOOL_CODE_ATTEMPTS; attempt += 1) {
    const candidate = generateSchoolCodeCandidate();

    if (!usedCodes.has(candidate)) {
      usedCodes.add(candidate);
      return candidate;
    }
  }

  throw new Error("Unable to generate a unique school_code candidate.");
}

async function backfillSchoolCodes(all, run) {
  const schools = await all(
    `
      SELECT id, school_code
      FROM schools
      ORDER BY id ASC
    `
  );
  const usedCodes = new Set();

  for (const school of schools) {
    const currentCode = normalizeHumanSafeCode(school.school_code);
    const shouldKeepCurrentCode = currentCode && !usedCodes.has(currentCode);
    const schoolCode = shouldKeepCurrentCode ? currentCode : generateUniqueSchoolCode(usedCodes);

    if (schoolCode !== school.school_code) {
      await run(
        `
          UPDATE schools
          SET
            school_code = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [schoolCode, school.id]
      );
    }

    if (shouldKeepCurrentCode) {
      usedCodes.add(currentCode);
    }
  }
}

async function backfillSeriesNos(all, run) {
  const seriesRows = await all(
    `
      SELECT id, school_id, series_no
      FROM player_series
      ORDER BY school_id ASC, id ASC
    `
  );
  const usedSeriesNosBySchool = new Map();

  for (const series of seriesRows) {
    const schoolKey = String(series.school_id);

    if (!usedSeriesNosBySchool.has(schoolKey)) {
      usedSeriesNosBySchool.set(schoolKey, []);
    }

    const usedSeriesNos = usedSeriesNosBySchool.get(schoolKey);
    const currentSeriesNo = Number(series.series_no);
    const shouldKeepCurrentSeriesNo =
      Number.isInteger(currentSeriesNo) &&
      currentSeriesNo > 0 &&
      !usedSeriesNos.includes(currentSeriesNo);
    const seriesNo = shouldKeepCurrentSeriesNo
      ? currentSeriesNo
      : resolveNextSeriesNo(usedSeriesNos);

    if (seriesNo !== series.series_no) {
      await run(
        `
          UPDATE player_series
          SET
            series_no = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [seriesNo, series.id]
      );
    }

    usedSeriesNos.push(seriesNo);
  }
}

async function assertBackfillComplete(get) {
  const schoolCodeMissing = await get(
    `
      SELECT COUNT(*) AS count
      FROM schools
      WHERE school_code IS NULL OR TRIM(school_code) = ''
    `
  );
  const seriesNoMissing = await get(
    `
      SELECT COUNT(*) AS count
      FROM player_series
      WHERE series_no IS NULL OR series_no <= 0
    `
  );

  if (Number(schoolCodeMissing?.count ?? 0) > 0) {
    throw new Error("school_code backfill did not complete.");
  }

  if (Number(seriesNoMissing?.count ?? 0) > 0) {
    throw new Error("series_no backfill did not complete.");
  }
}

async function ensureManagementCodeSchema({ all, get, run, transaction }) {
  const hasSchools = await tableExists(all, "schools");
  const hasPlayerSeries = await tableExists(all, "player_series");

  if (!hasSchools || !hasPlayerSeries) {
    return;
  }

  await transaction(async () => {
    await ensureSchoolCodeColumn(all, run);
    await ensureSeriesNoColumn(all, run);
    await backfillSchoolCodes(all, run);
    await backfillSeriesNos(all, run);
    await assertBackfillComplete(get);
    await run(
      `CREATE UNIQUE INDEX IF NOT EXISTS ${SCHOOL_CODE_UNIQUE_INDEX} ON schools(school_code)`
    );
    await run(
      `CREATE UNIQUE INDEX IF NOT EXISTS ${PLAYER_SERIES_NO_UNIQUE_INDEX} ON player_series(school_id, series_no)`
    );
  });
}

module.exports = {
  SCHOOL_CODE_UNIQUE_INDEX,
  PLAYER_SERIES_NO_UNIQUE_INDEX,
  ensureManagementCodeSchema,
};
