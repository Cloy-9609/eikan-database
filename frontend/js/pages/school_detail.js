import { fetchSchoolById } from "../api/schoolApi.js";
import { deleteSchool, fetchSchoolPlayerSeriesSummaries, progressSchoolYear, updateSchool } from "../api/schoolApi.js";
import { buildYearPicker, setupYearPickers } from "../components/admissionYearPicker.js";
import { PREFECTURE_GROUPS } from "../constants/prefectures.js";
import { formatDate, formatSchoolName } from "../utils/formatter.js";

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

function formatPlayerGrade(value) {
  const numericValue = Number(value);
  return Number.isInteger(numericValue) ? `${numericValue}年` : formatOptionalValue(value);
}

function getRosterStatusLabel(rosterStatus) {
  if (rosterStatus === "graduated") {
    return "卒業";
  }

  if (rosterStatus === "active") {
    return "在籍";
  }

  return "未設定";
}

function getGraduatedRosterYear(playerSeriesSummary, school) {
  const currentYear = Number(school?.current_year);
  const admissionYear = Number(playerSeriesSummary?.admissionYear);

  if (!Number.isInteger(currentYear) || !Number.isInteger(admissionYear)) {
    return null;
  }

  return currentYear - admissionYear + 1;
}

function formatRetirementSummer(playerSeriesSummary) {
  const admissionYear = Number(playerSeriesSummary?.admissionYear);

  if (!Number.isInteger(admissionYear)) {
    return "夏";
  }

  return `${admissionYear + 2}夏`;
}

function getSchoolGradeDisplay(playerSeriesSummary, school) {
  if (playerSeriesSummary?.rosterStatus !== "graduated") {
    return {
      gradeText: formatPlayerGrade(playerSeriesSummary?.schoolGrade),
      badgeText: getRosterStatusLabel(playerSeriesSummary?.rosterStatus ?? "active"),
      badgeClass: "status-badge",
    };
  }

  const graduatedRosterYear = getGraduatedRosterYear(playerSeriesSummary, school);
  const isOb = Number.isInteger(graduatedRosterYear) && graduatedRosterYear > 4;
  const retirementSummer = formatRetirementSummer(playerSeriesSummary);

  return {
    gradeText: `${isOb ? "既卒" : "引退"} / ${retirementSummer}`,
    badgeText: isOb ? "OB" : "卒業",
    badgeClass: isOb ? "status-badge status-badge--ob" : "status-badge status-badge--graduated",
  };
}

function formatSnapshotSummary(playerSeriesSummary) {
  if (!playerSeriesSummary?.hasSnapshot) {
    return "最新snapshot未登録";
  }

  const label = playerSeriesSummary.latestSnapshotLabelDisplay ?? "snapshot";
  const grade = formatPlayerGrade(playerSeriesSummary.latestSnapshotGrade);
  return `${label} / snapshot学年 ${grade}`;
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
      <p>
        <a class="school-button school-button-secondary" href="./schools.html">学校一覧へ戻る</a>
      </p>
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

function renderSummaryRow({ label, value, classes = "school-summary-row", valueClass = "" }) {
  return `
    <div class="${classes}">
      <dt>${escapeHtml(label)}</dt>
      <dd class="${valueClass}">${escapeHtml(value)}</dd>
    </div>
  `;
}

function renderSchoolSummary(root, school) {
  const summaryRows = [
    {
      label: "学校名",
      value: formatSchoolName(school.name),
      classes: "school-summary-row school-summary-row--name",
    },
    {
      label: "都道府県",
      value: formatOptionalValue(school.prefecture),
    },
    {
      label: "開始年度",
      value: formatYearValue(school.start_year),
    },
    {
      label: "現在年度",
      value: formatYearValue(school.current_year),
    },
    {
      label: "経過年数",
      value: formatElapsedYears(school.start_year, school.current_year),
    },
    {
      label: "作成日時",
      value: formatDate(school.created_at),
    },
    {
      label: "更新日時",
      value: formatDate(school.updated_at),
    },
    {
      label: "メモ",
      value: formatOptionalValue(school.memo),
      classes: "school-summary-row school-summary-row-full",
      valueClass: "school-summary-value--memo",
    },
  ];

  root.innerHTML = `
    <dl class="school-summary-grid">
      ${summaryRows.map((row) => renderSummaryRow(row)).join("")}
    </dl>
  `;
}

function getProgressionBaseYear(school) {
  const currentYear = Number(school.current_year);

  if (Number.isInteger(currentYear)) {
    return currentYear;
  }

  const startYear = Number(school.start_year);
  return Number.isInteger(startYear) ? startYear : null;
}

function buildProgressionMessage(progression) {
  if (!progression) {
    return null;
  }

  return {
    type: "success",
    text:
      `${progression.previousYear}年から${progression.currentYear}年へ進行しました。` +
      `進級 ${progression.advancedCount}人、卒業 ${progression.graduatedCount}人、` +
      `既卒(OB) ${progression.alreadyGraduatedCount}人、snapshot作成 ${progression.snapshotsCreated}件です。`,
  };
}

function renderProgressionPanel(root, school, progression = null, message = null) {
  const baseYear = getProgressionBaseYear(school);
  const nextYear = baseYear === null ? null : baseYear + 1;
  const messageData = message ?? buildProgressionMessage(progression);
  const isYearLimitReached = Number.isInteger(baseYear) && baseYear >= 2039;
  const canProgress = Number.isInteger(baseYear) && !isYearLimitReached;

  root.innerHTML = `
    <div id="school-progression-message" class="message-box detail-message" hidden></div>
    <div class="progression-panel">
      <div class="progression-summary">
        <div class="progression-summary-item">
          <span class="progression-label">現在年度</span>
          <strong>${escapeHtml(formatYearValue(baseYear))}</strong>
        </div>
        <div class="progression-summary-item">
          <span class="progression-label">進行後</span>
          <strong>${escapeHtml(formatYearValue(nextYear))}</strong>
        </div>
        <div class="progression-summary-item">
          <span class="progression-label">snapshot作成</span>
          <strong>0件</strong>
        </div>
      </div>
      <p class="progression-note">
        実行すると学校の現在年度と在籍選手の学校管理学年だけを更新します。能力値・時点snapshot・relation情報は変更しません。
      </p>
      <div class="progression-actions">
        <button
          type="button"
          id="school-progress-year-button"
          class="school-button school-button-primary"
          ${canProgress ? "" : "disabled"}
        >
          1年経過を実行
        </button>
      </div>
      ${
        isYearLimitReached
          ? '<p class="progression-note progression-note--limit">現在年度が上限のため、この画面からは年度進行できません。</p>'
          : ""
      }
    </div>
  `;

  if (messageData) {
    const messageElement = root.querySelector("#school-progression-message");
    setMessage(messageElement, messageData.text, messageData.type);
  }
}

function renderSchoolEditor(root, school, message = null) {
  const startYearIsLegacy = !Number.isInteger(Number(school.start_year));
  const schoolCurrentYear = getProgressionBaseYear(school) ?? CURRENT_CALENDAR_YEAR;
  const initialStartYear = startYearIsLegacy ? schoolCurrentYear : Number(school.start_year);

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
      <div class="school-form-row school-form-row--year">
        <span class="school-form-label">開始年度</span>
        <div class="school-form-control school-form-control--year">
          ${buildYearPicker({
            inputName: "start_year",
            inputId: "school-start-year",
            selectedYear: initialStartYear,
            currentYear: schoolCurrentYear,
            groupLabel: "開始年度",
            variant: "compact",
          })}
        </div>
        <p class="field-help">現在年度はここでは直接変更せず、「年度進行」から更新します。</p>
      </div>
      ${
        startYearIsLegacy
          ? '<p class="form-note">開始年度が未設定だったため、今年を初期表示しています。必要に応じて変更して保存してください。</p>'
          : ""
      }
      <div class="school-form-row school-form-row--memo">
        <label for="school-memo">メモ</label>
        <textarea id="school-memo" name="memo" rows="4">${escapeHtml(school.memo ?? "")}</textarea>
      </div>
      <div class="school-form-actions">
        <button type="submit" class="school-button school-button-primary">保存する</button>
      </div>
      <div class="school-danger-zone">
        <div class="school-danger-copy">
          <h3 class="danger-title">学校を削除する</h3>
          <p class="danger-description">
            学校を削除すると学校は一覧から非表示になります。配下の選手データは保持されます。内容を確認してから実行してください。
          </p>
        </div>
        <button type="button" id="school-delete-button" class="school-button school-button-danger">
          この学校を削除する
        </button>
      </div>
    </form>
  `;

  if (message) {
    const messageElement = root.querySelector("#school-form-message");
    setMessage(messageElement, message.text, message.type);
  }

  setupYearPickers(root);
}

function renderPlayerSeriesSummaries(root, playerSeriesSummaries, school = null) {
  const safeSummaries = Array.isArray(playerSeriesSummaries) ? playerSeriesSummaries : [];
  const playerCountText = `所属選手 ${safeSummaries.length}人`;

  if (safeSummaries.length === 0) {
    root.innerHTML = `
      <div class="players-list-meta">
        <p class="players-count" aria-live="polite">${playerCountText}</p>
      </div>
      <div class="message-box empty-message players-empty-state">
        <p class="players-empty-title">所属選手はまだ登録されていません。</p>
        <p>この学校の選手は「選手登録」から追加できます。</p>
      </div>
    `;
    return;
  }

  const rows = safeSummaries
    .map((playerSeriesSummary) => {
      const rosterStatus = playerSeriesSummary.rosterStatus ?? "active";
      const gradeDisplay = getSchoolGradeDisplay({ ...playerSeriesSummary, rosterStatus }, school);
      const nameCell = playerSeriesSummary.latestSnapshotId
        ? `
          <a
            class="player-link"
            href="./player_detail.html?id=${encodeURIComponent(playerSeriesSummary.latestSnapshotId)}"
          >
            ${escapeHtml(playerSeriesSummary.name)}
          </a>
        `
        : `<span class="player-name-text">${escapeHtml(playerSeriesSummary.name)}</span>`;

      return `
        <tr class="players-table-row">
          <td class="players-table-cell players-table-cell--name">
            <div class="players-name-stack">
              ${nameCell}
              <span class="players-secondary-text">series #${escapeHtml(playerSeriesSummary.seriesNo ?? "-")}</span>
            </div>
          </td>
          <td class="players-table-cell players-table-cell--grade">
            <div class="players-grade-stack">
              <span>${escapeHtml(gradeDisplay.gradeText)}</span>
              <span class="${gradeDisplay.badgeClass}">${escapeHtml(gradeDisplay.badgeText)}</span>
            </div>
          </td>
          <td class="players-table-cell">
            <span>${escapeHtml(formatSnapshotSummary(playerSeriesSummary))}</span>
          </td>
          <td class="players-table-cell">
            ${escapeHtml(formatOptionalValue(playerSeriesSummary.mainPosition))}
          </td>
          <td class="players-table-cell">
            ${escapeHtml(getPlayerTypeLabel(playerSeriesSummary.playerType))}
          </td>
        </tr>
      `;
    })
    .join("");

  root.innerHTML = `
    <div class="players-list-meta">
      <p class="players-count" aria-live="polite">${playerCountText}</p>
    </div>
    <div class="table-wrap">
      <table class="players-table">
        <thead>
          <tr>
            <th scope="col">名前</th>
            <th scope="col">学校管理学年</th>
            <th scope="col">最新snapshot</th>
            <th scope="col">メインポジション</th>
            <th scope="col">選手種別</th>
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

function bindSchoolProgression(summaryRoot, progressionRoot, editRoot, playersRoot, schoolId, school) {
  const button = progressionRoot.querySelector("#school-progress-year-button");
  const messageElement = progressionRoot.querySelector("#school-progression-message");

  if (!button || button.disabled) {
    return;
  }

  button.addEventListener("click", async () => {
    const baseYear = getProgressionBaseYear(school);
    const nextYear = baseYear === null ? null : baseYear + 1;
    const shouldProgress = window.confirm(
      `学校年度を${formatYearValue(baseYear)}から${formatYearValue(nextYear)}へ進めます。\n` +
        "所属選手の学校管理学年は更新されますが、snapshot は自動生成されません。"
    );

    if (!shouldProgress) {
      return;
    }

    button.disabled = true;
    button.textContent = "進行中...";
    setMessage(messageElement, "");

    try {
      const result = await progressSchoolYear(schoolId);
      document.title = `${formatSchoolName(result.school.name)} | 学校詳細`;
      renderSchoolSummary(summaryRoot, result.school);
      renderProgressionPanel(progressionRoot, result.school, result.progression);
      bindSchoolProgression(summaryRoot, progressionRoot, editRoot, playersRoot, schoolId, result.school);
      renderSchoolEditor(editRoot, result.school);
      bindSchoolEditor(summaryRoot, editRoot, schoolId);
      renderPlayerSeriesSummaries(playersRoot, result.playerSeriesSummaries, result.school);
    } catch (error) {
      button.disabled = false;
      button.textContent = "1年経過を実行";
      setMessage(messageElement, error.message, "error");
    }
  });
}

async function init() {
  const summaryRoot = document.getElementById("school-summary-root");
  const progressionRoot = document.getElementById("school-progression-root");
  const editRoot = document.getElementById("school-edit-root");
  const playersRoot = document.getElementById("school-players-root");
  const playerRegisterLink = document.getElementById("player-register-link");

  playerRegisterLink.hidden = true;

  try {
    const schoolId = getSchoolIdFromQuery();
    const school = await fetchSchoolById(schoolId);

    document.title = `${formatSchoolName(school.name)} | 学校詳細`;
    renderSchoolSummary(summaryRoot, school);
    renderProgressionPanel(progressionRoot, school);
    bindSchoolProgression(summaryRoot, progressionRoot, editRoot, playersRoot, schoolId, school);
    renderSchoolEditor(editRoot, school);
    bindSchoolEditor(summaryRoot, editRoot, schoolId);

    playerRegisterLink.href = `./player_register.html?school_id=${encodeURIComponent(schoolId)}`;
    playerRegisterLink.hidden = false;

    try {
      const schoolPlayerSeries = await fetchSchoolPlayerSeriesSummaries(schoolId);
      renderPlayerSeriesSummaries(playersRoot, schoolPlayerSeries.playerSeriesSummaries, schoolPlayerSeries.school);
    } catch (error) {
      renderPlayersError(playersRoot, error.message);
    }
  } catch (error) {
    renderSchoolError(summaryRoot, error.message);
    progressionRoot.innerHTML = "";
    editRoot.innerHTML = "";
    renderPlayersError(playersRoot, error.message);
  }
}

init();
