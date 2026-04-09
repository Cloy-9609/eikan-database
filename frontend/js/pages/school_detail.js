import { fetchSchoolById } from "../api/schoolApi.js";

function getSchoolIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const schoolId = params.get("id");

  if (!schoolId) {
    throw new Error("学校IDが指定されていません。");
  }

  return schoolId;
}

function renderError(root, message) {
  root.innerHTML = `
    <section>
      <p>${message}</p>
      <p><a href="./schools.html">学校一覧へ戻る</a></p>
    </section>
  `;
}

function renderSchool(root, school) {
  const playStyleLabel =
    school.play_style === "three_year" ? "3年縛り" : "継続プレイ";

  root.innerHTML = `
    <section>
      <p><strong>学校名:</strong> ${school.name}</p>
      <p><strong>プレイ方針:</strong> ${playStyleLabel}</p>
      <p><strong>メモ:</strong> ${school.memo ?? "なし"}</p>
      <p><a href="./player_register.html?school_id=${school.id}">選手登録</a></p>
      <p><a href="./schools.html">学校一覧へ戻る</a></p>
    </section>
  `;
}

async function init() {
  const root = document.getElementById("school-detail-root");

  try {
    const schoolId = getSchoolIdFromQuery();
    const school = await fetchSchoolById(schoolId);
    renderSchool(root, school);
  } catch (error) {
    renderError(root, error.message);
  }
}

init();
