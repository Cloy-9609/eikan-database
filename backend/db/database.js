const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { TRANSITIONAL_SNAPSHOT_LABELS } = require("../constants/playerSnapshots");
const { ensureManagementCodeSchema } = require("./managementCodeMigration");
const { ensureSchoolProgressionSchema } = require("./schoolProgressionMigration");

const defaultDatabasePath = path.join(__dirname, "../../database/eikan-app.sqlite");
const databasePath = process.env.EIKAN_DB_PATH
  ? path.resolve(process.env.EIKAN_DB_PATH)
  : defaultDatabasePath;
const databaseJournalPath = `${databasePath}-journal`;
const schemaPath = path.join(__dirname, "schema.sql");
const expectedTables = [
  "schools",
  "player_series",
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
const PLAYER_SERIES_MIGRATION_COLUMNS = [
  { name: "player_type_note", definition: "TEXT" },
  { name: "note", definition: "TEXT" },
];
const snapshotCheckValuesSql = TRANSITIONAL_SNAPSHOT_LABELS.map((value) => `'${value}'`).join(", ");
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

function closeDatabase() {
  if (!databaseInstance) {
    initializationPromise = null;
    return Promise.resolve();
  }

  const db = databaseInstance;

  return new Promise((resolve, reject) => {
    db.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      databaseInstance = null;
      initializationPromise = null;
      resolve();
    });
  });
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

function getIndexByName(indexName) {
  return get(
    `
      SELECT name
      FROM sqlite_master
      WHERE type = 'index' AND name = ?
    `,
    [indexName]
  );
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

async function ensurePlayerSeriesColumns() {
  const tables = await getUserTables();
  const tableNames = new Set(tables.map((table) => table.name));

  if (!tableNames.has("player_series")) {
    return;
  }

  const columns = await getTableColumns("player_series");
  const columnNames = new Set(columns.map((column) => column.name));
  const missingColumns = PLAYER_SERIES_MIGRATION_COLUMNS.filter(
    (column) => !columnNames.has(column.name)
  );

  for (const column of missingColumns) {
    await run(`ALTER TABLE player_series ADD COLUMN ${column.name} ${column.definition}`);
  }
}

async function ensurePlayerSeriesIndexes() {
  await run("CREATE INDEX IF NOT EXISTS idx_player_series_school_id ON player_series(school_id)");
  await run("CREATE INDEX IF NOT EXISTS idx_players_player_series_id ON players(player_series_id)");
  await run(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_players_series_snapshot_unique ON players(player_series_id, snapshot_label)"
  );
}

async function migratePlayerSnapshotSchema() {
  const tables = await getUserTables();
  const tableNames = new Set(tables.map((table) => table.name));

  if (!tableNames.has("players") || !tableNames.has("schools")) {
    return;
  }

  if (tableNames.has("player_series")) {
    await ensurePlayerSeriesColumns();
  }

  const playerColumns = await getTableColumns("players");
  const playerColumnNames = new Set(playerColumns.map((column) => column.name));
  const needsPlayerSeriesTable = !tableNames.has("player_series");
  const needsPlayerSeriesId = !playerColumnNames.has("player_series_id");
  const needsSnapshotNote = !playerColumnNames.has("snapshot_note");
  const needsSeriesSnapshotUniqueIndex = !(await getIndexByName("idx_players_series_snapshot_unique"));
  const needsPlayerSeriesIndex = !(await getIndexByName("idx_players_player_series_id"));

  if (
    !needsPlayerSeriesTable &&
    !needsPlayerSeriesId &&
    !needsSnapshotNote &&
    !needsSeriesSnapshotUniqueIndex &&
    !needsPlayerSeriesIndex
  ) {
    await ensurePlayerSeriesIndexes();
    return;
  }

  const legacySnapshotCountRow = await get(
    `
      SELECT COUNT(*) AS count
      FROM players
      WHERE snapshot_label = 'post_tournament'
    `
  );
  const legacySnapshotCount = Number(legacySnapshotCountRow?.count ?? 0);

  const migrationSql = `
    PRAGMA foreign_keys = OFF;
    BEGIN TRANSACTION;

    CREATE TABLE IF NOT EXISTS player_series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      prefecture TEXT NOT NULL,
      player_type TEXT NOT NULL CHECK (player_type IN ('normal', 'genius', 'reincarnated')),
      player_type_note TEXT,
      admission_year INTEGER NOT NULL,
      throwing_hand TEXT NOT NULL CHECK (throwing_hand IN ('right', 'left')),
      batting_hand TEXT NOT NULL CHECK (batting_hand IN ('right', 'left', 'both')),
      note TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON UPDATE CASCADE ON DELETE RESTRICT
    );

    INSERT INTO player_series (
      id,
      school_id,
      name,
      prefecture,
      player_type,
      player_type_note,
      admission_year,
      throwing_hand,
      batting_hand,
      note,
      created_at,
      updated_at
    )
    SELECT
      players.id,
      players.school_id,
      players.name,
      players.prefecture,
      players.player_type,
      players.player_type_note,
      players.admission_year,
      players.throwing_hand,
      players.batting_hand,
      NULL,
      players.created_at,
      players.updated_at
    FROM players
    WHERE NOT EXISTS (
      SELECT 1
      FROM player_series
      WHERE player_series.id = players.id
    );

    CREATE TABLE players_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_series_id INTEGER NOT NULL,
      school_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      player_type TEXT NOT NULL CHECK (player_type IN ('normal', 'genius', 'reincarnated')),
      player_type_note TEXT,
      total_stars INTEGER NOT NULL DEFAULT 0 CHECK (total_stars >= 0),
      prefecture TEXT NOT NULL,
      grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 3),
      admission_year INTEGER NOT NULL,
      snapshot_label TEXT NOT NULL CHECK (snapshot_label IN (${snapshotCheckValuesSql})),
      snapshot_note TEXT,
      main_position TEXT NOT NULL,
      throwing_hand TEXT NOT NULL CHECK (throwing_hand IN ('right', 'left')),
      batting_hand TEXT NOT NULL CHECK (batting_hand IN ('right', 'left', 'both')),
      is_reincarnated INTEGER NOT NULL DEFAULT 0 CHECK (is_reincarnated IN (0, 1)),
      is_genius INTEGER NOT NULL DEFAULT 0 CHECK (is_genius IN (0, 1)),
      velocity INTEGER CHECK (velocity >= 0),
      control INTEGER CHECK (control >= 0),
      stamina INTEGER CHECK (stamina >= 0),
      trajectory INTEGER CHECK (trajectory >= 0),
      meat INTEGER CHECK (meat >= 0),
      power INTEGER CHECK (power >= 0),
      run_speed INTEGER CHECK (run_speed >= 0),
      arm_strength INTEGER CHECK (arm_strength >= 0),
      fielding INTEGER CHECK (fielding >= 0),
      catching INTEGER CHECK (catching >= 0),
      evidence_image_path TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_series_id) REFERENCES player_series(id) ON UPDATE CASCADE ON DELETE CASCADE,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON UPDATE CASCADE ON DELETE RESTRICT
    );

    INSERT INTO players_new (
      id,
      player_series_id,
      school_id,
      name,
      player_type,
      player_type_note,
      total_stars,
      prefecture,
      grade,
      admission_year,
      snapshot_label,
      snapshot_note,
      main_position,
      throwing_hand,
      batting_hand,
      is_reincarnated,
      is_genius,
      velocity,
      control,
      stamina,
      trajectory,
      meat,
      power,
      run_speed,
      arm_strength,
      fielding,
      catching,
      evidence_image_path,
      created_at,
      updated_at
    )
    SELECT
      players.id,
      players.id,
      players.school_id,
      players.name,
      players.player_type,
      players.player_type_note,
      players.total_stars,
      players.prefecture,
      players.grade,
      players.admission_year,
      players.snapshot_label,
      NULL,
      players.main_position,
      players.throwing_hand,
      players.batting_hand,
      players.is_reincarnated,
      players.is_genius,
      players.velocity,
      players.control,
      players.stamina,
      players.trajectory,
      players.meat,
      players.power,
      players.run_speed,
      players.arm_strength,
      players.fielding,
      players.catching,
      players.evidence_image_path,
      players.created_at,
      players.updated_at
    FROM players;

    DROP TABLE players;
    ALTER TABLE players_new RENAME TO players;

    CREATE INDEX IF NOT EXISTS idx_player_series_school_id ON player_series(school_id);
    CREATE INDEX IF NOT EXISTS idx_players_school_id ON players(school_id);
    CREATE INDEX IF NOT EXISTS idx_players_player_series_id ON players(player_series_id);
    CREATE INDEX IF NOT EXISTS idx_players_player_type ON players(player_type);
    CREATE INDEX IF NOT EXISTS idx_players_admission_year ON players(admission_year);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_players_series_snapshot_unique ON players(player_series_id, snapshot_label);

    COMMIT;
    PRAGMA foreign_keys = ON;
  `;

  await exec(migrationSql);
  await ensurePlayerSeriesColumns();
  await ensurePlayerSeriesIndexes();

  const legacyNote =
    legacySnapshotCount > 0
      ? ` Preserved ${legacySnapshotCount} legacy 'post_tournament' snapshot_label value(s) for staged migration.`
      : "";

  console.log(`Migrated player snapshot schema at ${databasePath}.${legacyNote}`);
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

    if (tableNames.has("schools")) {
      await migrateSchoolsSchema();
    }

    if (tableNames.has("players")) {
      await migratePlayerSnapshotSchema();
    }

    await ensureManagementCodeSchema({ all, get, run, transaction });
    await ensureSchoolProgressionSchema({ all, get, run, transaction });

    const refreshedTables = await getUserTables();
    const refreshedTableNames = new Set(refreshedTables.map((table) => table.name));
    const missingTables = expectedTables.filter((tableName) => !refreshedTableNames.has(tableName));

    if (missingTables.length > 0) {
      const error = new Error(
        `SQLite schema is incomplete. Missing tables: ${missingTables.join(", ")}. ` +
          `Please verify that the backend is pointing at the intended database file: ${databasePath}`
      );
      error.code = "SQLITE_SCHEMA_INCOMPLETE";
      throw error;
    }
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
  closeDatabase,
};
