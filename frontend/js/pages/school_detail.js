import { fetchSchoolById } from "../api/schoolApi.js";
import { fetchPlayers } from "../api/playerApi.js";
import { deleteSchool, updateSchool } from "../api/schoolApi.js";
import { buildYearPicker, setupYearPickers } from "../components/admissionYearPicker.js";
import { PREFECTURE_GROUPS } from "../constants/prefectures.js";
import { formatDate, formatSchoolName, formatSchoolPlayStyle } from "../utils/formatter.js";

const CURRENT_CALENDAR_YEAR = new Date().getFullYear();
const PLAY_STYLE_OPTIONS = [
  { value: "continuous", label: "継続プレイ" },
  { value: "three_year", label: "3年モード" },
];

function getSchoolIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const schoolId = params.get("id");

  if (!schoolId) {
    throw new Error("学校IDが指定されていません。");
  }

  return schoolId;
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

function formatOptionalValue(value) {
  if (value === undefined || value === null || value === "") {
    return "未設定";
  }

  return String(value);
}

function formatYearValue(value) {
  return Number.isInteger(Number(value)) ? `${Number(value)}年` : "未設定";
}

function formatElapsedYears(startYear, currentYear) {
  const numericStartYear = Number(startYear);
  const numericCurrentYear = Number(currentYear);

  if (!Number.isInteger(numericStartYear) || !Number.isInteger(numericCurrentYear)) {
    return "未設定";
  }

  return `${numericCurrentYear - numericStartYear}年`;
}

function getPlayerTypeLabel(playerType) {
  const playerTypeMap = {
    normal: "通常",
    genius: "天才",
    reincarnated: "転生",
  };

  return playerTypeMap[playerType] ?? playerType ?? "不明";
}

function buildPlayStyleOptions(selectedValue) {
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

function renderSchoolError(root, message) {
  root.innerHTML = `
    <div class="message-box error-message">
      <p>学校情報の取得に失敗しました。</p>
      <p>${escapeHtml(message)}</p>
      <p><a href="./schools.html">学校一覧へ戻る</a></p>
    </div>
  `;
}

function renderPlayersError(root, message) {
  root.innerHTML = `
    <div class="message-box error-message">
      <p>選手一覧の取得に失敗しました。</p>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function renderSchoolSummary(root, school) {
  root.innerHTML = `
    <dl class="school-summary-grid">
      <div class="school-summary-row">
        <dt>学校名</dt>
        <dd>${escapeHtml(formatSchoolName(school.name))}</dd>
      </div>
      <div class="school-summary-row">
        <dt>都道府県</dt>
        <dd>${escapeHtml(formatOptionalValue(school.prefecture))}</dd>
      </div>
      <div class="school-summary-row">
        <dt>開始年度</dt>
        <dd>${escapeHtml(formatYearValue(school.start_year))}</dd>
      </div>
      <div class="school-summary-row">
        <dt>現在年度</dt>
        <dd>${escapeHtml(formatYearValue(school.current_year))}</dd>
      </div>
      <div class="school-summary-row">
        <dt>経過年数</dt>
        <dd>${escapeHtml(formatElapsedYears(school.start_year, school.current_year))}</dd>
      </div>
      <div class="school-summary-row">
        <dt>プレイ方針</dt>
        <dd>${escapeHtml(formatSchoolPlayStyle(school.play_style))}</dd>
      </div>
      <div class="school-summary-row">
        <dt>作成日時</dt>
        <dd>${escapeHtml(formatDate(school.created_at))}</dd>
      </div>
      <div class="school-summary-row">
        <dt>更新日時</dt>
        <dd>${escapeHtml(formatDate(school.updated_at))}</dd>
      </div>
      <div class="school-summary-row school-summary-row-full">
        <dt>メモ</dt>
        <dd>${escapeHtml(formatOptionalValue(school.memo))}</dd>
      </div>
    </dl>
  `;
}

function renderSchoolEditor(root, school, message = null) {
  const startYearIsLegacy = !Number.isInteger(Number(school.start_year));
  const initialStartYear = startYearIsLegacy ? CURRENT_CALENDAR_YEAR : Number(school.start_year);

  root.innerHTML = `
    <div id="school-form-message" class="message-box detail-message" hidden></div>
    <form id="school-edit-form" class="school-form">
      <div class="school-form-row">
        <label for="school-name">学校名</label>
        <div class="school-name-input">
          <input
            id="school-name"
            name="name"
            type="text"
            value="${escapeAttribute(school.name)}"
            placeholder="青葉"
            required
          >
          <span class="school-name-suffix" aria-hidden="true">高校</span>
        </div>
        <p class="field-help">DB には本体名のみ保存し、表示時に「高校」を付けます。</p>
      </div>
      <div class="school-form-row-group">
        <div class="school-form-row">
          <label for="school-prefecture">都道府県</label>
          <select id="school-prefecture" name="prefecture" required>
            ${buildGroupedOptions(PREFECTURE_GROUPS, school.prefecture ?? "")}
          </select>
        </div>
        <div class="school-form-row">
          <label for="school-play-style">プレイ方針</label>
          <select id="school-play-style" name="play_style" required>
            ${buildPlayStyleOptions(school.play_style)}
          </select>
        </div>
      </div>
      <div class="school-form-row">
        <span class="school-form-label">開始年度</span>
        <div class="school-form-control school-form-control--year">
          ${buildYearPicker({
            inputName: "start_year",
            inputId: "school-start-year",
            selectedYear: initialStartYear,
            currentYear: CURRENT_CALENDAR_YEAR,
            groupLabel: "開始年度",
          })}
        </div>
      </div>
      ${
        startYearIsLegacy
          ? '<p class="form-note">開始年度が未設定だったため、今年を初期表示しています。必要に応じて変更して保存してください。</p>'
          : ""
      }
      <div class="school-form-row">
        <label for="school-memo">メモ</label>
        <textarea id="school-memo" name="memo" rows="4">${escapeHtml(school.memo ?? "")}</textarea>
      </div>
      <p class="form-help">
        学校を削除すると学校は一覧から非表示になります。配下の選手データは保持され、将来機能から参照できる状態のまま残ります。
      </p>
      <div class="school-form-actions">
        <button type="submit" class="school-button school-button-primary">保存する</button>
        <button type="button" id="school-delete-button" class="school-button school-button-danger">学校を削除する</button>
        <a class="school-button school-button-secondary" href="./schools.html">学校一覧へ戻る</a>
      </div>
    </form>
  `;

  if (message) {
    const messageElement = root.querySelector("#school-form-message");
    setMessage(messageElement, message.text, message.type);
  }

  setupYearPickers(root);
}

function renderPlayers(root, players) {
  if (!Array.isArray(players) || players.length === 0) {
    root.innerHTML = `
      <div class="message-box empty-message">
        <p>登録された選手はいません</p>
      </div>
    `;
    return;
  }

  const rows = players
    .map(
      (player) => `
        <tr>
          <td>
            <a class="player-link" href="./player_detail.html?id=${encodeURIComponent(player.id)}">
              ${escapeHtml(player.name)}
            </a>
          </td>
          <td>${escapeHtml(player.grade)}</td>
          <td>${escapeHtml(player.main_position ?? "未設定")}</td>
          <td>${escapeHtml(getPlayerTypeLabel(player.player_type))}</td>
        </tr>
      `
    )
    .join("");

  root.innerHTML = `
    <div class="table-wrap">
      <table class="players-table">
        <thead>
          <tr>
            <th>名前</th>
            <th>学年</th>
            <th>メインポジション</th>
            <th>選手種別</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function getSchoolEditorElements(root) {
  return {
    form: root.querySelector("#school-edit-form"),
    messageElement: root.querySelector("#school-form-message"),
    deleteButton: root.querySelector("#school-delete-button"),
  };
}

function buildSchoolPayload(form) {
  return {
    name: form.elements.name.value,
    prefecture: form.elements.prefecture.value,
    play_style: form.elements.play_style.value,
    start_year: Number(form.elements.start_year.value),
    memo: form.elements.memo.value,
  };
}

function bindSchoolEditor(summaryRoot, editRoot, schoolId) {
  const { form, messageElement, deleteButton } = getSchoolEditorElements(editRoot);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');
    const payload = buildSchoolPayload(form);
    submitButton.disabled = true;
    setMessage(messageElement, "");

    try {
      const updatedSchool = await updateSchool(schoolId, payload);
      document.title = `${formatSchoolName(updatedSchool.name)} | 学校詳細`;
      renderSchoolSummary(summaryRoot, updatedSchool);
      renderSchoolEditor(editRoot, updatedSchool, {
        text: "学校情報を更新しました。",
        type: "success",
      });
      bindSchoolEditor(summaryRoot, editRoot, schoolId);
    } catch (error) {
      setMessage(messageElement, error.message, "error");
    } finally {
      submitButton.disabled = false;
    }
  });

  deleteButton.addEventListener("click", async () => {
    const shouldDelete = window.confirm(
      "この学校を削除します。学校は一覧から非表示になり、配下の選手データのみ保持されます。"
    );

    if (!shouldDelete) {
      return;
    }

    deleteButton.disabled = true;
    setMessage(messageElement, "");

    try {
      await deleteSchool(schoolId);
      window.location.href = "./schools.html?message=school-deleted";
    } catch (error) {
      deleteButton.disabled = false;
      setMessage(messageElement, error.message, "error");
    }
  });
}

async function init() {
  const summaryRoot = document.getElementById("school-summary-root");
  const editRoot = document.getElementById("school-edit-root");
  const playersRoot = document.getElementById("school-players-root");
  const playerRegisterLink = document.getElementById("player-register-link");

  playerRegisterLink.hidden = true;

  try {
    const schoolId = getSchoolIdFromQuery();
    const school = await fetchSchoolById(schoolId);

    document.title = `${formatSchoolName(school.name)} | 学校詳細`;
    renderSchoolSummary(summaryRoot, school);
    renderSchoolEditor(editRoot, school);
    bindSchoolEditor(summaryRoot, editRoot, schoolId);

    playerRegisterLink.href = `./player_register.html?school_id=${encodeURIComponent(schoolId)}`;
    playerRegisterLink.hidden = false;

    try {
      const players = await fetchPlayers({ schoolId });
      renderPlayers(playersRoot, players);
    } catch (error) {
      renderPlayersError(playersRoot, error.message);
    }
  } catch (error) {
    renderSchoolError(summaryRoot, error.message);
    editRoot.innerHTML = "";
    renderPlayersError(playersRoot, error.message);
  }
}

init();
