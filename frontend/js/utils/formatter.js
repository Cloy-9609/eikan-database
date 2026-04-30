const SCHOOL_SUFFIX = "高校";

const SCHOOL_PLAY_STYLE_LABELS = {
  three_year: "3年モード",
  continuous: "継続プレイ",
};

const SQLITE_UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/;

function parseDateValue(value) {
  if (typeof value !== "string") {
    return new Date(value);
  }

  const trimmedValue = value.trim();

  if (SQLITE_UTC_TIMESTAMP_PATTERN.test(trimmedValue)) {
    return new Date(`${trimmedValue.replace(" ", "T")}Z`);
  }

  return new Date(value);
}

export function formatDate(value, fallback = "未設定") {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsedDate = parseDateValue(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return String(value);
  }

  return parsedDate.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatSchoolName(value, fallback = "未設定") {
  const schoolName = typeof value === "string" ? value.trim() : "";

  if (!schoolName) {
    return fallback;
  }

  return schoolName.endsWith(SCHOOL_SUFFIX) ? schoolName : `${schoolName}${SCHOOL_SUFFIX}`;
}

export function formatSchoolPlayStyle(playStyle, fallback = "未設定") {
  return SCHOOL_PLAY_STYLE_LABELS[playStyle] ?? fallback;
}
