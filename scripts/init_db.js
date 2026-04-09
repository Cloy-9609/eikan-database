const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = path.join(__dirname, "../database/eikan.sqlite");
const schemaPath = path.join(__dirname, "../backend/db/schema.sql");
const seedPath = path.join(__dirname, "../backend/db/seed.sql");

const schemaSql = fs.readFileSync(schemaPath, "utf-8");
const seedSql = fs.readFileSync(seedPath, "utf-8");

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("DB接続失敗:", err.message);
        return;
    }
    console.log("DB接続成功");
});

db.exec(schemaSql, (err) => {
    if (err) {
        console.error("schema.sql の実行失敗:", err.message);
        db.close();
        return;
    }

    console.log("schema.sql の実行成功");

    db.exec(seedSql, (seedErr) => {
        if (seedErr) {
            console.error("seed.sql の実行失敗:", seedErr.message);
            db.close();
            return;
        }

        console.log("seed.sql の実行成功");
        db.close(() => {
            console.log("DB初期化完了");
        });
    });
    });