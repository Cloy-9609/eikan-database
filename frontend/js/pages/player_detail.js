import { fetchPlayerById } from "../api/playerApi.js";

import { formatSchoolName } from "../utils/formatter.js";

const PLAYER_TYPE_LABELS = {
  normal: "通常",
  genius: "天才",
  reincarnated: "転生",
};

const SNAPSHOT_LABELS = {
  entrance: "入学時",
  post_tournament: "大会後",
};

const HAND_LABELS = {
  right: "右",
  left: "左",
  both: "両",
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
  return HAND_LABELS[value] ?? value ?? "";
}

function formatThrowBat(player) {
  const throwing = formatHand(player.throwing_hand);
  const batting = formatHand(player.batting_hand);

  if (!throwing && !batting) {
    return "なし";
  }

  return escapeHtml(`${throwing || "-"}/${batting || "-"}`);
}

function renderDetailCard({ title, sectionKey, content, bodyClass = "" }) {
  const safeSectionKey = sectionKey ? escapeHtml(sectionKey) : "";
  const bodyClassName = bodyClass ? `detail-card-body ${bodyClass}` : "detail-card-body";

  return `
    <section class="detail-card" data-detail-section="${safeSectionKey}">
      <div class="detail-card-header">
        <h2 class="detail-title">${title}</h2>
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

function renderListSection(title, items, formatter) {
  const content = Array.isArray(items) && items.length > 0
    ? `<ul class="detail-list">${items.map((item) => `<li>${formatter(item)}</li>`).join("")}</ul>`
    : '<p class="empty-value">なし</p>';

  return renderDetailCard({
    title,
    sectionKey: title,
    content,
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

function renderError(root, messageElement, titleElement, contextElement, actionsElement, message) {
  titleElement.textContent = "選手詳細";
  contextElement.textContent = "選手情報を取得できませんでした。";
  renderActions(actionsElement, [
    { href: "./schools.html", label: "学校一覧へ戻る", primary: false },
  ]);
  setMessage(messageElement, message, true);

  root.innerHTML = `
    <section class="detail-card">
      <div class="player-empty-state">
        <p class="player-empty-text">学校一覧から選手を選び直してください。</p>
        <a class="player-button player-button-secondary" href="./schools.html">学校一覧へ戻る</a>
      </div>
    </section>
  `;
}

function renderPlayer(root, messageElement, titleElement, contextElement, actionsElement, player) {
  const archivedSchool = isArchivedSchool(player);
  const schoolNameText = formatSchoolName(player.school_name, "不明");
  const schoolName = escapeHtml(formatSchoolName(player.school_name, "不明"));

  document.title = `${player.name} | 選手詳細`;
  titleElement.textContent = formatValue(player.name, "名称未設定");
  contextElement.textContent = archivedSchool
    ? `選手ID: ${escapeHtml(player.id)} / 削除済み学校の保持データ`
    : `選手ID: ${player.id} / 所属学校: ${schoolNameText}`;
  renderActions(
    actionsElement,
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
            label: "基本情報を編集",
            primary: true,
          },
        ]
  );
  setMessage(messageElement, "");

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
    { field: "control", label: "コントロール", valueHtml: formatValue(player.control) },
    { field: "stamina", label: "スタミナ", valueHtml: formatValue(player.stamina) },
  ]);

  const batterInfo = renderDefinitionRows([
    { field: "trajectory", label: "弾道", valueHtml: formatValue(player.trajectory) },
    { field: "meat", label: "ミート", valueHtml: formatValue(player.meat) },
    { field: "power", label: "パワー", valueHtml: formatValue(player.power) },
    { field: "run_speed", label: "走力", valueHtml: formatValue(player.run_speed) },
    { field: "arm_strength", label: "肩力", valueHtml: formatValue(player.arm_strength) },
    { field: "fielding", label: "守備", valueHtml: formatValue(player.fielding) },
    { field: "catching", label: "捕球", valueHtml: formatValue(player.catching) },
  ]);

  const pitchTypesSection = renderListSection("変化球一覧", player.pitch_types, (item) => {
    const pitchName = escapeHtml(item.pitch_name ?? "不明");
    const level = item.level !== undefined && item.level !== null ? ` Lv${escapeHtml(item.level)}` : "";
    const original = item.is_original ? " (オリジナル)" : "";
    const originalName = item.original_pitch_name
      ? ` / ${escapeHtml(item.original_pitch_name)}`
      : "";

    return `${pitchName}${level}${original}${originalName}`;
  });

  const specialAbilitiesSection = renderListSection(
    "特殊能力一覧",
    player.special_abilities,
    (item) => {
      const name = escapeHtml(item.ability_name ?? "不明");
      const rank = item.rank_value ? ` (${escapeHtml(item.rank_value)})` : "";
      const category = item.ability_category ? ` [${escapeHtml(item.ability_category)}]` : "";

      return `${name}${rank}${category}`;
    }
  );

  const subPositionsSection = renderListSection("サブポジ一覧", player.sub_positions, (item) => {
    const name = escapeHtml(item.position_name ?? "不明");
    const suitability = item.suitability_value ? ` (${escapeHtml(item.suitability_value)})` : "";

    return `${name}${suitability}`;
  });

  const archivedNotice = archivedSchool
    ? `
      <section class="detail-card">
        <div class="player-empty-state">
          <p class="player-empty-text">
            この選手は削除済み学校「${schoolName}」に所属していた保持データです。通常の一覧には表示されず、現時点では編集できません。
          </p>
        </div>
      </section>
    `
    : "";

  root.innerHTML = `
    ${archivedNotice}

    ${renderDetailCard({
      title: "基本情報",
      sectionKey: "basic",
      content: `
        <dl class="detail-grid detail-grid--basic" data-detail-grid="basic">
          ${basicInfo}
        </dl>
      `,
    })}

    ${renderDetailCard({
      title: "投手能力",
      sectionKey: "pitcher",
      content: `
        <dl class="detail-grid compact-grid" data-detail-grid="pitcher">
          ${pitcherInfo}
        </dl>
      `,
    })}

    ${renderDetailCard({
      title: "野手能力",
      sectionKey: "batter",
      content: `
        <dl class="detail-grid compact-grid" data-detail-grid="batter">
          ${batterInfo}
        </dl>
      `,
    })}

    ${pitchTypesSection}
    ${specialAbilitiesSection}
    ${subPositionsSection}
  `;
}

async function init() {
  const root = document.getElementById("player-detail-root");
  const messageElement = document.getElementById("player-detail-message");
  const titleElement = document.getElementById("player-detail-title");
  const contextElement = document.getElementById("player-detail-context");
  const actionsElement = document.getElementById("player-detail-actions");

  try {
    const playerId = getPlayerIdFromQuery();
    const player = await fetchPlayerById(playerId);
    renderPlayer(root, messageElement, titleElement, contextElement, actionsElement, player);
  } catch (error) {
    renderError(root, messageElement, titleElement, contextElement, actionsElement, error.message);
  }
}

init();
