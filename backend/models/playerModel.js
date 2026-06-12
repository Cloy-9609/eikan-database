const { get, all, run } = require("../db/database");
const {
  SNAPSHOT_TIMELINE,
} = require("../constants/playerSnapshots");

const snapshotOrderSql = SNAPSHOT_TIMELINE.map(
  ({ value }, index) => `WHEN '${value}' THEN ${index + 1}`
).join(" ");
const officialSnapshotLabelsSql = SNAPSHOT_TIMELINE.map(({ value }) => `'${value}'`).join(", ");
const latestSnapshotJoinSql = `
  LEFT JOIN players ON players.id = (
    SELECT candidate_players.id
    FROM players AS candidate_players
    WHERE candidate_players.player_series_id = player_series.id
    ORDER BY
      CASE
        WHEN candidate_players.snapshot_label IN (${officialSnapshotLabelsSql}) THEN 0
        ELSE 1
      END ASC,
      CASE candidate_players.snapshot_label
        ${snapshotOrderSql}
        ELSE NULL
      END DESC,
      candidate_players.updated_at DESC,
      candidate_players.created_at DESC,
      candidate_players.id DESC
    LIMIT 1
  )
`;
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
  player_series.id AS player_series_id,
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

function buildPlayerSortClause(sortBy = "updated_at", sortOrder = "desc") {
  const direction = String(sortOrder).toLowerCase() === "asc" ? "ASC" : "DESC";

  if (sortBy === "name") {
    return `player_series.name ${direction}, player_series.id DESC`;
  }

  if (sortBy === "school_name") {
    return `schools.name ${direction}, player_series.name ASC, player_series.id DESC`;
  }

  if (sortBy === "admission_year") {
    return `CASE WHEN player_series.admission_year IS NULL THEN 1 ELSE 0 END ASC, player_series.admission_year ${direction}, player_series.id DESC`;
  }

  if (sortBy === "school_grade") {
    return `player_series.school_grade ${direction}, player_series.name ASC, player_series.id DESC`;
  }

  if (sortBy === "roster_status") {
    return `
      CASE player_series.roster_status
        WHEN 'active' THEN 0
        WHEN 'graduated' THEN 1
        ELSE 2
      END ${direction},
      player_series.school_grade ASC,
      player_series.name ASC,
      player_series.id DESC
    `;
  }

  if (sortBy === "snapshot") {
    return `CASE WHEN snapshot_order IS NULL THEN 1 ELSE 0 END ASC, snapshot_order ${direction}, player_series.id DESC`;
  }

  return `COALESCE(players.updated_at, player_series.updated_at) ${direction}, player_series.id DESC`;
}

function buildPlayerListQuery({
  schoolId = null,
  name = null,
  schoolName = null,
  admissionYearFrom = null,
  admissionYearTo = null,
  playerType = null,
  schoolGrade = null,
  rosterStatus = null,
  mainPosition = null,
  snapshotLabel = null,
  sortBy = "updated_at",
  sortOrder = "desc",
} = {}) {
  const conditions = ["schools.is_archived = 0"];
  const params = [];

  if (schoolId !== null && schoolId !== undefined) {
    conditions.push("player_series.school_id = ?");
    params.push(schoolId);
  }

  if (name) {
    conditions.push("player_series.name LIKE ?");
    params.push(`%${name}%`);
  }

  if (schoolName) {
    conditions.push("schools.name LIKE ?");
    params.push(`%${schoolName}%`);
  }

  if (admissionYearFrom !== null && admissionYearFrom !== undefined) {
    conditions.push("player_series.admission_year >= ?");
    params.push(admissionYearFrom);
  }

  if (admissionYearTo !== null && admissionYearTo !== undefined) {
    conditions.push("player_series.admission_year <= ?");
    params.push(admissionYearTo);
  }

  if (playerType) {
    conditions.push("player_series.player_type = ?");
    params.push(playerType);
  }

  if (schoolGrade !== null && schoolGrade !== undefined) {
    conditions.push("player_series.school_grade = ?");
    params.push(schoolGrade);
  }

  if (rosterStatus) {
    conditions.push("player_series.roster_status = ?");
    params.push(rosterStatus);
  }

  if (mainPosition === "全野手") {
    conditions.push("players.main_position <> ?");
    params.push("投手");
  } else if (mainPosition === "全内野手") {
    conditions.push("players.main_position IN (?, ?, ?, ?)");
    params.push("一塁手", "二塁手", "三塁手", "遊撃手");
  } else if (mainPosition) {
    conditions.push("players.main_position = ?");
    params.push(mainPosition);
  }

  if (snapshotLabel) {
    conditions.push("players.snapshot_label = ?");
    params.push(snapshotLabel);
  }

  const sql = `
    SELECT
      ${PLAYER_SELECT_COLUMNS}
    FROM player_series
    ${latestSnapshotJoinSql}
    INNER JOIN schools ON schools.id = player_series.school_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY ${buildPlayerSortClause(sortBy, sortOrder)}
  `;

  return { sql, params };
}

async function findAllActive(query = {}) {
  const { sql, params } = buildPlayerListQuery(query);
  return all(sql, params);
}

async function findAll() {
  return findAllActive();
}

async function findBySchoolId(schoolId) {
  const sql = `
    SELECT
      ${PLAYER_SELECT_COLUMNS}
    FROM players
    INNER JOIN player_series ON player_series.id = players.player_series_id
    INNER JOIN schools ON schools.id = player_series.school_id
    WHERE player_series.school_id = ? AND schools.is_archived = 0
    ORDER BY
      player_series.id ASC,
      CASE players.snapshot_label
        ${snapshotOrderSql}
        ELSE 999
      END ASC,
      players.id ASC
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
  findAllActive,
  findAll,
  findBySchoolId,
  findById,
  findSnapshotsBySeriesId,
  findSnapshotBySeriesIdAndLabel,
  createSnapshot,
  updateSnapshot,
};
