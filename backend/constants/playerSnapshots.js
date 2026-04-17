const SNAPSHOT_TIMELINE = [
  { value: "entrance", label: "入学時", grade: 1 },
  { value: "y1_summer", label: "1年夏大会後", grade: 1 },
  { value: "y1_autumn", label: "1年秋大会後", grade: 1 },
  { value: "y1_spring", label: "1年春大会後", grade: 1 },
  { value: "y2_summer", label: "2年夏大会後", grade: 2 },
  { value: "y2_autumn", label: "2年秋大会後", grade: 2 },
  { value: "y2_spring", label: "2年春大会後", grade: 2 },
  { value: "y3_summer", label: "3年夏大会後", grade: 3 },
  { value: "graduation", label: "卒業時", grade: 3 },
];

const OFFICIAL_SNAPSHOT_LABELS = SNAPSHOT_TIMELINE.map((snapshot) => snapshot.value);

// NOTE:
// `post_tournament` is kept as a temporary compatibility value for legacy data.
// We intentionally do not auto-convert it during migration because the source data
// does not tell us which official tournament timing it represents.
const LEGACY_SNAPSHOT_LABELS = ["post_tournament"];

const TRANSITIONAL_SNAPSHOT_LABELS = [
  ...OFFICIAL_SNAPSHOT_LABELS,
  ...LEGACY_SNAPSHOT_LABELS,
];

const SNAPSHOT_LABELS = Object.fromEntries(
  SNAPSHOT_TIMELINE.map(({ value, label }) => [value, label])
);

SNAPSHOT_LABELS.post_tournament = "大会後";

const SNAPSHOT_ORDER_BY_LABEL = Object.fromEntries(
  SNAPSHOT_TIMELINE.map(({ value }, index) => [value, index])
);

const SNAPSHOT_GRADE_BY_LABEL = Object.fromEntries(
  SNAPSHOT_TIMELINE.map(({ value, grade }) => [value, grade])
);

function isLegacySnapshotLabel(value) {
  return LEGACY_SNAPSHOT_LABELS.includes(value);
}

function isOfficialSnapshotLabel(value) {
  return OFFICIAL_SNAPSHOT_LABELS.includes(value);
}

function getSnapshotOrder(value) {
  return Object.prototype.hasOwnProperty.call(SNAPSHOT_ORDER_BY_LABEL, value)
    ? SNAPSHOT_ORDER_BY_LABEL[value]
    : null;
}

function getSnapshotGrade(value) {
  return Object.prototype.hasOwnProperty.call(SNAPSHOT_GRADE_BY_LABEL, value)
    ? SNAPSHOT_GRADE_BY_LABEL[value]
    : null;
}

module.exports = {
  SNAPSHOT_TIMELINE,
  SNAPSHOT_LABELS,
  OFFICIAL_SNAPSHOT_LABELS,
  LEGACY_SNAPSHOT_LABELS,
  TRANSITIONAL_SNAPSHOT_LABELS,
  isLegacySnapshotLabel,
  isOfficialSnapshotLabel,
  getSnapshotOrder,
  getSnapshotGrade,
};
