const { all, get, run } = require("../db/database");

async function findLatestUndoableBySchoolId(schoolId) {
  return get(
    `
      SELECT
        id,
        school_id,
        previous_year,
        current_year,
        snapshots_created,
        created_at
      FROM school_year_progress_logs
      WHERE
        school_id = ?
        AND is_undo_available = 1
        AND undone_at IS NULL
      ORDER BY id DESC
      LIMIT 1
    `,
    [schoolId]
  );
}

async function expireUndoableLogsBySchoolId(schoolId) {
  await run(
    `
      UPDATE school_year_progress_logs
      SET is_undo_available = 0
      WHERE
        school_id = ?
        AND is_undo_available = 1
        AND undone_at IS NULL
    `,
    [schoolId]
  );
}

async function createProgressLog({ schoolId, previousYear, currentYear, snapshotsCreated = 0 }) {
  const result = await run(
    `
      INSERT INTO school_year_progress_logs (
        school_id,
        previous_year,
        current_year,
        snapshots_created,
        is_undo_available
      )
      VALUES (?, ?, ?, ?, 1)
    `,
    [schoolId, previousYear, currentYear, snapshotsCreated]
  );

  return result.lastID;
}

async function addProgressLogPlayers(logId, playerSeriesRows) {
  for (const row of playerSeriesRows) {
    await run(
      `
        INSERT INTO school_year_progress_log_players (
          log_id,
          player_series_id,
          before_school_grade,
          before_roster_status
        )
        VALUES (?, ?, ?, ?)
      `,
      [logId, row.id, row.school_grade, row.roster_status]
    );
  }
}

async function findPlayersByLogId(logId) {
  return all(
    `
      SELECT
        log_id,
        player_series_id,
        before_school_grade,
        before_roster_status
      FROM school_year_progress_log_players
      WHERE log_id = ?
      ORDER BY id ASC
    `,
    [logId]
  );
}

async function markLogUndone(logId) {
  const result = await run(
    `
      UPDATE school_year_progress_logs
      SET
        is_undo_available = 0,
        undone_at = CURRENT_TIMESTAMP
      WHERE
        id = ?
        AND is_undo_available = 1
        AND undone_at IS NULL
    `,
    [logId]
  );

  return result.changes;
}

module.exports = {
  findLatestUndoableBySchoolId,
  expireUndoableLogsBySchoolId,
  createProgressLog,
  addProgressLogPlayers,
  findPlayersByLogId,
  markLogUndone,
};
