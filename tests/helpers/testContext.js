const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { requestJson } = require("./httpClient");

const repoRoot = path.resolve(__dirname, "../..");
const defaultDatabasePath = path.resolve(repoRoot, "database/eikan-app.sqlite");

function closeServer(server) {
  if (!server || !server.listening) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function createTestContext() {
  const previousDatabasePath = process.env.EIKAN_DB_PATH;
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "eikan-core-test-"));
  const databasePath = path.resolve(tempDirectory, "eikan-test.sqlite");
  let server = null;
  let dbModule = null;
  let appModule = null;
  let cleaned = false;

  if (databasePath === defaultDatabasePath) {
    throw new Error("Test database path must not match the default application database path.");
  }

  process.env.EIKAN_DB_PATH = databasePath;

  try {
    appModule = require(path.join(repoRoot, "backend/app"));
    dbModule = require(path.join(repoRoot, "backend/db/database"));

    if (path.resolve(dbModule.databasePath) !== databasePath) {
      throw new Error(`Backend database path mismatch: ${dbModule.databasePath}`);
    }

    server = await appModule.startServer(0);
    const address = server.address();

    if (!address || typeof address !== "object" || !address.port) {
      throw new Error("Unable to determine test server port.");
    }

    const port = address.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    async function cleanup() {
      if (cleaned) {
        return;
      }

      cleaned = true;
      const cleanupErrors = [];

      try {
        await closeServer(server);
      } catch (error) {
        cleanupErrors.push(error);
      }

      try {
        appModule?.cleanupHotReload?.();
      } catch (error) {
        cleanupErrors.push(error);
      }

      try {
        await dbModule?.closeDatabase?.();
      } catch (error) {
        cleanupErrors.push(error);
      }

      if (previousDatabasePath === undefined) {
        delete process.env.EIKAN_DB_PATH;
      } else {
        process.env.EIKAN_DB_PATH = previousDatabasePath;
      }

      try {
        await fs.rm(tempDirectory, { recursive: true, force: true });
      } catch (error) {
        cleanupErrors.push(error);
      }

      if (cleanupErrors.length > 0) {
        throw new AggregateError(cleanupErrors, "Failed to cleanup test context.");
      }
    }

    return {
      tempDirectory,
      databasePath,
      defaultDatabasePath,
      server,
      port,
      baseUrl,
      db: dbModule,
      requestJson: (options = {}) => requestJson({ ...options, baseUrl }),
      cleanup,
    };
  } catch (error) {
    try {
      await closeServer(server);
      appModule?.cleanupHotReload?.();
      await dbModule?.closeDatabase?.();
      await fs.rm(tempDirectory, { recursive: true, force: true });
    } finally {
      if (previousDatabasePath === undefined) {
        delete process.env.EIKAN_DB_PATH;
      } else {
        process.env.EIKAN_DB_PATH = previousDatabasePath;
      }
    }

    throw error;
  }
}

module.exports = {
  createTestContext,
  defaultDatabasePath,
};
