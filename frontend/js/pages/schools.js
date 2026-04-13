import { fetchSchools } from "../api/schoolApi.js";

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

function renderSchools(root, schools) {
  if (!Array.isArray(schools) || schools.length === 0) {
    root.innerHTML = `
      <div class="message-box empty-message">
        <p>登録された学校はありません</p>
      </div>
    `;
    return;
  }

  const rows = schools
    .map(
      (school) => `
        <tr>
          <td>
            <a href="./school_detail.html?id=${encodeURIComponent(school.id)}">
              ${escapeHtml(school.name)}
            </a>
          </td>
          <td>${escapeHtml(getPlayStyleLabel(school.play_style))}</td>
          <td>${escapeHtml(school.memo ?? "")}</td>
        </tr>
      `
    )
    .join("");

  root.innerHTML = `
    <div class="table-wrap">
      <table class="schools-table">
        <thead>
          <tr>
            <th>学校名</th>
            <th>プレイ方針</th>
            <th>メモ</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderError(root, message) {
  root.innerHTML = `
    <div class="message-box error-message">
      <p>学校一覧の取得に失敗しました。</p>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

async function init() {
  const root = document.getElementById("schools-root");

  try {
    const schools = await fetchSchools();
    renderSchools(root, schools);
  } catch (error) {
    renderError(root, error.message);
  }
}

init();
