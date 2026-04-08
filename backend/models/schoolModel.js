const { all, get, run } = require("../db/database");

async function findAllActive() {
  const sql = `
    SELECT
      id,
      name,
      play_style,
      memo,
      is_archived,
      created_at,
      updated_at
    FROM schools
    WHERE is_archived = 0
    ORDER BY id DESC
  `;

  return all(sql);
}

async function findById(id) {
  const sql = `
    SELECT
      id,
      name,
      play_style,
      memo,
      is_archived,
      created_at,
      updated_at
    FROM schools
    WHERE id = ?
  `;

  return get(sql, [id]);
}

async function createSchool({ name, playStyle, memo }) {
  const sql = `
    INSERT INTO schools (name, play_style, memo)
    VALUES (?, ?, ?)
  `;

  const result = await run(sql, [name, playStyle, memo]);
  return findById(result.lastID);
}

async function updateSchool(id, { name, playStyle, memo }) {
  const sql = `
    UPDATE schools
    SET
      name = ?,
      play_style = ?,
      memo = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND is_archived = 0
  `;

  const result = await run(sql, [name, playStyle, memo, id]);

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
