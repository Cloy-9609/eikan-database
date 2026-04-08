const schoolModel = require("../models/schoolModel");

const ALLOWED_PLAY_STYLES = ["three_year", "continuous"];

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

function validateSchoolPayload(payload = {}) {
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const playStyle =
    typeof payload.play_style === "string" ? payload.play_style.trim() : "";
  const memo =
    payload.memo === undefined || payload.memo === null ? null : String(payload.memo).trim();

  if (!name) {
    throw createHttpError(400, "name is required.");
  }

  if (!ALLOWED_PLAY_STYLES.includes(playStyle)) {
    throw createHttpError(400, "play_style must be 'three_year' or 'continuous'.");
  }

  return {
    name,
    playStyle,
    memo: memo === "" ? null : memo,
  };
}

async function getSchoolById(id) {
  const schoolId = validateId(id);
  const school = await schoolModel.findById(schoolId);

  if (!school) {
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
