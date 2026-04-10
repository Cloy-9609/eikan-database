const { get, all, run, transaction } = require("../db/database");

const PLAYER_SELECT_COLUMNS = `
  id,
  school_id,
  name,
  player_type,
  player_type_note,
  total_stars,
  prefecture,
  grade,
  admission_year,
  snapshot_label,
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
`;

async function findAll() {
  const sql = `
    SELECT
      ${PLAYER_SELECT_COLUMNS}
    FROM players
    ORDER BY id DESC
  `;

  return all(sql);
}

async function findBySchoolId(schoolId) {
  const sql = `
    SELECT
      ${PLAYER_SELECT_COLUMNS}
    FROM players
    WHERE school_id = ?
    ORDER BY id DESC
  `;

  return all(sql, [schoolId]);
}

async function findById(id) {
  const playerSql = `
    SELECT
      ${PLAYER_SELECT_COLUMNS}
    FROM players
    WHERE id = ?
  `;

  const player = await get(playerSql, [id]);

  if (!player) {
    return null;
  }

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
      [id]
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
      [id]
    ),
    all(
      `
        SELECT
          id,
          player_id,
          position_name,
          suitability_value,
          created_at,
          updated_at
        FROM player_sub_positions
        WHERE player_id = ?
        ORDER BY id ASC
      `,
      [id]
    ),
  ]);

  return {
    ...player,
    pitch_types: pitchTypes,
    special_abilities: specialAbilities,
    sub_positions: subPositions,
  };
}

async function createPlayer(player) {
  const playerId = await transaction(async () => {
    const playerInsertSql = `
      INSERT INTO players (
        school_id,
        name,
        player_type,
        player_type_note,
        total_stars,
        prefecture,
        grade,
        admission_year,
        snapshot_label,
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const playerResult = await run(playerInsertSql, [
      player.school_id,
      player.name,
      player.player_type,
      player.player_type_note,
      player.total_stars,
      player.prefecture,
      player.grade,
      player.admission_year,
      player.snapshot_label,
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
  });

  return findById(playerId);
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
      [
        playerId,
        ability.ability_name,
        ability.ability_category,
        ability.rank_value,
      ]
    );
  }

  for (const subPosition of player.sub_positions) {
    await run(
      `
        INSERT INTO player_sub_positions (
          player_id,
          position_name,
          suitability_value
        ) VALUES (?, ?, ?)
      `,
      [
        playerId,
        subPosition.position_name,
        subPosition.suitability_value,
      ]
    );
  }
}

async function updatePlayer(playerId, player) {
  const updatedPlayerId = await transaction(async () => {
    const playerUpdateSql = `
      UPDATE players
      SET
        school_id = ?,
        name = ?,
        player_type = ?,
        player_type_note = ?,
        total_stars = ?,
        prefecture = ?,
        grade = ?,
        admission_year = ?,
        snapshot_label = ?,
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
    `;

    const result = await run(playerUpdateSql, [
      player.school_id,
      player.name,
      player.player_type,
      player.player_type_note,
      player.total_stars,
      player.prefecture,
      player.grade,
      player.admission_year,
      player.snapshot_label,
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
    ]);

    if (result.changes === 0) {
      return null;
    }

    await run("DELETE FROM player_pitch_types WHERE player_id = ?", [playerId]);
    await run("DELETE FROM player_special_abilities WHERE player_id = ?", [playerId]);
    await run("DELETE FROM player_sub_positions WHERE player_id = ?", [playerId]);
    await insertPlayerRelations(playerId, player);

    return playerId;
  });

  if (updatedPlayerId === null) {
    return null;
  }

  return findById(updatedPlayerId);
}

module.exports = {
  findAll,
  findBySchoolId,
  findById,
  createPlayer,
  updatePlayer,
};
