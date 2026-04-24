const { all, get, run } = require("../db/database");
const { resolveNextSeriesNo } = require("../helpers/managementCodes");

const PLAYER_SERIES_SELECT_COLUMNS = `
  player_series.id,
  player_series.school_id,
  player_series.series_no,
  player_series.name,
  player_series.prefecture,
  player_series.player_type,
  player_series.player_type_note,
  player_series.admission_year,
  player_series.throwing_hand,
  player_series.batting_hand,
  player_series.note,
  player_series.created_at,
  player_series.updated_at,
  schools.school_code AS school_code,
  schools.name AS school_name,
  schools.is_archived AS school_is_archived
`;

async function getNextSeriesNoBySchoolId(schoolId) {
  const rows = await all(
    `
      SELECT series_no
      FROM player_series
      WHERE school_id = ? AND series_no IS NOT NULL
      ORDER BY series_no ASC
    `,
    [schoolId]
  );

  return resolveNextSeriesNo(rows.map((row) => row.series_no));
}

async function findById(id) {
  const sql = `
    SELECT
      ${PLAYER_SERIES_SELECT_COLUMNS}
    FROM player_series
    INNER JOIN schools ON schools.id = player_series.school_id
    WHERE player_series.id = ?
  `;

  return get(sql, [id]);
}

async function createPlayerSeries(series, options = {}) {
  const useExplicitId = options.id !== undefined && options.id !== null;
  const columns = [];
  const values = [];

  if (useExplicitId) {
    columns.push("id");
    values.push(options.id);
  }

  columns.push(
    "school_id",
    "series_no",
    "name",
    "prefecture",
    "player_type",
    "player_type_note",
    "admission_year",
    "throwing_hand",
    "batting_hand",
    "note"
  );
  const seriesNo = series.series_no ?? (await getNextSeriesNoBySchoolId(series.school_id));
  values.push(
    series.school_id,
    seriesNo,
    series.name,
    series.prefecture,
    series.player_type,
    series.player_type_note,
    series.admission_year,
    series.throwing_hand,
    series.batting_hand,
    series.note
  );
  const placeholders = columns.map(() => "?").join(", ");

  const result = await run(
    `
      INSERT INTO player_series (
        ${columns.join(", ")}
      ) VALUES (${placeholders})
    `,
    values
  );

  return useExplicitId ? options.id : result.lastID;
}

async function updatePlayerSeries(seriesId, series) {
  await run(
    `
      UPDATE player_series
      SET
        school_id = ?,
        name = ?,
        prefecture = ?,
        player_type = ?,
        player_type_note = ?,
        admission_year = ?,
        throwing_hand = ?,
        batting_hand = ?,
        note = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [
      series.school_id,
      series.name,
      series.prefecture,
      series.player_type,
      series.player_type_note,
      series.admission_year,
      series.throwing_hand,
      series.batting_hand,
      series.note,
      seriesId,
    ]
  );
}

async function syncSnapshotsWithSeries(seriesId, series) {
  await run(
    `
      UPDATE players
      SET
        school_id = ?,
        name = ?,
        player_type = ?,
        player_type_note = ?,
        prefecture = ?,
        admission_year = ?,
        throwing_hand = ?,
        batting_hand = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE player_series_id = ?
    `,
    [
      series.school_id,
      series.name,
      series.player_type,
      series.player_type_note,
      series.prefecture,
      series.admission_year,
      series.throwing_hand,
      series.batting_hand,
      seriesId,
    ]
  );
}

module.exports = {
  findById,
  getNextSeriesNoBySchoolId,
  createPlayerSeries,
  updatePlayerSeries,
  syncSnapshotsWithSeries,
};
