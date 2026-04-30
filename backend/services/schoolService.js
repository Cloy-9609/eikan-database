const schoolModel = require("../models/schoolModel");
const playerModel = require("../models/playerModel");
const playerSeriesModel = require("../models/playerSeriesModel");
const schoolYearProgressLogModel = require("../models/schoolYearProgressLogModel");
const { transaction } = require("../db/database");
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

function buildPlayerSeriesSummary(series, seriesSnapshots) {
  const latestSnapshot = selectLatestSnapshotForSchoolRoster(seriesSnapshots);
  const latestSnapshotLabel = latestSnapshot?.snapshot_label ?? null;

  return {
    playerSeriesId: series.id,
    latestSnapshotId: latestSnapshot?.id ?? null,
    latestSnapshotLabel,
    latestSnapshotLabelDisplay: latestSnapshotLabel
      ? SNAPSHOT_LABELS[latestSnapshotLabel] ?? latestSnapshotLabel
      : null,
    latestSnapshotIsLegacy: latestSnapshotLabel ? isLegacySnapshotLabel(latestSnapshotLabel) : false,
    name: latestSnapshot?.name ?? series.name,
    schoolGrade: series.school_grade,
    rosterStatus: series.roster_status,
    admissionYear: series.admission_year,
    grade: series.school_grade,
    latestSnapshotGrade: latestSnapshot?.grade ?? null,
    mainPosition: latestSnapshot?.main_position ?? null,
    playerType: latestSnapshot?.player_type ?? series.player_type,
    seriesNo: series.series_no,
    schoolCode: series.school_code,
    hasSnapshot: Boolean(latestSnapshot),
  };
}

function buildYearProgressUndoState(log) {
  if (!log) {
    return {
      canUndo: false,
      logId: null,
      previousYear: null,
      currentYear: null,
      createdAt: null,
    };
  }

  return {
    canUndo: true,
    logId: log.id,
    previousYear: log.previous_year,
    currentYear: log.current_year,
    createdAt: log.created_at,
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
  const [playerSeriesRows, playerSnapshots] = await Promise.all([
    playerSeriesModel.findBySchoolId(school.id),
    playerModel.findBySchoolId(school.id),
  ]);
  const seriesSnapshotsMap = new Map();

  for (const snapshot of playerSnapshots) {
    const seriesId = Number(snapshot.player_series_id);

    if (!seriesSnapshotsMap.has(seriesId)) {
      seriesSnapshotsMap.set(seriesId, []);
    }

    seriesSnapshotsMap.get(seriesId).push(snapshot);
  }

  const playerSeriesSummaries = playerSeriesRows.map((series) =>
    buildPlayerSeriesSummary(series, seriesSnapshotsMap.get(Number(series.id)) ?? [])
  );
  const undoableLog = await schoolYearProgressLogModel.findLatestUndoableBySchoolId(school.id);

  return {
    school,
    playerSeriesSummaries,
    yearProgressUndo: buildYearProgressUndoState(undoableLog),
  };
}

async function createSchool(payload) {
  const validatedPayload = validateSchoolPayload(payload);
  return schoolModel.createSchool(validatedPayload);
}

async function updateSchool(id, payload) {
  const schoolId = validateId(id);
  const currentSchool = await getSchoolById(schoolId);
  const validatedPayload = validateSchoolPayload(payload);
  const currentYear = Number(currentSchool.current_year);
  validatedPayload.currentYear = Number.isInteger(currentYear)
    ? currentYear
    : validatedPayload.startYear;
  const updatedSchool = await schoolModel.updateSchool(schoolId, validatedPayload);

  if (!updatedSchool) {
    throw createHttpError(404, "School not found.");
  }

  return updatedSchool;
}

function resolveProgressionBaseYear(school) {
  const currentYear = Number(school.current_year);

  if (Number.isInteger(currentYear)) {
    return currentYear;
  }

  const startYear = Number(school.start_year);

  if (Number.isInteger(startYear)) {
    return startYear;
  }

  throw createHttpError(400, "current_year or start_year must be a valid integer.");
}

async function progressSchoolYear(id) {
  const schoolId = validateId(id);
  const transactionResult = await transaction(async () => {
    const school = await schoolModel.findById(schoolId);

    if (!school || school.is_archived === 1) {
      throw createHttpError(404, "School not found.");
    }

    const playerSeriesCount = await playerSeriesModel.countBySchoolId(schoolId);

    if (playerSeriesCount === 0) {
      throw createHttpError(409, "Cannot progress school year without registered player_series.");
    }

    const previousYear = resolveProgressionBaseYear(school);
    const currentYear = previousYear + 1;

    if (currentYear > SCHOOL_YEAR_MAX) {
      throw createHttpError(409, `current_year cannot exceed ${SCHOOL_YEAR_MAX}.`);
    }

    const progressionStateRows = await playerSeriesModel.findProgressionStateBySchoolId(schoolId);

    if (progressionStateRows.length === 0) {
      throw createHttpError(409, "Cannot progress school year without registered player_series.");
    }

    await schoolYearProgressLogModel.expireUndoableLogsBySchoolId(schoolId);
    const progressLogId = await schoolYearProgressLogModel.createProgressLog({
      schoolId,
      previousYear,
      currentYear,
      snapshotsCreated: 0,
    });
    await schoolYearProgressLogModel.addProgressLogPlayers(progressLogId, progressionStateRows);

    const updatedSchool = await schoolModel.updateCurrentYear(schoolId, currentYear);

    if (!updatedSchool) {
      throw createHttpError(404, "School not found.");
    }

    const progressionCounts = await playerSeriesModel.progressSchoolGradesBySchoolId(schoolId);

    return {
      previousYear,
      currentYear,
      progressionCounts,
      progressLogId,
    };
  });
  const schoolPlayerSeries = await getSchoolPlayerSeriesSummaries(schoolId);

  return {
    ...schoolPlayerSeries,
    progression: {
      previousYear: transactionResult.previousYear,
      currentYear: transactionResult.currentYear,
      advancedCount: transactionResult.progressionCounts.advancedCount,
      graduatedCount: transactionResult.progressionCounts.graduatedCount,
      alreadyGraduatedCount: transactionResult.progressionCounts.alreadyGraduatedCount,
      snapshotsCreated: 0,
    },
  };
}

async function undoSchoolYearProgression(id) {
  const schoolId = validateId(id);
  const transactionResult = await transaction(async () => {
    const school = await schoolModel.findById(schoolId);

    if (!school || school.is_archived === 1) {
      throw createHttpError(404, "School not found.");
    }

    const undoableLog = await schoolYearProgressLogModel.findLatestUndoableBySchoolId(schoolId);

    if (!undoableLog) {
      throw createHttpError(409, "No undoable school year progression log found.");
    }

    const logPlayers = await schoolYearProgressLogModel.findPlayersByLogId(undoableLog.id);

    const updatedSchool = await schoolModel.updateCurrentYear(schoolId, undoableLog.previous_year);

    if (!updatedSchool) {
      throw createHttpError(404, "School not found.");
    }

    for (const logPlayer of logPlayers) {
      const changes = await playerSeriesModel.restoreProgressionState({
        schoolId,
        playerSeriesId: logPlayer.player_series_id,
        schoolGrade: logPlayer.before_school_grade,
        rosterStatus: logPlayer.before_roster_status,
      });

      if (changes === 0) {
        throw createHttpError(409, "Cannot restore a player_series row from the progression log.");
      }
    }

    const undoneChanges = await schoolYearProgressLogModel.markLogUndone(undoableLog.id);

    if (undoneChanges === 0) {
      throw createHttpError(409, "This school year progression log has already been undone.");
    }

    return {
      previousYear: undoableLog.current_year,
      currentYear: undoableLog.previous_year,
      restoredPlayerSeriesCount: logPlayers.length,
      progressLogId: undoableLog.id,
    };
  });
  const schoolPlayerSeries = await getSchoolPlayerSeriesSummaries(schoolId);

  return {
    ...schoolPlayerSeries,
    undoProgression: {
      previousYear: transactionResult.previousYear,
      currentYear: transactionResult.currentYear,
      restoredPlayerSeriesCount: transactionResult.restoredPlayerSeriesCount,
      snapshotsRestored: 0,
    },
  };
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
  progressSchoolYear,
  undoSchoolYearProgression,
  deleteSchool,
};
