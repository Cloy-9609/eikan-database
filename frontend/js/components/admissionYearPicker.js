const ADMISSION_YEAR_START = 1948;
const ADMISSION_YEAR_END = 2126;
const ADMISSION_YEAR_AFTER_RANGE_VALUE = 2127;

function escapeAttribute(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function createYearRange(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function createYearGroups() {
  const groups = [
    {
      label: "1948〜1959",
      start: 1948,
      end: 1959,
      years: createYearRange(1948, 1959),
    },
  ];

  for (let start = 1960; start <= 2110; start += 10) {
    groups.push({
      label: `${start}年代`,
      start,
      end: start + 9,
      years: createYearRange(start, start + 9),
    });
  }

  groups.push({
    label: "2120〜2126",
    start: 2120,
    end: 2126,
    years: createYearRange(2120, 2126),
  });

  groups.push({
    label: "それ以降",
    start: ADMISSION_YEAR_AFTER_RANGE_VALUE,
    end: ADMISSION_YEAR_AFTER_RANGE_VALUE,
    years: [ADMISSION_YEAR_AFTER_RANGE_VALUE],
  });

  return groups;
}

function clampCurrentYear(currentYear) {
  if (currentYear < ADMISSION_YEAR_START) {
    return ADMISSION_YEAR_START;
  }

  if (currentYear > ADMISSION_YEAR_END) {
    return ADMISSION_YEAR_AFTER_RANGE_VALUE;
  }

  return currentYear;
}

function isYearInGroup(group, year) {
  return Number.isInteger(year) && year >= group.start && year <= group.end;
}

function shouldOpenGroup(group, selectedYear, currentYear) {
  return (
    isYearInGroup(group, selectedYear) ||
    isYearInGroup(group, clampCurrentYear(currentYear))
  );
}

function findGroupIndex(groups, year) {
  return groups.findIndex((group) => isYearInGroup(group, year));
}

function orderGroupsForDisplay(groups, selectedYear, currentYear) {
  const orderedIndexes = [];
  const currentYearInRange = clampCurrentYear(currentYear);

  for (const year of [selectedYear, currentYearInRange]) {
    const index = findGroupIndex(groups, year);

    if (index !== -1 && !orderedIndexes.includes(index)) {
      orderedIndexes.push(index);
    }
  }

  for (const index of groups.keys()) {
    if (!orderedIndexes.includes(index)) {
      orderedIndexes.push(index);
    }
  }

  return orderedIndexes.map((index) => groups[index]);
}

function formatYearLabel(year) {
  return year === ADMISSION_YEAR_AFTER_RANGE_VALUE ? "それ以降" : `${year}年`;
}

export function buildAdmissionYearPicker({
  selectedYear = null,
  currentYear = new Date().getFullYear(),
} = {}) {
  const selectedNumericYear = Number.isInteger(Number(selectedYear)) ? Number(selectedYear) : null;
  const groups = createYearGroups();

  return `
    <div class="admission-year-picker" role="group" aria-label="入学年">
      ${orderGroupsForDisplay(groups, selectedNumericYear, currentYear)
        .map((group) => {
          const open = shouldOpenGroup(group, selectedNumericYear, currentYear) ? " open" : "";

          return `
            <details class="admission-year-group"${open}>
              <summary class="admission-year-summary">${group.label}</summary>
              <div class="admission-year-options">
                ${group.years
                  .map((year) => {
                    const checked = year === selectedNumericYear ? " checked" : "";

                    return `
                      <label class="admission-year-option">
                        <input type="radio" name="admission_year" value="${escapeAttribute(
                          year
                        )}" required${checked}>
                        ${formatYearLabel(year)}
                      </label>
                    `;
                  })
                  .join("")}
              </div>
            </details>
          `;
        })
        .join("")}
    </div>
  `;
}
