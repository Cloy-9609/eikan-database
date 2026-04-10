import { fetchPlayerById, updatePlayer } from "../api/playerApi.js";
import {
  buildAdmissionYearPicker,
  setupAdmissionYearPickers,
} from "../components/admissionYearPicker.js";
import { PREFECTURE_GROUPS, isKnownPrefecture } from "../constants/prefectures.js";

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

function getPlayerIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const playerId = params.get("id");

  if (!playerId) {
    throw new Error("選手IDが指定されていません。");
  }

  return playerId;
}

function escapeAttribute(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function buildOptions(options, selectedValue) {
  return options
    .map((option) => {
      const value = typeof option === "string" ? option : option.value;
      const label = typeof option === "string" ? option : option.label;
      const selected = value === selectedValue ? " selected" : "";

      return `<option value="${escapeAttribute(value)}"${selected}>${label}</option>`;
    })
    .join("");
}

function buildGroupedOptions(groups, selectedValue) {
  const fallbackOption = isKnownPrefecture(selectedValue)
    ? ""
    : `<option value="" selected>現在の値は選択肢にありません: ${escapeAttribute(
        selectedValue
      )}</option>`;

  return `
    ${fallbackOption}
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

function renderForm(form, player) {
  form.innerHTML = `
    <div>
      <label for="name">名前</label><br>
      <input id="name" name="name" type="text" value="${escapeAttribute(player.name)}" required>
    </div>
    <div>
      <label for="player_type">選手種別</label><br>
      <select id="player_type" name="player_type" required>
        ${buildOptions(PLAYER_TYPE_OPTIONS, player.player_type)}
      </select>
    </div>
    <div>
      <label for="prefecture">都道府県</label><br>
      <select id="prefecture" name="prefecture" required>
        ${buildGroupedOptions(PREFECTURE_GROUPS, player.prefecture)}
      </select>
    </div>
    <div>
      <label for="grade">学年</label><br>
      <select id="grade" name="grade" required>
        ${buildOptions(["1", "2", "3"], String(player.grade))}
      </select>
    </div>
    <div>
      <span>入学年</span><br>
      ${buildAdmissionYearPicker({ selectedYear: player.admission_year })}
    </div>
    <div>
      <label for="snapshot_label">スナップショット</label><br>
      <select id="snapshot_label" name="snapshot_label" required>
        ${buildOptions(SNAPSHOT_LABEL_OPTIONS, player.snapshot_label)}
      </select>
    </div>
    <div>
      <label for="main_position">メインポジション</label><br>
      <select id="main_position" name="main_position" required>
        ${buildOptions(POSITION_OPTIONS, player.main_position)}
      </select>
    </div>
    <div>
      <label for="throwing_hand">投球</label><br>
      <select id="throwing_hand" name="throwing_hand" required>
        ${buildOptions(THROWING_HAND_OPTIONS, player.throwing_hand)}
      </select>
    </div>
    <div>
      <label for="batting_hand">打席</label><br>
      <select id="batting_hand" name="batting_hand" required>
        ${buildOptions(BATTING_HAND_OPTIONS, player.batting_hand)}
      </select>
    </div>
    <div>
      <button type="submit">保存する</button>
      <a href="./player_detail.html?id=${encodeURIComponent(player.id)}">戻る</a>
    </div>
  `;
}

function setMessage(messageElement, message, isError = false) {
  messageElement.textContent = message;
  messageElement.style.color = isError ? "#b91c1c" : "#047857";
}

function buildPayload(formData, player) {
  return {
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

async function handleSubmit(event, player, messageElement) {
  event.preventDefault();

  const formData = new FormData(event.currentTarget);
  const payload = buildPayload(formData, player);

  try {
    setMessage(messageElement, "保存中です...");
    await updatePlayer(player.id, payload);
    setMessage(messageElement, "保存に成功しました。選手詳細へ戻ります。");
    window.setTimeout(() => {
      window.location.href = `./player_detail.html?id=${encodeURIComponent(player.id)}`;
    }, 800);
  } catch (error) {
    setMessage(messageElement, error.message, true);
    window.alert(error.message);
  }
}

async function init() {
  const form = document.getElementById("player-edit-form");
  const messageElement = document.getElementById("player-edit-message");

  try {
    const playerId = getPlayerIdFromQuery();
    const player = await fetchPlayerById(playerId);

    renderForm(form, player);
    setupAdmissionYearPickers(form);
    form.addEventListener("submit", (event) => handleSubmit(event, player, messageElement));
  } catch (error) {
    setMessage(messageElement, error.message, true);
    form.innerHTML = `<p><a href="./schools.html">学校一覧へ戻る</a></p>`;
  }
}

init();
