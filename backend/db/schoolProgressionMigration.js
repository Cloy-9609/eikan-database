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

async function ensureSchoolProgressionColumns(all, run) {
  const columnNames = await getColumnNames(all, "player_series");
  const addedColumns = [];

  if (!columnNames.has("school_grade")) {
    await run(
      "ALTER TABLE player_series ADD COLUMN school_grade INTEGER NOT NULL DEFAULT 1 CHECK (school_grade BETWEEN 1 AND 3)"
    );
    addedColumns.push("school_grade");
  }

  if (!columnNames.has("roster_status")) {
    await run(
      "ALTER TABLE player_series ADD COLUMN roster_status TEXT NOT NULL DEFAULT 'active' CHECK (roster_status IN ('active', 'graduated'))"
    );
    addedColumns.push("roster_status");
  }

  return addedColumns;
}

async function backfillSchoolProgressionState(run) {
  await run(
    `
      UPDATE player_series
      SET
        school_grade = CASE
          WHEN (
            COALESCE(
              (SELECT schools.current_year FROM schools WHERE schools.id = player_series.school_id),
              (SELECT schools.start_year FROM schools WHERE schools.id = player_series.school_id),
              player_series.admission_year
            ) - player_series.admission_year + 1
          ) < 1 THEN 1
          WHEN (
            COALESCE(
              (SELECT schools.current_year FROM schools WHERE schools.id = player_series.school_id),
              (SELECT schools.start_year FROM schools WHERE schools.id = player_series.school_id),
              player_series.admission_year
            ) - player_series.admission_year + 1
          ) > 3 THEN 3
          ELSE (
            COALESCE(
              (SELECT schools.current_year FROM schools WHERE schools.id = player_series.school_id),
              (SELECT schools.start_year FROM schools WHERE schools.id = player_series.school_id),
              player_series.admission_year
            ) - player_series.admission_year + 1
          )
        END,
        roster_status = CASE
          WHEN (
            COALESCE(
              (SELECT schools.current_year FROM schools WHERE schools.id = player_series.school_id),
              (SELECT schools.start_year FROM schools WHERE schools.id = player_series.school_id),
              player_series.admission_year
            ) - player_series.admission_year + 1
          ) > 3 THEN 'graduated'
          ELSE 'active'
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE
        COALESCE(
          (SELECT schools.current_year FROM schools WHERE schools.id = player_series.school_id),
          (SELECT schools.start_year FROM schools WHERE schools.id = player_series.school_id),
          player_series.admission_year
        ) IS NOT NULL
        AND player_series.admission_year IS NOT NULL
    `
  );
}

async function assertSchoolProgressionBackfillComplete(get) {
  const missingState = await get(
    `
      SELECT COUNT(*) AS count
      FROM player_series
      WHERE
        school_grade IS NULL
        OR school_grade NOT BETWEEN 1 AND 3
        OR roster_status IS NULL
        OR roster_status NOT IN ('active', 'graduated')
    `
  );

  if (Number(missingState?.count ?? 0) > 0) {
    throw new Error("school progression backfill did not complete.");
  }
}

async function ensureSchoolProgressionSchema({ all, get, run, transaction }) {
  const hasSchools = await tableExists(all, "schools");
  const hasPlayerSeries = await tableExists(all, "player_series");

  if (!hasSchools || !hasPlayerSeries) {
    return;
  }

  await transaction(async () => {
    const addedColumns = await ensureSchoolProgressionColumns(all, run);

    if (addedColumns.length > 0) {
      await backfillSchoolProgressionState(run);
    }

    await assertSchoolProgressionBackfillComplete(get);
  });
}

module.exports = {
  ensureSchoolProgressionSchema,
};
