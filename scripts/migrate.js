const { closeDatabase, databasePath, initializeDatabase } = require("../backend/db/database");

async function main() {
  await initializeDatabase();
  console.log(`Migration completed for ${databasePath}`);
}

main()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
