const DEFAULT_SORT_BY = "updated_at";
const DEFAULT_SORT_ORDER = "desc";

export const PLAYER_SEARCH_QUERY_KEYS = [
  "name",
  "school_name",
  "admission_year",
  "admission_year_from",
  "admission_year_to",
  "player_type",
  "main_position",
  "position_type",
  "school_grade",
  "roster_status",
  "snapshot_label",
  "sort_by",
  "sort_order",
  "sort",
  "ability_key",
  "ability_min",
  "ability_max",
];

function normalizeAllowedValues(values = []) {
  return new Set(values.map((value) => String(value)));
}

function normalizeAllowedFilterValue(value, allowedValues = []) {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    return "";
  }

  return normalizeAllowedValues(allowedValues).has(normalizedValue) ? normalizedValue : "";
}

function getAbilityDefinition(abilityKey, abilityDefinitions = []) {
  return abilityDefinitions.find((definition) => String(definition.value) === abilityKey) ?? null;
}

export function createDefaultPlayerSearchState() {
  return {
    name: "",
    schoolName: "",
    admissionYearFrom: "",
    admissionYearTo: "",
    playerType: "",
    mainPosition: "",
    schoolGrade: "",
    rosterStatus: "",
    snapshotLabel: "",
    sortBy: DEFAULT_SORT_BY,
    sortOrder: DEFAULT_SORT_ORDER,
    abilityKey: "",
    abilityMin: "",
    abilityMax: "",
  };
}

export function normalizePlayerSortOrder(sortOrder = DEFAULT_SORT_ORDER) {
  return String(sortOrder).toLowerCase() === "asc" ? "asc" : DEFAULT_SORT_ORDER;
}

export function parsePlayerSortValue(value = DEFAULT_SORT_BY, sortOrder = DEFAULT_SORT_ORDER, { allowedSortKeys = [] } = {}) {
  const [rawSortBy, legacySortOrder] = String(value ?? "").split(":");
  const sortBy = String(rawSortBy ?? "").trim();

  if (!normalizeAllowedValues(allowedSortKeys).has(sortBy)) {
    return { sortBy: DEFAULT_SORT_BY, sortOrder: DEFAULT_SORT_ORDER };
  }

  return { sortBy, sortOrder: normalizePlayerSortOrder(legacySortOrder ?? sortOrder) };
}

export function parsePlayerIntegerSearchValue(value) {
  const text = String(value ?? "").trim();

  if (!text) {
    return "";
  }

  const numericValue = Number(text);
  return Number.isInteger(numericValue) && String(numericValue) === text ? String(numericValue) : "";
}

function normalizeAbilityBound(value, definition) {
  const normalizedValue = parsePlayerIntegerSearchValue(value);

  if (normalizedValue === "") {
    return "";
  }

  const numberValue = Number(normalizedValue);
  return numberValue >= definition.min && numberValue <= definition.max ? normalizedValue : "";
}

export function normalizePlayerAbilitySearchState(searchState = {}, { abilityDefinitions = [] } = {}) {
  const abilityKey = String(searchState.abilityKey ?? "").trim();
  const definition = getAbilityDefinition(abilityKey, abilityDefinitions);

  if (!definition) {
    return { abilityKey: "", abilityMin: "", abilityMax: "" };
  }

  const normalizedMin = normalizeAbilityBound(searchState.abilityMin, definition);
  const normalizedMax = normalizeAbilityBound(searchState.abilityMax, definition);
  const isReversedRange =
    normalizedMin !== "" && normalizedMax !== "" && Number(normalizedMin) > Number(normalizedMax);

  if (isReversedRange) {
    return { abilityKey, abilityMin: "", abilityMax: "" };
  }

  return { abilityKey, abilityMin: normalizedMin, abilityMax: normalizedMax };
}

export function normalizePlayerSearchState(searchState = {}, options = {}) {
  const { sortBy, sortOrder } = parsePlayerSortValue(searchState.sortBy, searchState.sortOrder, options);

  return {
    name: String(searchState.name ?? "").trim(),
    schoolName: String(searchState.schoolName ?? "").trim(),
    admissionYearFrom: String(searchState.admissionYearFrom ?? "").trim(),
    admissionYearTo: String(searchState.admissionYearTo ?? "").trim(),
    playerType: normalizeAllowedFilterValue(searchState.playerType, options.allowedPlayerTypes),
    mainPosition: normalizeAllowedFilterValue(searchState.mainPosition, options.allowedMainPositions),
    schoolGrade: normalizeAllowedFilterValue(searchState.schoolGrade, options.allowedSchoolGrades),
    rosterStatus: normalizeAllowedFilterValue(searchState.rosterStatus, options.allowedRosterStatuses),
    snapshotLabel: normalizeAllowedFilterValue(searchState.snapshotLabel, options.allowedSnapshotLabels),
    sortBy,
    sortOrder,
    ...normalizePlayerAbilitySearchState(searchState, options),
  };
}

export function readPlayerSearchStateFromParams(params = new URLSearchParams(), options = {}) {
  const sortBy = params.get("sort_by") ?? DEFAULT_SORT_BY;
  const sortOrder = params.get("sort_order") ?? DEFAULT_SORT_ORDER;
  const legacySort = params.get("sort");
  const parsedSort = legacySort
    ? parsePlayerSortValue(legacySort, DEFAULT_SORT_ORDER, options)
    : parsePlayerSortValue(sortBy, sortOrder, options);
  const legacyPositionType = params.get("position_type") ?? "";
  const canonicalMainPosition = params.get("main_position");
  const mainPosition = canonicalMainPosition
    ? canonicalMainPosition
    : legacyPositionType === "pitcher"
      ? "投手"
      : legacyPositionType === "fielder"
        ? "全野手"
        : "";
  const legacyAdmissionYear = params.get("admission_year") ?? "";

  return normalizePlayerSearchState(
    {
      name: params.get("name") ?? "",
      schoolName: params.get("school_name") ?? "",
      admissionYearFrom: params.get("admission_year_from") ?? legacyAdmissionYear,
      admissionYearTo: params.get("admission_year_to") ?? legacyAdmissionYear,
      playerType: params.get("player_type") ?? "",
      mainPosition,
      schoolGrade: params.get("school_grade") ?? "",
      rosterStatus: params.get("roster_status") ?? "",
      snapshotLabel: params.get("snapshot_label") ?? "",
      sortBy: parsedSort.sortBy,
      sortOrder: parsedSort.sortOrder,
      abilityKey: params.get("ability_key") ?? "",
      abilityMin: params.get("ability_min") ?? "",
      abilityMax: params.get("ability_max") ?? "",
    },
    options
  );
}

export function buildPlayerListParams(searchState = {}, options = {}) {
  const normalizedState = normalizePlayerSearchState(searchState, options);

  return {
    name: normalizedState.name,
    school_name: normalizedState.schoolName,
    admission_year_from: normalizedState.admissionYearFrom,
    admission_year_to: normalizedState.admissionYearTo,
    player_type: normalizedState.playerType,
    main_position: normalizedState.mainPosition,
    school_grade: normalizedState.schoolGrade,
    roster_status: normalizedState.rosterStatus,
    snapshot_label: normalizedState.snapshotLabel,
    sort_by: normalizedState.sortBy,
    sort_order: normalizedState.sortOrder,
    ability_key: normalizedState.abilityKey,
    ability_min: normalizedState.abilityMin,
    ability_max: normalizedState.abilityMax,
  };
}

export function buildCanonicalPlayerSearchParams(currentParams = new URLSearchParams(), searchState = {}, options = {}) {
  const nextParams = new URLSearchParams(currentParams);
  const params = buildPlayerListParams(searchState, options);

  PLAYER_SEARCH_QUERY_KEYS.forEach((key) => nextParams.delete(key));

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    nextParams.set(key, String(value));
  });

  return nextParams;
}
