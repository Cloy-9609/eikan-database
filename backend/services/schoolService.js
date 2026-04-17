const schoolModel = require("../models/schoolModel");
const playerModel = require("../models/playerModel");
const { ALLOWED_PREFECTURE_VALUES } = require("../constants/prefectures");
const {
  SNAPSHOT_LABELS,
  getSnapshotOrder,
  isLegacySnapshotLabel,
  isOfficialSnapshotLabel,
} = require("../constants/playerSnapshots");

const ALLOWED_PLAY_STYLES = ["three_year", "continuous"];
const ALLOWED_SCHOOL_SORT_BY = ["name", "start_year", "updated_at"];
const ALLOWED_SORT_ORDERS = ["asc", "desc"];
const SCHOOL_SUFFIX = "高校";
const SCHOOL_YEAR_MIN = 1932;
const SCHOOL_YEAR_MAX = 2039;

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function validateId(id) {
  const numericId = Number(id);

  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw createHttpError(400, "Invalid school id.");
  }

  return numericId;
}

function parseRequiredText(value, fieldName) {
  const text = typeof value === "string" ? value.trim() : "";

  if (!text) {
    throw createHttpError(400, `${fieldName} is required.`);
  }

  return text;
}

function parseOptionalText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text === "" ? null : text;
}

function normalizeSchoolBaseName(value) {
  const trimmedName = parseRequiredText(value, "name");
  const normalizedName = trimmedName.endsWith(SCHOOL_SUFFIX)
    ? trimmedName.slice(0, -SCHOOL_SUFFIX.length).trim()
    : trimmedName;

  if (!normalizedName) {
    throw createHttpError(400, "name is required.");
  }

  return normalizedName;
}

function normalizeSchoolSearchName(value) {
  const text = parseOptionalText(value);

  if (!text) {
    return null;
  }

  const normalizedName = text.endsWith(SCHOOL_SUFFIX)
    ? text.slice(0, -SCHOOL_SUFFIX.length).trim()
    : text;

  return normalizedName || null;
}

function getSnapshotTimeValue(snapshot) {
  return new Date(snapshot.updated_at || snapshot.created_at || 0).getTime();
}

function compareSnapshotRecencyDesc(left, right) {
  const leftTime = getSnapshotTimeValue(left);
  const rightTime = getSnapshotTimeValue(right);

  if (leftTime !== rightTime) {
    return rightTime - leftTime;
  }

  return Number(right.id) - Number(left.id);
}

function selectLatestSnapshotForSchoolRoster(snapshots) {
  const officialSnapshots = snapshots.filter((snapshot) =>
    isOfficialSnapshotLabel(snapshot.snapshot_label)
  );

  if (officialSnapshots.length > 0) {
    return [...officialSnapshots].sort((left, right) => {
      const leftOrder = getSnapshotOrder(left.snapshot_label) ?? -1;
      const rightOrder = getSnapshotOrder(right.snapshot_label) ?? -1;

      if (leftOrder !== rightOrder) {
        return rightOrder - leftOrder;
      }

      return compareSnapshotRecencyDesc(left, right);
    })[0];
  }

  return [...snapshots].sort(compareSnapshotRecencyDesc)[0] ?? null;
}

function buildPlayerSeriesSummary(seriesSnapshots) {
  const latestSnapshot = selectLatestSnapshotForSchoolRoster(seriesSnapshots);
  const anchorSnapshot = latestSnapshot ?? seriesSnapshots[0] ?? null;

  if (!anchorSnapshot) {
    return null;
  }

  const latestSnapshotLabel = latestSnapshot?.snapshot_label ?? anchorSnapshot.snapshot_label;

  return {
    playerSeriesId: anchorSnapshot.player_series_id,
    latestSnapshotId: latestSnapshot?.id ?? anchorSnapshot.id,
    latestSnapshotLabel,
    latestSnapshotLabelDisplay: SNAPSHOT_LABELS[latestSnapshotLabel] ?? latestSnapshotLabel,
    latestSnapshotIsLegacy: isLegacySnapshotLabel(latestSnapshotLabel),
    name: latestSnapshot?.name ?? anchorSnapshot.name,
    grade: latestSnapshot?.grade ?? anchorSnapshot.grade,
    mainPosition: latestSnapshot?.main_position ?? anchorSnapshot.main_position,
    playerType: latestSnapshot?.player_type ?? anchorSnapshot.player_type,
  };
}

function validatePlayStyle(value) {
  const playStyle = parseRequiredText(value, "play_style");

  if (!ALLOWED_PLAY_STYLES.includes(playStyle)) {
    throw createHttpError(400, "play_style must be 'three_year' or 'continuous'.");
  }

  return playStyle;
}

function validatePrefecture(value) {
  const prefecture = parseRequiredText(value, "prefecture");

  if (!ALLOWED_PREFECTURE_VALUES.includes(prefecture)) {
    throw createHttpError(400, "prefecture must be one of the allowed prefectures or countries.");
  }

  return prefecture;
}

function validateOptionalEnum(value, fieldName, allowedValues) {
  const text = parseOptionalText(value);

  if (text === null) {
    return null;
  }

  if (!allowedValues.includes(text)) {
    throw createHttpError(400, `${fieldName} must be one of: ${allowedValues.join(", ")}.`);
  }

  return text;
}

function validateSchoolYear(value, fieldName) {
  const year = Number(value);

  if (!Number.isInteger(year)) {
    throw createHttpError(400, `${fieldName} must be an integer.`);
  }

  if (year < SCHOOL_YEAR_MIN || year > SCHOOL_YEAR_MAX) {
    throw createHttpError(
      400,
      `${fieldName} must be between ${SCHOOL_YEAR_MIN} and ${SCHOOL_YEAR_MAX}.`
    );
  }

  return year;
}

function validateSchoolPayload(payload = {}) {
  const name = normalizeSchoolBaseName(payload.name);
  const prefecture = validatePrefecture(payload.prefecture);
  const playStyle = validatePlayStyle(payload.play_style);
  const startYear = validateSchoolYear(payload.start_year, "start_year");
  const memo =
    payload.memo === undefined || payload.memo === null ? null : String(payload.memo).trim();

  return {
    name,
    prefecture,
    playStyle,
    startYear,
    currentYear: startYear,
    memo: memo === "" ? null : memo,
  };
}

function normalizeSchoolListQuery(query = {}) {
  const name = normalizeSchoolSearchName(query.name);
  const prefecture = validateOptionalEnum(query.prefecture, "prefecture", ALLOWED_PREFECTURE_VALUES);
  const playStyle = validateOptionalEnum(query.play_style, "play_style", ALLOWED_PLAY_STYLES);
  const sortBy = validateOptionalEnum(query.sort_by, "sort_by", ALLOWED_SCHOOL_SORT_BY) ?? "updated_at";
  const sortOrder = validateOptionalEnum(query.sort_order, "sort_order", ALLOWED_SORT_ORDERS) ?? "desc";

  return {
    name,
    prefecture,
    playStyle,
    sortBy,
    sortOrder,
  };
}

async function getSchoolById(id) {
  const schoolId = validateId(id);
  const school = await schoolModel.findById(schoolId);

  if (!school || school.is_archived === 1) {
    throw createHttpError(404, "School not found.");
  }

  return school;
}

async function getSchools(query = {}) {
  const normalizedQuery = normalizeSchoolListQuery(query);
  return schoolModel.findAllActive(normalizedQuery);
}

async function getSchoolPlayerSeriesSummaries(id) {
  const school = await getSchoolById(id);
  const playerSnapshots = await playerModel.findBySchoolId(school.id);
  const seriesSnapshotsMap = new Map();

  for (const snapshot of playerSnapshots) {
    const seriesId = Number(snapshot.player_series_id);

    if (!seriesSnapshotsMap.has(seriesId)) {
      seriesSnapshotsMap.set(seriesId, []);
    }

    seriesSnapshotsMap.get(seriesId).push(snapshot);
  }

  const playerSeriesSummaries = Array.from(seriesSnapshotsMap.values())
    .map((seriesSnapshots) => buildPlayerSeriesSummary(seriesSnapshots))
    .filter(Boolean);

  return {
    school,
    playerSeriesSummaries,
  };
}

async function createSchool(payload) {
  const validatedPayload = validateSchoolPayload(payload);
  return schoolModel.createSchool(validatedPayload);
}

async function updateSchool(id, payload) {
  const schoolId = validateId(id);
  const validatedPayload = validateSchoolPayload(payload);
  const updatedSchool = await schoolModel.updateSchool(schoolId, validatedPayload);

  if (!updatedSchool) {
    throw createHttpError(404, "School not found.");
  }

  return updatedSchool;
}

async function deleteSchool(id) {
  const schoolId = validateId(id);
  const archivedSchool = await schoolModel.archiveSchool(schoolId);

  if (!archivedSchool) {
    throw createHttpError(404, "School not found.");
  }

  return archivedSchool;
}

module.exports = {
  getSchools,
  getSchoolById,
  getSchoolPlayerSeriesSummaries,
  createSchool,
  updateSchool,
  deleteSchool,
};
