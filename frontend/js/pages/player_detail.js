import { fetchPlayerDetailById } from "../api/playerApi.js";
import { formatSchoolName } from "../utils/formatter.js";
import {
  groupPitchMovementDisplayItemsByDirection,
  PITCH_METER_MAX_LEVEL,
  PITCH_MOVEMENT_DIRECTIONS,
} from "../utils/playerRelations.js";
import {
  SNAPSHOT_LABEL_OPTIONS,
  SNAPSHOT_LABELS,
  getOfficialSnapshotDefinitions,
  getSnapshotLabel,
  getVisibleOfficialSnapshotDefinitions as getVisibleOfficialSnapshotDefinitionsForContext,
} from "../utils/playerSnapshots.js";

const PLAYER_TYPE_LABELS = {
  normal: "通常",
  genius: "天才",
  reincarnated: "転生",
};

const SNAPSHOT_BUTTON_STATE_LABELS = {
  current: "表示中",
  registered: "登録済み",
  unregistered: "未登録",
  loading: "読込中",
  error: "再試行",
};

const THROWING_HAND_OPTIONS = [
  { value: "right", label: "右" },
  { value: "left", label: "左" },
];

const BATTING_HAND_OPTIONS = [
  { value: "right", label: "右" },
  { value: "left", label: "左" },
  { value: "both", label: "両" },
];

const PITCHER_MAIN_POSITION = "投手";
const DEFENSE_POSITION_COORDINATES = {
  pitcher: { x: 50, y: 54 },
  catcher: { x: 50, y: 91 },
  first: { x: 83, y: 53 },
  second: { x: 62, y: 34 },
  third: { x: 17, y: 53 },
  shortstop: { x: 38, y: 34 },
  outfield: { x: 50, y: 14 },
};
const DEFENSE_POSITION_SLOTS = [
  { position: "外野手", label: "外野手", shortLabel: "外", className: "outfield", ...DEFENSE_POSITION_COORDINATES.outfield },
  { position: "遊撃手", label: "遊撃手", shortLabel: "遊", className: "shortstop", ...DEFENSE_POSITION_COORDINATES.shortstop },
  { position: "二塁手", label: "二塁手", shortLabel: "二", className: "second", ...DEFENSE_POSITION_COORDINATES.second },
  { position: "三塁手", label: "三塁手", shortLabel: "三", className: "third", ...DEFENSE_POSITION_COORDINATES.third },
  { position: "投手", label: "投手", shortLabel: "投", className: "pitcher", ...DEFENSE_POSITION_COORDINATES.pitcher },
  { position: "一塁手", label: "一塁手", shortLabel: "一", className: "first", ...DEFENSE_POSITION_COORDINATES.first },
  { position: "捕手", label: "捕手", shortLabel: "捕", className: "catcher", ...DEFENSE_POSITION_COORDINATES.catcher },
];

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

const BATTER_ABILITY_FIELDS = [
  { field: "trajectory", label: "弾道", inputType: "trajectory" },
  { field: "meat", label: "ミート", inputType: "ranked" },
  { field: "power", label: "パワー", inputType: "ranked" },
  { field: "run_speed", label: "走力", inputType: "ranked" },
  { field: "arm_strength", label: "肩力", inputType: "ranked" },
  { field: "fielding", label: "守備", inputType: "ranked" },
  { field: "catching", label: "捕球", inputType: "ranked" },
];

const TOAST_TRANSITION_MS = 220;
const TOAST_DEFAULT_DURATION_MS = 2200;
const TOAST_SUCCESS_DURATION_MS = 1800;
const TOAST_ERROR_DURATION_MS = 3200;
const TOAST_LOADING_MIN_VISIBLE_MS = 900;

const DETAIL_STATE = {
  playerId: "",
  player: null,
  playerSeries: null,
  snapshots: [],
  currentSnapshot: null,
  refs: null,
  isBusy: false,
  loadingSnapshotKey: "",
  snapshotButtonErrorKey: "",
  selectedDefensePosition: null,
  nextToastId: 0,
  activeToastKeys: new Set(),
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

function syncSnapshotQuery(snapshotKey) {
  const url = new URL(window.location.href);

  if (snapshotKey) {
    url.searchParams.set("snapshot", snapshotKey);
  } else {
    url.searchParams.delete("snapshot");
  }

  window.history.replaceState({}, "", url);
}

function buildPlayerEditUrl(
  playerId,
  { mode = "", from = "", snapshot = "", scope = "", targetPosition = "", positionRole = "" } = {}
) {
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

  if (targetPosition) {
    params.set("target_position", targetPosition);
  }

  if (positionRole) {
    params.set("position_role", positionRole);
  }

  return `./player_edit.html?${params.toString()}`;
}

function buildPlayerDetailSnapshotUrl(snapshot, playerId = DETAIL_STATE.playerId) {
  const params = new URLSearchParams();
  params.set("id", String(snapshot?.id ?? playerId));

  if (snapshot?.snapshot_label) {
    params.set("snapshot", snapshot.snapshot_label);
  }

  return `./player_detail.html?${params.toString()}`;
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

function formatTotalStars(value) {
  const numericValue = Number(value);

  if (value === undefined || value === null || value === "" || !Number.isInteger(numericValue) || numericValue <= 0) {
    return "—";
  }

  return String(numericValue);
}

function renderTotalStarsSummary(refs, value, metaText = "") {
  if (refs.totalStarsValueElement) {
    refs.totalStarsValueElement.textContent = formatTotalStars(value);
  }

  if (refs.totalStarsMetaElement) {
    refs.totalStarsMetaElement.textContent = metaText;
  }
}

function formatPlayerType(value) {
  return formatValue(PLAYER_TYPE_LABELS[value] ?? value);
}

function formatYearValue(value) {
  const numericValue = Number(value);
  return Number.isInteger(numericValue) ? `${numericValue}年` : "未設定";
}

function formatGradeValue(value) {
  const numericValue = Number(value);
  return Number.isInteger(numericValue) ? `${numericValue}年` : "未設定";
}

function formatDateTimeValue(value, fallback = "未記録") {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function parseIntegerValue(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const text = String(value).trim();

  if (!text) {
    return null;
  }

  const numericValue = Number(text);
  return Number.isInteger(numericValue) ? numericValue : null;
}

function formatSnapshotLabel(value) {
  return formatValue(getSnapshotLabel(value, value));
}

function getVisibleOfficialSnapshotDefinitions(seriesResponse) {
  const playerSeries = seriesResponse?.playerSeries ?? {};
  const currentSnapshot = seriesResponse?.currentSnapshot ?? {};

  return getVisibleOfficialSnapshotDefinitionsForContext(
    {
      schoolCurrentYear: playerSeries.school_current_year ?? currentSnapshot.school_current_year,
      admissionYear: playerSeries.admission_year ?? currentSnapshot.admission_year,
      schoolGrade: playerSeries.school_grade,
      rosterStatus: playerSeries.roster_status,
      grade: currentSnapshot.grade,
    },
    { fallbackUnlockLevel: 1 }
  );
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
    school_current_year:
      playerSeries?.school_current_year ?? currentSnapshot?.school_current_year ?? null,
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

function buildSectionEditLink(scope, snapshot, label = "この snapshot を編集") {
  if (!snapshot?.id) {
    return "";
  }

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

function getLegacySnapshotSummaryLabel(snapshotKey) {
  if (snapshotKey === "post_tournament") {
    return "旧形式の大会後データ";
  }

  return "移行前の時点データ";
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

function isCurrentSnapshotRecord(snapshot, currentSnapshot) {
  if (!snapshot || !currentSnapshot) {
    return false;
  }

  if (snapshot.id !== undefined && currentSnapshot.id !== undefined) {
    return Number(snapshot.id) === Number(currentSnapshot.id);
  }

  return snapshot.snapshot_label === currentSnapshot.snapshot_label;
}

function setSnapshotButtonLoading(snapshotKey) {
  DETAIL_STATE.loadingSnapshotKey = snapshotKey;
  DETAIL_STATE.snapshotButtonErrorKey = "";
}

function setSnapshotButtonError(snapshotKey) {
  DETAIL_STATE.loadingSnapshotKey = "";
  DETAIL_STATE.snapshotButtonErrorKey = snapshotKey;
}

function clearSnapshotButtonFeedback() {
  DETAIL_STATE.loadingSnapshotKey = "";
  DETAIL_STATE.snapshotButtonErrorKey = "";
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

function buildSnapshotTimelineButtons(seriesResponse) {
  const snapshots = Array.isArray(seriesResponse?.snapshots) ? seriesResponse.snapshots : [];
  const currentSnapshot = seriesResponse?.currentSnapshot ?? null;
  const visibleSnapshotDefinitions = getVisibleOfficialSnapshotDefinitions(seriesResponse);
  const buttonsHtml = visibleSnapshotDefinitions
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

  return buildSectionEditLink(scope, snapshot, "この項目を編集");
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

function getPitchMeterSegments(pitch) {
  const segmentCount = pitch.fixedLevel ? 1 : PITCH_METER_MAX_LEVEL;

  return Array.from({ length: segmentCount }, (_, segmentIndex) => {
    const segmentLevel = segmentIndex + 1;
    const activeClass = segmentLevel <= pitch.level ? " is-active" : "";
    return `<span class="pitch-meter-segment${activeClass}" aria-hidden="true"></span>`;
  }).join("");
}

function getPitchMeterTitle(pitch) {
  const titleParts = [pitch.name];

  if (pitch.isOriginal && pitch.baseName && pitch.baseName !== pitch.name) {
    titleParts.push(`元: ${pitch.baseName}`);
  }

  return titleParts.join(" / ");
}

function renderPitchMeterLabel(pitch, index = 0) {
  const safeName = escapeHtml(pitch.name);
  const secondaryClass = index > 0 ? " pitch-meter-label--secondary" : "";

  return `
    <div class="pitch-meter-label${secondaryClass}" data-pitch-meter-label="${index}">
      <span class="pitch-meter-name" title="${escapeAttribute(getPitchMeterTitle(pitch))}">${safeName}</span>
    </div>
  `;
}

function renderPitchMeter(pitch, index = 0) {
  const secondaryClass = index > 0 ? " pitch-meter--secondary" : "";

  return `
    <div
      class="pitch-meter pitch-meter--track${secondaryClass}"
      data-pitch-direction="${escapeAttribute(pitch.direction)}"
      data-pitch-orientation="${escapeAttribute(pitch.orientation)}"
      data-pitch-baseline="${pitch.baseline ? "true" : "false"}"
      data-pitch-fixed-level="${pitch.fixedLevel ? "true" : "false"}"
      data-pitch-meter-index="${escapeAttribute(index)}"
      style="--pitch-lane: ${index};"
      aria-label="${escapeAttribute(`${pitch.name} 変化量 ${pitch.level}`)}"
    >
      <div class="pitch-meter-track" aria-hidden="true">
        ${getPitchMeterSegments(pitch)}
      </div>
    </div>
  `;
}

function renderPitchDirection(direction, pitches) {
  const directionPitches = Array.isArray(pitches) ? pitches : [];
  const emptyClass = directionPitches.length > 0 ? "" : " is-empty";
  const secondaryClass = directionPitches.length > 1 ? " has-secondary-pitch" : "";
  const metersHtml =
    directionPitches.length > 0
      ? `
        <div class="pitch-direction-labels">
          ${directionPitches.map((pitch, index) => renderPitchMeterLabel(pitch, index)).join("")}
        </div>
        <div
          class="pitch-direction-track-strip"
          data-pitch-direction-track-strip
          data-pitch-direction="${escapeAttribute(direction.key)}"
          data-pitch-orientation="${escapeAttribute(direction.orientation)}"
          style="--pitch-angle: ${Number(direction.angle) || 0}deg;"
        >
          ${directionPitches.map((pitch, index) => renderPitchMeter(pitch, index)).join("")}
        </div>
      `
      : "";

  return `
    <div
      class="pitch-direction pitch-direction--${escapeAttribute(direction.key)}${emptyClass}${secondaryClass}"
      data-pitch-direction="${escapeAttribute(direction.key)}"
      aria-label="${escapeAttribute(`${direction.label}方向`)}"
    >
      <div class="pitch-direction-guide" aria-hidden="true"></div>
      <div class="pitch-direction-meters" data-pitch-count="${escapeAttribute(directionPitches.length)}">
        ${metersHtml}
      </div>
    </div>
  `;
}

function renderPitchMovementChart(snapshot) {
  const groupedPitches = groupPitchMovementDisplayItemsByDirection({
    pitchTypes: snapshot?.pitch_types,
    throwingHand: snapshot?.throwing_hand,
  });

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
  if (archivedSchool || !snapshot?.id) {
    return "";
  }

  return `
    ${buildSectionEditLink("pitcher", snapshot, "投手能力を編集")}
    ${buildSectionEditLink("pitches", snapshot, "変化球を編集")}
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

function getSubPositionByName(snapshot) {
  const subPositionByName = new Map();
  const subPositions = Array.isArray(snapshot?.sub_positions) ? snapshot.sub_positions : [];

  subPositions.forEach((item) => {
    const positionName = String(item?.position_name ?? "").trim();

    if (positionName && !subPositionByName.has(positionName)) {
      subPositionByName.set(positionName, item);
    }
  });

  return subPositionByName;
}

function renderDefenseGroundSvg() {
  return `
    <svg
      class="defense-ground-svg"
      viewBox="0 0 100 100"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <rect class="defense-svg-grass" x="0" y="0" width="100" height="100" rx="4"></rect>
      <path class="defense-svg-outfield-band" d="M0 0 H100 V45 C82 24 65 10 50 10 C35 10 18 24 0 45 Z"></path>
      <path class="defense-svg-infield-grass" d="M50 16 L84 51 L50 86 L16 51 Z"></path>
      <ellipse class="defense-svg-mound-dirt" cx="50" cy="54" rx="11.5" ry="7.4"></ellipse>
      <ellipse class="defense-svg-home-dirt" cx="50" cy="87" rx="12.4" ry="8.2"></ellipse>
      <path class="defense-svg-foul-line" d="M50 87 L-8 28"></path>
      <path class="defense-svg-foul-line" d="M50 87 L108 28"></path>
      <path class="defense-svg-baseline" d="M50 87 L84 51 L50 16 L16 51 Z"></path>
      <path class="defense-svg-home-plate" d="M50 91 L55 87 L54 82 L46 82 L45 87 Z"></path>
      <rect class="defense-svg-base defense-svg-base--first" x="80.6" y="47.6" width="6.8" height="6.8" transform="rotate(45 84 51)"></rect>
      <rect class="defense-svg-base defense-svg-base--second" x="46.6" y="12.6" width="6.8" height="6.8" transform="rotate(45 50 16)"></rect>
      <rect class="defense-svg-base defense-svg-base--third" x="12.6" y="47.6" width="6.8" height="6.8" transform="rotate(45 16 51)"></rect>
      <rect class="defense-svg-mound-rubber" x="44.2" y="52.6" width="11.6" height="2.8" rx="0.5"></rect>
    </svg>
  `;
}

function buildDefensePositionEditUrl(slot, snapshot, mainPosition) {
  const isMain = slot.position === mainPosition;

  return buildPlayerEditUrl(snapshot.id, {
    snapshot: snapshot.snapshot_label,
    scope: isMain ? "basic" : "sub_positions",
    targetPosition: slot.position,
    positionRole: isMain ? "main" : "sub",
  });
}

function getDefensePositionRole(slot, { mainPosition, subPositionByName }) {
  const subPosition = subPositionByName.get(slot.position);
  const isMain = slot.position === mainPosition;
  const isSub = Boolean(subPosition) && !isMain;

  return {
    subPosition,
    isMain,
    isSub,
    role: isMain ? "main" : "sub",
    roleLabel: isMain ? "メイン" : isSub ? "サブ" : "未設定",
    stateClass: isMain ? "is-main" : isSub ? "is-sub" : "is-empty",
  };
}

function renderDefensePositionNode(
  slot,
  { mainPosition, subPositionByName, snapshot, archivedSchool = false, selectedPosition = "" }
) {
  const { subPosition, isSub, role, roleLabel, stateClass } = getDefensePositionRole(slot, {
    mainPosition,
    subPositionByName,
  });
  const canSelectForEdit = !archivedSchool && Boolean(snapshot?.id);
  const isSelected = canSelectForEdit && selectedPosition === slot.position;
  const tagName = canSelectForEdit ? "button" : "div";
  const editAttributes = canSelectForEdit
    ? `
      type="button"
      data-defense-position-button
      data-defense-position-role="${escapeAttribute(role)}"
      aria-pressed="${isSelected ? "true" : "false"}"
    `
    : "";
  const interactionClass = canSelectForEdit ? "is-clickable" : "is-readonly";
  const selectedClass = isSelected ? "is-selected" : "";
  const actionLabel = canSelectForEdit ? "。選択すると編集確認を表示" : "";
  const suitability = isSub && subPosition?.suitability_value
    ? `<span class="defense-position-suitability">${escapeHtml(subPosition.suitability_value)}</span>`
    : "";

  return `
    <${tagName}
      class="defense-position-node defense-position-node--${escapeAttribute(slot.className)} ${stateClass} ${interactionClass} ${selectedClass}"
      data-defense-position="${escapeAttribute(slot.position)}"
      ${editAttributes}
      style="--defense-x: ${escapeAttribute(slot.x)}%; --defense-y: ${escapeAttribute(slot.y)}%;"
      aria-label="${escapeAttribute(`${slot.label}: ${roleLabel}${actionLabel}`)}"
    >
      <span class="defense-position-abbr" aria-hidden="true">${escapeHtml(slot.shortLabel)}</span>
      <span class="defense-position-name">${escapeHtml(slot.label)}</span>
      <span class="defense-position-role">${escapeHtml(roleLabel)}</span>
      ${suitability}
    </${tagName}>
  `;
}

function renderDefenseRatingValue(value) {
  const rankGroup = getAbilityRank(value);

  if (!rankGroup) {
    return `<span class="defense-info-rating-text">${formatValue(value, "-")}</span>`;
  }

  return `
    <span class="defense-info-rating-value">
      <span class="defense-info-rating-rank">${rankGroup.rank}</span>
      <span class="defense-info-rating-number">${escapeHtml(value)}</span>
    </span>
  `;
}

function getDefenseSubPositionRows(snapshot) {
  return (Array.isArray(snapshot?.sub_positions) ? snapshot.sub_positions : [])
    .map((item) => ({
      positionName: String(item?.position_name ?? "").trim(),
      suitability: item?.suitability_value ?? "",
      defenseValue: item?.defense_value ?? null,
    }))
    .filter((item) => item.positionName);
}

function renderDefenseInfoRow({ roleLabel, positionName, suitability = "", defenseValue, empty = false }) {
  const positionMeta = suitability
    ? `<span class="defense-info-position-meta">適性 ${escapeHtml(suitability)}</span>`
    : "";

  return `
    <div class="defense-info-row${empty ? " is-empty" : ""}">
      <span class="defense-info-role">${escapeHtml(roleLabel)}</span>
      <span class="defense-info-position">
        <span>${formatValue(positionName, "なし")}</span>
        ${positionMeta}
      </span>
      <span class="defense-info-rating">${renderDefenseRatingValue(defenseValue)}</span>
    </div>
  `;
}

function renderDefenseInfoList(snapshot) {
  const defenseValue = snapshot?.fielding;
  const subPositionRows = getDefenseSubPositionRows(snapshot);
  const rows = [
    renderDefenseInfoRow({
      roleLabel: "メイン",
      positionName: snapshot?.main_position,
      defenseValue,
    }),
    ...subPositionRows.map((item, index) =>
      renderDefenseInfoRow({
        roleLabel: `サブ${index + 1}`,
        positionName: item.positionName,
        suitability: item.suitability,
        defenseValue: item.defenseValue,
      })
    ),
  ];

  return `
    <div class="defense-info-list" aria-label="守備位置と守備力">
      <div class="defense-info-head" aria-hidden="true">
        <span>種別</span>
        <span>守備位置</span>
        <span>守備力</span>
      </div>
      ${rows.join("")}
    </div>
  `;
}

function getSelectedDefenseSlot(selectedPosition) {
  return DEFENSE_POSITION_SLOTS.find((slot) => slot.position === selectedPosition) ?? null;
}

function getDefenseConfirmPlacement(selectedSlot) {
  if (!selectedSlot) {
    return { block: "below", inline: "center" };
  }

  if (selectedSlot.className === "catcher") {
    return { block: "above", inline: "center" };
  }

  if (selectedSlot.className === "first") {
    return { block: "below", inline: "right" };
  }

  if (selectedSlot.className === "third") {
    return { block: "below", inline: "left" };
  }

  return { block: "below", inline: "center" };
}

function renderDefenseEditConfirmPanel({ selectedSlot, snapshot, mainPosition, subPositionByName }) {
  if (!selectedSlot || !snapshot?.id) {
    return "";
  }

  const { role, roleLabel } = getDefensePositionRole(selectedSlot, {
    mainPosition,
    subPositionByName,
  });
  const editUrl = buildDefensePositionEditUrl(selectedSlot, snapshot, mainPosition);
  const placement = getDefenseConfirmPlacement(selectedSlot);
  const placementClass = [
    `defense-edit-confirm--near-${placement.block}`,
    `defense-edit-confirm--align-${placement.inline}`,
  ].join(" ");

  return `
    <div
      class="defense-edit-confirm ${escapeAttribute(placementClass)}"
      style="--defense-confirm-x: ${escapeAttribute(selectedSlot.x)}%; --defense-confirm-y: ${escapeAttribute(selectedSlot.y)}%;"
      role="status"
      aria-live="polite"
    >
      <p class="defense-edit-confirm-title">
        <span class="defense-edit-confirm-kicker">選択中</span>
        <span>${escapeHtml(selectedSlot.label)}</span>
        <span class="defense-edit-confirm-role">${escapeHtml(roleLabel)}</span>
      </p>
      <p class="defense-edit-confirm-text">
        このポジションの設定に進みますか？
      </p>
      <div class="defense-edit-confirm-actions">
        <a
          class="player-button player-button-primary player-button-inline"
          href="${escapeAttribute(editUrl)}"
          title="${escapeAttribute(`${selectedSlot.label}の編集画面へ進む`)}"
          aria-label="${escapeAttribute(`${selectedSlot.label}の編集画面へ進む`)}"
        >
          設定に進む
        </a>
        <button
          type="button"
          class="player-button player-button-secondary player-button-inline"
          data-defense-position-cancel
          title="守備位置の選択を解除"
          aria-label="守備位置の選択を解除"
        >
          キャンセル
        </button>
      </div>
    </div>
  `;
}

function renderDefensePositionMapSection(snapshot, { archivedSchool = false } = {}) {
  const mainPosition = snapshot?.main_position ?? "";
  const subPositionByName = getSubPositionByName(snapshot);
  const selectedSlot = getSelectedDefenseSlot(DETAIL_STATE.selectedDefensePosition?.position);
  const nodesHtml = DEFENSE_POSITION_SLOTS.map((slot) =>
    renderDefensePositionNode(slot, {
      mainPosition,
      subPositionByName,
      snapshot,
      archivedSchool,
      selectedPosition: selectedSlot?.position ?? "",
    })
  ).join("");
  const confirmPanelHtml = archivedSchool
    ? ""
    : renderDefenseEditConfirmPanel({ selectedSlot, snapshot, mainPosition, subPositionByName });

  return renderDetailCard({
    title: "守備位置・守備力",
    sectionKey: "defense-map",
    bodyClass: "detail-card-body--defense-map",
    headerActionHtml: buildRelationSectionActions("sub_positions", snapshot, { archivedSchool }),
    content: `
      <div class="defense-map-layout">
        <div class="defense-field${confirmPanelHtml ? " has-defense-edit-confirm" : ""}" role="group" aria-label="現在表示中の時点における守備位置図">
          ${renderDefenseGroundSvg()}
          <div class="defense-position-layer">
            ${nodesHtml}
          </div>
          ${confirmPanelHtml}
        </div>
        <aside class="defense-map-side">
          ${renderDefenseInfoList(snapshot)}
          <div class="defense-map-legend" aria-label="守備位置図の凡例">
            <span class="defense-legend-item defense-legend-item--main">メイン</span>
            <span class="defense-legend-item defense-legend-item--sub">サブ</span>
            <span class="defense-legend-item defense-legend-item--empty">未設定</span>
          </div>
          <p class="defense-map-note">
            現在表示中の snapshot に登録されている守備位置を表示しています。
          </p>
        </aside>
      </div>
    `,
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
    dedupeKey = "",
  } = options;

  if (dedupeKey && DETAIL_STATE.activeToastKeys.has(dedupeKey)) {
    return {
      close: async () => {},
      closed: Promise.resolve(),
      element: null,
    };
  }

  const toastId = `player-toast-${DETAIL_STATE.nextToastId++}`;
  const toastElement = document.createElement("div");

  if (dedupeKey) {
    DETAIL_STATE.activeToastKeys.add(dedupeKey);
    toastElement.dataset.toastKey = dedupeKey;
  }

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
      if (dedupeKey) {
        DETAIL_STATE.activeToastKeys.delete(dedupeKey);
      }
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
  DETAIL_STATE.selectedDefensePosition = null;
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

async function handleSnapshotButtonClick(snapshotKey) {
  if (!snapshotKey || DETAIL_STATE.isBusy) {
    return;
  }

  if (isCurrentSnapshot(snapshotKey, DETAIL_STATE.currentSnapshot)) {
    return;
  }

  if (!isSnapshotRegistered(snapshotKey, DETAIL_STATE.snapshots)) {
    const snapshotLabel = SNAPSHOT_LABELS[snapshotKey] ?? snapshotKey;
    setMessage(
      DETAIL_STATE.refs.messageElement,
      `「${snapshotLabel}」はまだ登録されていないため、詳細表示へ切り替えられません。`
    );
    return;
  }

  DETAIL_STATE.isBusy = true;
  setSnapshotButtonLoading(snapshotKey);
  renderCurrentPlayerDetail();

  try {
    await loadPlayerDetail({
      snapshot: snapshotKey,
      syncUrl: true,
    });
    clearSnapshotButtonFeedback();
  } catch (error) {
    setSnapshotButtonError(snapshotKey);
    throw error;
  } finally {
    DETAIL_STATE.isBusy = false;
    renderCurrentPlayerDetail();
  }
}

function handleDetailRootClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  const defenseCancelButton = target?.closest("[data-defense-position-cancel]");

  if (defenseCancelButton) {
    event.preventDefault();
    DETAIL_STATE.selectedDefensePosition = null;
    renderCurrentPlayerDetail();
    return;
  }

  const defensePositionButton = target?.closest("[data-defense-position-button]");

  if (defensePositionButton) {
    event.preventDefault();

    const position = String(defensePositionButton.dataset.defensePosition ?? "").trim();
    const role = String(defensePositionButton.dataset.defensePositionRole ?? "").trim();

    if (!position) {
      return;
    }

    const currentSelection = DETAIL_STATE.selectedDefensePosition;
    DETAIL_STATE.selectedDefensePosition =
      currentSelection?.position === position
        ? null
        : {
            position,
            role,
          };
    renderCurrentPlayerDetail();
    return;
  }

  const snapshotButton = target?.closest("[data-snapshot-button]");

  if (!snapshotButton) {
    return;
  }

  event.preventDefault();

  handleSnapshotButtonClick(snapshotButton.dataset.snapshotButton).catch((error) => {
    const message = error instanceof Error ? error.message : "時点の切り替えに失敗しました。";
    showErrorToast(message);
    setMessage(DETAIL_STATE.refs.messageElement, message, true);
  });
}

function renderError(refs, message) {
  refs.titleElement.textContent = "選手詳細";
  refs.contextElement.textContent = "選手情報を取得できませんでした。";
  refs.schoolNameElement.textContent = "学校情報なし";
  renderTotalStarsSummary(refs, null);
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
    renderTotalStarsSummary(refs, currentSnapshot.total_stars, archivedSchool ? "凍結データ" : "");

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
              href: buildPlayerEditUrl(currentSnapshot.id, {
                snapshot: currentSnapshot.snapshot_label,
              }),
              label: "この snapshot を編集",
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
      headerActionHtml: archivedSchool
        ? ""
        : buildSectionEditLink("basic", currentSnapshot, "基本情報を編集"),
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
          headerActionHtml: archivedSchool
            ? ""
            : buildSectionEditLink("pitcher", currentSnapshot, "投手能力を編集"),
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
      headerActionHtml: archivedSchool
        ? ""
        : buildSectionEditLink("batter", currentSnapshot, "野手能力を編集"),
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
  renderTotalStarsSummary(refs, player.total_stars, archivedSchool ? "保持データ" : "");

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
            href: buildPlayerEditUrl(player.id, {
              snapshot: player.snapshot_label,
            }),
            label: "この snapshot を編集",
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
    headerActionHtml: archivedSchool ? "" : buildSectionEditLink("basic", player, "基本情報を編集"),
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
        headerActionHtml: archivedSchool ? "" : buildSectionEditLink("pitcher", player, "投手能力を編集"),
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
    headerActionHtml: archivedSchool ? "" : buildSectionEditLink("batter", player, "野手能力を編集"),
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
  renderTotalStarsSummary(refs, currentSnapshot.total_stars, archivedSchool ? "凍結データ" : "");

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
            href: buildPlayerEditUrl(currentSnapshot.id, {
              snapshot: currentSnapshot.snapshot_label,
            }),
            label: "この snapshot を編集",
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
  const defensePositionMapSection = renderDefensePositionMapSection(currentSnapshot, { archivedSchool });
  const specialAbilitiesSection = renderSpecialAbilitySection(currentSnapshot, { archivedSchool });

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
    headerActionHtml: archivedSchool
      ? ""
      : buildSectionEditLink("basic", currentSnapshot, "基本情報を編集"),
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
    headerActionHtml: archivedSchool
      ? ""
      : buildSectionEditLink("batter", currentSnapshot, "野手能力を編集"),
    content: `
      <dl class="detail-grid compact-grid" data-detail-grid="batter">
        ${batterInfo}
      </dl>
    `,
  });

  refs.root.innerHTML = `
    ${archivedNotice}
    ${basicSection}
    ${defensePositionMapSection}
    ${pitcherOverviewSection}
    ${batterSection}
    ${specialAbilitiesSection}
  `;
}

function setupInteractions(refs) {
  refs.root.addEventListener("click", handleDetailRootClick);
}

async function init() {
  const refs = {
    root: document.getElementById("player-detail-root"),
    titleElement: document.getElementById("player-detail-title"),
    contextElement: document.getElementById("player-detail-context"),
    schoolNameElement: document.getElementById("player-detail-school-name"),
    totalStarsValueElement: document.getElementById("player-detail-total-stars-value"),
    totalStarsMetaElement: document.getElementById("player-detail-total-stars-meta"),
    actionsElement: document.getElementById("player-detail-actions"),
    messageElement: document.getElementById("player-detail-message"),
    toastRegionElement: document.getElementById("player-detail-toast-region"),
  };

  if (!refs.root || !refs.titleElement || !refs.contextElement) {
    return;
  }

  DETAIL_STATE.refs = refs;
  DETAIL_STATE.playerId = getPlayerIdFromQuery();
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
  getOfficialSnapshotDefinitions,
  getAbilityRank,
  isCurrentSnapshot,
  isSnapshotRegistered,
  isPitcherPosition,
};
