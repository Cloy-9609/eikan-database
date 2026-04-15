import { createSchool, fetchSchools } from "../api/schoolApi.js";

const DEFAULT_PLAY_STYLE = "continuous";
const PLAY_STYLE_OPTIONS = [
  { value: "continuous", label: "継続プレイ" },
  { value: "three_year", label: "3年縛り" },
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

function getPlayStyleLabel(playStyle) {
  return playStyle === "three_year" ? "3年縛り" : "継続プレイ";
}

function buildPlayStyleOptions(selectedValue = DEFAULT_PLAY_STYLE) {
  return PLAY_STYLE_OPTIONS.map((option) => {
    const selected = option.value === selectedValue ? " selected" : "";
    return `<option value="${escapeAttribute(option.value)}"${selected}>${escapeHtml(option.label)}</option>`;
  }).join("");
}

function renderShell(root) {
  root.innerHTML = `
    <div id="schools-page-message" class="message-box page-message" hidden></div>
    <div class="schools-layout">
      <section class="schools-panel">
        <h2 class="section-title">学校作成</h2>
        <p class="section-description">学校名、プレイ方針、メモを登録できます。</p>
        <form id="school-create-form" class="school-form">
          <div class="school-form-row">
            <label for="school-name">学校名</label>
            <input id="school-name" name="name" type="text" required>
          </div>
          <div class="school-form-row">
            <label for="school-play-style">プレイ方針</label>
            <select id="school-play-style" name="play_style" required>
              ${buildPlayStyleOptions()}
            </select>
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
              ${escapeHtml(school.name)}
            </a>
          </td>
          <td>${escapeHtml(getPlayStyleLabel(school.play_style))}</td>
          <td>${escapeHtml(school.memo ?? "")}</td>
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
    play_style: form.elements.play_style.value,
    memo: form.elements.memo.value,
  };
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
    form.reset();
    form.elements.play_style.value = DEFAULT_PLAY_STYLE;
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
