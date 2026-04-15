export const YEAR_MIN = 1932;
export const YEAR_MAX = 2039;
export const ADMISSION_YEAR_MIN = YEAR_MIN;
export const ADMISSION_YEAR_MAX = YEAR_MAX;

const DIGIT_PLACES = ["千の位", "百の位", "十の位", "一の位"];
const DIGIT_COUNT = DIGIT_PLACES.length;
const DIGIT_CYCLE_LENGTH = 10;
const DEFAULT_YEAR_ERROR_MESSAGE =
  "この操作では有効な年度にならないため、値は変更されません。1932〜2039年から選択してください。";
const ADMISSION_YEAR_ERROR_MESSAGE =
  "この操作では有効な入学年にならないため、値は変更されません。1932〜2039年から選択してください。";

function escapeAttribute(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function isValidYear(year) {
  return Number.isInteger(year) && year >= YEAR_MIN && year <= YEAR_MAX;
}

export function getSafeYear(value, fallbackYear = new Date().getFullYear()) {
  const hasValue = value !== undefined && value !== null && value !== "";
  const numericValue = hasValue ? Number(value) : NaN;
  const numericFallback = Number(fallbackYear);
  const baseYear = Number.isInteger(numericValue)
    ? numericValue
    : Number.isInteger(numericFallback)
      ? numericFallback
      : YEAR_MIN;

  if (baseYear < YEAR_MIN) {
    return YEAR_MIN;
  }

  if (baseYear > YEAR_MAX) {
    return YEAR_MAX;
  }

  return baseYear;
}

export function getSafeAdmissionYear(value, fallbackYear = new Date().getFullYear()) {
  return getSafeYear(value, fallbackYear);
}

function getYearDigits(year) {
  return String(getSafeYear(year))
    .padStart(4, "0")
    .slice(-4)
    .split("")
    .map(Number);
}

function getYearFromDigits(digits) {
  return Number(digits.join(""));
}

function wrapDigitValue(value) {
  return ((value % DIGIT_CYCLE_LENGTH) + DIGIT_CYCLE_LENGTH) % DIGIT_CYCLE_LENGTH;
}

function getSearchDirection(step) {
  return step > 0 ? 1 : -1;
}

function buildResult(currentYear, nextYear) {
  return {
    year: nextYear,
    changed: nextYear !== currentYear,
    rejected: false,
  };
}

function getRejectedResult(year) {
  return { year, changed: false, rejected: true };
}

function findFirstValidYear(candidateFactory, currentYear) {
  for (let attempt = 1; attempt <= DIGIT_CYCLE_LENGTH; attempt += 1) {
    const candidateYear = candidateFactory(attempt);

    if (candidateYear !== currentYear && isValidYear(candidateYear)) {
      return buildResult(currentYear, candidateYear);
    }
  }

  return getRejectedResult(currentYear);
}

function getThousandsDigitAdjustedYear(currentYear) {
  return buildResult(currentYear, currentYear < 2000 ? YEAR_MAX : YEAR_MIN);
}

function getHundredsDigitAdjustedYear(currentYear) {
  const lowerDigits = currentYear % 100;
  const candidateYear = currentYear < 2000 ? 2000 + lowerDigits : 1900 + lowerDigits;

  if (isValidYear(candidateYear)) {
    return buildResult(currentYear, candidateYear);
  }

  return buildResult(currentYear, currentYear < 2000 ? YEAR_MAX : YEAR_MIN);
}

function getOnesDigitAdjustedYear(currentYear, step) {
  const digits = getYearDigits(currentYear);
  const direction = getSearchDirection(step);

  return findFirstValidYear((attempt) => {
    const candidateDigits = [...digits];
    candidateDigits[3] = wrapDigitValue(digits[3] + direction * attempt);
    return getYearFromDigits(candidateDigits);
  }, currentYear);
}

function getTensDigitCandidateYear(digits, direction, attempt) {
  const candidateDigits = [...digits];
  candidateDigits[2] = wrapDigitValue(digits[2] + direction * attempt);
  const candidateYear = getYearFromDigits(candidateDigits);

  if (isValidYear(candidateYear)) {
    return candidateYear;
  }

  const isPartial1930s =
    candidateDigits[0] === 1 &&
    candidateDigits[1] === 9 &&
    candidateDigits[2] === 3;

  if (!isPartial1930s) {
    return null;
  }

  for (let onesAttempt = 0; onesAttempt < DIGIT_CYCLE_LENGTH; onesAttempt += 1) {
    candidateDigits[3] = wrapDigitValue(digits[3] + direction * onesAttempt);

    const partialCandidateYear = getYearFromDigits(candidateDigits);

    if (isValidYear(partialCandidateYear)) {
      return partialCandidateYear;
    }
  }

  return null;
}

function getTensDigitAdjustedYear(currentYear, step) {
  const digits = getYearDigits(currentYear);
  const direction = getSearchDirection(step);

  return findFirstValidYear((attempt) => getTensDigitCandidateYear(digits, direction, attempt), currentYear);
}

export function getNextYear(currentYear, digitIndex, step) {
  const safeCurrentYear = getSafeYear(currentYear);
  const index = Number(digitIndex);
  const amount = Number(step);

  if (!Number.isInteger(index) || index < 0 || index >= DIGIT_COUNT) {
    return { year: safeCurrentYear, changed: false, rejected: false };
  }

  if (!Number.isInteger(amount) || amount === 0) {
    return { year: safeCurrentYear, changed: false, rejected: false };
  }

  if (index === 0) {
    return getThousandsDigitAdjustedYear(safeCurrentYear);
  }

  if (index === 1) {
    return getHundredsDigitAdjustedYear(safeCurrentYear);
  }

  if (index === 2) {
    return getTensDigitAdjustedYear(safeCurrentYear, amount);
  }

  if (index === 3) {
    return getOnesDigitAdjustedYear(safeCurrentYear, amount);
  }
}

export function getNextAdmissionYear(currentYear, digitIndex, step) {
  return getNextYear(currentYear, digitIndex, step);
}

function renderDigits(year) {
  return getYearDigits(year)
    .map(
      (digit, index) => `
        <div class="admission-year-digit" data-year-digit-box="${index}">
          <button
            type="button"
            class="admission-year-button admission-year-button-up"
            data-year-step="1"
            data-year-digit-index="${index}"
            aria-label="${DIGIT_PLACES[index]}を増やす"
          >▲</button>
          <output
            class="admission-year-number"
            data-year-digit="${index}"
            aria-label="${DIGIT_PLACES[index]}"
          >${digit}</output>
          <button
            type="button"
            class="admission-year-button admission-year-button-down"
            data-year-step="-1"
            data-year-digit-index="${index}"
            aria-label="${DIGIT_PLACES[index]}を減らす"
          >▼</button>
        </div>
      `
    )
    .join("");
}

function updatePicker(picker, year) {
  const safeYear = getSafeYear(year);
  const digits = getYearDigits(safeYear);
  const input = picker.querySelector("[data-year-input]");
  const label = picker.querySelector("[data-year-label]");
  const error = picker.querySelector("[data-year-error]");

  if (input) {
    input.value = String(safeYear);
  }

  digits.forEach((digit, index) => {
    const digitElement = picker.querySelector(`[data-year-digit="${index}"]`);

    if (digitElement) {
      digitElement.textContent = String(digit);
    }
  });

  if (label) {
    label.textContent = `${safeYear}年`;
  }

  if (error) {
    error.textContent = "";
  }
}

export function setYearPickerValue(picker, year) {
  if (!picker) {
    return;
  }

  updatePicker(picker, year);
}

function handlePickerClick(event) {
  const button = event.target.closest("[data-year-step]");

  if (!button) {
    return;
  }

  const picker = button.closest("[data-year-picker]");
  const input = picker?.querySelector("[data-year-input]");

  if (!picker || !input) {
    return;
  }

  const result = getNextYear(
    Number(input.value),
    Number(button.dataset.yearDigitIndex),
    Number(button.dataset.yearStep)
  );

  if (!result.changed) {
    const error = picker.querySelector("[data-year-error]");

    if (error) {
      error.textContent = result.rejected ? picker.dataset.yearErrorMessage : "";
    }

    return;
  }

  updatePicker(picker, result.year);
}

export function buildYearPicker({
  inputName = "year",
  inputId = inputName,
  selectedYear = null,
  currentYear = new Date().getFullYear(),
  groupLabel = "年度",
  selectionLabel = "選択中",
  errorMessage = DEFAULT_YEAR_ERROR_MESSAGE,
} = {}) {
  const year = getSafeYear(selectedYear ?? currentYear, currentYear);

  return `
    <div
      class="admission-year-picker"
      data-year-picker
      data-min-year="${YEAR_MIN}"
      data-max-year="${YEAR_MAX}"
      data-year-error-message="${escapeAttribute(errorMessage)}"
      role="group"
      aria-label="${escapeAttribute(groupLabel)}"
    >
      <input
        id="${escapeAttribute(inputId)}"
        type="hidden"
        name="${escapeAttribute(inputName)}"
        value="${escapeAttribute(year)}"
        data-year-input
      >
      <div class="admission-year-digits" aria-label="${escapeAttribute(groupLabel)} ${escapeAttribute(year)}年">
        ${renderDigits(year)}
      </div>
      <p class="admission-year-current">
        ${escapeAttribute(selectionLabel)}: <output data-year-label>${escapeAttribute(year)}年</output>
      </p>
      <p class="admission-year-error" data-year-error role="alert"></p>
    </div>
  `;
}

export function buildAdmissionYearPicker(options = {}) {
  return buildYearPicker({
    inputName: "admission_year",
    inputId: "admission_year",
    groupLabel: "入学年",
    errorMessage: ADMISSION_YEAR_ERROR_MESSAGE,
    ...options,
  });
}

export function setupYearPickers(root = document) {
  root.querySelectorAll("[data-year-picker]").forEach((picker) => {
    if (picker.dataset.yearReady === "true") {
      return;
    }

    picker.dataset.yearReady = "true";
    picker.addEventListener("click", handlePickerClick);
    updatePicker(picker, picker.querySelector("[data-year-input]")?.value);
  });
}

export function setupAdmissionYearPickers(root = document) {
  setupYearPickers(root);
}
