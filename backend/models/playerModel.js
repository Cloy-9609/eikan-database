const { get, all, run } = require("../db/database");
const {
  SNAPSHOT_TIMELINE,
} = require("../constants/playerSnapshots");

const snapshotOrderSql = SNAPSHOT_TIMELINE.map(
  ({ value }, index) => `WHEN '${value}' THEN ${index + 1}`
).join(" ");
const defenseRankSql = `
  CASE
    WHEN defense_value BETWEEN 90 AND 100 THEN 'S'
    WHEN defense_value BETWEEN 80 AND 89 THEN 'A'
    WHEN defense_value BETWEEN 70 AND 79 THEN 'B'
    WHEN defense_value BETWEEN 60 AND 69 THEN 'C'
    WHEN defense_value BETWEEN 50 AND 59 THEN 'D'
    WHEN defense_value BETWEEN 40 AND 49 THEN 'E'
    WHEN defense_value BETWEEN 20 AND 39 THEN 'F'
    WHEN defense_value BETWEEN 1 AND 19 THEN 'G'
    ELSE NULL
  END
`;

const PLAYER_SELECT_COLUMNS = `
  players.id,
  players.player_series_id,
  player_series.school_id AS school_id,
  schools.school_code AS school_code,
  schools.current_year AS school_current_year,
  player_series.series_no AS series_no,
  player_series.school_grade AS school_grade,
  player_series.roster_status AS roster_status,
  player_series.name AS name,
  player_series.player_type AS player_type,
  player_series.player_type_note AS player_type_note,
  players.total_stars,
  player_series.prefecture AS prefecture,
  players.grade,
  player_series.admission_year AS admission_year,
  players.snapshot_label,
  players.snapshot_note,
  players.main_position,
  player_series.throwing_hand AS throwing_hand,
  player_series.batting_hand AS batting_hand,
  players.is_reincarnated,
  players.is_genius,
  players.velocity,
  players.control,
  players.stamina,
  players.trajectory,
  players.meat,
  players.power,
  players.run_speed,
  players.arm_strength,
  players.fielding,
  players.catching,
  players.evidence_image_path,
  players.created_at,
  players.updated_at,
  player_series.note AS player_series_note,
  player_series.created_at AS player_series_created_at,
  player_series.updated_at AS player_series_updated_at,
  schools.name AS school_name,
  schools.is_archived AS school_is_archived,
  CASE players.snapshot_label
    ${snapshotOrderSql}
    ELSE NULL
  END AS snapshot_order
`;

async function getRelationsByPlayerId(playerId) {
  const [pitchTypes, specialAbilities, subPositions] = await Promise.all([
    all(
      `
        SELECT
          id,
          player_id,
          pitch_name,
          level,
          is_original,
          original_pitch_name,
          created_at,
          updated_at
        FROM player_pitch_types
        WHERE player_id = ?
        ORDER BY id ASC
      `,
      [playerId]
    ),
    all(
      `
        SELECT
          id,
          player_id,
          ability_name,
          ability_category,
          rank_value,
          created_at,
          updated_at
        FROM player_special_abilities
        WHERE player_id = ?
        ORDER BY id ASC
      `,
      [playerId]
    ),
    all(
      `
        SELECT
          id,
          player_id,
          position_name,
          suitability_value,
          defense_value,
          ${defenseRankSql} AS defense_rank,
          created_at,
          updated_at
        FROM player_sub_positions
        WHERE player_id = ?
        ORDER BY id ASC
      `,
      [playerId]
    ),
  ]);

  return {
    pitch_types: pitchTypes,
    special_abilities: specialAbilities,
    sub_positions: subPositions,
  };
}

async function attachRelations(player) {
  if (!player) {
    return null;
  }

  const relations = await getRelationsByPlayerId(player.id);

  return {
    ...player,
    ...relations,
  };
}

async function findAll() {
  const sql = `
    SELECT
      ${PLAYER_SELECT_COLUMNS}
    FROM players
    INNER JOIN player_series ON player_series.id = players.player_series_id
    INNER JOIN schools ON schools.id = player_series.school_id
    WHERE schools.is_archived = 0
    ORDER BY players.id DESC
  `;

  return all(sql);
}

async function findBySchoolId(schoolId) {
  const sql = `
    SELECT
      ${PLAYER_SELECT_COLUMNS}
    FROM players
    INNER JOIN player_series ON player_series.id = players.player_series_id
    INNER JOIN schools ON schools.id = player_series.school_id
    WHERE player_series.school_id = ? AND schools.is_archived = 0
    ORDER BY players.id DESC
  `;

  return all(sql, [schoolId]);
}

async function findById(id) {
  const playerSql = `
    SELECT
      ${PLAYER_SELECT_COLUMNS}
    FROM players
    INNER JOIN player_series ON player_series.id = players.player_series_id
    INNER JOIN schools ON schools.id = player_series.school_id
    WHERE players.id = ?
  `;

  const player = await get(playerSql, [id]);
  return attachRelations(player);
}

async function findSnapshotsBySeriesId(playerSeriesId) {
  const sql = `
    SELECT
      ${PLAYER_SELECT_COLUMNS}
    FROM players
    INNER JOIN player_series ON player_series.id = players.player_series_id
    INNER JOIN schools ON schools.id = player_series.school_id
    WHERE players.player_series_id = ?
    ORDER BY
      CASE players.snapshot_label
        ${snapshotOrderSql}
        ELSE 999
      END ASC,
      players.id ASC
  `;

  return all(sql, [playerSeriesId]);
}

async function findSnapshotBySeriesIdAndLabel(playerSeriesId, snapshotLabel) {
  const sql = `
    SELECT
      ${PLAYER_SELECT_COLUMNS}
    FROM players
    INNER JOIN player_series ON player_series.id = players.player_series_id
    INNER JOIN schools ON schools.id = player_series.school_id
    WHERE players.player_series_id = ? AND players.snapshot_label = ?
  `;

  const player = await get(sql, [playerSeriesId, snapshotLabel]);
  return attachRelations(player);
}

async function insertPlayerRelations(playerId, player) {
  for (const pitchType of player.pitch_types) {
    await run(
      `
        INSERT INTO player_pitch_types (
          player_id,
          pitch_name,
          level,
          is_original,
          original_pitch_name
        ) VALUES (?, ?, ?, ?, ?)
      `,
      [
        playerId,
        pitchType.pitch_name,
        pitchType.level,
        pitchType.is_original,
        pitchType.original_pitch_name,
      ]
    );
  }

  for (const ability of player.special_abilities) {
    await run(
      `
        INSERT INTO player_special_abilities (
          player_id,
          ability_name,
          ability_category,
          rank_value
        ) VALUES (?, ?, ?, ?)
      `,
      [playerId, ability.ability_name, ability.ability_category, ability.rank_value]
    );
  }

  for (const subPosition of player.sub_positions) {
    await run(
      `
        INSERT INTO player_sub_positions (
          player_id,
          position_name,
          suitability_value,
          defense_value
        ) VALUES (?, ?, ?, ?)
      `,
      [
        playerId,
        subPosition.position_name,
        subPosition.suitability_value,
        subPosition.defense_value,
      ]
    );
  }
}

async function deletePlayerRelations(playerId) {
  await run("DELETE FROM player_pitch_types WHERE player_id = ?", [playerId]);
  await run("DELETE FROM player_special_abilities WHERE player_id = ?", [playerId]);
  await run("DELETE FROM player_sub_positions WHERE player_id = ?", [playerId]);
}

async function createSnapshot(player) {
  const playerInsertSql = `
    INSERT INTO players (
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
      evidence_image_path
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const playerResult = await run(playerInsertSql, [
    player.player_series_id,
    player.school_id,
    player.name,
    player.player_type,
    player.player_type_note,
    player.total_stars,
    player.prefecture,
    player.grade,
    player.admission_year,
    player.snapshot_label,
    player.snapshot_note,
    player.main_position,
    player.throwing_hand,
    player.batting_hand,
    player.is_reincarnated,
    player.is_genius,
    player.velocity,
    player.control,
    player.stamina,
    player.trajectory,
    player.meat,
    player.power,
    player.run_speed,
    player.arm_strength,
    player.fielding,
    player.catching,
    player.evidence_image_path,
  ]);

  const createdPlayerId = playerResult.lastID;
  await insertPlayerRelations(createdPlayerId, player);
  return createdPlayerId;
}

async function updateSnapshot(playerId, player) {
  const result = await run(
    `
      UPDATE players
      SET
        player_series_id = ?,
        school_id = ?,
        name = ?,
        player_type = ?,
        player_type_note = ?,
        total_stars = ?,
        prefecture = ?,
        grade = ?,
        admission_year = ?,
        snapshot_label = ?,
        snapshot_note = ?,
        main_position = ?,
        throwing_hand = ?,
        batting_hand = ?,
        is_reincarnated = ?,
        is_genius = ?,
        velocity = ?,
        control = ?,
        stamina = ?,
        trajectory = ?,
        meat = ?,
        power = ?,
        run_speed = ?,
        arm_strength = ?,
        fielding = ?,
        catching = ?,
        evidence_image_path = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [
      player.player_series_id,
      player.school_id,
      player.name,
      player.player_type,
      player.player_type_note,
      player.total_stars,
      player.prefecture,
      player.grade,
      player.admission_year,
      player.snapshot_label,
      player.snapshot_note,
      player.main_position,
      player.throwing_hand,
      player.batting_hand,
      player.is_reincarnated,
      player.is_genius,
      player.velocity,
      player.control,
      player.stamina,
      player.trajectory,
      player.meat,
      player.power,
      player.run_speed,
      player.arm_strength,
      player.fielding,
      player.catching,
      player.evidence_image_path,
      playerId,
    ]
  );

  if (result.changes === 0) {
    return null;
  }

  await deletePlayerRelations(playerId);
  await insertPlayerRelations(playerId, player);

  return playerId;
}

module.exports = {
  findAll,
  findBySchoolId,
  findById,
  findSnapshotsBySeriesId,
  findSnapshotBySeriesIdAndLabel,
  createSnapshot,
  updateSnapshot,
};
