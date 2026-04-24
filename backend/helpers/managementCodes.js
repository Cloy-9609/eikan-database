const crypto = require("crypto");
const { getSnapshotOrder } = require("../constants/playerSnapshots");

const HUMAN_SAFE_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const SCHOOL_CODE_LENGTH = 8;
const SERIES_NO_DISPLAY_WIDTH = 3;
const SNAPSHOT_ORDER_DISPLAY_WIDTH = 2;

function generateHumanSafeCode(length = SCHOOL_CODE_LENGTH) {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error("length must be a positive integer.");
  }

  let code = "";

  for (let index = 0; index < length; index += 1) {
    code += HUMAN_SAFE_CODE_ALPHABET[crypto.randomInt(HUMAN_SAFE_CODE_ALPHABET.length)];
  }

  return code;
}

function generateSchoolCodeCandidate() {
  return generateHumanSafeCode(SCHOOL_CODE_LENGTH);
}

function normalizeHumanSafeCode(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const code = String(value).trim().toUpperCase();
  return code === "" ? null : code;
}

function resolveNextSeriesNo(usedSeriesNos = []) {
  const usedNumbers = new Set(
    usedSeriesNos
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0)
  );
  let nextSeriesNo = 1;

  while (usedNumbers.has(nextSeriesNo)) {
    nextSeriesNo += 1;
  }

  return nextSeriesNo;
}

function formatPositiveInteger(value, width, fieldName) {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }

  return String(numericValue).padStart(width, "0");
}

function buildSchoolDisplayCode(schoolCode) {
  const normalizedCode = normalizeHumanSafeCode(schoolCode);

  if (!normalizedCode) {
    return null;
  }

  return normalizedCode;
}

function buildPlayerSeriesDisplayCode({ schoolCode, seriesNo }) {
  const schoolDisplayCode = buildSchoolDisplayCode(schoolCode);

  if (!schoolDisplayCode) {
    return null;
  }

  return `${schoolDisplayCode}-${formatPositiveInteger(
    seriesNo,
    SERIES_NO_DISPLAY_WIDTH,
    "seriesNo"
  )}`;
}

function getSnapshotDisplayOrder(snapshotKey) {
  const zeroBasedOrder = getSnapshotOrder(snapshotKey);
  return zeroBasedOrder === null ? null : zeroBasedOrder + 1;
}

function buildSnapshotDisplayCode({ schoolCode, seriesNo, snapshotKey }) {
  const playerSeriesDisplayCode = buildPlayerSeriesDisplayCode({ schoolCode, seriesNo });

  if (!playerSeriesDisplayCode) {
    return null;
  }

  const snapshotDisplayOrder = getSnapshotDisplayOrder(snapshotKey);
  const snapshotSuffix =
    snapshotDisplayOrder === null
      ? String(snapshotKey)
      : `S${formatPositiveInteger(
          snapshotDisplayOrder,
          SNAPSHOT_ORDER_DISPLAY_WIDTH,
          "snapshotDisplayOrder"
        )}`;

  return `${playerSeriesDisplayCode}-${snapshotSuffix}`;
}

module.exports = {
  HUMAN_SAFE_CODE_ALPHABET,
  SCHOOL_CODE_LENGTH,
  SERIES_NO_DISPLAY_WIDTH,
  SNAPSHOT_ORDER_DISPLAY_WIDTH,
  generateHumanSafeCode,
  generateSchoolCodeCandidate,
  normalizeHumanSafeCode,
  resolveNextSeriesNo,
  buildSchoolDisplayCode,
  buildPlayerSeriesDisplayCode,
  getSnapshotDisplayOrder,
  buildSnapshotDisplayCode,
};
