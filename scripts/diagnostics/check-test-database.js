const { spawn } = require("child_process");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const repoRoot = path.resolve(__dirname, "../..");

function runDiagnostic(databasePath) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(__dirname, "check-data-integrity.js")], {
      cwd: repoRoot,
      env: {
        ...process.env,
        EIKAN_DB_PATH: databasePath,
      },
      shell: false,
      stdio: "inherit",
    });

    child.on("close", (code, signal) => {
      if (signal) {
        console.error(`Test database diagnostic terminated by signal: ${signal}`);
        resolve(1);
        return;
      }

      resolve(code ?? 1);
    });
  });
}

async function main() {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "eikan-db-check-test-"));
  const databasePath = path.resolve(tempDirectory, "eikan-check-test.sqlite");
  const previousDatabasePath = process.env.EIKAN_DB_PATH;

  try {
    process.env.EIKAN_DB_PATH = databasePath;
    const { initializeDatabase, closeDatabase, databasePath: backendDatabasePath } = require("../../backend/db/database");

    if (path.resolve(backendDatabasePath) !== databasePath) {
      throw new Error(`Backend database path mismatch: ${backendDatabasePath}`);
    }

    await initializeDatabase();
    await closeDatabase();

    process.exitCode = await runDiagnostic(databasePath);
  } finally {
    if (previousDatabasePath === undefined) {
      delete process.env.EIKAN_DB_PATH;
    } else {
      process.env.EIKAN_DB_PATH = previousDatabasePath;
    }

    await fs.rm(tempDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
