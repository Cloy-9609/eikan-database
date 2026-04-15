const SCHOOL_SUFFIX = "高校";

const SCHOOL_PLAY_STYLE_LABELS = {
  three_year: "3年モード",
  continuous: "継続プレイ",
};

export function formatDate(value, fallback = "未設定") {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsedDate = new Date(value);

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
