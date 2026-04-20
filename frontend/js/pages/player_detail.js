import { addSnapshotToSeries, fetchPlayerDetailById, updatePlayer } from "../api/playerApi.js";
import {
  buildAdmissionYearPicker,
  setupAdmissionYearPickers,
} from "../components/admissionYearPicker.js";
import { fetchPlayerRelationOptions } from "../api/playerApi.js";
import { PREFECTURE_GROUPS, isKnownPrefecture } from "../constants/prefectures.js";
import { formatSchoolName } from "../utils/formatter.js";
import {
  bindRelationEditors,
  getFallbackRelationOptions,
  normalizeRelationOptions,
  renderPitchTypeEditor,
  renderSpecialAbilityEditor,
  renderSubPositionEditor,
  serializeRelationInputs,
} from "../utils/playerRelations.js";

const PLAYER_TYPE_LABELS = {
  normal: "通常",
  genius: "天才",
  reincarnated: "転生",
};

const PLAYER_TYPE_OPTIONS = [
  { value: "normal", label: "通常" },
  { value: "genius", label: "天才" },
  { value: "reincarnated", label: "転生" },
];

const SNAPSHOT_LABEL_OPTIONS = [
  { value: "entrance", label: "入学時" },
  { value: "y1_summer", label: "1年夏大会後" },
  { value: "y1_autumn", label: "1年秋大会後" },
  { value: "y1_spring", label: "1年春大会後" },
  { value: "y2_summer", label: "2年夏大会後" },
  { value: "y2_autumn", label: "2年秋大会後" },
  { value: "y2_spring", label: "2年春大会後" },
  { value: "y3_summer", label: "3年夏大会後" },
  { value: "graduation", label: "卒業時" },
];
const LEGACY_SNAPSHOT_LABELS = {
  post_tournament: "大会後",
};

const SNAPSHOT_LABELS = Object.fromEntries(
  SNAPSHOT_LABEL_OPTIONS.map(({ value, label }) => [value, label])
);
Object.assign(SNAPSHOT_LABELS, LEGACY_SNAPSHOT_LABELS);

const THROWING_HAND_OPTIONS = [
  { value: "right", label: "右" },
  { value: "left", label: "左" },
];

const BATTING_HAND_OPTIONS = [
  { value: "right", label: "右" },
  { value: "left", label: "左" },
  { value: "both", label: "両" },
];

const POSITION_OPTIONS = ["投手", "捕手", "一塁手", "二塁手", "三塁手", "遊撃手", "外野手"];
const PITCHER_MAIN_POSITION = "投手";

const ABILITY_RANK_GROUPS = [
  { rank: "G", min: 1, max: 19 },
  { rank: "F", min: 20, max: 39 },
  { rank: "E", min: 40, max: 49 },
  { rank: "D", min: 50, max: 59 },
  { rank: "C", min: 60, max: 69 },
  { rank: "B", min: 70, max: 79 },
  { rank: "A", min: 80, max: 89 },
  { rank: "S", min: 90, max: 100 },
];

const PITCHER_ABILITY_FIELDS = [
  { field: "velocity", label: "球速", inputType: "number", min: 0 },
  { field: "control", label: "コントロール", inputType: "ranked" },
  { field: "stamina", label: "スタミナ", inputType: "ranked" },
];

const PITCH_METER_MAX_LEVEL = 7;

const PITCH_MOVEMENT_DIRECTIONS = [
  { key: "top", label: "上", orientation: "vertical", angle: 0 },
  { key: "left", label: "左", orientation: "horizontal", angle: -8 },
  { key: "right", label: "右", orientation: "horizontal", angle: 8 },
  { key: "down-left", label: "左下", orientation: "vertical", angle: 34 },
  { key: "down", label: "下", orientation: "vertical", angle: 0 },
  { key: "down-right", label: "右下", orientation: "vertical", angle: -34 },
];

const PITCH_DIRECTION_MIRROR_MAP = {
  top: "top",
  left: "right",
  right: "left",
  "down-left": "down-right",
  down: "down",
  "down-right": "down-left",
};

const PITCH_MOVEMENT_CATEGORIES = [
  {
    direction: "top",
    patterns: ["ストレート", "直球", "ツーシーム", "ムービング", "ライジング", "ジャイロ"],
  },
  { direction: "left", patterns: ["スライダー", "スラーブ", "カット", "カッター"] },
  { direction: "right", patterns: ["シュート"] },
  { direction: "down-left", patterns: ["カーブ", "ドロップ"] },
  {
    direction: "down",
    patterns: ["フォーク", "SFF", "スプリット", "Ｖスライダー", "Vスライダー", "縦スライダー"],
  },
  { direction: "down-right", patterns: ["シンカー", "スクリュー", "チェンジ", "パーム", "ナックル"] },
];

const STRAIGHT_PITCH_PATTERNS = ["ストレート", "直球"];

const BATTER_ABILITY_FIELDS = [
  { field: "trajectory", label: "弾道", inputType: "trajectory" },
  { field: "meat", label: "ミート", inputType: "ranked" },
  { field: "power", label: "パワー", inputType: "ranked" },
  { field: "run_speed", label: "走力", inputType: "ranked" },
  { field: "arm_strength", label: "肩力", inputType: "ranked" },
  { field: "fielding", label: "守備", inputType: "ranked" },
  { field: "catching", label: "捕球", inputType: "ranked" },
];

const SECTION_EDIT_META = {
  basic: {
    kicker: "Basic Edit",
    title: "基本情報を編集",
    description: "スナップショット単位で扱う基本情報を更新します。",
    submitLabel: "基本情報を保存",
  },
  pitcher: {
    kicker: "Pitcher Edit",
    title: "投手能力を編集",
    description: "投手能力の数値をこの画面上で更新します。",
    submitLabel: "投手能力を保存",
  },
  batter: {
    kicker: "Batter Edit",
    title: "野手能力を編集",
    description: "野手能力の数値をこの画面上で更新します。",
    submitLabel: "野手能力を保存",
  },
  special: {
    kicker: "Special Edit",
    title: "特殊能力を編集",
    description: "現在表示中の snapshot に付いている特殊能力を編集します。",
    submitLabel: "特殊能力を保存",
  },
  pitches: {
    kicker: "Pitch Edit",
    title: "変化球を編集",
    description: "現在表示中の snapshot の変化球を編集します。",
    submitLabel: "変化球を保存",
  },
  sub_positions: {
    kicker: "Sub Position Edit",
    title: "サブポジションを編集",
    description: "現在表示中の snapshot のサブポジションを編集します。",
    submitLabel: "サブポジションを保存",
  },
};

const SNAPSHOT_CREATE_CONFIRM_STORAGE_KEY = "player_detail_confirm_create_snapshot";
const TOAST_TRANSITION_MS = 220;
const TOAST_DEFAULT_DURATION_MS = 2200;
const TOAST_SUCCESS_DURATION_MS = 1800;
const TOAST_ERROR_DURATION_MS = 3200;
const TOAST_LOADING_MIN_VISIBLE_MS = 900;
const SNAPSHOT_BUTTON_STATE_LABELS = {
  unregistered: "未登録",
  registered: "登録済み",
  current: "表示中",
  loading: "読み込み中",
  error: "問題発生",
};

const DETAIL_STATE = {
  playerId: "",
  player: null,
  playerSeries: null,
  snapshots: [],
  currentSnapshot: null,
  pendingCreateSnapshotKey: "",
  confirmBeforeCreateSnapshot: true,
  isBusy: false,
  loadingSnapshotKey: "",
  snapshotButtonErrorKey: "",
  relationOptions: null,
  refs: null,
  activeModalScope: "",
  lastFocusedElement: null,
  nextToastId: 0,
};

function isArchivedSchool(player) {
  return Number(player.school_is_archived) === 1;
}

function getPlayerIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const playerId = params.get("id");

  if (!playerId) {
    throw new Error("選手IDが指定されていません。");
  }

  return playerId;
}

function getSnapshotFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get("snapshot") ?? "";
}

function getCurrentSchoolId() {
  return (
    DETAIL_STATE.playerSeries?.school_id ??
    DETAIL_STATE.currentSnapshot?.school_id ??
    DETAIL_STATE.player?.school_id ??
    null
  );
}

function getSnapshotCreateConfirmationStorageKey(schoolId = getCurrentSchoolId()) {
  if (!schoolId) {
    return "";
  }

  return `${SNAPSHOT_CREATE_CONFIRM_STORAGE_KEY}:school:${schoolId}`;
}

function syncSnapshotQuery(snapshotKey) {
  const url = new URL(window.location.href);

  if (snapshotKey) {
    url.searchParams.set("snapshot", snapshotKey);
  } else {
    url.searchParams.delete("snapshot");
  }

  window.history.replaceState({}, "", url);
}

function buildPlayerEditUrl(playerId, { mode = "", from = "", snapshot = "", scope = "" } = {}) {
  const params = new URLSearchParams();
  params.set("id", String(playerId));

  if (mode) {
    params.set("mode", mode);
  }

  if (from) {
    params.set("from", from);
  }

  if (snapshot) {
    params.set("snapshot", snapshot);
  }

  if (scope) {
    params.set("scope", scope);
  }

  return `./player_edit.html?${params.toString()}`;
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

function formatValue(value, fallback = "なし") {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return escapeHtml(value);
}

function formatPlayerType(value) {
  return formatValue(PLAYER_TYPE_LABELS[value] ?? value);
}

function formatSnapshotLabel(value) {
  return formatValue(SNAPSHOT_LABELS[value] ?? value);
}

function getOfficialSnapshotDefinitions() {
  return SNAPSHOT_LABEL_OPTIONS.map(({ value, label }) => ({
    key: value,
    label,
  }));
}

function getSnapshotOptionDefinitionsLegacy(currentSnapshotLabel = "") {
  const options = [...SNAPSHOT_LABEL_OPTIONS];

  if (
    currentSnapshotLabel &&
    !options.some((option) => option.value === currentSnapshotLabel)
  ) {
    options.push({
      value: currentSnapshotLabel,
      label: `${SNAPSHOT_LABELS[currentSnapshotLabel] ?? currentSnapshotLabel} (旧データ)`,
    });
  }

  return options;
}

function getSnapshotOptionDefinitions(currentSnapshotLabel = "") {
  const options = [...SNAPSHOT_LABEL_OPTIONS];

  if (
    currentSnapshotLabel &&
    !options.some((option) => option.value === currentSnapshotLabel)
  ) {
    options.push({
      value: currentSnapshotLabel,
      label: `${SNAPSHOT_LABELS[currentSnapshotLabel] ?? currentSnapshotLabel} (旧形式の大会後データ)`,
    });
  }

  return options;
}

async function loadRelationOptions() {
  try {
    const relationOptions = await fetchPlayerRelationOptions();
    return normalizeRelationOptions(relationOptions);
  } catch (error) {
    return normalizeRelationOptions(getFallbackRelationOptions());
  }
}

function formatHand(value) {
  return value === undefined || value === null || value === ""
    ? ""
    : escapeHtml(
        THROWING_HAND_OPTIONS.concat(BATTING_HAND_OPTIONS).find((option) => option.value === value)?.label ??
          value
      );
}

function formatThrowBat(player) {
  const throwing = formatHand(player.throwing_hand);
  const batting = formatHand(player.batting_hand);

  if (!throwing && !batting) {
    return "なし";
  }

  return `${throwing || "-"} / ${batting || "-"}`;
}

function readSnapshotCreateConfirmationPreference(schoolId = getCurrentSchoolId()) {
  const storageKey = getSnapshotCreateConfirmationStorageKey(schoolId);

  if (!storageKey) {
    return true;
  }

  try {
    return sessionStorage.getItem(storageKey) !== "false";
  } catch (error) {
    return true;
  }
}

function setSnapshotCreateConfirmationPreference(shouldConfirm, schoolId = getCurrentSchoolId()) {
  DETAIL_STATE.confirmBeforeCreateSnapshot = shouldConfirm;
  const storageKey = getSnapshotCreateConfirmationStorageKey(schoolId);

  if (!storageKey) {
    return;
  }

  try {
    sessionStorage.setItem(storageKey, shouldConfirm ? "true" : "false");
  } catch (error) {
    // Ignore storage failures and keep the in-memory preference.
  }
}

function isSnapshotRegistered(snapshotKey, snapshots) {
  return Array.isArray(snapshots)
    ? snapshots.some((snapshot) => snapshot.snapshot_label === snapshotKey)
    : false;
}

function isCurrentSnapshot(snapshotKey, currentSnapshot) {
  return Boolean(currentSnapshot && currentSnapshot.snapshot_label === snapshotKey);
}

function getCurrentSeriesResponse() {
  return {
    playerSeries: DETAIL_STATE.playerSeries,
    snapshots: DETAIL_STATE.snapshots,
    currentSnapshot: DETAIL_STATE.currentSnapshot,
  };
}

function buildPlayerViewModel(seriesResponse) {
  const playerSeries = seriesResponse?.playerSeries ?? null;
  const currentSnapshot = seriesResponse?.currentSnapshot ?? null;

  if (!playerSeries && !currentSnapshot) {
    return null;
  }

  return {
    ...currentSnapshot,
    player_series_id: currentSnapshot?.player_series_id ?? playerSeries?.id ?? null,
    school_id: playerSeries?.school_id ?? currentSnapshot?.school_id ?? null,
    school_name: playerSeries?.school_name ?? currentSnapshot?.school_name ?? "",
    school_is_archived:
      playerSeries?.school_is_archived ?? currentSnapshot?.school_is_archived ?? 0,
    name: playerSeries?.name ?? currentSnapshot?.name ?? "",
    prefecture: playerSeries?.prefecture ?? currentSnapshot?.prefecture ?? "",
    player_type: playerSeries?.player_type ?? currentSnapshot?.player_type ?? "",
    player_type_note: playerSeries?.player_type_note ?? currentSnapshot?.player_type_note ?? "",
    admission_year: playerSeries?.admission_year ?? currentSnapshot?.admission_year ?? "",
    throwing_hand: playerSeries?.throwing_hand ?? currentSnapshot?.throwing_hand ?? "",
    batting_hand: playerSeries?.batting_hand ?? currentSnapshot?.batting_hand ?? "",
    player_series_note: playerSeries?.note ?? currentSnapshot?.player_series_note ?? "",
  };
}

function getCurrentEditablePlayer() {
  return buildPlayerViewModel(getCurrentSeriesResponse()) ?? DETAIL_STATE.player;
}

function clearSnapshotButtonFeedback() {
  DETAIL_STATE.loadingSnapshotKey = "";
  DETAIL_STATE.snapshotButtonErrorKey = "";
}

function setSnapshotButtonLoading(snapshotKey) {
  DETAIL_STATE.loadingSnapshotKey = snapshotKey;
  DETAIL_STATE.snapshotButtonErrorKey = "";
}

function setSnapshotButtonError(snapshotKey) {
  DETAIL_STATE.loadingSnapshotKey = "";
  DETAIL_STATE.snapshotButtonErrorKey = snapshotKey;
}

function isPitcherPosition(value) {
  return value === PITCHER_MAIN_POSITION;
}

function getAbilityRank(value) {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue)) {
    return null;
  }

  return ABILITY_RANK_GROUPS.find(
    (group) => numericValue >= group.min && numericValue <= group.max
  ) ?? null;
}

function renderRankedAbilityValue(value) {
  const rankGroup = getAbilityRank(value);

  if (!rankGroup) {
    return formatValue(value);
  }

  return `
    <span class="detail-ability-value">
      <span class="detail-ability-rank">${rankGroup.rank}</span>
      <span class="detail-ability-number">${escapeHtml(value)}</span>
    </span>
  `;
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

function buildAttributeString(attributes) {
  return Object.entries(attributes)
    .filter(([, value]) => value !== undefined && value !== null && value !== false && value !== "")
    .map(([key, value]) => (value === true ? key : `${key}="${escapeAttribute(value)}"`))
    .join(" ");
}

function buildSectionEditButton(scope, label = "編集") {
  return `
    <button
      type="button"
      class="player-button player-button-secondary player-button-inline"
      data-open-section-edit="${escapeAttribute(scope)}"
    >
      ${label}
    </button>
  `;
}

function buildSectionEditLink(scope, snapshot, label = "編集画面") {
  return `
    <a
      class="player-button player-button-secondary player-button-inline"
      href="${escapeAttribute(
        buildPlayerEditUrl(snapshot.id, {
          snapshot: snapshot.snapshot_label,
          scope,
        })
      )}"
    >
      ${label}
    </a>
  `;
}

function renderDetailCard({ title, sectionKey, content, bodyClass = "", headerActionHtml = "" }) {
  const safeSectionKey = sectionKey ? escapeHtml(sectionKey) : "";
  const bodyClassName = bodyClass ? `detail-card-body ${bodyClass}` : "detail-card-body";

  return `
    <section class="detail-card" data-detail-section="${safeSectionKey}">
      <div class="detail-card-header">
        <h2 class="detail-title">${title}</h2>
        ${headerActionHtml ? `<div class="detail-card-actions">${headerActionHtml}</div>` : ""}
      </div>
      <div class="${bodyClassName}">
        ${content}
      </div>
    </section>
  `;
}

function renderSnapshotValue(value) {
  return `
    <div class="snapshot-chip-list" data-snapshot-list>
      <span class="snapshot-chip snapshot-chip--active" data-snapshot-value>${formatSnapshotLabel(value)}</span>
    </div>
  `;
}

function buildSnapshotCreatePromptLegacy(snapshotKey) {
  if (!snapshotKey) {
    return "";
  }

  const snapshotDefinition = getOfficialSnapshotDefinitions().find((definition) => definition.key === snapshotKey);
  const snapshotLabel = snapshotDefinition?.label ?? SNAPSHOT_LABELS[snapshotKey] ?? snapshotKey;

  return `
    <div class="snapshot-create-prompt" data-create-snapshot-prompt>
      <p class="snapshot-create-prompt-text">「${escapeHtml(snapshotLabel)}」の時点を作成しますか？</p>
      <div class="snapshot-create-prompt-actions">
        <button
          type="button"
          class="player-button player-button-primary player-button-inline"
          data-create-snapshot-confirm="${escapeAttribute(snapshotKey)}"
        >
          作成する
        </button>
        <button
          type="button"
          class="player-button player-button-secondary player-button-inline"
          data-create-snapshot-cancel
        >
          キャンセル
        </button>
      </div>
      <label class="snapshot-create-prompt-toggle">
        <input
          type="checkbox"
          data-snapshot-confirm-toggle
          ${DETAIL_STATE.confirmBeforeCreateSnapshot ? "" : "checked"}
        >
        <span>次回から確認しない</span>
      </label>
    </div>
  `;
}

function buildLegacySnapshotNoticeLegacy(seriesResponse) {
  const currentSnapshot = seriesResponse?.currentSnapshot ?? null;
  const hasLegacySnapshots =
    Boolean(seriesResponse?.playerSeries?.has_legacy_snapshot_labels) ||
    (Array.isArray(seriesResponse?.snapshots) &&
      seriesResponse.snapshots.some((snapshot) => snapshot.is_legacy_snapshot_label));

  if (!hasLegacySnapshots) {
    return "";
  }

  if (currentSnapshot?.is_legacy_snapshot_label) {
    return `
      <div class="snapshot-legacy-note">
        旧データの時点「${formatSnapshotLabel(currentSnapshot.snapshot_label)}」を表示中です。正式9時点のボタンには割り当てていません。
      </div>
    `;
  }

  return `
    <div class="snapshot-legacy-note">
      この選手には正式9時点以外の旧データ時点も含まれています。
    </div>
  `;
}

function buildSnapshotTimelineButtonsLegacy(seriesResponse) {
  const snapshots = Array.isArray(seriesResponse?.snapshots) ? seriesResponse.snapshots : [];
  const currentSnapshot = seriesResponse?.currentSnapshot ?? null;

  const buttonsHtml = getOfficialSnapshotDefinitions()
    .map(({ key, label }) => {
      const registered = isSnapshotRegistered(key, snapshots);
      const current = isCurrentSnapshot(key, currentSnapshot);
      const stateLabel = current ? "表示中" : registered ? "登録済み" : "未登録";
      const className = [
        "snapshot-timeline-button",
        registered ? "is-registered" : "is-unregistered",
        current ? "is-current" : "",
      ]
        .filter(Boolean)
        .join(" ");

      return `
        <button
          type="button"
          class="${className}"
          data-snapshot-button="${escapeAttribute(key)}"
          data-snapshot-registered="${registered ? "true" : "false"}"
          aria-pressed="${current ? "true" : "false"}"
        >
          <span class="snapshot-timeline-button-label">${label}</span>
          <span class="snapshot-timeline-button-state">${stateLabel}</span>
        </button>
      `;
    })
    .join("");

  const promptHtml =
    DETAIL_STATE.pendingCreateSnapshotKey && DETAIL_STATE.confirmBeforeCreateSnapshot
      ? buildSnapshotCreatePrompt(DETAIL_STATE.pendingCreateSnapshotKey)
      : "";

  return `
    <section class="snapshot-timeline" aria-labelledby="snapshot-timeline-title">
      <div class="snapshot-timeline-header">
        <div>
          <h3 id="snapshot-timeline-title" class="snapshot-timeline-title">時点切替</h3>
          <p class="snapshot-timeline-caption">
            登録済みの時点は切り替え、未登録の時点は追加できます。
          </p>
        </div>
      </div>
      <div class="snapshot-timeline-buttons">
        ${buttonsHtml}
      </div>
      ${promptHtml}
      ${buildLegacySnapshotNotice(seriesResponse)}
    </section>
  `;
}

function getLegacySnapshotSummaryLabel(snapshotKey) {
  if (snapshotKey === "post_tournament") {
    return "旧形式の大会後データ";
  }

  return "移行前の時点データ";
}

function resolveSnapshotButtonState(snapshotKey, snapshots, currentSnapshot) {
  const registered = isSnapshotRegistered(snapshotKey, snapshots);
  const current = isCurrentSnapshot(snapshotKey, currentSnapshot);

  if (DETAIL_STATE.loadingSnapshotKey === snapshotKey) {
    return {
      tone: "loading",
      label: SNAPSHOT_BUTTON_STATE_LABELS.loading,
      registered,
      current: false,
    };
  }

  if (DETAIL_STATE.snapshotButtonErrorKey === snapshotKey) {
    return {
      tone: "error",
      label: SNAPSHOT_BUTTON_STATE_LABELS.error,
      registered,
      current: false,
    };
  }

  if (current) {
    return {
      tone: "current",
      label: SNAPSHOT_BUTTON_STATE_LABELS.current,
      registered: true,
      current: true,
    };
  }

  if (registered) {
    return {
      tone: "registered",
      label: SNAPSHOT_BUTTON_STATE_LABELS.registered,
      registered: true,
      current: false,
    };
  }

  return {
    tone: "unregistered",
    label: SNAPSHOT_BUTTON_STATE_LABELS.unregistered,
    registered: false,
    current: false,
  };
}

function buildSnapshotCreatePrompt(snapshotKey) {
  if (!snapshotKey) {
    return "";
  }

  const snapshotDefinition = getOfficialSnapshotDefinitions().find((definition) => definition.key === snapshotKey);
  const snapshotLabel = snapshotDefinition?.label ?? SNAPSHOT_LABELS[snapshotKey] ?? snapshotKey;
  const schoolLabel = DETAIL_STATE.playerSeries?.school_name
    ? `${formatSchoolName(DETAIL_STATE.playerSeries.school_name)}では`
    : "この学校では";

  return `
    <div class="snapshot-create-prompt" data-create-snapshot-prompt>
      <p class="snapshot-create-prompt-text">「${escapeHtml(snapshotLabel)}」の時点を作成しますか？</p>
      <div class="snapshot-create-prompt-actions">
        <button
          type="button"
          class="player-button player-button-primary player-button-inline"
          data-create-snapshot-confirm="${escapeAttribute(snapshotKey)}"
        >
          作成する
        </button>
        <button
          type="button"
          class="player-button player-button-secondary player-button-inline"
          data-create-snapshot-cancel
        >
          キャンセル
        </button>
      </div>
      <label class="snapshot-create-prompt-toggle">
        <input
          type="checkbox"
          data-snapshot-confirm-toggle
          ${DETAIL_STATE.confirmBeforeCreateSnapshot ? "" : "checked"}
        >
        <span>${schoolLabel}次回から確認しない</span>
      </label>
    </div>
  `;
}

function buildLegacySnapshotNotice(seriesResponse) {
  const currentSnapshot = seriesResponse?.currentSnapshot ?? null;
  const hasLegacySnapshots =
    Boolean(seriesResponse?.playerSeries?.has_legacy_snapshot_labels) ||
    (Array.isArray(seriesResponse?.snapshots) &&
      seriesResponse.snapshots.some((snapshot) => snapshot.is_legacy_snapshot_label));

  if (!hasLegacySnapshots) {
    return "";
  }

  if (currentSnapshot?.is_legacy_snapshot_label) {
    return `
      <div class="snapshot-legacy-note">
        ${escapeHtml(getLegacySnapshotSummaryLabel(currentSnapshot.snapshot_label))}を表示中です。正式9時点には対応付けていません。
      </div>
    `;
  }

  return `
    <div class="snapshot-legacy-note">
      この選手には${escapeHtml(getLegacySnapshotSummaryLabel("post_tournament"))}や旧データ時点が含まれています。
    </div>
  `;
}

function buildSnapshotTimelineButtons(seriesResponse) {
  const snapshots = Array.isArray(seriesResponse?.snapshots) ? seriesResponse.snapshots : [];
  const currentSnapshot = seriesResponse?.currentSnapshot ?? null;

  const buttonsHtml = getOfficialSnapshotDefinitions()
    .map(({ key, label }) => {
      const buttonState = resolveSnapshotButtonState(key, snapshots, currentSnapshot);
      const className = [
        "snapshot-timeline-button",
        `is-${buttonState.tone}`,
        buttonState.registered ? "is-registered" : "is-unregistered",
        buttonState.current ? "is-current" : "",
      ]
        .filter(Boolean)
        .join(" ");

      return `
        <button
          type="button"
          class="${className}"
          data-snapshot-button="${escapeAttribute(key)}"
          data-snapshot-registered="${buttonState.registered ? "true" : "false"}"
          data-snapshot-state="${buttonState.tone}"
          aria-pressed="${buttonState.current ? "true" : "false"}"
          ${DETAIL_STATE.isBusy ? "disabled" : ""}
        >
          <span class="snapshot-timeline-button-label">${label}</span>
          <span class="snapshot-timeline-button-state">${buttonState.label}</span>
        </button>
      `;
    })
    .join("");

  const promptHtml =
    DETAIL_STATE.pendingCreateSnapshotKey && DETAIL_STATE.confirmBeforeCreateSnapshot
      ? buildSnapshotCreatePrompt(DETAIL_STATE.pendingCreateSnapshotKey)
      : "";

  return `
    <section class="snapshot-timeline" aria-labelledby="snapshot-timeline-title">
      <div class="snapshot-timeline-header">
        <div>
          <h3 id="snapshot-timeline-title" class="snapshot-timeline-title">時点切替</h3>
          <p class="snapshot-timeline-caption">
            登録状況と表示中の時点を、ボタンの色とラベルで確認できます。
          </p>
        </div>
      </div>
      <div class="snapshot-timeline-buttons">
        ${buttonsHtml}
      </div>
      ${promptHtml}
      ${buildLegacySnapshotNotice(seriesResponse)}
    </section>
  `;
}

function renderDetailRow(item) {
  const rowClasses = ["detail-row", item.rowClass].filter(Boolean).join(" ");
  const safeField = item.field ? escapeHtml(item.field) : "";
  const dataFieldAttribute = safeField ? ` data-field="${safeField}"` : "";

  if (item.useRawValue) {
    return `
      <div class="${rowClasses}"${dataFieldAttribute}>
        <dt>${item.label}</dt>
        <dd>${item.valueHtml}</dd>
      </div>
    `;
  }

  const valueClassName = ["detail-value", item.valueClass].filter(Boolean).join(" ");
  const dataValueAttribute = safeField ? ` data-field-value="${safeField}"` : "";

  return `
    <div class="${rowClasses}"${dataFieldAttribute}>
      <dt>${item.label}</dt>
      <dd>
        <span class="${valueClassName}"${dataValueAttribute}>${item.valueHtml}</span>
      </dd>
    </div>
  `;
}

function renderDefinitionRows(items) {
  return items.map((item) => renderDetailRow(item)).join("");
}

function renderListSection({ title, sectionKey, items, formatter, headerActionHtml = "" }) {
  const content = Array.isArray(items) && items.length > 0
    ? `<ul class="detail-list">${items.map((item) => `<li>${formatter(item)}</li>`).join("")}</ul>`
    : '<p class="empty-value">なし</p>';

  return renderDetailCard({
    title,
    sectionKey,
    content,
    headerActionHtml,
  });
}

function buildRelationSectionActions(scope, snapshot, { archivedSchool = false } = {}) {
  if (archivedSchool || !snapshot?.id) {
    return "";
  }

  return `
    ${buildSectionEditButton(scope)}
    ${buildSectionEditLink(scope, snapshot, "編集画面")}
  `;
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizePitchName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, "");
}

function pitchNameMatches(value, patterns) {
  const normalizedName = normalizePitchName(value);

  if (!normalizedName) {
    return false;
  }

  return patterns.some((pattern) => normalizedName.includes(normalizePitchName(pattern)));
}

function isStraightPitch(pitch) {
  return pitchNameMatches(pitch?.pitch_name, STRAIGHT_PITCH_PATTERNS);
}

function isLeftThrowingHand(value) {
  return ["left", "左"].includes(String(value ?? "").trim().toLowerCase());
}

function mirrorPitchDirection(direction) {
  return PITCH_DIRECTION_MIRROR_MAP[direction] ?? direction;
}

function getCanonicalPitchDirection(pitch) {
  const candidateNames = [pitch?.pitch_name, pitch?.original_pitch_name].filter(Boolean);

  for (const name of candidateNames) {
    const category = PITCH_MOVEMENT_CATEGORIES.find(({ patterns }) => pitchNameMatches(name, patterns));

    if (category) {
      return category.direction;
    }
  }

  return "down";
}

function getDisplayPitchDirection(pitch, throwingHand = "") {
  const canonicalDirection = getCanonicalPitchDirection(pitch);
  return isLeftThrowingHand(throwingHand) ? mirrorPitchDirection(canonicalDirection) : canonicalDirection;
}

function getPitchDisplayLayout(pitch, throwingHand = "") {
  const direction = getDisplayPitchDirection(pitch, throwingHand);
  const directionMeta =
    PITCH_MOVEMENT_DIRECTIONS.find((candidate) => candidate.key === direction) ??
    PITCH_MOVEMENT_DIRECTIONS.find((candidate) => candidate.key === "down");

  return {
    direction,
    directionLabel: directionMeta?.label ?? "",
    orientation: directionMeta?.orientation ?? "vertical",
    angle: directionMeta?.angle ?? 0,
  };
}

function normalizePitchLevel(value, fallback = 1) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return clampNumber(Math.trunc(numericValue), 1, PITCH_METER_MAX_LEVEL);
}

function getPitchDisplayName(pitch) {
  const originalName = String(pitch?.original_pitch_name ?? "").trim();

  if ((Number(pitch?.is_original) === 1 || pitch?.is_original === true) && originalName) {
    return originalName;
  }

  return pitch?.pitch_name ?? "不明";
}

function toPitchDisplayItem(pitch, { baseline = false, throwingHand = "" } = {}) {
  const layout = getPitchDisplayLayout(pitch, throwingHand);
  const straight = baseline || isStraightPitch(pitch);

  return {
    direction: layout.direction,
    orientation: layout.orientation,
    angle: layout.angle,
    name: baseline ? "ストレート" : getPitchDisplayName(pitch),
    level: straight ? 1 : normalizePitchLevel(pitch?.level),
    baseName: pitch?.pitch_name ?? "",
    isOriginal: Number(pitch?.is_original) === 1 || pitch?.is_original === true,
    baseline: straight,
  };
}

function groupPitchesByDirection(snapshot) {
  const pitchTypes = Array.isArray(snapshot?.pitch_types) ? snapshot.pitch_types : [];
  const hasStraightPitch = pitchTypes.some((pitch) => isStraightPitch(pitch));
  const throwingHand = snapshot?.throwing_hand ?? "";
  const displayPitches = [
    ...(hasStraightPitch ? [] : [{ pitch_name: "ストレート", level: 1, is_original: 0, baseline: true }]),
    ...pitchTypes,
  ].map((pitch) => toPitchDisplayItem(pitch, { baseline: Boolean(pitch.baseline), throwingHand }));

  return PITCH_MOVEMENT_DIRECTIONS.reduce((groups, direction) => {
    groups[direction.key] = displayPitches.filter((pitch) => pitch.direction === direction.key);
    return groups;
  }, {});
}

function renderPitcherRankedSummaryValue(value) {
  const rankGroup = getAbilityRank(value);

  if (!rankGroup) {
    return formatValue(value);
  }

  return `
    <span class="pitcher-summary-ranked">
      <span class="pitcher-summary-rank">${rankGroup.rank}</span>
      <span class="pitcher-summary-number">${escapeHtml(value)}</span>
    </span>
  `;
}

function renderPitcherVelocityValue(value) {
  if (value === undefined || value === null || value === "") {
    return formatValue(value);
  }

  return `
    <span class="pitcher-summary-velocity">
      <span class="pitcher-summary-number">${escapeHtml(value)}</span>
      <span class="pitcher-summary-unit">km/h</span>
    </span>
  `;
}

function renderPitchingSummary(snapshot) {
  const rows = [
    {
      field: "velocity",
      label: "球速",
      valueHtml: renderPitcherVelocityValue(snapshot?.velocity),
    },
    {
      field: "control",
      label: "コントロール",
      valueHtml: renderPitcherRankedSummaryValue(snapshot?.control),
    },
    {
      field: "stamina",
      label: "スタミナ",
      valueHtml: renderPitcherRankedSummaryValue(snapshot?.stamina),
    },
  ];

  return `
    <section class="pitcher-summary" aria-label="投手能力要約">
      <h3 class="pitcher-overview-subtitle">投手能力</h3>
      <dl class="pitcher-summary-list">
        ${rows
          .map(
            (row) => `
              <div class="pitcher-summary-row" data-field="${escapeAttribute(row.field)}">
                <dt>${row.label}</dt>
                <dd>${row.valueHtml}</dd>
              </div>
            `
          )
          .join("")}
      </dl>
    </section>
  `;
}

function renderPitchMeter(pitch, index = 0) {
  const safeName = escapeHtml(pitch.name);
  const titleParts = [pitch.name];

  if (pitch.isOriginal && pitch.baseName && pitch.baseName !== pitch.name) {
    titleParts.push(`元: ${pitch.baseName}`);
  }

  const segmentCount = pitch.baseline ? 1 : PITCH_METER_MAX_LEVEL;
  const segments = Array.from({ length: segmentCount }, (_, segmentIndex) => {
    const segmentLevel = segmentIndex + 1;
    const activeClass = segmentLevel <= pitch.level ? " is-active" : "";
    return `<span class="pitch-meter-segment${activeClass}" aria-hidden="true"></span>`;
  }).join("");

  return `
    <div
      class="pitch-meter"
      data-pitch-direction="${escapeAttribute(pitch.direction)}"
      data-pitch-orientation="${escapeAttribute(pitch.orientation)}"
      data-pitch-baseline="${pitch.baseline ? "true" : "false"}"
      style="--pitch-lane: ${index}; --pitch-angle: ${Number(pitch.angle) || 0}deg;"
      aria-label="${escapeAttribute(`${pitch.name} 変化量 ${pitch.level}`)}"
    >
      <div class="pitch-meter-label">
        <span class="pitch-meter-name" title="${escapeAttribute(titleParts.join(" / "))}">${safeName}</span>
        <span class="pitch-meter-level">Lv${escapeHtml(pitch.level)}</span>
      </div>
      <div class="pitch-meter-track" aria-hidden="true">
        ${segments}
      </div>
    </div>
  `;
}

function renderPitchDirection(direction, pitches) {
  const directionPitches = Array.isArray(pitches) ? pitches : [];
  const emptyClass = directionPitches.length > 0 ? "" : " is-empty";

  return `
    <div
      class="pitch-direction pitch-direction--${escapeAttribute(direction.key)}${emptyClass}"
      data-pitch-direction="${escapeAttribute(direction.key)}"
      aria-label="${escapeAttribute(`${direction.label}方向`)}"
    >
      <div class="pitch-direction-guide" aria-hidden="true"></div>
      <div class="pitch-direction-meters">
        ${directionPitches.map((pitch, index) => renderPitchMeter(pitch, index)).join("")}
      </div>
    </div>
  `;
}

function renderPitchMovementChart(snapshot) {
  const groupedPitches = groupPitchesByDirection(snapshot);

  return `
    <section class="pitch-movement" aria-label="変化球表示">
      <h3 class="pitcher-overview-subtitle">変化球</h3>
      <div class="pitch-movement-chart">
        <div class="pitch-movement-center" aria-hidden="true">
          <span class="pitch-movement-ball"></span>
        </div>
        ${PITCH_MOVEMENT_DIRECTIONS.map((direction) =>
          renderPitchDirection(direction, groupedPitches[direction.key])
        ).join("")}
      </div>
    </section>
  `;
}

function buildPitcherOverviewActions(snapshot, { archivedSchool = false } = {}) {
  if (archivedSchool) {
    return "";
  }

  const pitchActions = snapshot?.id
    ? `
      ${buildSectionEditButton("pitches", "変化球編集")}
      ${buildSectionEditLink("pitches", snapshot, "編集画面")}
    `
    : "";

  return `
    ${buildSectionEditButton("pitcher", "能力編集")}
    ${pitchActions}
  `;
}

function renderPitcherOverviewSection(snapshot, { archivedSchool = false } = {}) {
  if (!isPitcherPosition(snapshot?.main_position)) {
    return "";
  }

  return renderDetailCard({
    title: "投手情報",
    sectionKey: "pitcher-overview",
    bodyClass: "detail-card-body--pitcher-overview",
    headerActionHtml: buildPitcherOverviewActions(snapshot, { archivedSchool }),
    content: `
      <div class="pitcher-overview-scroll">
        <div class="pitcher-overview-layout">
          ${renderPitchingSummary(snapshot)}
          ${renderPitchMovementChart(snapshot)}
        </div>
      </div>
    `,
  });
}

function renderPitchTypeSection(snapshot, { archivedSchool = false } = {}) {
  if (!isPitcherPosition(snapshot?.main_position)) {
    return "";
  }

  return renderListSection({
    title: "変化球一覧",
    sectionKey: "pitch-types",
    items: snapshot?.pitch_types,
    formatter: (item) => {
      const pitchName = escapeHtml(item.pitch_name ?? "不明");
      const level = item.level !== undefined && item.level !== null ? ` Lv${escapeHtml(item.level)}` : "";
      const original = item.is_original ? " (オリジナル)" : "";
      const originalName = item.original_pitch_name ? ` / ${escapeHtml(item.original_pitch_name)}` : "";

      return `${pitchName}${level}${original}${originalName}`;
    },
    headerActionHtml: buildRelationSectionActions("pitches", snapshot, { archivedSchool }),
  });
}

function renderSpecialAbilitySection(snapshot, { archivedSchool = false } = {}) {
  return renderListSection({
    title: "特殊能力一覧",
    sectionKey: "special",
    items: snapshot?.special_abilities,
    formatter: (item) => {
      const name = escapeHtml(item.ability_name ?? "不明");
      const rank = item.rank_value ? ` (${escapeHtml(item.rank_value)})` : "";
      const category = item.ability_category ? ` [${escapeHtml(item.ability_category)}]` : "";

      return `${name}${rank}${category}`;
    },
    headerActionHtml: buildRelationSectionActions("special", snapshot, { archivedSchool }),
  });
}

function renderSubPositionSection(snapshot, { archivedSchool = false } = {}) {
  return renderListSection({
    title: "サブポジ一覧",
    sectionKey: "sub-positions",
    items: snapshot?.sub_positions,
    formatter: (item) => {
      const name = escapeHtml(item.position_name ?? "不明");
      const suitability = item.suitability_value ? ` (${escapeHtml(item.suitability_value)})` : "";

      return `${name}${suitability}`;
    },
    headerActionHtml: buildRelationSectionActions("sub_positions", snapshot, { archivedSchool }),
  });
}

function setMessage(messageElement, message, isError = false) {
  messageElement.textContent = message;
  messageElement.classList.toggle("is-visible", Boolean(message));
  messageElement.classList.toggle("is-error", Boolean(message) && isError);
  messageElement.classList.toggle("is-success", Boolean(message) && !isError);
}

function getToastRegion() {
  if (DETAIL_STATE.refs?.toastRegionElement) {
    return DETAIL_STATE.refs.toastRegionElement;
  }

  return document.getElementById("player-detail-toast-region");
}

function showToast(message, options = {}) {
  const toastRegion = getToastRegion();

  if (!toastRegion) {
    return {
      close: async () => {},
      closed: Promise.resolve(),
    };
  }

  const {
    variant = "info",
    duration = TOAST_DEFAULT_DURATION_MS,
    minVisibleMs = 0,
    persistent = false,
    role = variant === "error" ? "alert" : "status",
  } = options;
  const toastId = `player-toast-${DETAIL_STATE.nextToastId++}`;
  const toastElement = document.createElement("div");

  toastElement.className = `player-toast player-toast--${variant}`;
  toastElement.dataset.toastId = toastId;
  toastElement.setAttribute("role", role);
  toastElement.setAttribute("aria-live", role === "alert" ? "assertive" : "polite");
  toastElement.innerHTML = `
    <div class="player-toast-copy">
      <p class="player-toast-text">${escapeHtml(message)}</p>
    </div>
  `;

  toastRegion.appendChild(toastElement);
  window.requestAnimationFrame(() => {
    toastElement.classList.add("is-visible");
  });

  const shownAt = Date.now();
  let closeTimerId = null;
  let isClosed = false;
  let finishClose;
  const closed = new Promise((resolve) => {
    finishClose = resolve;
  });

  function finalizeClose() {
    if (isClosed) {
      return;
    }

    isClosed = true;
    toastElement.classList.remove("is-visible");
    toastElement.classList.add("is-exiting");
    window.setTimeout(() => {
      toastElement.remove();
      finishClose();
    }, TOAST_TRANSITION_MS);
  }

  async function close() {
    if (isClosed) {
      return closed;
    }

    if (closeTimerId) {
      window.clearTimeout(closeTimerId);
      closeTimerId = null;
    }

    const elapsedMs = Date.now() - shownAt;
    const remainingMs = Math.max(0, minVisibleMs - elapsedMs);

    if (remainingMs > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, remainingMs));
    }

    finalizeClose();
    return closed;
  }

  if (!persistent) {
    closeTimerId = window.setTimeout(() => {
      close().catch(() => {});
    }, Math.max(duration, minVisibleMs));
  }

  return {
    close,
    closed,
    element: toastElement,
  };
}

function showLoadingToast(message, options = {}) {
  return showToast(message, {
    variant: "loading",
    persistent: true,
    minVisibleMs: options.minVisibleMs ?? TOAST_LOADING_MIN_VISIBLE_MS,
  });
}

function showSuccessToast(message, options = {}) {
  return showToast(message, {
    variant: "success",
    duration: options.duration ?? TOAST_SUCCESS_DURATION_MS,
    minVisibleMs: options.minVisibleMs ?? 700,
  });
}

function showErrorToast(message, options = {}) {
  return showToast(message, {
    variant: "error",
    duration: options.duration ?? TOAST_ERROR_DURATION_MS,
    minVisibleMs: options.minVisibleMs ?? 1000,
    role: "alert",
  });
}

function renderActions(container, actions) {
  container.innerHTML = actions
    .map(
      (action) => `
        <a class="player-button ${action.primary ? "player-button-primary" : "player-button-secondary"}" href="${action.href}">
          ${action.label}
        </a>
      `
    )
    .join("");
}

function syncDetailState(seriesResponse) {
  DETAIL_STATE.playerSeries = seriesResponse?.playerSeries ?? null;
  DETAIL_STATE.snapshots = Array.isArray(seriesResponse?.snapshots) ? seriesResponse.snapshots : [];
  DETAIL_STATE.currentSnapshot = seriesResponse?.currentSnapshot ?? null;
  DETAIL_STATE.player = buildPlayerViewModel(seriesResponse);
  DETAIL_STATE.confirmBeforeCreateSnapshot = readSnapshotCreateConfirmationPreference(
    DETAIL_STATE.playerSeries?.school_id ?? DETAIL_STATE.currentSnapshot?.school_id ?? null
  );
  clearSnapshotButtonFeedback();
}

function renderCurrentPlayerDetail() {
  if (!DETAIL_STATE.refs) {
    return;
  }

  renderPlayer(DETAIL_STATE.refs, getCurrentSeriesResponse());
}

async function loadPlayerDetail({
  snapshot = "",
  syncUrl = false,
  successMessage = "",
  loadingMessage = "",
} = {}) {
  const playerId = DETAIL_STATE.playerId || getPlayerIdFromQuery();
  const loadingToast = loadingMessage ? showLoadingToast(loadingMessage) : null;

  try {
    const seriesResponse = await fetchPlayerDetailById(playerId, snapshot ? { snapshot } : {});

    DETAIL_STATE.pendingCreateSnapshotKey = "";
    syncDetailState(seriesResponse);
    renderCurrentPlayerDetail();

    if (syncUrl) {
      syncSnapshotQuery(seriesResponse?.currentSnapshot?.snapshot_label ?? snapshot);
    }

    if (DETAIL_STATE.refs?.messageElement) {
      setMessage(DETAIL_STATE.refs.messageElement, "");
    }

    if (loadingToast) {
      loadingToast.close().catch(() => {});
    }

    if (successMessage) {
      if (loadingToast) {
        loadingToast.closed.then(() => showSuccessToast(successMessage));
      } else {
        showSuccessToast(successMessage);
      }
    }

    return seriesResponse;
  } catch (error) {
    if (loadingToast) {
      loadingToast.close().catch(() => {});
    }

    throw error;
  }
}

function renderError(refs, message) {
  refs.titleElement.textContent = "選手詳細";
  refs.contextElement.textContent = "選手情報を取得できませんでした。";
  refs.schoolNameElement.textContent = "学校情報なし";
  refs.schoolMetaElement.textContent = "";
  renderActions(refs.actionsElement, [
    { href: "./schools.html", label: "学校一覧へ戻る", primary: false },
  ]);
  setMessage(refs.messageElement, message, true);

  refs.root.innerHTML = `
    <section class="detail-card">
      <div class="player-empty-state">
        <p class="player-empty-text">学校一覧から選手を選び直してください。</p>
        <a class="player-button player-button-secondary" href="./schools.html">学校一覧へ戻る</a>
      </div>
    </section>
  `;
}

function renderPlayerLegacy(refs, seriesResponse) {
  return (() => {
    const player = buildPlayerViewModel(seriesResponse);
    const playerSeries = seriesResponse?.playerSeries ?? null;
    const currentSnapshot = seriesResponse?.currentSnapshot ?? null;

    if (!player || !playerSeries || !currentSnapshot) {
      renderError(refs, "選手情報の読み込みに失敗しました。");
      return;
    }

    const archivedSchool = isArchivedSchool(player);
    const schoolNameText = formatSchoolName(player.school_name, "不明");
    const schoolNameHtml = escapeHtml(schoolNameText);
    const shouldShowPitcherSection = isPitcherPosition(player.main_position);
    const displayName = playerSeries.name || player.name || "選手名未設定";
    const snapshotDisplayLabel =
      currentSnapshot.snapshot_label_display ??
      SNAPSHOT_LABELS[currentSnapshot.snapshot_label] ??
      currentSnapshot.snapshot_label;
    const contextParts = [
      `表示中: ${snapshotDisplayLabel}`,
      `スナップショットID: ${currentSnapshot.id}`,
    ];

    if (currentSnapshot.is_legacy_snapshot_label) {
      contextParts.push("旧データ時点");
    }

    if (archivedSchool) {
      contextParts.push("凍結データ");
    }

    document.title = `${displayName} | 選手詳細`;
    refs.titleElement.textContent = displayName;
    refs.contextElement.textContent = contextParts.join(" / ");
    refs.schoolNameElement.textContent = schoolNameText;
    refs.schoolMetaElement.textContent = archivedSchool ? "削除済み学校の凍結データ" : "";

    renderActions(
      refs.actionsElement,
      archivedSchool
        ? [{ href: "./schools.html", label: "学校一覧へ戻る", primary: false }]
        : [
            {
              href: `./school_detail.html?id=${encodeURIComponent(player.school_id)}`,
              label: "学校詳細へ戻る",
              primary: false,
            },
            {
              href: `./player_edit.html?id=${encodeURIComponent(currentSnapshot.id)}`,
              label: "選手情報を編集",
              primary: true,
            },
          ]
    );

    const basicInfo = renderDefinitionRows([
      { field: "grade", label: "学年", valueHtml: formatValue(currentSnapshot.grade) },
      { field: "admission_year", label: "入学年", valueHtml: formatValue(playerSeries.admission_year) },
      { field: "prefecture", label: "出身都道府県", valueHtml: formatValue(playerSeries.prefecture) },
      {
        field: "main_position",
        label: "メインポジション",
        valueHtml: formatValue(currentSnapshot.main_position),
      },
      { field: "player_type", label: "選手種別", valueHtml: formatPlayerType(playerSeries.player_type) },
      { field: "throw_bat", label: "投打", valueHtml: formatThrowBat(player) },
      {
        field: "snapshot_label",
        label: "現在の時点",
        valueHtml: renderSnapshotValue(currentSnapshot.snapshot_label),
        rowClass: "detail-row--full detail-row--snapshot",
        useRawValue: true,
      },
    ]);

    const pitcherInfo = renderDefinitionRows([
      { field: "velocity", label: "球速", valueHtml: formatValue(currentSnapshot.velocity) },
      {
        field: "control",
        label: "コントロール",
        valueHtml: renderRankedAbilityValue(currentSnapshot.control),
      },
      {
        field: "stamina",
        label: "スタミナ",
        valueHtml: renderRankedAbilityValue(currentSnapshot.stamina),
      },
    ]);

    const batterInfo = renderDefinitionRows([
      { field: "trajectory", label: "弾道", valueHtml: formatValue(currentSnapshot.trajectory) },
      { field: "meat", label: "ミート", valueHtml: renderRankedAbilityValue(currentSnapshot.meat) },
      { field: "power", label: "パワー", valueHtml: renderRankedAbilityValue(currentSnapshot.power) },
      {
        field: "run_speed",
        label: "走力",
        valueHtml: renderRankedAbilityValue(currentSnapshot.run_speed),
      },
      {
        field: "arm_strength",
        label: "肩力",
        valueHtml: renderRankedAbilityValue(currentSnapshot.arm_strength),
      },
      {
        field: "fielding",
        label: "守備",
        valueHtml: renderRankedAbilityValue(currentSnapshot.fielding),
      },
      {
        field: "catching",
        label: "捕球",
        valueHtml: renderRankedAbilityValue(currentSnapshot.catching),
      },
    ]);

    const pitchTypesSection = renderPitchTypeSection(currentSnapshot, { archivedSchool });
    const specialAbilitiesSection = renderSpecialAbilitySection(currentSnapshot, { archivedSchool });
    const subPositionsSection = renderSubPositionSection(currentSnapshot, { archivedSchool });

    const archivedNotice = archivedSchool
      ? `
        <section class="detail-card">
          <div class="player-empty-state">
            <p class="player-empty-text">
              この選手は削除済み学校「${schoolNameHtml}」に紐づいていた凍結データです。通常の一覧には表示されませんが、履歴参照では閲覧できます。
            </p>
          </div>
        </section>
      `
      : "";

    const basicSection = renderDetailCard({
      title: "基本情報",
      sectionKey: "basic",
      headerActionHtml: archivedSchool ? "" : buildSectionEditButton("basic"),
      content: `
        <dl class="detail-grid detail-grid--basic" data-detail-grid="basic">
          ${basicInfo}
        </dl>
        ${buildSnapshotTimelineButtons(seriesResponse)}
      `,
    });

    const pitcherSection = shouldShowPitcherSection
      ? renderDetailCard({
          title: "投手能力",
          sectionKey: "pitcher",
          headerActionHtml: archivedSchool ? "" : buildSectionEditButton("pitcher"),
          content: `
            <dl class="detail-grid compact-grid" data-detail-grid="pitcher">
              ${pitcherInfo}
            </dl>
          `,
        })
      : "";

    const batterSection = renderDetailCard({
      title: "野手能力",
      sectionKey: "batter",
      headerActionHtml: archivedSchool ? "" : buildSectionEditButton("batter"),
      content: `
        <dl class="detail-grid compact-grid" data-detail-grid="batter">
          ${batterInfo}
        </dl>
      `,
    });

    refs.root.innerHTML = `
      ${archivedNotice}
      ${basicSection}
      ${pitcherSection}
      ${pitchTypesSection}
      ${batterSection}
      ${specialAbilitiesSection}
      ${subPositionsSection}
    `;
  })();
  const archivedSchool = isArchivedSchool(player);
  const schoolNameText = formatSchoolName(player.school_name, "不明");
  const schoolNameHtml = escapeHtml(schoolNameText);
  const shouldShowPitcherSection = isPitcherPosition(player.main_position);
  const displayName = player.name || "名称未設定";

  document.title = `${displayName} | 選手詳細`;
  refs.titleElement.textContent = displayName;
  refs.contextElement.textContent = archivedSchool
    ? `選手ID: ${player.id} / 保持データ`
    : `選手ID: ${player.id}`;
  refs.schoolNameElement.textContent = schoolNameText;
  refs.schoolMetaElement.textContent = archivedSchool ? "削除済み学校の保持データ" : "";

  renderActions(
    refs.actionsElement,
    archivedSchool
      ? [{ href: "./schools.html", label: "学校一覧へ戻る", primary: false }]
      : [
          {
            href: `./school_detail.html?id=${encodeURIComponent(player.school_id)}`,
            label: "学校詳細へ戻る",
            primary: false,
          },
          {
            href: `./player_edit.html?id=${encodeURIComponent(player.id)}`,
            label: "選手情報を編集",
            primary: true,
          },
        ]
  );

  const basicInfo = renderDefinitionRows([
    { field: "grade", label: "学年", valueHtml: formatValue(player.grade) },
    { field: "admission_year", label: "入学年", valueHtml: formatValue(player.admission_year) },
    { field: "prefecture", label: "出身都道府県", valueHtml: formatValue(player.prefecture) },
    { field: "main_position", label: "メインポジション", valueHtml: formatValue(player.main_position) },
    { field: "player_type", label: "選手種別", valueHtml: formatPlayerType(player.player_type) },
    { field: "throw_bat", label: "投打", valueHtml: formatThrowBat(player) },
    {
      field: "snapshot_label",
      label: "スナップショット種別",
      valueHtml: renderSnapshotValue(player.snapshot_label),
      rowClass: "detail-row--full detail-row--snapshot",
      useRawValue: true,
    },
  ]);

  const pitcherInfo = renderDefinitionRows([
    { field: "velocity", label: "球速", valueHtml: formatValue(player.velocity) },
    { field: "control", label: "コントロール", valueHtml: renderRankedAbilityValue(player.control) },
    { field: "stamina", label: "スタミナ", valueHtml: renderRankedAbilityValue(player.stamina) },
  ]);

  const batterInfo = renderDefinitionRows([
    { field: "trajectory", label: "弾道", valueHtml: formatValue(player.trajectory) },
    { field: "meat", label: "ミート", valueHtml: renderRankedAbilityValue(player.meat) },
    { field: "power", label: "パワー", valueHtml: renderRankedAbilityValue(player.power) },
    { field: "run_speed", label: "走力", valueHtml: renderRankedAbilityValue(player.run_speed) },
    { field: "arm_strength", label: "肩力", valueHtml: renderRankedAbilityValue(player.arm_strength) },
    { field: "fielding", label: "守備", valueHtml: renderRankedAbilityValue(player.fielding) },
    { field: "catching", label: "捕球", valueHtml: renderRankedAbilityValue(player.catching) },
  ]);

  const pitchTypesSection = renderPitchTypeSection(player, { archivedSchool });
  const specialAbilitiesSection = renderSpecialAbilitySection(player, { archivedSchool });
  const subPositionsSection = renderSubPositionSection(player, { archivedSchool });

  const archivedNotice = archivedSchool
    ? `
      <section class="detail-card">
        <div class="player-empty-state">
          <p class="player-empty-text">
            この選手は削除済み学校「${schoolNameHtml}」に所属していた保持データです。通常の一覧には表示されず、現時点では編集できません。
          </p>
        </div>
      </section>
    `
    : "";

  const basicSection = renderDetailCard({
    title: "基本情報",
    sectionKey: "basic",
    headerActionHtml: archivedSchool ? "" : buildSectionEditButton("basic"),
    content: `
      <dl class="detail-grid detail-grid--basic" data-detail-grid="basic">
        ${basicInfo}
      </dl>
    `,
  });

  const pitcherSection = shouldShowPitcherSection
    ? renderDetailCard({
        title: "投手能力",
        sectionKey: "pitcher",
        headerActionHtml: archivedSchool ? "" : buildSectionEditButton("pitcher"),
        content: `
          <dl class="detail-grid compact-grid" data-detail-grid="pitcher">
            ${pitcherInfo}
          </dl>
        `,
      })
    : "";

  const batterSection = renderDetailCard({
    title: "野手能力",
    sectionKey: "batter",
    headerActionHtml: archivedSchool ? "" : buildSectionEditButton("batter"),
    content: `
      <dl class="detail-grid compact-grid" data-detail-grid="batter">
        ${batterInfo}
      </dl>
    `,
  });

  refs.root.innerHTML = `
    ${archivedNotice}
    ${basicSection}
    ${pitcherSection}
    ${pitchTypesSection}
    ${batterSection}
    ${specialAbilitiesSection}
    ${subPositionsSection}
  `;
}

function renderPlayer(refs, seriesResponse) {
  const player = buildPlayerViewModel(seriesResponse);
  const playerSeries = seriesResponse?.playerSeries ?? null;
  const currentSnapshot = seriesResponse?.currentSnapshot ?? null;

  if (!player || !playerSeries || !currentSnapshot) {
    renderError(refs, "選手情報の読み込みに失敗しました。");
    return;
  }

  const archivedSchool = isArchivedSchool(player);
  const schoolNameText = formatSchoolName(player.school_name, "不明");
  const schoolNameHtml = escapeHtml(schoolNameText);
  const shouldShowPitcherSection = isPitcherPosition(currentSnapshot.main_position);
  const displayName = playerSeries.name || player.name || "選手名未設定";
  const snapshotDisplayLabel =
    currentSnapshot.snapshot_label_display ??
    SNAPSHOT_LABELS[currentSnapshot.snapshot_label] ??
    currentSnapshot.snapshot_label;
  const contextParts = [
    `表示中: ${snapshotDisplayLabel}`,
    `スナップショットID: ${currentSnapshot.id}`,
  ];

  if (currentSnapshot.is_legacy_snapshot_label) {
    contextParts.push("旧データ時点");
  }

  if (archivedSchool) {
    contextParts.push("凍結データ");
  }

  document.title = `${displayName} | 選手詳細`;
  refs.titleElement.textContent = displayName;
  refs.contextElement.textContent = contextParts.join(" / ");
  refs.schoolNameElement.textContent = schoolNameText;
  refs.schoolMetaElement.textContent = archivedSchool ? "削除済み学校の凍結データ" : "";

  renderActions(
    refs.actionsElement,
    archivedSchool
      ? [{ href: "./schools.html", label: "学校一覧へ戻る", primary: false }]
      : [
          {
            href: `./school_detail.html?id=${encodeURIComponent(player.school_id)}`,
            label: "学校詳細へ戻る",
            primary: false,
          },
          {
            href: `./player_edit.html?id=${encodeURIComponent(currentSnapshot.id)}`,
            label: "選手情報を編集",
            primary: true,
          },
        ]
  );

  const basicInfo = renderDefinitionRows([
    { field: "grade", label: "学年", valueHtml: formatValue(currentSnapshot.grade) },
    { field: "admission_year", label: "入学年", valueHtml: formatValue(playerSeries.admission_year) },
    { field: "prefecture", label: "出身都道府県", valueHtml: formatValue(playerSeries.prefecture) },
    {
      field: "main_position",
      label: "メインポジション",
      valueHtml: formatValue(currentSnapshot.main_position),
    },
    { field: "player_type", label: "選手種別", valueHtml: formatPlayerType(playerSeries.player_type) },
    { field: "throw_bat", label: "投打", valueHtml: formatThrowBat(player) },
    {
      field: "snapshot_label",
      label: "現在の時点",
      valueHtml: renderSnapshotValue(currentSnapshot.snapshot_label),
      rowClass: "detail-row--full detail-row--snapshot",
      useRawValue: true,
    },
  ]);

  const batterInfo = renderDefinitionRows([
    { field: "trajectory", label: "弾道", valueHtml: formatValue(currentSnapshot.trajectory) },
    { field: "meat", label: "ミート", valueHtml: renderRankedAbilityValue(currentSnapshot.meat) },
    { field: "power", label: "パワー", valueHtml: renderRankedAbilityValue(currentSnapshot.power) },
    { field: "run_speed", label: "走力", valueHtml: renderRankedAbilityValue(currentSnapshot.run_speed) },
    {
      field: "arm_strength",
      label: "肩力",
      valueHtml: renderRankedAbilityValue(currentSnapshot.arm_strength),
    },
    { field: "fielding", label: "守備", valueHtml: renderRankedAbilityValue(currentSnapshot.fielding) },
    { field: "catching", label: "捕球", valueHtml: renderRankedAbilityValue(currentSnapshot.catching) },
  ]);

  const pitcherOverviewSection = shouldShowPitcherSection
    ? renderPitcherOverviewSection(
        {
          ...currentSnapshot,
          throwing_hand: player.throwing_hand ?? currentSnapshot.throwing_hand,
        },
        { archivedSchool }
      )
    : "";
  const specialAbilitiesSection = renderSpecialAbilitySection(currentSnapshot, { archivedSchool });
  const subPositionsSection = renderSubPositionSection(currentSnapshot, { archivedSchool });

  const archivedNotice = archivedSchool
    ? `
      <section class="detail-card">
        <div class="player-empty-state">
          <p class="player-empty-text">
            この選手は削除済み学校「${schoolNameHtml}」に紐づいていた凍結データです。通常の一覧には表示されませんが、履歴参照では閲覧できます。
          </p>
        </div>
      </section>
    `
    : "";

  const basicSection = renderDetailCard({
    title: "基本情報",
    sectionKey: "basic",
    headerActionHtml: archivedSchool ? "" : buildSectionEditButton("basic"),
    content: `
      <dl class="detail-grid detail-grid--basic" data-detail-grid="basic">
        ${basicInfo}
      </dl>
      ${buildSnapshotTimelineButtons(seriesResponse)}
    `,
  });

  const batterSection = renderDetailCard({
    title: "野手能力",
    sectionKey: "batter",
    headerActionHtml: archivedSchool ? "" : buildSectionEditButton("batter"),
    content: `
      <dl class="detail-grid compact-grid" data-detail-grid="batter">
        ${batterInfo}
      </dl>
    `,
  });

  refs.root.innerHTML = `
    ${archivedNotice}
    ${basicSection}
    ${pitcherOverviewSection}
    ${batterSection}
    ${specialAbilitiesSection}
    ${subPositionsSection}
  `;
}

function parseOptionalIntegerField(formData, field) {
  const value = formData.get(field);

  if (value === null) {
    return null;
  }

  const text = String(value).trim();
  return text === "" ? null : Number(text);
}

function appendOptionalIntegerPayload(payload, formData, field) {
  if (formData.has(field)) {
    payload[field] = parseOptionalIntegerField(formData, field);
  }
}

function buildRequiredUpdatePayload(player) {
  return {
    name: player.name,
    player_type: player.player_type,
    prefecture: player.prefecture,
    grade: Number(player.grade),
    admission_year: Number(player.admission_year),
    snapshot_label: player.snapshot_label,
    main_position: player.main_position,
    throwing_hand: player.throwing_hand,
    batting_hand: player.batting_hand,
  };
}

function buildBasicSectionPayload(formData) {
  return {
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

function buildAbilitySectionPayload(formData, fields) {
  const payload = {};

  fields.forEach((fieldConfig) => {
    appendOptionalIntegerPayload(payload, formData, fieldConfig.field);
  });

  return payload;
}

function buildSectionUpdatePayload(scope, formData, form, player, relationOptions) {
  if (scope === "basic") {
    return buildBasicSectionPayload(formData);
  }

  if (scope === "pitcher") {
    return buildAbilitySectionPayload(formData, PITCHER_ABILITY_FIELDS);
  }

  if (scope === "batter") {
    return buildAbilitySectionPayload(formData, BATTER_ABILITY_FIELDS);
  }

  if (scope === "special") {
    return {
      special_abilities: serializeRelationInputs(form, relationOptions, {
        includePitchTypes: false,
        mainPosition: player.main_position,
      }).special_abilities,
    };
  }

  if (scope === "pitches") {
    return {
      pitch_types: serializeRelationInputs(form, relationOptions, {
        includePitchTypes: true,
        mainPosition: player.main_position,
      }).pitch_types,
    };
  }

  if (scope === "sub_positions") {
    return {
      sub_positions: serializeRelationInputs(form, relationOptions, {
        includePitchTypes: false,
        mainPosition: player.main_position,
      }).sub_positions,
    };
  }

  return {};
}

function buildNumericOptions(min, max, selectedValue) {
  const normalizedSelectedValue =
    selectedValue === null || selectedValue === undefined || selectedValue === ""
      ? ""
      : String(selectedValue);

  return Array.from({ length: max - min + 1 }, (_, index) => {
    const value = String(min + index);
    const selected = value === normalizedSelectedValue ? " selected" : "";
    return `<option value="${value}"${selected}>${value}</option>`;
  }).join("");
}

function buildRankValueOptions(selectedRank, selectedValue) {
  const rankGroup = ABILITY_RANK_GROUPS.find((group) => group.rank === selectedRank);

  if (!rankGroup) {
    if (selectedValue !== null && selectedValue !== undefined && selectedValue !== "") {
      return `<option value="${escapeAttribute(selectedValue)}" selected>${escapeAttribute(
        selectedValue
      )}</option>`;
    }

    return '<option value="">数値を選択</option>';
  }

  return buildNumericOptions(rankGroup.min, rankGroup.max, selectedValue);
}

function renderFormControlRow({
  field,
  label,
  labelFor = field,
  controlHtml,
  rowClass = "",
  helpText = "",
  controlClass = "player-form-control",
}) {
  const rowClassName = ["player-form-row", rowClass].filter(Boolean).join(" ");

  return `
    <div class="${rowClassName}" data-field="${field}">
      <label class="player-form-label" for="${labelFor}">${label}</label>
      <div class="${controlClass}">
        ${controlHtml}
        ${helpText ? `<p class="player-form-help">${helpText}</p>` : ""}
      </div>
    </div>
  `;
}

function renderSelectControlRow({
  field,
  label,
  options,
  value,
  required = false,
  grouped = false,
  rowClass = "",
  helpText = "",
}) {
  const selectAttributes = buildAttributeString({
    id: field,
    name: field,
    required,
  });
  const optionHtml = grouped ? buildGroupedOptions(options, value) : buildOptions(options, value);

  return renderFormControlRow({
    field,
    label,
    rowClass,
    helpText,
    controlHtml: `
      <select ${selectAttributes}>
        ${optionHtml}
      </select>
    `,
  });
}

function renderYearControlRow(value) {
  return renderFormControlRow({
    field: "admission_year",
    label: "入学年",
    rowClass: "player-form-row--full",
    controlClass: "player-form-control player-form-control--year",
    controlHtml: buildAdmissionYearPicker({
      selectedYear: value,
    }),
  });
}

function renderAbilityBlock({
  field,
  label,
  labelFor = field,
  controlHtml,
  helpText = "",
  hiddenInputHtml = "",
  extraAttributes = "",
}) {
  return `
    <div class="player-form-row player-form-row--ability" data-field="${field}" ${extraAttributes}>
      <div class="player-ability-header">
        <label class="player-form-label player-ability-label" for="${labelFor}">${label}</label>
      </div>
      ${hiddenInputHtml}
      <div class="player-form-control player-ability-control-group">
        ${helpText ? `<p class="player-form-help player-ability-help">${helpText}</p>` : ""}
        ${controlHtml}
      </div>
    </div>
  `;
}

function renderTrajectoryEditField({ field, label, value }) {
  const selectedValue = value === null || value === undefined || value === "" ? "" : String(value);

  return renderAbilityBlock({
    field,
    label,
    helpText: "1～4から選択してください",
    controlHtml: `
      <div class="player-ability-single-control">
        <div class="player-ability-input">
          <span class="player-ability-input-label">弾道</span>
          <select id="${field}" name="${field}">
            <option value=""${selectedValue === "" ? " selected" : ""}>選択してください</option>
            ${buildOptions(["1", "2", "3", "4"], selectedValue)}
          </select>
        </div>
      </div>
    `,
  });
}

function renderRankedEditField({ field, label, value }) {
  const currentValue = value === null || value === undefined ? "" : String(value);
  const selectedRank = getAbilityRank(value)?.rank ?? "";

  return renderAbilityBlock({
    field,
    label,
    labelFor: `${field}_rank`,
    extraAttributes: `data-ranked-ability="${field}"`,
    hiddenInputHtml: `
      <input
        type="hidden"
        name="${field}"
        value="${escapeAttribute(currentValue)}"
        data-ranked-value-hidden="${field}"
      >
    `,
    controlHtml: `
      <div class="player-ability-pair">
        <div class="player-ability-input">
          <span class="player-ability-input-label">ランク</span>
          <select id="${field}_rank" data-ranked-rank="${field}" aria-label="${label}ランク">
            <option value="">ランクを選択</option>
            ${buildOptions(ABILITY_RANK_GROUPS.map((group) => group.rank), selectedRank)}
          </select>
        </div>
        <div class="player-ability-input">
          <span class="player-ability-input-label">数値</span>
          <select id="${field}_value" data-ranked-value="${field}" aria-label="${label}数値">
            ${buildRankValueOptions(selectedRank, currentValue)}
          </select>
        </div>
      </div>
    `,
  });
}

function renderNumberEditField({ field, label, value, min = 0 }) {
  const inputAttributes = buildAttributeString({
    id: field,
    name: field,
    type: "number",
    inputmode: "numeric",
    value: value ?? "",
    min,
    step: 1,
  });

  return renderAbilityBlock({
    field,
    label,
    controlHtml: `
      <div class="player-ability-single-control">
        <div class="player-ability-input">
          <span class="player-ability-input-label">数値</span>
          <input ${inputAttributes}>
        </div>
      </div>
    `,
  });
}

function renderAbilityEditField(fieldConfig, player) {
  const value = player[fieldConfig.field];

  if (fieldConfig.inputType === "ranked") {
    return renderRankedEditField({
      field: fieldConfig.field,
      label: fieldConfig.label,
      value,
    });
  }

  if (fieldConfig.inputType === "trajectory") {
    return renderTrajectoryEditField({
      field: fieldConfig.field,
      label: fieldConfig.label,
      value,
    });
  }

  return renderNumberEditField({
    field: fieldConfig.field,
    label: fieldConfig.label,
    value,
    min: fieldConfig.min ?? 0,
  });
}

function renderAbilityEditFields(fields, player) {
  return fields.map((field) => renderAbilityEditField(field, player)).join("");
}

function renderModalFormSection({
  sectionKey,
  title,
  description = "",
  content,
  fieldsClass = "player-form-fields player-form-fields--compact",
}) {
  return `
    <section class="player-form-section player-form-section--modal" data-edit-section="${escapeAttribute(sectionKey)}">
      <div class="player-form-section-header">
        <div>
          <h3 class="player-form-section-title">${title}</h3>
          ${description ? `<p class="player-form-section-description">${description}</p>` : ""}
        </div>
      </div>
      <div class="${fieldsClass}">
        ${content}
      </div>
    </section>
  `;
}

function renderSectionEditFormLayout({ scope, player, content, note = "" }) {
  const meta = SECTION_EDIT_META[scope] ?? SECTION_EDIT_META.basic;
  const canSubmit = Boolean(meta.submitLabel);

  return `
    <form class="player-form player-form--modal" data-section-edit-form data-section-edit-scope="${escapeAttribute(scope)}">
      <input type="hidden" name="player_id" value="${escapeAttribute(player.id)}">
      ${note ? `<p class="player-modal-note">${note}</p>` : ""}
      ${content}
      <div class="player-form-actions player-modal-actions">
        <button type="button" class="player-button player-button-secondary" data-modal-close>キャンセル</button>
        ${
          canSubmit
            ? `<button type="submit" class="player-button player-button-primary">${meta.submitLabel}</button>`
            : ""
        }
      </div>
    </form>
  `;
}

function renderRelationModalSection(scope, player) {
  const relationOptions = DETAIL_STATE.relationOptions ?? normalizeRelationOptions(getFallbackRelationOptions());
  const editorIdPrefix = `player-detail-modal-${scope}-${player.id}`;

  if (scope === "special") {
    return renderModalFormSection({
      sectionKey: "special",
      title: "特殊能力",
      description: "候補から選びつつ、辞書にない能力名は直接入力でも追加できます。",
      fieldsClass: "player-form-fields player-form-fields--relation",
      content: renderSpecialAbilityEditor({
        abilities: player.special_abilities,
        relationOptions,
        editorIdPrefix,
      }),
    });
  }

  if (scope === "pitches") {
    return renderModalFormSection({
      sectionKey: "pitches",
      title: "変化球",
      description: "必要な方向だけ追加し、球種、変化量、オリジナル球種名を現在の snapshot に対して更新します。",
      fieldsClass: "player-form-fields player-form-fields--relation",
      content: renderPitchTypeEditor({
        pitchTypes: player.pitch_types,
        relationOptions,
        editorIdPrefix,
        throwingHand: player.throwing_hand,
      }),
    });
  }

  if (scope === "sub_positions") {
    return renderModalFormSection({
      sectionKey: "sub_positions",
      title: "サブポジション",
      description: "メインポジションと重複しないように、守備位置と適性を編集します。",
      fieldsClass: "player-form-fields player-form-fields--relation",
      content: renderSubPositionEditor({
        subPositions: player.sub_positions,
        relationOptions,
        editorIdPrefix,
        mainPosition: player.main_position,
      }),
    });
  }

  return "";
}

function buildSectionEditForm(scope, player) {
  if (scope === "basic") {
    const content = renderModalFormSection({
      sectionKey: "basic",
      title: "基本情報",
      description: "表示条件やスナップショットを含む、選手の基本情報を編集します。",
      content: [
        renderSelectControlRow({
          field: "grade",
          label: "学年",
          options: ["1", "2", "3"],
          value: String(player.grade ?? ""),
          required: true,
        }),
        renderYearControlRow(player.admission_year),
        renderSelectControlRow({
          field: "prefecture",
          label: "出身都道府県",
          options: PREFECTURE_GROUPS,
          value: player.prefecture,
          required: true,
          grouped: true,
        }),
        renderSelectControlRow({
          field: "snapshot_label",
          label: "スナップショット種別",
          options: getSnapshotOptionDefinitions(player.snapshot_label),
          value: player.snapshot_label,
          required: true,
        }),
        renderSelectControlRow({
          field: "main_position",
          label: "メインポジション",
          options: POSITION_OPTIONS,
          value: player.main_position,
          required: true,
        }),
        renderSelectControlRow({
          field: "player_type",
          label: "選手種別",
          options: PLAYER_TYPE_OPTIONS,
          value: player.player_type,
          required: true,
        }),
        renderSelectControlRow({
          field: "throwing_hand",
          label: "投",
          options: THROWING_HAND_OPTIONS,
          value: player.throwing_hand,
          required: true,
        }),
        renderSelectControlRow({
          field: "batting_hand",
          label: "打",
          options: BATTING_HAND_OPTIONS,
          value: player.batting_hand,
          required: true,
        }),
      ].join(""),
    });

    return renderSectionEditFormLayout({
      scope,
      player,
      note: "名前など全体編集向けの項目は上部の「選手情報を編集」から更新できます。",
      content,
    });
  }

  if (scope === "pitcher") {
    const content = renderModalFormSection({
      sectionKey: "pitcher",
      title: "投手能力",
      description: "球速は数値、コントロールとスタミナはランクと数値を並べて調整できます。",
      fieldsClass: "player-form-fields",
      content: renderAbilityEditFields(PITCHER_ABILITY_FIELDS, player),
    });

    return renderSectionEditFormLayout({ scope, player, content });
  }

  if (scope === "batter") {
    const content = renderModalFormSection({
      sectionKey: "batter",
      title: "野手能力",
      description: "弾道と各能力値を、現在の表示順に合わせて編集します。",
      fieldsClass: "player-form-fields",
      content: renderAbilityEditFields(BATTER_ABILITY_FIELDS, player),
    });

    return renderSectionEditFormLayout({ scope, player, content });
  }

  if (scope === "special" || scope === "pitches" || scope === "sub_positions") {
    return renderSectionEditFormLayout({
      scope,
      player,
      content: renderRelationModalSection(scope, player),
    });
  }

  return renderSectionEditFormLayout({
    scope,
    player,
    content: renderModalFormSection({
      sectionKey: scope,
      title: "編集フォーム",
      description: "このスコープの編集フォームは未定義です。",
      content: '<p class="player-empty-text">対応していない編集スコープです。</p>',
    }),
  });
}

function setupRankedAbilityInputs(form) {
  form.querySelectorAll("[data-ranked-ability]").forEach((row) => {
    const field = row.dataset.rankedAbility;
    const rankSelect = row.querySelector(`[data-ranked-rank="${field}"]`);
    const valueSelect = row.querySelector(`[data-ranked-value="${field}"]`);
    const hiddenInput = row.querySelector(`[data-ranked-value-hidden="${field}"]`);

    if (!rankSelect || !valueSelect || !hiddenInput) {
      return;
    }

    const syncRankedInput = ({ preserveCurrentValue = false, preserveUnrankedValue = false } = {}) => {
      const selectedRank = rankSelect.value;
      const currentValue = hiddenInput.value;
      const rankGroup = ABILITY_RANK_GROUPS.find((group) => group.rank === selectedRank);

      if (!rankGroup) {
        const fallbackValue = preserveUnrankedValue ? currentValue : "";
        valueSelect.innerHTML = buildRankValueOptions("", fallbackValue);
        valueSelect.value = fallbackValue;
        hiddenInput.value = fallbackValue;
        return;
      }

      const currentNumericValue = Number(currentValue);
      const isCurrentValueInRange =
        currentValue !== "" &&
        currentNumericValue >= rankGroup.min &&
        currentNumericValue <= rankGroup.max;
      const nextValue = preserveCurrentValue && isCurrentValueInRange
        ? String(currentNumericValue)
        : String(rankGroup.min);

      valueSelect.innerHTML = buildRankValueOptions(selectedRank, nextValue);
      valueSelect.value = nextValue;
      hiddenInput.value = nextValue;
    };

    rankSelect.addEventListener("change", () => {
      syncRankedInput({ preserveCurrentValue: false, preserveUnrankedValue: false });
    });

    valueSelect.addEventListener("change", () => {
      hiddenInput.value = valueSelect.value;
    });

    syncRankedInput({ preserveCurrentValue: true, preserveUnrankedValue: true });
  });
}

function closeSectionEditModal() {
  const refs = DETAIL_STATE.refs;

  if (!refs?.modalElement) {
    return false;
  }

  refs.modalElement.hidden = true;
  refs.modalBodyElement.innerHTML = "";
  refs.modalElement.removeAttribute("data-active-scope");
  document.body.classList.remove("player-page--modal-open");
  setMessage(refs.modalMessageElement, "");
  DETAIL_STATE.activeModalScope = "";

  const focusTarget = DETAIL_STATE.lastFocusedElement;
  DETAIL_STATE.lastFocusedElement = null;

  if (focusTarget && typeof focusTarget.focus === "function") {
    window.requestAnimationFrame(() => focusTarget.focus());
  }

  return true;
}

function openSectionEditModal(scope, player) {
  const refs = DETAIL_STATE.refs;
  const meta = SECTION_EDIT_META[scope];
  const modalPlayer = getCurrentEditablePlayer() ?? player;

  if (!refs?.modalElement || !refs?.modalBodyElement || !meta || !modalPlayer) {
    return false;
  }

  DETAIL_STATE.lastFocusedElement = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;
  DETAIL_STATE.activeModalScope = scope;
  refs.modalKickerElement.textContent = meta.kicker;
  refs.modalTitleElement.textContent = meta.title;
  refs.modalBodyElement.innerHTML = buildSectionEditForm(scope, modalPlayer);
  refs.modalElement.hidden = false;
  refs.modalElement.dataset.activeScope = scope;
  document.body.classList.add("player-page--modal-open");
  setMessage(refs.modalMessageElement, meta.description);

  const form = refs.modalBodyElement.querySelector("[data-section-edit-form]");

  if (form) {
    setupAdmissionYearPickers(form);
    setupRankedAbilityInputs(form);
    bindRelationEditors(
      form,
      DETAIL_STATE.relationOptions ?? normalizeRelationOptions(getFallbackRelationOptions()),
      {
        getMainPosition: () => modalPlayer.main_position,
        getThrowingHand: () => modalPlayer.throwing_hand,
      }
    );
    window.requestAnimationFrame(() => {
      const firstFocusable = form.querySelector("select, input:not([type='hidden']), textarea, button");
      if (firstFocusable instanceof HTMLElement) {
        firstFocusable.focus();
      }
    });
  }

  return true;
}

async function saveSectionEdit(scope, form, formData) {
  const currentPlayer = getCurrentEditablePlayer();

  if (!currentPlayer) {
    throw new Error("選手情報が読み込まれていません。");
  }

  const relationOptions = DETAIL_STATE.relationOptions ?? normalizeRelationOptions(getFallbackRelationOptions());

  const payload = {
    ...buildRequiredUpdatePayload(currentPlayer),
    ...buildSectionUpdatePayload(scope, formData, form, currentPlayer, relationOptions),
  };

  return updatePlayer(currentPlayer.id, payload);
}

function openCreateSnapshotPrompt(snapshotKey) {
  DETAIL_STATE.pendingCreateSnapshotKey = snapshotKey;
  renderCurrentPlayerDetail();
}

function closeCreateSnapshotPrompt() {
  if (!DETAIL_STATE.pendingCreateSnapshotKey) {
    return;
  }

  DETAIL_STATE.pendingCreateSnapshotKey = "";
  renderCurrentPlayerDetail();
}

async function createSnapshotAndReloadLegacy(snapshotKey) {
  const playerSeriesId = DETAIL_STATE.playerSeries?.id;

  if (!playerSeriesId) {
    throw new Error("選手シリーズ情報が取得できませんでした。");
  }

  const snapshotLabel = SNAPSHOT_LABELS[snapshotKey] ?? snapshotKey;

  DETAIL_STATE.pendingCreateSnapshotKey = "";
  DETAIL_STATE.isBusy = true;
  renderCurrentPlayerDetail();

  try {
    await addSnapshotToSeries(playerSeriesId, { snapshot_label: snapshotKey });
    await loadPlayerDetail({
      snapshot: snapshotKey,
      syncUrl: true,
      successMessage: `「${snapshotLabel}」の時点を作成しました。`,
    });
  } finally {
    DETAIL_STATE.isBusy = false;
  }
}

async function handleSnapshotButtonClickLegacy(snapshotKey) {
  if (!snapshotKey || DETAIL_STATE.isBusy) {
    return;
  }

  if (isCurrentSnapshot(snapshotKey, DETAIL_STATE.currentSnapshot)) {
    return;
  }

  if (isSnapshotRegistered(snapshotKey, DETAIL_STATE.snapshots)) {
    DETAIL_STATE.isBusy = true;

    try {
      await loadPlayerDetail({
        snapshot: snapshotKey,
        syncUrl: true,
        loadingMessage: `${SNAPSHOT_LABELS[snapshotKey] ?? snapshotKey} を読み込み中です...`,
      });
    } finally {
      DETAIL_STATE.isBusy = false;
    }

    return;
  }

  if (DETAIL_STATE.confirmBeforeCreateSnapshot) {
    openCreateSnapshotPrompt(snapshotKey);
    return;
  }

  await createSnapshotAndReload(snapshotKey);
}

function handleDetailRootClickLegacy(event) {
  const createConfirmButton = event.target.closest("[data-create-snapshot-confirm]");

  if (createConfirmButton) {
    event.preventDefault();

    createSnapshotAndReload(createConfirmButton.dataset.createSnapshotConfirm).catch((error) => {
      setSnapshotButtonError(createConfirmButton.dataset.createSnapshotConfirm);
      renderCurrentPlayerDetail();
      showErrorToast(error instanceof Error ? error.message : "時点の作成に失敗しました。");
      setMessage(
        DETAIL_STATE.refs.messageElement,
        error instanceof Error ? error.message : "時点の作成に失敗しました。",
        true
      );
    });
    return;
  }

  const createCancelButton = event.target.closest("[data-create-snapshot-cancel]");

  if (createCancelButton) {
    event.preventDefault();
    closeCreateSnapshotPrompt();
    return;
  }

  const snapshotButton = event.target.closest("[data-snapshot-button]");

  if (snapshotButton) {
    event.preventDefault();

    handleSnapshotButtonClick(snapshotButton.dataset.snapshotButton).catch((error) => {
      setSnapshotButtonError(snapshotButton.dataset.snapshotButton);
      renderCurrentPlayerDetail();
      showErrorToast(error instanceof Error ? error.message : "時点の切り替えに失敗しました。");
      setMessage(
        DETAIL_STATE.refs.messageElement,
        error instanceof Error ? error.message : "時点の切り替えに失敗しました。",
        true
      );
    });
    return;
  }

  const button = event.target.closest("[data-open-section-edit]");

  if (!button) {
    return;
  }

  const scope = button.dataset.openSectionEdit;

  if (!scope || !DETAIL_STATE.player) {
    return;
  }

  event.preventDefault();
  openSectionEditModal(scope, DETAIL_STATE.player);
}

function handleDetailRootChange(event) {
  const confirmToggle = event.target.closest("[data-snapshot-confirm-toggle]");

  if (!confirmToggle) {
    return;
  }

  setSnapshotCreateConfirmationPreference(!confirmToggle.checked);
}

function handleModalClick(event) {
  const closeTrigger = event.target.closest("[data-modal-close]");

  if (!closeTrigger) {
    return;
  }

  event.preventDefault();
  closeSectionEditModal();
}

async function handleModalSubmitOld(event) {
  const form = event.target.closest("[data-section-edit-form]");

  if (!form) {
    return;
  }

  event.preventDefault();

  const scope = form.dataset.sectionEditScope;
  const meta = SECTION_EDIT_META[scope] ?? SECTION_EDIT_META.basic;
  const submitButton = form.querySelector('button[type="submit"]');
  const controls = Array.from(form.querySelectorAll("input, select, textarea, button"));
  const formData = new FormData(form);

  controls.forEach((control) => {
    control.disabled = true;
  });
  setMessage(DETAIL_STATE.refs.modalMessageElement, `${meta.title}を保存しています...`);

  try {
    const updatedPlayer = await saveSectionEdit(scope, form, formData);
    setMessage(DETAIL_STATE.refs.modalMessageElement, `${meta.title}を更新しました。`);
    await loadPlayerDetail({
      snapshot: updatedPlayer.snapshot_label,
      syncUrl: true,
    });
    closeSectionEditModal();
    setMessage(DETAIL_STATE.refs.messageElement, `${meta.title}を更新しました。`);
  } catch (error) {
    controls.forEach((control) => {
      control.disabled = false;
    });

    if (submitButton) {
      submitButton.disabled = false;
    }

    setMessage(
      DETAIL_STATE.refs.modalMessageElement,
      error instanceof Error ? error.message : "セクションの更新に失敗しました。",
      true
    );
  }
}

function handleDocumentKeydown(event) {
  if (event.key !== "Escape" || !DETAIL_STATE.refs?.modalElement || DETAIL_STATE.refs.modalElement.hidden) {
    return;
  }

  event.preventDefault();
  closeSectionEditModal();
}

function setupInteractions(refs) {
  refs.root.addEventListener("click", handleDetailRootClick);
  refs.root.addEventListener("change", handleDetailRootChange);
  refs.modalElement.addEventListener("click", handleModalClick);
  refs.modalBodyElement.addEventListener("submit", handleModalSubmit);
  document.addEventListener("keydown", handleDocumentKeydown);
}

async function initOld() {
  const refs = {
    root: document.getElementById("player-detail-root"),
    titleElement: document.getElementById("player-detail-title"),
    contextElement: document.getElementById("player-detail-context"),
    schoolNameElement: document.getElementById("player-detail-school-name"),
    schoolMetaElement: document.getElementById("player-detail-school-meta"),
    actionsElement: document.getElementById("player-detail-actions"),
    messageElement: document.getElementById("player-detail-message"),
    toastRegionElement: document.getElementById("player-detail-toast-region"),
    modalElement: document.getElementById("player-detail-modal"),
    modalKickerElement: document.getElementById("player-detail-modal-kicker"),
    modalTitleElement: document.getElementById("player-detail-modal-title"),
    modalMessageElement: document.getElementById("player-detail-modal-message"),
    modalBodyElement: document.getElementById("player-detail-modal-body"),
  };

  if (!refs.root || !refs.titleElement || !refs.contextElement) {
    return;
  }

  DETAIL_STATE.refs = refs;
  DETAIL_STATE.playerId = getPlayerIdFromQuery();
  DETAIL_STATE.confirmBeforeCreateSnapshot = readSnapshotCreateConfirmationPreference();
  DETAIL_STATE.relationOptions = await loadRelationOptions();
  setupInteractions(refs);

  try {
    await loadPlayerDetail({
      snapshot: getSnapshotFromQuery(),
      syncUrl: false,
      loadingMessage: "選手情報を読み込み中です...",
    });
  } catch (error) {
    renderError(
      refs,
      error instanceof Error ? error.message : "選手情報の読み込みに失敗しました。"
    );
  }
}

// Snapshot creation keeps the seeded copy logic, then moves straight into editing that new timeline point.
async function createSnapshotAndGoToEdit(snapshotKey) {
  const playerSeriesId = DETAIL_STATE.playerSeries?.id;

  if (!playerSeriesId) {
    throw new Error("選手シリーズ情報を読み込めていません。");
  }

  const snapshotLabel = SNAPSHOT_LABELS[snapshotKey] ?? snapshotKey;
  const loadingToast = showLoadingToast(`「${snapshotLabel}」の時点を作成中です...`);

  clearSnapshotButtonFeedback();
  DETAIL_STATE.pendingCreateSnapshotKey = "";
  DETAIL_STATE.isBusy = true;
  renderCurrentPlayerDetail();

  let isRedirectingToEdit = false;

  try {
    const createdSnapshot = await addSnapshotToSeries(playerSeriesId, { snapshot_label: snapshotKey });

    if (!createdSnapshot?.id) {
      throw new Error("作成した時点の編集画面へ移動できませんでした。");
    }

    isRedirectingToEdit = true;
    window.location.assign(
      buildPlayerEditUrl(createdSnapshot.id, {
        mode: "snapshot-create",
        from: "timeline",
        snapshot: createdSnapshot.snapshot_label ?? snapshotKey,
      })
    );
  } catch (error) {
    loadingToast.close().catch(() => {});
    setSnapshotButtonError(snapshotKey);
    renderCurrentPlayerDetail();
    throw error;
  } finally {
    if (!isRedirectingToEdit) {
      DETAIL_STATE.isBusy = false;
      renderCurrentPlayerDetail();
    }
  }
}

// Keep the older name as a compatibility alias for legacy handlers/tests while the redirect behavior is updated.
const createSnapshotAndReload = createSnapshotAndGoToEdit;

async function handleSnapshotButtonClick(snapshotKey) {
  if (!snapshotKey || DETAIL_STATE.isBusy) {
    return;
  }

  if (isCurrentSnapshot(snapshotKey, DETAIL_STATE.currentSnapshot)) {
    return;
  }

  DETAIL_STATE.snapshotButtonErrorKey = "";

  if (isSnapshotRegistered(snapshotKey, DETAIL_STATE.snapshots)) {
    DETAIL_STATE.isBusy = true;
    setSnapshotButtonLoading(snapshotKey);
    renderCurrentPlayerDetail();

    try {
      await loadPlayerDetail({
        snapshot: snapshotKey,
        syncUrl: true,
      });
    } catch (error) {
      setSnapshotButtonError(snapshotKey);
      renderCurrentPlayerDetail();
      throw error;
    } finally {
      DETAIL_STATE.isBusy = false;
      renderCurrentPlayerDetail();
    }

    return;
  }

  if (DETAIL_STATE.confirmBeforeCreateSnapshot) {
    openCreateSnapshotPrompt(snapshotKey);
    return;
  }

  await createSnapshotAndGoToEdit(snapshotKey);
}

function handleDetailRootClick(event) {
  const createConfirmButton = event.target.closest("[data-create-snapshot-confirm]");

  if (createConfirmButton) {
    event.preventDefault();

    createSnapshotAndGoToEdit(createConfirmButton.dataset.createSnapshotConfirm).catch((error) => {
      const message = error instanceof Error ? error.message : "時点の作成に失敗しました。";
      showErrorToast(message);
      setMessage(DETAIL_STATE.refs.messageElement, message, true);
    });
    return;
  }

  const createCancelButton = event.target.closest("[data-create-snapshot-cancel]");

  if (createCancelButton) {
    event.preventDefault();
    closeCreateSnapshotPrompt();
    return;
  }

  const snapshotButton = event.target.closest("[data-snapshot-button]");

  if (snapshotButton) {
    event.preventDefault();

    handleSnapshotButtonClick(snapshotButton.dataset.snapshotButton).catch((error) => {
      const message = error instanceof Error ? error.message : "時点の切り替えに失敗しました。";
      showErrorToast(message);
      setMessage(DETAIL_STATE.refs.messageElement, message, true);
    });
    return;
  }

  const button = event.target.closest("[data-open-section-edit]");

  if (!button) {
    return;
  }

  const scope = button.dataset.openSectionEdit;

  const editablePlayer = getCurrentEditablePlayer();

  if (!scope || !editablePlayer) {
    return;
  }

  event.preventDefault();
  openSectionEditModal(scope, editablePlayer);
}

async function handleModalSubmit(event) {
  const form = event.target.closest("[data-section-edit-form]");

  if (!form) {
    return;
  }

  event.preventDefault();

  const scope = form.dataset.sectionEditScope;
  const meta = SECTION_EDIT_META[scope] ?? SECTION_EDIT_META.basic;
  const submitButton = form.querySelector('button[type="submit"]');
  const controls = Array.from(form.querySelectorAll("input, select, textarea, button"));
  const formData = new FormData(form);
  const loadingToast = showLoadingToast(`${meta.title}を保存中です...`);

  controls.forEach((control) => {
    control.disabled = true;
  });
  setMessage(DETAIL_STATE.refs.modalMessageElement, "");

  try {
    const updatedPlayer = await saveSectionEdit(scope, form, formData);
    await loadPlayerDetail({
      snapshot: updatedPlayer.snapshot_label,
      syncUrl: true,
    });
    closeSectionEditModal();
    loadingToast.close().then(() => showSuccessToast(`${meta.title}を更新しました。`));
  } catch (error) {
    loadingToast
      .close()
      .then(() => {
        showErrorToast(error instanceof Error ? error.message : "セクションの更新に失敗しました。");
      })
      .catch(() => {});

    controls.forEach((control) => {
      control.disabled = false;
    });

    if (submitButton) {
      submitButton.disabled = false;
    }

    setMessage(
      DETAIL_STATE.refs.modalMessageElement,
      error instanceof Error ? error.message : "セクションの更新に失敗しました。",
      true
    );
  }
}

async function init() {
  const refs = {
    root: document.getElementById("player-detail-root"),
    titleElement: document.getElementById("player-detail-title"),
    contextElement: document.getElementById("player-detail-context"),
    schoolNameElement: document.getElementById("player-detail-school-name"),
    schoolMetaElement: document.getElementById("player-detail-school-meta"),
    actionsElement: document.getElementById("player-detail-actions"),
    messageElement: document.getElementById("player-detail-message"),
    toastRegionElement: document.getElementById("player-detail-toast-region"),
    modalElement: document.getElementById("player-detail-modal"),
    modalKickerElement: document.getElementById("player-detail-modal-kicker"),
    modalTitleElement: document.getElementById("player-detail-modal-title"),
    modalMessageElement: document.getElementById("player-detail-modal-message"),
    modalBodyElement: document.getElementById("player-detail-modal-body"),
  };

  if (!refs.root || !refs.titleElement || !refs.contextElement) {
    return;
  }

  DETAIL_STATE.refs = refs;
  DETAIL_STATE.playerId = getPlayerIdFromQuery();
  DETAIL_STATE.confirmBeforeCreateSnapshot = readSnapshotCreateConfirmationPreference();
  setupInteractions(refs);

  try {
    await loadPlayerDetail({
      snapshot: getSnapshotFromQuery(),
      syncUrl: false,
      loadingMessage: "選手情報を読み込み中です...",
    });
  } catch (error) {
    renderError(
      refs,
      error instanceof Error ? error.message : "選手情報の読み込みに失敗しました。"
    );
  }
}

if (typeof document !== "undefined" && document.getElementById("player-detail-root")) {
  init();
}

export {
  buildSnapshotTimelineButtons,
  buildSectionEditForm,
  closeSectionEditModal,
  createSnapshotAndReload,
  getOfficialSnapshotDefinitions,
  getAbilityRank,
  handleSnapshotButtonClick,
  isCurrentSnapshot,
  isSnapshotRegistered,
  isPitcherPosition,
  openCreateSnapshotPrompt,
  openSectionEditModal,
  saveSectionEdit,
};
