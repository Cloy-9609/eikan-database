const FALLBACK_RELATION_OPTIONS = {
  specialAbilityCategories: [
    { value: "pitcher_ranked", label: "投手青特（ランクあり）", usesRank: true },
    { value: "pitcher_unranked", label: "投手青特（一般）", usesRank: false },
    { value: "batter_ranked", label: "野手青特（ランクあり）", usesRank: true },
    { value: "batter_unranked", label: "野手青特（一般）", usesRank: false },
    { value: "green", label: "緑特", usesRank: false },
  ],
  specialAbilitySuggestions: [],
  pitchTypeSuggestions: [
    "全力ストレート",
    "ツーシームファスト",
    "ムービングファスト",
    "超スローボール",
    "スライダー",
    "Hスライダー",
    "カットボール",
    "シュート",
    "Hシュート",
    "シンキングツーシーム",
    "フォーク",
    "SFF",
    "チェンジアップ",
    "Vスライダー",
    "パーム",
    "ナックル",
    "カーブ",
    "スローカーブ",
    "ドロップカーブ",
    "スラーブ",
    "ナックルカーブ",
    "パワーカーブ",
    "ドロップ",
    "シンカー（スクリュー）",
    "シンカー",
    "スクリュー",
    "Hシンカー",
    "サークルチェンジ",
  ],
  subPositionOptions: ["投手", "捕手", "一塁手", "二塁手", "三塁手", "遊撃手", "外野手"],
  subPositionSuitabilitySuggestions: ["S", "A", "B", "C", "D", "E", "F", "G"],
};

const SPECIAL_ABILITY_RANK_OPTIONS = ["A", "B", "C", "D", "E", "F", "G"];
export const PITCH_METER_MAX_LEVEL = 7;

export const PITCH_MOVEMENT_DIRECTIONS = [
  { key: "top", label: "上", orientation: "vertical", angle: 0 },
  { key: "left", label: "左", orientation: "horizontal", angle: 0 },
  { key: "right", label: "右", orientation: "horizontal", angle: 0 },
  { key: "down-left", label: "左下", orientation: "vertical", angle: 45 },
  { key: "down", label: "下", orientation: "vertical", angle: 0 },
  { key: "down-right", label: "右下", orientation: "vertical", angle: -45 },
];

const PITCH_DIRECTION_MIRROR_MAP = {
  top: "top",
  left: "right",
  right: "left",
  "down-left": "down-right",
  down: "down",
  "down-right": "down-left",
};

const PITCH_EDITOR_MAX_VISIBLE_SLOTS = 2;

const PITCH_MOVEMENT_CATEGORIES = [
  { direction: "left", patterns: ["シュート", "Hシュート", "シンキングツーシーム"] },
  { direction: "down-right", patterns: ["カーブ", "スローカーブ", "ドロップカーブ", "スラーブ", "ナックルカーブ", "パワーカーブ", "ドロップ"] },
  { direction: "down-left", patterns: ["シンカー（スクリュー）", "シンカー", "スクリュー", "Hシンカー", "サークルチェンジ"] },
  {
    direction: "down",
    patterns: ["フォーク", "SFF", "チェンジアップ", "Vスライダー", "Ｖスライダー", "縦スライダー", "パーム", "ナックル"],
  },
  { direction: "right", patterns: ["スライダー", "Hスライダー", "カットボール", "カッター"] },
  {
    direction: "top-secondary",
    patterns: ["全力ストレート", "ツーシームファスト", "ツーシーム", "ムービングファスト", "ムービング", "超スローボール"],
  },
];

const STRAIGHT_PITCH_PATTERNS = ["ストレート", "通常ストレート", "直球"];
const PITCH_VISUAL_EXCLUDED_NAMES = ["全力ストレート"];
const PITCH_EDIT_SELECT_EXCLUDED_NAMES = PITCH_VISUAL_EXCLUDED_NAMES;

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

function normalizeStringArray(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return Array.from(
    new Set(
      items
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
    )
  );
}

function normalizeCategoryOptions(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return FALLBACK_RELATION_OPTIONS.specialAbilityCategories;
  }

  return items
    .map((item) => ({
      value: String(item?.value ?? "").trim(),
      label: String(item?.label ?? item?.value ?? "").trim(),
      usesRank: Boolean(item?.usesRank),
    }))
    .filter((item) => item.value && item.label);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

export function getFallbackRelationOptions() {
  return cloneJson(FALLBACK_RELATION_OPTIONS);
}

export function normalizeRelationOptions(rawOptions = {}) {
  return {
    specialAbilityCategories: normalizeCategoryOptions(rawOptions.specialAbilityCategories),
    specialAbilitySuggestions: normalizeStringArray(rawOptions.specialAbilitySuggestions),
    pitchTypeSuggestions:
      normalizeStringArray(rawOptions.pitchTypeSuggestions).length > 0
        ? normalizeStringArray(rawOptions.pitchTypeSuggestions)
        : [...FALLBACK_RELATION_OPTIONS.pitchTypeSuggestions],
    subPositionOptions:
      normalizeStringArray(rawOptions.subPositionOptions).length > 0
        ? normalizeStringArray(rawOptions.subPositionOptions)
        : [...FALLBACK_RELATION_OPTIONS.subPositionOptions],
    subPositionSuitabilitySuggestions:
      normalizeStringArray(rawOptions.subPositionSuitabilitySuggestions).length > 0
        ? normalizeStringArray(rawOptions.subPositionSuitabilitySuggestions)
        : [...FALLBACK_RELATION_OPTIONS.subPositionSuitabilitySuggestions],
  };
}

function renderStringOptions(options, selectedValue = "", placeholder = "選択してください") {
  const normalizedSelected = String(selectedValue ?? "");

  return [
    `<option value="">${placeholder}</option>`,
    ...options.map((option) => {
      const selected = option === normalizedSelected ? " selected" : "";
      return `<option value="${escapeAttribute(option)}"${selected}>${escapeHtml(option)}</option>`;
    }),
  ].join("");
}

function renderCategoryOptions(categories, selectedValue = "") {
  const normalizedSelected = String(selectedValue ?? "");

  return [
    '<option value="">系統を選択</option>',
    ...categories.map((category) => {
      const selected = category.value === normalizedSelected ? " selected" : "";
      return `<option value="${escapeAttribute(category.value)}"${selected}>${escapeHtml(
        category.label
      )}</option>`;
    }),
  ].join("");
}

function renderRankOptions(selectedValue = "") {
  return renderStringOptions(SPECIAL_ABILITY_RANK_OPTIONS, selectedValue, "ランクなし");
}

function renderDatalist(id, options) {
  if (!id || !Array.isArray(options) || options.length === 0) {
    return "";
  }

  return `
    <datalist id="${escapeAttribute(id)}">
      ${options.map((option) => `<option value="${escapeAttribute(option)}"></option>`).join("")}
    </datalist>
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

function pitchNameEqualsAny(value, patterns) {
  const normalizedName = normalizePitchName(value);
  return patterns.some((name) => normalizedName === normalizePitchName(name));
}

function isPitchEditExcludedPitchName(value) {
  return pitchNameEqualsAny(value, PITCH_EDIT_SELECT_EXCLUDED_NAMES);
}

export function isPitchMovementChartExcludedPitchName(value) {
  return pitchNameEqualsAny(value, PITCH_VISUAL_EXCLUDED_NAMES);
}

function pitchNameMatches(value, patterns) {
  const normalizedName = normalizePitchName(value);

  if (!normalizedName) {
    return false;
  }

  return patterns.some((pattern) => normalizedName.includes(normalizePitchName(pattern)));
}

export function isStraightPitchName(value) {
  const normalizedName = normalizePitchName(value);
  return STRAIGHT_PITCH_PATTERNS.some((pattern) => normalizedName === normalizePitchName(pattern));
}

function isLeftThrowingHand(value) {
  return ["left", "左"].includes(String(value ?? "").trim().toLowerCase());
}

function mirrorPitchDirection(direction) {
  return PITCH_DIRECTION_MIRROR_MAP[direction] ?? direction;
}

export function getCanonicalPitchDirection(pitch) {
  if (isStraightPitchName(pitch?.pitch_name)) {
    return "top";
  }

  const candidateNames = [pitch?.pitch_name, pitch?.original_pitch_name].filter(Boolean);

  for (const name of candidateNames) {
    const category = PITCH_MOVEMENT_CATEGORIES.find(({ patterns }) => pitchNameMatches(name, patterns));

    if (category) {
      return category.direction;
    }
  }

  return "down";
}

export function getDisplayPitchDirection(pitch, throwingHand = "") {
  const canonicalDirection = getCanonicalPitchDirection(pitch);

  if (canonicalDirection === "top" || canonicalDirection === "top-secondary") {
    return "top";
  }

  return isLeftThrowingHand(throwingHand) ? mirrorPitchDirection(canonicalDirection) : canonicalDirection;
}

function getCanonicalDirectionForDisplay(displayDirection, throwingHand = "") {
  if (displayDirection === "top") {
    return "top-secondary";
  }

  return isLeftThrowingHand(throwingHand) ? mirrorPitchDirection(displayDirection) : displayDirection;
}

export function getPitchDisplayLayout(pitch, throwingHand = "") {
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

function getPitchOptionsForDirection(displayDirection, relationOptions, throwingHand = "", selectedValue = "") {
  const canonicalDirection = getCanonicalDirectionForDisplay(displayDirection, throwingHand);
  const sourceOptions = normalizeStringArray([
    ...FALLBACK_RELATION_OPTIONS.pitchTypeSuggestions,
    ...(relationOptions?.pitchTypeSuggestions ?? []),
    selectedValue,
  ]);
  const filteredOptions = sourceOptions.filter(
    (option) =>
      !isPitchEditExcludedPitchName(option) &&
      getCanonicalPitchDirection({ pitch_name: option }) === canonicalDirection
  );

  return normalizeStringArray([selectedValue, ...filteredOptions]).filter(
    (option) => !isPitchEditExcludedPitchName(option)
  );
}

function groupPitchesByDirection(pitchTypes = [], throwingHand = "") {
  const safePitchTypes = Array.isArray(pitchTypes) ? pitchTypes : [];

  return PITCH_MOVEMENT_DIRECTIONS.reduce((groups, direction) => {
    groups[direction.key] = safePitchTypes.filter(
      (pitch) => getPitchDisplayLayout(pitch, throwingHand).direction === direction.key
    );
    return groups;
  }, {});
}

function buildPitchSelectOptions(options, selectedValue = "") {
  const normalizedSelected = String(selectedValue ?? "");
  const normalizedOptions = normalizeStringArray([...options, normalizedSelected]).filter(
    (option) => !isPitchEditExcludedPitchName(option)
  );

  return [
    '<option value="">球種を選択</option>',
    ...normalizedOptions.map((option) => {
      const selected = option === normalizedSelected ? " selected" : "";
      return `<option value="${escapeAttribute(option)}"${selected}>${escapeHtml(option)}</option>`;
    }),
  ].join("");
}

function categoryUsesRank(categories, categoryValue) {
  return Boolean(categories.find((category) => category.value === categoryValue)?.usesRank);
}

function renderSpecialAbilityRow(item, relationOptions, { idPrefix, rowKey }) {
  const abilityNameId = `${idPrefix}-special-name-${rowKey}`;
  const abilityCategoryId = `${idPrefix}-special-category-${rowKey}`;
  const abilityRankId = `${idPrefix}-special-rank-${rowKey}`;
  const rankVisible = categoryUsesRank(relationOptions.specialAbilityCategories, item.ability_category);

  return `
    <div class="player-relation-row" data-relation-row="special">
      <div class="player-relation-row-grid player-relation-row-grid--special">
        <div class="player-relation-field">
          <label class="player-form-label player-relation-label" for="${escapeAttribute(abilityNameId)}">能力名</label>
          <input
            id="${escapeAttribute(abilityNameId)}"
            type="text"
            value="${escapeAttribute(item.ability_name ?? "")}"
            list="${escapeAttribute(idPrefix)}-special-abilities"
            data-special-ability-name
            placeholder="例: 対ピンチ"
          >
        </div>
        <div class="player-relation-field">
          <label class="player-form-label player-relation-label" for="${escapeAttribute(abilityCategoryId)}">系統</label>
          <select
            id="${escapeAttribute(abilityCategoryId)}"
            data-special-ability-category
          >
            ${renderCategoryOptions(relationOptions.specialAbilityCategories, item.ability_category)}
          </select>
        </div>
        <div class="player-relation-field" data-special-ability-rank-field ${rankVisible ? "" : "hidden"}>
          <label class="player-form-label player-relation-label" for="${escapeAttribute(abilityRankId)}">ランク</label>
          <select id="${escapeAttribute(abilityRankId)}" data-special-ability-rank>
            ${renderRankOptions(item.rank_value)}
          </select>
        </div>
      </div>
      <div class="player-relation-row-actions">
        <button type="button" class="player-button player-button-secondary player-button-inline" data-relation-remove>削除</button>
      </div>
    </div>
  `;
}

function renderPitchTypeRow(item, relationOptions, { idPrefix, rowKey }) {
  const pitchNameId = `${idPrefix}-pitch-name-${rowKey}`;
  const pitchLevelId = `${idPrefix}-pitch-level-${rowKey}`;
  const isOriginal = Number(item.is_original) === 1 || item.is_original === true;

  return `
    <div class="player-relation-row" data-relation-row="pitches">
      <div class="player-relation-row-grid player-relation-row-grid--pitch">
        <div class="player-relation-field">
          <label class="player-form-label player-relation-label" for="${escapeAttribute(pitchNameId)}">球種名</label>
          <input
            id="${escapeAttribute(pitchNameId)}"
            type="text"
            value="${escapeAttribute(item.pitch_name ?? "")}"
            list="${escapeAttribute(idPrefix)}-pitch-types"
            data-pitch-name
            placeholder="例: スライダー"
          >
        </div>
        <div class="player-relation-field">
          <label class="player-form-label player-relation-label" for="${escapeAttribute(pitchLevelId)}">変化量</label>
          <input
            id="${escapeAttribute(pitchLevelId)}"
            type="number"
            min="1"
            step="1"
            value="${escapeAttribute(item.level ?? 1)}"
            data-pitch-level
          >
        </div>
        <div class="player-relation-field player-relation-field--checkbox">
          <label class="player-form-label player-relation-label" for="${escapeAttribute(pitchNameId)}-original">オリジナル</label>
          <label class="player-relation-checkbox">
            <input
              id="${escapeAttribute(pitchNameId)}-original"
              type="checkbox"
              ${isOriginal ? "checked" : ""}
              data-pitch-original
            >
            <span>固有名あり</span>
          </label>
          <input
            type="hidden"
            value="${escapeAttribute(isOriginal ? item.original_pitch_name ?? "" : "")}"
            data-pitch-original-name
          >
        </div>
      </div>
      <div class="player-relation-row-actions">
        <button type="button" class="player-button player-button-secondary player-button-inline" data-relation-remove>削除</button>
      </div>
    </div>
  `;
}

function renderPitchEditorMeter(level, { direction, orientation, angle, isFixedLevel = false } = {}) {
  const safeLevel = isFixedLevel ? 1 : normalizePitchLevel(level);

  return `
    <div
      class="pitch-editor-meter"
      data-pitch-editor-meter
      data-pitch-direction="${escapeAttribute(direction)}"
      data-pitch-orientation="${escapeAttribute(orientation)}"
      data-pitch-baseline="${isFixedLevel ? "true" : "false"}"
      style="--pitch-angle: ${Number(angle) || 0}deg;"
      role="group"
      aria-label="変化量"
    >
      ${Array.from({ length: PITCH_METER_MAX_LEVEL }, (_, index) => {
        const value = index + 1;
        const activeClass = value <= safeLevel ? " is-active" : "";
        const currentAttribute = value === safeLevel ? ' aria-current="true"' : "";

        return `
          <button
            type="button"
            class="pitch-editor-meter-step${activeClass}"
            data-pitch-level-choice="${value}"
            aria-label="変化量 ${value}"
            ${currentAttribute}
          ></button>
        `;
      }).join("")}
    </div>
  `;
}

function renderPitchPreservedRow(item) {
  const isOriginal = Number(item?.is_original) === 1 || item?.is_original === true;

  return `
    <div class="pitch-editor-preserved-slot" data-relation-row="pitches" data-pitch-preserved-slot hidden>
      <input type="hidden" value="${escapeAttribute(item?.pitch_name ?? "")}" data-pitch-name>
      <input type="hidden" value="${escapeAttribute(item?.level ?? 1)}" data-pitch-level>
      <input type="checkbox" ${isOriginal ? "checked" : ""} data-pitch-original hidden>
      <input type="hidden" value="${escapeAttribute(item?.original_pitch_name ?? "")}" data-pitch-original-name>
    </div>
  `;
}

function normalizePitchEditorOriginalState(pitchTypes) {
  let originalFound = false;

  return pitchTypes.map((pitch) => {
    const isOriginal = Number(pitch?.is_original) === 1 || pitch?.is_original === true;

    if (isOriginal && !originalFound) {
      originalFound = true;
      return {
        ...pitch,
        is_original: 1,
        original_pitch_name: pitch?.original_pitch_name ?? "",
      };
    }

    if (!isOriginal) {
      return pitch;
    }

    return {
      ...pitch,
      is_original: 0,
      original_pitch_name: null,
    };
  });
}

function getFirstOriginalPitch(pitchTypes) {
  return pitchTypes.find((pitch) => Number(pitch?.is_original) === 1 || pitch?.is_original === true) ?? null;
}

function getPitchEditorMaxSlots(directionKey) {
  return directionKey === "top" ? 1 : PITCH_EDITOR_MAX_VISIBLE_SLOTS;
}

function getPitchEditorSlotNumber(directionKey, slotIndex) {
  return directionKey === "top" ? slotIndex + 2 : slotIndex + 1;
}

function getPitchEditorAddLabel(directionKey, slotCount) {
  if (directionKey === "top") {
    return "第2球種を追加";
  }

  return slotCount > 0 ? `第${slotCount + 1}変化球を追加` : "追加";
}

function renderPitchEditorSlot(item, relationOptions, { idPrefix, direction, slotIndex, throwingHand = "" }) {
  const pitchNameId = `${idPrefix}-pitch-${direction.key}-${slotIndex}-name`;
  const pitchOriginalId = `${idPrefix}-pitch-${direction.key}-${slotIndex}-original`;
  const isOriginal = Number(item?.is_original) === 1 || item?.is_original === true;
  const pitchName = item?.pitch_name ?? "";
  const isStraight = isStraightPitchName(pitchName);
  const isFixedLevel = isStraight || direction.key === "top";
  const level = isFixedLevel ? 1 : normalizePitchLevel(item?.level);
  const directionOptions = getPitchOptionsForDirection(
    direction.key,
    relationOptions,
    throwingHand,
    pitchName
  );

  return `
    <div
      class="pitch-editor-slot"
      data-relation-row="pitches"
      data-pitch-editor-slot
      data-pitch-direction="${escapeAttribute(direction.key)}"
      data-pitch-orientation="${escapeAttribute(direction.orientation)}"
      data-pitch-baseline="${isFixedLevel ? "true" : "false"}"
    >
      <div class="pitch-editor-slot-top">
        <span class="pitch-editor-slot-index">${getPitchEditorSlotNumber(direction.key, slotIndex)}</span>
        <div class="pitch-editor-controls">
          <label class="player-form-label pitch-editor-label" for="${escapeAttribute(pitchNameId)}">球種</label>
          <select id="${escapeAttribute(pitchNameId)}" data-pitch-name>
            ${buildPitchSelectOptions(directionOptions, pitchName)}
          </select>
        </div>
        <button type="button" class="pitch-editor-clear" data-pitch-slot-clear>削除</button>
      </div>
      <input type="hidden" value="${escapeAttribute(level)}" data-pitch-level>
      <div class="pitch-editor-meter-block">
        <div class="pitch-editor-level-readout">
          <span>変化量:</span>
          <strong data-pitch-level-readout>${escapeHtml(level)}</strong>
        </div>
        ${renderPitchEditorMeter(level, {
          direction: direction.key,
          orientation: direction.orientation,
          angle: direction.angle,
          isFixedLevel,
        })}
      </div>
      <div class="pitch-editor-original">
        <label class="player-relation-checkbox" for="${escapeAttribute(pitchOriginalId)}">
          <input
            id="${escapeAttribute(pitchOriginalId)}"
            type="checkbox"
            ${isOriginal ? "checked" : ""}
            data-pitch-original
          >
          <span>固有名あり</span>
        </label>
        <input
          type="hidden"
          value="${escapeAttribute(isOriginal ? item?.original_pitch_name ?? "" : "")}"
          data-pitch-original-name
        >
      </div>
    </div>
  `;
}

function renderPitchOriginalSharedField({ editorIdPrefix, originalPitch }) {
  const inputId = `${editorIdPrefix}-pitch-original-shared-name`;
  const isSelected = Boolean(originalPitch);

  return `
    <div class="pitch-editor-original-summary" data-pitch-original-summary>
      <label class="player-form-label pitch-editor-label" for="${escapeAttribute(inputId)}">オリ変球種名</label>
      <input
        id="${escapeAttribute(inputId)}"
        type="text"
        value="${escapeAttribute(originalPitch?.original_pitch_name ?? "")}"
        data-pitch-original-shared-name
        placeholder="${isSelected ? "例: スイーパー" : "固有名ありを選択すると入力できます"}"
        ${isSelected ? "" : "disabled"}
      >
      <p class="player-form-help pitch-editor-original-help" data-pitch-original-summary-help>
        ${isSelected ? "選択中の固有名ありスロットに保存されます。" : "固有名ありを選ぶと入力できます。"}
      </p>
    </div>
  `;
}

function renderPitchDirectionEditor(direction, pitches, relationOptions, { idPrefix, throwingHand = "" }) {
  const directionPitches = Array.isArray(pitches) ? pitches : [];
  const maxVisibleSlots = getPitchEditorMaxSlots(direction.key);
  const visiblePitches = directionPitches.slice(0, maxVisibleSlots);
  const preservedPitches = directionPitches.slice(maxVisibleSlots);
  const slotCount = visiblePitches.length;
  const slots = visiblePitches.map((pitch, index) =>
    renderPitchEditorSlot(pitch ?? {}, relationOptions, {
      idPrefix,
      direction,
      slotIndex: index,
      throwingHand,
    })
  ).join("");
  const preservedSlots = preservedPitches.map((pitch) => renderPitchPreservedRow(pitch)).join("");
  const canAdd = slotCount < maxVisibleSlots && preservedPitches.length === 0;

  return `
    <section
      class="pitch-editor-direction pitch-editor-direction--${escapeAttribute(direction.key)}"
      data-pitch-direction-section="${escapeAttribute(direction.key)}"
      data-pitch-next-slot-index="${escapeAttribute(slotCount)}"
      data-pitch-slot-count="${escapeAttribute(slotCount)}"
      data-pitch-preserved-count="${escapeAttribute(preservedPitches.length)}"
    >
      <div class="pitch-editor-direction-header">
        <span class="pitch-editor-direction-label">${escapeHtml(direction.label)}</span>
      </div>
      <div class="pitch-editor-direction-slots" data-pitch-direction-slots>${slots}</div>
      ${preservedSlots}
      <button type="button" class="pitch-editor-add" data-pitch-direction-add="${escapeAttribute(direction.key)}" ${canAdd ? "" : "hidden"}>
        ${getPitchEditorAddLabel(direction.key, slotCount)}
      </button>
    </section>
  `;
}

function renderPitchEditor({ pitchTypes = [], relationOptions, editorIdPrefix = "player-relations", throwingHand = "" }) {
  const safePitchTypes = normalizePitchEditorOriginalState(Array.isArray(pitchTypes) ? pitchTypes : []);
  const originalPitch = getFirstOriginalPitch(safePitchTypes);
  const editablePitchTypes = safePitchTypes.filter(
    (pitch) =>
      !isStraightPitchName(pitch?.pitch_name) &&
      !isPitchEditExcludedPitchName(pitch?.pitch_name)
  );
  const preservedPitchTypes = safePitchTypes.filter(
    (pitch) =>
      isStraightPitchName(pitch?.pitch_name) ||
      isPitchEditExcludedPitchName(pitch?.pitch_name)
  );
  const groupedPitches = groupPitchesByDirection(editablePitchTypes, throwingHand);

  return `
    <div
      class="player-relation-editor player-pitch-editor"
      data-relation-editor="pitches"
      data-editor-prefix="${escapeAttribute(editorIdPrefix)}"
    >
      <div class="player-relation-editor-header">
        <div class="player-relation-editor-copy">
          <h3 class="player-relation-editor-title">変化球</h3>
          <p class="player-relation-editor-description">必要な方向だけ追加し、方向ごとの球種候補と変化量をメーターで編集します。</p>
        </div>
      </div>
      ${preservedPitchTypes.map((pitch) => renderPitchPreservedRow(pitch)).join("")}
      <div class="pitch-editor-scroll">
        <div class="pitch-editor-grid">
          <div class="pitch-editor-center" aria-hidden="true">
            <span class="pitch-editor-ball"></span>
          </div>
          ${PITCH_MOVEMENT_DIRECTIONS.map((direction) =>
            renderPitchDirectionEditor(direction, groupedPitches[direction.key], relationOptions, {
              idPrefix: editorIdPrefix,
              throwingHand,
            })
          ).join("")}
        </div>
      </div>
      ${renderPitchOriginalSharedField({ editorIdPrefix, originalPitch })}
    </div>
  `;
}

function renderSubPositionRow(item, relationOptions, { idPrefix, rowKey, mainPosition = "" }) {
  const positionId = `${idPrefix}-sub-position-${rowKey}`;
  const suitabilityId = `${idPrefix}-sub-position-suitability-${rowKey}`;
  const positionOptions = buildSubPositionSelectOptions(
    relationOptions.subPositionOptions,
    mainPosition,
    item.position_name
  );

  return `
    <div class="player-relation-row" data-relation-row="sub_positions">
      <div class="player-relation-row-grid player-relation-row-grid--sub-position">
        <div class="player-relation-field">
          <label class="player-form-label player-relation-label" for="${escapeAttribute(positionId)}">ポジション</label>
          <select id="${escapeAttribute(positionId)}" data-sub-position-name>
            ${renderStringOptions(positionOptions, item.position_name, "ポジションを選択")}
          </select>
        </div>
        <div class="player-relation-field">
          <label class="player-form-label player-relation-label" for="${escapeAttribute(suitabilityId)}">適性</label>
          <input
            id="${escapeAttribute(suitabilityId)}"
            type="text"
            value="${escapeAttribute(item.suitability_value ?? "")}"
            list="${escapeAttribute(idPrefix)}-sub-position-suitability"
            data-sub-position-suitability
            placeholder="例: D"
          >
        </div>
      </div>
      <p class="player-form-help player-relation-warning" data-sub-position-warning hidden>メインポジションと同じ値は保存できません。</p>
      <div class="player-relation-row-actions">
        <button type="button" class="player-button player-button-secondary player-button-inline" data-relation-remove>削除</button>
      </div>
    </div>
  `;
}

function buildSubPositionSelectOptions(positionOptions, mainPosition, selectedValue = "") {
  const normalizedMainPosition = String(mainPosition ?? "").trim();
  const normalizedSelectedValue = String(selectedValue ?? "").trim();

  return positionOptions.filter((option) => option !== normalizedMainPosition || option === normalizedSelectedValue);
}

function renderRelationEditorShell({
  editorKey,
  title,
  description,
  rowsHtml,
  addLabel,
  datalistHtml = "",
  editorIdPrefix,
  extraAttributes = {},
}) {
  const attributes = Object.entries({
    "data-relation-editor": editorKey,
    "data-editor-prefix": editorIdPrefix,
    ...extraAttributes,
  })
    .map(([key, value]) => `${key}="${escapeAttribute(value)}"`)
    .join(" ");

  const hasRows = Boolean(rowsHtml.trim());

  return `
    <div class="player-relation-editor" ${attributes}>
      <div class="player-relation-editor-header">
        <div class="player-relation-editor-copy">
          <h3 class="player-relation-editor-title">${title}</h3>
          <p class="player-relation-editor-description">${description}</p>
        </div>
        <button type="button" class="player-button player-button-secondary player-button-inline" data-relation-add="${escapeAttribute(
          editorKey
        )}">
          追加
        </button>
      </div>
      ${datalistHtml}
      <div class="player-relation-editor-list" data-relation-list>
        ${rowsHtml}
      </div>
      <p class="player-empty-text player-relation-empty" data-relation-empty ${hasRows ? "hidden" : ""}>
        まだ登録がありません。「${addLabel}」から追加できます。
      </p>
    </div>
  `;
}

export function renderSpecialAbilityEditor({
  abilities = [],
  relationOptions,
  editorIdPrefix = "player-relations",
}) {
  const normalizedOptions = normalizeRelationOptions(relationOptions);
  const safeAbilities = Array.isArray(abilities) ? abilities : [];
  const rowsHtml = safeAbilities
    .map((item, index) =>
      renderSpecialAbilityRow(item, normalizedOptions, { idPrefix: editorIdPrefix, rowKey: index })
    )
    .join("");

  return renderRelationEditorShell({
    editorKey: "special",
    title: "特殊能力",
    description: "候補から選択しつつ、辞書にない能力名は直接入力でも追加できます。",
    rowsHtml,
    addLabel: "特殊能力を追加",
    datalistHtml: renderDatalist(
      `${editorIdPrefix}-special-abilities`,
      normalizedOptions.specialAbilitySuggestions
    ),
    editorIdPrefix,
    extraAttributes: {
      "data-next-row-index": safeAbilities.length,
    },
  });
}

export function renderPitchTypeEditor({
  pitchTypes = [],
  relationOptions,
  editorIdPrefix = "player-relations",
  throwingHand = "",
}) {
  const normalizedOptions = normalizeRelationOptions(relationOptions);
  const safePitchTypes = Array.isArray(pitchTypes) ? pitchTypes : [];

  return renderPitchEditor({
    pitchTypes: safePitchTypes,
    relationOptions: normalizedOptions,
    editorIdPrefix,
    throwingHand,
  });
}

export function renderSubPositionEditor({
  subPositions = [],
  relationOptions,
  editorIdPrefix = "player-relations",
  mainPosition = "",
}) {
  const normalizedOptions = normalizeRelationOptions(relationOptions);
  const safeSubPositions = Array.isArray(subPositions) ? subPositions : [];
  const rowsHtml = safeSubPositions
    .map((item, index) =>
      renderSubPositionRow(item, normalizedOptions, {
        idPrefix: editorIdPrefix,
        rowKey: index,
        mainPosition,
      })
    )
    .join("");

  return renderRelationEditorShell({
    editorKey: "sub_positions",
    title: "サブポジション",
    description: "メインポジション以外の守備位置と適性値を登録します。",
    rowsHtml,
    addLabel: "サブポジションを追加",
    datalistHtml: renderDatalist(
      `${editorIdPrefix}-sub-position-suitability`,
      normalizedOptions.subPositionSuitabilitySuggestions
    ),
    editorIdPrefix,
    extraAttributes: {
      "data-next-row-index": safeSubPositions.length,
      "data-main-position": mainPosition,
    },
  });
}

function nextRowKey(editor) {
  const currentValue = Number(editor.dataset.nextRowIndex ?? 0);
  const nextValue = Number.isFinite(currentValue) ? currentValue : 0;
  editor.dataset.nextRowIndex = String(nextValue + 1);
  return nextValue;
}

function toggleEmptyState(editor) {
  const emptyState = editor.querySelector("[data-relation-empty]");
  const rows = editor.querySelectorAll("[data-relation-row]");

  if (emptyState) {
    emptyState.hidden = rows.length > 0;
  }
}

function syncSpecialAbilityRow(row, relationOptions) {
  const categorySelect = row.querySelector("[data-special-ability-category]");
  const rankField = row.querySelector("[data-special-ability-rank-field]");
  const rankSelect = row.querySelector("[data-special-ability-rank]");
  const usesRank = categoryUsesRank(relationOptions.specialAbilityCategories, categorySelect?.value ?? "");

  if (rankField) {
    rankField.hidden = !usesRank;
  }

  if (!usesRank && rankSelect) {
    rankSelect.value = "";
  }
}

function syncPitchTypeRow(row) {
  const checkbox = row.querySelector("[data-pitch-original]");
  const originalNameInput = row.querySelector("[data-pitch-original-name]");
  const pitchNameInput = row.querySelector("[data-pitch-name]");
  const levelInput = row.querySelector("[data-pitch-level]");
  const levelReadout = row.querySelector("[data-pitch-level-readout]");
  const meter = row.querySelector("[data-pitch-editor-meter]");
  const isOriginal = checkbox?.checked ?? false;
  const isStraight = isStraightPitchName(pitchNameInput?.value ?? "");
  const isFixedLevel = isStraight || row.dataset.pitchDirection === "top";

  if (!isOriginal && originalNameInput) {
    originalNameInput.value = "";
  }

  if (row.hasAttribute("data-pitch-editor-slot")) {
    const nextLevel = isFixedLevel ? 1 : normalizePitchLevel(levelInput?.value);
    row.dataset.pitchBaseline = isFixedLevel ? "true" : "false";

    if (levelInput) {
      levelInput.value = String(nextLevel);
    }

    if (levelReadout) {
      levelReadout.textContent = String(nextLevel);
    }

    if (meter) {
      meter.dataset.pitchBaseline = isFixedLevel ? "true" : "false";
      meter.querySelectorAll("[data-pitch-level-choice]").forEach((button) => {
        const value = Number(button.dataset.pitchLevelChoice);
        const isActive = value <= nextLevel;
        button.classList.toggle("is-active", isActive);
        button.toggleAttribute("aria-current", value === nextLevel);
        button.disabled = isFixedLevel && value > 1;
      });
    }
  }
}

function syncPitchOriginalSummary(editor, { preferSharedValue = false } = {}) {
  if (!editor) {
    return;
  }

  const sharedInput = editor.querySelector("[data-pitch-original-shared-name]");
  const sharedHelp = editor.querySelector("[data-pitch-original-summary-help]");
  const rows = Array.from(editor.querySelectorAll('[data-relation-row="pitches"]'));
  let selectedRow = null;

  rows.forEach((row) => {
    const checkbox = row.querySelector("[data-pitch-original]");

    if (!checkbox?.checked) {
      return;
    }

    if (!selectedRow) {
      selectedRow = row;
      return;
    }

    checkbox.checked = false;
    syncPitchTypeRow(row);
  });

  if (!sharedInput) {
    return;
  }

  if (!selectedRow) {
    sharedInput.value = "";
    sharedInput.disabled = true;
    sharedInput.placeholder = "固有名ありを選択すると入力できます";
    editor.dataset.pitchOriginalSelected = "false";

    if (sharedHelp) {
      sharedHelp.textContent = "固有名ありを選ぶと入力できます。";
    }

    rows.forEach((row) => {
      const originalNameInput = row.querySelector("[data-pitch-original-name]");
      if (originalNameInput) {
        originalNameInput.value = "";
      }
    });
    return;
  }

  const selectedOriginalNameInput = selectedRow.querySelector("[data-pitch-original-name]");
  const nextOriginalName = preferSharedValue
    ? sharedInput.value
    : selectedOriginalNameInput?.value || sharedInput.value;

  sharedInput.disabled = false;
  sharedInput.placeholder = "例: スイーパー";
  sharedInput.value = nextOriginalName;
  editor.dataset.pitchOriginalSelected = "true";

  if (sharedHelp) {
    sharedHelp.textContent = "選択中の固有名ありスロットに保存されます。";
  }

  rows.forEach((row) => {
    const checkbox = row.querySelector("[data-pitch-original]");
    const originalNameInput = row.querySelector("[data-pitch-original-name]");
    const isSelected = row === selectedRow;

    if (checkbox && !isSelected) {
      checkbox.checked = false;
    }

    if (originalNameInput) {
      originalNameInput.value = isSelected ? sharedInput.value : "";
    }
  });
}

function syncPitchOriginalCheckbox(checkbox) {
  const editor = checkbox?.closest('[data-relation-editor="pitches"]');
  const row = checkbox?.closest('[data-relation-row="pitches"]');

  if (!editor || !row) {
    return;
  }

  if (checkbox.checked) {
    editor.querySelectorAll("[data-pitch-original]").forEach((candidate) => {
      if (candidate !== checkbox && candidate.checked) {
        candidate.checked = false;
        const candidateRow = candidate.closest('[data-relation-row="pitches"]');
        if (candidateRow) {
          syncPitchTypeRow(candidateRow);
        }
      }
    });
  }

  syncPitchTypeRow(row);
  syncPitchOriginalSummary(editor, { preferSharedValue: checkbox.checked });
}

function setPitchSlotLevel(row, level) {
  const levelInput = row.querySelector("[data-pitch-level]");
  const pitchNameInput = row.querySelector("[data-pitch-name]");
  const isStraight = isStraightPitchName(pitchNameInput?.value ?? "");
  const isFixedLevel = isStraight || row.dataset.pitchDirection === "top";
  const nextLevel = isFixedLevel ? 1 : normalizePitchLevel(level);

  if (levelInput) {
    levelInput.value = String(nextLevel);
  }

  syncPitchTypeRow(row);
}

function updatePitchDirectionAddButton(section) {
  if (!section) {
    return;
  }

  const slotCount = section.querySelectorAll("[data-pitch-editor-slot]").length;
  const preservedCount = section.querySelectorAll("[data-pitch-preserved-slot]").length;
  const addButton = section.querySelector("[data-pitch-direction-add]");
  const directionKey = section.dataset.pitchDirectionSection;
  const maxVisibleSlots = getPitchEditorMaxSlots(directionKey);
  const canAdd = slotCount < maxVisibleSlots && preservedCount === 0;
  section.dataset.pitchSlotCount = String(slotCount);
  section.dataset.pitchPreservedCount = String(preservedCount);

  if (addButton) {
    addButton.textContent = getPitchEditorAddLabel(directionKey, slotCount);
    addButton.hidden = !canAdd;
    addButton.disabled = !canAdd;
  }
}

function appendPitchDirectionSlot(section, relationOptions, throwingHand = "") {
  if (!section) {
    return null;
  }

  const slotCount = section.querySelectorAll("[data-pitch-editor-slot]").length;
  const preservedCount = section.querySelectorAll("[data-pitch-preserved-slot]").length;
  const directionKey = section.dataset.pitchDirectionSection;
  const maxVisibleSlots = getPitchEditorMaxSlots(directionKey);

  if (slotCount >= maxVisibleSlots || preservedCount > 0) {
    updatePitchDirectionAddButton(section);
    return null;
  }

  const direction = PITCH_MOVEMENT_DIRECTIONS.find((item) => item.key === directionKey);
  const slotsRoot = section.querySelector("[data-pitch-direction-slots]");
  const editor = section.closest('[data-relation-editor="pitches"]');

  if (!direction || !slotsRoot || !editor) {
    return null;
  }

  const idPrefix = editor.dataset.editorPrefix || "player-relations";
  const slotIndex = Number(section.dataset.pitchNextSlotIndex ?? 0);
  section.dataset.pitchNextSlotIndex = String(slotIndex + 1);
  slotsRoot.insertAdjacentHTML(
    "beforeend",
    renderPitchEditorSlot(
      { pitch_name: "", level: 1, is_original: 0, original_pitch_name: "" },
      relationOptions,
      { idPrefix, direction, slotIndex, throwingHand }
    )
  );

  const row = slotsRoot.lastElementChild;
  updatePitchDirectionAddButton(section);

  if (row) {
    syncPitchTypeRow(row);
    syncPitchOriginalSummary(editor, { preferSharedValue: true });
  }

  return row;
}

function syncPitchEditorSelectOptions(editor, relationOptions, throwingHand = "") {
  if (!editor) {
    return;
  }

  editor.querySelectorAll("[data-pitch-editor-slot]").forEach((row) => {
    const select = row.querySelector("[data-pitch-name]");
    const directionKey =
      row.closest("[data-pitch-direction-section]")?.dataset.pitchDirectionSection ??
      row.dataset.pitchDirection ??
      "";

    if (!select || !directionKey) {
      return;
    }

    const selectedValue = select.value;
    select.innerHTML = buildPitchSelectOptions(
      getPitchOptionsForDirection(directionKey, relationOptions, throwingHand, selectedValue),
      selectedValue
    );
    syncPitchTypeRow(row);
  });
  syncPitchOriginalSummary(editor, { preferSharedValue: true });
}

function removePitchEditorSlot(row) {
  const section = row?.closest("[data-pitch-direction-section]");

  row?.remove();

  if (section) {
    updatePitchDirectionAddButton(section);
  }
}

function clearPitchSlot(row) {
  if (row?.hasAttribute("data-pitch-editor-slot")) {
    removePitchEditorSlot(row);
    return;
  }

  const pitchNameInput = row.querySelector("[data-pitch-name]");
  const levelInput = row.querySelector("[data-pitch-level]");
  const originalCheckbox = row.querySelector("[data-pitch-original]");
  const originalNameInput = row.querySelector("[data-pitch-original-name]");

  if (pitchNameInput) {
    pitchNameInput.value = "";
  }

  if (levelInput) {
    levelInput.value = "1";
  }

  if (originalCheckbox) {
    originalCheckbox.checked = false;
  }

  if (originalNameInput) {
    originalNameInput.value = "";
  }

  syncPitchTypeRow(row);
}

function syncSubPositionRow(row, relationOptions, mainPosition = "") {
  const positionSelect = row.querySelector("[data-sub-position-name]");
  const warning = row.querySelector("[data-sub-position-warning]");

  if (!positionSelect) {
    return;
  }

  const currentValue = positionSelect.value;
  const nextOptions = buildSubPositionSelectOptions(
    relationOptions.subPositionOptions,
    mainPosition,
    currentValue
  );
  positionSelect.innerHTML = renderStringOptions(nextOptions, currentValue, "ポジションを選択");

  const isInvalid = Boolean(currentValue && mainPosition && currentValue === mainPosition);
  row.dataset.invalidMainPosition = isInvalid ? "true" : "false";

  if (warning) {
    warning.hidden = !isInvalid;
  }
}

function syncSubPositionEditor(editor, relationOptions, mainPosition = "") {
  editor.dataset.mainPosition = mainPosition ?? "";
  editor.querySelectorAll('[data-relation-row="sub_positions"]').forEach((row) => {
    syncSubPositionRow(row, relationOptions, mainPosition);
  });
}

function appendRow(editor, rowHtml) {
  const list = editor.querySelector("[data-relation-list]");

  if (!list) {
    return null;
  }

  list.insertAdjacentHTML("beforeend", rowHtml);
  const row = list.lastElementChild;
  toggleEmptyState(editor);
  return row;
}

function createRowForEditor(editor, relationOptions, mainPosition = "") {
  const editorKey = editor.dataset.relationEditor;
  const idPrefix = editor.dataset.editorPrefix || "player-relations";
  const rowKey = nextRowKey(editor);

  if (editorKey === "special") {
    return renderSpecialAbilityRow(
      { ability_name: "", ability_category: "", rank_value: "" },
      relationOptions,
      { idPrefix, rowKey }
    );
  }

  if (editorKey === "pitches") {
    return renderPitchTypeRow(
      { pitch_name: "", level: 1, is_original: 0, original_pitch_name: "" },
      relationOptions,
      { idPrefix, rowKey }
    );
  }

  if (editorKey === "sub_positions") {
    return renderSubPositionRow(
      { position_name: "", suitability_value: "" },
      relationOptions,
      { idPrefix, rowKey, mainPosition }
    );
  }

  return "";
}

export function bindRelationEditors(
  root,
  relationOptions,
  { getMainPosition = () => "", getThrowingHand = () => "" } = {}
) {
  if (!root) {
    return;
  }

  const normalizedOptions = normalizeRelationOptions(relationOptions);
  const syncMainPositionSensitiveEditors = () => {
    const mainPosition = String(getMainPosition?.() ?? "").trim();
    root.querySelectorAll('[data-relation-editor="sub_positions"]').forEach((editor) => {
      syncSubPositionEditor(editor, normalizedOptions, mainPosition);
    });
  };

  root.addEventListener("click", (event) => {
    const pitchLevelButton = event.target.closest("[data-pitch-level-choice]");

    if (pitchLevelButton && root.contains(pitchLevelButton)) {
      event.preventDefault();
      const row = pitchLevelButton.closest('[data-relation-row="pitches"]');

      if (row) {
        setPitchSlotLevel(row, pitchLevelButton.dataset.pitchLevelChoice);
      }

      return;
    }

    const pitchClearButton = event.target.closest("[data-pitch-slot-clear]");

    if (pitchClearButton && root.contains(pitchClearButton)) {
      event.preventDefault();
      const row = pitchClearButton.closest('[data-relation-row="pitches"]');
      const editor = pitchClearButton.closest('[data-relation-editor="pitches"]');

      if (row) {
        clearPitchSlot(row);
      }

      syncPitchOriginalSummary(editor, { preferSharedValue: true });

      return;
    }

    const directionAddButton = event.target.closest("[data-pitch-direction-add]");

    if (directionAddButton && root.contains(directionAddButton)) {
      event.preventDefault();
      const section = directionAddButton.closest("[data-pitch-direction-section]");
      const row = appendPitchDirectionSlot(section, normalizedOptions, getThrowingHand?.());
      const firstInput = row?.querySelector("select, input, textarea");

      if (firstInput instanceof HTMLElement) {
        firstInput.focus();
      }

      return;
    }

    const removeButton = event.target.closest("[data-relation-remove]");

    if (removeButton && root.contains(removeButton)) {
      event.preventDefault();
      const row = removeButton.closest("[data-relation-row]");
      const editor = removeButton.closest("[data-relation-editor]");

      if (row && editor) {
        row.remove();
        toggleEmptyState(editor);
        if (editor.dataset.relationEditor === "sub_positions") {
          syncMainPositionSensitiveEditors();
        } else if (editor.dataset.relationEditor === "pitches") {
          syncPitchOriginalSummary(editor, { preferSharedValue: true });
        }
      }

      return;
    }

    const addButton = event.target.closest("[data-relation-add]");

    if (!addButton || !root.contains(addButton)) {
      return;
    }

    event.preventDefault();
    const editor = addButton.closest("[data-relation-editor]");

    if (!editor) {
      return;
    }

    const rowHtml = createRowForEditor(editor, normalizedOptions, getMainPosition?.());
    const row = appendRow(editor, rowHtml);

    if (!row) {
      return;
    }

    if (editor.dataset.relationEditor === "special") {
      syncSpecialAbilityRow(row, normalizedOptions);
    } else if (editor.dataset.relationEditor === "pitches") {
      syncPitchTypeRow(row);
      syncPitchOriginalSummary(editor, { preferSharedValue: true });
    } else if (editor.dataset.relationEditor === "sub_positions") {
      syncSubPositionRow(row, normalizedOptions, getMainPosition?.());
    }

    const firstInput = row.querySelector("input, select, textarea");
    if (firstInput instanceof HTMLElement) {
      firstInput.focus();
    }
  });

  root.addEventListener("change", (event) => {
    const categorySelect = event.target.closest("[data-special-ability-category]");

    if (categorySelect) {
      const row = categorySelect.closest('[data-relation-row="special"]');
      if (row) {
        syncSpecialAbilityRow(row, normalizedOptions);
      }
    }

    const pitchOriginalCheckbox = event.target.closest("[data-pitch-original]");

    if (pitchOriginalCheckbox) {
      syncPitchOriginalCheckbox(pitchOriginalCheckbox);
    }

    const pitchNameInput = event.target.closest("[data-pitch-name]");

    if (pitchNameInput) {
      const row = pitchNameInput.closest('[data-relation-row="pitches"]');
      if (row) {
        syncPitchTypeRow(row);
      }
    }

    if (event.target.id === "throwing_hand") {
      root.querySelectorAll('[data-relation-editor="pitches"]').forEach((editor) => {
        syncPitchEditorSelectOptions(editor, normalizedOptions, getThrowingHand?.());
      });
    }

    if (event.target.id === "main_position" || event.target.closest("[data-sub-position-name]")) {
      syncMainPositionSensitiveEditors();
    }
  });

  root.addEventListener("input", (event) => {
    const originalNameInput = event.target.closest("[data-pitch-original-shared-name]");

    if (!originalNameInput) {
      return;
    }

    syncPitchOriginalSummary(originalNameInput.closest('[data-relation-editor="pitches"]'), {
      preferSharedValue: true,
    });
  });

  root.querySelectorAll('[data-relation-editor="special"] [data-relation-row="special"]').forEach((row) => {
    syncSpecialAbilityRow(row, normalizedOptions);
  });
  root.querySelectorAll('[data-relation-editor="pitches"] [data-relation-row="pitches"]').forEach((row) => {
    syncPitchTypeRow(row);
  });
  root.querySelectorAll('[data-relation-editor="pitches"]').forEach((editor) => {
    syncPitchOriginalSummary(editor);
  });
  root.querySelectorAll("[data-pitch-direction-section]").forEach((section) => {
    updatePitchDirectionAddButton(section);
  });
  syncMainPositionSensitiveEditors();
  root.querySelectorAll("[data-relation-editor]").forEach((editor) => toggleEmptyState(editor));
}

function trimInputValue(element) {
  return String(element?.value ?? "").trim();
}

function isBlankRow(values) {
  return values.every((value) => String(value ?? "").trim() === "");
}

function serializeSpecialAbilities(root, relationOptions) {
  const normalizedOptions = normalizeRelationOptions(relationOptions);

  return Array.from(root.querySelectorAll('[data-relation-editor="special"] [data-relation-row="special"]'))
    .map((row, index) => {
      const abilityName = trimInputValue(row.querySelector("[data-special-ability-name]"));
      const abilityCategory = trimInputValue(row.querySelector("[data-special-ability-category]"));
      const rankValue = trimInputValue(row.querySelector("[data-special-ability-rank]"));

      if (isBlankRow([abilityName, abilityCategory, rankValue])) {
        return null;
      }

      if (!abilityName) {
        throw new Error(`特殊能力 ${index + 1}件目の能力名を入力してください。`);
      }

      if (!abilityCategory) {
        throw new Error(`特殊能力 ${index + 1}件目の系統を選択してください。`);
      }

      if (categoryUsesRank(normalizedOptions.specialAbilityCategories, abilityCategory) && !rankValue) {
        throw new Error(`特殊能力 ${index + 1}件目のランクを選択してください。`);
      }

      return {
        ability_name: abilityName,
        ability_category: abilityCategory,
        rank_value: categoryUsesRank(normalizedOptions.specialAbilityCategories, abilityCategory)
          ? rankValue
          : null,
      };
    })
    .filter(Boolean);
}

function serializePitchTypes(root) {
  root.querySelectorAll('[data-relation-editor="pitches"]').forEach((editor) => {
    syncPitchOriginalSummary(editor, { preferSharedValue: true });
  });

  let originalTaken = false;

  return Array.from(root.querySelectorAll('[data-relation-editor="pitches"] [data-relation-row="pitches"]'))
    .map((row, index) => {
      const pitchName = trimInputValue(row.querySelector("[data-pitch-name]"));
      const levelText = trimInputValue(row.querySelector("[data-pitch-level]"));
      const originalCheckbox = row.querySelector("[data-pitch-original]");
      const isCheckedOriginal = originalCheckbox?.checked ?? false;
      const isOriginal = isCheckedOriginal && !originalTaken ? 1 : 0;
      const originalPitchName = isOriginal
        ? trimInputValue(row.querySelector("[data-pitch-original-name]"))
        : "";

      if (isCheckedOriginal && originalTaken && originalCheckbox) {
        originalCheckbox.checked = false;
      }

      if (!pitchName && !originalPitchName && isOriginal === 0) {
        return null;
      }

      if (!pitchName) {
        throw new Error(`変化球 ${index + 1}件目の球種名を入力してください。`);
      }

      const level =
        isStraightPitchName(pitchName) || row.dataset.pitchDirection === "top"
          ? 1
          : Number(levelText);

      if (!Number.isInteger(level) || level < 1 || level > PITCH_METER_MAX_LEVEL) {
        throw new Error(`変化球 ${index + 1}件目の変化量は 1〜${PITCH_METER_MAX_LEVEL} の整数で入力してください。`);
      }

      if (isOriginal && !originalPitchName) {
        throw new Error(`変化球 ${index + 1}件目のオリジナル球種名を入力してください。`);
      }

      if (isOriginal) {
        originalTaken = true;
      }

      return {
        pitch_name: pitchName,
        level,
        is_original: isOriginal,
        original_pitch_name: isOriginal ? originalPitchName : null,
      };
    })
    .filter(Boolean);
}

function serializeSubPositions(root, mainPosition) {
  const normalizedMainPosition = String(mainPosition ?? "").trim();
  const seen = new Set();

  return Array.from(
    root.querySelectorAll('[data-relation-editor="sub_positions"] [data-relation-row="sub_positions"]')
  )
    .map((row, index) => {
      const positionName = trimInputValue(row.querySelector("[data-sub-position-name]"));
      const suitabilityValue = trimInputValue(row.querySelector("[data-sub-position-suitability]"));

      if (isBlankRow([positionName, suitabilityValue])) {
        return null;
      }

      if (!positionName) {
        throw new Error(`サブポジション ${index + 1}件目の守備位置を選択してください。`);
      }

      if (!suitabilityValue) {
        throw new Error(`サブポジション ${index + 1}件目の適性を入力してください。`);
      }

      if (normalizedMainPosition && positionName === normalizedMainPosition) {
        throw new Error("メインポジションと同じ値はサブポジションに保存できません。");
      }

      if (seen.has(positionName)) {
        throw new Error(`サブポジション「${positionName}」が重複しています。`);
      }

      seen.add(positionName);

      return {
        position_name: positionName,
        suitability_value: suitabilityValue,
      };
    })
    .filter(Boolean);
}

export function serializeRelationInputs(
  root,
  relationOptions,
  { includePitchTypes = true, mainPosition = "" } = {}
) {
  const payload = {
    special_abilities: serializeSpecialAbilities(root, relationOptions),
    sub_positions: serializeSubPositions(root, mainPosition),
  };

  if (includePitchTypes) {
    payload.pitch_types = serializePitchTypes(root);
  }

  return payload;
}
