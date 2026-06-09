export const SNAPSHOT_TIMELINE = [
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

export const SNAPSHOT_LABEL_OPTIONS = SNAPSHOT_TIMELINE.map(({ value, label }) => ({
  value,
  label,
}));

export const SNAPSHOT_UNLOCK_GROUPS = [
  ["entrance", "y1_summer", "y1_autumn", "y1_spring"],
  ["y2_summer", "y2_autumn", "y2_spring"],
  ["y3_summer"],
];

export const LEGACY_SNAPSHOT_LABELS = {
  admission: "入学時",
  post_tournament: "大会後",
  y3_autumn: "3年秋大会後",
};

export const SNAPSHOT_LABELS = Object.fromEntries(
  SNAPSHOT_TIMELINE.map(({ value, label }) => [value, label])
);

Object.assign(SNAPSHOT_LABELS, LEGACY_SNAPSHOT_LABELS);

export function parseSnapshotIntegerValue(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const text = String(value).trim();

  if (!text) {
    return null;
  }

  const numericValue = Number(text);
  return Number.isInteger(numericValue) ? numericValue : null;
}

export function getSnapshotLabel(value, fallback = "") {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    return fallback;
  }

  return SNAPSHOT_LABELS[normalizedValue] ?? (fallback || normalizedValue);
}

export function getOfficialSnapshotDefinitions() {
  return SNAPSHOT_LABEL_OPTIONS.map(({ value, label }) => ({
    key: value,
    value,
    label,
  }));
}

export function resolveSnapshotUnlockLevelFromYears(schoolCurrentYear, admissionYear) {
  const numericSchoolCurrentYear = parseSnapshotIntegerValue(schoolCurrentYear);
  const numericAdmissionYear = parseSnapshotIntegerValue(admissionYear);

  if (!Number.isInteger(numericSchoolCurrentYear) || !Number.isInteger(numericAdmissionYear)) {
    return null;
  }

  const elapsedYears = numericSchoolCurrentYear - numericAdmissionYear;

  if (elapsedYears >= 2) {
    return 3;
  }

  if (elapsedYears >= 1) {
    return 2;
  }

  return 1;
}

export function resolveSnapshotUnlockLevelFromSchoolGrade(schoolGrade) {
  const numericSchoolGrade = parseSnapshotIntegerValue(schoolGrade);

  if (![1, 2, 3].includes(numericSchoolGrade)) {
    return null;
  }

  return numericSchoolGrade;
}

export function resolveSnapshotUnlockLevelFromContext({
  schoolCurrentYear,
  admissionYear,
  schoolGrade,
  rosterStatus,
  grade,
} = {}) {
  if (rosterStatus === "graduated") {
    return 3;
  }

  return (
    resolveSnapshotUnlockLevelFromSchoolGrade(schoolGrade) ??
    resolveSnapshotUnlockLevelFromSchoolGrade(grade) ??
    resolveSnapshotUnlockLevelFromYears(schoolCurrentYear, admissionYear)
  );
}

export function getVisibleOfficialSnapshotDefinitions(context = {}, { fallbackUnlockLevel = "all" } = {}) {
  const unlockLevel = resolveSnapshotUnlockLevelFromContext(context);
  const effectiveUnlockLevel =
    unlockLevel ?? (fallbackUnlockLevel === "all" ? SNAPSHOT_UNLOCK_GROUPS.length : fallbackUnlockLevel);
  const visibleSnapshotKeys = new Set(
    SNAPSHOT_UNLOCK_GROUPS.slice(0, effectiveUnlockLevel).flat()
  );

  if (context.rosterStatus === "graduated") {
    visibleSnapshotKeys.add("graduation");
  }

  return getOfficialSnapshotDefinitions().filter((definition) =>
    visibleSnapshotKeys.has(definition.key)
  );
}

export function buildCurrentSnapshotOption(value) {
  const label = getSnapshotLabel(value, "現在の登録値");

  return {
    value,
    key: value,
    label: label === "現在の登録値" ? "現在の登録値（要確認）" : `${label}（現在の登録値）`,
    currentOnly: true,
  };
}

export function getSnapshotOptionsForCurrentValue(context = {}, currentValue = "", options = {}) {
  const normalizedCurrentValue = String(currentValue ?? "").trim();
  const snapshotOptions = getVisibleOfficialSnapshotDefinitions(context, options);

  if (
    normalizedCurrentValue &&
    !snapshotOptions.some((option) => option.value === normalizedCurrentValue)
  ) {
    return [...snapshotOptions, buildCurrentSnapshotOption(normalizedCurrentValue)];
  }

  return snapshotOptions;
}
