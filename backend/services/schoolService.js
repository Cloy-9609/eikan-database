const schoolModel = require("../models/schoolModel");
const { ALLOWED_PREFECTURE_VALUES } = require("../constants/prefectures");

const ALLOWED_PLAY_STYLES = ["three_year", "continuous"];
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

async function getSchoolById(id) {
  const schoolId = validateId(id);
  const school = await schoolModel.findById(schoolId);

  if (!school || school.is_archived === 1) {
    throw createHttpError(404, "School not found.");
  }

  return school;
}

async function getSchools() {
  return schoolModel.findAllActive();
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
  createSchool,
  updateSchool,
  deleteSchool,
};
