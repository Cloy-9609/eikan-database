const SCHOOL_SUFFIX = "高校";
const DEFAULT_SORT_BY = "updated_at";
const DEFAULT_SORT_ORDER = "desc";
const VALID_SORT_VALUES = new Set([
  "updated_at:desc",
  "updated_at:asc",
  "name:asc",
  "name:desc",
  "start_year:asc",
  "start_year:desc",
]);

export const SCHOOL_SEARCH_QUERY_KEYS = ["name", "prefecture", "play_style", "sort_by", "sort_order", "sort"];

export function createDefaultSchoolSearchState() {
  return {
    name: "",
    prefecture: "",
    playStyle: "",
    sortBy: DEFAULT_SORT_BY,
    sortOrder: DEFAULT_SORT_ORDER,
  };
}

export function serializeSchoolSortValue(sortBy = DEFAULT_SORT_BY, sortOrder = DEFAULT_SORT_ORDER) {
  return `${sortBy}:${sortOrder}`;
}

export function parseSchoolSortValue(value = serializeSchoolSortValue()) {
  const sortValue = String(value ?? "");

  if (!VALID_SORT_VALUES.has(sortValue)) {
    return { sortBy: DEFAULT_SORT_BY, sortOrder: DEFAULT_SORT_ORDER };
  }

  const [sortBy, sortOrder] = sortValue.split(":");
  return { sortBy, sortOrder };
}

function normalizeAllowedValues(values = []) {
  return new Set(values.map((value) => String(value)));
}

function normalizeAllowedFilterValue(value, allowedValues = []) {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    return "";
  }

  if (allowedValues.length === 0) {
    return normalizedValue;
  }

  const allowedValueSet = normalizeAllowedValues(allowedValues);
  return allowedValueSet.has(normalizedValue) ? normalizedValue : "";
}

export function normalizeSchoolSearchState(searchState = {}, { allowedPrefectures = [], allowedPlayStyles = [] } = {}) {
  const sortValue = serializeSchoolSortValue(searchState.sortBy, searchState.sortOrder);
  const { sortBy, sortOrder } = parseSchoolSortValue(sortValue);

  return {
    name: String(searchState.name ?? "").trim(),
    prefecture: normalizeAllowedFilterValue(searchState.prefecture, allowedPrefectures),
    playStyle: normalizeAllowedFilterValue(searchState.playStyle, allowedPlayStyles),
    sortBy,
    sortOrder,
  };
}

export function normalizeSchoolSearchName(value) {
  const text = String(value ?? "").trim();

  if (!text) {
    return "";
  }

  return text.endsWith(SCHOOL_SUFFIX) ? text.slice(0, -SCHOOL_SUFFIX.length).trim() : text;
}

export function readSchoolSearchStateFromParams(params = new URLSearchParams(), options = {}) {
  const sortBy = params.get("sort_by") ?? DEFAULT_SORT_BY;
  const sortOrder = params.get("sort_order") ?? DEFAULT_SORT_ORDER;
  const legacySort = params.get("sort");
  const parsedSort = legacySort ? parseSchoolSortValue(legacySort) : { sortBy, sortOrder };

  return normalizeSchoolSearchState(
    {
      name: params.get("name") ?? "",
      prefecture: params.get("prefecture") ?? "",
      playStyle: params.get("play_style") ?? "",
      sortBy: parsedSort.sortBy,
      sortOrder: parsedSort.sortOrder,
    },
    options
  );
}

export function buildSchoolListParams(searchState = {}, options = {}) {
  const normalizedState = normalizeSchoolSearchState(searchState, options);

  return {
    name: normalizeSchoolSearchName(normalizedState.name),
    prefecture: normalizedState.prefecture,
    play_style: normalizedState.playStyle,
    sort_by: normalizedState.sortBy,
    sort_order: normalizedState.sortOrder,
  };
}

export function buildCanonicalSchoolSearchParams(currentParams = new URLSearchParams(), searchState = {}, options = {}) {
  const nextParams = new URLSearchParams(currentParams);
  const params = buildSchoolListParams(searchState, options);

  SCHOOL_SEARCH_QUERY_KEYS.forEach((key) => nextParams.delete(key));

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    nextParams.set(key, String(value));
  });

  return nextParams;
}
