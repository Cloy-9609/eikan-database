export const ADMISSION_YEAR_MIN = 1932;
export const ADMISSION_YEAR_MAX = 2039;

const DIGIT_PLACES = ["千の位", "百の位", "十の位", "一の位"];
const DIGIT_WEIGHTS = [1000, 100, 10, 1];
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

export function getNextAdmissionYear(currentYear, digitIndex, step) {
  const safeCurrentYear = getSafeAdmissionYear(currentYear);
  const index = Number(digitIndex);
  const amount = Number(step);

  if (!Number.isInteger(index) || index < 0 || index >= DIGIT_WEIGHTS.length) {
    return { year: safeCurrentYear, changed: false, rejected: false };
  }

  if (!Number.isInteger(amount) || amount === 0) {
    return { year: safeCurrentYear, changed: false, rejected: false };
  }

  const nextYear = safeCurrentYear + DIGIT_WEIGHTS[index] * amount;

  if (!isValidYear(nextYear)) {
    return { year: safeCurrentYear, changed: false, rejected: true };
  }

  return { year: nextYear, changed: nextYear !== safeCurrentYear, rejected: false };
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
