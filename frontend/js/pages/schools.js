import { createSchool, fetchSchools } from "../api/schoolApi.js";
import { buildYearPicker, setYearPickerValue, setupYearPickers } from "../components/admissionYearPicker.js";
import { PREFECTURE_GROUPS } from "../constants/prefectures.js";
import { formatSchoolName, formatSchoolPlayStyle } from "../utils/formatter.js";

const SCHOOL_SUFFIX = "高校";
const CREATE_PANEL_BODY_ID = "school-create-panel-body";
const DEFAULT_PLAY_STYLE = "continuous";
const DEFAULT_START_YEAR = new Date().getFullYear();
const DEFAULT_SORT_BY = "updated_at";
const DEFAULT_SORT_ORDER = "desc";
const PLAY_STYLE_OPTIONS = [
  { value: "continuous", label: "継続プレイ" },
  { value: "three_year", label: "3年モード" },
];
const SORT_OPTIONS = [
  { value: "updated_at:desc", sortBy: "updated_at", sortOrder: "desc", label: "更新日時降順" },
  { value: "updated_at:asc", sortBy: "updated_at", sortOrder: "asc", label: "更新日時昇順" },
  { value: "name:asc", sortBy: "name", sortOrder: "asc", label: "名前昇順" },
  { value: "name:desc", sortBy: "name", sortOrder: "desc", label: "名前降順" },
  { value: "start_year:asc", sortBy: "start_year", sortOrder: "asc", label: "開始年度昇順" },
  { value: "start_year:desc", sortBy: "start_year", sortOrder: "desc", label: "開始年度降順" },
];
const SCHOOL_SEARCH_QUERY_KEYS = ["name", "prefecture", "play_style", "sort_by", "sort_order", "sort"];

function createDefaultSearchState() {
  return {
    name: "",
    prefecture: "",
    playStyle: "",
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

function buildPlayStyleOptions(
  selectedValue = DEFAULT_PLAY_STYLE,
  { includeBlank = false, blankLabel = "選択してください" } = {}
) {
  const options = includeBlank ? [`<option value="">${escapeHtml(blankLabel)}</option>`] : [];

  return options
    .concat(
      PLAY_STYLE_OPTIONS.map((option) => {
        const selected = option.value === selectedValue ? " selected" : "";
        return `<option value="${escapeAttribute(option.value)}"${selected}>${escapeHtml(option.label)}</option>`;
      })
    )
    .join("");
}

function buildGroupedOptions(groups, selectedValue = "", blankLabel = "選択してください") {
  const blankSelected = !selectedValue ? " selected" : "";

  return `
    <option value=""${blankSelected}>${escapeHtml(blankLabel)}</option>
    ${groups
      .map(
        (group) => `
          <optgroup label="${escapeAttribute(group.label)}">
            ${group.options
              .map((option) => {
                const selected = option === selectedValue ? " selected" : "";
                return `<option value="${escapeAttribute(option)}"${selected}>${option}</option>`;
              })
              .join("")}
          </optgroup>
        `
      )
      .join("")}
  `;
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

function normalizeSearchState(searchState = {}) {
  const sortValue = serializeSortValue(searchState.sortBy, searchState.sortOrder);
  const { sortBy, sortOrder } = parseSortValue(sortValue);

  return {
    name: String(searchState.name ?? "").trim(),
    prefecture: String(searchState.prefecture ?? "").trim(),
    playStyle: String(searchState.playStyle ?? "").trim(),
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

  return normalizeSearchState({
    name: params.get("name") ?? "",
    prefecture: params.get("prefecture") ?? "",
    playStyle: params.get("play_style") ?? "",
    sortBy: parsedSort.sortBy,
    sortOrder: parsedSort.sortOrder,
  });
}

function writeSearchStateToUrl(searchState, { replace = false } = {}) {
  const normalizedState = normalizeSearchState(searchState);
  const url = new URL(window.location.href);

  SCHOOL_SEARCH_QUERY_KEYS.forEach((key) => url.searchParams.delete(key));

  const params = buildSchoolListParams(normalizedState);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  const method = replace ? "replaceState" : "pushState";
  window.history[method]({}, "", nextUrl);
}

function buildSortOptions(selectedValue = serializeSortValue()) {
  return SORT_OPTIONS.map((option) => {
    const selected = option.value === selectedValue ? " selected" : "";
    return `<option value="${escapeAttribute(option.value)}"${selected}>${escapeHtml(option.label)}</option>`;
  }).join("");
}

function normalizeSchoolSearchName(value) {
  const text = String(value ?? "").trim();

  if (!text) {
    return "";
  }

  const normalizedName = text.endsWith(SCHOOL_SUFFIX) ? text.slice(0, -SCHOOL_SUFFIX.length).trim() : text;
  return normalizedName;
}

function buildSchoolListParams(searchState) {
  return {
    name: normalizeSchoolSearchName(searchState.name),
    prefecture: searchState.prefecture,
    play_style: searchState.playStyle,
    sort_by: searchState.sortBy,
    sort_order: searchState.sortOrder,
  };
}

function hasActiveSearchFilters(searchState) {
  return Boolean(normalizeSchoolSearchName(searchState.name) || searchState.prefecture || searchState.playStyle);
}

function renderShell(root, searchState) {
  root.innerHTML = `
    <div id="schools-page-message" class="message-box page-message" hidden></div>
    <div class="schools-layout">
      <section class="schools-panel schools-panel--create">
        <h2 class="schools-panel-heading">
          <button
            type="button"
            id="school-create-toggle"
            class="schools-accordion-toggle"
            aria-expanded="true"
            aria-controls="${CREATE_PANEL_BODY_ID}"
          >
            <span class="schools-accordion-copy">
              <span class="schools-accordion-title">学校作成</span>
              <span class="schools-accordion-description">基本情報を入力して学校を追加します。</span>
            </span>
            <span class="schools-accordion-icon" aria-hidden="true"></span>
          </button>
        </h2>
        <div id="${CREATE_PANEL_BODY_ID}" class="schools-accordion-body">
          <form id="school-create-form" class="school-form school-form--create">
            <div class="school-form-row">
              <label for="school-name">学校名</label>
              <div class="school-name-input">
                <input
                  id="school-name"
                  name="name"
                  type="text"
                  required
                  placeholder="青葉"
                  aria-describedby="school-name-help"
                >
                <span class="school-name-suffix" aria-hidden="true">高校</span>
              </div>
              <p id="school-name-help" class="field-help">保存時は本体名のみを保持し、表示時に高校を付けます。</p>
            </div>
            <div class="school-form-row-group school-form-row-group--pair">
              <div class="school-form-row">
                <label for="school-prefecture">都道府県</label>
                <select id="school-prefecture" name="prefecture" required>
                  ${buildGroupedOptions(PREFECTURE_GROUPS)}
                </select>
              </div>
              <div class="school-form-row">
                <label for="school-play-style">プレイ方針</label>
                <select id="school-play-style" name="play_style" required>
                  ${buildPlayStyleOptions()}
                </select>
              </div>
            </div>
            <div class="school-form-row-group school-form-row-group--detail">
              <div class="school-form-row school-form-row--year">
                <span class="school-form-label">開始年度</span>
                <div class="school-form-control school-form-control--year">
                  ${buildYearPicker({
                    inputName: "start_year",
                    inputId: "school-start-year",
                    currentYear: DEFAULT_START_YEAR,
                    groupLabel: "開始年度",
                    variant: "compact",
                  })}
                </div>
              </div>
              <div class="school-form-row school-form-row--memo">
                <label for="school-memo">メモ</label>
                <textarea id="school-memo" name="memo" rows="4" placeholder="任意で学校メモを入力"></textarea>
              </div>
            </div>
            <div class="school-form-actions">
              <button type="submit" class="school-button school-button-primary">学校を作成する</button>
            </div>
          </form>
        </div>
      </section>

      <section class="schools-panel schools-panel--search">
        <div class="section-header section-header--stack">
          <div>
            <h2 class="section-title">検索・ソート</h2>
            <p class="section-description">学校一覧を条件で絞り込み、表示順を切り替えます。</p>
          </div>
        </div>
        <form id="schools-search-form" class="school-search-form">
          <div class="school-search-grid">
            <div class="school-form-row school-search-field school-search-field--name">
              <label for="school-search-name">学校名</label>
              <div class="school-name-input school-name-input--search">
                <input
                  id="school-search-name"
                  name="name"
                  type="text"
                  value="${escapeAttribute(searchState.name)}"
                  placeholder="青葉"
                >
                <span class="school-name-suffix" aria-hidden="true">高校</span>
              </div>
            </div>
            <div class="school-form-row">
              <label for="school-search-prefecture">都道府県</label>
              <select id="school-search-prefecture" name="prefecture">
                ${buildGroupedOptions(PREFECTURE_GROUPS, searchState.prefecture, "すべて")}
              </select>
            </div>
            <div class="school-form-row">
              <label for="school-search-play-style">プレイ方針</label>
              <select id="school-search-play-style" name="play_style">
                ${buildPlayStyleOptions(searchState.playStyle, { includeBlank: true, blankLabel: "すべて" })}
              </select>
            </div>
            <div class="school-form-row school-search-field school-search-field--sort">
              <label for="school-search-sort">並び順</label>
              <select id="school-search-sort" name="sort">
                ${buildSortOptions(serializeSortValue(searchState.sortBy, searchState.sortOrder))}
              </select>
            </div>
          </div>
          <div class="school-form-actions school-search-actions">
            <button type="submit" class="school-button school-button-primary">適用する</button>
            <button type="button" id="schools-search-reset" class="school-button school-button-secondary">リセット</button>
          </div>
        </form>
      </section>

      <section class="schools-panel schools-panel--list">
        <div class="section-header section-header--stack">
          <div>
            <h2 class="section-title">学校一覧</h2>
            <p class="section-description">登録済みの学校を確認します。</p>
          </div>
        </div>
        <div id="schools-list-message" class="message-box list-message" hidden></div>
        <div id="schools-list-root"></div>
      </section>
    </div>
  `;
}

function setMessage(element, message, type = "") {
  element.hidden = !message;
  element.textContent = message;
  element.classList.remove("error-message", "success-message");

  if (!message) {
    return;
  }

  if (type === "error") {
    element.classList.add("error-message");
  } else if (type === "success") {
    element.classList.add("success-message");
  }
}

function setAccordionExpanded(toggleButton, panelBody, expanded) {
  toggleButton.setAttribute("aria-expanded", String(expanded));
  panelBody.hidden = !expanded;
}

function setButtonsDisabled(buttons, disabled) {
  buttons.forEach((button) => {
    if (button) {
      button.disabled = disabled;
    }
  });
}

function formatOptionalValue(value) {
  if (value === undefined || value === null || value === "") {
    return "未設定";
  }

  return String(value);
}

function formatStartYear(value) {
  if (value === undefined || value === null || value === "") {
    return "未設定";
  }

  const year = Number(value);
  return Number.isInteger(year) ? `${year}年` : "未設定";
}

function buildResultCountText(count, { hasFilters = false } = {}) {
  return hasFilters ? `検索結果 ${count}件` : `表示中: ${count}件`;
}

function buildMemoPreviewText(value) {
  const normalizedMemo = String(value).replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  const lines = normalizedMemo.split("\n");
  const firstLine = lines[0] ?? "";
  const hasAdditionalContent = lines
    .slice(1)
    .some((line) => line.trim() !== "");

  return hasAdditionalContent ? `${firstLine}…` : firstLine;
}

function renderMemoPreview(value) {
  if (value === undefined || value === null || value === "") {
    return '<span class="schools-table-note schools-table-note--empty">未設定</span>';
  }

  const memo = String(value);
  const previewText = buildMemoPreviewText(memo);
  return `
    <span class="schools-table-note" title="${escapeAttribute(memo)}">
      <span class="schools-table-note-text">${escapeHtml(previewText)}</span>
    </span>
  `;
}

function renderSchoolList(root, schools, { hasFilters = false } = {}) {
  const safeSchools = Array.isArray(schools) ? schools : [];
  const resultCountText = buildResultCountText(safeSchools.length, { hasFilters });

  if (safeSchools.length === 0) {
    root.innerHTML = `
      <div class="schools-list-meta">
        <p class="schools-list-count" aria-live="polite">${resultCountText}</p>
      </div>
      <div class="message-box empty-message">
        <p>${hasFilters ? "条件に一致する学校はありません。" : "登録された学校はありません。"}</p>
      </div>
    `;
    return;
  }

  const rows = safeSchools
    .map(
      (school) => `
        <tr class="schools-table-row">
          <td class="schools-table-cell schools-table-cell--name">
            <a class="schools-table-link" href="./school_detail.html?id=${encodeURIComponent(school.id)}">
              ${escapeHtml(formatSchoolName(school.name))}
            </a>
          </td>
          <td class="schools-table-cell">${escapeHtml(formatOptionalValue(school.prefecture))}</td>
          <td class="schools-table-cell schools-table-cell--year">${escapeHtml(formatStartYear(school.start_year))}</td>
          <td class="schools-table-cell schools-table-cell--play-style">${escapeHtml(formatSchoolPlayStyle(school.play_style))}</td>
          <td class="schools-table-cell schools-table-cell--memo">${renderMemoPreview(school.memo)}</td>
        </tr>
      `
    )
    .join("");

  root.innerHTML = `
    <div class="schools-list-meta">
      <p class="schools-list-count" aria-live="polite">${resultCountText}</p>
    </div>
    <div class="table-wrap">
      <table class="schools-table">
        <thead>
          <tr>
            <th scope="col">学校名</th>
            <th scope="col">都道府県</th>
            <th scope="col">開始年度</th>
            <th scope="col">プレイ方針</th>
            <th scope="col">メモ</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

async function loadSchools(listRoot, listMessageElement, searchState) {
  try {
    const schools = await fetchSchools(buildSchoolListParams(searchState));
    renderSchoolList(listRoot, schools, {
      hasFilters: hasActiveSearchFilters(searchState),
    });
    setMessage(listMessageElement, "");
  } catch (error) {
    listRoot.innerHTML = "";
    setMessage(listMessageElement, `学校一覧の取得に失敗しました。 ${error.message}`, "error");
  }
}

function getFlashMessage() {
  const params = new URLSearchParams(window.location.search);
  const message = params.get("message");

  if (message === "school-deleted") {
    return "学校を削除しました。配下の選手データは保持されています。";
  }

  return "";
}

function clearFlashMessage() {
  const url = new URL(window.location.href);

  if (!url.searchParams.has("message")) {
    return;
  }

  url.searchParams.delete("message");
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, "", nextUrl);
}

function buildCreatePayload(form) {
  return {
    name: form.elements.name.value,
    prefecture: form.elements.prefecture.value,
    play_style: form.elements.play_style.value,
    start_year: Number(form.elements.start_year.value),
    memo: form.elements.memo.value,
  };
}

function resetCreateForm(form) {
  form.reset();
  form.elements.prefecture.value = "";
  form.elements.play_style.value = DEFAULT_PLAY_STYLE;
  setYearPickerValue(form.querySelector("[data-year-picker]"), DEFAULT_START_YEAR);
}

function readSearchStateFromForm(form) {
  const { sortBy, sortOrder } = parseSortValue(form.elements.sort.value);

  return normalizeSearchState({
    name: form.elements.name.value,
    prefecture: form.elements.prefecture.value,
    playStyle: form.elements.play_style.value,
    sortBy,
    sortOrder,
  });
}

function applySearchStateToForm(form, searchState) {
  form.elements.name.value = searchState.name;
  form.elements.prefecture.value = searchState.prefecture;
  form.elements.play_style.value = searchState.playStyle;
  form.elements.sort.value = serializeSortValue(searchState.sortBy, searchState.sortOrder);
}

async function handleCreateSubmit(
  event,
  {
    listRoot,
    pageMessageElement,
    listMessageElement,
    searchState,
    accordionToggle,
    accordionBody,
  }
) {
  event.preventDefault();

  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const payload = buildCreatePayload(form);

  submitButton.disabled = true;
  setMessage(pageMessageElement, "");

  try {
    await createSchool(payload);
    resetCreateForm(form);
    setAccordionExpanded(accordionToggle, accordionBody, true);
    setMessage(pageMessageElement, "学校を登録しました。", "success");
    await loadSchools(listRoot, listMessageElement, searchState);
  } catch (error) {
    setMessage(pageMessageElement, error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
}

async function handleSearchSubmit(event, { listRoot, listMessageElement, searchState, resetButton }) {
  event.preventDefault();

  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  setButtonsDisabled([submitButton, resetButton], true);

  try {
    Object.assign(searchState, readSearchStateFromForm(form));
    writeSearchStateToUrl(searchState);
    await loadSchools(listRoot, listMessageElement, searchState);
  } finally {
    setButtonsDisabled([submitButton, resetButton], false);
  }
}

async function handleSearchReset(form, { listRoot, listMessageElement, searchState, resetButton }) {
  const submitButton = form.querySelector('button[type="submit"]');
  setButtonsDisabled([submitButton, resetButton], true);

  try {
    Object.assign(searchState, createDefaultSearchState());
    applySearchStateToForm(form, searchState);
    writeSearchStateToUrl(searchState);
    await loadSchools(listRoot, listMessageElement, searchState);
  } finally {
    setButtonsDisabled([submitButton, resetButton], false);
  }
}

async function init() {
  const root = document.getElementById("schools-root");
  const searchState = readSearchStateFromUrl();
  renderShell(root, searchState);
  setupYearPickers(root);

  const pageMessageElement = document.getElementById("schools-page-message");
  const listMessageElement = document.getElementById("schools-list-message");
  const listRoot = document.getElementById("schools-list-root");
  const createForm = document.getElementById("school-create-form");
  const searchForm = document.getElementById("schools-search-form");
  const searchResetButton = document.getElementById("schools-search-reset");
  const accordionToggle = document.getElementById("school-create-toggle");
  const accordionBody = document.getElementById(CREATE_PANEL_BODY_ID);

  const flashMessage = getFlashMessage();
  if (flashMessage) {
    setMessage(pageMessageElement, flashMessage, "success");
    clearFlashMessage();
  }

  accordionToggle.addEventListener("click", () => {
    const expanded = accordionToggle.getAttribute("aria-expanded") === "true";
    setAccordionExpanded(accordionToggle, accordionBody, !expanded);
  });

  createForm.addEventListener("submit", (event) =>
    handleCreateSubmit(event, {
      listRoot,
      pageMessageElement,
      listMessageElement,
      searchState,
      accordionToggle,
      accordionBody,
    })
  );

  searchForm.addEventListener("submit", (event) =>
    handleSearchSubmit(event, {
      listRoot,
      listMessageElement,
      searchState,
      resetButton: searchResetButton,
    })
  );

  searchResetButton.addEventListener("click", () =>
    handleSearchReset(searchForm, {
      listRoot,
      listMessageElement,
      searchState,
      resetButton: searchResetButton,
    })
  );

  window.addEventListener("popstate", async () => {
    Object.assign(searchState, readSearchStateFromUrl());
    applySearchStateToForm(searchForm, searchState);
    await loadSchools(listRoot, listMessageElement, searchState);
  });

  writeSearchStateToUrl(searchState, { replace: true });
  await loadSchools(listRoot, listMessageElement, searchState);
}

init();
