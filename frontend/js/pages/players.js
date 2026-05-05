import { fetchPlayers } from "../api/playerApi.js";
import { buildYearPicker, setYearPickerValue, setupYearPickers } from "../components/admissionYearPicker.js";

const SCHOOL_SUFFIX = "高校";
const DEFAULT_SORT_BY = "updated_at";
const DEFAULT_SORT_ORDER = "desc";
const PLAYER_SEARCH_QUERY_KEYS = [
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
  "sort_by",
  "sort_order",
  "sort",
];

const PLAYER_TYPE_OPTIONS = [
  { value: "normal", label: "通常" },
  { value: "genius", label: "天才" },
  { value: "reincarnated", label: "転生" },
];

const MAIN_POSITION_OPTIONS = ["投手", "捕手", "一塁手", "二塁手", "三塁手", "遊撃手", "外野手", "全野手", "全内野手"].map((position) => ({
  value: position,
  label: position,
}));

const SCHOOL_GRADE_OPTIONS = [
  { value: "1", label: "1年" },
  { value: "2", label: "2年" },
  { value: "3", label: "3年" },
];

const ROSTER_STATUS_OPTIONS = [
  { value: "active", label: "在籍" },
  { value: "graduated", label: "卒業" },
];

const SORT_OPTIONS = [
  { value: "updated_at:desc", sortBy: "updated_at", sortOrder: "desc", label: "更新日時が新しい順" },
  { value: "updated_at:asc", sortBy: "updated_at", sortOrder: "asc", label: "更新日時が古い順" },
  { value: "name:asc", sortBy: "name", sortOrder: "asc", label: "選手名 昇順" },
  { value: "name:desc", sortBy: "name", sortOrder: "desc", label: "選手名 降順" },
  { value: "admission_year:desc", sortBy: "admission_year", sortOrder: "desc", label: "入学年が新しい順" },
  { value: "admission_year:asc", sortBy: "admission_year", sortOrder: "asc", label: "入学年が古い順" },
  { value: "school_grade:asc", sortBy: "school_grade", sortOrder: "asc", label: "管理学年 昇順" },
  { value: "school_grade:desc", sortBy: "school_grade", sortOrder: "desc", label: "管理学年 降順" },
  { value: "roster_status:asc", sortBy: "roster_status", sortOrder: "asc", label: "在籍状態 昇順" },
  { value: "roster_status:desc", sortBy: "roster_status", sortOrder: "desc", label: "在籍状態 降順" },
];

let latestPlayersRequestId = 0;

function createDefaultSearchState() {
  return {
    name: "",
    schoolName: "",
    admissionYearFrom: "",
    admissionYearTo: "",
    playerType: "",
    mainPosition: "",
    schoolGrade: "",
    rosterStatus: "",
    sortBy: DEFAULT_SORT_BY,
    sortOrder: DEFAULT_SORT_ORDER,
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function buildSelectOptions(options, selectedValue = "", blankLabel = "すべて") {
  const blankSelected = selectedValue ? "" : " selected";
  const optionItems = options
    .map((option) => {
      const selected = option.value === selectedValue ? " selected" : "";
      return `<option value="${escapeAttribute(option.value)}"${selected}>${escapeHtml(option.label)}</option>`;
    })
    .join("");

  return `<option value=""${blankSelected}>${escapeHtml(blankLabel)}</option>${optionItems}`;
}

function serializeSortValue(sortBy = DEFAULT_SORT_BY, sortOrder = DEFAULT_SORT_ORDER) {
  return `${sortBy}:${sortOrder}`;
}

function parseSortValue(value = serializeSortValue()) {
  const matchedOption = SORT_OPTIONS.find((option) => option.value === value);

  return matchedOption
    ? { sortBy: matchedOption.sortBy, sortOrder: matchedOption.sortOrder }
    : { sortBy: DEFAULT_SORT_BY, sortOrder: DEFAULT_SORT_ORDER };
}

function buildSortOptions(selectedValue = serializeSortValue()) {
  return SORT_OPTIONS.map((option) => {
    const selected = option.value === selectedValue ? " selected" : "";
    return `<option value="${escapeAttribute(option.value)}"${selected}>${escapeHtml(option.label)}</option>`;
  }).join("");
}

function normalizeSearchState(searchState = {}) {
  const sortValue = serializeSortValue(searchState.sortBy, searchState.sortOrder);
  const { sortBy, sortOrder } = parseSortValue(sortValue);

  return {
    name: String(searchState.name ?? "").trim(),
    schoolName: String(searchState.schoolName ?? "").trim(),
    admissionYearFrom: String(searchState.admissionYearFrom ?? "").trim(),
    admissionYearTo: String(searchState.admissionYearTo ?? "").trim(),
    playerType: String(searchState.playerType ?? "").trim(),
    mainPosition: String(searchState.mainPosition ?? "").trim(),
    schoolGrade: String(searchState.schoolGrade ?? "").trim(),
    rosterStatus: String(searchState.rosterStatus ?? "").trim(),
    sortBy,
    sortOrder,
  };
}

function readSearchStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const sortBy = params.get("sort_by") ?? DEFAULT_SORT_BY;
  const sortOrder = params.get("sort_order") ?? DEFAULT_SORT_ORDER;
  const legacySort = params.get("sort");
  const parsedSort = legacySort ? parseSortValue(legacySort) : { sortBy, sortOrder };
  const legacyPositionType = params.get("position_type") ?? "";
  const mainPosition = params.get("main_position") || (legacyPositionType === "pitcher" ? "投手" : legacyPositionType === "fielder" ? "全野手" : "");
  const legacyAdmissionYear = params.get("admission_year") ?? "";

  return normalizeSearchState({
    name: params.get("name") ?? "",
    schoolName: params.get("school_name") ?? "",
    admissionYearFrom: params.get("admission_year_from") ?? legacyAdmissionYear,
    admissionYearTo: params.get("admission_year_to") ?? legacyAdmissionYear,
    playerType: params.get("player_type") ?? "",
    mainPosition,
    schoolGrade: params.get("school_grade") ?? "",
    rosterStatus: params.get("roster_status") ?? "",
    sortBy: parsedSort.sortBy,
    sortOrder: parsedSort.sortOrder,
  });
}

function buildPlayerListParams(searchState) {
  return {
    name: searchState.name,
    school_name: searchState.schoolName,
    admission_year_from: searchState.admissionYearFrom,
    admission_year_to: searchState.admissionYearTo,
    player_type: searchState.playerType,
    main_position: searchState.mainPosition,
    school_grade: searchState.schoolGrade,
    roster_status: searchState.rosterStatus,
    sort_by: searchState.sortBy,
    sort_order: searchState.sortOrder,
  };
}

function writeSearchStateToUrl(searchState, { replace = false } = {}) {
  const normalizedState = normalizeSearchState(searchState);
  const url = new URL(window.location.href);

  PLAYER_SEARCH_QUERY_KEYS.forEach((key) => url.searchParams.delete(key));

  Object.entries(buildPlayerListParams(normalizedState)).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  const method = replace ? "replaceState" : "pushState";
  window.history[method]({}, "", nextUrl);
}

function hasActiveSearchFilters(searchState) {
  return Boolean(
    searchState.name ||
      searchState.schoolName ||
      searchState.admissionYearFrom ||
      searchState.admissionYearTo ||
      searchState.playerType ||
      searchState.mainPosition ||
      searchState.schoolGrade ||
      searchState.rosterStatus
  );
}

function formatOptionalValue(value, fallback = "未設定") {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return String(value);
}

function formatSchoolDisplayName(value, fallback = "未設定") {
  const schoolName = String(value ?? "").trim();

  if (!schoolName) {
    return fallback;
  }

  return schoolName.endsWith(SCHOOL_SUFFIX) ? schoolName : `${schoolName}${SCHOOL_SUFFIX}`;
}

function formatYear(value) {
  return value === undefined || value === null || value === "" ? "未設定" : `${value}年`;
}

function formatAdmissionYearRange(searchState) {
  const yearFrom = searchState.admissionYearFrom;
  const yearTo = searchState.admissionYearTo;

  if (yearFrom && yearTo) {
    return yearFrom === yearTo ? `${yearFrom}年` : `${yearFrom}年〜${yearTo}年`;
  }

  if (yearFrom) {
    return `${yearFrom}年以降`;
  }

  if (yearTo) {
    return `${yearTo}年以前`;
  }

  return "";
}

function formatSchoolGrade(value) {
  return value === undefined || value === null || value === "" ? "未設定" : `${value}年`;
}

function getPositionType(player) {
  if (!player?.main_position) {
    return { label: "未設定", badgeClass: "" };
  }

  if (player.main_position === "投手") {
    return { label: "投手", badgeClass: "players-badge--pitcher" };
  }

  return { label: "野手", badgeClass: "players-badge--fielder" };
}

function formatRosterStatus(value) {
  const option = ROSTER_STATUS_OPTIONS.find((item) => item.value === value);
  return option?.label ?? formatOptionalValue(value);
}

function getRosterStatusBadgeClass(value) {
  if (value === "active") {
    return "players-badge--active";
  }

  if (value === "graduated") {
    return "players-badge--graduated";
  }

  return "";
}

function buildResultCountText(count, { hasFilters = false } = {}) {
  if (hasFilters) {
    return `${count}件の選手が条件に一致しました。`;
  }

  return `${count}件の選手を表示しています。`;
}

function getOptionLabel(options, value) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function getSortLabel(searchState) {
  const sortValue = serializeSortValue(searchState.sortBy, searchState.sortOrder);
  return SORT_OPTIONS.find((option) => option.value === sortValue)?.label ?? "更新日時が新しい順";
}

function buildActiveFilterItems(searchState) {
  const items = [];

  if (searchState.name) {
    items.push({ label: "選手名", value: searchState.name });
  }

  if (searchState.schoolName) {
    items.push({ label: "学校名", value: searchState.schoolName });
  }

  const admissionYearRange = formatAdmissionYearRange(searchState);

  if (admissionYearRange) {
    items.push({ label: "入学年", value: admissionYearRange });
  }

  if (searchState.playerType) {
    items.push({ label: "選手タイプ", value: getOptionLabel(PLAYER_TYPE_OPTIONS, searchState.playerType) });
  }

  if (searchState.mainPosition) {
    items.push({ label: "ポジション", value: getOptionLabel(MAIN_POSITION_OPTIONS, searchState.mainPosition) });
  }

  if (searchState.schoolGrade) {
    items.push({ label: "管理学年", value: getOptionLabel(SCHOOL_GRADE_OPTIONS, searchState.schoolGrade) });
  }

  if (searchState.rosterStatus) {
    items.push({ label: "在籍状態", value: getOptionLabel(ROSTER_STATUS_OPTIONS, searchState.rosterStatus) });
  }

  return items;
}

function renderActiveFilterSummary(searchState) {
  const activeFilters = buildActiveFilterItems(searchState);
  const hasActiveFilters = activeFilters.length > 0;
  const filterContent = activeFilters.length
    ? activeFilters
        .map(
          (item) => `
            <span class="players-filter-chip">
              <span class="players-filter-chip-label">${escapeHtml(item.label)}</span>
              <span class="players-filter-chip-value">${escapeHtml(item.value)}</span>
            </span>
          `
        )
        .join("")
    : '<span class="players-filter-empty">すべての選手を対象に表示</span>';

  return `
    <div class="players-current-filters ${hasActiveFilters ? "" : "players-current-filters--empty"}" aria-label="現在の表示条件">
      <div class="players-current-filters-row">
        <span class="players-current-filters-title">現在の条件</span>
        <div class="players-filter-chip-list">${filterContent}</div>
      </div>
      <div class="players-current-filters-row">
        <span class="players-current-filters-title">並び順</span>
        <span class="players-sort-chip">${escapeHtml(getSortLabel(searchState))}</span>
      </div>
    </div>
  `;
}

function buildOptionalAdmissionYearPicker({ name, id, label, value }) {
  const selectedYear = value || new Date().getFullYear();

  return `
    <div class="players-year-range-item">
      ${buildYearPicker({
        inputName: name,
        inputId: id,
        selectedYear,
        groupLabel: `入学年 ${label}`,
        selectionLabel: label,
        variant: "compact",
      })}
    </div>
  `;
}

function renderShell(root, searchState) {
  root.innerHTML = `
    <div id="players-page-message" class="players-message players-message--error" hidden></div>
    <div class="players-layout">
      <section class="players-panel players-panel--search">
        <div class="players-section-header">
          <h2 class="players-section-title">検索・絞り込み</h2>
          <p class="players-section-description">
            条件を入力して検索を適用すると、下の一覧とURLに反映されます。
          </p>
        </div>
        <form id="players-search-form" class="players-search-form">
          <div class="players-search-groups">
            <fieldset class="players-search-group">
              <legend>基本条件</legend>
              <div class="players-search-grid players-search-grid--basic">
                <div class="players-form-row players-search-field--wide">
                  <label for="player-search-name">選手名</label>
                  <input
                    id="player-search-name"
                    name="name"
                    type="text"
                    value="${escapeAttribute(searchState.name)}"
                    placeholder="例: 山田"
                  >
                </div>
                <div class="players-form-row players-search-field--mobile-wide">
                  <label for="player-search-school-name">学校名</label>
                  <input
                    id="player-search-school-name"
                    name="school_name"
                    type="text"
                    value="${escapeAttribute(searchState.schoolName)}"
                    placeholder="例: 栄冠"
                  >
                </div>
                <div class="players-form-row players-form-row--admission-year players-search-field--wide">
                  <div class="players-year-range-header">
                    <span class="players-form-label">範囲指定：入学年</span>
                    <button
                      type="button"
                      class="players-year-clear-button"
                      data-year-range-clear
                    >未指定に戻す</button>
                  </div>
                  <div class="players-year-range">
                    ${buildOptionalAdmissionYearPicker({
                      name: "admission_year_from",
                      id: "player-search-admission-year-from",
                      label: "開始年",
                      value: searchState.admissionYearFrom,
                    })}
                    <span class="players-year-range-separator" aria-hidden="true">~</span>
                    ${buildOptionalAdmissionYearPicker({
                      name: "admission_year_to",
                      id: "player-search-admission-year-to",
                      label: "終了年",
                      value: searchState.admissionYearTo,
                    })}
                  </div>
                </div>
              </div>
            </fieldset>

            <fieldset class="players-search-group">
              <legend>状態・表示</legend>
              <div class="players-search-grid">
                <div class="players-form-row">
                  <label for="player-search-player-type">選手タイプ</label>
                  <select id="player-search-player-type" name="player_type">
                    ${buildSelectOptions(PLAYER_TYPE_OPTIONS, searchState.playerType)}
                  </select>
                </div>
                <div class="players-form-row">
                  <label for="player-search-main-position">ポジション</label>
                  <select id="player-search-main-position" name="main_position">
                    ${buildSelectOptions(MAIN_POSITION_OPTIONS, searchState.mainPosition)}
                  </select>
                </div>
                <div class="players-form-row">
                  <label for="player-search-school-grade">管理学年</label>
                  <select id="player-search-school-grade" name="school_grade">
                    ${buildSelectOptions(SCHOOL_GRADE_OPTIONS, searchState.schoolGrade)}
                  </select>
                </div>
                <div class="players-form-row">
                  <label for="player-search-roster-status">在籍状態</label>
                  <select id="player-search-roster-status" name="roster_status">
                    ${buildSelectOptions(ROSTER_STATUS_OPTIONS, searchState.rosterStatus)}
                  </select>
                </div>
                <div class="players-form-row players-search-field--wide">
                  <label for="player-search-sort">並び順</label>
                  <select id="player-search-sort" name="sort">
                    ${buildSortOptions(serializeSortValue(searchState.sortBy, searchState.sortOrder))}
                  </select>
                </div>
              </div>
            </fieldset>
          </div>
          <div class="players-search-actions">
            <div class="players-search-action-buttons">
              <button type="submit" class="players-button players-button-primary">検索を適用</button>
              <button type="button" id="players-search-reset" class="players-button players-button-secondary">条件をクリア</button>
            </div>
            <p class="players-search-note">クリアすると並び順は「更新日時が新しい順」に戻ります。</p>
          </div>
        </form>
      </section>

      <section class="players-panel">
        <div class="players-section-header">
          <h2 class="players-section-title">検索結果</h2>
          <p class="players-section-description">
            選手名を押すと、選手詳細画面へ移動します。
          </p>
        </div>
        <div id="players-list-root">
          <p class="players-empty-message">選手一覧を読み込んでいます。</p>
        </div>
      </section>
    </div>
  `;
}

function renderPlayerRows(players) {
  return players
    .map((player) => {
      const positionType = getPositionType(player);
      const schoolHref = player.school_id
        ? `./school_detail.html?id=${encodeURIComponent(player.school_id)}`
        : "";

      return `
        <tr class="players-table-row">
          <td class="players-table-cell--name" data-label="選手名">
            <a class="players-table-link" href="./player_detail.html?id=${encodeURIComponent(player.id)}">
              ${escapeHtml(formatOptionalValue(player.name))}
            </a>
          </td>
          <td class="players-table-cell--school" data-label="学校名">
            ${
              schoolHref
                ? `<a class="players-table-link" href="${schoolHref}">${escapeHtml(formatSchoolDisplayName(player.school_name))}</a>`
                : escapeHtml(formatSchoolDisplayName(player.school_name))
            }
          </td>
          <td class="players-table-cell--position" data-label="ポジション">
            <span class="players-position-stack">
              <span class="players-badge ${positionType.badgeClass}">
                ${escapeHtml(positionType.label)}
              </span>
              <span class="players-table-subvalue">主: ${escapeHtml(formatOptionalValue(player.main_position))}</span>
            </span>
          </td>
          <td class="players-table-cell--status" data-label="学年/状態">
            <span class="players-status-stack">
              <span class="players-grade-chip">${escapeHtml(formatSchoolGrade(player.school_grade))}</span>
              <span class="players-badge ${getRosterStatusBadgeClass(player.roster_status)}">
                ${escapeHtml(formatRosterStatus(player.roster_status))}
              </span>
            </span>
          </td>
          <td class="players-table-cell--year" data-label="入学年">${escapeHtml(formatYear(player.admission_year))}</td>
        </tr>
      `;
    })
    .join("");
}

function renderPlayerList(root, players, { hasFilters = false, searchState = createDefaultSearchState() } = {}) {
  const safePlayers = Array.isArray(players) ? players : [];
  const normalizedSearchState = normalizeSearchState(searchState);
  const resultCountText = buildResultCountText(safePlayers.length, { hasFilters });

  if (safePlayers.length === 0) {
    root.innerHTML = `
      <div class="players-list-meta">
        <div>
          <p class="players-list-label">検索結果</p>
          <p class="players-list-count" aria-live="polite">${resultCountText}</p>
        </div>
      </div>
      ${renderActiveFilterSummary(normalizedSearchState)}
      <div class="players-empty-message">
        <p class="players-empty-title">
          ${hasFilters ? "条件に一致する選手はありません。" : "登録された選手はありません。"}
        </p>
        <p class="players-empty-copy">
          ${hasFilters ? "現在の条件を見直すか、条件をクリアして再表示してください。" : "選手を登録すると、この一覧に表示されます。"}
        </p>
      </div>
    `;
    return;
  }

  root.innerHTML = `
    <div class="players-list-meta">
      <div>
        <p class="players-list-label">検索結果</p>
        <p class="players-list-count" aria-live="polite">${resultCountText}</p>
      </div>
    </div>
    ${renderActiveFilterSummary(normalizedSearchState)}
    <div class="players-table-wrap">
      <table class="players-table">
        <thead>
          <tr>
            <th scope="col">選手名</th>
            <th scope="col">学校名</th>
            <th scope="col">ポジション</th>
            <th scope="col">学年 / 状態</th>
            <th scope="col">入学年</th>
          </tr>
        </thead>
        <tbody>${renderPlayerRows(safePlayers)}</tbody>
      </table>
    </div>
  `;
}

function setMessage(element, message = "", type = "error") {
  if (!element) {
    return;
  }

  element.textContent = message;
  element.hidden = !message;
  element.classList.toggle("players-message--error", type === "error");
}

async function loadPlayers(listRoot, messageElement, searchState) {
  const requestId = latestPlayersRequestId + 1;
  latestPlayersRequestId = requestId;
  listRoot.innerHTML = `<p class="players-empty-message">選手一覧を読み込んでいます。</p>`;

  try {
    const players = await fetchPlayers(buildPlayerListParams(searchState));

    if (requestId !== latestPlayersRequestId) {
      return;
    }

    renderPlayerList(listRoot, players, {
      hasFilters: hasActiveSearchFilters(searchState),
      searchState,
    });
    setMessage(messageElement, "");
  } catch (error) {
    if (requestId !== latestPlayersRequestId) {
      return;
    }

    listRoot.innerHTML = "";
    setMessage(messageElement, `選手一覧の取得に失敗しました。 ${error.message}`, "error");
  }
}

function readSearchStateFromForm(form) {
  const { sortBy, sortOrder } = parseSortValue(form.elements.sort.value);

  return normalizeSearchState({
    name: form.elements.name.value,
    schoolName: form.elements.school_name.value,
    admissionYearFrom: form.elements.admission_year_from.value,
    admissionYearTo: form.elements.admission_year_to.value,
    playerType: form.elements.player_type.value,
    mainPosition: form.elements.main_position.value,
    schoolGrade: form.elements.school_grade.value,
    rosterStatus: form.elements.roster_status.value,
    sortBy,
    sortOrder,
  });
}

function applySearchStateToForm(form, searchState) {
  form.elements.name.value = searchState.name;
  form.elements.school_name.value = searchState.schoolName;
  setOptionalYearPickerValue(form.elements.admission_year_from, searchState.admissionYearFrom);
  setOptionalYearPickerValue(form.elements.admission_year_to, searchState.admissionYearTo);
  form.elements.player_type.value = searchState.playerType;
  form.elements.main_position.value = searchState.mainPosition;
  form.elements.school_grade.value = searchState.schoolGrade;
  form.elements.roster_status.value = searchState.rosterStatus;
  form.elements.sort.value = serializeSortValue(searchState.sortBy, searchState.sortOrder);
}

function setOptionalYearPickerValue(input, value) {
  const picker = input?.closest("[data-year-picker]");

  if (!picker || !input) {
    return;
  }

  const normalizedValue = String(value ?? "").trim();
  const label = picker.querySelector("[data-year-label]");

  if (normalizedValue) {
    setYearPickerValue(picker, normalizedValue);
    picker.classList.remove("players-year-picker--empty");
    return;
  }

  input.value = "";
  picker.classList.add("players-year-picker--empty");

  if (label) {
    label.textContent = "未指定";
  }
}

function setupOptionalYearPickers(form) {
  setupYearPickers(form);

  form.querySelectorAll("[data-year-input]").forEach((input) => {
    setOptionalYearPickerValue(input, input.value);
  });

  form.addEventListener(
    "click",
    (event) => {
      const stepButton = event.target.closest("[data-year-step]");
      const clearButton = event.target.closest("[data-year-range-clear]");

      if (clearButton) {
        setOptionalYearPickerValue(form.elements.admission_year_from, "");
        setOptionalYearPickerValue(form.elements.admission_year_to, "");
        return;
      }

      if (!stepButton) {
        return;
      }

      const picker = stepButton.closest("[data-year-picker]");
      const input = picker?.querySelector("[data-year-input]");

      if (picker?.classList.contains("players-year-picker--empty") && input) {
        setYearPickerValue(picker, new Date().getFullYear());
        picker.classList.remove("players-year-picker--empty");
      }
    },
    true
  );
}

function init() {
  const root = document.getElementById("players-root");

  if (!root) {
    return;
  }

  const searchState = readSearchStateFromUrl();
  renderShell(root, searchState);

  const form = document.getElementById("players-search-form");
  const resetButton = document.getElementById("players-search-reset");
  const listRoot = document.getElementById("players-list-root");
  const messageElement = document.getElementById("players-page-message");

  setupOptionalYearPickers(form);
  applySearchStateToForm(form, searchState);
  writeSearchStateToUrl(searchState, { replace: true });
  loadPlayers(listRoot, messageElement, searchState);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const nextState = readSearchStateFromForm(form);

    writeSearchStateToUrl(nextState);
    loadPlayers(listRoot, messageElement, nextState);
  });

  resetButton.addEventListener("click", () => {
    const nextState = createDefaultSearchState();

    applySearchStateToForm(form, nextState);
    writeSearchStateToUrl(nextState);
    loadPlayers(listRoot, messageElement, nextState);
  });

  window.addEventListener("popstate", () => {
    const nextState = readSearchStateFromUrl();

    applySearchStateToForm(form, nextState);
    loadPlayers(listRoot, messageElement, nextState);
  });
}

init();
