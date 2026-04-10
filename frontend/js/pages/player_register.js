import { createPlayer } from "../api/playerApi.js";
import { fetchSchoolById } from "../api/schoolApi.js";
import {
  buildAdmissionYearPicker,
  setupAdmissionYearPickers,
} from "../components/admissionYearPicker.js";
import { PREFECTURE_GROUPS } from "../constants/prefectures.js";

const PLAYER_TYPE_OPTIONS = [
  { value: "normal", label: "通常" },
  { value: "genius", label: "天才" },
  { value: "reincarnated", label: "転生" },
];

const SNAPSHOT_LABEL_OPTIONS = [
  { value: "entrance", label: "入学時" },
  { value: "post_tournament", label: "大会後" },
];

const POSITION_OPTIONS = ["投手", "捕手", "一塁手", "二塁手", "三塁手", "遊撃手", "外野手"];
const THROWING_HAND_OPTIONS = [
  { value: "right", label: "右" },
  { value: "left", label: "左" },
];
const BATTING_HAND_OPTIONS = [
  { value: "right", label: "右" },
  { value: "left", label: "左" },
  { value: "both", label: "両" },
];

function getSchoolIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const schoolId = params.get("school_id");

  if (!schoolId) {
    throw new Error("school_id が指定されていません。");
  }

  return schoolId;
}

function buildOptions(options) {
  return options
    .map((option) => {
      if (typeof option === "string") {
        return `<option value="${option}">${option}</option>`;
      }

      return `<option value="${option.value}">${option.label}</option>`;
    })
    .join("");
}

function escapeAttribute(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function buildGroupedOptions(groups) {
  return groups
    .map(
      (group) => `
        <optgroup label="${escapeAttribute(group.label)}">
          ${group.options
            .map((option) => `<option value="${escapeAttribute(option)}">${option}</option>`)
            .join("")}
        </optgroup>
      `
    )
    .join("");
}

function renderForm(form, schoolId) {
  form.innerHTML = `
    <div>
      <label for="name">名前</label><br>
      <input id="name" name="name" type="text" required>
    </div>
    <div>
      <label for="player_type">選手種別</label><br>
      <select id="player_type" name="player_type" required>
        ${buildOptions(PLAYER_TYPE_OPTIONS)}
      </select>
    </div>
    <div>
      <label for="prefecture">都道府県</label><br>
      <select id="prefecture" name="prefecture" required>
        <option value="">選択してください</option>
        ${buildGroupedOptions(PREFECTURE_GROUPS)}
      </select>
    </div>
    <div>
      <label for="grade">学年</label><br>
      <select id="grade" name="grade" required>
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
      </select>
    </div>
    <div>
      <span>入学年</span><br>
      ${buildAdmissionYearPicker()}
    </div>
    <div>
      <label for="snapshot_label">スナップショット</label><br>
      <select id="snapshot_label" name="snapshot_label" required>
        ${buildOptions(SNAPSHOT_LABEL_OPTIONS)}
      </select>
    </div>
    <div>
      <label for="main_position">メインポジション</label><br>
      <select id="main_position" name="main_position" required>
        ${buildOptions(POSITION_OPTIONS)}
      </select>
    </div>
    <div>
      <label for="throwing_hand">投球</label><br>
      <select id="throwing_hand" name="throwing_hand" required>
        ${buildOptions(THROWING_HAND_OPTIONS)}
      </select>
    </div>
    <div>
      <label for="batting_hand">打席</label><br>
      <select id="batting_hand" name="batting_hand" required>
        ${buildOptions(BATTING_HAND_OPTIONS)}
      </select>
    </div>
    <input type="hidden" name="school_id" value="${schoolId}">
    <div>
      <button type="submit">登録する</button>
      <a href="./school_detail.html?id=${schoolId}">戻る</a>
    </div>
  `;
}

function setMessage(messageElement, message, isError = false) {
  messageElement.textContent = message;
  messageElement.style.color = isError ? "#b91c1c" : "#047857";
}

function buildPayload(formData, schoolId) {
  return {
    school_id: Number(schoolId),
    name: formData.get("name"),
    player_type: formData.get("player_type"),
    prefecture: formData.get("prefecture"),
    grade: Number(formData.get("grade")),
    admission_year: Number(formData.get("admission_year")),
    snapshot_label: formData.get("snapshot_label"),
    main_position: formData.get("main_position"),
    throwing_hand: formData.get("throwing_hand"),
    batting_hand: formData.get("batting_hand"),
  };
}

async function handleSubmit(event, schoolId, messageElement) {
  event.preventDefault();

  const formData = new FormData(event.currentTarget);
  const payload = buildPayload(formData, schoolId);

  try {
    setMessage(messageElement, "登録中です...");
    await createPlayer(payload);
    setMessage(messageElement, "登録に成功しました。学校詳細へ戻ります。");
    window.setTimeout(() => {
      window.location.href = `./school_detail.html?id=${schoolId}`;
    }, 800);
  } catch (error) {
    setMessage(messageElement, error.message, true);
    window.alert(error.message);
  }
}

async function init() {
  const form = document.getElementById("player-register-form");
  const schoolElement = document.getElementById("player-register-school");
  const messageElement = document.getElementById("player-register-message");

  try {
    const schoolId = getSchoolIdFromQuery();
    const school = await fetchSchoolById(schoolId);

    schoolElement.textContent = `対象学校: ${school.name} (ID: ${school.id})`;
    renderForm(form, schoolId);
    setupAdmissionYearPickers(form);
    form.addEventListener("submit", (event) => handleSubmit(event, schoolId, messageElement));
  } catch (error) {
    setMessage(messageElement, error.message, true);
    form.innerHTML = `<p><a href="./schools.html">学校一覧へ戻る</a></p>`;
  }
}

init();
