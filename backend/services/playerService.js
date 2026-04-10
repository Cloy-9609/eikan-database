const playerModel = require("../models/playerModel");
const schoolModel = require("../models/schoolModel");

const ALLOWED_PLAYER_TYPES = ["normal", "genius", "reincarnated"];
const ALLOWED_SNAPSHOT_LABELS = ["entrance", "post_tournament"];
const ALLOWED_THROWING_HANDS = ["right", "left"];
const ALLOWED_BATTING_HANDS = ["right", "left", "both"];
const ALLOWED_POSITIONS = [
  "投手",
  "捕手",
  "一塁手",
  "二塁手",
  "三塁手",
  "遊撃手",
  "外野手",
];
const ALLOWED_PREFECTURES = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
];
const ALLOWED_COUNTRIES = [
  "アメリカ",
  "ドミニカ共和国",
  "ベネズエラ",
  "キューバ",
  "メキシコ",
  "カナダ",
  "プエルトリコ",
  "コロンビア",
  "パナマ",
  "オランダ",
  "韓国",
  "台湾",
  "中国",
  "オーストラリア",
  "その他",
];
const ALLOWED_PREFECTURE_VALUES = [...ALLOWED_PREFECTURES, ...ALLOWED_COUNTRIES];
const ADMISSION_YEAR_MIN = 1948;
const ADMISSION_YEAR_MAX = 2126;
const ALLOWED_ABILITY_CATEGORIES = [
  "pitcher_ranked",
  "pitcher_unranked",
  "batter_ranked",
  "batter_unranked",
  "green",
];
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

  return {
    school_id: schoolId,
    name,
    player_type: playerType,
    player_type_note: parseOptionalText(payload.player_type_note),
    total_stars: parseOptionalInteger(payload.total_stars, "total_stars", { min: 0 }) ?? 0,
    prefecture: validatePrefecture(parseRequiredText(payload.prefecture, "prefecture")),
    grade: parseRequiredInteger(payload.grade, "grade", { min: 1, max: 3 }),
    admission_year: validateAdmissionYear(payload.admission_year),
    snapshot_label: snapshotLabel,
    main_position: mainPosition,
    throwing_hand: throwingHand,
    batting_hand: battingHand,
    is_reincarnated: parseBooleanFlag(payload.is_reincarnated, "is_reincarnated"),
    is_genius: parseBooleanFlag(payload.is_genius, "is_genius"),
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

async function createPlayer(payload) {
  const validatedPayload = validatePlayerPayload(payload);
  const school = await schoolModel.findById(validatedPayload.school_id);

  if (!school || school.is_archived === 1) {
    throw createHttpError(400, "school_id must reference an active school.");
  }

  return playerModel.createPlayer(validatedPayload);
}

async function updatePlayer(id, payload) {
  const playerId = parseRequiredInteger(id, "player id", { min: 1 });
  const updatePayload = validateUpdatePayloadFields(payload);
  const currentPlayer = await playerModel.findById(playerId);

  if (!currentPlayer) {
    throw createHttpError(404, "Player not found.");
  }

  const mergedPayload = {
    ...currentPlayer,
    ...updatePayload,
    school_id: currentPlayer.school_id,
    pitch_types: updatePayload.pitch_types ?? currentPlayer.pitch_types,
    special_abilities: updatePayload.special_abilities ?? currentPlayer.special_abilities,
    sub_positions: updatePayload.sub_positions ?? currentPlayer.sub_positions,
  };

  const validatedPayload = validatePlayerPayload(mergedPayload);
  const school = await schoolModel.findById(validatedPayload.school_id);

  if (!school || school.is_archived === 1) {
    throw createHttpError(400, "school_id must reference an active school.");
  }

  const updatedPlayer = await playerModel.updatePlayer(playerId, validatedPayload);

  if (!updatedPlayer) {
    throw createHttpError(404, "Player not found.");
  }

  return updatedPlayer;
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

module.exports = {
  getPlayers,
  getPlayerById,
  createPlayer,
  updatePlayer,
};
