const { all, get, run } = require("../db/database");

function buildSortClause(sortBy, sortOrder) {
  if (sortBy === "name") {
    return `name ${sortOrder.toUpperCase()}, id DESC`;
  }

  if (sortBy === "start_year") {
    return `CASE WHEN start_year IS NULL THEN 1 ELSE 0 END ASC, start_year ${sortOrder.toUpperCase()}, id DESC`;
  }

  return `updated_at ${sortOrder.toUpperCase()}, id DESC`;
}

async function findAllActive({ name = null, prefecture = null, playStyle = null, sortBy = "updated_at", sortOrder = "desc" } = {}) {
  const conditions = ["is_archived = 0"];
  const params = [];

  if (name) {
    conditions.push("name LIKE ?");
    params.push(`%${name}%`);
  }

  if (prefecture) {
    conditions.push("prefecture = ?");
    params.push(prefecture);
  }

  if (playStyle) {
    conditions.push("play_style = ?");
    params.push(playStyle);
  }

  const orderByClause = buildSortClause(sortBy, sortOrder);
  const sql = `
    SELECT
      id,
      name,
      prefecture,
      play_style,
      start_year,
      current_year,
      memo,
      is_archived,
      created_at,
      updated_at
    FROM schools
    WHERE ${conditions.join(" AND ")}
    ORDER BY ${orderByClause}
  `;

  return all(sql, params);
}

async function findById(id) {
  const sql = `
    SELECT
      id,
      name,
      prefecture,
      play_style,
      start_year,
      current_year,
      memo,
      is_archived,
      created_at,
      updated_at
    FROM schools
    WHERE id = ?
  `;

  return get(sql, [id]);
}

async function createSchool({ name, prefecture, playStyle, startYear, currentYear, memo }) {
  const sql = `
    INSERT INTO schools (name, prefecture, play_style, start_year, current_year, memo)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  const result = await run(sql, [name, prefecture, playStyle, startYear, currentYear, memo]);
  return findById(result.lastID);
}

async function updateSchool(id, { name, prefecture, playStyle, startYear, currentYear, memo }) {
  const sql = `
    UPDATE schools
    SET
      name = ?,
      prefecture = ?,
      play_style = ?,
      start_year = ?,
      current_year = ?,
      memo = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND is_archived = 0
  `;

  const result = await run(sql, [name, prefecture, playStyle, startYear, currentYear, memo, id]);

  if (result.changes === 0) {
    return null;
  }

  return findById(id);
}

async function archiveSchool(id) {
  const sql = `
    UPDATE schools
    SET
      is_archived = 1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND is_archived = 0
  `;

  const result = await run(sql, [id]);

  if (result.changes === 0) {
    return null;
  }

  return findById(id);
}

module.exports = {
  findAllActive,
  findById,
  createSchool,
  updateSchool,
  archiveSchool,
};
