const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const defaultDatabasePath = path.join(__dirname, "../../database/eikan-app.sqlite");
const databasePath = process.env.EIKAN_DB_PATH
  ? path.resolve(process.env.EIKAN_DB_PATH)
  : defaultDatabasePath;
const databaseJournalPath = `${databasePath}-journal`;
const schemaPath = path.join(__dirname, "schema.sql");
const expectedTables = [
  "schools",
  "players",
  "player_pitch_types",
  "player_special_abilities",
  "player_sub_positions",
  "player_results",
];
const SCHOOL_MIGRATION_COLUMNS = [
  { name: "prefecture", definition: "TEXT" },
  { name: "start_year", definition: "INTEGER" },
  { name: "current_year", definition: "INTEGER" },
];
let databaseInstance;
let initializationPromise;

function cleanupStaleJournalFile() {
  if (!fs.existsSync(databasePath)) {
    return;
  }

  const databaseStats = fs.statSync(databasePath);

  if (databaseStats.size !== 0) {
    return;
  }

  if (fs.existsSync(databaseJournalPath)) {
    fs.rmSync(databaseJournalPath, { force: true });
  }
}

function connectDatabase() {
  if (databaseInstance) {
    return databaseInstance;
  }

  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  cleanupStaleJournalFile();

  databaseInstance = new sqlite3.Database(databasePath, (error) => {
    if (error) {
      console.error("Failed to connect to SQLite database:", error);
    }
  });

  databaseInstance.serialize(() => {
    databaseInstance.run("PRAGMA foreign_keys = ON");
    databaseInstance.run("PRAGMA journal_mode = MEMORY");
    databaseInstance.run("PRAGMA temp_store = MEMORY");
  });

  return databaseInstance;
}

function exec(sql) {
  const db = connectDatabase();

  return new Promise((resolve, reject) => {
    db.exec(sql, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function run(sql, params = []) {
  const db = connectDatabase();

  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }

      resolve({
        lastID: this.lastID,
        changes: this.changes,
      });
    });
  });
}

function get(sql, params = []) {
  const db = connectDatabase();

  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(row ?? null);
    });
  });
}

function all(sql, params = []) {
  const db = connectDatabase();

  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows);
    });
  });
}

function getUserTables() {
  return all(
    `
      SELECT name
      FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name ASC
    `
  );
}

function getTableColumns(tableName) {
  return all(`PRAGMA table_info(${tableName})`);
}

async function migrateSchoolsSchema() {
  const columns = await getTableColumns("schools");
  const columnNames = new Set(columns.map((column) => column.name));
  const missingColumns = SCHOOL_MIGRATION_COLUMNS.filter((column) => !columnNames.has(column.name));

  if (missingColumns.length === 0) {
    return;
  }

  await transaction(async () => {
    for (const column of missingColumns) {
      await run(`ALTER TABLE schools ADD COLUMN ${column.name} ${column.definition}`);
    }

    await run(
      `
        UPDATE schools
        SET
          name = TRIM(SUBSTR(name, 1, LENGTH(name) - 2)),
          updated_at = CURRENT_TIMESTAMP
        WHERE
          SUBSTR(name, -2) = '高校'
          AND LENGTH(TRIM(SUBSTR(name, 1, LENGTH(name) - 2))) > 0
      `
    );
  });

  console.log(
    `Migrated schools schema at ${databasePath}. Added columns: ${missingColumns
      .map((column) => column.name)
      .join(", ")}`
  );
}

function initializeDatabase() {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    const tables = await getUserTables();

    if (tables.length === 0) {
      const schemaSql = fs.readFileSync(schemaPath, "utf-8");
      await exec(schemaSql);
      console.log(`Initialized SQLite schema at ${databasePath}`);
      return;
    }

    const tableNames = new Set(tables.map((table) => table.name));
    const missingTables = expectedTables.filter((tableName) => !tableNames.has(tableName));

    if (missingTables.length > 0) {
      const error = new Error(
        `SQLite schema is incomplete. Missing tables: ${missingTables.join(", ")}. ` +
          `Please verify that the backend is pointing at the intended database file: ${databasePath}`
      );
      error.code = "SQLITE_SCHEMA_INCOMPLETE";
      throw error;
    }

    await migrateSchoolsSchema();
  })().catch((error) => {
    initializationPromise = null;
    throw error;
  });

  return initializationPromise;
}

async function transaction(callback) {
  await run("BEGIN IMMEDIATE TRANSACTION");

  let committed = false;

  try {
    const result = await callback();
    await run("COMMIT");
    committed = true;
    return result;
  } catch (error) {
    if (!committed) {
      try {
        await run("ROLLBACK");
      } catch (rollbackError) {
        error.rollbackError = rollbackError;
        console.error("Failed to rollback transaction:", rollbackError);
      }
    }

    throw error;
  }
}

module.exports = {
  connectDatabase,
  run,
  get,
  all,
  transaction,
  databasePath,
  exec,
  initializeDatabase,
};
