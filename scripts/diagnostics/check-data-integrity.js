const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const repoRoot = path.resolve(__dirname, "../..");
const defaultDatabasePath = path.join(repoRoot, "database/eikan-app.sqlite");

const REQUIRED_COLUMNS = {
  schools: ["id", "school_code", "name", "prefecture", "play_style", "start_year", "current_year"],
  player_series: ["id", "school_id", "series_no", "name", "admission_year"],
  players: ["id", "player_series_id", "school_id", "snapshot_label", "name"],
};

function resolveDatabasePath() {
  return path.resolve(process.env.EIKAN_DB_PATH || defaultDatabasePath);
}

function openDatabase(databasePath) {
  return new sqlite3.Database(databasePath);
}

function all(db, sql, params = []) {
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

function closeDatabase(db) {
  return new Promise((resolve, reject) => {
    db.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function getColumns(db, tableName) {
  return all(db, `PRAGMA table_info(${tableName})`);
}

async function checkRequiredSchema(db) {
  const failures = [];
  const tables = await all(
    db,
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
  );
  const tableNames = new Set(tables.map((table) => table.name));

  for (const [tableName, requiredColumns] of Object.entries(REQUIRED_COLUMNS)) {
    if (!tableNames.has(tableName)) {
      failures.push(`Missing required table: ${tableName}`);
      continue;
    }

    const columns = await getColumns(db, tableName);
    const columnNames = new Set(columns.map((column) => column.name));

    for (const columnName of requiredColumns) {
      if (!columnNames.has(columnName)) {
        failures.push(`Missing required column: ${tableName}.${columnName}`);
      }
    }
  }

  return failures;
}

async function checkDuplicates(db) {
  const failures = [];
  const duplicateSchoolCodes = await all(
    db,
    `
      SELECT school_code, COUNT(*) AS count
      FROM schools
      WHERE school_code IS NOT NULL
      GROUP BY school_code
      HAVING COUNT(*) > 1
    `
  );
  const duplicateSeriesNumbers = await all(
    db,
    `
      SELECT school_id, series_no, COUNT(*) AS count
      FROM player_series
      GROUP BY school_id, series_no
      HAVING COUNT(*) > 1
    `
  );
  const duplicateSnapshots = await all(
    db,
    `
      SELECT player_series_id, snapshot_label, COUNT(*) AS count
      FROM players
      GROUP BY player_series_id, snapshot_label
      HAVING COUNT(*) > 1
    `
  );

  if (duplicateSchoolCodes.length > 0) {
    failures.push(`Duplicate school_code rows: ${duplicateSchoolCodes.length}`);
  }

  if (duplicateSeriesNumbers.length > 0) {
    failures.push(`Duplicate (school_id, series_no) rows: ${duplicateSeriesNumbers.length}`);
  }

  if (duplicateSnapshots.length > 0) {
    failures.push(
      `Duplicate players(player_series_id, snapshot_label) rows: ${duplicateSnapshots.length}`
    );
  }

  return {
    failures,
    duplicateSchoolCodes,
    duplicateSeriesNumbers,
    duplicateSnapshots,
  };
}

async function runIntegrityCheck({ databasePath = resolveDatabasePath(), log = console } = {}) {
  const resolvedDatabasePath = path.resolve(databasePath);
  const db = openDatabase(resolvedDatabasePath);

  try {
    log.log(`Using SQLite database at ${resolvedDatabasePath}`);

    const [schoolsColumns, playerSeriesColumns] = await Promise.all([
      getColumns(db, "schools"),
      getColumns(db, "player_series"),
    ]);
    const schemaFailures = await checkRequiredSchema(db);
    const duplicateResult = await checkDuplicates(db);
    const schoolSamples = await all(
      db,
      "SELECT id, name, school_code FROM schools ORDER BY id ASC LIMIT 20"
    );
    const seriesSamples = await all(
      db,
      `
        SELECT id, school_id, series_no
        FROM player_series
        ORDER BY school_id, series_no
        LIMIT 30
      `
    );
    const failures = [...schemaFailures, ...duplicateResult.failures];

    log.log("\n=== schools columns ===");
    log.table(schoolsColumns);
    log.log("\n=== player_series columns ===");
    log.table(playerSeriesColumns);
    log.log("\n=== schools sample ===");
    log.table(schoolSamples);
    log.log("\n=== duplicate school_code ===");
    log.table(duplicateResult.duplicateSchoolCodes);
    log.log("\n=== duplicate (school_id, series_no) ===");
    log.table(duplicateResult.duplicateSeriesNumbers);
    log.log("\n=== duplicate players(player_series_id, snapshot_label) ===");
    log.table(duplicateResult.duplicateSnapshots);
    log.log("\n=== player_series sample ===");
    log.table(seriesSamples);

    if (failures.length > 0) {
      log.error("\nDB integrity check failed:");
      for (const failure of failures) {
        log.error(`- ${failure}`);
      }
      return 1;
    }

    log.log("\nDB integrity check passed.");
    return 0;
  } catch (error) {
    log.error(`DB integrity check failed: ${error.message}`);
    return 1;
  } finally {
    await closeDatabase(db);
  }
}

if (require.main === module) {
  runIntegrityCheck().then((exitCode) => {
    process.exitCode = exitCode;
  });
}

module.exports = {
  runIntegrityCheck,
  resolveDatabasePath,
};
