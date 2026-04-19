const FALLBACK_RELATION_OPTIONS = {
  specialAbilityCategories: [
    { value: "pitcher_ranked", label: "投手青特（ランクあり）", usesRank: true },
    { value: "pitcher_unranked", label: "投手青特（一般）", usesRank: false },
    { value: "batter_ranked", label: "野手青特（ランクあり）", usesRank: true },
    { value: "batter_unranked", label: "野手青特（一般）", usesRank: false },
    { value: "green", label: "緑特", usesRank: false },
  ],
  specialAbilitySuggestions: [],
  pitchTypeSuggestions: [],
  subPositionOptions: ["投手", "捕手", "一塁手", "二塁手", "三塁手", "遊撃手", "外野手"],
  subPositionSuitabilitySuggestions: ["S", "A", "B", "C", "D", "E", "F", "G"],
};

const SPECIAL_ABILITY_RANK_OPTIONS = ["A", "B", "C", "D", "E", "F", "G"];

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
    pitchTypeSuggestions: normalizeStringArray(rawOptions.pitchTypeSuggestions),
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
  const pitchOriginalNameId = `${idPrefix}-pitch-original-name-${rowKey}`;
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
        </div>
        <div class="player-relation-field player-relation-field--full" data-pitch-original-field ${isOriginal ? "" : "hidden"}>
          <label class="player-form-label player-relation-label" for="${escapeAttribute(pitchOriginalNameId)}">オリジナル球種名</label>
          <input
            id="${escapeAttribute(pitchOriginalNameId)}"
            type="text"
            value="${escapeAttribute(item.original_pitch_name ?? "")}"
            data-pitch-original-name
            placeholder="例: スイーパー"
          >
        </div>
      </div>
      <div class="player-relation-row-actions">
        <button type="button" class="player-button player-button-secondary player-button-inline" data-relation-remove>削除</button>
      </div>
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
}) {
  const normalizedOptions = normalizeRelationOptions(relationOptions);
  const safePitchTypes = Array.isArray(pitchTypes) ? pitchTypes : [];
  const rowsHtml = safePitchTypes
    .map((item, index) =>
      renderPitchTypeRow(item, normalizedOptions, { idPrefix: editorIdPrefix, rowKey: index })
    )
    .join("");

  return renderRelationEditorShell({
    editorKey: "pitches",
    title: "変化球",
    description: "球種名と変化量を編集します。オリジナル球種は固有名も保存できます。",
    rowsHtml,
    addLabel: "球種を追加",
    datalistHtml: renderDatalist(`${editorIdPrefix}-pitch-types`, normalizedOptions.pitchTypeSuggestions),
    editorIdPrefix,
    extraAttributes: {
      "data-next-row-index": safePitchTypes.length,
    },
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
  const originalField = row.querySelector("[data-pitch-original-field]");
  const originalNameInput = row.querySelector("[data-pitch-original-name]");
  const isOriginal = checkbox?.checked ?? false;

  if (originalField) {
    originalField.hidden = !isOriginal;
  }

  if (!isOriginal && originalNameInput) {
    originalNameInput.value = "";
  }
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

export function bindRelationEditors(root, relationOptions, { getMainPosition = () => "" } = {}) {
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
      const row = pitchOriginalCheckbox.closest('[data-relation-row="pitches"]');
      if (row) {
        syncPitchTypeRow(row);
      }
    }

    if (event.target.id === "main_position" || event.target.closest("[data-sub-position-name]")) {
      syncMainPositionSensitiveEditors();
    }
  });

  root.querySelectorAll('[data-relation-editor="special"] [data-relation-row="special"]').forEach((row) => {
    syncSpecialAbilityRow(row, normalizedOptions);
  });
  root.querySelectorAll('[data-relation-editor="pitches"] [data-relation-row="pitches"]').forEach((row) => {
    syncPitchTypeRow(row);
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
  return Array.from(root.querySelectorAll('[data-relation-editor="pitches"] [data-relation-row="pitches"]'))
    .map((row, index) => {
      const pitchName = trimInputValue(row.querySelector("[data-pitch-name]"));
      const levelText = trimInputValue(row.querySelector("[data-pitch-level]"));
      const isOriginal = row.querySelector("[data-pitch-original]")?.checked ? 1 : 0;
      const originalPitchName = trimInputValue(row.querySelector("[data-pitch-original-name]"));

      if (isBlankRow([pitchName, levelText, originalPitchName]) && isOriginal === 0) {
        return null;
      }

      if (!pitchName) {
        throw new Error(`変化球 ${index + 1}件目の球種名を入力してください。`);
      }

      const level = Number(levelText);

      if (!Number.isInteger(level) || level < 1) {
        throw new Error(`変化球 ${index + 1}件目の変化量は 1 以上の整数で入力してください。`);
      }

      if (isOriginal && !originalPitchName) {
        throw new Error(`変化球 ${index + 1}件目のオリジナル球種名を入力してください。`);
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
