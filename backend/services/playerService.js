const playerModel = require("../models/playerModel");
const playerSeriesModel = require("../models/playerSeriesModel");
const schoolModel = require("../models/schoolModel");
const { transaction } = require("../db/database");
const { ALLOWED_PREFECTURE_VALUES } = require("../constants/prefectures");
const {
  PLAYER_POSITION_OPTIONS,
  ALLOWED_ABILITY_CATEGORIES,
  buildRelationOptionsResponse,
} = require("../constants/playerRelations");
const {
  OFFICIAL_SNAPSHOT_LABELS,
  TRANSITIONAL_SNAPSHOT_LABELS,
  SNAPSHOT_LABELS,
  isLegacySnapshotLabel,
  isOfficialSnapshotLabel,
  getSnapshotOrder,
  getSnapshotGrade,
} = require("../constants/playerSnapshots");

const ALLOWED_PLAYER_TYPES = ["normal", "genius", "reincarnated"];
// NOTE:
// Writes still accept the legacy `post_tournament` label during the transition period
// so existing clients/data can be updated without forced reclassification.
// New frontend/UI should prefer the official 9 timeline keys.
const ALLOWED_SNAPSHOT_LABELS = TRANSITIONAL_SNAPSHOT_LABELS;
const ALLOWED_THROWING_HANDS = ["right", "left"];
const ALLOWED_BATTING_HANDS = ["right", "left", "both"];
const ALLOWED_POSITIONS = PLAYER_POSITION_OPTIONS;
const ADMISSION_YEAR_MIN = 1932;
const ADMISSION_YEAR_MAX = 2039;
const REQUIRED_UPDATE_FIELDS = [
  "name",
  "player_type",
  "prefecture",
  "grade",
  "admission_year",
  "snapshot_label",
  "main_position",
  "throwing_hand",
  "batting_hand",
];
const EDITABLE_PLAYER_FIELDS = [
  "school_id",
  "name",
  "player_type",
  "player_type_note",
  "total_stars",
  "prefecture",
  "grade",
  "admission_year",
  "snapshot_label",
  "snapshot_note",
  "main_position",
  "throwing_hand",
  "batting_hand",
  "is_reincarnated",
  "is_genius",
  "velocity",
  "control",
  "stamina",
  "trajectory",
  "meat",
  "power",
  "run_speed",
  "arm_strength",
  "fielding",
  "catching",
  "evidence_image_path",
  "pitch_types",
  "special_abilities",
  "sub_positions",
];

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function assertObjectPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw createHttpError(400, "payload must be an object.");
  }

  return payload;
}

function validateUpdatePayloadFields(payload) {
  const updatePayload = assertObjectPayload(payload);

  for (const fieldName of REQUIRED_UPDATE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(updatePayload, fieldName)) {
      throw createHttpError(400, `${fieldName} is required.`);
    }
  }

  return updatePayload;
}

function pickEditablePlayerFields(player) {
  return EDITABLE_PLAYER_FIELDS.reduce((picked, fieldName) => {
    picked[fieldName] = player[fieldName];
    return picked;
  }, {});
}

function mergePlayerUpdatePayload(currentPlayer, updatePayload) {
  return {
    ...pickEditablePlayerFields(currentPlayer),
    ...updatePayload,
    school_id: currentPlayer.school_id,
    pitch_types: updatePayload.pitch_types ?? currentPlayer.pitch_types,
    special_abilities: updatePayload.special_abilities ?? currentPlayer.special_abilities,
    sub_positions: updatePayload.sub_positions ?? currentPlayer.sub_positions,
  };
}

function parseInteger(value, fieldName, { required = false, min, max } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) {
      throw createHttpError(400, `${fieldName} is required.`);
    }

    return null;
  }

  const numericValue = Number(value);

  if (!Number.isInteger(numericValue)) {
    throw createHttpError(400, `${fieldName} must be an integer.`);
  }

  if (min !== undefined && numericValue < min) {
    throw createHttpError(400, `${fieldName} must be greater than or equal to ${min}.`);
  }

  if (max !== undefined && numericValue > max) {
    throw createHttpError(400, `${fieldName} must be less than or equal to ${max}.`);
  }

  return numericValue;
}

function parseRequiredInteger(value, fieldName, options = {}) {
  return parseInteger(value, fieldName, { ...options, required: true });
}

function parseOptionalInteger(value, fieldName, { min } = {}) {
  return parseInteger(value, fieldName, { min });
}

function parseOptionalText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text === "" ? null : text;
}

function parseRequiredText(value, fieldName) {
  const text = parseOptionalText(value);

  if (!text) {
    throw createHttpError(400, `${fieldName} is required.`);
  }

  return text;
}

function parseBooleanFlag(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return 0;
  }

  if (value === true || value === 1 || value === "1") {
    return 1;
  }

  if (value === false || value === 0 || value === "0") {
    return 0;
  }

  throw createHttpError(400, `${fieldName} must be a boolean-compatible value.`);
}

function validateEnum(value, fieldName, allowedValues) {
  if (!allowedValues.includes(value)) {
    throw createHttpError(400, `${fieldName} must be one of: ${allowedValues.join(", ")}.`);
  }

  return value;
}

function validatePrefecture(value) {
  if (!ALLOWED_PREFECTURE_VALUES.includes(value)) {
    throw createHttpError(400, "prefecture must be one of the allowed prefectures or countries.");
  }

  return value;
}

function validateAdmissionYear(value) {
  const admissionYear = parseRequiredInteger(value, "admission_year");

  if (admissionYear < ADMISSION_YEAR_MIN || admissionYear > ADMISSION_YEAR_MAX) {
    throw createHttpError(
      400,
      `admission_year must be between ${ADMISSION_YEAR_MIN} and ${ADMISSION_YEAR_MAX}.`
    );
  }

  return admissionYear;
}

function deriveTypeFlags(playerType) {
  return {
    is_reincarnated: playerType === "reincarnated" ? 1 : 0,
    is_genius: playerType === "genius" ? 1 : 0,
  };
}

function resolveSnapshotGrade(value, snapshotLabel) {
  const explicitGrade = parseInteger(value, "grade", { min: 1, max: 3 });

  if (explicitGrade !== null) {
    return explicitGrade;
  }

  const derivedGrade = getSnapshotGrade(snapshotLabel);

  if (derivedGrade !== null) {
    return derivedGrade;
  }

  throw createHttpError(400, "grade is required.");
}

function buildSeriesPayload(validatedPayload, { note = null } = {}) {
  return {
    school_id: validatedPayload.school_id,
    name: validatedPayload.name,
    player_type: validatedPayload.player_type,
    player_type_note: validatedPayload.player_type_note,
    prefecture: validatedPayload.prefecture,
    admission_year: validatedPayload.admission_year,
    throwing_hand: validatedPayload.throwing_hand,
    batting_hand: validatedPayload.batting_hand,
    note: parseOptionalText(note),
  };
}

function buildSnapshotRecord(playerSeriesId, validatedPayload) {
  return {
    ...validatedPayload,
    player_series_id: playerSeriesId,
  };
}

function clonePitchTypes(items = []) {
  return items.map((item) => ({
    pitch_name: item.pitch_name,
    level: item.level,
    is_original: item.is_original,
    original_pitch_name: item.original_pitch_name,
  }));
}

function cloneSpecialAbilities(items = []) {
  return items.map((item) => ({
    ability_name: item.ability_name,
    ability_category: item.ability_category,
    rank_value: item.rank_value,
  }));
}

function cloneSubPositions(items = []) {
  return items.map((item) => ({
    position_name: item.position_name,
    suitability_value: item.suitability_value,
  }));
}

function buildSnapshotSeedFromPrevious(previousSnapshot, snapshotLabel) {
  if (!previousSnapshot) {
    return {
      grade: getSnapshotGrade(snapshotLabel),
      snapshot_label: snapshotLabel,
      snapshot_note: null,
      main_position: null,
      total_stars: 0,
      evidence_image_path: null,
      pitch_types: [],
      special_abilities: [],
      sub_positions: [],
    };
  }

  return {
    grade: getSnapshotGrade(snapshotLabel) ?? previousSnapshot.grade,
    snapshot_label: snapshotLabel,
    snapshot_note: null,
    main_position: previousSnapshot.main_position,
    total_stars: previousSnapshot.total_stars,
    velocity: previousSnapshot.velocity,
    control: previousSnapshot.control,
    stamina: previousSnapshot.stamina,
    trajectory: previousSnapshot.trajectory,
    meat: previousSnapshot.meat,
    power: previousSnapshot.power,
    run_speed: previousSnapshot.run_speed,
    arm_strength: previousSnapshot.arm_strength,
    fielding: previousSnapshot.fielding,
    catching: previousSnapshot.catching,
    evidence_image_path: null,
    pitch_types: clonePitchTypes(previousSnapshot.pitch_types),
    special_abilities: cloneSpecialAbilities(previousSnapshot.special_abilities),
    sub_positions: cloneSubPositions(previousSnapshot.sub_positions),
  };
}

function buildSnapshotSummary(snapshot) {
  return {
    id: snapshot.id,
    player_series_id: snapshot.player_series_id,
    snapshot_label: snapshot.snapshot_label,
    snapshot_label_display: SNAPSHOT_LABELS[snapshot.snapshot_label] ?? snapshot.snapshot_label,
    snapshot_order: getSnapshotOrder(snapshot.snapshot_label),
    grade: snapshot.grade,
    main_position: snapshot.main_position,
    total_stars: snapshot.total_stars,
    created_at: snapshot.created_at,
    updated_at: snapshot.updated_at,
    is_legacy_snapshot_label: isLegacySnapshotLabel(snapshot.snapshot_label),
    is_official_snapshot_label: isOfficialSnapshotLabel(snapshot.snapshot_label),
  };
}

function selectLatestSnapshotFallback(snapshots) {
  return [...snapshots].sort((left, right) => {
    const leftTime = new Date(left.updated_at || left.created_at || 0).getTime();
    const rightTime = new Date(right.updated_at || right.created_at || 0).getTime();

    if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }

    return Number(right.id) - Number(left.id);
  })[0] ?? null;
}

function findNearestPreviousSnapshotSummary(snapshots, snapshotLabel) {
  const targetOrder = getSnapshotOrder(snapshotLabel);

  if (targetOrder === null) {
    return selectLatestSnapshotFallback(snapshots);
  }

  const orderedOfficialSnapshots = snapshots
    .filter((snapshot) => getSnapshotOrder(snapshot.snapshot_label) !== null)
    .sort((left, right) => getSnapshotOrder(left.snapshot_label) - getSnapshotOrder(right.snapshot_label));

  for (let index = orderedOfficialSnapshots.length - 1; index >= 0; index -= 1) {
    const candidate = orderedOfficialSnapshots[index];

    if (getSnapshotOrder(candidate.snapshot_label) < targetOrder) {
      return candidate;
    }
  }

  return selectLatestSnapshotFallback(snapshots);
}

function validatePitchTypes(items) {
  if (items === undefined || items === null) {
    return [];
  }

  if (!Array.isArray(items)) {
    throw createHttpError(400, "pitch_types must be an array.");
  }

  return items.map((item, index) => ({
    pitch_name: parseRequiredText(item.pitch_name, `pitch_types[${index}].pitch_name`),
    level: parseRequiredInteger(item.level, `pitch_types[${index}].level`, { min: 1 }),
    is_original: parseBooleanFlag(item.is_original, `pitch_types[${index}].is_original`),
    original_pitch_name: parseOptionalText(item.original_pitch_name),
  }));
}

function validateSpecialAbilities(items) {
  if (items === undefined || items === null) {
    return [];
  }

  if (!Array.isArray(items)) {
    throw createHttpError(400, "special_abilities must be an array.");
  }

  return items.map((item, index) => ({
    ability_name: parseRequiredText(item.ability_name, `special_abilities[${index}].ability_name`),
    ability_category: validateEnum(
      parseRequiredText(item.ability_category, `special_abilities[${index}].ability_category`),
      `special_abilities[${index}].ability_category`,
      ALLOWED_ABILITY_CATEGORIES
    ),
    rank_value: parseOptionalText(item.rank_value),
  }));
}

function validateSubPositions(items) {
  if (items === undefined || items === null) {
    return [];
  }

  if (!Array.isArray(items)) {
    throw createHttpError(400, "sub_positions must be an array.");
  }

  return items.map((item, index) => ({
    position_name: validateEnum(
      parseRequiredText(item.position_name, `sub_positions[${index}].position_name`),
      `sub_positions[${index}].position_name`,
      ALLOWED_POSITIONS
    ),
    suitability_value: parseRequiredText(
      item.suitability_value,
      `sub_positions[${index}].suitability_value`
    ),
  }));
}

function validatePlayerPayload(payload = {}) {
  payload = assertObjectPayload(payload);

  const schoolId = parseRequiredInteger(payload.school_id, "school_id", { min: 1 });
  const name = parseRequiredText(payload.name, "name");
  const playerType = validateEnum(
    parseRequiredText(payload.player_type, "player_type"),
    "player_type",
    ALLOWED_PLAYER_TYPES
  );
  const snapshotLabel = validateEnum(
    parseRequiredText(payload.snapshot_label, "snapshot_label"),
    "snapshot_label",
    ALLOWED_SNAPSHOT_LABELS
  );
  const throwingHand = validateEnum(
    parseRequiredText(payload.throwing_hand, "throwing_hand"),
    "throwing_hand",
    ALLOWED_THROWING_HANDS
  );
  const battingHand = validateEnum(
    parseRequiredText(payload.batting_hand, "batting_hand"),
    "batting_hand",
    ALLOWED_BATTING_HANDS
  );
  const mainPosition = validateEnum(
    parseRequiredText(payload.main_position, "main_position"),
    "main_position",
    ALLOWED_POSITIONS
  );
  const typeFlags = deriveTypeFlags(playerType);

  return {
    school_id: schoolId,
    name,
    player_type: playerType,
    player_type_note: parseOptionalText(payload.player_type_note),
    total_stars: parseOptionalInteger(payload.total_stars, "total_stars", { min: 0 }) ?? 0,
    prefecture: validatePrefecture(parseRequiredText(payload.prefecture, "prefecture")),
    grade: resolveSnapshotGrade(payload.grade, snapshotLabel),
    admission_year: validateAdmissionYear(payload.admission_year),
    snapshot_label: snapshotLabel,
    snapshot_note: parseOptionalText(payload.snapshot_note),
    main_position: mainPosition,
    throwing_hand: throwingHand,
    batting_hand: battingHand,
    is_reincarnated:
      payload.is_reincarnated === undefined
        ? typeFlags.is_reincarnated
        : parseBooleanFlag(payload.is_reincarnated, "is_reincarnated"),
    is_genius:
      payload.is_genius === undefined
        ? typeFlags.is_genius
        : parseBooleanFlag(payload.is_genius, "is_genius"),
    velocity: parseOptionalInteger(payload.velocity, "velocity", { min: 0 }),
    control: parseOptionalInteger(payload.control, "control", { min: 0 }),
    stamina: parseOptionalInteger(payload.stamina, "stamina", { min: 0 }),
    trajectory: parseOptionalInteger(payload.trajectory, "trajectory", { min: 0 }),
    meat: parseOptionalInteger(payload.meat, "meat", { min: 0 }),
    power: parseOptionalInteger(payload.power, "power", { min: 0 }),
    run_speed: parseOptionalInteger(payload.run_speed, "run_speed", { min: 0 }),
    arm_strength: parseOptionalInteger(payload.arm_strength, "arm_strength", { min: 0 }),
    fielding: parseOptionalInteger(payload.fielding, "fielding", { min: 0 }),
    catching: parseOptionalInteger(payload.catching, "catching", { min: 0 }),
    evidence_image_path: parseOptionalText(payload.evidence_image_path),
    pitch_types: validatePitchTypes(payload.pitch_types),
    special_abilities: validateSpecialAbilities(payload.special_abilities),
    sub_positions: validateSubPositions(payload.sub_positions),
  };
}

async function assertActiveSchool(schoolId) {
  const school = await schoolModel.findById(schoolId);

  if (!school || school.is_archived === 1) {
    throw createHttpError(400, "school_id must reference an active school.");
  }

  return school;
}

function mapSqliteConstraintError(error) {
  if (
    error &&
    error.code === "SQLITE_CONSTRAINT" &&
    (String(error.message).includes("idx_players_series_snapshot_unique") ||
      String(error.message).includes("players.player_series_id, players.snapshot_label"))
  ) {
    throw createHttpError(409, "This snapshot_label already exists in the selected player_series.");
  }

  throw error;
}

function buildPlayerSeriesResponse(playerSeries, snapshots, currentSnapshot) {
  return {
    playerSeries: {
      ...playerSeries,
      has_legacy_snapshot_labels: snapshots.some((snapshot) =>
        isLegacySnapshotLabel(snapshot.snapshot_label)
      ),
    },
    snapshots: snapshots.map((snapshot) => buildSnapshotSummary(snapshot)),
    currentSnapshot: currentSnapshot
      ? {
          ...currentSnapshot,
          snapshot_label_display:
            SNAPSHOT_LABELS[currentSnapshot.snapshot_label] ?? currentSnapshot.snapshot_label,
          is_legacy_snapshot_label: isLegacySnapshotLabel(currentSnapshot.snapshot_label),
          is_official_snapshot_label: isOfficialSnapshotLabel(currentSnapshot.snapshot_label),
        }
      : null,
  };
}

async function createPlayer(payload) {
  const validatedPayload = validatePlayerPayload(payload);
  const seriesPayload = buildSeriesPayload(validatedPayload, { note: payload?.note });
  seriesPayload.school_grade = validatedPayload.grade;
  seriesPayload.roster_status = "active";

  await assertActiveSchool(validatedPayload.school_id);

  try {
    const createdPlayerId = await transaction(async () => {
      const playerSeriesId = await playerSeriesModel.createPlayerSeries(seriesPayload);
      const snapshotRecord = buildSnapshotRecord(playerSeriesId, validatedPayload);
      return playerModel.createSnapshot(snapshotRecord);
    });

    return playerModel.findById(createdPlayerId);
  } catch (error) {
    return mapSqliteConstraintError(error);
  }
}

async function addSnapshotToSeries(seriesId, payload = {}) {
  const playerSeriesId = parseRequiredInteger(seriesId, "player_series id", { min: 1 });
  payload = assertObjectPayload(payload);

  const playerSeries = await playerSeriesModel.findById(playerSeriesId);

  if (!playerSeries) {
    throw createHttpError(404, "Player series not found.");
  }

  const requestedSnapshotLabel = validateEnum(
    parseRequiredText(payload.snapshot_label, "snapshot_label"),
    "snapshot_label",
    ALLOWED_SNAPSHOT_LABELS
  );
  const snapshots = await playerModel.findSnapshotsBySeriesId(playerSeriesId);

  if (snapshots.some((snapshot) => snapshot.snapshot_label === requestedSnapshotLabel)) {
    throw createHttpError(409, "This snapshot_label already exists in the selected player_series.");
  }

  const previousSnapshotSummary = findNearestPreviousSnapshotSummary(snapshots, requestedSnapshotLabel);
  const previousSnapshot = previousSnapshotSummary
    ? await playerModel.findById(previousSnapshotSummary.id)
    : null;
  const seededPayload = buildSnapshotSeedFromPrevious(previousSnapshot, requestedSnapshotLabel);
  const validatedPayload = validatePlayerPayload({
    school_id: playerSeries.school_id,
    name: playerSeries.name,
    player_type: playerSeries.player_type,
    player_type_note: playerSeries.player_type_note,
    prefecture: playerSeries.prefecture,
    admission_year: playerSeries.admission_year,
    throwing_hand: playerSeries.throwing_hand,
    batting_hand: playerSeries.batting_hand,
    ...seededPayload,
    ...payload,
    snapshot_label: requestedSnapshotLabel,
  });

  try {
    const createdSnapshotId = await transaction(async () => {
      const snapshotRecord = buildSnapshotRecord(playerSeriesId, validatedPayload);
      return playerModel.createSnapshot(snapshotRecord);
    });

    return playerModel.findById(createdSnapshotId);
  } catch (error) {
    return mapSqliteConstraintError(error);
  }
}

async function updatePlayer(id, payload) {
  const playerId = parseRequiredInteger(id, "player id", { min: 1 });
  const updatePayload = validateUpdatePayloadFields(payload);
  const currentPlayer = await playerModel.findById(playerId);

  if (!currentPlayer) {
    throw createHttpError(404, "Player not found.");
  }

  const currentSeries = await playerSeriesModel.findById(currentPlayer.player_series_id);

  if (!currentSeries) {
    throw createHttpError(404, "Player series not found.");
  }

  const mergedPayload = mergePlayerUpdatePayload(currentPlayer, updatePayload);
  const validatedPayload = validatePlayerPayload(mergedPayload);
  const seriesPayload = buildSeriesPayload(validatedPayload, { note: currentSeries.note });

  await assertActiveSchool(validatedPayload.school_id);

  try {
    const updatedPlayerId = await transaction(async () => {
      await playerSeriesModel.updatePlayerSeries(currentSeries.id, seriesPayload);
      await playerSeriesModel.syncSnapshotsWithSeries(currentSeries.id, seriesPayload);
      const snapshotRecord = buildSnapshotRecord(currentSeries.id, validatedPayload);
      return playerModel.updateSnapshot(playerId, snapshotRecord);
    });

    if (!updatedPlayerId) {
      throw createHttpError(404, "Player not found.");
    }

    return playerModel.findById(updatedPlayerId);
  } catch (error) {
    return mapSqliteConstraintError(error);
  }
}

async function getPlayerById(id) {
  const playerId = parseRequiredInteger(id, "player id", { min: 1 });
  const player = await playerModel.findById(playerId);

  if (!player) {
    throw createHttpError(404, "Player not found.");
  }

  return player;
}

async function getPlayers(query = {}) {
  const schoolId = parseInteger(query.school_id, "school_id", { min: 1 });

  if (schoolId !== null) {
    const school = await schoolModel.findById(schoolId);

    if (!school || school.is_archived === 1) {
      throw createHttpError(404, "School not found.");
    }

    return playerModel.findBySchoolId(schoolId);
  }

  return playerModel.findAll();
}

async function getPlayerSeriesById(id, query = {}) {
  const playerSeriesId = parseRequiredInteger(id, "player_series id", { min: 1 });
  const playerSeries = await playerSeriesModel.findById(playerSeriesId);

  if (!playerSeries) {
    throw createHttpError(404, "Player series not found.");
  }

  const snapshots = await playerModel.findSnapshotsBySeriesId(playerSeriesId);
  const requestedSnapshotLabel =
    query.snapshot === undefined || query.snapshot === null || query.snapshot === ""
      ? null
      : validateEnum(parseRequiredText(query.snapshot, "snapshot"), "snapshot", ALLOWED_SNAPSHOT_LABELS);

  let currentSnapshotSummary;

  if (requestedSnapshotLabel) {
    currentSnapshotSummary = snapshots.find(
      (snapshot) => snapshot.snapshot_label === requestedSnapshotLabel
    );

    if (!currentSnapshotSummary) {
      throw createHttpError(404, "Requested snapshot was not found.");
    }
  } else {
    const officialSnapshots = snapshots.filter((snapshot) =>
      isOfficialSnapshotLabel(snapshot.snapshot_label)
    );

    currentSnapshotSummary =
      officialSnapshots.length > 0
        ? officialSnapshots.sort(
            (left, right) =>
              getSnapshotOrder(right.snapshot_label) - getSnapshotOrder(left.snapshot_label)
          )[0]
        : selectLatestSnapshotFallback(snapshots);
  }

  const currentSnapshot = currentSnapshotSummary
    ? await playerModel.findById(currentSnapshotSummary.id)
    : null;

  return buildPlayerSeriesResponse(playerSeries, snapshots, currentSnapshot);
}

async function getPlayerDetailByPlayerId(id, query = {}) {
  const player = await getPlayerById(id);
  return getPlayerSeriesById(player.player_series_id, query);
}

function getPlayerRelationOptions() {
  return buildRelationOptionsResponse();
}

module.exports = {
  getPlayers,
  getPlayerById,
  getPlayerRelationOptions,
  getPlayerDetailByPlayerId,
  getPlayerSeriesById,
  createPlayer,
  addSnapshotToSeries,
  updatePlayer,
};
