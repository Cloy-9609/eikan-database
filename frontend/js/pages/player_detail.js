import { fetchPlayerById, updatePlayer } from "../api/playerApi.js";
import {
  buildAdmissionYearPicker,
  setupAdmissionYearPickers,
} from "../components/admissionYearPicker.js";
import { PREFECTURE_GROUPS, isKnownPrefecture } from "../constants/prefectures.js";
import { formatSchoolName } from "../utils/formatter.js";

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
  { value: "post_tournament", label: "大会後" },
  { value: "after_1st_summer", label: "1年夏大会後" },
  { value: "after_1st_autumn", label: "1年秋大会後" },
  { value: "after_1st_spring", label: "1年春大会後" },
  { value: "after_2nd_summer", label: "2年夏大会後" },
  { value: "after_2nd_autumn", label: "2年秋大会後" },
  { value: "after_2nd_spring", label: "2年春大会後" },
  { value: "after_3rd_summer", label: "3年夏大会後" },
  { value: "graduation", label: "卒業時" },
];

const SNAPSHOT_LABELS = Object.fromEntries(
  SNAPSHOT_LABEL_OPTIONS.map(({ value, label }) => [value, label])
);

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
    description: "特殊能力編集は今後このモーダルに追加できる構造にしています。",
    submitLabel: "",
  },
};

const DETAIL_STATE = {
  player: null,
  refs: null,
  activeModalScope: "",
  lastFocusedElement: null,
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

function setMessage(messageElement, message, isError = false) {
  messageElement.textContent = message;
  messageElement.classList.toggle("is-visible", Boolean(message));
  messageElement.classList.toggle("is-error", Boolean(message) && isError);
  messageElement.classList.toggle("is-success", Boolean(message) && !isError);
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

function renderPlayer(refs, player) {
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

  const pitchTypesSection = shouldShowPitcherSection
    ? renderListSection({
        title: "変化球一覧",
        sectionKey: "pitch-types",
        items: player.pitch_types,
        formatter: (item) => {
          const pitchName = escapeHtml(item.pitch_name ?? "不明");
          const level = item.level !== undefined && item.level !== null ? ` Lv${escapeHtml(item.level)}` : "";
          const original = item.is_original ? " (オリジナル)" : "";
          const originalName = item.original_pitch_name
            ? ` / ${escapeHtml(item.original_pitch_name)}`
            : "";

          return `${pitchName}${level}${original}${originalName}`;
        },
      })
    : "";

  const specialAbilitiesSection = renderListSection({
    title: "特殊能力一覧",
    sectionKey: "special",
    items: player.special_abilities,
    formatter: (item) => {
      const name = escapeHtml(item.ability_name ?? "不明");
      const rank = item.rank_value ? ` (${escapeHtml(item.rank_value)})` : "";
      const category = item.ability_category ? ` [${escapeHtml(item.ability_category)}]` : "";

      return `${name}${rank}${category}`;
    },
  });

  const subPositionsSection = renderListSection({
    title: "サブポジ一覧",
    sectionKey: "sub-positions",
    items: player.sub_positions,
    formatter: (item) => {
      const name = escapeHtml(item.position_name ?? "不明");
      const suitability = item.suitability_value ? ` (${escapeHtml(item.suitability_value)})` : "";

      return `${name}${suitability}`;
    },
  });

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

function buildSectionUpdatePayload(scope, formData) {
  if (scope === "basic") {
    return buildBasicSectionPayload(formData);
  }

  if (scope === "pitcher") {
    return buildAbilitySectionPayload(formData, PITCHER_ABILITY_FIELDS);
  }

  if (scope === "batter") {
    return buildAbilitySectionPayload(formData, BATTER_ABILITY_FIELDS);
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
          options: SNAPSHOT_LABEL_OPTIONS,
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

  const placeholderContent = renderModalFormSection({
    sectionKey: "special",
    title: "特殊能力",
    description: "special スコープの編集フォームは今後ここに追加できます。",
    content: `
      <div class="player-modal-placeholder">
        <p class="player-empty-text">
          まだ特殊能力の個別編集フォームは実装していません。今後はこのスコープにフォームを差し込むだけで、同じモーダル基盤を使って拡張できます。
        </p>
      </div>
    `,
  });

  return renderSectionEditFormLayout({ scope, player, content: placeholderContent });
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

  if (!refs?.modalElement || !refs.modalBodyElement || !meta || !player) {
    return false;
  }

  DETAIL_STATE.lastFocusedElement = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;
  DETAIL_STATE.activeModalScope = scope;
  refs.modalKickerElement.textContent = meta.kicker;
  refs.modalTitleElement.textContent = meta.title;
  refs.modalBodyElement.innerHTML = buildSectionEditForm(scope, player);
  refs.modalElement.hidden = false;
  refs.modalElement.dataset.activeScope = scope;
  document.body.classList.add("player-page--modal-open");
  setMessage(refs.modalMessageElement, meta.description);

  const form = refs.modalBodyElement.querySelector("[data-section-edit-form]");

  if (form) {
    setupAdmissionYearPickers(form);
    setupRankedAbilityInputs(form);
    window.requestAnimationFrame(() => {
      const firstFocusable = form.querySelector("select, input:not([type='hidden']), textarea, button");
      if (firstFocusable instanceof HTMLElement) {
        firstFocusable.focus();
      }
    });
  }

  return true;
}

async function saveSectionEdit(scope, formData) {
  const currentPlayer = DETAIL_STATE.player;

  if (!currentPlayer) {
    throw new Error("選手情報が読み込まれていません。");
  }

  const payload = {
    ...buildRequiredUpdatePayload(currentPlayer),
    ...buildSectionUpdatePayload(scope, formData),
  };

  return updatePlayer(currentPlayer.id, payload);
}

function handleDetailRootClick(event) {
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

function handleModalClick(event) {
  const closeTrigger = event.target.closest("[data-modal-close]");

  if (!closeTrigger) {
    return;
  }

  event.preventDefault();
  closeSectionEditModal();
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

  controls.forEach((control) => {
    control.disabled = true;
  });
  setMessage(DETAIL_STATE.refs.modalMessageElement, `${meta.title}を保存しています...`);

  try {
    const updatedPlayer = await saveSectionEdit(scope, formData);
    setMessage(DETAIL_STATE.refs.modalMessageElement, `${meta.title}を更新しました。`);
    DETAIL_STATE.player = updatedPlayer;
    renderPlayer(DETAIL_STATE.refs, updatedPlayer);

    await new Promise((resolve) => {
      window.requestAnimationFrame(() => resolve());
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
  refs.modalElement.addEventListener("click", handleModalClick);
  refs.modalBodyElement.addEventListener("submit", handleModalSubmit);
  document.addEventListener("keydown", handleDocumentKeydown);
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
  setupInteractions(refs);

  try {
    const playerId = getPlayerIdFromQuery();
    const player = await fetchPlayerById(playerId);
    DETAIL_STATE.player = player;
    renderPlayer(refs, player);
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
  buildSectionEditForm,
  closeSectionEditModal,
  getAbilityRank,
  isPitcherPosition,
  openSectionEditModal,
  saveSectionEdit,
};
