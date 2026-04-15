import { fetchSchoolById } from "../api/schoolApi.js";
import { fetchPlayers } from "../api/playerApi.js";
import { deleteSchool, updateSchool } from "../api/schoolApi.js";

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

const PLAY_STYLE_OPTIONS = [
  { value: "continuous", label: "継続プレイ" },
  { value: "three_year", label: "3年縛り" },
];

function escapeAttribute(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function buildPlayStyleOptions(selectedValue) {
  return PLAY_STYLE_OPTIONS.map((option) => {
    const selected = option.value === selectedValue ? " selected" : "";
    return `<option value="${escapeAttribute(option.value)}"${selected}>${escapeHtml(option.label)}</option>`;
  }).join("");
}

function setMessage(element, message, type = "") {
  element.hidden = !message;
  element.textContent = message;
  element.classList.remove("error-message", "success-message");

  if (!message) {
    return;
  }

  if (type === "error") {
    element.classList.add("error-message");
  } else if (type === "success") {
    element.classList.add("success-message");
  }
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

function renderSchoolEditor(root, school, message = null) {
  root.innerHTML = `
    <div class="school-meta">
      <p><strong>学校ID:</strong> ${escapeHtml(school.id)}</p>
      <p><strong>現在のプレイ方針:</strong> ${escapeHtml(getPlayStyleLabel(school.play_style))}</p>
    </div>
    <div id="school-form-message" class="message-box detail-message" hidden></div>
    <form id="school-edit-form" class="school-form">
      <div class="school-form-row">
        <label for="school-name">学校名</label>
        <input
          id="school-name"
          name="name"
          type="text"
          value="${escapeAttribute(school.name)}"
          required
        >
      </div>
      <div class="school-form-row">
        <label for="school-play-style">プレイ方針</label>
        <select id="school-play-style" name="play_style" required>
          ${buildPlayStyleOptions(school.play_style)}
        </select>
      </div>
      <div class="school-form-row">
        <label for="school-memo">メモ</label>
        <textarea id="school-memo" name="memo" rows="4">${escapeHtml(school.memo ?? "")}</textarea>
      </div>
      <p class="form-help">
        学校を削除すると学校は一覧から非表示になります。配下の選手データは保持され、将来機能から参照できる状態のまま残ります。
      </p>
      <div class="school-form-actions">
        <button type="submit" class="school-button school-button-primary">保存する</button>
        <button type="button" id="school-delete-button" class="school-button school-button-danger">学校を削除する</button>
        <a class="school-button school-button-secondary" href="./schools.html">学校一覧へ戻る</a>
      </div>
    </form>
  `;

  if (message) {
    const messageElement = root.querySelector("#school-form-message");
    setMessage(messageElement, message.text, message.type);
  }
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

function getSchoolEditorElements(root) {
  return {
    form: root.querySelector("#school-edit-form"),
    messageElement: root.querySelector("#school-form-message"),
    deleteButton: root.querySelector("#school-delete-button"),
  };
}

function buildSchoolPayload(form) {
  return {
    name: form.elements.name.value,
    play_style: form.elements.play_style.value,
    memo: form.elements.memo.value,
  };
}

function bindSchoolEditor(root, schoolId) {
  const { form, messageElement, deleteButton } = getSchoolEditorElements(root);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');
    const payload = buildSchoolPayload(form);
    submitButton.disabled = true;
    setMessage(messageElement, "");

    try {
      const updatedSchool = await updateSchool(schoolId, payload);
      document.title = `${updatedSchool.name} | 学校詳細`;
      renderSchoolEditor(root, updatedSchool, {
        text: "学校情報を更新しました。",
        type: "success",
      });
      bindSchoolEditor(root, schoolId);
    } catch (error) {
      setMessage(messageElement, error.message, "error");
    } finally {
      submitButton.disabled = false;
    }
  });

  deleteButton.addEventListener("click", async () => {
    const shouldDelete = window.confirm(
      "この学校を削除します。学校は一覧から非表示になり、配下の選手データのみ保持されます。"
    );

    if (!shouldDelete) {
      return;
    }

    deleteButton.disabled = true;
    setMessage(messageElement, "");

    try {
      await deleteSchool(schoolId);
      window.location.href = "./schools.html?message=school-deleted";
    } catch (error) {
      deleteButton.disabled = false;
      setMessage(messageElement, error.message, "error");
    }
  });
}

async function init() {
  const schoolRoot = document.getElementById("school-info-root");
  const playersRoot = document.getElementById("school-players-root");
  const playerRegisterLink = document.getElementById("player-register-link");

  playerRegisterLink.hidden = true;

  try {
    const schoolId = getSchoolIdFromQuery();
    const school = await fetchSchoolById(schoolId);

    document.title = `${school.name} | 学校詳細`;
    renderSchoolEditor(schoolRoot, school);
    bindSchoolEditor(schoolRoot, schoolId);

    playerRegisterLink.href = `./player_register.html?school_id=${encodeURIComponent(schoolId)}`;
    playerRegisterLink.hidden = false;

    try {
      const players = await fetchPlayers({ schoolId });
      renderPlayers(playersRoot, players);
    } catch (error) {
      renderPlayersError(playersRoot, error.message);
    }
  } catch (error) {
    renderSchoolError(schoolRoot, error.message);
    renderPlayersError(playersRoot, error.message);
  }
}

init();
