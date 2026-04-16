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

function buildAttributeString(attributes) {
  return Object.entries(attributes)
    .filter(([, value]) => value !== undefined && value !== null && value !== false && value !== "")
    .map(([key, value]) => (value === true ? key : `${key}="${escapeAttribute(value)}"`))
    .join(" ");
}

function isPitcherMainPosition(value) {
  return value === "投手";
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

function renderTextInputRow({ field, label, value, required = false }) {
  const inputAttributes = buildAttributeString({
    id: field,
    name: field,
    type: "text",
    value: value ?? "",
    required,
  });

  return `
    <div class="player-form-row" data-field="${field}">
      <label class="player-form-label" for="${field}">${label}</label>
      <div class="player-form-control">
        <input ${inputAttributes}>
      </div>
    </div>
  `;
}

function renderSelectRow({ field, label, options, value, required = false, grouped = false }) {
  const selectAttributes = buildAttributeString({
    id: field,
    name: field,
    required,
  });

  const optionHtml = grouped ? buildGroupedOptions(options, value) : buildOptions(options, value);

  return `
    <div class="player-form-row" data-field="${field}">
      <label class="player-form-label" for="${field}">${label}</label>
      <div class="player-form-control">
        <select ${selectAttributes}>
          ${optionHtml}
        </select>
      </div>
    </div>
  `;
}

function renderYearRow(value) {
  return `
    <div class="player-form-row" data-field="admission_year">
      <span class="player-form-label">入学年</span>
      <div class="player-form-control player-form-control--year">
        ${buildAdmissionYearPicker({ selectedYear: value })}
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

function syncPitcherSectionVisibility(form) {
  const positionSelect = form.querySelector("#main_position");
  const pitcherSection = form.querySelector('[data-edit-section="pitcher"]');

  if (!positionSelect || !pitcherSection) {
    return;
  }

  const applyVisibility = () => {
    const shouldShowPitcherSection = isPitcherMainPosition(positionSelect.value);
    pitcherSection.hidden = !shouldShowPitcherSection;
    pitcherSection.setAttribute("aria-hidden", shouldShowPitcherSection ? "false" : "true");

    pitcherSection
      .querySelectorAll("input, select, textarea, button")
      .forEach((control) => {
        control.disabled = !shouldShowPitcherSection;
      });
  };

  positionSelect.addEventListener("change", applyVisibility);
  applyVisibility();
}

function renderForm(form, player) {
  const basicSection = renderFormSection({
    id: "player-edit-section-basic",
    sectionKey: "basic",
    title: "基本情報",
    description: "識別情報とスナップショット単位の基本項目を編集します。",
    content: [
      renderTextInputRow({ field: "name", label: "名前", value: player.name, required: true }),
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
      renderYearRow(player.admission_year),
      renderSelectRow({
        field: "snapshot_label",
        label: "スナップショット種別",
        options: SNAPSHOT_LABEL_OPTIONS,
        value: player.snapshot_label,
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

  form.innerHTML = `
    ${basicSection}
    ${pitcherSection}
    ${batterSection}

    <div class="player-form-actions">
      <button type="submit" class="player-button player-button-primary">選手情報を保存</button>
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

function buildPayload(formData) {
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

  [
    "velocity",
    "control",
    "stamina",
    "trajectory",
    "meat",
    "power",
    "run_speed",
    "arm_strength",
    "fielding",
    "catching",
  ].forEach((field) => {
    appendOptionalIntegerPayload(payload, formData, field);
  });

  return payload;
}

async function handleSubmit(event, player, messageElement) {
  event.preventDefault();

  const formData = new FormData(event.currentTarget);
  const payload = buildPayload(formData);

  try {
    setMessage(messageElement, "保存しています...");
    await updatePlayer(player.id, payload);
    setMessage(messageElement, "保存しました。詳細画面へ戻ります。");
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
      title: "選手情報編集",
      context: `${player.name} の基本情報と能力値を編集します。relation 系は次段で拡張します。`,
      documentTitle: `${player.name} | 選手情報編集`,
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
    setupRankedAbilityInputs(form);
    syncPitcherSectionVisibility(form);
    form.addEventListener("submit", (event) => handleSubmit(event, player, messageElement));
  } catch (error) {
    setPageHeader(titleElement, contextElement, {
      title: "選手情報編集",
      context: "選手情報を取得できませんでした。",
      documentTitle: "選手情報編集",
    });
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

export { buildPayload, getAbilityRankForValue, isPitcherMainPosition };
