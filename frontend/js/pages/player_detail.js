import { fetchPlayerById } from "../api/playerApi.js";

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

function renderDefinitionRows(items) {
  return items
    .map(
      (item) => `
        <div class="detail-row">
          <dt>${item.label}</dt>
          <dd>${item.value}</dd>
        </div>
      `
    )
    .join("");
}

function renderListSection(title, items, formatter) {
  const content = Array.isArray(items) && items.length > 0
    ? `<ul class="detail-list">${items.map((item) => `<li>${formatter(item)}</li>`).join("")}</ul>`
    : '<p class="empty-value">なし</p>';

  return `
    <section class="detail-card">
      <h2 class="detail-title">${title}</h2>
      ${content}
    </section>
  `;
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
  document.title = `${player.name} | 選手詳細`;
  titleElement.textContent = formatValue(player.name, "名称未設定");
  contextElement.textContent = `選手ID: ${escapeHtml(player.id)} / 学校ID: ${escapeHtml(player.school_id)}`;
  renderActions(actionsElement, [
    {
      href: `./school_detail.html?id=${encodeURIComponent(player.school_id)}`,
      label: "学校詳細へ戻る",
      primary: false,
    },
    {
      href: `./player_edit.html?id=${encodeURIComponent(player.id)}`,
      label: "編集",
      primary: true,
    },
  ]);
  setMessage(messageElement, "");

  const basicInfo = renderDefinitionRows([
    { label: "名前", value: formatValue(player.name) },
    { label: "選手種別", value: formatPlayerType(player.player_type) },
    { label: "出身都道府県", value: formatValue(player.prefecture) },
    { label: "学年", value: formatValue(player.grade) },
    { label: "入学年", value: formatValue(player.admission_year) },
    { label: "スナップショット種別", value: formatSnapshotLabel(player.snapshot_label) },
    { label: "メインポジション", value: formatValue(player.main_position) },
    { label: "投打", value: formatThrowBat(player) },
  ]);

  const pitcherInfo = renderDefinitionRows([
    { label: "球速", value: formatValue(player.velocity) },
    { label: "コントロール", value: formatValue(player.control) },
    { label: "スタミナ", value: formatValue(player.stamina) },
  ]);

  const batterInfo = renderDefinitionRows([
    { label: "弾道", value: formatValue(player.trajectory) },
    { label: "ミート", value: formatValue(player.meat) },
    { label: "パワー", value: formatValue(player.power) },
    { label: "走力", value: formatValue(player.run_speed) },
    { label: "肩力", value: formatValue(player.arm_strength) },
    { label: "守備", value: formatValue(player.fielding) },
    { label: "捕球", value: formatValue(player.catching) },
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

  root.innerHTML = `
    <section class="detail-card">
      <h2 class="detail-title">基本情報</h2>
      <dl class="detail-grid">
        ${basicInfo}
      </dl>
    </section>

    <section class="detail-card">
      <h2 class="detail-title">投手能力</h2>
      <dl class="detail-grid compact-grid">
        ${pitcherInfo}
      </dl>
    </section>

    <section class="detail-card">
      <h2 class="detail-title">野手能力</h2>
      <dl class="detail-grid compact-grid">
        ${batterInfo}
      </dl>
    </section>

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
