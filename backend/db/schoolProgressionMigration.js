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

async function ensureSchoolProgressionUndoTables(run) {
  await run(
    `
      CREATE TABLE IF NOT EXISTS school_year_progress_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        school_id INTEGER NOT NULL,
        previous_year INTEGER NOT NULL,
        current_year INTEGER NOT NULL,
        snapshots_created INTEGER NOT NULL DEFAULT 0 CHECK (snapshots_created >= 0),
        is_undo_available INTEGER NOT NULL DEFAULT 1 CHECK (is_undo_available IN (0, 1)),
        undone_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON UPDATE CASCADE ON DELETE RESTRICT
      )
    `
  );

  await run(
    `
      CREATE TABLE IF NOT EXISTS school_year_progress_log_players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        log_id INTEGER NOT NULL,
        player_series_id INTEGER NOT NULL,
        before_school_grade INTEGER NOT NULL CHECK (before_school_grade BETWEEN 1 AND 3),
        before_roster_status TEXT NOT NULL CHECK (before_roster_status IN ('active', 'graduated')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (log_id, player_series_id),
        FOREIGN KEY (log_id) REFERENCES school_year_progress_logs(id) ON UPDATE CASCADE ON DELETE CASCADE,
        FOREIGN KEY (player_series_id) REFERENCES player_series(id) ON UPDATE CASCADE ON DELETE RESTRICT
      )
    `
  );

  await run(
    `
      CREATE INDEX IF NOT EXISTS idx_school_year_progress_logs_school_undo
      ON school_year_progress_logs(school_id, is_undo_available, undone_at, id)
    `
  );

  await run(
    `
      CREATE INDEX IF NOT EXISTS idx_school_year_progress_log_players_log_id
      ON school_year_progress_log_players(log_id)
    `
  );

  await run(
    `
      CREATE INDEX IF NOT EXISTS idx_school_year_progress_log_players_player_series_id
      ON school_year_progress_log_players(player_series_id)
    `
  );
}

async function ensureSchoolProgressionSchema({ all, get, run, transaction }) {
  const hasSchools = await tableExists(all, "schools");
  const hasPlayerSeries = await tableExists(all, "player_series");

  if (!hasSchools || !hasPlayerSeries) {
    return;
  }

  await transaction(async () => {
    const addedColumns = await ensureSchoolProgressionColumns(all, run);
    await ensureSchoolProgressionUndoTables(run);

    if (addedColumns.length > 0) {
      await backfillSchoolProgressionState(run);
    }

    await assertSchoolProgressionBackfillComplete(get);
  });
}

module.exports = {
  ensureSchoolProgressionSchema,
};
