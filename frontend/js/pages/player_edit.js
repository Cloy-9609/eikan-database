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

function setPageHeader(titleElement, contextElement, { title, context, documentTitle }) {
  if (titleElement) {
    titleElement.textContent = title;
  }

  if (contextElement) {
    contextElement.textContent = context;
  }

  document.title = documentTitle;
}

function renderForm(form, player) {
  form.innerHTML = `
    <section class="player-form-section" data-edit-section="basic">
      <div class="player-form-section-header">
        <h2 class="player-form-section-title">基本情報</h2>
        <p class="player-form-section-description">
          この画面では識別情報とスナップショット軸になる基本項目を編集します。
          能力値・変化球・特殊能力・サブポジションは現時点では詳細画面での表示のみです。
        </p>
      </div>

      <div class="player-form-row" data-field="name">
        <label class="player-form-label" for="name">名前</label>
        <div class="player-form-control">
          <input id="name" name="name" type="text" value="${escapeAttribute(player.name)}" required>
        </div>
      </div>

      <div class="player-form-row" data-field="player_type">
        <label class="player-form-label" for="player_type">選手種別</label>
        <div class="player-form-control">
          <select id="player_type" name="player_type" required>
            ${buildOptions(PLAYER_TYPE_OPTIONS, player.player_type)}
          </select>
        </div>
      </div>

      <div class="player-form-row" data-field="prefecture">
        <label class="player-form-label" for="prefecture">都道府県</label>
        <div class="player-form-control">
          <select id="prefecture" name="prefecture" required>
            ${buildGroupedOptions(PREFECTURE_GROUPS, player.prefecture)}
          </select>
        </div>
      </div>

      <div class="player-form-row" data-field="grade">
        <label class="player-form-label" for="grade">学年</label>
        <div class="player-form-control">
          <select id="grade" name="grade" required>
            ${buildOptions(["1", "2", "3"], String(player.grade))}
          </select>
        </div>
      </div>

      <div class="player-form-row" data-field="admission_year">
        <span class="player-form-label">入学年</span>
        <div class="player-form-control player-form-control--year">
          ${buildAdmissionYearPicker({ selectedYear: player.admission_year })}
        </div>
      </div>

      <div class="player-form-row" data-field="snapshot_label">
        <label class="player-form-label" for="snapshot_label">スナップショット</label>
        <div class="player-form-control">
          <select id="snapshot_label" name="snapshot_label" required>
            ${buildOptions(SNAPSHOT_LABEL_OPTIONS, player.snapshot_label)}
          </select>
        </div>
      </div>

      <div class="player-form-row" data-field="main_position">
        <label class="player-form-label" for="main_position">メインポジション</label>
        <div class="player-form-control">
          <select id="main_position" name="main_position" required>
            ${buildOptions(POSITION_OPTIONS, player.main_position)}
          </select>
        </div>
      </div>

      <div class="player-form-row" data-field="throwing_hand">
        <label class="player-form-label" for="throwing_hand">投球</label>
        <div class="player-form-control">
          <select id="throwing_hand" name="throwing_hand" required>
            ${buildOptions(THROWING_HAND_OPTIONS, player.throwing_hand)}
          </select>
        </div>
      </div>

      <div class="player-form-row" data-field="batting_hand">
        <label class="player-form-label" for="batting_hand">打席</label>
        <div class="player-form-control">
          <select id="batting_hand" name="batting_hand" required>
            ${buildOptions(BATTING_HAND_OPTIONS, player.batting_hand)}
          </select>
        </div>
      </div>
    </section>

    <div class="player-form-actions">
      <button type="submit" class="player-button player-button-primary">基本情報を保存</button>
      <a class="player-button player-button-secondary" href="./player_detail.html?id=${encodeURIComponent(player.id)}">詳細へ戻る</a>
    </div>
  `;
}

function setMessage(messageElement, message, isError = false) {
  messageElement.textContent = message;
  messageElement.classList.toggle("is-visible", Boolean(message));
  messageElement.classList.toggle("is-error", Boolean(message) && isError);
  messageElement.classList.toggle("is-success", Boolean(message) && !isError);
}

function buildPayload(formData) {
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
  const payload = buildPayload(formData);

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
  const titleElement = document.getElementById("player-edit-title");
  const contextElement = document.getElementById("player-edit-context");

  try {
    const playerId = getPlayerIdFromQuery();
    const player = await fetchPlayerById(playerId);

    setPageHeader(titleElement, contextElement, {
      title: "選手基本情報編集",
      context: `${player.name} の基本情報を編集します。能力値・変化球・特殊能力は今後の拡張対象です。`,
      documentTitle: `${player.name} | 選手基本情報編集`,
    });

    if (Number(player.school_is_archived) === 1) {
      setMessage(messageElement, "削除済み学校に所属する選手は編集できません。", true);
      form.innerHTML = `
        <div class="player-form-actions">
          <a class="player-button player-button-secondary" href="./player_detail.html?id=${encodeURIComponent(player.id)}">選手詳細へ戻る</a>
          <a class="player-button player-button-secondary" href="./schools.html">学校一覧へ戻る</a>
        </div>
      `;
      return;
    }

    renderForm(form, player);
    setupAdmissionYearPickers(form);
    form.addEventListener("submit", (event) => handleSubmit(event, player, messageElement));
  } catch (error) {
    setPageHeader(titleElement, contextElement, {
      title: "選手基本情報編集",
      context: "選手情報を取得できませんでした。",
      documentTitle: "選手基本情報編集",
    });
    setMessage(messageElement, error.message, true);
    form.innerHTML = `
      <div class="player-form-actions">
        <a class="player-button player-button-secondary" href="./schools.html">学校一覧へ戻る</a>
      </div>
    `;
  }
}

init();
