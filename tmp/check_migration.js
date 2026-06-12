const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database/eikan-app.sqlite');

function all(sql) {
  return new Promise((resolve, reject) => {
    db.all(sql, (error, rows) => error ? reject(error) : resolve(rows));
  });
}

(async () => {
  console.log('\n=== schools columns ===');
  console.table(await all("PRAGMA table_info(schools)"));

  console.log('\n=== player_series columns ===');
  console.table(await all("PRAGMA table_info(player_series)"));

  console.log('\n=== schools sample ===');
  console.table(await all("SELECT id, name, school_code FROM schools LIMIT 20"));

  console.log('\n=== duplicate school_code ===');
  console.table(await all(`
    SELECT school_code, COUNT(*) AS c
    FROM schools
    GROUP BY school_code
    HAVING COUNT(*) > 1
  `));

  console.log('\n=== duplicate (school_id, series_no) ===');
  console.table(await all(`
    SELECT school_id, series_no, COUNT(*) AS c
    FROM player_series
    GROUP BY school_id, series_no
    HAVING COUNT(*) > 1
  `));

  console.log('\n=== player_series sample ===');
  console.table(await all(`
    SELECT id, school_id, series_no
    FROM player_series
    ORDER BY school_id, series_no
    LIMIT 30
  `));

  db.close();
})().catch((error) => {
  console.error(error);
  db.close();
  process.exit(1);
});
