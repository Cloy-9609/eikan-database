import { fetchPlayerById, updatePlayer } from "../api/playerApi.js";
import {
  buildAdmissionYearPicker,
  setupAdmissionYearPickers,
} from "../components/admissionYearPicker.js";
import { fetchPlayerRelationOptions } from "../api/playerApi.js";
import { PREFECTURE_GROUPS, isKnownPrefecture } from "../constants/prefectures.js";
import {
  bindRelationEditors,
  getFallbackRelationOptions,
  normalizeRelationOptions,
  renderPitchTypeEditor,
  renderSpecialAbilityEditor,
  renderSubPositionEditor,
  serializeRelationInputs,
} from "../utils/playerRelations.js";

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

const POSITION_OPTIONS = ["投手", "捕手", "一塁手", "二塁手", "三塁手", "遊撃手", "外野手"];
const PITCHER_MAIN_POSITION = "投手";
const DEFAULT_EDIT_SCOPE = "full";
const FOCUSABLE_EDIT_SCOPES = new Set([
  "basic",
  "pitcher",
  "batter",
  "special",
  "pitches",
  "sub_positions",
]);

const THROWING_HAND_OPTIONS = [
  { value: "right", label: "右" },
  { value: "left", label: "左" },
];

const BATTING_HAND_OPTIONS = [
  { value: "right", label: "右" },
  { value: "left", label: "左" },
  { value: "both", label: "両" },
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

const PITCHER_ABILITY_FIELD_NAMES = PITCHER_ABILITY_FIELDS.map(({ field }) => field);
const BATTER_ABILITY_FIELD_NAMES = BATTER_ABILITY_FIELDS.map(({ field }) => field);

function getPlayerIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const playerId = params.get("id");

  if (!playerId) {
    throw new Error("選手IDが指定されていません。");
  }

  return playerId;
}

function getRequestedEditScope() {
  const params = new URLSearchParams(window.location.search);
  const scope = params.get("scope");

  if (!scope) {
    return "";
  }

  return scope.trim();
}

function getEditFlowContextFromQuery() {
  const params = new URLSearchParams(window.location.search);

  return {
    mode: params.get("mode")?.trim() ?? "",
    from: params.get("from")?.trim() ?? "",
    snapshot: params.get("snapshot")?.trim() ?? "",
  };
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

function buildAttributeString(attributes) {
  return Object.entries(attributes)
    .filter(([, value]) => value !== undefined && value !== null && value !== false && value !== "")
    .map(([key, value]) => (value === true ? key : `${key}="${escapeAttribute(value)}"`))
    .join(" ");
}

function getSnapshotOptionsForRender(selectedValue) {
  if (!selectedValue || !LEGACY_SNAPSHOT_LABELS[selectedValue]) {
    return SNAPSHOT_LABEL_OPTIONS;
  }

  return [...SNAPSHOT_LABEL_OPTIONS, { value: selectedValue, label: LEGACY_SNAPSHOT_LABELS[selectedValue] }];
}

function getSnapshotLabel(value) {
  return SNAPSHOT_LABELS[value] ?? value ?? "";
}

function formatYearValue(value) {
  const numericValue = Number(value);
  return Number.isInteger(numericValue) ? `${numericValue}年` : "未設定";
}

async function loadRelationOptions() {
  try {
    const relationOptions = await fetchPlayerRelationOptions();
    return normalizeRelationOptions(relationOptions);
  } catch (error) {
    return normalizeRelationOptions(getFallbackRelationOptions());
  }
}

function isPitcherPosition(value) {
  return value === PITCHER_MAIN_POSITION;
}

function getAbilityRankForValue(value) {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue)) {
    return null;
  }

  return ABILITY_RANK_GROUPS.find(
    (group) => numericValue >= group.min && numericValue <= group.max
  ) ?? null;
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

function setPageHeader(titleElement, contextElement, { title, context, documentTitle }) {
  if (titleElement) {
    titleElement.textContent = title;
  }

  if (contextElement) {
    contextElement.textContent = context;
  }

  document.title = documentTitle;
}

function buildPlayerDetailUrl(playerId, snapshotLabel = "") {
  const params = new URLSearchParams();
  params.set("id", String(playerId));

  if (snapshotLabel) {
    params.set("snapshot", snapshotLabel);
  }

  return `./player_detail.html?${params.toString()}`;
}

function buildEditModePresentation(player, flowContext) {
  const snapshotLabel = getSnapshotLabel(flowContext.snapshot || player.snapshot_label);

  if (flowContext.mode !== "snapshot-create") {
    return {
      title: "選手情報編集",
      context: `${player.name} の基本情報、能力値、relation 系をこの画面で編集します。`,
      documentTitle: `${player.name} | 選手情報編集`,
      flowNote: null,
      returnLabel: "詳細へ戻る",
    };
  }

  return {
    title: "新しい時点の更新情報を登録",
    context: `「${snapshotLabel}」を作成しました。この時点の能力・情報を更新してください。`,
    documentTitle: `${player.name} | 新時点の情報登録`,
    flowNote: {
      kicker: "Snapshot Create",
      title: "新しい時点の登録を続けています",
      body: "この時点は直前の登録済み snapshot を初期値として引き継いでいます。必要な差分を更新し、将来的には OCR / 画像読取の反映先としても使いやすい入口にします。",
    },
    returnLabel: "この時点の詳細へ戻る",
  };
}

function renderFlowNote(noteElement, flowNote) {
  if (!noteElement) {
    return;
  }

  if (!flowNote) {
    noteElement.hidden = true;
    noteElement.innerHTML = "";
    return;
  }

  noteElement.hidden = false;
  noteElement.innerHTML = `
    <p class="player-edit-flow-note-kicker">${flowNote.kicker}</p>
    <h2 class="player-edit-flow-note-title">${flowNote.title}</h2>
    <p class="player-edit-flow-note-body">${flowNote.body}</p>
  `;
}

function buildOcrEntryPresentation(player, flowContext) {
  if (flowContext.mode !== "snapshot-create") {
    return null;
  }

  const snapshotLabel = getSnapshotLabel(flowContext.snapshot || player.snapshot_label);

  return {
    title: "画像から更新情報を読み取る",
    description: `今後、「${snapshotLabel}」の画像から能力値や起用情報を読み取って、この時点の入力へ反映できるようにする予定です。`,
    buttonLabel: "画像読取を開始（準備中）",
    note: "現時点では手動入力のみ対応しています。OCR / 固定UI解析 / 結果プレビューは今後ここに追加します。",
    actionMessage: "画像読取機能は今後追加予定です。現時点ではこの画面で手動入力を続けてください。",
  };
}

function renderOcrEntryCard(entryElement, ocrEntry) {
  if (!entryElement) {
    return;
  }

  if (!ocrEntry) {
    entryElement.hidden = true;
    entryElement.innerHTML = "";
    return;
  }

  entryElement.hidden = false;
  entryElement.dataset.mode = "snapshot-create";
  entryElement.dataset.featureState = "planned";
  entryElement.innerHTML = `
    <div
      class="player-edit-ocr-entry-card"
      data-ocr-entry
      data-mode="snapshot-create"
      data-feature-state="planned"
    >
      <div class="player-edit-ocr-entry-header">
        <div class="player-edit-ocr-entry-copy">
          <p class="player-edit-ocr-entry-kicker">OCR Entry</p>
          <h2 class="player-edit-ocr-entry-title">${ocrEntry.title}</h2>
        </div>
        <span class="player-edit-ocr-entry-badge">準備中</span>
      </div>
      <p class="player-edit-ocr-entry-description">${ocrEntry.description}</p>
      <div class="player-edit-ocr-entry-actions">
        <button
          type="button"
          class="player-button player-button-secondary"
          data-ocr-entry-action="planned"
          data-feature-state="planned"
        >
          ${ocrEntry.buttonLabel}
        </button>
      </div>
      <p class="player-edit-ocr-entry-note">${ocrEntry.note}</p>
    </div>
  `;
}

function bindOcrEntryActions(entryElement, messageElement, ocrEntry) {
  if (!entryElement || !ocrEntry) {
    return;
  }

  const actionButton = entryElement.querySelector("[data-ocr-entry-action='planned']");

  if (!actionButton) {
    return;
  }

  actionButton.addEventListener("click", () => {
    setMessage(messageElement, ocrEntry.actionMessage);
  });
}

function renderFormSection({
  id,
  sectionKey,
  title,
  description,
  content,
  fieldsClass = "player-form-fields",
}) {
  return `
    <section id="${id}" class="player-form-section" data-edit-section="${sectionKey}">
      <div class="player-form-section-header">
        <h2 class="player-form-section-title">${title}</h2>
        <p class="player-form-section-description">${description}</p>
      </div>
      <div class="${fieldsClass}">
        ${content}
      </div>
    </section>
  `;
}

function renderTextInputRow({ field, label, value, required = false, rowClass = "", helpText = "" }) {
  const inputAttributes = buildAttributeString({
    id: field,
    name: field,
    type: "text",
    value: value ?? "",
    required,
  });
  const rowClassName = ["player-form-row", rowClass].filter(Boolean).join(" ");

  return `
    <div class="${rowClassName}" data-field="${field}">
      <label class="player-form-label" for="${field}">${label}</label>
      <div class="player-form-control">
        <input ${inputAttributes}>
        ${helpText ? `<p class="player-form-help">${helpText}</p>` : ""}
      </div>
    </div>
  `;
}

function renderSelectRow({
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
  const rowClassName = ["player-form-row", rowClass].filter(Boolean).join(" ");

  const optionHtml = grouped ? buildGroupedOptions(options, value) : buildOptions(options, value);

  return `
    <div class="${rowClassName}" data-field="${field}">
      <label class="player-form-label" for="${field}">${label}</label>
      <div class="player-form-control">
        <select ${selectAttributes}>
          ${optionHtml}
        </select>
        ${helpText ? `<p class="player-form-help">${helpText}</p>` : ""}
      </div>
    </div>
  `;
}

function renderSnapshotOptionButtons(selectedValue, surface) {
  return getSnapshotOptionsForRender(selectedValue).map(({ value, label }) => {
    const isSelected = value === selectedValue;

    return `
      <button
        type="button"
        class="player-snapshot-option${isSelected ? " is-selected" : ""}"
        data-snapshot-option-value="${escapeAttribute(value)}"
        data-snapshot-option-surface="${escapeAttribute(surface)}"
        role="option"
        aria-selected="${isSelected ? "true" : "false"}"
      >
        <span class="player-snapshot-option-label">${label}</span>
      </button>
    `;
  }).join("");
}

function renderSnapshotSelector(value) {
  const fallbackValue = SNAPSHOT_LABEL_OPTIONS[0]?.value ?? "";
  const selectedValue = SNAPSHOT_LABELS[value] ? value : fallbackValue;
  const selectedLabel = getSnapshotLabel(selectedValue);

  return `
    <div class="player-snapshot-selector" data-snapshot-selector>
      <input
        id="snapshot_label"
        type="hidden"
        name="snapshot_label"
        value="${escapeAttribute(selectedValue)}"
        data-snapshot-input
      >
      <div class="player-snapshot-selector-desktop" data-snapshot-desktop>
        <div class="player-snapshot-option-list" data-snapshot-option-list role="listbox" aria-label="スナップショット種別">
          ${renderSnapshotOptionButtons(selectedValue, "desktop")}
        </div>
      </div>
      <details class="player-snapshot-selector-mobile" data-snapshot-mobile>
        <summary class="player-snapshot-mobile-summary">
          <span class="player-snapshot-mobile-summary-copy">
            <span class="player-snapshot-mobile-summary-label">選択中の時点</span>
            <span class="player-snapshot-mobile-summary-value" data-snapshot-current-label>${selectedLabel}</span>
          </span>
          <span class="player-snapshot-mobile-summary-icon" aria-hidden="true"></span>
        </summary>
        <div class="player-snapshot-mobile-body" data-snapshot-mobile-body role="listbox" aria-label="スナップショット種別">
          ${renderSnapshotOptionButtons(selectedValue, "mobile")}
        </div>
      </details>
    </div>
  `;
}

function renderTimelineEditorRow({ admissionYear, snapshotLabel, schoolCurrentYear }) {
  const numericSchoolCurrentYear = Number(schoolCurrentYear);
  const currentYear = Number.isInteger(numericSchoolCurrentYear)
    ? numericSchoolCurrentYear
    : new Date().getFullYear();

  return `
    <div class="player-form-row player-form-row--full player-form-row--timeline" data-field="record_timeline">
      <div class="player-form-row-intro">
        <span class="player-form-label">記録時点</span>
        <p class="player-form-help">入学年とスナップショット種別を並べて確認しながら編集できます。</p>
      </div>
      <div class="player-timeline-editor">
        <section class="player-timeline-panel player-timeline-panel--year" aria-labelledby="player-edit-timeline-year-title">
          <div class="player-timeline-panel-header">
            <h3 id="player-edit-timeline-year-title" class="player-timeline-panel-title">入学年</h3>
            <p class="player-timeline-panel-description">
              保存済みの入学年を優先します。学校の現在年度は ${formatYearValue(currentYear)} です。
            </p>
          </div>
          <div class="player-timeline-panel-body player-form-control player-form-control--year">
            ${buildAdmissionYearPicker({
              selectedYear: admissionYear,
              currentYear,
            })}
          </div>
        </section>
        <section class="player-timeline-panel player-timeline-panel--snapshot" aria-labelledby="player-edit-timeline-snapshot-title">
          <div class="player-timeline-panel-header">
            <h3 id="player-edit-timeline-snapshot-title" class="player-timeline-panel-title">スナップショット種別</h3>
            <p class="player-timeline-panel-description">PCは一覧、モバイルは開閉で選択します。</p>
          </div>
          <div class="player-timeline-panel-body player-timeline-panel-body--snapshot">
            ${renderSnapshotSelector(snapshotLabel)}
          </div>
        </section>
      </div>
    </div>
  `;
}

function renderNumberRow({ field, label, value, min, max, step = 1, helpText = "", rowClass = "" }) {
  const rowClassName = ["player-form-row", rowClass].filter(Boolean).join(" ");
  const inputAttributes = buildAttributeString({
    id: field,
    name: field,
    type: "number",
    inputmode: "numeric",
    value: value ?? "",
    min,
    max,
    step,
  });

  if (rowClass.includes("player-form-row--ability")) {
    return renderAbilityBlock({
      field,
      label,
      helpText,
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

  return `
    <div class="${rowClassName}" data-field="${field}">
      <label class="player-form-label" for="${field}">${label}</label>
      <div class="player-form-control">
        <input ${inputAttributes}>
        ${helpText ? `<p class="player-form-help">${helpText}</p>` : ""}
      </div>
    </div>
  `;
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

function renderTrajectoryRow({ field, label, value }) {
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

function renderRankedNumberRow({ field, label, value }) {
  const currentValue = value === null || value === undefined ? "" : String(value);
  const selectedRank = getAbilityRankForValue(value)?.rank ?? "";

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

function renderAbilityRow(fieldConfig, player) {
  const value = player[fieldConfig.field];

  if (fieldConfig.inputType === "ranked") {
    return renderRankedNumberRow({
      field: fieldConfig.field,
      label: fieldConfig.label,
      value,
    });
  }

  if (fieldConfig.inputType === "trajectory") {
    return renderTrajectoryRow({
      field: fieldConfig.field,
      label: fieldConfig.label,
      value,
    });
  }

  return renderNumberRow({
    ...fieldConfig,
    value,
    rowClass: "player-form-row--ability",
  });
}

function renderAbilityRows(fields, player) {
  return fields.map((field) => renderAbilityRow(field, player)).join("");
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

function setupSnapshotSelector(form) {
  form.querySelectorAll("[data-snapshot-selector]").forEach((selector) => {
    const hiddenInput = selector.querySelector("[data-snapshot-input]");
    const mobilePanel = selector.querySelector("[data-snapshot-mobile]");
    const currentLabelTargets = selector.querySelectorAll("[data-snapshot-current-label]");
    const optionButtons = Array.from(selector.querySelectorAll("[data-snapshot-option-value]"));

    if (!hiddenInput || optionButtons.length === 0) {
      return;
    }

    const allowedValues = new Set(optionButtons.map((button) => button.dataset.snapshotOptionValue));
    const initialValue = allowedValues.has(hiddenInput.value)
      ? hiddenInput.value
      : SNAPSHOT_LABEL_OPTIONS[0]?.value ?? "";

    const syncSelection = (nextValue) => {
      const safeValue = allowedValues.has(nextValue) ? nextValue : initialValue;
      hiddenInput.value = safeValue;
      selector.dataset.snapshotValue = safeValue;

      currentLabelTargets.forEach((target) => {
        target.textContent = getSnapshotLabel(safeValue);
      });

      optionButtons.forEach((button) => {
        const isSelected = button.dataset.snapshotOptionValue === safeValue;
        button.classList.toggle("is-selected", isSelected);
        button.setAttribute("aria-selected", isSelected ? "true" : "false");
      });
    };

    optionButtons.forEach((button) => {
      button.addEventListener("click", () => {
        syncSelection(button.dataset.snapshotOptionValue);

        if (mobilePanel && button.dataset.snapshotOptionSurface === "mobile") {
          mobilePanel.open = false;
        }
      });
    });

    syncSelection(initialValue);
  });
}

function syncTimelineSnapshotListHeight(form) {
  const isMobileViewport = window.matchMedia("(max-width: 640px)").matches;

  form.querySelectorAll(".player-timeline-editor").forEach((editor) => {
    const yearPicker = editor.querySelector(".player-timeline-panel--year .admission-year-picker");
    const snapshotDesktop = editor.querySelector(".player-snapshot-selector-desktop");
    const snapshotList = editor.querySelector(".player-snapshot-option-list");

    if (!snapshotList) {
      return;
    }

    if (isMobileViewport || !yearPicker) {
      snapshotList.style.height = "";
      snapshotList.style.maxHeight = "";

      if (snapshotDesktop) {
        snapshotDesktop.style.height = "";
        snapshotDesktop.style.maxHeight = "";
      }

      return;
    }

    const pickerHeight = Math.ceil(yearPicker.getBoundingClientRect().height);

    if (pickerHeight <= 0) {
      return;
    }

    snapshotList.style.height = "100%";
    snapshotList.style.maxHeight = "100%";

    if (snapshotDesktop) {
      snapshotDesktop.style.height = `${pickerHeight}px`;
      snapshotDesktop.style.maxHeight = `${pickerHeight}px`;
    }
  });
}

function getPitcherAbilityElements(form) {
  const mainPositionSelect = form.querySelector("#main_position");
  const pitcherSection = form.querySelector('[data-edit-section="pitcher"]');
  const pitchesSection = form.querySelector('[data-edit-section="pitches"]');
  const pitcherControls = pitcherSection
    ? Array.from(pitcherSection.querySelectorAll("input, select, textarea, button"))
    : [];
  const pitchRelationControls = pitchesSection
    ? Array.from(pitchesSection.querySelectorAll("input, select, textarea, button"))
    : [];

  return {
    mainPositionSelect,
    pitcherSection,
    pitchesSection,
    pitcherControls,
    pitchRelationControls,
  };
}

function updateAbilitySectionVisibility(form) {
  const {
    mainPositionSelect,
    pitcherSection,
    pitchesSection,
    pitcherControls,
    pitchRelationControls,
  } = getPitcherAbilityElements(form);

  if (!mainPositionSelect || !pitcherSection) {
    return false;
  }

  const shouldShowPitcherSection = isPitcherPosition(mainPositionSelect.value);
  pitcherSection.hidden = !shouldShowPitcherSection;
  pitcherSection.setAttribute("aria-hidden", shouldShowPitcherSection ? "false" : "true");
  if (pitchesSection) {
    pitchesSection.hidden = !shouldShowPitcherSection;
    pitchesSection.setAttribute("aria-hidden", shouldShowPitcherSection ? "false" : "true");
  }

  pitcherControls.forEach((control) => {
    control.disabled = !shouldShowPitcherSection;
  });
  pitchRelationControls.forEach((control) => {
    const isOriginalSharedInput = control.matches("[data-pitch-original-shared-name]");
    const originalSelected =
      control.closest('[data-relation-editor="pitches"]')?.dataset.pitchOriginalSelected === "true";
    control.disabled = !shouldShowPitcherSection || (isOriginalSharedInput && !originalSelected);
  });

  return true;
}

function bindAbilitySectionVisibility(form) {
  const { mainPositionSelect } = getPitcherAbilityElements(form);

  if (!mainPositionSelect) {
    return false;
  }

  mainPositionSelect.addEventListener("change", () => {
    updateAbilitySectionVisibility(form);
  });

  return updateAbilitySectionVisibility(form);
}

function applyRequestedEditScope(form) {
  const requestedScope = getRequestedEditScope();
  const scope = FOCUSABLE_EDIT_SCOPES.has(requestedScope) ? requestedScope : "";

  form.dataset.editScope = scope || DEFAULT_EDIT_SCOPE;

  if (!scope) {
    return false;
  }

  const targetSection = form.querySelector(`[data-edit-section="${scope}"]`);

  if (!targetSection || targetSection.hidden) {
    return false;
  }

  targetSection.dataset.scopeActive = "true";

  if (!window.location.hash) {
    window.requestAnimationFrame(() => {
      targetSection.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
    });
  }

  return true;
}

function renderForm(form, player, relationOptions, { detailHref, returnLabel = "詳細へ戻る" } = {}) {
  const basicSection = renderFormSection({
    id: "player-edit-section-basic",
    sectionKey: "basic",
    title: "基本情報",
    description: "識別情報とスナップショット単位の基本項目を編集します。",
    content: [
      renderTextInputRow({
        field: "name",
        label: "名前",
        value: player.name,
        required: true,
        rowClass: "player-form-row--full",
      }),
      renderSelectRow({
        field: "player_type",
        label: "選手種別",
        options: PLAYER_TYPE_OPTIONS,
        value: player.player_type,
        required: true,
      }),
      renderSelectRow({
        field: "prefecture",
        label: "出身都道府県",
        options: PREFECTURE_GROUPS,
        value: player.prefecture,
        required: true,
        grouped: true,
      }),
      renderSelectRow({
        field: "grade",
        label: "学年",
        options: ["1", "2", "3"],
        value: String(player.grade),
        required: true,
      }),
      renderSelectRow({
        field: "main_position",
        label: "メインポジション",
        options: POSITION_OPTIONS,
        value: player.main_position,
        required: true,
      }),
      renderSelectRow({
        field: "throwing_hand",
        label: "投",
        options: THROWING_HAND_OPTIONS,
        value: player.throwing_hand,
        required: true,
      }),
      renderSelectRow({
        field: "batting_hand",
        label: "打",
        options: BATTING_HAND_OPTIONS,
        value: player.batting_hand,
        required: true,
      }),
      renderTimelineEditorRow({
        admissionYear: player.admission_year,
        snapshotLabel: player.snapshot_label,
        schoolCurrentYear: player.school_current_year,
      }),
    ].join(""),
  });

  const pitcherSection = renderFormSection({
    id: "player-edit-section-pitcher",
    sectionKey: "pitcher",
    title: "投手能力",
    description: "球速は直接入力、コントロールとスタミナはランクと数値で編集します。",
    fieldsClass: "player-form-fields player-form-fields--ability",
    content: renderAbilityRows(PITCHER_ABILITY_FIELDS, player),
  });

  const batterSection = renderFormSection({
    id: "player-edit-section-batter",
    sectionKey: "batter",
    title: "野手能力",
    description: "弾道は 1～4 の選択式、そのほかの能力はランクと数値で編集します。",
    fieldsClass: "player-form-fields player-form-fields--ability",
    content: renderAbilityRows(BATTER_ABILITY_FIELDS, player),
  });

  const specialSection = renderFormSection({
    id: "player-edit-section-special",
    sectionKey: "special",
    title: "特殊能力",
    description: "現在の snapshot に付いている特殊能力を編集します。",
    fieldsClass: "player-form-fields player-form-fields--relation",
    content: renderSpecialAbilityEditor({
      abilities: player.special_abilities,
      relationOptions,
      editorIdPrefix: `player-edit-${player.id}`,
    }),
  });

  const pitchesSection = renderFormSection({
    id: "player-edit-section-pitches",
    sectionKey: "pitches",
    title: "変化球",
    description: "必要な方向だけ追加し、方向ごとの候補とメーターで変化量を編集します。",
    fieldsClass: "player-form-fields player-form-fields--relation",
    content: renderPitchTypeEditor({
      pitchTypes: player.pitch_types,
      relationOptions,
      editorIdPrefix: `player-edit-${player.id}`,
      throwingHand: player.throwing_hand,
    }),
  });

  const subPositionsSection = renderFormSection({
    id: "player-edit-section-sub-positions",
    sectionKey: "sub_positions",
    title: "サブポジション",
    description: "メインポジション以外の守備位置と適性値を編集します。",
    fieldsClass: "player-form-fields player-form-fields--relation",
    content: renderSubPositionEditor({
      subPositions: player.sub_positions,
      relationOptions,
      editorIdPrefix: `player-edit-${player.id}`,
      mainPosition: player.main_position,
      mainDefenseValue: player.fielding,
    }),
  });

  form.innerHTML = `
    ${basicSection}
    ${pitcherSection}
    ${pitchesSection}
    ${batterSection}
    ${specialSection}
    ${subPositionsSection}

    <div class="player-form-actions">
      <button type="submit" class="player-button player-button-primary">選手情報を保存</button>
      <a class="player-button player-button-secondary" href="${escapeAttribute(
        detailHref || buildPlayerDetailUrl(player.id, player.snapshot_label)
      )}">${returnLabel}</a>
    </div>
  `;
}

function setMessage(messageElement, message, isError = false) {
  messageElement.textContent = message;
  messageElement.classList.toggle("is-visible", Boolean(message));
  messageElement.classList.toggle("is-error", Boolean(message) && isError);
  messageElement.classList.toggle("is-success", Boolean(message) && !isError);
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

function resolveMainDefenseValueFromForm(form, fallbackValue = "") {
  const hiddenValue = form.querySelector('[data-ranked-value-hidden="fielding"]')?.value;
  const fallbackNumericValue = Number(fallbackValue);
  const hiddenNumericValue = Number(hiddenValue);

  if (Number.isInteger(hiddenNumericValue) && hiddenNumericValue >= 1 && hiddenNumericValue <= 100) {
    return hiddenNumericValue;
  }

  if (Number.isInteger(fallbackNumericValue) && fallbackNumericValue >= 1 && fallbackNumericValue <= 100) {
    return fallbackNumericValue;
  }

  return "";
}

function buildPayload(formData, form, relationOptions) {
  const payload = {
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

  const abilityFieldNames = isPitcherPosition(payload.main_position)
    ? [...PITCHER_ABILITY_FIELD_NAMES, ...BATTER_ABILITY_FIELD_NAMES]
    : BATTER_ABILITY_FIELD_NAMES;

  abilityFieldNames.forEach((field) => {
    appendOptionalIntegerPayload(payload, formData, field);
  });

  return {
    ...payload,
    ...serializeRelationInputs(form, relationOptions, {
      includePitchTypes: isPitcherPosition(payload.main_position),
      mainPosition: payload.main_position,
      mainDefenseValue: resolveMainDefenseValueFromForm(form, payload.fielding),
    }),
  };
}

async function handleSubmit(event, player, messageElement, relationOptions) {
  event.preventDefault();

  const form = event.currentTarget;
  const formData = new FormData(form);
  const payload = buildPayload(formData, form, relationOptions);
  const detailHref = buildPlayerDetailUrl(player.id, payload.snapshot_label || player.snapshot_label);

  try {
    setMessage(messageElement, "保存しています...");
    await updatePlayer(player.id, payload);
    setMessage(messageElement, "保存しました。詳細画面へ戻ります。");
    window.setTimeout(() => {
      window.location.href = detailHref;
    }, 800);
  } catch (error) {
    setMessage(messageElement, error.message, true);
    window.alert(error.message);
  }
}

async function init() {
  const form = document.getElementById("player-edit-form");
  const messageElement = document.getElementById("player-edit-message");
  const flowNoteElement = document.getElementById("player-edit-flow-note");
  const ocrEntryElement = document.getElementById("player-edit-ocr-entry");
  const titleElement = document.getElementById("player-edit-title");
  const contextElement = document.getElementById("player-edit-context");

  try {
    const playerId = getPlayerIdFromQuery();
    const flowContext = getEditFlowContextFromQuery();
    const [player, relationOptions] = await Promise.all([
      fetchPlayerById(playerId),
      loadRelationOptions(),
    ]);
    const presentation = buildEditModePresentation(player, flowContext);
    const ocrEntry = buildOcrEntryPresentation(player, flowContext);
    const detailHref = buildPlayerDetailUrl(player.id, flowContext.snapshot || player.snapshot_label);

    setPageHeader(titleElement, contextElement, presentation);
    renderFlowNote(flowNoteElement, presentation.flowNote);
    renderOcrEntryCard(ocrEntryElement, ocrEntry);

    if (Number(player.school_is_archived) === 1) {
      setMessage(messageElement, "削除済み学校に所属する選手は編集できません。", true);
      form.innerHTML = `
        <div class="player-form-actions">
          <a class="player-button player-button-secondary" href="${escapeAttribute(detailHref)}">選手詳細へ戻る</a>
          <a class="player-button player-button-secondary" href="./schools.html">学校一覧へ戻る</a>
        </div>
      `;
      return;
    }

    renderForm(form, player, relationOptions, {
      detailHref,
      returnLabel: presentation.returnLabel,
    });
    setupAdmissionYearPickers(form);
    setupSnapshotSelector(form);
    syncTimelineSnapshotListHeight(form);
    window.addEventListener("resize", () => syncTimelineSnapshotListHeight(form));
    setupRankedAbilityInputs(form);
    bindRelationEditors(form, relationOptions, {
      getMainPosition: () => form.querySelector("#main_position")?.value ?? player.main_position,
      getThrowingHand: () => form.querySelector("#throwing_hand")?.value ?? player.throwing_hand,
      getMainDefenseValue: () => resolveMainDefenseValueFromForm(form, player.fielding),
    });
    bindAbilitySectionVisibility(form);
    applyRequestedEditScope(form);
    bindOcrEntryActions(ocrEntryElement, messageElement, ocrEntry);
    form.addEventListener("submit", (event) =>
      handleSubmit(event, player, messageElement, relationOptions)
    );
  } catch (error) {
    setPageHeader(titleElement, contextElement, {
      title: "選手情報編集",
      context: "選手情報を取得できませんでした。",
      documentTitle: "選手情報編集",
    });
    renderOcrEntryCard(ocrEntryElement, null);
    setMessage(messageElement, error.message, true);
    form.innerHTML = `
      <div class="player-form-actions">
        <a class="player-button player-button-secondary" href="./schools.html">学校一覧へ戻る</a>
      </div>
    `;
  }
}

if (typeof document !== "undefined" && document.getElementById("player-edit-form")) {
  init();
}

export { bindAbilitySectionVisibility, buildPayload, getAbilityRankForValue, isPitcherPosition, updateAbilitySectionVisibility };
