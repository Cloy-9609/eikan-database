const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = process.env.EIKAN_DB_PATH
  ? path.resolve(process.env.EIKAN_DB_PATH)
  : path.join(__dirname, "../database/eikan-app.sqlite");
const journalPath = `${dbPath}-journal`;
const schemaPath = path.join(__dirname, "../backend/db/schema.sql");

function execSql(db, sql) {
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

async function main() {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  if (fs.existsSync(dbPath) && fs.statSync(dbPath).size === 0 && fs.existsSync(journalPath)) {
    fs.rmSync(journalPath, { force: true });
  }

  const schemaSql = fs.readFileSync(schemaPath, "utf-8");
  const db = new sqlite3.Database(dbPath);

  try {
    await execSql(db, "PRAGMA journal_mode = MEMORY; PRAGMA temp_store = MEMORY;");
    await execSql(db, schemaSql);
    console.log(`Initialized schema at ${dbPath}`);
  } finally {
    await new Promise((resolve, reject) => {
      db.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

main().catch((error) => {
  console.error("Failed to initialize the SQLite database:", error);
  process.exit(1);
});
