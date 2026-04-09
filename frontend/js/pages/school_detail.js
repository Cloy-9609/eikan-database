import { fetchSchoolById } from "../api/schoolApi.js";
import { fetchPlayers } from "../api/playerApi.js";

function getSchoolIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const schoolId = params.get("id");

  if (!schoolId) {
    throw new Error("学校IDが指定されていません。");
  }

  return schoolId;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getPlayStyleLabel(playStyle) {
  return playStyle === "three_year" ? "3年縛り" : "継続プレイ";
}

function getPlayerTypeLabel(playerType) {
  const playerTypeMap = {
    normal: "通常",
    genius: "天才",
    reincarnated: "転生",
  };

  return playerTypeMap[playerType] ?? playerType ?? "不明";
}

function renderSchoolError(root, message) {
  root.innerHTML = `
    <div class="message-box error-message">
      <p>学校情報の取得に失敗しました。</p>
      <p>${escapeHtml(message)}</p>
      <p><a href="./schools.html">学校一覧へ戻る</a></p>
    </div>
  `;
}

function renderPlayersError(root, message) {
  root.innerHTML = `
    <div class="message-box error-message">
      <p>選手一覧の取得に失敗しました。</p>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function renderSchool(root, school) {
  root.innerHTML = `
    <div class="info-list">
      <p><strong>学校名:</strong> ${escapeHtml(school.name)}</p>
      <p><strong>プレイ方針:</strong> ${escapeHtml(getPlayStyleLabel(school.play_style))}</p>
      <p><strong>メモ:</strong> ${escapeHtml(school.memo ?? "なし")}</p>
      <p><a href="./schools.html">学校一覧へ戻る</a></p>
    </div>
  `;
}

function renderPlayers(root, players) {
  if (!Array.isArray(players) || players.length === 0) {
    root.innerHTML = `
      <div class="message-box empty-message">
        <p>登録された選手はいません</p>
      </div>
    `;
    return;
  }

  const rows = players
    .map(
      (player) => `
        <tr>
          <td>
            <a class="player-link" href="./player_detail.html?id=${encodeURIComponent(player.id)}">
              ${escapeHtml(player.name)}
            </a>
          </td>
          <td>${escapeHtml(player.grade)}</td>
          <td>${escapeHtml(player.main_position ?? "未設定")}</td>
          <td>${escapeHtml(getPlayerTypeLabel(player.player_type))}</td>
        </tr>
      `
    )
    .join("");

  root.innerHTML = `
    <div class="table-wrap">
      <table class="players-table">
        <thead>
          <tr>
            <th>名前</th>
            <th>学年</th>
            <th>メインポジション</th>
            <th>選手種別</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

async function init() {
  const schoolRoot = document.getElementById("school-info-root");
  const playersRoot = document.getElementById("school-players-root");
  const playerRegisterLink = document.getElementById("player-register-link");

  try {
    const schoolId = getSchoolIdFromQuery();
    playerRegisterLink.href = `./player_register.html?school_id=${encodeURIComponent(
      schoolId
    )}`;

    const [schoolResult, playersResult] = await Promise.allSettled([
      fetchSchoolById(schoolId),
      fetchPlayers({ schoolId }),
    ]);

    if (schoolResult.status === "fulfilled") {
      renderSchool(schoolRoot, schoolResult.value);
    } else {
      renderSchoolError(
        schoolRoot,
        schoolResult.reason?.message ?? "不明なエラーが発生しました。"
      );
    }

    if (playersResult.status === "fulfilled") {
      renderPlayers(playersRoot, playersResult.value);
    } else {
      renderPlayersError(
        playersRoot,
        playersResult.reason?.message ?? "不明なエラーが発生しました。"
      );
    }
  } catch (error) {
    renderSchoolError(schoolRoot, error.message);
    renderPlayersError(playersRoot, error.message);
  }
}

init();
