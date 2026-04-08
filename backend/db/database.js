const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const databasePath = path.join(__dirname, "../../database/eikan.sqlite");
let databaseInstance;

function connectDatabase() {
  if (databaseInstance) {
    return databaseInstance;
  }

  databaseInstance = new sqlite3.Database(databasePath, (error) => {
    if (error) {
      console.error("Failed to connect to SQLite database:", error);
    }
  });

  databaseInstance.serialize(() => {
    databaseInstance.run("PRAGMA foreign_keys = ON");
  });

  return databaseInstance;
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

module.exports = {
  connectDatabase,
  run,
  get,
  all,
  databasePath,
};
