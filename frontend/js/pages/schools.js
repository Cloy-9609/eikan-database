import { createSchool, fetchSchools } from "../api/schoolApi.js";
import { buildYearPicker, setYearPickerValue, setupYearPickers } from "../components/admissionYearPicker.js";
import { PREFECTURE_GROUPS } from "../constants/prefectures.js";
import { formatSchoolName, formatSchoolPlayStyle } from "../utils/formatter.js";

const DEFAULT_PLAY_STYLE = "continuous";
const DEFAULT_START_YEAR = new Date().getFullYear();
const PLAY_STYLE_OPTIONS = [
  { value: "continuous", label: "継続プレイ" },
  { value: "three_year", label: "3年モード" },
];

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

function buildPlayStyleOptions(selectedValue = DEFAULT_PLAY_STYLE) {
  return PLAY_STYLE_OPTIONS.map((option) => {
    const selected = option.value === selectedValue ? " selected" : "";
    return `<option value="${escapeAttribute(option.value)}"${selected}>${escapeHtml(option.label)}</option>`;
  }).join("");
}

function buildGroupedOptions(groups, selectedValue = "") {
  const blankSelected = !selectedValue ? " selected" : "";

  return `
    <option value=""${blankSelected}>選択してください</option>
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

function renderShell(root) {
  root.innerHTML = `
    <div id="schools-page-message" class="message-box page-message" hidden></div>
    <div class="schools-layout">
      <section class="schools-panel">
        <h2 class="section-title">学校作成</h2>
        <p class="section-description">学校の基本情報を登録します。学校名は本体名のみ入力してください。</p>
        <form id="school-create-form" class="school-form">
          <div class="school-form-row">
            <label for="school-name">学校名</label>
            <div class="school-name-input">
              <input id="school-name" name="name" type="text" required placeholder="青葉" aria-describedby="school-name-help">
              <span class="school-name-suffix" aria-hidden="true">高校</span>
            </div>
            <p id="school-name-help" class="field-help">DB には本体名のみ保存し、表示時に「高校」を付けます。</p>
          </div>
          <div class="school-form-row-group">
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
          <div class="school-form-row">
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
          <div class="school-form-row">
            <label for="school-memo">メモ</label>
            <textarea id="school-memo" name="memo" rows="4" placeholder="任意で学校メモを入力"></textarea>
          </div>
          <div class="school-form-actions">
            <button type="submit" class="school-button school-button-primary">学校を作成する</button>
          </div>
        </form>
      </section>

      <section class="schools-panel">
        <div class="section-header">
          <h2 class="section-title">学校一覧</h2>
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

function formatOptionalValue(value) {
  if (value === undefined || value === null || value === "") {
    return "未設定";
  }

  return String(value);
}

function renderSchoolList(root, schools) {
  if (!Array.isArray(schools) || schools.length === 0) {
    root.innerHTML = `
      <div class="message-box empty-message">
        <p>登録された学校はありません</p>
      </div>
    `;
    return;
  }

  const rows = schools
    .map(
      (school) => `
        <tr>
          <td>
            <a href="./school_detail.html?id=${encodeURIComponent(school.id)}">
              ${escapeHtml(formatSchoolName(school.name))}
            </a>
          </td>
          <td>${escapeHtml(formatOptionalValue(school.prefecture))}</td>
          <td>${escapeHtml(school.start_year ? `${school.start_year}年` : "未設定")}</td>
          <td>${escapeHtml(formatSchoolPlayStyle(school.play_style))}</td>
          <td>${escapeHtml(formatOptionalValue(school.memo))}</td>
        </tr>
      `
    )
    .join("");

  root.innerHTML = `
    <div class="table-wrap">
      <table class="schools-table">
        <thead>
          <tr>
            <th>学校名</th>
            <th>都道府県</th>
            <th>開始年度</th>
            <th>プレイ方針</th>
            <th>メモ</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

async function loadSchools(listRoot, listMessageElement) {
  try {
    const schools = await fetchSchools();
    renderSchoolList(listRoot, schools);
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

async function handleCreateSubmit(event, listRoot, pageMessageElement, listMessageElement) {
  event.preventDefault();

  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const payload = buildCreatePayload(form);

  submitButton.disabled = true;
  setMessage(pageMessageElement, "");

  try {
    await createSchool(payload);
    resetCreateForm(form);
    setMessage(pageMessageElement, "学校を登録しました。", "success");
    await loadSchools(listRoot, listMessageElement);
  } catch (error) {
    setMessage(pageMessageElement, error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
}

async function init() {
  const root = document.getElementById("schools-root");
  renderShell(root);
  setupYearPickers(root);

  const pageMessageElement = document.getElementById("schools-page-message");
  const listMessageElement = document.getElementById("schools-list-message");
  const listRoot = document.getElementById("schools-list-root");
  const createForm = document.getElementById("school-create-form");

  const flashMessage = getFlashMessage();
  if (flashMessage) {
    setMessage(pageMessageElement, flashMessage, "success");
    clearFlashMessage();
  }

  createForm.addEventListener("submit", (event) =>
    handleCreateSubmit(event, listRoot, pageMessageElement, listMessageElement)
  );

  await loadSchools(listRoot, listMessageElement);
}

init();
