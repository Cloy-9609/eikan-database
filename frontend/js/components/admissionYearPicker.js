export const ADMISSION_YEAR_MIN = 1932;
export const ADMISSION_YEAR_MAX = 2039;

const DIGIT_PLACES = ["千の位", "百の位", "十の位", "一の位"];
const DIGIT_COUNT = DIGIT_PLACES.length;
const DIGIT_CYCLE_LENGTH = 10;
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
  return Number.isInteger(year) && year >= ADMISSION_YEAR_MIN && year <= ADMISSION_YEAR_MAX;
}

export function getSafeAdmissionYear(value, fallbackYear = new Date().getFullYear()) {
  const hasValue = value !== undefined && value !== null && value !== "";
  const numericValue = hasValue ? Number(value) : NaN;
  const numericFallback = Number(fallbackYear);
  const baseYear = Number.isInteger(numericValue)
    ? numericValue
    : Number.isInteger(numericFallback)
      ? numericFallback
      : ADMISSION_YEAR_MIN;

  if (baseYear < ADMISSION_YEAR_MIN) {
    return ADMISSION_YEAR_MIN;
  }

  if (baseYear > ADMISSION_YEAR_MAX) {
    return ADMISSION_YEAR_MAX;
  }

  return baseYear;
}

function getYearDigits(year) {
  return String(getSafeAdmissionYear(year))
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

function getThousandsDigitAdjustedAdmissionYear(currentYear) {
  return buildResult(currentYear, currentYear < 2000 ? ADMISSION_YEAR_MAX : ADMISSION_YEAR_MIN);
}

function getHundredsDigitAdjustedAdmissionYear(currentYear) {
  const lowerDigits = currentYear % 100;
  const candidateYear = currentYear < 2000 ? 2000 + lowerDigits : 1900 + lowerDigits;

  if (isValidYear(candidateYear)) {
    return buildResult(currentYear, candidateYear);
  }

  return buildResult(currentYear, currentYear < 2000 ? ADMISSION_YEAR_MAX : ADMISSION_YEAR_MIN);
}

function getOnesDigitAdjustedAdmissionYear(currentYear, step) {
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

function getTensDigitAdjustedAdmissionYear(currentYear, step) {
  const digits = getYearDigits(currentYear);
  const direction = getSearchDirection(step);

  return findFirstValidYear(
    (attempt) => getTensDigitCandidateYear(digits, direction, attempt),
    currentYear
  );
}

export function getNextAdmissionYear(currentYear, digitIndex, step) {
  const safeCurrentYear = getSafeAdmissionYear(currentYear);
  const index = Number(digitIndex);
  const amount = Number(step);

  if (!Number.isInteger(index) || index < 0 || index >= DIGIT_COUNT) {
    return { year: safeCurrentYear, changed: false, rejected: false };
  }

  if (!Number.isInteger(amount) || amount === 0) {
    return { year: safeCurrentYear, changed: false, rejected: false };
  }

  if (index === 0) {
    return getThousandsDigitAdjustedAdmissionYear(safeCurrentYear);
  }

  if (index === 1) {
    return getHundredsDigitAdjustedAdmissionYear(safeCurrentYear);
  }

  if (index === 2) {
    return getTensDigitAdjustedAdmissionYear(safeCurrentYear, amount);
  }

  if (index === 3) {
    return getOnesDigitAdjustedAdmissionYear(safeCurrentYear, amount);
  }
}

function renderDigits(year) {
  return getYearDigits(year)
    .map(
      (digit, index) => `
        <div class="admission-year-digit" data-admission-year-digit-box="${index}">
          <button
            type="button"
            class="admission-year-button admission-year-button-up"
            data-admission-year-step="1"
            data-admission-year-digit-index="${index}"
            aria-label="${DIGIT_PLACES[index]}を増やす"
          >▲</button>
          <output
            class="admission-year-number"
            data-admission-year-digit="${index}"
            aria-label="${DIGIT_PLACES[index]}"
          >${digit}</output>
          <button
            type="button"
            class="admission-year-button admission-year-button-down"
            data-admission-year-step="-1"
            data-admission-year-digit-index="${index}"
            aria-label="${DIGIT_PLACES[index]}を減らす"
          >▼</button>
        </div>
      `
    )
    .join("");
}

function updatePicker(picker, year) {
  const safeYear = getSafeAdmissionYear(year);
  const digits = getYearDigits(safeYear);
  const input = picker.querySelector("[data-admission-year-input]");
  const label = picker.querySelector("[data-admission-year-label]");
  const error = picker.querySelector("[data-admission-year-error]");

  if (input) {
    input.value = String(safeYear);
  }

  digits.forEach((digit, index) => {
    const digitElement = picker.querySelector(`[data-admission-year-digit="${index}"]`);

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

function handlePickerClick(event) {
  const button = event.target.closest("[data-admission-year-step]");

  if (!button) {
    return;
  }

  const picker = button.closest("[data-admission-year-picker]");
  const input = picker?.querySelector("[data-admission-year-input]");

  if (!picker || !input) {
    return;
  }

  const result = getNextAdmissionYear(
    Number(input.value),
    Number(button.dataset.admissionYearDigitIndex),
    Number(button.dataset.admissionYearStep)
  );

  if (!result.changed) {
    const error = picker.querySelector("[data-admission-year-error]");

    if (error) {
      error.textContent = result.rejected ? ADMISSION_YEAR_ERROR_MESSAGE : "";
    }

    return;
  }

  updatePicker(picker, result.year);
}

export function buildAdmissionYearPicker({
  selectedYear = null,
  currentYear = new Date().getFullYear(),
} = {}) {
  const year = getSafeAdmissionYear(selectedYear ?? currentYear, currentYear);

  return `
    <div
      class="admission-year-picker"
      data-admission-year-picker
      data-min-year="${ADMISSION_YEAR_MIN}"
      data-max-year="${ADMISSION_YEAR_MAX}"
      role="group"
      aria-label="入学年"
    >
      <input
        id="admission_year"
        type="hidden"
        name="admission_year"
        value="${escapeAttribute(year)}"
        data-admission-year-input
      >
      <div class="admission-year-digits" aria-label="入学年 ${escapeAttribute(year)}年">
        ${renderDigits(year)}
      </div>
      <p class="admission-year-current">
        選択中: <output data-admission-year-label>${escapeAttribute(year)}年</output>
      </p>
      <p class="admission-year-error" data-admission-year-error role="alert"></p>
    </div>
  `;
}

export function setupAdmissionYearPickers(root = document) {
  root.querySelectorAll("[data-admission-year-picker]").forEach((picker) => {
    if (picker.dataset.admissionYearReady === "true") {
      return;
    }

    picker.dataset.admissionYearReady = "true";
    picker.addEventListener("click", handlePickerClick);
    updatePicker(picker, picker.querySelector("[data-admission-year-input]")?.value);
  });
}
